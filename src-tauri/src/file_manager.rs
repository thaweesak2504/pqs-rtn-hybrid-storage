use std::path::PathBuf;
use std::fs;
use std::io::Write;
use serde::{Deserialize, Serialize};
use tauri::api::path::app_data_dir;
use tauri::Config;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub mime_type: String,
    pub created_at: String,
}

pub struct FileManager {
    media_dir: PathBuf,
    avatars_dir: PathBuf,
}

impl FileManager {
    pub fn new() -> Result<Self, String> {
        let app_data = app_data_dir(&Config::default())
            .ok_or("Failed to get app data directory")?;
        
        let media_dir = app_data.join("pqs-rtn-hybrid-storage").join("media");
        let avatars_dir = media_dir.join("avatars");
        
        // Create directories if they don't exist
        fs::create_dir_all(&avatars_dir)
            .map_err(|e| format!("Failed to create avatars directory: {}", e))?;
        
        Ok(FileManager {
            media_dir,
            avatars_dir,
        })
    }
    
    pub fn get_media_directory(&self) -> &PathBuf {
        &self.media_dir
    }
    
    pub fn save_avatar_file(&self, user_id: i32, file_data: &[u8], mime_type: &str) -> Result<String, String> {
        // Generate unique filename
        let extension = match mime_type {
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            "image/gif" => "gif",
            _ => "jpg", // default
        };
        
        let filename = format!("avatar_{}_{}.{}", user_id, chrono::Utc::now().timestamp(), extension);
        let file_path = self.avatars_dir.join(&filename);
        
        // Write file to disk
        let mut file = fs::File::create(&file_path)
            .map_err(|e| format!("Failed to create avatar file: {}", e))?;
        
        file.write_all(file_data)
            .map_err(|e| format!("Failed to write avatar data: {}", e))?;
        
        // Return relative path from media directory
        let relative_path = file_path.strip_prefix(&self.media_dir)
            .map_err(|e| format!("Failed to get relative path: {}", e))?;
        
        Ok(relative_path.to_string_lossy().to_string())
    }
    
    pub fn get_avatar_file_path(&self, avatar_path: &str) -> Result<PathBuf, String> {
        let full_path = self.media_dir.join(avatar_path);
        
        if !full_path.exists() {
            return Err(format!("Avatar file not found: {}", avatar_path));
        }
        
        Ok(full_path)
    }
    
    pub fn delete_avatar_file(&self, avatar_path: &str) -> Result<(), String> {
        let file_path = self.media_dir.join(avatar_path);
        
        if file_path.exists() {
            fs::remove_file(&file_path)
                .map_err(|e| format!("Failed to delete avatar file: {}", e))?;
        }
        
        Ok(())
    }
    
    pub fn cleanup_orphaned_files(&self, valid_paths: &[String]) -> Result<u32, String> {
        let mut deleted_count = 0;
        
        let entries = fs::read_dir(&self.avatars_dir)
            .map_err(|e| format!("Failed to read avatars directory: {}", e))?;
        
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();
            
            if path.is_file() {
                let relative_path = path.strip_prefix(&self.media_dir)
                    .map_err(|e| format!("Failed to get relative path: {}", e))?;
                
                let path_str = relative_path.to_string_lossy().to_string();
                
                if !valid_paths.contains(&path_str) {
                    fs::remove_file(&path)
                        .map_err(|e| format!("Failed to delete orphaned file: {}", e))?;
                    deleted_count += 1;
                }
            }
        }
        
        Ok(deleted_count)
    }
}
