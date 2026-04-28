use crate::content_database;

// ==========================================
// Occupation Branch Commands
// ==========================================

#[tauri::command]
pub fn get_occupation_branches() -> Result<Vec<content_database::OccupationBranch>, String> {
    content_database::get_occupation_branches()
}

#[tauri::command]
pub fn create_occupation_branch(
    code: String,
    name: String,
) -> Result<content_database::OccupationBranch, String> {
    content_database::create_occupation_branch(code, name)
}

#[tauri::command]
pub fn update_occupation_branch(code: String, name: String) -> Result<(), String> {
    content_database::update_occupation_branch(code, name)
}

#[tauri::command]
pub fn delete_occupation_branch(code: String) -> Result<(), String> {
    content_database::delete_occupation_branch(code)
}

#[tauri::command]
pub fn get_occupation_sub_branches(
    branch_code: String,
) -> Result<Vec<content_database::OccupationSubBranch>, String> {
    content_database::get_occupation_sub_branches(branch_code)
}

#[tauri::command]
pub fn create_occupation_sub_branch(
    code: String,
    branch_code: String,
    name: String,
) -> Result<content_database::OccupationSubBranch, String> {
    content_database::create_occupation_sub_branch(code, branch_code, name)
}

#[tauri::command]
pub fn update_occupation_sub_branch(
    code: String,
    branch_code: String,
    name: String,
) -> Result<(), String> {
    content_database::update_occupation_sub_branch(code, branch_code, name)
}

#[tauri::command]
pub fn delete_occupation_sub_branch(code: String, branch_code: String) -> Result<(), String> {
    content_database::delete_occupation_sub_branch(code, branch_code)
}

#[tauri::command]
pub fn get_occupation_sub_questions(
    branch_code: String,
    sub_branch_code: String,
) -> Result<Vec<content_database::OccupationSubQuestion>, String> {
    content_database::get_occupation_sub_questions(branch_code, sub_branch_code)
}

#[tauri::command]
pub fn get_all_sub_questions_for_branch(
    branch_code: String,
) -> Result<Vec<content_database::OccupationSubQuestion>, String> {
    content_database::get_all_sub_questions_for_branch(branch_code)
}

#[tauri::command]
pub fn create_occupation_sub_question(
    req: content_database::CreateSubQuestionRequest,
) -> Result<content_database::OccupationSubQuestion, String> {
    content_database::create_occupation_sub_question(req)
}

#[tauri::command]
pub fn update_occupation_sub_question(
    id: i64,
    text: String,
    always_checked: Option<bool>,
) -> Result<(), String> {
    content_database::update_occupation_sub_question(id, text, always_checked)
}

#[tauri::command]
pub fn delete_occupation_sub_question(id: i64) -> Result<(), String> {
    content_database::delete_occupation_sub_question(id)
}

#[tauri::command]
pub fn delete_occupation_sub_questions_by_sub_branch(
    branch_code: String,
    sub_branch_code: String,
) -> Result<(), String> {
    content_database::delete_occupation_sub_questions_by_sub_branch(branch_code, sub_branch_code)
}

#[tauri::command]
pub fn reorder_occupation_sub_questions(ids: Vec<i64>) -> Result<(), String> {
    content_database::reorder_occupation_sub_questions(ids)
}

#[tauri::command]
pub fn batch_create_occupation_sub_questions(
    items: Vec<content_database::BatchSubQuestionItem>,
) -> Result<Vec<content_database::OccupationSubQuestion>, String> {
    content_database::batch_create_occupation_sub_questions(items)
}

#[tauri::command]
pub fn get_standard_branch_sub_questions(
) -> Result<Vec<content_database::OccupationSubQuestion>, String> {
    content_database::get_standard_branch_sub_questions()
}

#[tauri::command]
pub fn toggle_slot_completion(
    branch_code: String,
    sub_branch_code: String,
    slot_id: String,
) -> Result<bool, String> {
    content_database::toggle_slot_completion(branch_code, sub_branch_code, slot_id)
}

#[tauri::command]
pub fn get_slot_completion_map(
    branch_code: String,
    sub_branch_code: String,
) -> Result<std::collections::HashMap<String, bool>, String> {
    content_database::get_slot_completion_map(branch_code, sub_branch_code)
}

#[tauri::command]
pub fn get_all_completed_branch_pairs() -> Result<Vec<content_database::CompletedBranchPair>, String> {
    content_database::get_all_completed_branch_pairs()
}

// Document Branch (Occupation Branch at document level)

#[tauri::command]
pub fn get_document_branch(doc_id: String) -> Result<content_database::DocumentBranch, String> {
    content_database::get_document_branch(doc_id)
}

#[tauri::command]
pub fn update_document_branch(
    doc_id: String,
    branch_main: Option<String>,
    branch_sub: Option<String>,
) -> Result<(), String> {
    content_database::update_document_branch(doc_id, branch_main, branch_sub)
}

#[tauri::command]
pub fn check_career_branch_usage(
    doc_id: String,
) -> Result<content_database::CareerBranchUsageReport, String> {
    content_database::check_career_branch_usage(doc_id)
}

#[tauri::command]
pub fn reset_and_update_career_branch(
    doc_id: String,
    new_main: Option<String>,
    new_sub: Option<String>,
) -> Result<content_database::CareerBranchResetReport, String> {
    content_database::reset_and_update_career_branch(doc_id, new_main, new_sub)
}

#[tauri::command]
pub fn check_branch_usage_global(
    branch_code: String,
) -> Result<content_database::BranchUsageReport, String> {
    content_database::check_branch_usage_global(branch_code)
}

#[tauri::command]
pub fn check_sub_branch_usage_global(
    branch_code: String,
    sub_code: String,
) -> Result<content_database::BranchUsageReport, String> {
    content_database::check_sub_branch_usage_global(branch_code, sub_code)
}
