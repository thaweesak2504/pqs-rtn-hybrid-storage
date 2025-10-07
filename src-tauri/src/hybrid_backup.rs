use std::fs;
use std::path::{Path, PathBuf};
use std::io::{Read, Write};
use std::time::{SystemTime, UNIX_EPOCH};
use zip::write::FileOptions;
use zip::ZipWriter;
use walkdir::WalkDir;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::api::path::app_data_dir;
use tauri::Config;
use crate::logger;

/// Backup manifest containing metadata about the backup
#[derive(Debug, Serialize, Deserialize)]
pub struct BackupManifest {
    pub version: String,
    pub timestamp: u64,
    pub database_size: u64,
    pub media_size: u64,
    pub total_files: u64,
    pub backup_type: String,
    pub checksum: String,
}

/// Hybrid backup that includes both database and media files in a compressed zip
pub fn create_hybrid_backup() -> Result<String, String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let backup_filename = format!("hybrid_backup_{}.zip", timestamp);
    let backup_path = get_backup_directory()?.join(&backup_filename);

    logger::info(&format!("Starting hybrid backup creation: {}", backup_filename));

    // Create zip file
    let zip_file = fs::File::create(&backup_path)
        .map_err(|e| format!("Failed to create backup file: {}", e))?;

    let mut zip = ZipWriter::new(zip_file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let mut total_files = 0u64;
    let mut media_size = 0u64;
    let mut database_size = 0u64;

    // 1. Add database file
    let db_path = get_database_path()?;
    if db_path.exists() {
        logger::debug("Adding database file to backup");
        let db_filename = db_path.file_name()
            .ok_or("Invalid database filename")?
            .to_string_lossy()
            .to_string();

        zip.start_file(&db_filename, options)
            .map_err(|e| format!("Failed to start database file in zip: {}", e))?;

        let mut db_file = fs::File::open(&db_path)
            .map_err(|e| format!("Failed to open database file: {}", e))?;

        let mut buffer = Vec::new();
        db_file.read_to_end(&mut buffer)
            .map_err(|e| format!("Failed to read database file: {}", e))?;

        database_size = buffer.len() as u64;
        zip.write_all(&buffer)
            .map_err(|e| format!("Failed to write database to zip: {}", e))?;

        total_files += 1;
        logger::debug(&format!("Database file added: {} bytes", database_size));
    } else {
        logger::warn("Database file not found, skipping database backup");
    }

    // 2. Add media directory
    let media_dir = get_media_directory()?;
    if media_dir.exists() {
        logger::debug("Adding media directory to backup");

        for entry in WalkDir::new(&media_dir).into_iter() {
            let entry = entry.map_err(|e| format!("Failed to read media directory entry: {}", e))?;

            if entry.file_type().is_file() {
                let file_path = entry.path();
                let relative_path = file_path.strip_prefix(&media_dir)
                    .map_err(|e| format!("Failed to get relative path: {}", e))?;

                let zip_path = format!("media/{}", relative_path.to_string_lossy());

                zip.start_file(&zip_path, options)
                    .map_err(|e| format!("Failed to start media file in zip: {}", e))?;

                let mut file = fs::File::open(file_path)
                    .map_err(|e| format!("Failed to open media file: {}", e))?;

                let mut buffer = Vec::new();
                file.read_to_end(&mut buffer)
                    .map_err(|e| format!("Failed to read media file: {}", e))?;

                media_size += buffer.len() as u64;
                zip.write_all(&buffer)
                    .map_err(|e| format!("Failed to write media file to zip: {}", e))?;

                total_files += 1;
            }
        }
        logger::debug(&format!("Media files added: {} files, {} bytes", total_files - 1, media_size));
    } else {
        logger::warn("Media directory not found, skipping media backup");
    }

    // 3. Create and add manifest
    let manifest = BackupManifest {
        version: "1.0".to_string(),
        timestamp,
        database_size,
        media_size,
        total_files,
        backup_type: "hybrid".to_string(),
        checksum: "".to_string(), // Will be calculated after zip is complete
    };

    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;

    zip.start_file("manifest.json", options)
        .map_err(|e| format!("Failed to start manifest file in zip: {}", e))?;

    zip.write_all(manifest_json.as_bytes())
        .map_err(|e| format!("Failed to write manifest to zip: {}", e))?;

    // Finish zip
    zip.finish()
        .map_err(|e| format!("Failed to finish zip file: {}", e))?;

    // Calculate checksum of the complete zip file
    let mut zip_file = fs::File::open(&backup_path)
        .map_err(|e| format!("Failed to open zip for checksum: {}", e))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];
    loop {
        let bytes_read = zip_file.read(&mut buffer)
            .map_err(|e| format!("Failed to read zip for checksum: {}", e))?;

        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    let _checksum = format!("{:x}", hasher.finalize());

    // Update manifest with checksum (this is a simplified approach)
    // In production, you might want to recalculate or store checksum separately

    logger::info(&format!("Hybrid backup created successfully: {}", backup_filename));
    logger::info(&format!("Total files: {}, Database: {} bytes, Media: {} bytes",
        total_files, database_size, media_size));

    Ok(format!("Hybrid backup created: {} (Files: {}, Size: {} bytes)",
        backup_filename, total_files, database_size + media_size))
}

