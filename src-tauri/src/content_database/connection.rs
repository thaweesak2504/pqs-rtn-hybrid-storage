use rusqlite::{Connection, Result as SqlResult};
use std::path::PathBuf;
use tauri::api::path::app_data_dir;
use tauri::Config;

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
/// Get connection to content database
pub fn get_content_connection() -> SqlResult<Connection> {
    let db_path = get_content_database_path().map_err(|e| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_ERROR),
            Some(e),
        )
    })?;

    let conn = Connection::open(db_path)?;

    // Set busy timeout to 5 seconds to handle concurrency
    conn.busy_timeout(std::time::Duration::from_secs(5))?;

    // SQLite configuration for performance
    // journal_mode returns a result row — must use query, not execute
    let _: String = conn.query_row("PRAGMA journal_mode=WAL", [], |row| row.get(0))?;
    conn.execute_batch(
        "PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL; PRAGMA temp_store = MEMORY;",
    )?;

    Ok(conn)
}
