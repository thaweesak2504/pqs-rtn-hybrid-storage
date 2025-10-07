// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Removed unused imports
use tauri::Manager;

// Database module
mod database;
mod database_backup;
mod database_export;
mod universal_sqlite_backup;
mod backup_manager;
mod file_manager;
mod hybrid_avatar;
mod hybrid_high_rank_avatar;
mod logger; // Logger system for conditional debug output
// mod database_logger; // DISABLED - logging removed

// Re-export database structs
pub use database::{User, Avatar, HighRankingOfficer};
// DEPRECATED: HighRankingAvatar removed - now using file-based storage

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_all_users() -> Result<Vec<User>, String> {
    database::get_all_users()
}

#[tauri::command]
fn get_user_by_id(id: i32) -> Result<Option<User>, String> {
    database::get_user_by_id(id)
}

#[tauri::command]
fn get_user_by_email(email: String) -> Result<Option<User>, String> {
    database::get_user_by_email(&email)
}

#[tauri::command]
fn create_user(username: String, email: String, password: String, full_name: String, rank: Option<String>, role: String) -> Result<User, String> {
    // Hash the password before storing
    let password_hash = bcrypt::hash(&password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))?;
    
    database::create_user(&username, &email, &password_hash, &full_name, rank.as_deref(), &role)
}

#[tauri::command]
fn update_user(id: i32, username: String, email: String, password_hash: String, full_name: String, rank: Option<String>, role: String) -> Result<User, String> {
    database::update_user(id, &username, &email, &password_hash, &full_name, rank.as_deref(), &role)
}

#[tauri::command]
fn delete_user(id: i32) -> Result<bool, String> {
    database::delete_user(id)
}

#[tauri::command]
fn authenticate_user(username_or_email: String, password: String) -> Result<Option<User>, String> {
    database::authenticate_user(&username_or_email, &password)
}

#[tauri::command]
fn get_avatar_by_user_id(user_id: i32) -> Result<Option<Avatar>, String> {
    database::get_avatar_by_user_id(user_id)
}

#[tauri::command]
fn save_avatar(user_id: i32, avatar_data: Vec<u8>, mime_type: String) -> Result<Avatar, String> {
    database::save_avatar(user_id, avatar_data, &mime_type)
}

#[tauri::command]
fn delete_avatar(user_id: i32) -> Result<bool, String> {
    database::delete_avatar(user_id)
}

#[tauri::command]
fn cleanup_orphaned_avatars() -> Result<i32, String> {
    database::cleanup_orphaned_avatars()
}

// Database initialization is handled by Tauri setup
// No need for separate command

#[tauri::command]
fn migrate_passwords() -> Result<String, String> {
    let conn = database::get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
    database::migrate_plain_text_passwords(&conn)?;
    Ok("Password migration completed successfully".to_string())
}


#[tauri::command]
fn get_all_avatars() -> Result<Vec<Avatar>, String> {
    database::get_all_avatars()
}

