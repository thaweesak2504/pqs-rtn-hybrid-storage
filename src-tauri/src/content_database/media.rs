use base64::{engine::general_purpose, Engine as _};
use rusqlite::{params, Connection};

use super::*;

// ============================================================
// Images & Media
// ============================================================

/// Helper to bundle a file into the portable data directory
pub fn bundle_reference_file(
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
        // If it starts with 'data/', it's already portable
        if source_path.starts_with("data/") {
            return Ok(source_path.to_string());
        }
        return Ok(source_path.to_string()); // Fallback
    }

    let file_name = source
        .file_name()
        .ok_or_else(|| "Invalid file name".to_string())?
        .to_str()
        .ok_or_else(|| "Invalid file name encoding".to_string())?;

    let data_dir = get_portable_data_dir()?;

    // Use PQS ID as subfolder if provided, otherwise use 'COMMON' or just root
    let root_folder = pqs_id.unwrap_or("COMMON");

    // Flattened structure: data/{ID}/references/{CATEGORY}/{code}_{filename}
    let dest_dir = data_dir.join(root_folder).join("references").join(category);
    std::fs::create_dir_all(&dest_dir).map_err(|e| format!("Failed to create dest dir: {}", e))?;

    // NEW: Prefix with code for better organization
    let new_file_name = format!("{}_{}", code, file_name);
    let dest_path = dest_dir.join(&new_file_name);

    // Only copy if source and dest are different
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

    // Return relative path including the root folder (e.g., "data/100/references/CATEGORY/CODE_filename")
    Ok(format!(
        "data/{}/references/{}/{}",
        root_folder, category, new_file_name
    ))
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

    println!("DEBUG: Uploading image to {:?}", target_path);

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

pub fn delete_question_image(relative_path: String) -> Result<(), String> {
    if !relative_path.starts_with("data/") {
        return Ok(()); // Not a managed file, ignore
    }

    let data_dir = get_portable_data_dir().map_err(|e| e.to_string())?;
    // relative_path is "data/..."
    // strip "data/"
    let suffix = relative_path
        .strip_prefix("data/")
        .unwrap_or(&relative_path);
    let target_path = data_dir.join(suffix);

    if target_path.exists() {
        std::fs::remove_file(target_path)
            .map_err(|e| format!("Failed to delete image file: {}", e))?;
    }
    Ok(())
}

/// Resolve relative image path (data/images/...) to absolute system path
pub fn resolve_image_path(relative_path: String) -> Result<String, String> {
    if !relative_path.starts_with("data/") {
        return Ok(relative_path); // Return as is if not our format
    }

    let data_dir = get_portable_data_dir().map_err(|e| e.to_string())?;

    // relative_path is "data/images/xyz.jpg"
    // we want to join data_dir (which ends in "data") with "images/xyz.jpg"
    // OR if data_dir is the parent?
    // get_portable_data_dir returns ".../data".
    // So if we strip "data/" from relative path, we get "images/xyz.jpg".

    let suffix = relative_path
        .strip_prefix("data/")
        .unwrap_or(&relative_path);
    let abs_path = data_dir.join(suffix);

    Ok(abs_path.to_string_lossy().to_string())
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
