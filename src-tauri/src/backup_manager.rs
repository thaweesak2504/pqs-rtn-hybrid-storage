use std::fs;
use std::path::PathBuf;
use tauri::api::path::app_data_dir;
use tauri::Config;

// Copy backup files to custom location
pub fn copy_backup_to_location(backup_filename: &str, destination_path: &str) -> Result<String, String> {
    let source_path = get_backup_directory()?.join(backup_filename);
    
    if !source_path.exists() {
        return Err(format!("Backup file not found: {}", backup_filename));
    }
    
    let dest_path = PathBuf::from(destination_path);
    
    // Create destination directory if it doesn't exist
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create destination directory: {}", e))?;
    }
    
    // Copy file
    fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy backup file: {}", e))?;
    
    Ok(format!("Backup copied to: {}", dest_path.display()))
}

// Get backup directory path
pub fn get_backup_directory() -> Result<PathBuf, String> {
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

// List all backup files with full paths
pub fn list_backup_files_with_paths() -> Result<Vec<(String, String)>, String> {
    let backup_dir = get_backup_directory()?;
    let mut files = Vec::new();
    
    if !backup_dir.exists() {
        return Ok(files);
    }
    
    let entries = fs::read_dir(&backup_dir)
        .map_err(|e| format!("Failed to read backup directory: {}", e))?;
    
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
    
    // Sort by filename (newest first)
    files.sort_by(|a, b| b.0.cmp(&a.0));
    
    Ok(files)
}

// Get backup file info
pub fn get_backup_file_info(backup_filename: &str) -> Result<(String, u64, String), String> {
    let backup_path = get_backup_directory()?.join(backup_filename);
    
    if !backup_path.exists() {
        return Err(format!("Backup file not found: {}", backup_filename));
    }
    
    let metadata = fs::metadata(&backup_path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    
    let file_size = metadata.len();
    let created_time = metadata.created()
        .map_err(|e| format!("Failed to get creation time: {}", e))?
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let created_date = chrono::DateTime::from_timestamp(created_time as i64, 0)
        .unwrap()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();
    
    Ok((backup_path.to_string_lossy().to_string(), file_size, created_date))
}
