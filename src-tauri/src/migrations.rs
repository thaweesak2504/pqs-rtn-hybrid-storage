//! Schema migration framework.
//!
//! Phase 2 of the project hardening plan: replaces ad-hoc `ALTER TABLE` helpers
//! (e.g. the original `auth::ensure_user_schema_migrations`) with a proper
//! versioned migration runner.
//!
//! # Design
//!
//! - Every migration has a monotonically increasing integer `version` and a
//!   human-readable `name`. Versions must be globally unique — NEVER reuse
//!   or renumber a version once shipped.
//! - The runner tracks applied versions in the `schema_migrations` table.
//!   A migration is only ever applied once per database.
//! - Each migration runs inside its own transaction. A failing migration
//!   rolls back completely (no half-applied state, no row in
//!   `schema_migrations`).
//! - For legacy DBs that were patched by ad-hoc code BEFORE this framework
//!   existed, each migration may declare a `baseline_check` closure that
//!   detects whether the DB is already in the target state. When true, the
//!   migration is marked as applied WITHOUT running `up`. This is the
//!   transition mechanism that lets existing installations cleanly adopt
//!   the framework.
//!
//! # Adding a new migration
//!
//! 1. Pick the next unused version number
//! 2. Write an idempotent-friendly `up` function
//! 3. Add it to `all_migrations()` below
//! 4. If it replaces ad-hoc logic that might already have run on legacy DBs,
//!    provide a `baseline_check`
//! 5. Ship. The runner will apply it on next startup.
//!
//! NEVER modify the `up` function of a migration after it has been released —
//! some installations will have already applied it and will not re-apply.
//! Instead, write a NEW migration that fixes the prior state.

use crate::logger;
use rusqlite::{Connection, Transaction};
use serde::{Deserialize, Serialize};

/// Signature of a forward migration. Receives an open transaction; the runner
/// commits on success or rolls back on error.
pub type MigrationFn = fn(&Transaction) -> rusqlite::Result<()>;

/// Signature of a baseline-detection check. Returns `Ok(true)` when the DB
/// is already in the target state (so the migration should be marked applied
/// without running `up`).
pub type BaselineCheckFn = fn(&Connection) -> rusqlite::Result<bool>;

/// A single schema migration.
pub struct Migration {
    pub version: i64,
    pub name: &'static str,
    pub up: MigrationFn,
    /// Optional: returns `Ok(true)` if the DB is already in the post-migration
    /// state (from ad-hoc pre-framework patches). When present and returning
    /// true, the runner marks this migration applied WITHOUT invoking `up`.
    pub baseline_check: Option<BaselineCheckFn>,
}

/// A record from `schema_migrations`.
///
/// Public introspection API. Currently read only from tests; kept public for
/// a future admin/ops view (e.g. a Tauri command exposing migration history).
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppliedMigration {
    pub version: i64,
    pub name: String,
    pub applied_at: String,
    pub duration_ms: i64,
    /// True when the migration was marked applied via baseline detection
    /// rather than being executed.
    pub baselined: bool,
}

/// Summary of a run. Exposed for logging and tests.
#[derive(Debug, Default, Clone)]
pub struct RunReport {
    /// Versions that were executed in this run.
    pub applied: Vec<i64>,
    /// Versions already marked applied (no-op this run).
    pub skipped: Vec<i64>,
    /// Versions marked applied via baseline detection without running `up`.
    pub baselined: Vec<i64>,
}

pub const MIGRATIONS_TABLE: &str = "schema_migrations";

/// Create the tracking table if it does not exist. Idempotent.
pub fn ensure_migrations_table(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            duration_ms INTEGER NOT NULL DEFAULT 0,
            baselined INTEGER NOT NULL DEFAULT 0
        )",
        [],
    )
    .map_err(|e| format!("Failed to create {}: {}", MIGRATIONS_TABLE, e))?;
    Ok(())
}

/// Return all applied migrations in version order.
///
/// Public introspection API. See `AppliedMigration` for rationale.
#[allow(dead_code)]
pub fn list_applied(conn: &Connection) -> Result<Vec<AppliedMigration>, String> {
    ensure_migrations_table(conn)?;
    let mut stmt = conn
        .prepare(
            "SELECT version, name, applied_at, duration_ms, baselined
             FROM schema_migrations ORDER BY version",
        )
        .map_err(|e| format!("Failed to prepare list_applied query: {}", e))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(AppliedMigration {
                version: row.get(0)?,
                name: row.get(1)?,
                applied_at: row.get(2)?,
                duration_ms: row.get(3)?,
                baselined: row.get::<_, i64>(4)? != 0,
            })
        })
        .map_err(|e| format!("Failed to execute list_applied query: {}", e))?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| format!("Failed to read migration row: {}", e))?);
    }
    Ok(out)
}

