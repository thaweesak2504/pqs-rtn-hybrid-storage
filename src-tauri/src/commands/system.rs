use crate::{auth, content_database, hybrid_backup};

// Test cleanup commands
#[tauri::command]
pub fn delete_test_users() -> Result<String, String> {
    let conn =
        auth::get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;

    // First, check what users exist
    let user_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count users: {}", e))?;

    // Check what roles exist
    let roles: Vec<String> = conn
        .prepare("SELECT DISTINCT role FROM users")
        .map_err(|e| format!("Failed to prepare roles query: {}", e))?
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to query roles: {}", e))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("Failed to collect roles: {}", e))?;

    // Delete all users except admin (role = 'admin')
    let rows_affected = conn
        .execute("DELETE FROM users WHERE role != 'admin'", [])
        .map_err(|e| format!("Failed to delete test users: {}", e))?;

    // Check users after deletion
    let remaining_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count remaining users: {}", e))?;

    let remaining_roles: Vec<String> = conn
        .prepare("SELECT DISTINCT role FROM users")
        .map_err(|e| format!("Failed to prepare remaining roles query: {}", e))?
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to query remaining roles: {}", e))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("Failed to collect remaining roles: {}", e))?;

    Ok(format!(
        "Before: {} users, Roles: {:?}, Deleted: {} users, After: {} users, Remaining roles: {:?}",
        user_count, roles, rows_affected, remaining_count, remaining_roles
    ))
}

#[tauri::command]
pub fn get_users_count() -> Result<i32, String> {
    let conn =
        auth::get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;

    let count: i32 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count users: {}", e))?;

    Ok(count)
}

#[tauri::command]
pub fn initialize_database_if_needed() -> Result<String, String> {
    // Check system state first
    let system_state = hybrid_backup::check_system_state_for_initialization()
        .map_err(|e| format!("Failed to check system state: {}", e))?;

    // Only initialize if database or media is missing/invalid
    let should_initialize =
        !(system_state.database_exists_and_valid && system_state.media_exists_and_valid);

    if should_initialize {
        auth::initialize_database()
    } else {
        Ok("Database and media already initialized".to_string())
    }
}

#[tauri::command]
pub fn initialize_content_database() -> Result<String, String> {
    content_database::initialize_content_database()
}

#[tauri::command]
pub fn seed_content_database(file_path: String) -> Result<String, String> {
    content_database::seed_content_database_from_file(&file_path)
}

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
