use crate::content_database::{
    get_content_connection, get_content_database_path, get_portable_data_dir,
};
use crate::logger;
use rusqlite::{backup, Connection, DatabaseName};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::api::path::app_data_dir;
use tauri::Config;
use walkdir::WalkDir;
use zip::write::FileOptions;
use zip::ZipWriter;

/// Backup manifest containing metadata about the backup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupManifest {
    pub version: String,
    pub timestamp: u64,
    pub database_size: u64,
    pub media_size: u64,
    pub total_files: u64,
    pub backup_type: String,
    /// SHA-256 of the SQLite snapshot stored in the archive.
    pub checksum: String,
}

const MAX_BACKUP_ENTRIES: usize = 50_000;
const MAX_BACKUP_UNCOMPRESSED_BYTES: u64 = 20 * 1024 * 1024 * 1024;

struct CleanupPath(PathBuf);

impl Drop for CleanupPath {
    fn drop(&mut self) {
        if self.0.is_dir() {
            let _ = fs::remove_dir_all(&self.0);
        } else if self.0.exists() {
            let _ = fs::remove_file(&self.0);
        }
    }
}

fn hash_file(path: &Path) -> Result<String, String> {
    let mut file =
        fs::File::open(path).map_err(|e| format!("Failed to open file for checksum: {}", e))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let bytes_read = file
            .read(&mut buffer)
            .map_err(|e| format!("Failed to read file for checksum: {}", e))?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

fn create_database_snapshot(conn: &Connection, snapshot_path: &Path) -> Result<(), String> {
    if snapshot_path.exists() {
        fs::remove_file(snapshot_path)
            .map_err(|e| format!("Failed to replace old database snapshot: {}", e))?;
    }

    conn.backup(DatabaseName::Main, snapshot_path, None)
        .map_err(|e| format!("Failed to create consistent database snapshot: {}", e))
}

fn safe_archive_path(name: &str) -> Result<PathBuf, String> {
    let path = Path::new(name);
    if path.as_os_str().is_empty() || path.is_absolute() {
        return Err(format!("Unsafe backup entry path: {}", name));
    }

    if path.components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_) | Component::CurDir
        )
    }) {
        return Err(format!("Unsafe backup entry path: {}", name));
    }

    let first = path
        .components()
        .next()
        .and_then(|component| match component {
            Component::Normal(value) => value.to_str(),
            _ => None,
        })
        .ok_or_else(|| format!("Invalid backup entry path: {}", name))?;

    if !matches!(
        first,
        "content.db" | "database.db" | "manifest.json" | "media" | "data"
    ) {
        return Err(format!("Unexpected backup entry: {}", name));
    }
    if matches!(first, "content.db" | "database.db" | "manifest.json")
        && path.components().count() != 1
    {
        return Err(format!("Invalid file entry path: {}", name));
    }

    Ok(path.to_path_buf())
}

fn validate_backup_filename(filename: &str) -> Result<(), String> {
    let path = Path::new(filename);
    if path.components().count() != 1
        || path.file_name().and_then(|value| value.to_str()) != Some(filename)
        || !filename.starts_with("hybrid_backup_")
        || !filename.ends_with(".zip")
    {
        return Err("Invalid hybrid backup filename".to_string());
    }
    Ok(())
}

fn validate_extracted_database(path: &Path, expected_checksum: &str) -> Result<(), String> {
    if !expected_checksum.is_empty() {
        let actual_checksum = hash_file(path)?;
        if !actual_checksum.eq_ignore_ascii_case(expected_checksum) {
            return Err("Database checksum does not match the backup manifest".to_string());
        }
    } else {
        logger::warn(
            "Legacy backup has no database checksum; integrity is limited to SQLite checks",
        );
    }

    let conn =
        Connection::open(path).map_err(|e| format!("Failed to open extracted database: {}", e))?;
    let integrity: String = conn
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|e| format!("Failed to validate extracted database: {}", e))?;
    if integrity != "ok" {
        return Err(format!(
            "Extracted database failed integrity check: {}",
            integrity
        ));
    }

    Ok(())
}

