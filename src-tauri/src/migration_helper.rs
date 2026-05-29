use crate::content_database::get_content_connection;
use crate::logger;
use rusqlite::Result;
use tauri::api::path::app_data_dir;
use tauri::Config;

/// Clean up legacy `database.db` file left over from the pre-consolidation era.
///
/// Before DB consolidation, user/auth data lived in a separate `database.db` alongside
/// `content.db`. Post-consolidation everything lives in `content.db`. Users upgrading
/// from an older version may still have the stale `database.db` on disk — this removes
/// it (renamed with a `.legacy` suffix first, not deleted, so data is recoverable).
///
/// Returns:
/// - `Ok(true)` if a legacy file was found and archived
/// - `Ok(false)` if no legacy file existed (clean install or already migrated)
/// - `Err(String)` on IO failure
pub fn cleanup_legacy_database_file() -> std::result::Result<bool, String> {
    let app_data = app_data_dir(&Config::default()).ok_or("Failed to get app data directory")?;
    let legacy_path = app_data.join("pqs-rtn-hybrid-storage").join("database.db");

    if !legacy_path.exists() {
        return Ok(false);
    }

    // Rename rather than delete so user data is recoverable if ever needed.
    let archived_path = legacy_path.with_extension("db.legacy");

    // If a previous archive already exists, skip (idempotent \u2014 already handled once).
    if archived_path.exists() {
        logger::debug(format!(
            "cleanup_legacy_database_file: legacy archive already exists at {:?}, skipping",
            archived_path
        ));
        return Ok(false);
    }

    std::fs::rename(&legacy_path, &archived_path)
        .map_err(|e| format!("Failed to archive legacy database.db: {}", e))?;

    logger::info(format!(
        "Archived legacy database.db -> {:?} (post-consolidation cleanup)",
        archived_path
    ));
    Ok(true)
}

/// Migrate existing documents to have Section 101
pub fn migrate_create_section_101() -> Result<usize, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Insert Section 101 for all documents that don't have it yet
    let affected_rows = conn.execute(
        "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, display_order, is_system_defined)
         SELECT 
            id AS document_id,
            100 AS section_group,
            101 AS section_number,
                'ข้อควรระมัดระวังอันตรายพื้นฐาน Safety Fundamentals' AS title_th,
            '101 Precautions' AS menu_label,
            1 AS display_order,
            1 AS is_system_defined
         FROM Documents
         WHERE NOT EXISTS (
            SELECT 1 FROM Sections WHERE document_id = Documents.id AND section_number = 101
         )",
        [],
    ).map_err(|e| format!("Migration failed: {}", e))?;

    Ok(affected_rows)
}