// Zoom commands using webview evaluation
#[tauri::command]
async fn zoom_in(window: tauri::Window) -> Result<(), String> {
    window.eval("document.body.style.zoom = (parseFloat(document.body.style.zoom) || 1) * 1.1")
        .map_err(|e| format!("Failed to zoom in: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn zoom_out(window: tauri::Window) -> Result<(), String> {
    window.eval("document.body.style.zoom = (parseFloat(document.body.style.zoom) || 1) * 0.9")
        .map_err(|e| format!("Failed to zoom out: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn zoom_reset(window: tauri::Window) -> Result<(), String> {
    window.eval("document.body.style.zoom = 1")
        .map_err(|e| format!("Failed to reset zoom: {}", e))?;
    Ok(())
}

// High Ranking Officers Commands
#[tauri::command]
fn get_all_high_ranking_officers() -> Result<Vec<HighRankingOfficer>, String> {
    database::get_all_high_ranking_officers()
}

// DEPRECATED: save_high_ranking_avatar, get_high_ranking_avatar_by_officer_id commands removed
// Now using hybrid high rank avatar commands


#[tauri::command]
fn update_high_ranking_officer(id: i32, thai_name: String, position_thai: String, position_english: String, order_index: i32) -> Result<HighRankingOfficer, String> {
    database::update_high_ranking_officer(id, &thai_name, &position_thai, &position_english, order_index)
}

#[tauri::command]
fn hash_password(password: String) -> Result<String, String> {
    bcrypt::hash(&password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))
}


// Database backup/restore commands
#[tauri::command]
fn create_database_backup() -> Result<String, String> {
    database_backup::create_backup()
}

#[tauri::command]
fn restore_database_backup(backup_filename: String) -> Result<String, String> {
    database_backup::restore_backup(&backup_filename)
}

#[tauri::command]
fn list_database_backups() -> Result<Vec<database_backup::BackupInfo>, String> {
    database_backup::list_backups()
}

#[tauri::command]
fn delete_database_backup(backup_filename: String) -> Result<String, String> {
    database_backup::delete_backup(&backup_filename)
}

// Database export/import commands
#[tauri::command]
fn export_database(format: String) -> Result<String, String> {
    let export_format = match format.to_lowercase().as_str() {
        "json" => database_export::ExportFormat::Json,
        "csv" => database_export::ExportFormat::Csv,
        "sql" => database_export::ExportFormat::Sql,
        _ => return Err("Unsupported export format. Use: json, csv, or sql".to_string()),
    };
    
    database_export::export_database(export_format)
}

#[tauri::command]
fn import_database(import_filename: String) -> Result<String, String> {
    database_export::import_database(&import_filename)
}

#[tauri::command]
fn list_database_exports() -> Result<Vec<String>, String> {
    database_export::list_exports()
}

#[tauri::command]
fn delete_database_export(export_filename: String) -> Result<String, String> {
    database_export::delete_export(&export_filename)
}

// Universal SQLite backup commands
#[tauri::command]
fn create_universal_sqlite_backup() -> Result<String, String> {
    universal_sqlite_backup::create_universal_sqlite_backup()
}

#[tauri::command]
fn create_standard_sql_dump() -> Result<String, String> {
    universal_sqlite_backup::create_standard_sql_dump()
}

// Backup management commands
#[tauri::command]
fn copy_backup_to_location(backup_filename: String, destination_path: String) -> Result<String, String> {
    backup_manager::copy_backup_to_location(&backup_filename, &destination_path)
}

#[tauri::command]
fn get_backup_directory_path() -> Result<String, String> {
    let backup_dir = backup_manager::get_backup_directory()?;
    Ok(backup_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn list_backup_files_with_paths() -> Result<Vec<(String, String)>, String> {
    backup_manager::list_backup_files_with_paths()
}

#[tauri::command]
fn get_backup_file_info(backup_filename: String) -> Result<(String, u64, String), String> {
    backup_manager::get_backup_file_info(&backup_filename)
}

// Hybrid Avatar Commands
#[tauri::command]
fn save_hybrid_avatar(user_id: i32, avatar_data: Vec<u8>, mime_type: String) -> Result<hybrid_avatar::HybridAvatarInfo, String> {
    // Validate avatar data
    if avatar_data.is_empty() {
        return Err("Avatar data is empty".to_string());
    }
    
    // Check maximum size (10MB)
    const MAX_SIZE: usize = 10 * 1024 * 1024;
    if avatar_data.len() > MAX_SIZE {
        return Err(format!("Avatar data too large: {} bytes (max: {} bytes)", avatar_data.len(), MAX_SIZE));
    }
    
    // Validate MIME type
    if !mime_type.starts_with("image/") {
        return Err(format!("Invalid MIME type: {}", mime_type));
    }
    
    let manager = hybrid_avatar::HybridAvatarManager::new()?;
    manager.save_avatar(user_id, &avatar_data, &mime_type)
}

/// Phase 1.3: Streaming avatar upload to reduce memory usage
/// Uses 8KB chunks instead of loading entire file into Vec<u8>
#[tauri::command]
fn save_hybrid_avatar_stream(user_id: i32, avatar_data: Vec<u8>, mime_type: String) -> Result<hybrid_avatar::HybridAvatarInfo, String> {
    // Validate avatar data
    if avatar_data.is_empty() {
        return Err("Avatar data is empty".to_string());
    }
    
    // Validate MIME type
    if !mime_type.starts_with("image/") {
        return Err(format!("Invalid MIME type: {}", mime_type));
    }
    
    // Create a cursor from the data to act as a reader
    use std::io::Cursor;
    let reader = Cursor::new(avatar_data);
    let data_len = reader.get_ref().len();
    
    // Use streaming method - memory efficient for large files
    let manager = hybrid_avatar::HybridAvatarManager::new()?;
    manager.save_avatar_stream(user_id, reader, &mime_type, Some(data_len))
}

#[tauri::command]
fn get_hybrid_avatar_info(user_id: i32) -> Result<hybrid_avatar::HybridAvatarInfo, String> {
    let manager = hybrid_avatar::HybridAvatarManager::new()
        .map_err(|e| format!("Failed to initialize avatar manager: {}", e))?;
    manager.get_user_avatar_info(user_id)
        .map_err(|e| format!("Failed to get avatar info for user {}: {}", user_id, e))
}

#[tauri::command]
fn delete_hybrid_avatar(user_id: i32) -> Result<bool, String> {
    let manager = hybrid_avatar::HybridAvatarManager::new()
        .map_err(|e| format!("Failed to initialize avatar manager: {}", e))?;
    manager.delete_avatar(user_id)
        .map_err(|e| format!("Failed to delete avatar for user {}: {}", user_id, e))
}

#[tauri::command]
fn get_hybrid_avatar_base64(avatar_path: String) -> Result<String, String> {
    let manager = hybrid_avatar::HybridAvatarManager::new()
        .map_err(|e| format!("Failed to initialize avatar manager: {}", e))?;
    manager.get_avatar_base64(&avatar_path)
        .map_err(|e| format!("Failed to get avatar base64 for path '{}': {}", avatar_path, e))
}

#[tauri::command]
fn migrate_user_avatar_to_file(user_id: i32) -> Result<bool, String> {
    let manager = hybrid_avatar::HybridAvatarManager::new()?;
    manager.migrate_blob_to_file(user_id)
}

#[tauri::command]
fn cleanup_orphaned_avatar_files() -> Result<u32, String> {
    let manager = hybrid_avatar::HybridAvatarManager::new()?;
    manager.cleanup_orphaned_files()
}

#[tauri::command]
fn get_media_directory_path() -> Result<String, String> {
    let manager = file_manager::FileManager::get_instance()?;
    Ok(manager.get_media_directory().to_string_lossy().to_string())
}

// Hybrid High Rank Avatar Commands
#[tauri::command]
fn save_hybrid_high_rank_avatar(officer_id: i32, avatar_data: Vec<u8>, mime_type: String) -> Result<hybrid_high_rank_avatar::HybridHighRankAvatarInfo, String> {
    // Validate avatar data
    if avatar_data.is_empty() {
        return Err("Avatar data is empty".to_string());
    }
    
    // Check maximum size (10MB)
    const MAX_SIZE: usize = 10 * 1024 * 1024;
    if avatar_data.len() > MAX_SIZE {
        return Err(format!("Avatar data too large: {} bytes (max: {} bytes)", avatar_data.len(), MAX_SIZE));
    }
    
    // Validate MIME type
    if !mime_type.starts_with("image/") {
        return Err(format!("Invalid MIME type: {}", mime_type));
    }
    
    let manager = hybrid_high_rank_avatar::HybridHighRankAvatarManager::new()?;
    manager.save_avatar(officer_id, &avatar_data, &mime_type)
}

#[tauri::command]
fn get_hybrid_high_rank_avatar_info(officer_id: i32) -> Result<hybrid_high_rank_avatar::HybridHighRankAvatarInfo, String> {
    let manager = hybrid_high_rank_avatar::HybridHighRankAvatarManager::new()?;
    manager.get_avatar_info(officer_id)
}

#[tauri::command]
fn delete_hybrid_high_rank_avatar(officer_id: i32) -> Result<bool, String> {
    let manager = hybrid_high_rank_avatar::HybridHighRankAvatarManager::new()?;
    manager.delete_avatar(officer_id)
}

#[tauri::command]
fn get_hybrid_high_rank_avatar_base64(avatar_path: String) -> Result<String, String> {
    let manager = hybrid_high_rank_avatar::HybridHighRankAvatarManager::new()?;
    manager.get_avatar_base64(&avatar_path)
}

#[tauri::command]
fn cleanup_orphaned_high_rank_avatar_files() -> Result<u32, String> {
    let manager = hybrid_high_rank_avatar::HybridHighRankAvatarManager::new()?;
    manager.cleanup_orphaned_files()
}

// Test cleanup commands
#[tauri::command]
fn delete_test_users() -> Result<String, String> {
    let conn = database::get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    // First, check what users exist
    let user_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM users",
        [],
        |row| Ok(row.get(0)?)
    ).map_err(|e| format!("Failed to count users: {}", e))?;
    
    // Check what roles exist
    let roles: Vec<String> = conn.prepare("SELECT DISTINCT role FROM users")
        .map_err(|e| format!("Failed to prepare roles query: {}", e))?
        .query_map([], |row| Ok(row.get::<_, String>(0)?))
        .map_err(|e| format!("Failed to query roles: {}", e))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("Failed to collect roles: {}", e))?;
    
    // Delete all users except admin (role = 'admin')
    let rows_affected = conn.execute(
        "DELETE FROM users WHERE role != 'admin'",
        []
    ).map_err(|e| format!("Failed to delete test users: {}", e))?;
    
    // Check users after deletion
    let remaining_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM users",
        [],
        |row| Ok(row.get(0)?)
    ).map_err(|e| format!("Failed to count remaining users: {}", e))?;
    
    let remaining_roles: Vec<String> = conn.prepare("SELECT DISTINCT role FROM users")
        .map_err(|e| format!("Failed to prepare remaining roles query: {}", e))?
        .query_map([], |row| Ok(row.get::<_, String>(0)?))
        .map_err(|e| format!("Failed to query remaining roles: {}", e))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("Failed to collect remaining roles: {}", e))?;
    
    // Also delete from avatars table for deleted users
    let _ = conn.execute(
        "DELETE FROM avatars WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin')",
        []
    );
    
    // Clean up orphaned avatars
    let _ = database::cleanup_orphaned_avatars();
    
    Ok(format!("Before: {} users, Roles: {:?}, Deleted: {} users, After: {} users, Remaining roles: {:?}", user_count, roles, rows_affected, remaining_count, remaining_roles))
}

#[tauri::command]
fn get_users_count() -> Result<i32, String> {
    let conn = database::get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM users",
        [],
        |row| Ok(row.get(0)?)
    ).map_err(|e| format!("Failed to count users: {}", e))?;
    
    Ok(count)
}

