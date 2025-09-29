use rusqlite::params;
use serde::{Deserialize, Serialize};
use crate::file_manager::FileManager;
use crate::database::get_connection;

#[derive(Debug, Serialize, Deserialize)]
pub struct HybridAvatarInfo {
    pub user_id: i32,
    pub avatar_path: Option<String>,
    pub avatar_updated_at: Option<String>,
    pub avatar_mime: Option<String>,
    pub avatar_size: Option<i32>,
    pub file_exists: bool,
}

pub struct HybridAvatarManager {
    file_manager: FileManager,
}

impl HybridAvatarManager {
    pub fn new() -> Result<Self, String> {
        let file_manager = FileManager::new()?;
        Ok(HybridAvatarManager { file_manager })
    }
    
    pub fn save_avatar(&self, user_id: i32, file_data: &[u8], mime_type: &str) -> Result<HybridAvatarInfo, String> {
        let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
        
        // First, verify user exists
        let user_exists = conn.query_row::<i32, _, _>(
            "SELECT COUNT(*) FROM users WHERE id = ?",
            params![user_id],
            |row| Ok(row.get(0)?)
        ).map_err(|e| format!("Failed to check user existence: {}", e))?;
        
        if user_exists == 0 {
            return Err(format!("User with ID {} does not exist", user_id));
        }
        
        // Delete old avatar file if exists
        if let Ok(old_path) = self.get_user_avatar_path(user_id) {
            if let Some(path) = old_path {
                let _ = self.file_manager.delete_avatar_file(&path);
            }
        }
        
        // Save new avatar file
        let avatar_path = self.file_manager.save_avatar_file(user_id, file_data, mime_type)?;
        
        // Update user record with new avatar path
        let updated_at = chrono::Utc::now().to_rfc3339();
        let file_size = file_data.len() as i32;
        
        conn.execute(
            "UPDATE users SET avatar_path = ?, avatar_updated_at = ?, avatar_mime = ?, avatar_size = ? WHERE id = ?",
            params![avatar_path, updated_at, mime_type, file_size, user_id]
        ).map_err(|e| format!("Failed to update user avatar: {}", e))?;
        
        // Delete old BLOB avatar if exists
        conn.execute(
            "DELETE FROM avatars WHERE user_id = ?",
            params![user_id]
        ).map_err(|e| format!("Failed to delete old avatar: {}", e))?;
        
        Ok(HybridAvatarInfo {
            user_id,
            avatar_path: Some(avatar_path),
            avatar_updated_at: Some(updated_at),
            avatar_mime: Some(mime_type.to_string()),
            avatar_size: Some(file_size),
            file_exists: true,
        })
    }
    
    pub fn get_user_avatar_path(&self, user_id: i32) -> Result<Option<String>, String> {
        let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
        
        let avatar_path: Option<String> = conn.query_row(
            "SELECT avatar_path FROM users WHERE id = ?",
            params![user_id],
            |row| Ok(row.get(0)?)
        ).map_err(|e| format!("Failed to get avatar path: {}", e))?;
        
        Ok(avatar_path)
    }
    
