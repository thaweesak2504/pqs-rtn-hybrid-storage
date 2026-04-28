use crate::content_database;

// ===== Reference Management Commands =====

#[tauri::command]
pub fn create_reference(
    request: content_database::CreateReferenceRequest,
) -> Result<content_database::DocumentReference, String> {
    content_database::create_reference(request)
}

#[tauri::command]
pub fn get_references(
    search: Option<String>,
    category: Option<String>,
) -> Result<Vec<content_database::DocumentReference>, String> {
    content_database::get_references(search, category)
}

#[tauri::command]
pub fn update_reference(args: content_database::UpdateReferenceArgs) -> Result<(), String> {
    content_database::update_reference(args)
}

#[tauri::command]
pub fn delete_reference(id: i64) -> Result<(), String> {
    content_database::delete_reference(id)
}

#[tauri::command]
pub fn delete_all_references() -> Result<(), String> {
    content_database::delete_all_references()
}

#[tauri::command]
pub fn add_section_reference(
    section_id: i64,
    reference_id: i64,
    display_order: Option<i32>,
) -> Result<(), String> {
    content_database::add_section_reference(section_id, reference_id, display_order)
}

#[tauri::command]
pub fn remove_section_reference(section_ref_id: i64) -> Result<(), String> {
    content_database::remove_section_reference(section_ref_id)
}

#[tauri::command]
pub fn get_section_references(
    section_id: i64,
) -> Result<Vec<content_database::SectionReferenceDetail>, String> {
    content_database::get_section_references(section_id)
}

#[tauri::command]
pub fn add_question_reference(
    req: content_database::AddQuestionReferenceRequest,
) -> Result<(), String> {
    content_database::add_question_reference(req)
}

#[tauri::command]
pub fn remove_question_reference(id: i32) -> Result<(), String> {
    content_database::remove_question_reference(id)
}

#[tauri::command]
pub fn update_question_reference_location(
    id: i32,
    location_text: Option<String>,
) -> Result<(), String> {
    content_database::update_question_reference_location(id, location_text)
}
