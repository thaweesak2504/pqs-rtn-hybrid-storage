pub mod types;
pub use types::{
    AddQuestionReferenceRequest, AddQuestionSectionLinkRequest, AddSectionRefChildArgs, AnswerKey,
    BatchAddQuestionSectionLinksRequest, BatchAddSectionRefChildrenArgs, BatchSubQuestionItem,
    BranchUsageReport, CareerBranchResetReport, CareerBranchUsageReport, ComputedSectionProgress,
    CreateDocumentArgs, CreateQuestionArgs, CreateReferenceRequest, CreateSectionRequest,
    CreateSubQuestionRequest, DevSectionMetrics, Document, DocumentBranch, DocumentHierarchy,
    DocumentReference, DocumentStats, OccupationBranch, OccupationSubBranch, OccupationSubQuestion,
    OwnerUnit, Question, QuestionChoice, QuestionDetail, QuestionReferenceDetail,
    QuestionSectionLink, ReplaceAnswerKeyItem, RequiredCountChild, SaveQualifierAssessmentArgs,
    SaveTraineeAnswerArgs, Section, SectionRefChild, SectionReferenceDetail,
    SubQuestionUsageResponse, SyncRequiredCountArgs, UpdateDocumentArgs, UpdateQuestionArgs,
    UpdateQuestionScoreArgs, UpdateReferenceArgs, UpdateSectionArgs, UpdateSectionLinkScoreArgs,
    UpsertUserProgressArgs, UserAnswer, UserProgress,
};
pub mod connection;
pub use connection::{get_content_connection, get_portable_data_dir};
pub mod schema;
#[cfg(test)]
pub use schema::init_branch_protection_schema;
pub use schema::{
    ensure_standard_occupation_branch_exists, initialize_content_database,
    is_protected_main_branch, is_protected_sub_branch, migrate_section_links_to_ref_children,
    STANDARD_BRANCH_NAME,
};
pub mod references;
pub use references::{
    add_question_reference, add_section_reference, create_reference, delete_all_references,
    delete_reference, get_references, get_section_references, remove_question_reference,
    remove_section_reference, update_question_reference_location, update_reference,
};
pub mod utils;
pub use utils::generate_uuid;
#[cfg(test)]
pub use utils::to_thai_digit;
pub mod branches;
pub use branches::{
    batch_create_occupation_sub_questions, create_occupation_branch, create_occupation_sub_branch,
    create_occupation_sub_question, delete_occupation_branch, delete_occupation_sub_branch,
    delete_occupation_sub_question, delete_occupation_sub_questions_by_sub_branch,
    get_all_completed_branch_pairs, get_all_sub_questions_for_branch, get_occupation_branches,
    get_occupation_sub_branches, get_occupation_sub_questions, get_slot_completion_map,
    get_standard_branch_sub_questions, reorder_occupation_sub_questions, toggle_slot_completion,
    update_occupation_branch, update_occupation_sub_branch, update_occupation_sub_question,
    CompletedBranchPair,
};
pub mod documents;
#[cfg(test)]
pub use documents::update_document_branch_with_conn;
pub use documents::{
    check_branch_usage_global, check_career_branch_usage, check_sub_branch_usage_global,
    create_document, delete_document, generate_document_id, get_document_branch,
    get_document_stats, get_owner_units, reset_and_update_career_branch, search_documents,
    seed_content_database_from_file, update_document, update_document_branch,
};
pub mod questions;
pub use questions::{
    check_has_children, create_question, delete_question, get_document_questions,
    get_document_questions_with_details, get_document_with_hierarchy, get_required_count_children,
    reorder_questions, sync_required_count_children, update_question,
};
pub mod sections;
pub use sections::{
    cleanup_orphaned_section_refs, create_section, delete_section, get_sections_by_document,
    get_thai_letter, seed_document_template, update_section, update_section_order,
};
#[cfg(test)]
pub use sections::{
    cleanup_orphaned_section_refs_with_conn, create_section_with_conn, delete_section_with_conn,
    seed_section_200_template, seed_section_300_template, update_section_with_conn,
    FIXED_SECTION_101_TITLE,
};
pub mod section_links;
pub use section_links::{
    add_question_section_link, add_section_ref_child, batch_add_question_section_links,
    batch_add_section_ref_children, get_back_referencing_section_ids, get_question_section_links,
    get_section_ref_children, recalculate_section_link_scores, remove_all_question_section_links,
    remove_all_section_ref_children, remove_question_section_link, remove_section_ref_child,
    thai_number, update_section_link_score, update_section_ref_score,
};
pub mod media;
pub use media::{
    bundle_reference_file, delete_question_image, get_question_image_base64, get_reference_by_id,
    resolve_image_path, upload_question_image,
};
pub mod answers;
pub use answers::{get_trainee_answers, save_qualifier_assessment, save_trainee_answer};
pub mod helpers;
pub use helpers::{
    add_question_reference_with_conn, ensure_section_300_policy_allows_question_action,
};
pub mod migrations;
pub use migrations::{
    migrate_answer_keys_to_table, migrate_selected_sub_questions_to_table,
    migrate_sub_question_codes_to_8digit, scrub_legacy_answer_keys_from_metadata,
};
pub mod scoring;
#[cfg(test)]
mod tests;
pub use scoring::{
    batch_recalculate_section_group_scores, calculate_group_score, calculate_section_total_score,
    get_user_progress, recalculate_group_score_chain, recalculate_section_progress,
    update_question_score, upsert_user_progress,
};

/// IDs of built-in example documents that must never be deleted.

// ============================================================
// Career Branch Protection — Check Usage & Reset
// ============================================================

// ==========================================
// Advanced Question Logic & References
// ==========================================

/// Initialize tables for Questions and References
// Called by main initialize_content_database, but we'll modify that function instead of adding a new one
// Use this to EXTEND existing initialization

// Migrations moved to migrations.rs

// Images & Media moved to media.rs

// Internal Helpers moved to helpers.rs

// Thin wrappers for #[tauri::command] registration:

#[tauri::command]
pub fn get_section_progress(
    user_id: String,
    document_id: String,
    section_id: i64,
) -> Result<serde_json::Value, String> {
    scoring::get_section_progress(user_id, document_id, section_id)
}

#[tauri::command]
pub fn get_section_dev_metrics(
    document_id: String,
    section_id: i64,
) -> Result<DevSectionMetrics, String> {
    scoring::get_section_dev_metrics(document_id, section_id)
}

#[tauri::command]
pub fn clear_all_trainee_answers() -> Result<(), String> {
    answers::clear_all_trainee_answers_inner()
}

#[tauri::command]
pub fn get_sub_question_usage_counts(
    parent_id: String,
) -> Result<SubQuestionUsageResponse, String> {
    branches::get_sub_question_usage_counts(parent_id)
}

#[tauri::command]
pub fn get_question_answer_keys(question_id: String) -> Result<Vec<AnswerKey>, String> {
    answers::get_question_answer_keys_inner(question_id)
}

#[tauri::command]
pub fn update_answer_key(
    question_id: String,
    sub_code: String,
    new_text: String,
) -> Result<String, String> {
    answers::update_answer_key_inner(question_id, sub_code, new_text)
}

#[tauri::command]
pub fn replace_question_answer_keys(
    question_id: String,
    items: Vec<ReplaceAnswerKeyItem>,
) -> Result<String, String> {
    answers::replace_question_answer_keys_inner(question_id, items)
}

// Tests moved to tests.rs
// END OF MODULE — all logic is in submodules
