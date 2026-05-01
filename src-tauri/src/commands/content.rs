use crate::{content_database, migration_helper};

// ===== Document Management Commands =====

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

// ===== Scoring & User Progress Commands =====

#[tauri::command]
pub fn calculate_section_total_score(section_id: i64) -> Result<i32, String> {
    content_database::calculate_section_total_score(section_id)
}

#[tauri::command]
pub fn batch_recalculate_section_group_scores(section_id: i64) -> Result<Vec<(String, i32)>, String> {
    content_database::batch_recalculate_section_group_scores(section_id)
}

#[tauri::command]
pub fn upsert_user_progress(
    args: content_database::UpsertUserProgressArgs,
) -> Result<content_database::UserProgress, String> {
    content_database::upsert_user_progress(args)
}

#[tauri::command]
pub fn get_user_progress(
    user_id: String,
    document_id: String,
) -> Result<Vec<content_database::UserProgress>, String> {
    content_database::get_user_progress(user_id, document_id)
}

#[tauri::command]
pub fn calculate_group_score(parent_id: String) -> Result<i32, String> {
    content_database::calculate_group_score(parent_id)
}

#[tauri::command]
pub fn update_question_score(args: content_database::UpdateQuestionScoreArgs) -> Result<(), String> {
    content_database::update_question_score(args)
}

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

#[tauri::command]
pub fn check_has_children(parent_id: String) -> Result<bool, String> {
    content_database::check_has_children(parent_id)
}

#[tauri::command]
pub fn get_document_stats() -> Result<content_database::DocumentStats, String> {
    content_database::get_document_stats()
}

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

// ===== Media Commands =====

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

// ===== Trainee Answer Commands =====

#[tauri::command]
pub fn save_trainee_answer(args: content_database::SaveTraineeAnswerArgs) -> Result<String, String> {
    content_database::save_trainee_answer(args)
}

#[tauri::command]
pub fn save_qualifier_assessment(
    args: content_database::SaveQualifierAssessmentArgs,
) -> Result<String, String> {
    content_database::save_qualifier_assessment(args)
}

#[tauri::command]
pub fn get_trainee_answers(
    user_id: String,
    document_id: String,
) -> Result<Vec<content_database::UserAnswer>, String> {
    content_database::get_trainee_answers(&user_id, &document_id)
}
