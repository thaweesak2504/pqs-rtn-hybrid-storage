// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Removed unused imports
use tauri::Manager;

// Database module
mod backup_manager;
mod content_database; // Separate content database
mod database;
mod database_backup;
mod database_export;
mod file_manager;
mod hybrid_avatar;
mod hybrid_backup; // New hybrid backup system
mod hybrid_high_rank_avatar;
mod logger; // Logger system for conditional debug output
mod migration_helper;
mod universal_sqlite_backup; // Database migration utilities

// Re-export database structs
pub use database::{Avatar, HighRankingOfficer, User};
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
fn create_user(
    username: String,
    email: String,
    password: String,
    full_name: String,
    rank: Option<String>,
    role: String,
) -> Result<User, String> {
    // Hash the password before storing
    let password_hash = bcrypt::hash(&password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    database::create_user(
        &username,
        &email,
        &password_hash,
        &full_name,
        rank.as_deref(),
        &role,
    )
}

#[tauri::command]
fn update_user(
    id: i32,
    username: String,
    email: String,
    password_hash: String,
    full_name: String,
    rank: Option<String>,
    role: String,
) -> Result<User, String> {
    database::update_user(
        id,
        &username,
        &email,
        &password_hash,
        &full_name,
        rank.as_deref(),
        &role,
    )
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
    let conn = database::get_connection_safe()
        .map_err(|e| format!("Failed to connect to database: {}", e))?;
    database::migrate_plain_text_passwords(&conn)?;
    Ok("Password migration completed successfully".to_string())
}

#[tauri::command]
fn get_all_avatars() -> Result<Vec<Avatar>, String> {
    database::get_all_avatars()
}

// Zoom commands using root font-size (proper approach for desktop app)
#[tauri::command]
async fn zoom_in(window: tauri::Window) -> Result<(), String> {
    // Scale via root font-size - affects all rem-based sizes
    window
        .eval(
            r#"
        (function() {
            const root = document.documentElement;
            const currentSize = parseFloat(root.style.fontSize || '16');
            const newSize = Math.min(currentSize * 1.1, 32); // Max 200%
            root.style.fontSize = newSize + 'px';
        })()
    "#,
        )
        .map_err(|e| format!("Failed to zoom in: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn zoom_out(window: tauri::Window) -> Result<(), String> {
    // Scale via root font-size - affects all rem-based sizes
    window
        .eval(
            r#"
        (function() {
            const root = document.documentElement;
            const currentSize = parseFloat(root.style.fontSize || '16');
            const newSize = Math.max(currentSize * 0.9, 8); // Min 50%
            root.style.fontSize = newSize + 'px';
        })()
    "#,
        )
        .map_err(|e| format!("Failed to zoom out: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn zoom_reset(window: tauri::Window) -> Result<(), String> {
    // Reset to default font size
    window
        .eval(
            r#"
        (function() {
            document.documentElement.style.fontSize = '16px';
        })()
    "#,
        )
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
fn update_high_ranking_officer(
    id: i32,
    thai_name: String,
    position_thai: String,
    position_english: String,
    order_index: i32,
) -> Result<HighRankingOfficer, String> {
    database::update_high_ranking_officer(
        id,
        &thai_name,
        &position_thai,
        &position_english,
        order_index,
    )
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
fn list_database_exports() -> Result<String, String> {
    // Return as JSON string for frontend
    let exports = database_export::list_exports()?;
    serde_json::to_string(&exports).map_err(|e| format!("Failed to serialize exports: {}", e))
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

// Hybrid backup commands (Database + Media)
#[tauri::command]
fn create_hybrid_backup() -> Result<String, String> {
    hybrid_backup::create_hybrid_backup()
}

#[tauri::command]
fn import_hybrid_backup(zip_path: String) -> Result<String, String> {
    hybrid_backup::import_backup(&zip_path)
}

#[tauri::command]
fn discover_hybrid_backups() -> Result<String, String> {
    let backups = hybrid_backup::discover_available_backups()
        .map_err(|e| format!("Failed to discover backups: {}", e))?;

    serde_json::to_string(&backups).map_err(|e| format!("Failed to serialize backups: {}", e))
}

#[tauri::command]
fn delete_hybrid_backup(filename: String) -> Result<String, String> {
    hybrid_backup::delete_hybrid_backup(&filename)
}

#[tauri::command]
fn check_backup_for_initialization() -> Result<String, String> {
    let backup_info = hybrid_backup::check_backup_for_initialization()
        .map_err(|e| format!("Failed to check backups for initialization: {}", e))?;

    serde_json::to_string(&backup_info)
        .map_err(|e| format!("Failed to serialize backup info: {}", e))
}

#[tauri::command]
fn check_system_state_for_initialization() -> Result<String, String> {
    let system_state = hybrid_backup::check_system_state_for_initialization()
        .map_err(|e| format!("Failed to check system state for initialization: {}", e))?;

    serde_json::to_string(&system_state)
        .map_err(|e| format!("Failed to serialize system state: {}", e))
}

// File export commands - copy backup files to external location
#[tauri::command]
fn export_backup_to_location(
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
fn export_hybrid_backup_to_location(
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
fn export_sql_to_location(destination_path: String) -> Result<String, String> {
    // Export SQL directly to destination (no intermediate file)
    database_export::export_sql_directly(&destination_path)
}

#[tauri::command]
fn copy_sql_export_to_location(
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
fn copy_backup_to_location(
    backup_filename: String,
    destination_path: String,
) -> Result<String, String> {
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
fn save_hybrid_avatar(
    user_id: i32,
    avatar_data: Vec<u8>,
    mime_type: String,
) -> Result<hybrid_avatar::HybridAvatarInfo, String> {
    // Validate avatar data
    if avatar_data.is_empty() {
        return Err("Avatar data is empty".to_string());
    }

    // Check maximum size (10MB)
    const MAX_SIZE: usize = 10 * 1024 * 1024;
    if avatar_data.len() > MAX_SIZE {
        return Err(format!(
            "Avatar data too large: {} bytes (max: {} bytes)",
            avatar_data.len(),
            MAX_SIZE
        ));
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
fn save_hybrid_avatar_stream(
    user_id: i32,
    avatar_data: Vec<u8>,
    mime_type: String,
) -> Result<hybrid_avatar::HybridAvatarInfo, String> {
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
    manager
        .get_user_avatar_info(user_id)
        .map_err(|e| format!("Failed to get avatar info for user {}: {}", user_id, e))
}

#[tauri::command]
fn delete_hybrid_avatar(user_id: i32) -> Result<bool, String> {
    let manager = hybrid_avatar::HybridAvatarManager::new()
        .map_err(|e| format!("Failed to initialize avatar manager: {}", e))?;
    manager
        .delete_avatar(user_id)
        .map_err(|e| format!("Failed to delete avatar for user {}: {}", user_id, e))
}

#[tauri::command]
fn get_hybrid_avatar_base64(avatar_path: String) -> Result<String, String> {
    let manager = hybrid_avatar::HybridAvatarManager::new()
        .map_err(|e| format!("Failed to initialize avatar manager: {}", e))?;
    manager.get_avatar_base64(&avatar_path).map_err(|e| {
        format!(
            "Failed to get avatar base64 for path '{}': {}",
            avatar_path, e
        )
    })
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
fn save_hybrid_high_rank_avatar(
    officer_id: i32,
    avatar_data: Vec<u8>,
    mime_type: String,
) -> Result<hybrid_high_rank_avatar::HybridHighRankAvatarInfo, String> {
    // Validate avatar data
    if avatar_data.is_empty() {
        return Err("Avatar data is empty".to_string());
    }

    // Check maximum size (10MB)
    const MAX_SIZE: usize = 10 * 1024 * 1024;
    if avatar_data.len() > MAX_SIZE {
        return Err(format!(
            "Avatar data too large: {} bytes (max: {} bytes)",
            avatar_data.len(),
            MAX_SIZE
        ));
    }

    // Validate MIME type
    if !mime_type.starts_with("image/") {
        return Err(format!("Invalid MIME type: {}", mime_type));
    }

    let manager = hybrid_high_rank_avatar::HybridHighRankAvatarManager::new()?;
    manager.save_avatar(officer_id, &avatar_data, &mime_type)
}

#[tauri::command]
fn get_hybrid_high_rank_avatar_info(
    officer_id: i32,
) -> Result<hybrid_high_rank_avatar::HybridHighRankAvatarInfo, String> {
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
    let conn = database::get_connection_safe()
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // First, check what users exist
    let user_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| Ok(row.get(0)?))
        .map_err(|e| format!("Failed to count users: {}", e))?;

    // Check what roles exist
    let roles: Vec<String> = conn
        .prepare("SELECT DISTINCT role FROM users")
        .map_err(|e| format!("Failed to prepare roles query: {}", e))?
        .query_map([], |row| Ok(row.get::<_, String>(0)?))
        .map_err(|e| format!("Failed to query roles: {}", e))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("Failed to collect roles: {}", e))?;

    // Delete all users except admin (role = 'admin')
    let rows_affected = conn
        .execute("DELETE FROM users WHERE role != 'admin'", [])
        .map_err(|e| format!("Failed to delete test users: {}", e))?;

    // Check users after deletion
    let remaining_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| Ok(row.get(0)?))
        .map_err(|e| format!("Failed to count remaining users: {}", e))?;

    let remaining_roles: Vec<String> = conn
        .prepare("SELECT DISTINCT role FROM users")
        .map_err(|e| format!("Failed to prepare remaining roles query: {}", e))?
        .query_map([], |row| Ok(row.get::<_, String>(0)?))
        .map_err(|e| format!("Failed to query remaining roles: {}", e))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("Failed to collect remaining roles: {}", e))?;

    // Also delete from avatars table for deleted users
    let _ = conn.execute(
        "DELETE FROM avatars WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin')",
        [],
    );

    // Clean up orphaned avatars
    let _ = database::cleanup_orphaned_avatars();

    Ok(format!(
        "Before: {} users, Roles: {:?}, Deleted: {} users, After: {} users, Remaining roles: {:?}",
        user_count, roles, rows_affected, remaining_count, remaining_roles
    ))
}

#[tauri::command]
fn get_users_count() -> Result<i32, String> {
    let conn = database::get_connection_safe()
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    let count: i32 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| Ok(row.get(0)?))
        .map_err(|e| format!("Failed to count users: {}", e))?;

    Ok(count)
}

#[tauri::command]
fn initialize_database_if_needed() -> Result<String, String> {
    // Check system state first
    let system_state = hybrid_backup::check_system_state_for_initialization()
        .map_err(|e| format!("Failed to check system state: {}", e))?;

    // Only initialize if database or media is missing/invalid
    let should_initialize =
        !(system_state.database_exists_and_valid && system_state.media_exists_and_valid);

    if should_initialize {
        logger::info("Initializing database and media as they are missing or invalid");
        database::initialize_database()
    } else {
        logger::info("Database and media already exist and are valid, skipping initialization");
        Ok("Database and media already initialized".to_string())
    }
}

#[tauri::command]
fn initialize_content_database() -> Result<String, String> {
    content_database::initialize_content_database()
}

#[tauri::command]
fn seed_content_database(file_path: String) -> Result<String, String> {
    content_database::seed_content_database_from_file(&file_path)
}

#[tauri::command]
fn create_new_document(args: content_database::CreateDocumentArgs) -> Result<String, String> {
    content_database::create_document(args)
}

#[tauri::command]
fn generate_document_id_preview(
    unit_code: String,
    doc_type: String,
    user_level: String,
) -> Result<String, String> {
    content_database::generate_document_id(&unit_code, &doc_type, &user_level)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_owner_units(parent_id: Option<String>) -> Result<Vec<content_database::OwnerUnit>, String> {
    content_database::get_owner_units(parent_id)
}

#[tauri::command]
fn search_documents(
    unit_id_prefix: Option<String>,
    doc_type: Option<String>,
    name_part: Option<String>,
    status: Option<String>,
) -> Result<Vec<content_database::Document>, String> {
    content_database::search_documents(unit_id_prefix, doc_type, name_part, status)
}

#[tauri::command]
fn delete_document(id: String) -> Result<String, String> {
    content_database::delete_document(id)
}

#[tauri::command]
fn update_document(args: content_database::UpdateDocumentArgs) -> Result<String, String> {
    content_database::update_document(args)
}

#[tauri::command]
fn get_document_questions(doc_id: String) -> Result<Vec<content_database::Question>, String> {
    content_database::get_document_questions(doc_id)
}

#[tauri::command]
fn get_document_questions_with_details(
    doc_id: String,
) -> Result<Vec<content_database::QuestionDetail>, String> {
    content_database::get_document_questions_with_details(doc_id)
}

#[tauri::command]
fn get_document_with_hierarchy(id: String) -> Result<content_database::DocumentHierarchy, String> {
    content_database::get_document_with_hierarchy(id)
}

#[tauri::command]
fn create_question(args: content_database::CreateQuestionArgs) -> Result<String, String> {
    content_database::create_question(args)
}

#[tauri::command]
fn update_question(args: content_database::UpdateQuestionArgs) -> Result<(), String> {
    content_database::update_question(args)
}

#[tauri::command]
fn delete_question(id: String) -> Result<(), String> {
    content_database::delete_question(id)
}

#[tauri::command]
fn reorder_questions(question_ids: Vec<String>) -> Result<(), String> {
    content_database::reorder_questions(question_ids)
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

// ===== Section Management Commands =====

#[tauri::command]
fn create_section(
    request: content_database::CreateSectionRequest,
) -> Result<content_database::Section, String> {
    content_database::create_section(request)
}

#[tauri::command]
fn get_sections_by_document(document_id: String) -> Result<Vec<content_database::Section>, String> {
    content_database::get_sections_by_document(document_id)
}

#[tauri::command]
fn delete_section(id: i64) -> Result<(), String> {
    content_database::delete_section(id)
}

#[tauri::command]
fn update_section(args: content_database::UpdateSectionArgs) -> Result<(), String> {
    content_database::update_section(args)
}

#[tauri::command]
fn update_section_order(id: i64, new_order: i32) -> Result<(), String> {
    content_database::update_section_order(id, new_order)
}

#[tauri::command]
fn migrate_section_101() -> Result<usize, String> {
    migration_helper::migrate_create_section_101()
}

// ===== Scoring & User Progress Commands =====

#[tauri::command]
fn calculate_section_total_score(section_id: i64) -> Result<i32, String> {
    content_database::calculate_section_total_score(section_id)
}

#[tauri::command]
fn upsert_user_progress(
    args: content_database::UpsertUserProgressArgs,
) -> Result<content_database::UserProgress, String> {
    content_database::upsert_user_progress(args)
}

#[tauri::command]
fn get_user_progress(
    user_id: String,
    document_id: String,
) -> Result<Vec<content_database::UserProgress>, String> {
    content_database::get_user_progress(user_id, document_id)
}

#[tauri::command]
fn calculate_group_score(parent_id: String) -> Result<i32, String> {
    content_database::calculate_group_score(parent_id)
}

#[tauri::command]
fn update_question_score(args: content_database::UpdateQuestionScoreArgs) -> Result<(), String> {
    content_database::update_question_score(args)
}

// ===== Reference Management Commands =====

#[tauri::command]
fn create_reference(
    request: content_database::CreateReferenceRequest,
) -> Result<content_database::DocumentReference, String> {
    content_database::create_reference(request)
}

#[tauri::command]
fn get_references(
    search: Option<String>,
    category: Option<String>,
) -> Result<Vec<content_database::DocumentReference>, String> {
    content_database::get_references(search, category)
}

#[tauri::command]
fn update_reference(args: content_database::UpdateReferenceArgs) -> Result<(), String> {
    content_database::update_reference(args)
}

#[tauri::command]
fn delete_reference(id: i64) -> Result<(), String> {
    content_database::delete_reference(id)
}

#[tauri::command]
fn delete_all_references() -> Result<(), String> {
    content_database::delete_all_references()
}

#[tauri::command]
fn add_section_reference(
    section_id: i64,
    reference_id: i64,
    display_order: Option<i32>,
) -> Result<(), String> {
    content_database::add_section_reference(section_id, reference_id, display_order)
}

#[tauri::command]
fn remove_section_reference(section_ref_id: i64) -> Result<(), String> {
    content_database::remove_section_reference(section_ref_id)
}

#[tauri::command]
fn get_section_references(
    section_id: i64,
) -> Result<Vec<content_database::SectionReferenceDetail>, String> {
    content_database::get_section_references(section_id)
}

#[tauri::command]
fn add_question_reference(
    req: content_database::AddQuestionReferenceRequest,
) -> Result<(), String> {
    content_database::add_question_reference(req)
}

#[tauri::command]
fn remove_question_reference(id: i32) -> Result<(), String> {
    content_database::remove_question_reference(id)
}

#[tauri::command]
fn update_question_reference_location(
    id: i32,
    location_text: Option<String>,
) -> Result<(), String> {
    content_database::update_question_reference_location(id, location_text)
}

// ==========================================
// QuestionSectionLinks Commands (3xx.1.4/1.5)
// ==========================================

#[tauri::command]
fn add_question_section_link(
    req: content_database::AddQuestionSectionLinkRequest,
) -> Result<content_database::QuestionSectionLink, String> {
    content_database::add_question_section_link(req)
}

#[tauri::command]
fn batch_add_question_section_links(
    req: content_database::BatchAddQuestionSectionLinksRequest,
) -> Result<Vec<content_database::QuestionSectionLink>, String> {
    content_database::batch_add_question_section_links(req)
}

#[tauri::command]
fn remove_question_section_link(id: i64) -> Result<(), String> {
    content_database::remove_question_section_link(id)
}

#[tauri::command]
fn remove_all_question_section_links(question_id: String) -> Result<(), String> {
    content_database::remove_all_question_section_links(question_id)
}

#[tauri::command]
fn get_question_section_links(
    question_id: String,
) -> Result<Vec<content_database::QuestionSectionLink>, String> {
    content_database::get_question_section_links(question_id)
}

#[tauri::command]
fn update_section_link_score(
    args: content_database::UpdateSectionLinkScoreArgs,
) -> Result<(), String> {
    content_database::update_section_link_score(args)
}

#[tauri::command]
fn recalculate_section_link_scores(question_id: String) -> Result<i32, String> {
    content_database::recalculate_section_link_scores(question_id)
}

#[tauri::command]
fn migrate_question_children_to_section_links() -> Result<usize, String> {
    // Legacy: now delegates to the new L3 migration
    content_database::migrate_section_links_to_ref_children()
}

// ==========================================
// Section-Ref L3 Children Commands (3xx.1.4/1.5 → real L3 Questions)
// ==========================================

#[tauri::command]
fn get_section_ref_children(
    parent_id: String,
) -> Result<Vec<content_database::SectionRefChild>, String> {
    content_database::get_section_ref_children(parent_id)
}

#[tauri::command]
fn add_section_ref_child(
    args: content_database::AddSectionRefChildArgs,
) -> Result<content_database::SectionRefChild, String> {
    content_database::add_section_ref_child(args)
}

#[tauri::command]
fn batch_add_section_ref_children(
    args: content_database::BatchAddSectionRefChildrenArgs,
) -> Result<Vec<content_database::SectionRefChild>, String> {
    content_database::batch_add_section_ref_children(args)
}

#[tauri::command]
fn remove_section_ref_child(question_id: String) -> Result<(), String> {
    content_database::remove_section_ref_child(question_id)
}

#[tauri::command]
fn remove_all_section_ref_children(parent_id: String) -> Result<(), String> {
    content_database::remove_all_section_ref_children(parent_id)
}

#[tauri::command]
fn update_section_ref_score(question_id: String, score: i32) -> Result<(), String> {
    content_database::update_section_ref_score(question_id, score)
}

#[tauri::command]
fn migrate_section_links_to_ref_children() -> Result<usize, String> {
    content_database::migrate_section_links_to_ref_children()
}

#[tauri::command]
fn get_required_count_children(
    parent_id: String,
) -> Result<Vec<content_database::RequiredCountChild>, String> {
    content_database::get_required_count_children(parent_id)
}

#[tauri::command]
fn sync_required_count_children(
    args: content_database::SyncRequiredCountArgs,
) -> Result<Vec<content_database::RequiredCountChild>, String> {
    content_database::sync_required_count_children(args)
}

#[tauri::command]
fn check_has_children(parent_id: String) -> Result<bool, String> {
    content_database::check_has_children(parent_id)
}

#[tauri::command]
fn seed_section_104_references(section_id: i64) -> Result<String, String> {
    use rusqlite::params;

    let conn = content_database::get_content_connection()
        .map_err(|e| format!("Failed to connect: {}", e))?;

    // Sample references for Section 104 (CIWS Phalanx)
    let references = vec![
        ("NAVSEA_OP4154_V1P1", "NAVSEA OP4154 Vol.1 Pt.1 Operator's Manual for Gun System Close-In Weapon System Phalanx Mk.15", Some("Manual"), true),
        ("NAVSEA_OP4154_V2", "NAVSEA OP4154 Vol.2 Maintenance Manual for Gun System Close-In Weapon System Phalanx Mk.15", Some("Manual"), true),
        ("SW221_JO_MMO_010", "SW221-JO-MMO-010 Operation Procedure CIWS System", Some("Procedure"), true),
        ("TM_MK15_BLOCK1B", "Technical Manual Phalanx CIWS Mk.15 Block 1B Baseline 2", Some("Technical Manual"), false),
        ("NAVORD_OP4986", "NAVORD OP4986 Ammunition Handling and Storage Safety", Some("Safety Manual"), true),
    ];

    let mut created_count = 0;
    for (idx, (code, title, category, is_common)) in references.iter().enumerate() {
        // Create or get reference
        let ref_id: i64 = conn.query_row(
            "SELECT id FROM DocumentReferences WHERE code = ?1",
            params![code],
            |row| row.get(0),
        ).unwrap_or_else(|_| {
            conn.execute(
                "INSERT INTO DocumentReferences (code, title, category, is_common) VALUES (?1, ?2, ?3, ?4)",
                params![code, title, category, is_common],
            ).ok();
            conn.last_insert_rowid()
        });

        // Link to section
        let display_order = (idx + 1) as i32;
        let result = conn.execute(
            "INSERT OR IGNORE INTO SectionReferences (section_id, reference_id, display_order) VALUES (?1, ?2, ?3)",
            params![section_id, ref_id, display_order],
        );

        if result.is_ok() {
            created_count += 1;
        }
    }

    Ok(format!("Added {} references to Section 104", created_count))
}

#[tauri::command]
fn get_document_stats() -> Result<content_database::DocumentStats, String> {
    content_database::get_document_stats()
}

#[tauri::command]
fn get_document_branch(doc_id: String) -> Result<content_database::DocumentBranch, String> {
    content_database::get_document_branch(doc_id)
}

#[tauri::command]
fn update_document_branch(
    doc_id: String,
    branch_main: Option<String>,
    branch_sub: Option<String>,
) -> Result<(), String> {
    content_database::update_document_branch(doc_id, branch_main, branch_sub)
}

// ==========================================
// Occupation Branch Commands
// ==========================================

#[tauri::command]
fn get_occupation_branches() -> Result<Vec<content_database::OccupationBranch>, String> {
    content_database::get_occupation_branches()
}

#[tauri::command]
fn create_occupation_branch(
    code: String,
    name: String,
) -> Result<content_database::OccupationBranch, String> {
    content_database::create_occupation_branch(code, name)
}

#[tauri::command]
fn update_occupation_branch(code: String, name: String) -> Result<(), String> {
    content_database::update_occupation_branch(code, name)
}

#[tauri::command]
fn delete_occupation_branch(code: String) -> Result<(), String> {
    content_database::delete_occupation_branch(code)
}

#[tauri::command]
fn get_occupation_sub_branches(
    branch_code: String,
) -> Result<Vec<content_database::OccupationSubBranch>, String> {
    content_database::get_occupation_sub_branches(branch_code)
}

#[tauri::command]
fn create_occupation_sub_branch(
    code: String,
    branch_code: String,
    name: String,
) -> Result<content_database::OccupationSubBranch, String> {
    content_database::create_occupation_sub_branch(code, branch_code, name)
}

#[tauri::command]
fn update_occupation_sub_branch(
    code: String,
    branch_code: String,
    name: String,
) -> Result<(), String> {
    content_database::update_occupation_sub_branch(code, branch_code, name)
}

#[tauri::command]
fn delete_occupation_sub_branch(code: String, branch_code: String) -> Result<(), String> {
    content_database::delete_occupation_sub_branch(code, branch_code)
}

#[tauri::command]
fn get_occupation_sub_questions(
    branch_code: String,
    sub_branch_code: String,
) -> Result<Vec<content_database::OccupationSubQuestion>, String> {
    content_database::get_occupation_sub_questions(branch_code, sub_branch_code)
}

#[tauri::command]
fn get_all_sub_questions_for_branch(
    branch_code: String,
) -> Result<Vec<content_database::OccupationSubQuestion>, String> {
    content_database::get_all_sub_questions_for_branch(branch_code)
}

#[tauri::command]
fn create_occupation_sub_question(
    req: content_database::CreateSubQuestionRequest,
) -> Result<content_database::OccupationSubQuestion, String> {
    content_database::create_occupation_sub_question(req)
}

#[tauri::command]
fn update_occupation_sub_question(
    id: i64,
    text: String,
    always_checked: Option<bool>,
) -> Result<(), String> {
    content_database::update_occupation_sub_question(id, text, always_checked)
}

#[tauri::command]
fn delete_occupation_sub_question(id: i64) -> Result<(), String> {
    content_database::delete_occupation_sub_question(id)
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
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
fn show_in_folder(path: String) -> Result<(), String> {
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

#[tauri::command]
fn upload_question_image(
    path: String,
    document_id: String,
    question_id: String,
    friendly_prefix: Option<String>,
) -> Result<String, String> {
    content_database::upload_question_image(path, document_id, question_id, friendly_prefix)
}

#[tauri::command]
fn delete_question_image(path: String) -> Result<(), String> {
    content_database::delete_question_image(path)
}

#[tauri::command]
fn resolve_image_path(path: String) -> Result<String, String> {
    content_database::resolve_image_path(path)
}

#[tauri::command]
fn get_question_image_base64(path: String) -> Result<String, String> {
    content_database::get_question_image_base64(path)
}

#[tauri::command]
fn save_trainee_answer(args: content_database::SaveTraineeAnswerArgs) -> Result<String, String> {
    content_database::save_trainee_answer(args)
}

#[tauri::command]
fn save_qualifier_assessment(
    args: content_database::SaveQualifierAssessmentArgs,
) -> Result<String, String> {
    content_database::save_qualifier_assessment(args)
}

#[tauri::command]
fn get_trainee_answers(
    user_id: String,
    document_id: String,
) -> Result<Vec<content_database::UserAnswer>, String> {
    content_database::get_trainee_answers(&user_id, &document_id)
}

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
            // Hybrid backup commands (Database + Media)
            create_hybrid_backup,
            import_hybrid_backup,
            discover_hybrid_backups,
            delete_hybrid_backup,
            check_backup_for_initialization,
            check_system_state_for_initialization,
            // File export commands
            export_backup_to_location,
            export_hybrid_backup_to_location,
            export_sql_to_location,
            copy_sql_export_to_location,
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
            // Database initialization command
            initialize_database_if_needed,
            initialize_content_database,
            seed_content_database,
            create_new_document,
            generate_document_id_preview,
            get_owner_units,
            search_documents,
            delete_document,
            update_document,
            get_document_questions,
            get_document_questions_with_details, // New command
            create_question,                     // Restored
            update_question,                     // New command
            delete_question,                     // New command
            upload_question_image,               // New image upload command
            delete_question_image,               // New image delete command
            resolve_image_path,                  // New path resolver command
            get_question_image_base64,           // New base64 image command
            reorder_questions,                   // Reorder command
            get_document_with_hierarchy,
            // Section management
            create_section,
            get_sections_by_document,
            delete_section,
            update_section_order,
            update_section,
            migrate_section_101,
            // Reference management
            create_reference,
            get_references,
            update_reference,
            delete_reference,
            delete_all_references,
            add_section_reference,
            remove_section_reference,
            get_section_references,
            seed_section_104_references,
            add_question_reference,
            remove_question_reference,
            update_question_reference_location,
            // QuestionSectionLinks (3xx.1.4/1.5 → 100/200 Sections)
            add_question_section_link,
            batch_add_question_section_links,
            remove_question_section_link,
            remove_all_question_section_links,
            get_question_section_links,
            update_section_link_score,
            recalculate_section_link_scores,
            migrate_question_children_to_section_links,
            get_document_stats,
            open_path,
            show_in_folder,
            // Occupation Branch management
            get_occupation_branches,
            create_occupation_branch,
            update_occupation_branch,
            delete_occupation_branch,
            get_occupation_sub_branches,
            create_occupation_sub_branch,
            update_occupation_sub_branch,
            delete_occupation_sub_branch,
            get_occupation_sub_questions,
            get_all_sub_questions_for_branch,
            create_occupation_sub_question,
            update_occupation_sub_question,
            delete_occupation_sub_question,
            // Section-Ref L3 Children (3xx.1.4/1.5 → real L3 Questions)
            get_section_ref_children,
            add_section_ref_child,
            batch_add_section_ref_children,
            remove_section_ref_child,
            remove_all_section_ref_children,
            update_section_ref_score,
            migrate_section_links_to_ref_children,
            // Required Count Children (3xx.2-3xx.6 L3 "ครั้งที่ X")
            get_required_count_children,
            sync_required_count_children,
            check_has_children,
            // Scoring & User Progress
            calculate_section_total_score,
            upsert_user_progress,
            get_user_progress,
            calculate_group_score,
            update_question_score,
            // Document Branch (Occupation Branch at document level)
            get_document_branch,
            update_document_branch,
            save_trainee_answer,
            save_qualifier_assessment,
            get_trainee_answers,
            content_database::clear_all_trainee_answers,
            content_database::get_sub_question_usage_counts,
            content_database::get_section_progress,
            content_database::get_section_dev_metrics,
            content_database::get_question_answer_keys,
            content_database::update_answer_key,
            content_database::replace_question_answer_keys,
        ])
        .setup(|app| {
            logger::info("Starting application setup...");

            // Initialize content database (OwnerUnits, Documents, etc.)
            match content_database::initialize_content_database() {
                Ok(_) => logger::success("Content database initialized successfully"),
                Err(e) => logger::error(&format!("Failed to initialize content database: {}", e)),
            }

            // Clean up orphaned section_ref questions (from sections deleted before cleanup was added)
            match content_database::cleanup_orphaned_section_refs() {
                Ok(n) if n > 0 => {
                    logger::info(&format!("Cleaned up {} orphaned section_ref(s)", n))
                }
                Ok(_) => {}
                Err(e) => logger::warn(&format!("Failed to cleanup orphaned section_refs: {}", e)),
            }

            // Skip automatic database initialization - let frontend handle it
            logger::info("Skipping automatic database initialization - frontend will handle based on system state"); // Initialize FileManager to ensure directories exist (singleton)
            match file_manager::FileManager::get_instance() {
                Ok(_) => {
                    logger::success("File manager initialized successfully");
                }
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
                        // Force maximize to override any saved state from window-state plugin
                        if let Err(e) = window.maximize() {
                            logger::warn(&format!("Failed to maximize window: {}", e));
                        }
                    }
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