fn replace_directory_from_staging(src: &Path, dst: &Path) -> Result<(), String> {
    let name = dst
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| format!("Invalid restore directory: {}", dst.display()))?;
    let backup = dst.with_file_name(format!("{}.restore-backup", name));

    if backup.exists() {
        fs::remove_dir_all(&backup)
            .map_err(|e| format!("Failed to clear prior restore backup: {}", e))?;
    }
    if dst.exists() {
        fs::rename(dst, &backup)
            .map_err(|e| format!("Failed to stage current directory for restore: {}", e))?;
    }

    if let Err(error) = copy_dir_recursive(src, dst) {
        if dst.exists() {
            let _ = fs::remove_dir_all(dst);
        }
        if backup.exists() {
            let _ = fs::rename(&backup, dst);
        }
        return Err(error);
    }

    if backup.exists() {
        fs::remove_dir_all(&backup)
            .map_err(|e| format!("Restore succeeded but old directory cleanup failed: {}", e))?;
    }
    Ok(())
}

/// Hybrid backup that includes both database and media files in a compressed zip
pub fn create_hybrid_backup() -> Result<String, String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let backup_filename = format!("hybrid_backup_{}.zip", timestamp);
    let backup_dir = get_backup_directory()?;
    let backup_path = backup_dir.join(&backup_filename);
    let snapshot_path = backup_dir.join(format!(".content_snapshot_{}.db", timestamp));
    let _snapshot_cleanup = CleanupPath(snapshot_path.clone());

    let db_path = get_content_database_path()?;
    if !db_path.exists() {
        return Err("Database file not found; backup was not created".to_string());
    }

    let conn = get_content_connection()?;
    create_database_snapshot(&conn, &snapshot_path)?;
    drop(conn);
    let database_checksum = hash_file(&snapshot_path)?;

    logger::info(format!(
        "Starting hybrid backup creation: {}",
        backup_filename
    ));

    // Create zip file
    let zip_file = fs::File::create(&backup_path)
        .map_err(|e| format!("Failed to create backup file: {}", e))?;

    let mut zip = ZipWriter::new(zip_file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let mut total_files = 0u64;
    let mut media_size = 0u64;

    // 1. Add a consistent SQLite snapshot. Copying the live WAL database file
    // directly can omit committed pages that have not been checkpointed yet.
    logger::debug("Adding database snapshot to backup");
    zip.start_file("content.db", options)
        .map_err(|e| format!("Failed to start database file in zip: {}", e))?;
    let mut db_file = fs::File::open(&snapshot_path)
        .map_err(|e| format!("Failed to open database snapshot: {}", e))?;
    let database_size = db_file
        .metadata()
        .map_err(|e| format!("Failed to inspect database snapshot: {}", e))?
        .len();
    std::io::copy(&mut db_file, &mut zip)
        .map_err(|e| format!("Failed to write database snapshot to zip: {}", e))?;
    total_files += 1;
    logger::debug(format!("Database snapshot added: {} bytes", database_size));

    // 2. Add media directory
    let media_dir = get_media_directory()?;
    if media_dir.exists() {
        logger::debug("Adding media directory to backup");

        for entry in WalkDir::new(&media_dir).into_iter() {
            let entry =
                entry.map_err(|e| format!("Failed to read media directory entry: {}", e))?;

            if entry.file_type().is_file() {
                let file_path = entry.path();
                let relative_path = file_path
                    .strip_prefix(&media_dir)
                    .map_err(|e| format!("Failed to get relative path: {}", e))?;

                let zip_path = format!("media/{}", relative_path.to_string_lossy());

                zip.start_file(&zip_path, options)
                    .map_err(|e| format!("Failed to start media file in zip: {}", e))?;

                let mut file = fs::File::open(file_path)
                    .map_err(|e| format!("Failed to open media file: {}", e))?;

                media_size += file
                    .metadata()
                    .map_err(|e| format!("Failed to inspect media file: {}", e))?
                    .len();
                std::io::copy(&mut file, &mut zip)
                    .map_err(|e| format!("Failed to write media file to zip: {}", e))?;

                total_files += 1;
            }
        }
        logger::debug(format!(
            "Media files added: {} files, {} bytes",
            total_files - 1,
            media_size
        ));
    } else {
        logger::warn("Media directory not found, skipping media backup");
    }

    // 3. Add data directory (Documents, Question Images, Trainee Attachments, References)
    let data_dir = get_portable_data_dir().map_err(|e| e.to_string())?;
    let mut data_size = 0u64;
    if data_dir.exists() {
        logger::debug("Adding data directory to backup");

        for entry in WalkDir::new(&data_dir).into_iter() {
            let entry = entry.map_err(|e| format!("Failed to read data directory entry: {}", e))?;

            if entry.file_type().is_file() {
                let file_path = entry.path();
                let relative_path = file_path
                    .strip_prefix(&data_dir)
                    .map_err(|e| format!("Failed to get relative path: {}", e))?;

                let zip_path = format!("data/{}", relative_path.to_string_lossy());

                zip.start_file(&zip_path, options)
                    .map_err(|e| format!("Failed to start data file in zip: {}", e))?;

                let mut file = fs::File::open(file_path)
                    .map_err(|e| format!("Failed to open data file: {}", e))?;

                data_size += file
                    .metadata()
                    .map_err(|e| format!("Failed to inspect data file: {}", e))?
                    .len();
                std::io::copy(&mut file, &mut zip)
                    .map_err(|e| format!("Failed to write data file to zip: {}", e))?;

                total_files += 1;
            }
        }
        logger::debug(format!("Data files added: {} bytes", data_size));
    } else {
        logger::warn("Data directory not found, skipping data backup");
    }

    // 3. Create and add manifest
    let manifest = BackupManifest {
        version: "1.0".to_string(),
        timestamp,
        database_size,
        media_size: media_size + data_size,
        total_files,
        backup_type: "hybrid".to_string(),
        checksum: database_checksum,
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
    if let Err(error) = fs::remove_file(&snapshot_path) {
        logger::warn(format!(
            "Failed to remove temporary database snapshot: {}",
            error
        ));
    }

    logger::info(format!(
        "Hybrid backup created successfully: {}",
        backup_filename
    ));
    logger::info(format!(
        "Total files: {}, Database: {} bytes, Media/data: {} bytes",
        total_files,
        database_size,
        media_size + data_size
    ));

    Ok(format!(
        "Hybrid backup created: {} (Files: {}, Size: {} bytes)",
        backup_filename,
        total_files,
        database_size + media_size + data_size
    ))
}

/// Discover available backup files in the backup directory
pub fn discover_available_backups() -> Result<Vec<BackupInfo>, String> {
    let backup_dir = get_backup_directory()?;

    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups = Vec::new();

    for entry in
        fs::read_dir(&backup_dir).map_err(|e| format!("Failed to read backup directory: {}", e))?
    {
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
    backups.sort_by_key(|b| std::cmp::Reverse(b.manifest.timestamp));

    Ok(backups)
}

/// Import backup from zip file
pub fn import_backup(zip_path: &str) -> Result<String, String> {
    let zip_path = Path::new(zip_path);

    if !zip_path.exists() {
        return Err("Backup file does not exist".to_string());
    }

    logger::info(format!(
        "Starting backup import from: {}",
        zip_path.display()
    ));

    // Validate manifest first
    let manifest = read_backup_manifest(zip_path)?;
    if manifest.backup_type != "hybrid" {
        return Err("Unsupported backup type".to_string());
    }

    // Create temporary directory for extraction
    let import_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("System clock error: {}", e))?
        .as_nanos();
    let temp_dir = get_backup_directory()?.join(format!("temp_import_{}", import_timestamp));
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp directory: {}", e))?;
    let _temp_cleanup = CleanupPath(temp_dir.clone());

    // Extract zip
    let zip_file =
        fs::File::open(zip_path).map_err(|e| format!("Failed to open zip file: {}", e))?;

    let mut archive =
        zip::ZipArchive::new(zip_file).map_err(|e| format!("Failed to read zip archive: {}", e))?;
    if archive.len() > MAX_BACKUP_ENTRIES {
        return Err(format!(
            "Backup contains too many entries: {} (maximum {})",
            archive.len(),
            MAX_BACKUP_ENTRIES
        ));
    }

    let mut uncompressed_bytes = 0u64;
    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read zip entry {}: {}", i, e))?;
        uncompressed_bytes = uncompressed_bytes
            .checked_add(file.size())
            .ok_or_else(|| "Backup uncompressed size overflow".to_string())?;
        if uncompressed_bytes > MAX_BACKUP_UNCOMPRESSED_BYTES {
            return Err("Backup exceeds the maximum uncompressed size".to_string());
        }

        let relative_path = safe_archive_path(file.name())?;
        let outpath = temp_dir.join(relative_path);

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

    // Validate extracted files — support both new (content.db) and old (database.db) backup formats
    // TODO(post-v0.2.x): remove `database.db` fallback once we're confident no users
    // are restoring backups created before the DB consolidation (Phase 6). Keep for now
    // to preserve backward compatibility with older backup ZIPs.
    let extracted_db = if temp_dir.join("content.db").exists() {
        temp_dir.join("content.db")
    } else {
        temp_dir.join("database.db")
    };
    let extracted_media = temp_dir.join("media");
    let extracted_data = temp_dir.join("data");

    if !extracted_db.exists() {
        return Err("Database file not found in backup".to_string());
    }
    validate_extracted_database(&extracted_db, &manifest.checksum)?;

    // Replace current files
    let current_db = get_content_database_path()?;
    let current_media = get_media_directory()?;
    let current_data = get_portable_data_dir().map_err(|e| e.to_string())?;

    // Use SQLite's online backup API in both directions so WAL state and live
    // pooled connections remain coherent throughout restore.
    let backup_current = current_db.with_extension("db.backup");
    let mut conn = get_content_connection()?;
    conn.backup(DatabaseName::Main, &backup_current, None)
        .map_err(|e| format!("Failed to preserve current database: {}", e))?;
    if let Err(error) = conn.restore(
        DatabaseName::Main,
        &extracted_db,
        None::<fn(backup::Progress)>,
    ) {
        let _ = conn.restore(
            DatabaseName::Main,
            &backup_current,
            None::<fn(backup::Progress)>,
        );
        return Err(format!("Failed to restore database: {}", error));
    }
    drop(conn);

    if extracted_media.exists() {
        replace_directory_from_staging(&extracted_media, &current_media)
            .map_err(|e| format!("Failed to restore media files: {}", e))?;
    }

    if extracted_data.exists() {
        replace_directory_from_staging(&extracted_data, &current_data)
            .map_err(|e| format!("Failed to restore data files: {}", e))?;
    }

    // Clean up temp directory
    fs::remove_dir_all(&temp_dir).map_err(|e| format!("Failed to clean temp directory: {}", e))?;

    logger::info("Backup import completed successfully");

    Ok(format!(
        "Backup imported successfully. Files restored: Database + {} media files",
        manifest.total_files.saturating_sub(1)
    ))
}

/// Delete a hybrid backup file
pub fn delete_hybrid_backup(filename: &str) -> Result<String, String> {
    validate_backup_filename(filename)?;
    let backup_dir = get_backup_directory()?;
    let backup_path = backup_dir.join(filename);

    if !backup_path.exists() {
        return Err(format!("Backup file '{}' not found", filename));
    }

    fs::remove_file(&backup_path).map_err(|e| format!("Failed to delete backup file: {}", e))?;

    logger::info(format!("Hybrid backup deleted: {}", filename));

    Ok(format!("Hybrid backup '{}' deleted successfully", filename))
}

/// Helper function to read backup manifest from zip
fn read_backup_manifest(zip_path: &Path) -> Result<BackupManifest, String> {
    let zip_file =
        fs::File::open(zip_path).map_err(|e| format!("Failed to open zip file: {}", e))?;

    let mut archive =
        zip::ZipArchive::new(zip_file).map_err(|e| format!("Failed to read zip archive: {}", e))?;

    let mut manifest_file = archive
        .by_name("manifest.json")
        .map_err(|e| format!("Manifest not found in backup: {}", e))?;
    if manifest_file.size() > 1024 * 1024 {
        return Err("Backup manifest is too large".to_string());
    }

    let mut manifest_content = String::new();
    manifest_file
        .read_to_string(&mut manifest_content)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;

    let manifest: BackupManifest = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;
    if manifest.total_files as usize > MAX_BACKUP_ENTRIES {
        return Err("Backup manifest declares too many files".to_string());
    }
    if !manifest.checksum.is_empty()
        && (manifest.checksum.len() != 64
            || !manifest
                .checksum
                .chars()
                .all(|value| value.is_ascii_hexdigit()))
    {
        return Err("Backup manifest contains an invalid checksum".to_string());
    }

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
            let relative_path = src_path
                .strip_prefix(src)
                .map_err(|e| format!("Failed to get relative path: {}", e))?;
            let dst_path = dst.join(relative_path);

            if let Some(parent) = dst_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }

            fs::copy(src_path, &dst_path).map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }

    Ok(())
}