    pub fn get_user_avatar_info(&self, user_id: i32) -> Result<HybridAvatarInfo, String> {
        let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
        
        let (avatar_path, avatar_updated_at, avatar_mime, avatar_size): (Option<String>, Option<String>, Option<String>, Option<i32>) = 
            conn.query_row(
                "SELECT avatar_path, avatar_updated_at, avatar_mime, avatar_size FROM users WHERE id = ?",
                params![user_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
            ).map_err(|e| format!("Failed to get user avatar info: {}", e))?;
        
        let file_exists = if let Some(path) = &avatar_path {
            self.file_manager.get_avatar_file_path(path).is_ok()
        } else {
            false
        };
        
        Ok(HybridAvatarInfo {
            user_id,
            avatar_path,
            avatar_updated_at,
            avatar_mime,
            avatar_size,
            file_exists,
        })
    }
    
    pub fn delete_avatar(&self, user_id: i32) -> Result<bool, String> {
        let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
        
        // Get current avatar path
        let avatar_path: Option<String> = conn.query_row(
            "SELECT avatar_path FROM users WHERE id = ?",
            params![user_id],
            |row| Ok(row.get(0)?)
        ).map_err(|e| format!("Failed to get avatar path: {}", e))?;
        
        // Delete file if exists
        if let Some(path) = avatar_path {
            let _ = self.file_manager.delete_avatar_file(&path);
        }
        
        // Update user record
        conn.execute(
            "UPDATE users SET avatar_path = NULL, avatar_updated_at = NULL, avatar_mime = NULL, avatar_size = NULL WHERE id = ?",
            params![user_id]
        ).map_err(|e| format!("Failed to clear user avatar: {}", e))?;
        
        // Delete BLOB avatar if exists
        conn.execute(
            "DELETE FROM avatars WHERE user_id = ?",
            params![user_id]
        ).map_err(|e| format!("Failed to delete BLOB avatar: {}", e))?;
        
        Ok(true)
    }
    
    pub fn get_avatar_file_data(&self, avatar_path: &str) -> Result<Vec<u8>, String> {
        let file_path = self.file_manager.get_avatar_file_path(avatar_path)?;
        std::fs::read(&file_path)
            .map_err(|e| format!("Failed to read avatar file: {}", e))
    }
    
    pub fn get_avatar_base64(&self, avatar_path: &str) -> Result<String, String> {
        let file_data = self.get_avatar_file_data(avatar_path)?;
        use base64::{Engine as _, engine::general_purpose};
        let base64_data = general_purpose::STANDARD.encode(&file_data);
        
        // Determine MIME type from file extension
        let mime_type = if avatar_path.ends_with(".png") {
            "image/png"
        } else if avatar_path.ends_with(".webp") {
            "image/webp"
        } else if avatar_path.ends_with(".gif") {
            "image/gif"
        } else {
            "image/jpeg"
        };
        
        Ok(format!("data:{};base64,{}", mime_type, base64_data))
    }
    
    pub fn cleanup_orphaned_files(&self) -> Result<u32, String> {
        let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
        
        // Get all valid avatar paths from database
        let mut stmt = conn.prepare("SELECT avatar_path FROM users WHERE avatar_path IS NOT NULL")
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        
        let valid_paths: Result<Vec<String>, _> = stmt.query_map([], |row| {
            Ok(row.get::<_, String>(0)?)
        }).map_err(|e| format!("Failed to query avatar paths: {}", e))?
        .collect();
        
        let valid_paths = valid_paths.map_err(|e| format!("Failed to collect avatar paths: {}", e))?;
        
        // Clean up orphaned files
        self.file_manager.cleanup_orphaned_files(&valid_paths)
    }
    
    pub fn migrate_blob_to_file(&self, user_id: i32) -> Result<bool, String> {
        let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
        
        // Check if user already has file-based avatar
        let has_file_avatar: bool = conn.query_row(
            "SELECT avatar_path IS NOT NULL FROM users WHERE id = ?",
            params![user_id],
            |row| Ok(row.get(0)?)
        ).map_err(|e| format!("Failed to check file avatar: {}", e))?;
        
        if has_file_avatar {
            return Ok(false); // Already migrated
        }
        
        // Get BLOB avatar
        let blob_avatar: Option<(Vec<u8>, String)> = conn.query_row(
            "SELECT avatar_data, mime_type FROM avatars WHERE user_id = ?",
            params![user_id],
            |row| Ok((row.get(0)?, row.get(1)?))
        ).ok();
        
        if let Some((avatar_data, mime_type)) = blob_avatar {
            // Save to file
            let avatar_path = self.file_manager.save_avatar_file(user_id, &avatar_data, &mime_type)?;
            
            // Update user record
            let updated_at = chrono::Utc::now().to_rfc3339();
            let file_size = avatar_data.len() as i32;
            
            conn.execute(
                "UPDATE users SET avatar_path = ?, avatar_updated_at = ?, avatar_mime = ?, avatar_size = ? WHERE id = ?",
                params![avatar_path, updated_at, mime_type, file_size, user_id]
            ).map_err(|e| format!("Failed to update user avatar: {}", e))?;
            
            // Delete BLOB avatar
            conn.execute(
                "DELETE FROM avatars WHERE user_id = ?",
                params![user_id]
            ).map_err(|e| format!("Failed to delete BLOB avatar: {}", e))?;
            
            Ok(true)
        } else {
            Ok(false) // No BLOB avatar to migrate
        }
    }
}
