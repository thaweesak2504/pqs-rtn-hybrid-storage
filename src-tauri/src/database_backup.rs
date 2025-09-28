use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::api::path::app_data_dir;
use tauri::Config;
use base64::{Engine as _, engine::general_purpose};

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

pub fn create_backup() -> Result<String, String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let backup_filename = format!("database_backup_{}.json", timestamp);
    let backup_path = get_backup_directory()?.join(&backup_filename);
    
    let db_path = get_database_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let mut backup = DatabaseBackup {
        timestamp,
        version: "1.0".to_string(),
        tables: Vec::new(),
        metadata: BackupMetadata {
            created_at: chrono::Utc::now().to_rfc3339(),
            total_tables: 0,
            total_rows: 0,
            user_count: 0,
            avatar_count: 0,
            high_ranking_count: 0,
            file_size: 0,
        },
    };
    
    // Get table list
    let tables = get_table_list(&conn)?;
    
    for table_name in tables {
        let table_backup = backup_table(&conn, &table_name)?;
        backup.metadata.total_rows += table_backup.row_count;
        backup.tables.push(table_backup);
    }
    
    backup.metadata.total_tables = backup.tables.len();
    backup.metadata.user_count = get_table_count(&conn, "users")?;
    backup.metadata.avatar_count = get_table_count(&conn, "avatars")?;
    backup.metadata.high_ranking_count = get_table_count(&conn, "high_ranking_officers")?;
    
    // Write backup to file
    let backup_json = serde_json::to_string_pretty(&backup)
        .map_err(|e| format!("Failed to serialize backup: {}", e))?;
    
    fs::write(&backup_path, backup_json)
        .map_err(|e| format!("Failed to write backup file: {}", e))?;
    
    backup.metadata.file_size = backup_path.metadata()
        .map_err(|e| format!("Failed to get file size: {}", e))?
        .len();
    
    Ok(format!("Backup created successfully: {}", backup_filename))
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
    
    // JSON backup - use existing method
    let backup_content = fs::read_to_string(&backup_path)
        .map_err(|e| format!("Failed to read backup file: {}", e))?;
    
    // Parse backup
    let backup: DatabaseBackup = serde_json::from_str(&backup_content)
        .map_err(|e| format!("Failed to parse backup file: {}", e))?;
    
    // Get database connection
    let db_path = get_database_path()?;
    let mut conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Start transaction
    let tx = conn.transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;
    
    // Clear existing data
    tx.execute("DELETE FROM high_ranking_avatars", [])
        .map_err(|e| format!("Failed to clear high_ranking_avatars: {}", e))?;
    tx.execute("DELETE FROM high_ranking_officers", [])
        .map_err(|e| format!("Failed to clear high_ranking_officers: {}", e))?;
    tx.execute("DELETE FROM avatars", [])
        .map_err(|e| format!("Failed to clear avatars: {}", e))?;
    tx.execute("DELETE FROM users", [])
        .map_err(|e| format!("Failed to clear users: {}", e))?;
    
    // Restore data from backup
    for table in &backup.tables {
        restore_table(&tx, table)?;
    }
    
    // Commit transaction
    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    // Verify restore by counting users
    let user_count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to verify restored database: {}", e))?;
    
    Ok(format!("✅ JSON backup restored successfully! Found {} users in restored database. Application will refresh automatically.", user_count))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub filename: String,
    pub timestamp: u64,
    pub size: u64,
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
                    if filename.ends_with(".json") || filename.ends_with(".db") || filename.ends_with(".sql") {
                        let metadata = fs::metadata(&path)
                            .map_err(|e| format!("Failed to read file metadata: {}", e))?;
                        
                        // Extract timestamp from filename
                        let timestamp = if filename.starts_with("database_backup_") && filename.ends_with(".json") {
                            // JSON backup format: database_backup_TIMESTAMP.json
                            let timestamp_str = filename
                                .strip_prefix("database_backup_")
                                .and_then(|s| s.strip_suffix(".json"))
                                .unwrap_or("0");
                            timestamp_str.parse::<u64>().unwrap_or(0)
                        } else if filename.starts_with("database_universal_") && filename.ends_with(".db") {
                            // Universal backup format: database_universal_TIMESTAMP.db
                            let timestamp_str = filename
                                .strip_prefix("database_universal_")
                                .and_then(|s| s.strip_suffix(".db"))
                                .unwrap_or("0");
                            timestamp_str.parse::<u64>().unwrap_or(0)
                        } else if filename.starts_with("database_standard_") && filename.ends_with(".sql") {
                            // SQL dump format: database_standard_TIMESTAMP.sql
                            let timestamp_str = filename
                                .strip_prefix("database_standard_")
                                .and_then(|s| s.strip_suffix(".sql"))
                                .unwrap_or("0");
                            timestamp_str.parse::<u64>().unwrap_or(0)
                        } else {
                            // Fallback to file modification time for other files
                            metadata.modified()
                                .map_err(|e| format!("Failed to get file modification time: {}", e))?
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
    
    // Sort by timestamp (newest first)
    backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    
    Ok(backups)
}

pub fn delete_backup(backup_filename: &str) -> Result<String, String> {
    let backup_path = get_backup_directory()?.join(backup_filename);
    
    if !backup_path.exists() {
        return Err(format!("Backup file not found: {}", backup_filename));
    }
    
    fs::remove_file(&backup_path)
        .map_err(|e| format!("Failed to delete backup file: {}", e))?;
    
    Ok(format!("Backup deleted successfully: {}", backup_filename))
}

fn get_backup_directory() -> Result<PathBuf, String> {
    let config = Config::default();
    let app_data = app_data_dir(&config)
        .ok_or("Failed to get app data directory")?;
    
    let backup_dir = app_data.join("pqs-rtn-tauri").join("backups");
    
    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir)
            .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    }
    
    Ok(backup_dir)
}