/// Get backup directory path
fn get_backup_directory() -> Result<PathBuf, String> {
    let config = Config::default();
    let app_data = app_data_dir(&config).ok_or("Failed to get app data directory")?;

    let backup_dir = app_data.join("pqs-rtn-hybrid-storage").join("backups");

    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir)
            .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    }

    Ok(backup_dir)
}

/// Get media directory path
fn get_media_directory() -> Result<PathBuf, String> {
    let config = Config::default();
    let app_data = app_data_dir(&config).ok_or("Failed to get app data directory")?;

    Ok(app_data.join("pqs-rtn-hybrid-storage").join("media"))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub filename: String,
    pub path: String,
    pub manifest: BackupManifest,
}

/// Information about available backups for initialization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitializationBackupInfo {
    pub has_backups: bool,
    pub latest_backup: Option<BackupInfo>,
    pub total_backups: usize,
}

/// Information about system state for initialization decision
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStateInfo {
    pub database_exists_and_valid: bool,
    pub media_exists_and_valid: bool,
    pub backup_info: InitializationBackupInfo,
}

/// Check system state and backups for initialization decision
pub fn check_system_state_for_initialization() -> Result<SystemStateInfo, String> {
    let database_exists_and_valid = crate::auth::check_database_exists_and_valid().unwrap_or(false);
    // Check media state (without creating directories)
    let media_exists_and_valid =
        crate::file_manager::FileManager::check_media_exists_and_valid_no_create().unwrap_or(false);
    // Check backup info
    let backup_info = check_backup_for_initialization()?;
    let result = SystemStateInfo {
        database_exists_and_valid,
        media_exists_and_valid,
        backup_info,
    };

    Ok(result)
}

