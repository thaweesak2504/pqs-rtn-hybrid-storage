use crate::{database_export, hybrid_backup, universal_sqlite_backup};

// Database backup/restore commands
#[tauri::command]
pub fn create_database_backup() -> Result<String, String> {
    universal_sqlite_backup::create_universal_sqlite_backup()
}

#[tauri::command]
pub fn restore_database_backup(backup_filename: String) -> Result<String, String> {
    universal_sqlite_backup::restore_backup(&backup_filename)
}

#[tauri::command]
pub fn list_database_backups() -> Result<Vec<universal_sqlite_backup::BackupInfo>, String> {
    universal_sqlite_backup::list_backups()
}

#[tauri::command]
pub fn delete_database_backup(backup_filename: String) -> Result<String, String> {
    universal_sqlite_backup::delete_backup(&backup_filename)
}

// Database export/import commands
#[tauri::command]
pub fn export_database(format: String) -> Result<String, String> {
    let export_format = match format.to_lowercase().as_str() {
        "json" => database_export::ExportFormat::Json,
        "csv" => database_export::ExportFormat::Csv,
        "sql" => database_export::ExportFormat::Sql,
        _ => return Err("Unsupported export format. Use: json, csv, or sql".to_string()),
    };

    database_export::export_database(export_format)
}

#[tauri::command]
pub fn import_database(import_filename: String) -> Result<String, String> {
    database_export::import_database(&import_filename)
}

#[tauri::command]
pub fn list_database_exports() -> Result<String, String> {
    // Return as JSON string for frontend
    let exports = database_export::list_exports()?;
    serde_json::to_string(&exports).map_err(|e| format!("Failed to serialize exports: {}", e))
}

#[tauri::command]
pub fn delete_database_export(export_filename: String) -> Result<String, String> {
    database_export::delete_export(&export_filename)
}

// Universal SQLite backup commands
#[tauri::command]
pub fn create_universal_sqlite_backup() -> Result<String, String> {
    universal_sqlite_backup::create_universal_sqlite_backup()
}

// create_standard_sql_dump was removed in favor of export_database("sql")
// Hybrid backup commands (Database + Media)
#[tauri::command]
pub fn create_hybrid_backup() -> Result<String, String> {
    hybrid_backup::create_hybrid_backup()
}

#[tauri::command]
pub fn import_hybrid_backup(zip_path: String) -> Result<String, String> {
    hybrid_backup::import_backup(&zip_path)
}

#[tauri::command]
pub fn discover_hybrid_backups() -> Result<String, String> {
    let backups = hybrid_backup::discover_available_backups()
        .map_err(|e| format!("Failed to discover backups: {}", e))?;

    serde_json::to_string(&backups).map_err(|e| format!("Failed to serialize backups: {}", e))
}

#[tauri::command]
pub fn delete_hybrid_backup(filename: String) -> Result<String, String> {
    hybrid_backup::delete_hybrid_backup(&filename)
}

#[tauri::command]
pub fn check_backup_for_initialization() -> Result<String, String> {
    let backup_info = hybrid_backup::check_backup_for_initialization()
        .map_err(|e| format!("Failed to check backups for initialization: {}", e))?;

    serde_json::to_string(&backup_info)
        .map_err(|e| format!("Failed to serialize backup info: {}", e))
}

#[tauri::command]
pub fn check_system_state_for_initialization() -> Result<String, String> {
    let system_state = hybrid_backup::check_system_state_for_initialization()
        .map_err(|e| format!("Failed to check system state for initialization: {}", e))?;

    serde_json::to_string(&system_state)
        .map_err(|e| format!("Failed to serialize system state: {}", e))
}

// File export commands - copy backup files to external location
#[tauri::command]
pub fn export_backup_to_location(
    source_filename: String,
    destination_path: String,
) -> Result<String, String> {
    use std::fs;
    use std::path::Path;
    use tauri::api::path::app_data_dir;
    use tauri::Config;

    // Get source file path from backups directory
    let app_data = app_data_dir(&Config::default()).ok_or("Failed to get app data directory")?;
    let backups_dir = app_data.join("pqs-rtn-hybrid-storage").join("backups");
    let source_path = backups_dir.join(&source_filename);

    // Verify source file exists
    if !source_path.exists() {
        return Err(format!("Source backup file not found: {}", source_filename));
    }

    // Copy file to destination
    let dest = Path::new(&destination_path);
    fs::copy(&source_path, dest).map_err(|e| format!("Failed to copy file: {}", e))?;

    Ok(format!(
        "✅ Backup exported successfully to: {}",
        destination_path
    ))
}

#[tauri::command]
pub fn export_hybrid_backup_to_location(
    source_filename: String,
    destination_path: String,
) -> Result<String, String> {
    use std::fs;
    use std::path::Path;
    use tauri::api::path::app_data_dir;
    use tauri::Config;

    // Get source file path from backups directory
    let app_data = app_data_dir(&Config::default()).ok_or("Failed to get app data directory")?;
    let backups_dir = app_data.join("pqs-rtn-hybrid-storage").join("backups");
    let source_path = backups_dir.join(&source_filename);

    // Verify source file exists
    if !source_path.exists() {
        return Err(format!(
            "Source hybrid backup file not found: {}",
            source_filename
        ));
    }

    // Copy file to destination
    let dest = Path::new(&destination_path);
    fs::copy(&source_path, dest).map_err(|e| format!("Failed to copy file: {}", e))?;

    Ok(format!(
        "✅ Hybrid backup exported successfully to: {}",
        destination_path
    ))
}

#[tauri::command]
pub fn export_sql_to_location(destination_path: String) -> Result<String, String> {
    // Export SQL directly to destination (no intermediate file)
    database_export::export_sql_directly(&destination_path)
}

#[tauri::command]
pub fn copy_sql_export_to_location(
    source_filename: String,
    destination_path: String,
) -> Result<String, String> {
    use std::fs;
    use tauri::api::path::app_data_dir;
    use tauri::Config;

    // Get source file from exports directory
    let app_data = app_data_dir(&Config::default()).ok_or("Failed to get app data directory")?;
    let source_path = app_data
        .join("pqs-rtn-hybrid-storage")
        .join("exports")
        .join(&source_filename);

    if !source_path.exists() {
        return Err(format!("Export file not found: {}", source_filename));
    }

    // Copy to destination
    fs::copy(&source_path, &destination_path)
        .map_err(|e| format!("Failed to copy SQL export: {}", e))?;

    Ok(format!(
        "✅ SQL export copied successfully to: {}",
        destination_path
    ))
}

// Backup management commands
#[tauri::command]
pub fn copy_backup_to_location(
    backup_filename: String,
    destination_path: String,
) -> Result<String, String> {
    universal_sqlite_backup::copy_backup_to_location(&backup_filename, &destination_path)
}

#[tauri::command]
pub fn get_backup_directory_path() -> Result<String, String> {
    let backup_dir = universal_sqlite_backup::get_backup_directory()?;
    Ok(backup_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn list_backup_files_with_paths() -> Result<Vec<(String, String)>, String> {
    universal_sqlite_backup::list_backup_files_with_paths()
}

#[tauri::command]
pub fn get_backup_file_info(backup_filename: String) -> Result<(String, u64, String), String> {
    universal_sqlite_backup::get_backup_file_info(&backup_filename)
}
