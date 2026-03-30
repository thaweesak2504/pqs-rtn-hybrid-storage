#[derive(serde::Serialize, serde::Deserialize)]
pub struct CreateDocumentArgs {
    pub name: String,
    pub unit_id: String,   // 7-digit ID (e.g., "2272400")
    pub unit_code: String, // 5-digit code (e.g., "22724")
    pub applied_to: String,
    pub doc_type: String,   // "10" or "20"
    pub user_level: String, // "0", "1", or "2"
}
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct OwnerUnit {
    pub unit_id: String,
    pub unit_name: String,
    pub unit_abbr: Option<String>,
    pub parent_id: Option<String>,
    pub unit_level: Option<i32>,
}
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Document {
    pub id: String,
    pub name: String,
    pub applied_to: Option<String>,
    pub unit_owner_id: Option<String>,
    pub unit_code: Option<String>,
    pub doc_type: Option<String>,
    pub user_level: Option<String>,
    pub status: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}
#[derive(serde::Deserialize)]
pub struct UpdateDocumentArgs {
    pub id: String,
    pub name: String,
    pub applied_to: String,
    pub doc_type: String,
    pub user_level: String,
}
#[derive(serde::Serialize)]
pub struct DocumentBranch {
    pub occupation_branch_main: Option<String>,
    pub occupation_branch_sub: Option<String>,
}
#[derive(serde::Serialize)]
pub struct CareerBranchUsageReport {
    pub has_conflict: bool,
    pub affected_question_count: i64,
    pub affected_section_groups: Vec<i32>,
}
#[derive(serde::Serialize)]
pub struct BranchUsageReport {
    pub is_used: bool,
    pub document_count: i64,
    pub document_names: Vec<String>,
}
#[derive(serde::Serialize)]
pub struct CareerBranchResetReport {
    pub subq_links_deleted: usize,
    pub answer_keys_deleted: usize,
    pub user_answers_deleted: usize,
    pub questions_reset: usize,
}
#[derive(serde::Serialize)]
pub struct DocumentStats {
    pub total_count: i64,
    pub draft_count: i64,
}
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Question {
    pub id: String, // UUID-like string
    pub document_id: String,
    pub section_id: Option<i64>,
    pub parent_id: Option<String>,
    pub sequence: i32,
    pub content: String,
    pub is_header: bool,
    pub description: Option<String>,
    pub answer_type: Option<String>,
    pub metadata: Option<String>, // JSON string
    pub score: Option<i32>,
    pub question_type: Option<String>, // 'normal', 'exempted', 'required_instance'
    pub group_score: Option<i32>,
    pub display_text: Option<String>, // e.g. "(ไม่ต้องปฏิบัติ)"
    pub is_group_header: Option<bool>,
    pub is_scored: Option<bool>,
}
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct QuestionChoice {
    pub id: i32,
    pub question_id: String,
    pub label: Option<String>, // ก. ข.
    pub content: String,
    pub is_correct: bool,
    pub sequence: i32,
}
#[allow(dead_code)]
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Reference {
    pub id: i32,
    pub document_id: String,
    pub content: String,
    pub sequence: i32,
}
#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct DocumentReference {
    pub id: i64,
    pub code: String,
    pub title: String,
    pub category: Option<String>,
    pub classification: Option<String>,
    pub resource_type: Option<String>, // New: DOCUMENT, WEBLINK, VIDEO, IMAGE, AUDIO, TEMPLATE
    pub file_path: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
}
#[allow(dead_code)]
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct QuestionReference {
    pub id: i32,
    pub question_id: String,
    pub reference_id: i64,
    pub location_text: Option<String>,
    pub display_order: i32,
}
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct QuestionReferenceDetail {
    pub id: i32,
    pub question_id: String,
    pub reference: DocumentReference,
    pub location_text: Option<String>,
    pub display_order: i32,
    pub thai_letter: String,
}
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct QuestionDetail {
    #[serde(flatten)]
    pub question: Question,
    pub choices: Vec<QuestionChoice>,
    pub references: Vec<QuestionReferenceDetail>,
}
#[derive(serde::Deserialize)]
pub struct CreateQuestionArgs {
    pub id: Option<String>, // Allow manual ID (generated in frontend for image upload linking)
    pub document_id: String,
    pub section_id: Option<i64>,
    pub parent_id: Option<String>,
    pub content: String,
    pub is_header: bool,
    pub description: Option<String>,
    pub sequence: Option<i32>,
    pub answer_type: Option<String>,
    pub metadata: Option<String>,
    pub score: Option<i32>,
    pub question_type: Option<String>,
    pub group_score: Option<i32>,
    pub display_text: Option<String>,
    pub is_group_header: Option<bool>,
    pub is_scored: Option<bool>,
}
#[derive(serde::Deserialize)]
pub struct UpdateQuestionArgs {
    pub id: String,
    pub content: String,
    pub description: Option<String>,
    pub metadata: Option<String>,
    pub score: Option<i32>,
    pub question_type: Option<String>,
    pub group_score: Option<i32>,
    pub display_text: Option<String>,
    pub is_group_header: Option<bool>,
    pub is_scored: Option<bool>,
}
#[derive(serde::Serialize)]
pub struct DocumentHierarchy {
    pub document: Document,
    pub hierarchy: Vec<String>, // [L4 Name, L3 Name, L2 Name, L1 Name] (Ordered from Leaf to Root or vice versa, user asked for L4+L3+L2+L1)
}
#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct Section {
    pub id: i64,
    pub document_id: String,
    pub section_group: i32,
    pub section_number: i32,
    pub title_th: String,
    pub menu_label: String,
    pub display_order: i32,
    pub is_system_defined: bool,
    pub duration_value: Option<i32>,
    pub duration_unit: Option<String>,
    pub total_score: Option<i32>,
    pub created_at: String,
    pub updated_at: Option<String>,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateSectionRequest {
    pub document_id: String,
    pub section_group: i32,
    pub section_number: i32,
    pub title_th: String,
    pub menu_label: String,
}
#[derive(serde::Deserialize)]
pub struct UpdateSectionArgs {
    pub id: i64,
    pub title_th: String,
    pub menu_label: String,
    pub duration_value: Option<i32>,
    pub duration_unit: Option<String>,
    pub total_score: Option<i32>,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateReferenceRequest {
    pub code: String,
    pub title: String,
    pub category: Option<String>,
    pub classification: Option<String>,
    pub resource_type: Option<String>, // DOCUMENT, WEBLINK, VIDEO, IMAGE, AUDIO, TEMPLATE
    pub file_path: Option<String>,
    pub pqs_id: Option<String>, // Optional: PQS Document ID for folder organization
}
#[allow(dead_code)]
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SectionReference {
    pub id: i64,
    pub section_id: i64,
    pub reference_id: i64,
    pub display_order: i32,
    pub created_at: String,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SectionReferenceDetail {
    pub id: i64,
    pub section_id: i64,
    pub reference: DocumentReference,
    pub display_order: i32,
    pub thai_letter: String,
    pub usage_count: i64,
}
#[derive(serde::Deserialize)]
pub struct UpdateReferenceArgs {
    pub id: i64,
    pub code: String,
    pub title: String,
    pub category: Option<String>,
    pub classification: Option<String>,
    pub resource_type: Option<String>,
    pub file_path: Option<String>,
    pub pqs_id: Option<String>,
}
#[derive(serde::Deserialize)]
pub struct AddQuestionReferenceRequest {
    pub question_id: String,
    pub reference_id: i64,
    pub location_text: Option<String>,
}
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct OccupationBranch {
    pub code: String,
    pub name: String,
}
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct OccupationSubBranch {
    pub code: String,
    pub branch_code: String,
    pub name: String,
}
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct OccupationSubQuestion {
    pub id: i64,
    pub branch_code: String,
    pub sub_branch_code: String,
    pub code: String,
    pub text: String,
    pub always_checked: bool,
    pub sequence: i32,
}
#[derive(serde::Deserialize)]
pub struct CreateSubQuestionRequest {
    pub branch_code: String,
    pub sub_branch_code: String,
    pub code: String,
    pub text: String,
    pub always_checked: Option<bool>,
}
#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct UserProgress {
    pub id: i64,
    pub user_id: String,
    pub document_id: String,
    pub section_id: Option<i64>,
    pub earned_score: i32,
    pub max_score: i32,
    pub completion_percentage: f64,
    pub is_passed: bool,
    pub passing_score: i32,
    pub last_updated: String,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct UpsertUserProgressArgs {
    pub user_id: String,
    pub document_id: String,
    pub section_id: Option<i64>,
    pub earned_score: i32,
    pub max_score: i32,
    pub passing_score: Option<i32>,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct UpdateQuestionScoreArgs {
    pub id: String,
    pub score: i32,
    pub is_scored: bool,
    pub question_type: String,
    pub display_text: Option<String>,
}
#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct QuestionSectionLink {
    pub id: i64,
    pub question_id: String,
    pub section_id: i64,
    pub score: i32,
    pub display_order: i32,
    // Joined from Sections table (always live)
    pub section_number: i32,
    pub section_title: String,
    pub section_group: i32,
}
#[derive(serde::Deserialize)]
pub struct AddQuestionSectionLinkRequest {
    pub question_id: String,
    pub section_id: i64,
    pub score: Option<i32>,
}
#[derive(serde::Deserialize)]
pub struct BatchAddQuestionSectionLinksRequest {
    pub question_id: String,
    pub section_ids: Vec<i64>,
}
#[derive(serde::Deserialize)]
pub struct UpdateSectionLinkScoreArgs {
    pub id: i64,
    pub score: i32,
}
#[derive(Debug, serde::Serialize, Clone)]
pub struct SectionRefChild {
    pub id: String,
    pub parent_id: String,
    pub sequence: i32,
    pub content: String,
    pub score: i32,
    pub ref_section_id: i64,
    pub ref_section_number: i32,
}
#[derive(serde::Deserialize)]
pub struct AddSectionRefChildArgs {
    pub parent_id: String,
    pub document_id: String,
    pub section_id: i64,
    pub linked_section_id: i64,
    pub linked_section_number: i32,
    pub linked_section_title: String,
    pub score: Option<i32>,
}
#[derive(serde::Deserialize)]
pub struct BatchAddSectionRefChildrenArgs {
    pub parent_id: String,
    pub document_id: String,
    pub section_id: i64,
    pub sections: Vec<BatchSectionItem>,
}
#[derive(serde::Deserialize)]
pub struct BatchSectionItem {
    pub linked_section_id: i64,
    pub linked_section_number: i32,
    pub linked_section_title: String,
}
#[derive(Debug, serde::Serialize, Clone)]
pub struct RequiredCountChild {
    pub id: String,
    pub parent_id: String,
    pub sequence: i32,
    pub content: String,
    pub score: i32,
    pub is_scored: bool,
}
#[derive(serde::Deserialize)]
pub struct SyncRequiredCountArgs {
    pub parent_id: String,
    pub document_id: String,
    pub section_id: i64,
    pub desired_count: i32,
    pub score_per_instance: i32,
    pub content_override: Option<String>,
}
#[derive(serde::Deserialize)]
pub struct SaveTraineeAnswerArgs {
    pub user_id: String,
    pub question_id: String,
    pub document_id: String,
    pub sub_question_code: String,
    pub answer_text: String,
}
#[derive(serde::Deserialize)]
pub struct SaveQualifierAssessmentArgs {
    pub user_id: String,
    pub question_id: String,
    pub document_id: String,
    pub sub_question_code: String,
    pub status: String,
    pub feedback: Option<String>,
    pub qualifier_id: String,
}
#[derive(serde::Serialize, Clone)]
pub struct UserAnswer {
    pub user_id: String,
    pub question_id: String,
    pub document_id: String,
    pub sub_question_code: String,
    pub answer_text: Option<String>,
    pub status: String,
    pub feedback: Option<String>,
    pub assessed_at: Option<String>,
    pub assessed_by: Option<String>,
    pub updated_at: String,
    pub answer_key: Option<String>,
}
#[derive(Debug, Clone)]
pub struct ComputedSectionProgress {
    pub earned_score: i32,
    pub max_score: i32,
    pub completion_percentage: f64,
    pub is_passed: bool,
    pub passing_score: i32,
    pub total_questions: i32,
    pub answered_questions: i32,
    pub passed_questions: i32,
    pub pending_with_answer: i32,
    pub needs_improvement_questions: i32,
}
/// Developer verification metrics for Section
#[derive(serde::Serialize, Debug)]
pub struct DevSectionMetrics {
    pub total_questions_raw: i32,
    pub total_leaf_questions: i32,
    pub total_exempted: i32,
    pub total_required_questions: i32,
    pub total_with_answer_keys: i32,
    pub total_sub_questions: i32,
    pub total_answer_targets: i32,
    pub total_answers: i32,
    pub answers_assessed: i32,
    pub answers_passed: i32,
    pub answers_pending: i32,
    pub answers_needs_improvement: i32,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SubQuestionUsageResponse {
    pub usage_map: std::collections::HashMap<String, i64>,
    pub total_children: i64,
}
#[derive(serde::Serialize)]
pub struct AnswerKey {
    pub id: i64,
    pub question_id: String,
    pub sub_question_code: String,
    pub answer_key_text: Option<String>,
    pub is_required: bool,
    pub order_index: i32,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceAnswerKeyItem {
    pub sub_code: String,
    pub text: String,
    pub is_required: Option<bool>,
}
