use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::api::path::app_data_dir;
use tauri::Config;

// Export formats
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    Json,
    Csv,
    Sql,
}

// Export structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseExport {
    pub timestamp: u64,
    pub format: ExportFormat,
    pub version: String,
    pub tables: Vec<TableExport>,
    pub metadata: ExportMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableExport {
    pub name: String,
    pub data: Vec<serde_json::Value>,
    pub schema: String,
    pub row_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportMetadata {
    pub created_at: String,
    pub total_tables: usize,
    pub total_rows: usize,
    pub file_size: u64,
    pub format: String,
}

// Export functions
pub fn export_database(format: ExportFormat) -> Result<String, String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let extension = match format {
        ExportFormat::Json => "json",
        ExportFormat::Csv => "csv",
        ExportFormat::Sql => "sql",
    };
    
    let export_filename = format!("database_export_{}.{}", timestamp, extension);
    let export_path = get_export_directory()?.join(&export_filename);
    
    // Get database connection
    let db_path = get_database_path()?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Create export structure
    let mut export = DatabaseExport {
        timestamp,
        format: format.clone(),
        version: "1.0".to_string(),
        tables: Vec::new(),
        metadata: ExportMetadata {
            created_at: chrono::Utc::now().to_rfc3339(),
            total_tables: 0,
            total_rows: 0,
            file_size: 0,
            format: format!("{:?}", format),
        },
    };
    
    // Export all tables
    let table_names = vec!["users", "high_ranking_officers"];
    for table_name in table_names {
        let table_export = export_table(&conn, table_name)?;
        export.tables.push(table_export);
    }
    
    // Update metadata
    export.metadata.total_tables = export.tables.len();
    export.metadata.total_rows = export.tables.iter().map(|t| t.row_count).sum();
    
    // Write export file based on format
    match format {
        ExportFormat::Json => {
            let json_content = serde_json::to_string_pretty(&export)
                .map_err(|e| format!("Failed to serialize JSON: {}", e))?;
            fs::write(&export_path, json_content)
                .map_err(|e| format!("Failed to write JSON file: {}", e))?;
        },
        ExportFormat::Csv => {
            let csv_content = export_to_csv(&export)?;
            fs::write(&export_path, csv_content)
                .map_err(|e| format!("Failed to write CSV file: {}", e))?;
        },
        ExportFormat::Sql => {
            let sql_content = export_to_sql(&export)?;
            fs::write(&export_path, sql_content)
                .map_err(|e| format!("Failed to write SQL file: {}", e))?;
        },
    }
    
    // Update file size
    export.metadata.file_size = fs::metadata(&export_path)
        .map_err(|e| format!("Failed to get file size: {}", e))?
        .len();
    
    Ok(format!("Export created successfully: {}", export_filename))
}

pub fn import_database(import_filename: &str) -> Result<String, String> {
    let import_path = get_export_directory()?.join(import_filename);
    
    // Check if import file exists
    if !import_path.exists() {
        return Err(format!("Import file not found: {}", import_filename));
    }
    
    // Determine format from file extension
    let format = match import_path.extension().and_then(|s| s.to_str()) {
        Some("json") => ExportFormat::Json,
        Some("csv") => ExportFormat::Csv,
        Some("sql") => ExportFormat::Sql,
        _ => return Err("Unsupported file format".to_string()),
    };
    
    // Read import file
    let import_content = fs::read_to_string(&import_path)
        .map_err(|e| format!("Failed to read import file: {}", e))?;
    
    // Get database connection
    let db_path = get_database_path()?;
    let mut conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Start transaction
    let tx = conn.transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;
    
    // Import based on format
    match format {
        ExportFormat::Json => {
            let export: DatabaseExport = serde_json::from_str(&import_content)
                .map_err(|e| format!("Failed to parse JSON: {}", e))?;
            import_from_json(&tx, &export)?;
        },
        ExportFormat::Csv => {
            import_from_csv(&tx, &import_content)?;
        },
        ExportFormat::Sql => {
            import_from_sql(&tx, &import_content)?;
        },
    }
    
    // Commit transaction
    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    Ok(format!("Database imported successfully from: {}", import_filename))
}

pub fn list_exports() -> Result<Vec<String>, String> {
    let export_dir = get_export_directory()?;
    
    if !export_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut exports = Vec::new();
    let entries = fs::read_dir(&export_dir)
        .map_err(|e| format!("Failed to read export directory: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        
        if path.is_file() {
            if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                exports.push(filename.to_string());
            }
        }
    }
    
    // Sort by timestamp (newest first)
    exports.sort_by(|a, b| b.cmp(a));
    
    Ok(exports)
}

