use crate::{content_database, migration_helper};

// ===== Section Management Commands =====

#[tauri::command]
pub fn create_section(
    request: content_database::CreateSectionRequest,
) -> Result<content_database::Section, String> {
    content_database::create_section(request)
}

#[tauri::command]
pub fn get_sections_by_document(document_id: String) -> Result<Vec<content_database::Section>, String> {
    content_database::get_sections_by_document(document_id)
}

#[tauri::command]
pub fn delete_section(id: i64) -> Result<(), String> {
    content_database::delete_section(id)
}

#[tauri::command]
pub fn update_section(args: content_database::UpdateSectionArgs) -> Result<(), String> {
    content_database::update_section(args)
}

#[tauri::command]
pub fn update_section_order(id: i64, new_order: i32) -> Result<(), String> {
    content_database::update_section_order(id, new_order)
}

#[tauri::command]
pub fn migrate_section_101() -> Result<usize, String> {
    migration_helper::migrate_create_section_101()
}