// DISABLED - Database logging functions removed
// #[tauri::command]
// fn get_database_logs() -> Result<String, String> {
//     use std::fs;
//     
//     let log_file = "database_operations.log";
//     match fs::read_to_string(log_file) {
//         Ok(content) => Ok(content),
//         Err(_) => Ok("No database logs found yet.".to_string()),
//     }
// }

// #[tauri::command]
// fn clear_database_logs() -> Result<String, String> {
//     use std::fs;
//     
//     let log_file = "database_operations.log";
//     match fs::write(log_file, "") {
//         Ok(_) => Ok("Database logs cleared successfully.".to_string()),
//         Err(e) => Err(format!("Failed to clear logs: {}", e)),
//     }
// }



fn main() {

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            get_all_users,
            get_user_by_id,
            get_user_by_email,
            create_user,
            update_user,
            delete_user,
            authenticate_user,
            get_avatar_by_user_id,
            get_all_avatars,
            save_avatar,
            delete_avatar,
            cleanup_orphaned_avatars,
            migrate_passwords,
            zoom_in,
            zoom_out,
            zoom_reset,
            get_all_high_ranking_officers,
            // DEPRECATED: save_high_ranking_avatar, get_high_ranking_avatar_by_officer_id removed
            // Now using hybrid high rank avatar commands
            update_high_ranking_officer,
            hash_password,
            // get_database_logs, // DISABLED - logging removed
            // clear_database_logs, // DISABLED - logging removed
            // Database backup/restore commands
            create_database_backup,
            restore_database_backup,
            list_database_backups,
            delete_database_backup,
            // Database export/import commands
            export_database,
            import_database,
            list_database_exports,
            delete_database_export,
            // Universal SQLite backup commands
            create_universal_sqlite_backup,
            create_standard_sql_dump,
            // Backup management commands
            copy_backup_to_location,
            get_backup_directory_path,
            list_backup_files_with_paths,
            get_backup_file_info,
            // Hybrid Avatar commands
            save_hybrid_avatar,
            save_hybrid_avatar_stream, // Phase 1.3: Memory-efficient streaming
            get_hybrid_avatar_info,
            delete_hybrid_avatar,
            get_hybrid_avatar_base64,
            migrate_user_avatar_to_file,
            cleanup_orphaned_avatar_files,
            get_media_directory_path,
            // Hybrid High Rank Avatar commands
            save_hybrid_high_rank_avatar,
            get_hybrid_high_rank_avatar_info,
            delete_hybrid_high_rank_avatar,
            get_hybrid_high_rank_avatar_base64,
            cleanup_orphaned_high_rank_avatar_files,
            // Test cleanup commands
            delete_test_users,
            get_users_count,
        ])
        .setup(|app| {
            logger::info("Starting application setup...");
            
            // Initialize database on app startup with comprehensive error handling
            match database::initialize_database() {
                Ok(msg) => {
                    logger::success(&format!("Database initialization successful: {}", msg));
                },
                Err(e) => {
                    logger::critical(&format!("Failed to initialize database: {}", e));
                    logger::error("Application may not function correctly");
                    // Don't return error here - allow app to start but log the issue
                    // Users can still see the UI and potentially fix permissions
                }
            }
            
            // Initialize FileManager to ensure directories exist (singleton)
            match file_manager::FileManager::get_instance() {
                Ok(_) => {
                    logger::success("File manager initialized successfully");
                },
                Err(e) => {
                    logger::warn(&format!("Failed to initialize file manager: {}", e));
                    logger::warn("Avatar operations may not work correctly");
                    // Continue anyway - not critical for app startup
                }
            }
            
            // Show window after it's ready (prevents flickering)
            if let Some(window) = app.get_window("main") {
                match window.show() {
                    Ok(_) => {
                        logger::success("Main window shown successfully");
                        
                        // Window is now maximized in tauri.conf.json
                        // No need to maximize here to prevent transition visibility
                    },
                    Err(e) => logger::error(&format!("Failed to show main window: {}", e)),
                }
            } else {
                logger::warn("Main window not found");
            }
            
            logger::success("Application setup completed");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
