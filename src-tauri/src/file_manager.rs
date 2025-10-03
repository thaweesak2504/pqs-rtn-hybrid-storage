use std::path::PathBuf;
use std::fs;
use std::io::Write;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use tauri::api::path::app_data_dir;
use tauri::Config;
use lazy_static::lazy_static;
use crate::logger;

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
    high_ranks_dir: PathBuf,
}

lazy_static! {
    static ref FILE_MANAGER_INSTANCE: Mutex<Option<FileManager>> = Mutex::new(None);
}

impl FileManager {
    pub fn new() -> Result<Self, String> {
        // Get app data directory with better error handling
        let app_data = match app_data_dir(&Config::default()) {
            Some(dir) => dir,
            None => {
                logger::critical("Failed to get app data directory");
                return Err("Failed to get app data directory - app may not have proper permissions".to_string());
            }
        };
        
        let media_dir = app_data.join("pqs-rtn-hybrid-storage").join("media");
        let avatars_dir = media_dir.join("avatars");
        let high_ranks_dir = media_dir.join("high_ranks");
        
        // Create directories if they don't exist - with enhanced error handling
        match fs::create_dir_all(&avatars_dir) {
            Ok(_) => {},
            Err(e) => {
                logger::critical(&format!("Failed to create avatars directory at {:?}: {}", avatars_dir, e));
                return Err(format!("Failed to create avatars directory: {} (Path: {:?})", e, avatars_dir));
            }
        }
        
        match fs::create_dir_all(&high_ranks_dir) {
            Ok(_) => {},
            Err(e) => {
                logger::critical(&format!("Failed to create high_ranks directory at {:?}: {}", high_ranks_dir, e));
                return Err(format!("Failed to create high_ranks directory: {} (Path: {:?})", e, high_ranks_dir));
            }
        }
        
        logger::debug(&format!("Media dir: {:?}", media_dir));
        logger::debug(&format!("Avatars dir: {:?}", avatars_dir));
        logger::debug(&format!("High ranks dir: {:?}", high_ranks_dir));
        
        Ok(FileManager {
            media_dir,
            avatars_dir,
            high_ranks_dir,
        })
    }
    
    /// Get or create singleton instance
    pub fn get_instance() -> Result<Self, String> {
        let mut instance = FILE_MANAGER_INSTANCE.lock()
            .map_err(|e| format!("Failed to lock FileManager mutex: {}", e))?;
        
        if instance.is_none() {
            *instance = Some(Self::new()?);
        }
        
        // Clone the paths (cheap operation for PathBuf)
        let fm = instance.as_ref().unwrap();
        Ok(FileManager {
            media_dir: fm.media_dir.clone(),
            avatars_dir: fm.avatars_dir.clone(),
            high_ranks_dir: fm.high_ranks_dir.clone(),
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
        // Validate input to prevent path traversal attacks
        if avatar_path.is_empty() {
            return Err("Avatar path is empty".to_string());
        }
        
        if avatar_path.contains("..") {
            return Err("Invalid avatar path: path traversal attempt detected".to_string());
        }
        
        let file_path = self.media_dir.join(avatar_path);
        
        // Additional security: verify the resolved path is still within media_dir
        let canonical_media = self.media_dir.canonicalize()
            .map_err(|e| format!("Failed to canonicalize media directory: {}", e))?;
        
        if let Ok(canonical_file) = file_path.canonicalize() {
            if !canonical_file.starts_with(&canonical_media) {
                return Err("Security error: Attempted to delete file outside media directory".to_string());
            }
        }
        
        // Check if file exists before attempting deletion
        if !file_path.exists() {
            // Not an error - file already doesn't exist
            return Ok(());
        }
        
        // Verify it's a file, not a directory
        if file_path.is_dir() {
            return Err(format!("Cannot delete directory: {}", avatar_path));
        }
        
        // Attempt to delete the file with proper error handling
        match fs::remove_file(&file_path) {
            Ok(_) => Ok(()),
            Err(e) => {
                // Provide detailed error information
                Err(format!("Failed to delete avatar file '{}': {} ({})", 
                    avatar_path, 
                    e,
                    if e.kind() == std::io::ErrorKind::PermissionDenied {
                        "Permission denied - file may be in use"
                    } else {
                        "IO error"
                    }
                ))
            }
        }
    }
    
    pub fn save_high_rank_avatar_file(&self, officer_id: i32, file_data: &[u8], mime_type: &str) -> Result<String, String> {
        // Generate unique filename for high rank officer
        let extension = match mime_type {
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            "image/gif" => "gif",
            _ => "jpg", // default
        };
        
        let filename = format!("officer_{}_{}.{}", officer_id, chrono::Utc::now().timestamp(), extension);
        let file_path = self.high_ranks_dir.join(&filename);
        
        // Write file to disk
        let mut file = fs::File::create(&file_path)
            .map_err(|e| format!("Failed to create high rank avatar file: {}", e))?;
        
        file.write_all(file_data)
            .map_err(|e| format!("Failed to write high rank avatar data: {}", e))?;
        
        // Return relative path from media directory
        let relative_path = file_path.strip_prefix(&self.media_dir)
            .map_err(|e| format!("Failed to get relative path: {}", e))?;
        
        Ok(relative_path.to_string_lossy().to_string())
    }
    
    pub fn delete_high_rank_avatar_file(&self, avatar_path: &str) -> Result<(), String> {
        // Validate input to prevent path traversal attacks
        if avatar_path.is_empty() {
            return Err("Avatar path is empty".to_string());
        }
        
        if avatar_path.contains("..") {
            return Err("Invalid avatar path: path traversal attempt detected".to_string());
        }
        
        let file_path = self.media_dir.join(avatar_path);
        
        // Additional security: verify the resolved path is still within media_dir
        let canonical_media = self.media_dir.canonicalize()
            .map_err(|e| format!("Failed to canonicalize media directory: {}", e))?;
        
        if let Ok(canonical_file) = file_path.canonicalize() {
            if !canonical_file.starts_with(&canonical_media) {
                return Err("Security error: Attempted to delete file outside media directory".to_string());
            }
        }
        
        // Check if file exists before attempting deletion
        if !file_path.exists() {
            // Not an error - file already doesn't exist
            return Ok(());
        }
        
        // Verify it's a file, not a directory
        if file_path.is_dir() {
            return Err(format!("Cannot delete directory: {}", avatar_path));
        }
        
        // Attempt to delete the file with proper error handling
        match fs::remove_file(&file_path) {
            Ok(_) => Ok(()),
            Err(e) => {
                // Provide detailed error information
                Err(format!("Failed to delete high rank avatar file '{}': {} ({})", 
                    avatar_path, 
                    e,
                    if e.kind() == std::io::ErrorKind::PermissionDenied {
                        "Permission denied - file may be in use"
                    } else {
                        "IO error"
                    }
                ))
            }
        }
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
