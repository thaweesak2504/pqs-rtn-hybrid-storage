use crate::content_database;

#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let path_to_open = if path.starts_with("data/") || path.starts_with("data\\") {
            // Resolve portable path to physical path
            let data_dir = content_database::get_portable_data_dir()
                .map_err(|e| format!("Failed to get data dir: {}", e))?;

            // Remove "data/" or "data\" prefix
            let relative_path = if path.starts_with("data/") {
                path.strip_prefix("data/").unwrap()
            } else {
                path.strip_prefix("data\\").unwrap()
            };

            data_dir.join(relative_path).to_string_lossy().to_string()
        } else {
            path
        };

        // Use cmd /C start to open URLs or files with their default application
        // The first "" is for the window title (empty) to avoid issues with paths containing spaces
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path_to_open])
            .spawn()
            .map_err(|e| format!("Failed to open path: {}", e))?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        // Simple fallback
        Err("Unsupported OS for open_path".to_string())
    }
}

#[tauri::command]
pub fn show_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let path_to_show = if path.starts_with("data/") || path.starts_with("data\\") {
            // Resolve portable path to physical path
            let data_dir = content_database::get_portable_data_dir()
                .map_err(|e| format!("Failed to get data dir: {}", e))?;

            // Remove "data/" or "data\" prefix
            let relative_path = if path.starts_with("data/") {
                path.strip_prefix("data/").unwrap()
            } else {
                path.strip_prefix("data\\").unwrap()
            };

            data_dir.join(relative_path).to_string_lossy().to_string()
        } else {
            path
        };

        // Use explorer /select,path to highlight the file
        std::process::Command::new("explorer")
            .args(["/select,", &path_to_show])
            .spawn()
            .map_err(|e| format!("Failed to show in folder: {}", e))?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        // Simple fallback
        Err("Unsupported OS for show_in_folder".to_string())
    }
}
