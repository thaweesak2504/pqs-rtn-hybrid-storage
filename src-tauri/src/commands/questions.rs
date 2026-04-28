use crate::content_database;

#[tauri::command]
pub fn create_question(args: content_database::CreateQuestionArgs) -> Result<String, String> {
    content_database::create_question(args)
}

#[tauri::command]
pub fn update_question(args: content_database::UpdateQuestionArgs) -> Result<(), String> {
    content_database::update_question(args)
}

#[tauri::command]
pub fn delete_question(id: String) -> Result<(), String> {
    content_database::delete_question(id)
}

#[tauri::command]
pub fn reorder_questions(question_ids: Vec<String>) -> Result<(), String> {
    content_database::reorder_questions(question_ids)
}

#[tauri::command]
pub fn upload_question_image(
    path: String,
    document_id: String,
    question_id: String,
    friendly_prefix: Option<String>,
) -> Result<String, String> {
    content_database::upload_question_image(path, document_id, question_id, friendly_prefix)
}

#[tauri::command]
pub fn delete_question_image(path: String) -> Result<(), String> {
    content_database::delete_question_image(path)
}

#[tauri::command]
pub fn resolve_image_path(path: String) -> Result<String, String> {
    content_database::resolve_image_path(path)
}

#[tauri::command]
pub fn get_question_image_base64(path: String) -> Result<String, String> {
    content_database::get_question_image_base64(path)
}

#[tauri::command]
pub fn check_has_children(parent_id: String) -> Result<bool, String> {
    content_database::check_has_children(parent_id)
}

#[tauri::command]
pub fn get_document_stats() -> Result<content_database::DocumentStats, String> {
    content_database::get_document_stats()
}
