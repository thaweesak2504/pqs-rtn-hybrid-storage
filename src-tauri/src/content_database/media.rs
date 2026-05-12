use crate::logger;
use base64::{engine::general_purpose, Engine as _};
use rusqlite::{params, Connection};

use super::*;

// ============================================================
// Images & Media
// ============================================================

pub(crate) fn bundle_reference_file_in_dir(
    data_dir: &std::path::Path,
    code: &str,
    category: &str,
    source_path: &str,
    pqs_id: Option<&str>,
) -> Result<String, String> {
    if source_path.trim().is_empty() || source_path.starts_with("http") {
        return Ok(source_path.to_string());
    }

    let source = std::path::Path::new(source_path);
    if !source.exists() {
        if source_path.starts_with("data/") {
            return Ok(source_path.to_string());
        }
        return Ok(source_path.to_string());
    }

    let file_name = source
        .file_name()
        .ok_or_else(|| "Invalid file name".to_string())?
        .to_str()
        .ok_or_else(|| "Invalid file name encoding".to_string())?;

    let root_folder = pqs_id.unwrap_or("COMMON");
    let dest_dir = data_dir.join(root_folder).join("references").join(category);
    std::fs::create_dir_all(&dest_dir).map_err(|e| format!("Failed to create dest dir: {}", e))?;

    let new_file_name = format!("{}_{}", code, file_name);
    let dest_path = dest_dir.join(&new_file_name);

    if source != dest_path {
        std::fs::copy(source, &dest_path).map_err(|e| {
            format!(
                "Failed to copy file from {} to {}: {}",
                source_path,
                dest_path.display(),
                e
            )
        })?;
    }

    Ok(format!(
        "data/{}/references/{}/{}",
        root_folder, category, new_file_name
    ))
}

/// Helper to bundle a file into the portable data directory
pub fn bundle_reference_file(
    code: &str,
    category: &str,
    source_path: &str,
    pqs_id: Option<&str>,
) -> Result<String, String> {
    let data_dir = get_portable_data_dir()?;
    bundle_reference_file_in_dir(&data_dir, code, category, source_path, pqs_id)
}