fn get_database_path() -> Result<PathBuf, String> {
    let config = Config::default();
    let app_data = app_data_dir(&config)
        .ok_or("Failed to get app data directory")?;
    
    Ok(app_data.join("pqs-rtn-tauri").join("database.db"))
}

fn get_table_list(conn: &Connection) -> Result<Vec<String>, String> {
    let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .map_err(|e| format!("Failed to prepare table list query: {}", e))?;
    
    let table_names = stmt.query_map([], |row| {
        Ok(row.get::<_, String>(0)?)
    }).map_err(|e| format!("Failed to query table names: {}", e))?;
    
    let mut tables = Vec::new();
    for table_name in table_names {
        tables.push(table_name.map_err(|e| format!("Failed to get table name: {}", e))?);
    }
    
    Ok(tables)
}

fn backup_table(conn: &Connection, table_name: &str) -> Result<TableBackup, String> {
    // Get table schema
    let schema = conn.query_row::<String, _, _>(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?1",
        [table_name],
        |row| Ok(row.get(0)?)
    ).map_err(|e| format!("Failed to get table schema for {}: {}", table_name, e))?;
    
    // Get table data
    let mut stmt = conn.prepare(&format!("SELECT * FROM {}", table_name))
        .map_err(|e| format!("Failed to prepare data query for {}: {}", table_name, e))?;
    
    let rows = stmt.query_map([], |row| {
        let mut values = Vec::new();
        let mut i = 0;
        loop {
            // Try different data types
            if let Ok(value) = row.get::<_, String>(i) {
                values.push(serde_json::Value::String(value));
                i += 1;
            } else if let Ok(value) = row.get::<_, i64>(i) {
                values.push(serde_json::Value::Number(serde_json::Number::from(value)));
                i += 1;
            } else if let Ok(value) = row.get::<_, f64>(i) {
                values.push(serde_json::Value::Number(serde_json::Number::from_f64(value).unwrap_or(serde_json::Number::from(0))));
                i += 1;
            } else if let Ok(value) = row.get::<_, bool>(i) {
                values.push(serde_json::Value::Bool(value));
                i += 1;
            } else if let Ok(value) = row.get::<_, Vec<u8>>(i) {
                // Convert BLOB to base64 string
                let base64_str = general_purpose::STANDARD.encode(value);
                values.push(serde_json::Value::String(base64_str));
                i += 1;
            } else {
                // Try NULL
                if let Ok(_) = row.get::<_, Option<String>>(i) {
                    values.push(serde_json::Value::Null);
                    i += 1;
                } else {
                    break;
                }
            }
        }
        Ok(values)
    }).map_err(|e| format!("Failed to query data for {}: {}", table_name, e))?;
    
    let mut data = Vec::new();
    for row in rows {
        let values = row.map_err(|e| format!("Failed to get data row: {}", e))?;
        data.push(serde_json::Value::Array(values));
    }
    
    let row_count = data.len();
    Ok(TableBackup {
        name: table_name.to_string(),
        schema,
        data,
        row_count,
    })
}

