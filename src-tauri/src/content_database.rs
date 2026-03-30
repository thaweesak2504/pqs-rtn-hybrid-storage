pub mod types;
pub use types::*;
pub mod connection;
pub mod schema;
pub use connection::*;
pub use schema::*;
pub mod references;
pub mod utils;
pub use references::*;
pub use utils::*;
pub mod branches;
pub mod documents;
pub use branches::*;
pub use documents::*;
pub mod questions;
pub use questions::*;
pub mod sections;
pub use sections::*;
pub mod section_links;
pub use section_links::*;
pub mod media;
pub use media::*;
pub mod answers;
pub use answers::{get_trainee_answers, save_qualifier_assessment, save_trainee_answer};
pub mod helpers;
pub use helpers::*;
pub mod migrations;
#[cfg(test)]
mod tests;
pub use migrations::*;
pub mod scoring;
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