/// Helper function to get reference by ID
pub fn get_reference_by_id(conn: &Connection, id: i64) -> Result<DocumentReference, String> {
    conn.query_row(
        "SELECT id, code, title, category, classification, resource_type, file_path, created_at, updated_at
         FROM DocumentReferences WHERE id = ?1",
        params![id],
        |row| {
            Ok(DocumentReference {
                id: row.get(0)?,
                code: row.get(1)?,
                title: row.get(2)?,
                category: row.get(3)?,
                classification: row.get(4)?,
                resource_type: row.get(5)?,
                file_path: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// Upload an image for a question (copies to data/{doc_id}/question-images/{prefix}_{filename})
pub fn upload_question_image(
    source_path: String,
    document_id: String,
    question_id: String,
    friendly_prefix: Option<String>,
) -> Result<String, String> {
    let data_dir = get_portable_data_dir().map_err(|e| e.to_string())?;

    // Target: data/{document_id}/question-images/
    let target_dir = data_dir.join(&document_id).join("question-images");

    if !target_dir.exists() {
        std::fs::create_dir_all(&target_dir)
            .map_err(|e| format!("Failed to create images directory: {}", e))?;
    }

    let path = std::path::Path::new(&source_path);
    let extension = path.extension().and_then(|e| e.to_str()).unwrap_or("jpg");
    // Get original filename stem (without extension)
    let original_stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("image");

    // Construct filename:
    // If friendly_prefix ("101-1") is provided: "101-1_originalName.ext"
    // Else: "{question_id}_{uuid}.ext"
    let filename = if let Some(prefix) = friendly_prefix {
        // Sanitize prefix to be safe for filenames
        // Sanitize prefix to be safe for filenames (Allow . for 101.1 style)
        let safe_prefix = prefix.replace("/", "-").replace("\\", "-");
        let safe_stem = original_stem.replace(" ", "_"); // Basic sanitization
        format!("{}_{}.{}", safe_prefix, safe_stem, extension)
    } else {
        format!(
            "{}_{}.{}",
            question_id,
            generate_uuid().chars().take(8).collect::<String>(),
            extension
        )
    };

    // Check collision, if exists, append short UUID
    let mut target_path = target_dir.join(&filename);
    if target_path.exists() {
        let new_filename = format!(
            "{}_{}.{}",
            filename.trim_end_matches(&format!(".{}", extension)),
            generate_uuid().chars().take(4).collect::<String>(),
            extension
        );
        target_path = target_dir.join(&new_filename);
    }

    logger::debug(format!(
        "Uploading question image to {}",
        target_path.display()
    ));

    std::fs::copy(&source_path, &target_path)
        .map_err(|e| format!("Failed to copy image: {}", e))?;

    // Return relative path: data/{document_id}/question-images/{filename}
    // Note: We return the relative path from "data" root or just the portable path string?
    // Frontend expects "data/..." string.
    let relative_filename = target_path.file_name().unwrap().to_string_lossy();
    Ok(format!(
        "data/{}/question-images/{}",
        document_id, relative_filename
    ))
}

pub(crate) fn delete_question_image_in_dir(
    data_dir: &std::path::Path,
    relative_path: &str,
) -> Result<(), String> {
    if !relative_path.starts_with("data/") {
        return Ok(());
    }

    let suffix = relative_path.strip_prefix("data/").unwrap_or(relative_path);
    let target_path = data_dir.join(suffix);

    if target_path.exists() {
        std::fs::remove_file(target_path)
            .map_err(|e| format!("Failed to delete image file: {}", e))?;
    }
    Ok(())
}

pub fn delete_question_image(relative_path: String) -> Result<(), String> {
    let data_dir = get_portable_data_dir().map_err(|e| e.to_string())?;
    delete_question_image_in_dir(&data_dir, &relative_path)
}

pub(crate) fn resolve_image_path_in_dir(
    data_dir: &std::path::Path,
    relative_path: &str,
) -> Result<String, String> {
    if !relative_path.starts_with("data/") {
        return Ok(relative_path.to_string());
    }

    let suffix = relative_path.strip_prefix("data/").unwrap_or(relative_path);
    let abs_path = data_dir.join(suffix);

    Ok(abs_path.to_string_lossy().to_string())
}

pub fn resolve_image_path(relative_path: String) -> Result<String, String> {
    let data_dir = get_portable_data_dir().map_err(|e| e.to_string())?;
    resolve_image_path_in_dir(&data_dir, &relative_path)
}

/// Get image as Base64 string for reliable frontend display
pub fn get_question_image_base64(relative_path: String) -> Result<String, String> {
    let abs_path_str = resolve_image_path(relative_path)?;
    let path = std::path::Path::new(&abs_path_str);

    if !path.exists() {
        return Err(format!("Image file not found: {}", abs_path_str));
    }

    let data = std::fs::read(path).map_err(|e| format!("Failed to read image file: {}", e))?;

    // Simple mime type detection
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();

    let mime_type = match extension.as_str() {
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "image/jpeg",
    };

    let base64_data = general_purpose::STANDARD.encode(&data);

    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

pub fn get_file_sha256(path_str: String) -> Result<String, String> {
    use sha2::{Digest, Sha256};
    use std::io::Read;

    // Resolve path if it's a relative data/ path
    let abs_path_str = resolve_image_path(path_str.clone()).unwrap_or(path_str);
    let path = std::path::Path::new(&abs_path_str);

    if !path.exists() {
        return Err(format!("File not found: {}", abs_path_str));
    }

    let mut file = std::fs::File::open(path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];

    loop {
        let count = file.read(&mut buffer).map_err(|e| format!("Read error: {}", e))?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}


// ============================================================
// Phase 5G: Trainee Attachments
// ============================================================

/// Allowed file extensions for trainee attachments
const ALLOWED_ATTACHMENT_EXTENSIONS: &[&str] = &[
    // Images
    "jpg", "jpeg", "png", "webp",
    // Documents
    "pdf",
    // Videos
    "mp4", "webm",
    // Audio
    "mp3", "wav", "m4a", "ogg",
];

/// Maximum file size: 10 MB
const MAX_ATTACHMENT_SIZE_BYTES: u64 = 10 * 1024 * 1024;

/// Upload a trainee attachment file to data/{document_id}/trainee-attachments/
/// Returns the relative path string: "data/{doc_id}/trainee-attachments/{filename}"
pub fn upload_trainee_attachment(
    source_path: String,
    document_id: String,
    question_id: String,
    user_id: String,
    friendly_prefix: Option<String>,
) -> Result<String, String> {
    let source = std::path::Path::new(&source_path);
    if !source.exists() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    // Validate extension
    let extension = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if !ALLOWED_ATTACHMENT_EXTENSIONS.contains(&extension.as_str()) {
        return Err(format!(
            "ไม่รองรับไฟล์ประเภท .{} (รองรับ: {})",
            extension,
            ALLOWED_ATTACHMENT_EXTENSIONS.join(", ")
        ));
    }

    // Validate file size
    let file_size = std::fs::metadata(source)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?
        .len();

    if file_size > MAX_ATTACHMENT_SIZE_BYTES {
        let max_mb = MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024);
        let file_mb = file_size as f64 / (1024.0 * 1024.0);
        return Err(format!(
            "ไฟล์มีขนาด {:.1} MB เกินขีดจำกัด {} MB",
            file_mb, max_mb
        ));
    }

    let data_dir = get_portable_data_dir().map_err(|e| e.to_string())?;
    let target_dir = data_dir.join(&document_id).join("trainee-attachments");

    if !target_dir.exists() {
        std::fs::create_dir_all(&target_dir)
            .map_err(|e| format!("Failed to create trainee-attachments directory: {}", e))?;
    }

    let short_uuid = generate_uuid().chars().take(8).collect::<String>();
    
    let filename = if let Some(prefix) = friendly_prefix {
        let safe_prefix = prefix.replace("/", "-").replace("\\", "-");
        let original_stem = source.file_stem().and_then(|s| s.to_str()).unwrap_or("attachment").replace(" ", "_");
        format!("{}_{}_{}_{}.{}", safe_prefix, original_stem, user_id, short_uuid, extension)
    } else {
        format!("{}_{}_{}.{}", question_id, user_id, short_uuid, extension)
    };

    let target_path = target_dir.join(&filename);

    logger::debug(format!(
        "Uploading trainee attachment to {}",
        target_path.display()
    ));

    std::fs::copy(&source_path, &target_path)
        .map_err(|e| format!("Failed to copy attachment file: {}", e))?;

    Ok(format!(
        "data/{}/trainee-attachments/{}",
        document_id, filename
    ))
}

/// Delete a trainee attachment file from disk
pub fn delete_trainee_attachment(relative_path: String) -> Result<(), String> {
    if !relative_path.starts_with("data/") || !relative_path.contains("/trainee-attachments/") {
        return Err("Invalid trainee attachment path".to_string());
    }

    let data_dir = get_portable_data_dir().map_err(|e| e.to_string())?;
    let suffix = relative_path.strip_prefix("data/").unwrap_or(&relative_path);
    let target_path = data_dir.join(suffix);

    if target_path.exists() {
        std::fs::remove_file(&target_path)
            .map_err(|e| format!("Failed to delete attachment file: {}", e))?;
        logger::debug(format!("Deleted trainee attachment: {}", relative_path));
    }

    Ok(())
}