pub fn delete_export(export_filename: &str) -> Result<String, String> {
    let export_path = get_export_directory()?.join(export_filename);
    
    if !export_path.exists() {
        return Err(format!("Export file not found: {}", export_filename));
    }
    
    fs::remove_file(&export_path)
        .map_err(|e| format!("Failed to delete export file: {}", e))?;
    
    Ok(format!("Export deleted successfully: {}", export_filename))
}

// Helper functions
fn get_export_directory() -> Result<PathBuf, String> {
    let config = Config::default();
    let app_data = app_data_dir(&config)
        .ok_or("Failed to get app data directory")?;
    
    let export_dir = app_data.join("pqs-rtn-hybrid-storage").join("exports");
    
    if !export_dir.exists() {
        fs::create_dir_all(&export_dir)
            .map_err(|e| format!("Failed to create export directory: {}", e))?;
    }
    
    Ok(export_dir)
}

fn get_database_path() -> Result<PathBuf, String> {
    let config = Config::default();
    let app_data = app_data_dir(&config)
        .ok_or("Failed to get app data directory")?;
    
    let db_dir = app_data.join("pqs-rtn-hybrid-storage");
    std::fs::create_dir_all(&db_dir)
        .map_err(|e| format!("Failed to create database directory: {}", e))?;
    
    Ok(db_dir.join("database.db"))
}

