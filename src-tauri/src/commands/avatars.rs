use crate::{file_manager, hybrid_avatar, hybrid_high_rank_avatar};

// Hybrid Avatar Commands
#[tauri::command]
pub fn save_hybrid_avatar(
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
pub fn save_hybrid_avatar_stream(
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
pub fn get_hybrid_avatar_info(user_id: i32) -> Result<hybrid_avatar::HybridAvatarInfo, String> {
    let manager = hybrid_avatar::HybridAvatarManager::new()
        .map_err(|e| format!("Failed to initialize avatar manager: {}", e))?;
    manager
        .get_user_avatar_info(user_id)
        .map_err(|e| format!("Failed to get avatar info for user {}: {}", user_id, e))
}

#[tauri::command]
pub fn delete_hybrid_avatar(user_id: i32) -> Result<bool, String> {
    let manager = hybrid_avatar::HybridAvatarManager::new()
        .map_err(|e| format!("Failed to initialize avatar manager: {}", e))?;
    manager
        .delete_avatar(user_id)
        .map_err(|e| format!("Failed to delete avatar for user {}: {}", user_id, e))
}

#[tauri::command]
pub fn get_hybrid_avatar_base64(avatar_path: String) -> Result<String, String> {
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
pub fn migrate_user_avatar_to_file(user_id: i32) -> Result<bool, String> {
    let manager = hybrid_avatar::HybridAvatarManager::new()?;
    manager.migrate_blob_to_file(user_id)
}

#[tauri::command]
pub fn cleanup_orphaned_avatar_files() -> Result<u32, String> {
    let manager = hybrid_avatar::HybridAvatarManager::new()?;
    manager.cleanup_orphaned_files()
}

#[tauri::command]
pub fn get_media_directory_path() -> Result<String, String> {
    let manager = file_manager::FileManager::get_instance()?;
    Ok(manager.get_media_directory().to_string_lossy().to_string())
}

// Hybrid High Rank Avatar Commands
#[tauri::command]
pub fn save_hybrid_high_rank_avatar(
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
pub fn get_hybrid_high_rank_avatar_info(
    officer_id: i32,
) -> Result<hybrid_high_rank_avatar::HybridHighRankAvatarInfo, String> {
    let manager = hybrid_high_rank_avatar::HybridHighRankAvatarManager::new()?;
    manager.get_avatar_info(officer_id)
}

#[tauri::command]
pub fn delete_hybrid_high_rank_avatar(officer_id: i32) -> Result<bool, String> {
    let manager = hybrid_high_rank_avatar::HybridHighRankAvatarManager::new()?;
    manager.delete_avatar(officer_id)
}

#[tauri::command]
pub fn get_hybrid_high_rank_avatar_base64(avatar_path: String) -> Result<String, String> {
    let manager = hybrid_high_rank_avatar::HybridHighRankAvatarManager::new()?;
    manager.get_avatar_base64(&avatar_path)
}

#[tauri::command]
pub fn cleanup_orphaned_high_rank_avatar_files() -> Result<u32, String> {
    let manager = hybrid_high_rank_avatar::HybridHighRankAvatarManager::new()?;
    manager.cleanup_orphaned_files()
}
