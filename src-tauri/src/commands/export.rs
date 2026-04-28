use crate::database_export;

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
