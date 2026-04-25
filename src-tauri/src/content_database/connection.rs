//! Content database connection management.
//!
//! Phase 2C: an r2d2 connection pool is initialised once at startup (see
//! `init_content_pool`) and every `get_content_connection()` call returns a
//! pooled connection that goes back into the pool on `Drop`. This replaces the
//! previous pattern of calling `rusqlite::Connection::open` for every DB
//! operation, which — under Tauri's single-process model — added real latency
//! and repeated PRAGMA setup on every call.
//!
//! # PRAGMA policy
//!
//! PRAGMAs are applied in `ContentConnectionCustomizer::on_acquire`, which r2d2
//! calls **exactly once per new connection** the manager builds, not on every
//! `pool.get()`. WAL journal mode survives for the life of the database file,
//! so re-applying it on every connection is unnecessary; but `foreign_keys`,
//! `synchronous`, `temp_store`, `busy_timeout` are per-connection and MUST be
//! set on every pooled connection.
//!
//! # Error model
//!
//! Public API returns `Result<DbConn, String>` for ergonomic interop with the
//! rest of the codebase (every caller historically did
//! `.map_err(|e| format!("Failed to connect: {}", e))` on the old
//! `SqlResult<Connection>` signature, so `String` fits naturally).

use r2d2::{CustomizeConnection, Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{Connection, Error as SqlError};
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::Duration;
use tauri::api::path::app_data_dir;
use tauri::Config;

/// Alias for a pooled content-db connection. Derefs to `rusqlite::Connection`
/// so existing `.execute` / `.query_row` / `.prepare` / `.transaction()` calls
/// keep working without any caller refactor.
pub type DbConn = PooledConnection<SqliteConnectionManager>;

/// Process-wide content database pool. Lazily initialised by
/// `init_content_pool()` which must be called during Tauri startup BEFORE any
/// command can run. After that, `get_content_connection()` is O(1) amortised.
static CONTENT_POOL: OnceLock<Pool<SqliteConnectionManager>> = OnceLock::new();

/// Default pool size. Desktop app has at most a handful of Tauri command
/// workers hitting SQLite concurrently; keeping this small bounds memory and
/// avoids WAL writer contention.
const POOL_MAX_SIZE: u32 = 8;

/// Get path to the content database file
pub fn get_content_database_path() -> Result<PathBuf, String> {
    let app_data = app_data_dir(&Config::default()).ok_or("Failed to get app data directory")?;

    let db_dir = app_data.join("pqs-rtn-hybrid-storage");
    std::fs::create_dir_all(&db_dir)
        .map_err(|e| format!("Failed to create database directory: {}", e))?;

    // Using 'content.db' as requested by user
    Ok(db_dir.join("content.db"))
}

pub fn get_portable_data_dir() -> Result<std::path::PathBuf, String> {
    // Strategy:
    // Dev Mode: Use AppData/pqs-rtn-hybrid-storage/storage to AVOID triggering watchers in src-tauri
    // Release Mode: Use exe_dir/data to keep it PORTABLE on USB

    if cfg!(debug_assertions) {
        let app_data =
            app_data_dir(&Config::default()).ok_or("Failed to get app data directory")?;

        let dev_storage = app_data.join("pqs-rtn-hybrid-storage").join("data");

        if !dev_storage.exists() {
            std::fs::create_dir_all(&dev_storage).map_err(|e| e.to_string())?;
        }
        Ok(dev_storage)
    } else {
        let mut p = std::env::current_exe().map_err(|e| e.to_string())?;
        p.pop();
        let data_dir = p.join("data");

        if !data_dir.exists() {
            std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
        }
        Ok(data_dir)
    }
}

/// Connection customizer: runs once per fresh physical connection the pool
/// creates. Safe to re-enter on pool growth.
#[derive(Debug)]
struct ContentConnectionCustomizer;

impl CustomizeConnection<Connection, SqlError> for ContentConnectionCustomizer {
    fn on_acquire(&self, conn: &mut Connection) -> Result<(), SqlError> {
        // 5-second busy timeout: if another writer holds the DB we wait
        // instead of failing instantly with SQLITE_BUSY.
        conn.busy_timeout(Duration::from_secs(5))?;

        // WAL returns a row ("wal"); harmless to re-apply. Keeps WAL active
        // even if someone external flipped the file back to rollback journal.
        let _: String = conn.query_row("PRAGMA journal_mode=WAL", [], |row| row.get(0))?;

        // Per-connection PRAGMAs.
        conn.execute_batch(
            "PRAGMA foreign_keys = ON; \
             PRAGMA synchronous = NORMAL; \
             PRAGMA temp_store = MEMORY;",
        )?;
        Ok(())
    }
}

/// Build the pool. Exposed separately so tests can build an isolated pool
/// against a tempfile path without touching the global.
pub(crate) fn build_pool(path: PathBuf) -> Result<Pool<SqliteConnectionManager>, String> {
    let manager = SqliteConnectionManager::file(path);
    Pool::builder()
        .max_size(POOL_MAX_SIZE)
        .connection_customizer(Box::new(ContentConnectionCustomizer))
        .build(manager)
        .map_err(|e| format!("Failed to build content DB pool: {}", e))
}

/// Initialise the global content-db pool. Idempotent — if the pool is already
/// initialised this is a no-op and returns `Ok(())`. Call during Tauri
/// `setup` AFTER the database file has been ensured (see
/// `schema::initialize_content_database`).
pub fn init_content_pool() -> Result<(), String> {
    if CONTENT_POOL.get().is_some() {
        return Ok(());
    }
    let path = get_content_database_path()?;
    let pool = build_pool(path)?;
    // Race with another init call is harmless — set_ok returns Err if already
    // set, which means some other thread won the race; either way we have a
    // pool.
    let _ = CONTENT_POOL.set(pool);
    Ok(())
}

/// Get a pooled connection to the content database.
///
/// Returns an error if `init_content_pool()` was not called first. Callers
/// should treat the returned `DbConn` like the old `Connection` — all methods
/// are forwarded via `Deref` / `DerefMut`. The connection returns to the pool
/// automatically when dropped.
pub fn get_content_connection() -> Result<DbConn, String> {
    let pool = CONTENT_POOL.get().ok_or_else(|| {
        "Content DB pool not initialised. Call init_content_pool() first.".to_string()
    })?;
    pool.get()
        .map_err(|e| format!("Failed to acquire pooled connection: {}", e))
}

/// Number of currently-idle connections in the pool. Intended for tests and
/// diagnostics — helps verify connections return to the pool on drop.
#[cfg(test)]
#[allow(unused)]
pub(crate) fn idle_connections() -> Option<u32> {
    CONTENT_POOL.get().map(|p| p.state().idle_connections)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    /// Build an isolated pool over a temp file path. Returns (pool, tempdir)
    /// — keep the TempDir alive for the duration of the test.
    fn isolated_pool() -> (Pool<SqliteConnectionManager>, TempDir) {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("test.db");
        let pool = build_pool(path).expect("build_pool");
        (pool, dir)
    }

    #[test]
    fn pragmas_are_applied_on_acquire() {
        let (pool, _dir) = isolated_pool();
        let conn = pool.get().expect("get from pool");

        // foreign_keys ON
        let fk: i64 = conn
            .query_row("PRAGMA foreign_keys", [], |r| r.get(0))
            .unwrap();
        assert_eq!(fk, 1, "foreign_keys should be ON");

        // journal_mode = wal
        let mode: String = conn
            .query_row("PRAGMA journal_mode", [], |r| r.get(0))
            .unwrap();
        assert_eq!(mode.to_lowercase(), "wal");

        // synchronous = NORMAL (1)
        let sync: i64 = conn
            .query_row("PRAGMA synchronous", [], |r| r.get(0))
            .unwrap();
        assert_eq!(sync, 1, "synchronous should be NORMAL");

        // temp_store = MEMORY (2)
        let ts: i64 = conn
            .query_row("PRAGMA temp_store", [], |r| r.get(0))
            .unwrap();
        assert_eq!(ts, 2, "temp_store should be MEMORY");
    }

    #[test]
    fn connection_returns_to_pool_on_drop() {
        let (pool, _dir) = isolated_pool();

        // Warm the pool so idle_connections reflects reality.
        let conn = pool.get().expect("first acquire");
        drop(conn);

        let idle_before = pool.state().idle_connections;
        assert!(idle_before >= 1, "should have at least 1 idle connection");

        let conn = pool.get().expect("acquire");
        let idle_while_held = pool.state().idle_connections;
        assert_eq!(
            idle_while_held,
            idle_before - 1,
            "idle count should drop by 1 while connection is held"
        );

        drop(conn);
        let idle_after = pool.state().idle_connections;
        assert_eq!(
            idle_after, idle_before,
            "idle count should be restored on drop (no leak)"
        );
    }

    #[test]
    fn pool_respects_max_size() {
        let (pool, _dir) = isolated_pool();
        assert_eq!(pool.max_size(), POOL_MAX_SIZE);
    }

    #[test]
    fn concurrent_reads_do_not_deadlock() {
        use std::sync::Arc;
        let (pool, _dir) = isolated_pool();
        // Create schema
        {
            let c = pool.get().unwrap();
            c.execute("CREATE TABLE t (v INTEGER)", []).unwrap();
            c.execute("INSERT INTO t VALUES (1), (2), (3)", []).unwrap();
        }

        let pool = Arc::new(pool);
        let mut handles = Vec::new();
        for _ in 0..4 {
            let p = Arc::clone(&pool);
            handles.push(std::thread::spawn(move || {
                let c = p.get().expect("get");
                let sum: i64 = c
                    .query_row("SELECT SUM(v) FROM t", [], |r| r.get(0))
                    .unwrap();
                assert_eq!(sum, 6);
            }));
        }
        for h in handles {
            h.join().expect("thread");
        }
    }
}