fn restore_table(tx: &rusqlite::Transaction, table: &TableBackup) -> Result<(), String> {
    // Recreate table schema
    tx.execute(&table.schema, [])
        .map_err(|e| format!("Failed to recreate table {}: {}", table.name, e))?;
    
    // Insert data
    for row_value in &table.data {
        let values = row_value.as_array()
            .ok_or_else(|| "Invalid row data format".to_string())?;
        
        if values.is_empty() {
            continue;
        }
        
        let placeholders = vec!["?"; values.len()].join(", ");
        let insert_sql = format!("INSERT INTO {} VALUES ({})", table.name, placeholders);
        
        let mut stmt = tx.prepare(&insert_sql)
            .map_err(|e| format!("Failed to prepare insert statement: {}", e))?;
        
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        for value in values {
            match value {
                serde_json::Value::String(s) => {
                    // Decode base64 for BLOBs (avatars)
                    if table.name == "avatars" && s.len() > 100 {
                        if let Ok(decoded_bytes) = general_purpose::STANDARD.decode(s) {
                            params.push(Box::new(decoded_bytes));
                        } else {
                            params.push(Box::new(s.clone()));
                        }
                    } else {
                        params.push(Box::new(s.clone()));
                    }
                },
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        params.push(Box::new(i));
                    } else if let Some(f) = n.as_f64() {
                        params.push(Box::new(f));
                    } else {
                        params.push(Box::new(n.to_string()));
                    }
                },
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

fn get_table_count(conn: &Connection, table_name: &str) -> Result<usize, String> {
    let count: i64 = conn.query_row(&format!("SELECT COUNT(*) FROM {}", table_name), [], |row| row.get(0))
        .map_err(|e| format!("Failed to get table count: {}", e))?;
    
    Ok(count as usize)
}

fn restore_universal_sqlite_backup(backup_filename: &str) -> Result<String, String> {
    let backup_path = get_backup_directory()?.join(backup_filename);
    let db_path = get_database_path()?;
    
    // Create backup of current database (only if it exists and has content)
    let current_backup_path = db_path.with_extension("backup");
    if db_path.exists() {
        let metadata = fs::metadata(&db_path)
            .map_err(|e| format!("Failed to get database metadata: {}", e))?;
        
        // Only backup if the database has content (size > 0)
        if metadata.len() > 0 {
            fs::copy(&db_path, &current_backup_path)
                .map_err(|e| format!("Failed to backup current database: {}", e))?;
        }
    }
    
    // Copy backup file to database location
    fs::copy(&backup_path, &db_path)
        .map_err(|e| format!("Failed to restore database: {}", e))?;
    
    // Verify the restored database
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open restored database: {}", e))?;
    
    // Test basic functionality
    let user_count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to verify restored database: {}", e))?;
    
    Ok(format!("✅ Database restored successfully! Found {} users in restored database. Application will refresh automatically.", user_count))
}