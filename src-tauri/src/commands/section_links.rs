use crate::content_database;

// ==========================================
// QuestionSectionLinks Commands (3xx.1.4/1.5)
// ==========================================

#[tauri::command]
pub fn add_question_section_link(
    req: content_database::AddQuestionSectionLinkRequest,
) -> Result<content_database::QuestionSectionLink, String> {
    content_database::add_question_section_link(req)
}

#[tauri::command]
pub fn batch_add_question_section_links(
    req: content_database::BatchAddQuestionSectionLinksRequest,
) -> Result<Vec<content_database::QuestionSectionLink>, String> {
    content_database::batch_add_question_section_links(req)
}

#[tauri::command]
pub fn remove_question_section_link(id: i64) -> Result<(), String> {
    content_database::remove_question_section_link(id)
}

#[tauri::command]
pub fn remove_all_question_section_links(question_id: String) -> Result<(), String> {
    content_database::remove_all_question_section_links(question_id)
}

#[tauri::command]
pub fn get_question_section_links(
    question_id: String,
) -> Result<Vec<content_database::QuestionSectionLink>, String> {
    content_database::get_question_section_links(question_id)
}

#[tauri::command]
pub fn update_section_link_score(
    args: content_database::UpdateSectionLinkScoreArgs,
) -> Result<(), String> {
    content_database::update_section_link_score(args)
}

#[tauri::command]
pub fn recalculate_section_link_scores(question_id: String) -> Result<i32, String> {
    content_database::recalculate_section_link_scores(question_id)
}

#[tauri::command]
pub fn migrate_question_children_to_section_links() -> Result<usize, String> {
    // Legacy: now delegates to the new L3 migration
    content_database::migrate_section_links_to_ref_children()
}

// ==========================================
// Section-Ref L3 Children Commands (3xx.1.4/1.5 → real L3 Questions)
// ==========================================

#[tauri::command]
pub fn get_section_ref_children(
    parent_id: String,
) -> Result<Vec<content_database::SectionRefChild>, String> {
    content_database::get_section_ref_children(parent_id)
}

#[tauri::command]
pub fn get_back_referencing_section_ids(section_id: i64) -> Result<Vec<i64>, String> {
    content_database::get_back_referencing_section_ids(section_id)
}

#[tauri::command]
pub fn add_section_ref_child(
    args: content_database::AddSectionRefChildArgs,
) -> Result<content_database::SectionRefChild, String> {
    content_database::add_section_ref_child(args)
}

#[tauri::command]
pub fn batch_add_section_ref_children(
    args: content_database::BatchAddSectionRefChildrenArgs,
) -> Result<Vec<content_database::SectionRefChild>, String> {
    content_database::batch_add_section_ref_children(args)
}

#[tauri::command]
pub fn remove_section_ref_child(question_id: String) -> Result<(), String> {
    content_database::remove_section_ref_child(question_id)
}

#[tauri::command]
pub fn remove_all_section_ref_children(parent_id: String) -> Result<(), String> {
    content_database::remove_all_section_ref_children(parent_id)
}

#[tauri::command]
pub fn update_section_ref_score(question_id: String, score: i32) -> Result<(), String> {
    content_database::update_section_ref_score(question_id, score)
}

#[tauri::command]
pub fn migrate_section_links_to_ref_children() -> Result<usize, String> {
    content_database::migrate_section_links_to_ref_children()
}

// Required Count Children (3xx.2-3xx.6 L3 "ครั้งที่ X")

#[tauri::command]
pub fn get_required_count_children(
    parent_id: String,
) -> Result<Vec<content_database::RequiredCountChild>, String> {
    content_database::get_required_count_children(parent_id)
}

#[tauri::command]
pub fn sync_required_count_children(
    args: content_database::SyncRequiredCountArgs,
) -> Result<Vec<content_database::RequiredCountChild>, String> {
    content_database::sync_required_count_children(args)
}