/// Check for available backups during application initialization
/// This is used to determine if the user should be prompted to restore from backup
pub fn check_backup_for_initialization() -> Result<InitializationBackupInfo, String> {
    let backups = discover_available_backups()?;

    let has_backups = !backups.is_empty();
    let latest_backup = backups.first().cloned();
    let total_backups = backups.len();

    Ok(InitializationBackupInfo {
        has_backups,
        latest_backup,
        total_backups,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;
    use zip::write::FileOptions;

    #[test]
    fn test_read_backup_manifest_success() {
        let temp_dir = TempDir::new().expect("Temp dir should be created");
        let zip_path = temp_dir.path().join("backup.zip");

        let file = fs::File::create(&zip_path).expect("Zip file should be created");
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::default();

        let manifest = BackupManifest {
            version: "1.0".to_string(),
            timestamp: 123,
            database_size: 10,
            media_size: 20,
            total_files: 2,
            backup_type: "hybrid".to_string(),
            checksum: "a".repeat(64),
        };

        let content = serde_json::to_string(&manifest).expect("Manifest should serialize");
        zip.start_file("manifest.json", options)
            .expect("Start manifest entry should succeed");
        zip.write_all(content.as_bytes())
            .expect("Write manifest should succeed");
        zip.finish().expect("Finish zip should succeed");

        let parsed = read_backup_manifest(&zip_path).expect("Manifest should be read");
        assert_eq!(parsed.version, "1.0");
        assert_eq!(parsed.timestamp, 123);
        assert_eq!(parsed.total_files, 2);
    }

    #[test]
    fn test_read_backup_manifest_missing_manifest_returns_error() {
        let temp_dir = TempDir::new().expect("Temp dir should be created");
        let zip_path = temp_dir.path().join("backup_no_manifest.zip");

        let file = fs::File::create(&zip_path).expect("Zip file should be created");
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::default();

        zip.start_file("other.json", options)
            .expect("Start file entry should succeed");
        zip.write_all(b"{}")
            .expect("Write file entry should succeed");
        zip.finish().expect("Finish zip should succeed");

        let result = read_backup_manifest(&zip_path);
        assert!(result.is_err(), "Should fail when manifest.json is missing");
    }

    #[test]
    fn test_copy_dir_recursive_copies_nested_files() {
        let src_temp = TempDir::new().expect("Source temp dir should be created");
        let dst_temp = TempDir::new().expect("Destination temp dir should be created");

        let src_root = src_temp.path().join("src");
        let dst_root = dst_temp.path().join("dst");

        fs::create_dir_all(src_root.join("nested")).expect("Create nested source should succeed");
        fs::write(src_root.join("root.txt"), "root-content")
            .expect("Write root file should succeed");
        fs::write(src_root.join("nested").join("child.txt"), "child-content")
            .expect("Write child file should succeed");

        copy_dir_recursive(&src_root, &dst_root).expect("Recursive copy should succeed");

        assert!(dst_root.join("root.txt").exists());
        assert!(dst_root.join("nested").join("child.txt").exists());

        let root_content =
            fs::read_to_string(dst_root.join("root.txt")).expect("Read copied root should succeed");
        let child_content = fs::read_to_string(dst_root.join("nested").join("child.txt"))
            .expect("Read copied child should succeed");

        assert_eq!(root_content, "root-content");
        assert_eq!(child_content, "child-content");
    }

    #[test]
    fn safe_archive_path_rejects_traversal_and_unexpected_roots() {
        assert!(safe_archive_path("data/DOC/file.pdf").is_ok());
        assert!(safe_archive_path("content.db").is_ok());
        assert!(safe_archive_path("../content.db").is_err());
        assert!(safe_archive_path("data/../../outside.txt").is_err());
        assert!(safe_archive_path("content.db/extra").is_err());
        assert!(safe_archive_path("other/file.txt").is_err());
    }

    #[test]
    fn backup_filename_validation_rejects_path_components() {
        assert!(validate_backup_filename("hybrid_backup_123.zip").is_ok());
        assert!(validate_backup_filename("../hybrid_backup_123.zip").is_err());
        assert!(validate_backup_filename("folder/hybrid_backup_123.zip").is_err());
        assert!(validate_backup_filename("notes.zip").is_err());
    }

    #[test]
    fn database_snapshot_contains_committed_wal_data() {
        let temp_dir = TempDir::new().expect("Temp dir should be created");
        let source_path = temp_dir.path().join("source.db");
        let snapshot_path = temp_dir.path().join("snapshot.db");
        let source = Connection::open(&source_path).expect("Source database should open");
        source
            .execute_batch(
                "PRAGMA journal_mode=WAL;
                 CREATE TABLE sample (value TEXT NOT NULL);
                 INSERT INTO sample VALUES ('committed');",
            )
            .expect("Source data should be committed");

        create_database_snapshot(&source, &snapshot_path).expect("Snapshot should succeed");

        let snapshot = Connection::open(snapshot_path).expect("Snapshot database should open");
        let value: String = snapshot
            .query_row("SELECT value FROM sample", [], |row| row.get(0))
            .expect("Snapshot should contain source data");
        assert_eq!(value, "committed");
    }

    #[test]
    fn extracted_database_checksum_detects_tampering() {
        let temp_dir = TempDir::new().expect("Temp dir should be created");
        let db_path = temp_dir.path().join("content.db");
        let conn = Connection::open(&db_path).expect("Database should open");
        conn.execute("CREATE TABLE sample (value INTEGER)", [])
            .expect("Schema should be created");
        drop(conn);

        let checksum = hash_file(&db_path).expect("Checksum should be generated");
        validate_extracted_database(&db_path, &checksum).expect("Valid database should pass");

        fs::write(&db_path, b"tampered").expect("Database should be overwritten for test");
        assert!(validate_extracted_database(&db_path, &checksum).is_err());
    }
}