fn applied_version_set(conn: &Connection) -> Result<std::collections::HashSet<i64>, String> {
    let mut stmt = conn
        .prepare("SELECT version FROM schema_migrations")
        .map_err(|e| format!("Failed to prepare applied_versions query: {}", e))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, i64>(0))
        .map_err(|e| format!("Failed to execute applied_versions query: {}", e))?;
    let mut set = std::collections::HashSet::new();
    for r in rows {
        set.insert(r.map_err(|e| format!("Failed to read version: {}", e))?);
    }
    Ok(set)
}

fn record_applied(
    tx: &Transaction,
    version: i64,
    name: &str,
    duration_ms: i64,
    baselined: bool,
) -> rusqlite::Result<()> {
    tx.execute(
        "INSERT INTO schema_migrations (version, name, duration_ms, baselined)
         VALUES (?, ?, ?, ?)",
        rusqlite::params![version, name, duration_ms, if baselined { 1 } else { 0 }],
    )?;
    Ok(())
}

/// Run all pending migrations against `conn` in version order.
///
/// - Each migration runs in its own transaction.
/// - If `baseline_check` returns true, the migration is marked applied
///   without invoking `up`.
/// - If any migration fails, its transaction rolls back and the error
///   propagates immediately (subsequent migrations are not attempted).
pub fn run_pending_migrations(
    conn: &mut Connection,
    migrations: &[Migration],
) -> Result<RunReport, String> {
    ensure_migrations_table(conn)?;

    let applied = applied_version_set(conn)?;

    // Enforce unique versions at runtime — guard against programmer error.
    let mut seen = std::collections::HashSet::new();
    for m in migrations {
        if !seen.insert(m.version) {
            return Err(format!(
                "Duplicate migration version {} ({}); versions MUST be unique",
                m.version, m.name
            ));
        }
    }

    // Stable sort so migrations always run in version order regardless of
    // how they were registered.
    let mut sorted: Vec<&Migration> = migrations.iter().collect();
    sorted.sort_by_key(|m| m.version);

    let mut report = RunReport::default();

    for m in sorted {
        if applied.contains(&m.version) {
            report.skipped.push(m.version);
            continue;
        }

        // Baseline detection: schema already matches target state?
        let baseline_hit = match m.baseline_check {
            Some(check) => check(conn).map_err(|e| {
                format!(
                    "Baseline check failed for migration {} ({}): {}",
                    m.version, m.name, e
                )
            })?,
            None => false,
        };

        let tx = conn.transaction().map_err(|e| {
            format!(
                "Failed to begin transaction for migration {} ({}): {}",
                m.version, m.name, e
            )
        })?;

        if baseline_hit {
            record_applied(&tx, m.version, m.name, 0, true).map_err(|e| {
                format!(
                    "Failed to record baseline migration {} ({}): {}",
                    m.version, m.name, e
                )
            })?;
            tx.commit().map_err(|e| {
                format!(
                    "Failed to commit baseline migration {} ({}): {}",
                    m.version, m.name, e
                )
            })?;
            report.baselined.push(m.version);
            logger::info(format!(
                "Baselined migration {} ({}): schema already in target state",
                m.version, m.name
            ));
            continue;
        }

        let start = std::time::Instant::now();
        (m.up)(&tx).map_err(|e| {
            // tx drops → implicit rollback
            format!("Migration {} ({}) failed: {}", m.version, m.name, e)
        })?;
        let duration_ms = start.elapsed().as_millis() as i64;

        record_applied(&tx, m.version, m.name, duration_ms, false).map_err(|e| {
            format!(
                "Migration {} ({}) applied but failed to record: {}",
                m.version, m.name, e
            )
        })?;
        tx.commit().map_err(|e| {
            format!(
                "Failed to commit migration {} ({}): {}",
                m.version, m.name, e
            )
        })?;

        report.applied.push(m.version);
        logger::info(format!(
            "Applied migration {} ({}) in {}ms",
            m.version, m.name, duration_ms
        ));
    }

    Ok(report)
}

// ─────────────────────────────────────────────────────────────────────────────
// Migration definitions
// ─────────────────────────────────────────────────────────────────────────────

fn mig_001_up_add_must_change_password(tx: &Transaction) -> rusqlite::Result<()> {
    tx.execute(
        "ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT 0",
        [],
    )?;
    Ok(())
}