fn export_table(conn: &Connection, table_name: &str) -> Result<TableExport, String> {
    // Get table schema
    let schema = conn.prepare(&format!("SELECT sql FROM sqlite_master WHERE type='table' AND name='{}'", table_name))
        .map_err(|e| format!("Failed to prepare schema query: {}", e))?
        .query_row([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to get table schema: {}", e))?;
    
    // Get table data - use a simpler approach to avoid borrowing issues
    let mut stmt = conn.prepare(&format!("SELECT * FROM {}", table_name))
        .map_err(|e| format!("Failed to prepare data query: {}", e))?;
    
    let rows = stmt.query_map([], |row| {
        let mut map = serde_json::Map::new();
        // Use a simple approach - just get all columns as strings
        let mut i = 0;
        loop {
            match row.get::<_, String>(i) {
                Ok(value) => {
                    map.insert(format!("column_{}", i), serde_json::Value::String(value));
                    i += 1;
                },
                Err(_) => break,
            }
        }
        Ok(serde_json::Value::Object(map))
    }).map_err(|e| format!("Failed to query table data: {}", e))?;
    
    let mut data = Vec::new();
    for row in rows {
        let row = row.map_err(|e| format!("Failed to process row: {}", e))?;
        data.push(row);
    }
    
    let row_count = data.len();
    Ok(TableExport {
        name: table_name.to_string(),
        data,
        schema,
        row_count,
    })
}

fn export_to_csv(export: &DatabaseExport) -> Result<String, String> {
    let mut csv_content = String::new();
    
    for table in &export.tables {
        csv_content.push_str(&format!("# Table: {}\n", table.name));
        csv_content.push_str(&format!("# Schema: {}\n", table.schema));
        csv_content.push_str(&format!("# Rows: {}\n", table.row_count));
        
        if !table.data.is_empty() {
            // Get column names from first row
            if let Some(first_row) = table.data.first() {
                if let Some(obj) = first_row.as_object() {
                    let columns: Vec<&String> = obj.keys().collect();
                    csv_content.push_str(&columns.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(","));
                    csv_content.push_str("\n");
                    
                    // Add data rows
                    for row in &table.data {
                        if let Some(obj) = row.as_object() {
                            let values: Vec<String> = columns.iter()
                                .map(|col| {
                                    obj.get(*col)
                                        .map(|v| v.to_string())
                                        .unwrap_or_else(|| "".to_string())
                                })
                                .collect();
                            csv_content.push_str(&values.join(","));
                            csv_content.push_str("\n");
                        }
                    }
                }
            }
        }
        
        csv_content.push_str("\n");
    }
    
    Ok(csv_content)
}

fn export_to_sql(export: &DatabaseExport) -> Result<String, String> {
    let mut sql_content = String::new();
    
    sql_content.push_str("-- Database Export\n");
    sql_content.push_str(&format!("-- Created: {}\n", export.metadata.created_at));
    sql_content.push_str(&format!("-- Format: {:?}\n", export.format));
    sql_content.push_str(&format!("-- Total Tables: {}\n", export.metadata.total_tables));
    sql_content.push_str(&format!("-- Total Rows: {}\n", export.metadata.total_rows));
    sql_content.push_str("\n");
    
    for table in &export.tables {
        sql_content.push_str(&format!("-- Table: {}\n", table.name));
        sql_content.push_str(&format!("-- Schema: {}\n", table.schema));
        sql_content.push_str(&format!("-- Rows: {}\n", table.row_count));
        
        if !table.data.is_empty() {
            // Get column names from first row
            if let Some(first_row) = table.data.first() {
                if let Some(obj) = first_row.as_object() {
                    let columns: Vec<&String> = obj.keys().collect();
                    
                    // Add INSERT statements
                    for row in &table.data {
                        if let Some(obj) = row.as_object() {
                            let values: Vec<String> = columns.iter()
                                .map(|col| {
                                    let value = obj.get(*col).unwrap_or(&serde_json::Value::Null);
                                    match value {
                                        serde_json::Value::String(s) => format!("'{}'", s.replace("'", "''")),
                                        serde_json::Value::Number(n) => n.to_string(),
                                        serde_json::Value::Bool(b) => b.to_string(),
                                        serde_json::Value::Null => "NULL".to_string(),
                                        _ => "NULL".to_string(),
                                    }
                                })
                                .collect();
                            
                            sql_content.push_str(&format!(
                                "INSERT INTO {} ({}) VALUES ({});\n",
                                table.name,
                                columns.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(", "),
                                values.join(", ")
                            ));
                        }
                    }
                }
            }
        }
        
        sql_content.push_str("\n");
    }
    
    Ok(sql_content)
}

fn import_from_json(tx: &rusqlite::Transaction, export: &DatabaseExport) -> Result<(), String> {
    for table in &export.tables {
        // Clear existing data
        tx.execute(&format!("DELETE FROM {}", table.name), [])
            .map_err(|e| format!("Failed to clear table {}: {}", table.name, e))?;
        
        // Insert new data
        for row in &table.data {
            if let Some(obj) = row.as_object() {
                let mut columns = Vec::new();
                let mut values = Vec::new();
                let mut placeholders = Vec::new();
                
                for (key, value) in obj {
                    columns.push(key);
                    values.push(value.clone());
                    placeholders.push("?");
                }
                
                let query = format!(
                    "INSERT INTO {} ({}) VALUES ({})",
                    table.name,
                    columns.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(", "),
                    placeholders.join(", ")
                );
                
                let mut stmt = tx.prepare(&query)
                    .map_err(|e| format!("Failed to prepare insert statement: {}", e))?;
                
                let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
                for value in values {
                    match value {
                        serde_json::Value::String(s) => params.push(Box::new(s)),
                        serde_json::Value::Number(n) => {
                            if let Some(i) = n.as_i64() {
                                params.push(Box::new(i));
                            } else if let Some(f) = n.as_f64() {
                                params.push(Box::new(f));
                            } else {
                                params.push(Box::new(n.to_string()));
                            }
                        },
                        serde_json::Value::Bool(b) => params.push(Box::new(b)),
                        serde_json::Value::Null => params.push(Box::new(None::<String>)),
                        _ => params.push(Box::new(value.to_string())),
                    }
                }
                let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
                stmt.execute(param_refs.as_slice())
                    .map_err(|e| format!("Failed to execute insert: {}", e))?;
            }
        }
    }
    
    Ok(())
}

fn import_from_csv(tx: &rusqlite::Transaction, csv_content: &str) -> Result<(), String> {
    // Simple CSV import - can be enhanced for complex CSV files
    let lines: Vec<&str> = csv_content.lines().collect();
    let mut current_table = String::new();
    let mut columns = Vec::new();
    
    for line in lines {
        if line.starts_with("# Table: ") {
            current_table = line.replace("# Table: ", "").trim().to_string();
        } else if line.starts_with("# Schema: ") {
            // Skip schema line
        } else if line.starts_with("# Rows: ") {
            // Skip rows line
        } else if !line.is_empty() && !line.starts_with("#") {
            if columns.is_empty() {
                columns = line.split(',').map(|s| s.trim().to_string()).collect();
            } else {
                let values: Vec<&str> = line.split(',').collect();
                if values.len() == columns.len() {
                    let placeholders = vec!["?"; columns.len()].join(", ");
                    let query = format!(
                        "INSERT INTO {} ({}) VALUES ({})",
                        current_table,
                        columns.join(", "),
                        placeholders
                    );
                    
                    let mut stmt = tx.prepare(&query)
                        .map_err(|e| format!("Failed to prepare insert statement: {}", e))?;
                    
                    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
                    stmt.execute(params.as_slice())
                        .map_err(|e| format!("Failed to execute insert: {}", e))?;
                }
            }
        }
    }
    
    Ok(())
}

fn import_from_sql(tx: &rusqlite::Transaction, sql_content: &str) -> Result<(), String> {
    // Simple SQL import - can be enhanced for complex SQL files
    let statements: Vec<&str> = sql_content.split(';').collect();
    
    for statement in statements {
        let statement = statement.trim();
        if !statement.is_empty() && !statement.starts_with("--") {
            tx.execute(statement, [])
                .map_err(|e| format!("Failed to execute SQL statement: {}", e))?;
        }
    }
    
    Ok(())
}
