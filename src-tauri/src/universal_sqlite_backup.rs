use crate::content_database::get_content_database_path;
use base64::{engine::general_purpose, Engine as _};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::api::path::app_data_dir;
use tauri::Config;

// Universal SQLite backup that creates standard .db files
pub fn create_universal_sqlite_backup() -> Result<String, String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let backup_filename = format!("database_universal_{}.db", timestamp);
    let backup_path = get_backup_directory()?.join(&backup_filename);

    // Get source database path
    let source_db_path = get_content_database_path()?;

    // Direct file copy to preserve BLOB data
    fs::copy(&source_db_path, &backup_path)
        .map_err(|e| format!("Failed to copy database file: {}", e))?;

    Ok(format!(
        "Universal SQLite backup created: {}",
        backup_filename
    ))
}

// -------------------------------------------------------------
// Legacy JSON Restore Support & General Backup Management
// -------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub filename: String,
    pub timestamp: u64,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseBackup {
    pub timestamp: u64,
    pub version: String,
    pub tables: Vec<TableBackup>,
    pub metadata: BackupMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableBackup {
    pub name: String,
    pub schema: String,
    pub data: Vec<serde_json::Value>,
    pub row_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub created_at: String,
    pub total_tables: usize,
    pub total_rows: usize,
    pub user_count: usize,
    pub avatar_count: usize,
    pub high_ranking_count: usize,
    pub file_size: u64,
}

pub fn restore_backup(backup_filename: &str) -> Result<String, String> {
    let backup_path = get_backup_directory()?.join(backup_filename);

    // Check if backup file exists
    if !backup_path.exists() {
        return Err(format!("Backup file not found: {}", backup_filename));
    }

    // Check file extension to determine restore method
    if let Some(extension) = backup_path.extension().and_then(|s| s.to_str()) {
        if extension == "db" {
            // Universal SQLite backup - use direct file copy
            return restore_universal_sqlite_backup(backup_filename);
        }
    }

    // JSON backup - use legacy schema rebuilding and data mapping
    let backup_content = fs::read_to_string(&backup_path)
        .map_err(|e| format!("Failed to read backup file: {}", e))?;

    let backup: DatabaseBackup = serde_json::from_str(&backup_content)
        .map_err(|e| format!("Failed to parse backup file: {}", e))?;

    let db_path = get_content_database_path()?;
    let mut conn =
        Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    tx.execute("DELETE FROM high_ranking_avatars", [])
        .map_err(|e| format!("Failed to clear high_ranking_avatars: {}", e))?;
    tx.execute("DELETE FROM high_ranking_officers", [])
        .map_err(|e| format!("Failed to clear high_ranking_officers: {}", e))?;
    tx.execute("DELETE FROM avatars", [])
        .map_err(|e| format!("Failed to clear avatars: {}", e))?;
    tx.execute("DELETE FROM users", [])
        .map_err(|e| format!("Failed to clear users: {}", e))?;

    for table in &backup.tables {
        restore_table(&tx, table)?;
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    let user_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to verify restored database: {}", e))?;

    Ok(format!("✅ JSON backup restored successfully! Found {} users in restored database. Application will refresh automatically.", user_count))
}

fn restore_universal_sqlite_backup(backup_filename: &str) -> Result<String, String> {
    let backup_path = get_backup_directory()?.join(backup_filename);
    let db_path = get_content_database_path()?;

    let current_backup_path = db_path.with_extension("backup");
    if db_path.exists() {
        let metadata = fs::metadata(&db_path)
            .map_err(|e| format!("Failed to get database metadata: {}", e))?;

        if metadata.len() > 0 {
            fs::copy(&db_path, &current_backup_path)
                .map_err(|e| format!("Failed to backup current database: {}", e))?;
        }
    }

    fs::copy(&backup_path, &db_path).map_err(|e| format!("Failed to restore database: {}", e))?;

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open restored database: {}", e))?;

    let user_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to verify restored database: {}", e))?;

    Ok(format!("✅ Database restored successfully! Found {} users in restored database. Application will refresh automatically.", user_count))
}

fn restore_table(tx: &rusqlite::Transaction, table: &TableBackup) -> Result<(), String> {
    tx.execute(&table.schema, [])
        .map_err(|e| format!("Failed to recreate table {}: {}", table.name, e))?;

    for row_value in &table.data {
        let values = row_value
            .as_array()
            .ok_or_else(|| "Invalid row data format".to_string())?;

        if values.is_empty() {
            continue;
        }

        let placeholders = vec!["?"; values.len()].join(", ");
        let insert_sql = format!("INSERT INTO {} VALUES ({})", table.name, placeholders);

        let mut stmt = tx
            .prepare(&insert_sql)
            .map_err(|e| format!("Failed to prepare insert statement: {}", e))?;

        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        for value in values {
            match value {
                serde_json::Value::String(s) => {
                    if table.name == "avatars" && s.len() > 100 {
                        if let Ok(decoded_bytes) = general_purpose::STANDARD.decode(s) {
                            params.push(Box::new(decoded_bytes));
                        } else {
                            params.push(Box::new(s.clone()));
                        }
                    } else {
                        params.push(Box::new(s.clone()));
                    }
                }
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        params.push(Box::new(i));
                    } else if let Some(f) = n.as_f64() {
                        params.push(Box::new(f));
                    } else {
                        params.push(Box::new(n.to_string()));
                    }
                }
                serde_json::Value::Bool(b) => params.push(Box::new(*b)),
                serde_json::Value::Null => params.push(Box::new(Option::<String>::None)),
                _ => params.push(Box::new(value.to_string())),
            }
        }

        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        stmt.execute(param_refs.as_slice())
            .map_err(|e| format!("Failed to execute insert: {}", e))?;
    }

    Ok(())
}

