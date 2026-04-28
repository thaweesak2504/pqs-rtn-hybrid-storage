use crate::{auth, content_database, hybrid_backup};

#[tauri::command]
pub fn initialize_database_if_needed() -> Result<String, String> {
    // Check system state first
    let system_state = hybrid_backup::check_system_state_for_initialization()
        .map_err(|e| format!("Failed to check system state: {}", e))?;

    // Only initialize if database or media is missing/invalid
    let should_initialize =
        !(system_state.database_exists_and_valid && system_state.media_exists_and_valid);

    if should_initialize {
        auth::initialize_database()
    } else {
        Ok("Database and media already initialized".to_string())
    }
}

#[tauri::command]
pub fn initialize_content_database() -> Result<String, String> {
    content_database::initialize_content_database()
}

#[tauri::command]
pub fn seed_content_database(file_path: String) -> Result<String, String> {
    content_database::seed_content_database_from_file(&file_path)
}

#[tauri::command]
pub fn create_new_document(args: content_database::CreateDocumentArgs) -> Result<String, String> {
    content_database::create_document(args)
}

#[tauri::command]
pub fn generate_document_id_preview(
    unit_code: String,
    doc_type: String,
    user_level: String,
) -> Result<String, String> {
    content_database::generate_document_id(&unit_code, &doc_type, &user_level)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_owner_units(parent_id: Option<String>) -> Result<Vec<content_database::OwnerUnit>, String> {
    content_database::get_owner_units(parent_id)
}

#[tauri::command]
pub fn search_documents(
    unit_id_prefix: Option<String>,
    doc_type: Option<String>,
    name_part: Option<String>,
    status: Option<String>,
) -> Result<Vec<content_database::Document>, String> {
    content_database::search_documents(unit_id_prefix, doc_type, name_part, status)
}

#[tauri::command]
pub fn delete_document(id: String) -> Result<String, String> {
    content_database::delete_document(id)
}

#[tauri::command]
pub fn update_document(args: content_database::UpdateDocumentArgs) -> Result<String, String> {
    content_database::update_document(args)
}

#[tauri::command]
pub fn get_document_questions(doc_id: String) -> Result<Vec<content_database::Question>, String> {
    content_database::get_document_questions(doc_id)
}

#[tauri::command]
pub fn get_document_questions_with_details(
    doc_id: String,
) -> Result<Vec<content_database::QuestionDetail>, String> {
    content_database::get_document_questions_with_details(doc_id)
}

#[tauri::command]
pub fn get_document_with_hierarchy(id: String) -> Result<content_database::DocumentHierarchy, String> {
    content_database::get_document_with_hierarchy(id)
}
