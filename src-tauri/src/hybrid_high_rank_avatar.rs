use std::fs;
use serde::{Deserialize, Serialize};
use rusqlite::params;
use base64::{Engine as _, engine::general_purpose};

use crate::database::get_connection;
use crate::file_manager::FileManager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HybridHighRankAvatarInfo {
    pub officer_id: i32,
    pub avatar_path: Option<String>,
    pub avatar_updated_at: Option<String>,
    pub avatar_mime: Option<String>,
    pub avatar_size: Option<i32>,
    pub file_exists: bool,
}

pub struct HybridHighRankAvatarManager {
    file_manager: FileManager,
}

impl HybridHighRankAvatarManager {
    pub fn new() -> Result<Self, String> {
        let file_manager = FileManager::new()?;
        Ok(HybridHighRankAvatarManager { file_manager })
    }
    
    pub fn save_avatar(&self, officer_id: i32, file_data: &[u8], mime_type: &str) -> Result<HybridHighRankAvatarInfo, String> {
        let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
        
        // First, verify officer exists
        let officer_exists = conn.query_row::<i32, _, _>(
            "SELECT COUNT(*) FROM high_ranking_officers WHERE id = ?",
            params![officer_id],
            |row| Ok(row.get(0)?)
        ).map_err(|e| format!("Failed to check officer existence: {}", e))?;
        
        if officer_exists == 0 {
            return Err(format!("Officer with ID {} does not exist", officer_id));
        }
        
        // Delete old avatar file if exists
        if let Ok(old_path) = self.get_officer_avatar_path(officer_id) {
            if let Some(path) = old_path {
                let _ = self.file_manager.delete_high_rank_avatar_file(&path);
            }
        }
        
        // Save new avatar file
        let avatar_path = self.file_manager.save_high_rank_avatar_file(officer_id, file_data, mime_type)?;
        
        // Update officer record with new avatar path
        let updated_at = chrono::Utc::now().to_rfc3339();
        let file_size = file_data.len() as i32;
        
        conn.execute(
            "UPDATE high_ranking_officers SET avatar_path = ?, avatar_updated_at = ?, avatar_mime = ?, avatar_size = ? WHERE id = ?",
            params![avatar_path, updated_at, mime_type, file_size, officer_id]
        ).map_err(|e| format!("Failed to update officer avatar: {}", e))?;
        
        Ok(HybridHighRankAvatarInfo {
            officer_id,
            avatar_path: Some(avatar_path),
            avatar_updated_at: Some(updated_at),
            avatar_mime: Some(mime_type.to_string()),
            avatar_size: Some(file_size),
            file_exists: true,
        })
    }
    
    pub fn get_avatar_info(&self, officer_id: i32) -> Result<HybridHighRankAvatarInfo, String> {
        let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
        
        let result: Result<(Option<String>, Option<String>, Option<String>, Option<i32>), _> = conn.query_row(
            "SELECT avatar_path, avatar_updated_at, avatar_mime, avatar_size FROM high_ranking_officers WHERE id = ?",
            params![officer_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        );
        
        match result {
            Ok((avatar_path, avatar_updated_at, avatar_mime, avatar_size)) => {
                let file_exists = if let Some(ref path) = avatar_path {
                    self.file_manager.get_avatar_file_path(path).is_ok()
                } else {
                    false
                };
                
                Ok(HybridHighRankAvatarInfo {
                    officer_id,
                    avatar_path,
                    avatar_updated_at,
                    avatar_mime,
                    avatar_size,
                    file_exists,
                })
            }
            Err(_) => {
                // Officer not found or no avatar
                Ok(HybridHighRankAvatarInfo {
                    officer_id,
                    avatar_path: None,
                    avatar_updated_at: None,
                    avatar_mime: None,
                    avatar_size: None,
                    file_exists: false,
                })
            }
        }
    }
    
    pub fn delete_avatar(&self, officer_id: i32) -> Result<bool, String> {
        let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
        
        // Get current avatar path
        let avatar_path: Option<String> = conn.query_row(
            "SELECT avatar_path FROM high_ranking_officers WHERE id = ?",
            params![officer_id],
            |row| Ok(row.get(0)?)
        ).map_err(|e| format!("Failed to get avatar path: {}", e))?;
        
        // Delete file if exists
        if let Some(path) = avatar_path {
            println!("Deleting old avatar file: {}", path);
            match self.file_manager.delete_high_rank_avatar_file(&path) {
                Ok(_) => println!("Successfully deleted old avatar file: {}", path),
                Err(e) => println!("Failed to delete old avatar file: {} - Error: {}", path, e),
            }
        } else {
            println!("No existing avatar to delete for officer {}", officer_id);
        }
        
        // Update officer record
        conn.execute(
            "UPDATE high_ranking_officers SET avatar_path = NULL, avatar_updated_at = NULL, avatar_mime = NULL, avatar_size = NULL WHERE id = ?",
            params![officer_id]
        ).map_err(|e| format!("Failed to clear officer avatar: {}", e))?;
        
        Ok(true)
    }
    
    pub fn get_avatar_base64(&self, avatar_path: &str) -> Result<String, String> {
        let file_path = self.file_manager.get_avatar_file_path(avatar_path)?;
        
        let file_data = fs::read(&file_path)
            .map_err(|e| format!("Failed to read avatar file: {}", e))?;
        
        // Determine MIME type from file extension
        let mime_type = match file_path.extension().and_then(|ext| ext.to_str()) {
            Some("jpg") | Some("jpeg") => "image/jpeg",
            Some("png") => "image/png",
            Some("webp") => "image/webp",
            Some("gif") => "image/gif",
            _ => "image/jpeg", // default
        };
        
        let base64_data = general_purpose::STANDARD.encode(&file_data);
        Ok(format!("data:{};base64,{}", mime_type, base64_data))
    }
    
    fn get_officer_avatar_path(&self, officer_id: i32) -> Result<Option<String>, String> {
        let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
        
        let avatar_path: Option<String> = conn.query_row(
            "SELECT avatar_path FROM high_ranking_officers WHERE id = ?",
            params![officer_id],
            |row| Ok(row.get(0)?)
        ).map_err(|e| format!("Failed to get avatar path: {}", e))?;
        
        Ok(avatar_path)
    }
    
    pub fn cleanup_orphaned_files(&self) -> Result<u32, String> {
        let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
        
        // Get all valid avatar paths from officers
        let mut stmt = conn.prepare("SELECT avatar_path FROM high_ranking_officers WHERE avatar_path IS NOT NULL")
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        
        let avatar_paths = stmt.query_map([], |row| {
            Ok(row.get::<_, String>(0)?)
        }).map_err(|e| format!("Failed to query avatar paths: {}", e))?;
        
        let mut valid_paths = Vec::new();
        for path_result in avatar_paths {
            if let Ok(path) = path_result {
                valid_paths.push(path);
            }
        }
        
        self.file_manager.cleanup_orphaned_files(&valid_paths)
    }
}