fn mig_001_baseline_check(conn: &Connection) -> rusqlite::Result<bool> {
    // If the users table doesn't exist yet, this migration cannot be baselined
    // (the column doesn't exist — but the table also doesn't, which is a
    // fresh-install signal that means we'll create the table and its column
    // via the schema bootstrap, then baseline this migration on next run).
    //
    // Practically in this codebase `initialize_content_database` runs BEFORE
    // the migration runner, so by the time we get here the users table always
    // exists. The column presence is then the authoritative signal.
    let users_exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'",
        [],
        |row| row.get(0),
    )?;
    if users_exists == 0 {
        return Ok(false);
    }

    let mut stmt = conn.prepare("PRAGMA table_info(users)")?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;
    for r in rows {
        if r? == "must_change_password" {
            return Ok(true);
        }
    }
    Ok(false)
}

/// All migrations known to the app, in definition order (runner sorts by version).
///
/// Append-only: NEVER edit a migration after it has shipped. Add a new one instead.
pub fn all_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        name: "add_must_change_password_to_users",
        up: mig_001_up_add_must_change_password,
        baseline_check: Some(mig_001_baseline_check),
    }]
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn in_memory() -> Connection {
        Connection::open_in_memory().unwrap()
    }

    fn create_users_table_pre_phase1(conn: &Connection) {
        conn.execute(
            "CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL
            )",
            [],
        )
        .unwrap();
    }

    fn create_users_table_with_flag(conn: &Connection) {
        conn.execute(
            "CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                must_change_password BOOLEAN NOT NULL DEFAULT 0
            )",
            [],
        )
        .unwrap();
    }

    fn users_has_column(conn: &Connection, col: &str) -> bool {
        let mut stmt = conn.prepare("PRAGMA table_info(users)").unwrap();
        let cols: Vec<String> = stmt
            .query_map([], |r| r.get::<_, String>(1))
            .unwrap()
            .filter_map(Result::ok)
            .collect();
        cols.iter().any(|c| c == col)
    }

    // ── framework primitives ────────────────────────────────────────────

    #[test]
    fn ensure_migrations_table_is_idempotent() {
        let conn = in_memory();
        ensure_migrations_table(&conn).unwrap();
        ensure_migrations_table(&conn).unwrap();
        // Table exists with expected columns
        let cnt: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(cnt, 1);
    }

    #[test]
    fn list_applied_creates_table_and_returns_empty() {
        let conn = in_memory();
        let applied = list_applied(&conn).unwrap();
        assert!(applied.is_empty());
    }

    // ── fresh install flow ──────────────────────────────────────────────

    #[test]
    fn fresh_install_runs_migration_and_records_it() {
        let mut conn = in_memory();
        create_users_table_pre_phase1(&conn);

        let report = run_pending_migrations(&mut conn, &all_migrations()).unwrap();
        assert_eq!(report.applied, vec![1]);
        assert!(report.baselined.is_empty());
        assert!(report.skipped.is_empty());

        // Column now exists
        assert!(users_has_column(&conn, "must_change_password"));

        // Recorded in tracking table
        let applied = list_applied(&conn).unwrap();
        assert_eq!(applied.len(), 1);
        assert_eq!(applied[0].version, 1);
        assert_eq!(applied[0].name, "add_must_change_password_to_users");
        assert!(!applied[0].baselined);
    }

    // ── baseline (legacy DB already patched) flow ───────────────────────

    #[test]
    fn baseline_detection_marks_applied_without_running_up() {
        let mut conn = in_memory();
        // Simulate a Phase-1-era DB: users table already has the column
        // because the old ad-hoc `ensure_user_schema_migrations` ran.
        create_users_table_with_flag(&conn);

        let report = run_pending_migrations(&mut conn, &all_migrations()).unwrap();
        assert!(report.applied.is_empty());
        assert_eq!(report.baselined, vec![1]);

        let applied = list_applied(&conn).unwrap();
        assert_eq!(applied.len(), 1);
        assert_eq!(applied[0].version, 1);
        assert!(applied[0].baselined);
        assert_eq!(applied[0].duration_ms, 0);
    }

    // ── idempotency / re-run ────────────────────────────────────────────

    #[test]
    fn second_run_skips_already_applied_migrations() {
        let mut conn = in_memory();
        create_users_table_pre_phase1(&conn);

        let r1 = run_pending_migrations(&mut conn, &all_migrations()).unwrap();
        assert_eq!(r1.applied, vec![1]);

        let r2 = run_pending_migrations(&mut conn, &all_migrations()).unwrap();
        assert!(r2.applied.is_empty());
        assert!(r2.baselined.is_empty());
        assert_eq!(r2.skipped, vec![1]);

        // Still only one row in the tracking table
        let applied = list_applied(&conn).unwrap();
        assert_eq!(applied.len(), 1);
    }

    // ── failure / rollback ──────────────────────────────────────────────

    #[test]
    fn failing_migration_rolls_back_and_is_not_recorded() {
        let mut conn = in_memory();
        create_users_table_pre_phase1(&conn);

        fn bad_up(tx: &Transaction) -> rusqlite::Result<()> {
            tx.execute(
                "ALTER TABLE users ADD COLUMN temp_col INTEGER NOT NULL DEFAULT 0",
                [],
            )?;
            // Force failure — reference a non-existent table
            tx.execute("INSERT INTO nonexistent VALUES (1)", [])?;
            Ok(())
        }

        let migs = vec![Migration {
            version: 42,
            name: "deliberately_failing",
            up: bad_up,
            baseline_check: None,
        }];

        let err = run_pending_migrations(&mut conn, &migs).unwrap_err();
        assert!(err.contains("deliberately_failing"), "got: {}", err);

        // Rolled back: temp_col should NOT exist
        assert!(!users_has_column(&conn, "temp_col"));

        // Not recorded as applied
        let applied = list_applied(&conn).unwrap();
        assert!(applied.is_empty());
    }

    // ── ordering / uniqueness guards ────────────────────────────────────

    #[test]
    fn migrations_apply_in_version_order_even_if_registered_out_of_order() {
        let mut conn = in_memory();

        // Need a table to hit with ALTER
        conn.execute(
            "CREATE TABLE t (id INTEGER PRIMARY KEY, a TEXT, b TEXT, c TEXT)",
            [],
        )
        .unwrap();

        fn m1(tx: &Transaction) -> rusqlite::Result<()> {
            tx.execute("UPDATE t SET a='v1' WHERE id=1", [])?;
            Ok(())
        }
        fn m2(tx: &Transaction) -> rusqlite::Result<()> {
            tx.execute("UPDATE t SET b='v2' WHERE id=1", [])?;
            Ok(())
        }
        fn m3(tx: &Transaction) -> rusqlite::Result<()> {
            tx.execute("UPDATE t SET c='v3' WHERE id=1", [])?;
            Ok(())
        }

        conn.execute("INSERT INTO t (id) VALUES (1)", []).unwrap();

        let migs = vec![
            Migration {
                version: 3,
                name: "third",
                up: m3,
                baseline_check: None,
            },
            Migration {
                version: 1,
                name: "first",
                up: m1,
                baseline_check: None,
            },
            Migration {
                version: 2,
                name: "second",
                up: m2,
                baseline_check: None,
            },
        ];

        let report = run_pending_migrations(&mut conn, &migs).unwrap();
        assert_eq!(report.applied, vec![1, 2, 3]);

        // Applied in strict ascending order
        let applied = list_applied(&conn).unwrap();
        let versions: Vec<i64> = applied.iter().map(|a| a.version).collect();
        assert_eq!(versions, vec![1, 2, 3]);
    }

    #[test]
    fn duplicate_version_is_rejected_at_runtime() {
        let mut conn = in_memory();

        fn noop(_tx: &Transaction) -> rusqlite::Result<()> {
            Ok(())
        }

        let migs = vec![
            Migration {
                version: 7,
                name: "one",
                up: noop,
                baseline_check: None,
            },
            Migration {
                version: 7,
                name: "two",
                up: noop,
                baseline_check: None,
            },
        ];

        let err = run_pending_migrations(&mut conn, &migs).unwrap_err();
        assert!(err.contains("Duplicate"), "got: {}", err);
    }

    // ── built-in migration 001 baseline check ───────────────────────────

    #[test]
    fn mig_001_baseline_check_returns_false_when_users_table_absent() {
        let conn = in_memory();
        assert!(!mig_001_baseline_check(&conn).unwrap());
    }

    #[test]
    fn mig_001_baseline_check_returns_false_when_column_missing() {
        let conn = in_memory();
        create_users_table_pre_phase1(&conn);
        assert!(!mig_001_baseline_check(&conn).unwrap());
    }

    #[test]
    fn mig_001_baseline_check_returns_true_when_column_present() {
        let conn = in_memory();
        create_users_table_with_flag(&conn);
        assert!(mig_001_baseline_check(&conn).unwrap());
    }
}
