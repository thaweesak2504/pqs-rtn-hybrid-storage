use rusqlite::Result;
use crate::content_database::get_content_connection;

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