/// Discover available backup files in the backup directory
pub fn discover_available_backups() -> Result<Vec<BackupInfo>, String> {
    let backup_dir = get_backup_directory()?;

    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups = Vec::new();

    for entry in fs::read_dir(&backup_dir)
        .map_err(|e| format!("Failed to read backup directory: {}", e))? {

        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("zip") {
            if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                if filename.starts_with("hybrid_backup_") {
                    // Try to read manifest
                    if let Ok(manifest) = read_backup_manifest(&path) {
                        backups.push(BackupInfo {
                            filename: filename.to_string(),
                            path: path.to_string_lossy().to_string(),
                            manifest,
                        });
                    }
                }
            }
        }
    }

    // Sort by timestamp (newest first)
    backups.sort_by(|a, b| b.manifest.timestamp.cmp(&a.manifest.timestamp));

    Ok(backups)
}

/// Import backup from zip file
pub fn import_backup(zip_path: &str) -> Result<String, String> {
    let zip_path = Path::new(zip_path);

    if !zip_path.exists() {
        return Err("Backup file does not exist".to_string());
    }

    logger::info(&format!("Starting backup import from: {}", zip_path.display()));

    // Validate manifest first
    let manifest = read_backup_manifest(zip_path)?;

    // Create temporary directory for extraction
    let temp_dir = get_backup_directory()?.join("temp_import");
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to clean temp directory: {}", e))?;
    }
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    // Extract zip
    let zip_file = fs::File::open(zip_path)
        .map_err(|e| format!("Failed to open zip file: {}", e))?;

    let mut archive = zip::ZipArchive::new(zip_file)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read zip entry {}: {}", i, e))?;

        let outpath = temp_dir.join(file.name());

        if file.name().ends_with('/') {
            // Directory
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            // File
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }

            let mut outfile = fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create output file: {}", e))?;

            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to extract file: {}", e))?;
        }
    }

    // Validate extracted files
    let extracted_db = temp_dir.join("database.db");
    let extracted_media = temp_dir.join("media");

    if !extracted_db.exists() {
        return Err("Database file not found in backup".to_string());
    }

    // Replace current files
    let current_db = get_database_path()?;
    let current_media = get_media_directory()?;

    // Backup current files (if they exist) - simple approach
    if current_db.exists() {
        let backup_current = current_db.with_extension("db.backup");
        fs::copy(&current_db, &backup_current)
            .map_err(|e| format!("Failed to backup current database: {}", e))?;
    }

    // Copy new files
    fs::copy(&extracted_db, &current_db)
        .map_err(|e| format!("Failed to restore database: {}", e))?;

    if extracted_media.exists() {
        // Remove current media directory if exists
        if current_media.exists() {
            fs::remove_dir_all(&current_media)
                .map_err(|e| format!("Failed to remove current media directory: {}", e))?;
        }

        // Copy new media directory
        copy_dir_recursive(&extracted_media, &current_media)
            .map_err(|e| format!("Failed to restore media files: {}", e))?;
    }

    // Clean up temp directory
    fs::remove_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to clean temp directory: {}", e))?;

    logger::info("Backup import completed successfully");

    Ok(format!("Backup imported successfully. Files restored: Database + {} media files",
        manifest.total_files.saturating_sub(1)))
}

/// Helper function to read backup manifest from zip
fn read_backup_manifest(zip_path: &Path) -> Result<BackupManifest, String> {
    let zip_file = fs::File::open(zip_path)
        .map_err(|e| format!("Failed to open zip file: {}", e))?;

    let mut archive = zip::ZipArchive::new(zip_file)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;

    let mut manifest_file = archive.by_name("manifest.json")
        .map_err(|e| format!("Manifest not found in backup: {}", e))?;

    let mut manifest_content = String::new();
    manifest_file.read_to_string(&mut manifest_content)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;

    let manifest: BackupManifest = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;

    Ok(manifest)
}

/// Helper function to copy directory recursively
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst)
        .map_err(|e| format!("Failed to create destination directory: {}", e))?;

    for entry in WalkDir::new(src).into_iter() {
        let entry = entry.map_err(|e| format!("Failed to read source entry: {}", e))?;

        if entry.file_type().is_file() {
            let src_path = entry.path();
            let relative_path = src_path.strip_prefix(src)
                .map_err(|e| format!("Failed to get relative path: {}", e))?;
            let dst_path = dst.join(relative_path);

            if let Some(parent) = dst_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }

            fs::copy(src_path, &dst_path)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }

    Ok(())
}

/// Get backup directory path
fn get_backup_directory() -> Result<PathBuf, String> {
    let config = Config::default();
    let app_data = app_data_dir(&config)
        .ok_or("Failed to get app data directory")?;

    let backup_dir = app_data.join("pqs-rtn-hybrid-storage").join("backups");

    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir)
            .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    }

    Ok(backup_dir)
}

/// Get database path
fn get_database_path() -> Result<PathBuf, String> {
    let config = Config::default();
    let app_data = app_data_dir(&config)
        .ok_or("Failed to get app data directory")?;

    Ok(app_data.join("pqs-rtn-hybrid-storage").join("database.db"))
}

/// Get media directory path
fn get_media_directory() -> Result<PathBuf, String> {
    let config = Config::default();
    let app_data = app_data_dir(&config)
        .ok_or("Failed to get app data directory")?;

    Ok(app_data.join("pqs-rtn-hybrid-storage").join("media"))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupInfo {
    pub filename: String,
    pub path: String,
    pub manifest: BackupManifest,
}