pub fn list_backups() -> Result<Vec<BackupInfo>, String> {
    let backup_dir = get_backup_directory()?;
    let mut backups = Vec::new();

    if backup_dir.exists() {
        let entries = fs::read_dir(&backup_dir)
            .map_err(|e| format!("Failed to read backup directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            if path.is_file() {
                if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                    if filename.ends_with(".json")
                        || filename.ends_with(".db")
                        || filename.ends_with(".sql")
                    {
                        let metadata = fs::metadata(&path)
                            .map_err(|e| format!("Failed to read file metadata: {}", e))?;

                        let timestamp = if filename.starts_with("database_backup_")
                            && filename.ends_with(".json")
                        {
                            let timestamp_str = filename
                                .strip_prefix("database_backup_")
                                .and_then(|s| s.strip_suffix(".json"))
                                .unwrap_or("0");
                            timestamp_str.parse::<u64>().unwrap_or(0)
                        } else if filename.starts_with("database_universal_")
                            && filename.ends_with(".db")
                        {
                            let timestamp_str = filename
                                .strip_prefix("database_universal_")
                                .and_then(|s| s.strip_suffix(".db"))
                                .unwrap_or("0");
                            timestamp_str.parse::<u64>().unwrap_or(0)
                        } else if filename.starts_with("database_standard_")
                            && filename.ends_with(".sql")
                        {
                            let timestamp_str = filename
                                .strip_prefix("database_standard_")
                                .and_then(|s| s.strip_suffix(".sql"))
                                .unwrap_or("0");
                            timestamp_str.parse::<u64>().unwrap_or(0)
                        } else {
                            metadata
                                .modified()
                                .map_err(|e| {
                                    format!("Failed to get file modification time: {}", e)
                                })?
                                .duration_since(UNIX_EPOCH)
                                .map_err(|e| format!("Failed to convert timestamp: {}", e))?
                                .as_secs()
                        };

                        backups.push(BackupInfo {
                            filename: filename.to_string(),
                            timestamp,
                            size: metadata.len(),
                        });
                    }
                }
            }
        }
    }

    backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(backups)
}

pub fn delete_backup(backup_filename: &str) -> Result<String, String> {
    let backup_path = get_backup_directory()?.join(backup_filename);

    if !backup_path.exists() {
        return Err(format!("Backup file not found: {}", backup_filename));
    }

    fs::remove_file(&backup_path).map_err(|e| format!("Failed to delete backup file: {}", e))?;
    Ok(format!("Backup deleted successfully: {}", backup_filename))
}

pub fn get_backup_directory() -> Result<PathBuf, String> {
    let config = Config::default();
    let app_data = app_data_dir(&config).ok_or("Failed to get app data directory")?;

    let backup_dir = app_data.join("pqs-rtn-hybrid-storage").join("backups");

    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir)
            .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    }

    Ok(backup_dir)
}

pub fn copy_backup_to_location(
    backup_filename: &str,
    destination_path: &str,
) -> Result<String, String> {
    let source_path = get_backup_directory()?.join(backup_filename);

    if !source_path.exists() {
        return Err(format!("Backup file not found: {}", backup_filename));
    }

    let dest_path = Path::new(destination_path);

    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create destination directory: {}", e))?;
    }

    fs::copy(&source_path, dest_path).map_err(|e| format!("Failed to copy backup file: {}", e))?;
    Ok(format!("Backup copied to: {}", dest_path.display()))
}

pub fn list_backup_files_with_paths() -> Result<Vec<(String, String)>, String> {
    let backup_dir = get_backup_directory()?;
    let mut files = Vec::new();

    if !backup_dir.exists() {
        return Ok(files);
    }

    let entries =
        fs::read_dir(&backup_dir).map_err(|e| format!("Failed to read backup directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.is_file() {
            if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                let full_path = path.to_string_lossy().to_string();
                files.push((filename.to_string(), full_path));
            }
        }
    }

    files.sort_by(|a, b| b.0.cmp(&a.0));
    Ok(files)
}

pub fn get_backup_file_info(backup_filename: &str) -> Result<(String, u64, String), String> {
    let backup_path = get_backup_directory()?.join(backup_filename);

    if !backup_path.exists() {
        return Err(format!("Backup file not found: {}", backup_filename));
    }

    let metadata =
        fs::metadata(&backup_path).map_err(|e| format!("Failed to get file metadata: {}", e))?;

    let file_size = metadata.len();
    let created_time = metadata
        .created()
        .map_err(|e| format!("Failed to get creation time: {}", e))?
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let created_date = chrono::DateTime::from_timestamp(created_time as i64, 0)
        .unwrap()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    Ok((
        backup_path.to_string_lossy().to_string(),
        file_size,
        created_date,
    ))
}
