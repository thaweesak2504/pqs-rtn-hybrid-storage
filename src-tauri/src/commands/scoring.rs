use crate::content_database;

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
