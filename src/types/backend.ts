/**
 * @fileoverview Shared Backend Types — mirrors Rust structs returned by Tauri commands.
 *
 * These types are the **single source of truth** on the frontend for every
 * data shape that crosses the Tauri IPC boundary.  Each interface below maps
 * 1-to-1 to a `#[derive(Serialize)]` Rust struct.  When a Rust struct changes,
 * update the corresponding interface here to keep FE↔BE in sync.
 *
 * Source files (Rust):
 * - `src-tauri/src/content_database/types.rs` → Document, Question, Section, …
 * - `src-tauri/src/auth.rs`                  → User, HighRankingOfficer
 *
 * @module types/backend
 * @see {@link file://src-tauri/src/content_database/types.rs}
 * @see {@link file://src-tauri/src/auth.rs}
 */

// ─────────────────────────────────────────────────────────────────────────────
// Auth / Users  (mirrors: auth.rs)
// ─────────────────────────────────────────────────────────────────────────────

/** Roles available in the system. */
export type UserRole = 'admin' | 'editor' | 'visitor';

/**
 * A user record as returned by the Rust backend.
 *
 * **Rust source:** `auth::User`
 *
 * Credential fields are intentionally excluded from the IPC response.
 */
export interface BackendUser {
  id: number | null;
  username: string;
  email: string;
  full_name: string;
  rank: string | null;
  role: string;
  is_active: boolean;
  avatar_path: string | null;
  avatar_updated_at: string | null;
  avatar_mime: string | null;
  avatar_size: number | null;
  created_at: string | null;
  updated_at: string | null;
  /**
   * When `true`, the UI must force a password change before allowing
   * any other action. Set for the seeded default admin.
   */
  must_change_password: boolean;
}

/**
 * A high-ranking officer record.
 *
 * **Rust source:** `auth::HighRankingOfficer`
 */
export interface BackendHighRankingOfficer {
  id: number | null;
  thai_name: string;
  position_thai: string;
  position_english: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents  (mirrors: content_database/types.rs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Arguments for creating a new PQS document.
 *
 * **Rust source:** `CreateDocumentArgs`
 */
export interface CreateDocumentArgs {
  name: string;
  /** 7-digit ID, e.g. `"2272400"` */
  unit_id: string;
  /** 5-digit code, e.g. `"22724"` */
  unit_code: string;
  applied_to: string;
  /** `"10"` or `"20"` */
  doc_type: string;
  /** `"0"`, `"1"`, or `"2"` */
  user_level: string;
}

/**
 * Owner unit in the military hierarchy.
 *
 * **Rust source:** `OwnerUnit`
 */
export interface OwnerUnit {
  unit_id: string;
  unit_name: string;
  unit_abbr: string | null;
  parent_id: string | null;
  unit_level: number | null;
}

/**
 * A PQS document record.
 *
 * **Rust source:** `Document`
 */
export interface BackendDocument {
  id: string;
  name: string;
  applied_to: string | null;
  unit_owner_id: string | null;
  unit_code: string | null;
  doc_type: string | null;
  user_level: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Update arguments for an existing document.
 *
 * **Rust source:** `UpdateDocumentArgs`
 */
export interface UpdateDocumentArgs {
  id: string;
  name: string;
  applied_to: string;
  doc_type: string;
  user_level: string;
}

/**
 * Document with its full unit hierarchy path.
 *
 * **Rust source:** `DocumentHierarchy`
 */
export interface DocumentHierarchy {
  document: BackendDocument;
  /** Ordered unit hierarchy, e.g. `[L4, L3, L2, L1]` */
  hierarchy: string[];
}

/** Aggregate statistics for all documents. **Rust source:** `DocumentStats` */
export interface DocumentStats {
  total_count: number;
  draft_count: number;
}

/**
 * Career branch assignment for a document.
 *
 * **Rust source:** `DocumentBranch`
 */
export interface DocumentBranch {
  occupation_branch_main: string | null;
  occupation_branch_sub: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sections  (mirrors: content_database/types.rs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A PQS section (100/200/300 series).
 *
 * **Rust source:** `Section`
 */
export interface BackendSection {
  id: number;
  document_id: string;
  /** 100, 200, or 300 */
  section_group: number;
  section_number: number;
  title_th: string;
  menu_label: string;
  display_order: number;
  is_system_defined: boolean;
  duration_value: number | null;
  duration_unit: string | null;
  total_score: number | null;
  created_at: string;
  updated_at: string | null;
}

/** Args to create a section. **Rust source:** `CreateSectionRequest` */
export interface CreateSectionRequest {
  document_id: string;
  section_group: number;
  section_number: number;
  title_th: string;
  menu_label: string;
}

/** Args to update a section. **Rust source:** `UpdateSectionArgs` */
export interface UpdateSectionArgs {
  id: number;
  title_th: string;
  menu_label: string;
  duration_value: number | null;
  duration_unit: string | null;
  total_score: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Questions  (mirrors: content_database/types.rs)
// ─────────────────────────────────────────────────────────────────────────────

/** Question type — determines scoring behavior. */
export type QuestionType = 'normal' | 'exempted' | 'required_instance';

/**
 * A PQS question record.
 *
 * **Rust source:** `Question`
 */
export interface BackendQuestion {
  id: string;
  document_id: string;
  section_id: number | null;
  parent_id: string | null;
  sequence: number;
  content: string;
  is_header: boolean;
  description: string | null;
  answer_type: string | null;
  /** JSON-encoded extra metadata */
  metadata: string | null;
  score: number | null;
  question_type: string | null;
  group_score: number | null;
  /** e.g. `"(ไม่ต้องปฏิบัติ)"` */
  display_text: string | null;
  is_group_header: boolean | null;
  is_scored: boolean | null;
}

/** Choice for a multiple-choice question. **Rust source:** `QuestionChoice` */
export interface BackendQuestionChoice {
  id: number;
  question_id: string;
  /** Thai letter label, e.g. `"ก."` */
  label: string | null;
  content: string;
  is_correct: boolean;
  sequence: number;
}

/**
 * A reference link attached to a question, with joined reference details.
 *
 * **Rust source:** `QuestionReferenceDetail`
 */
export interface BackendQuestionReferenceDetail {
  id: number;
  question_id: string;
  reference: BackendDocumentReference;
  location_text: string | null;
  display_order: number;
  /** Calculated Thai letter for display, e.g. `"ก."` */
  thai_letter: string;
}

/**
 * Full question with choices and references hydrated.
 *
 * **Rust source:** `QuestionDetail` (uses `#[serde(flatten)]` on `question`)
 */
export interface BackendQuestionDetail extends BackendQuestion {
  choices: BackendQuestionChoice[];
  references: BackendQuestionReferenceDetail[];
}

/** Args to create a question. **Rust source:** `CreateQuestionArgs` */
export interface CreateQuestionArgs {
  id?: string;
  document_id: string;
  section_id?: number;
  parent_id?: string;
  content: string;
  is_header: boolean;
  description?: string;
  sequence?: number;
  answer_type?: string;
  metadata?: string;
  score?: number;
  question_type?: string;
  group_score?: number;
  display_text?: string;
  is_group_header?: boolean;
  is_scored?: boolean;
}

/** Args to update a question. **Rust source:** `UpdateQuestionArgs` */
export interface UpdateQuestionArgs {
  id: string;
  content: string;
  description?: string;
  metadata?: string;
  score?: number;
  question_type?: string;
  group_score?: number;
  display_text?: string;
  is_group_header?: boolean;
  is_scored?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// References  (mirrors: content_database/types.rs)
// ─────────────────────────────────────────────────────────────────────────────

/** Resource type for a document reference. */
export type ReferenceResourceType = 'DOCUMENT' | 'WEBLINK' | 'VIDEO' | 'IMAGE' | 'AUDIO' | 'TEMPLATE';

/**
 * A PQS document reference (e.g. regulation, manual, etc.).
 *
 * **Rust source:** `DocumentReference`
 */
export interface BackendDocumentReference {
  id: number;
  code: string;
  title: string;
  category: string | null;
  classification: string | null;
  resource_type: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Args to create a reference. **Rust source:** `CreateReferenceRequest` */
export interface CreateReferenceRequest {
  code: string;
  title: string;
  category?: string;
  classification?: string;
  resource_type?: string;
  file_path?: string;
  /** Optional PQS Document ID for folder organization */
  pqs_id?: string;
}

/** Args to update a reference. **Rust source:** `UpdateReferenceArgs` */
export interface UpdateReferenceArgs {
  id: number;
  code: string;
  title: string;
  category?: string;
  classification?: string;
  resource_type?: string;
  file_path?: string;
  pqs_id?: string;
}

/**
 * Section reference with joined reference details.
 *
 * **Rust source:** `SectionReferenceDetail`
 */
export interface BackendSectionReferenceDetail {
  id: number;
  section_id: number;
  reference: BackendDocumentReference;
  display_order: number;
  thai_letter: string;
  usage_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Career Branches  (mirrors: content_database/types.rs)
// ─────────────────────────────────────────────────────────────────────────────

/** Occupation branch. **Rust source:** `OccupationBranch` */
export interface OccupationBranch {
  code: string;
  name: string;
}

/** Occupation sub-branch. **Rust source:** `OccupationSubBranch` */
export interface OccupationSubBranch {
  code: string;
  branch_code: string;
  name: string;
}

/** Occupation sub-question. **Rust source:** `OccupationSubQuestion` */
export interface OccupationSubQuestion {
  id: number;
  branch_code: string;
  sub_branch_code: string;
  code: string;
  text: string;
  always_checked: boolean;
  sequence: number;
}

/** Report for career branch conflicts. **Rust source:** `CareerBranchUsageReport` */
export interface CareerBranchUsageReport {
  has_conflict: boolean;
  affected_question_count: number;
  affected_section_groups: number[];
}

/** Report for branch usage across documents. **Rust source:** `BranchUsageReport` */
export interface BranchUsageReport {
  is_used: boolean;
  document_count: number;
  document_names: string[];
}

/** Report for career branch reset. **Rust source:** `CareerBranchResetReport` */
export interface CareerBranchResetReport {
  subq_links_deleted: number;
  answer_keys_deleted: number;
  user_answers_deleted: number;
  questions_reset: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring & Progress  (mirrors: content_database/types.rs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User progress record for a section.
 *
 * **Rust source:** `UserProgress`
 */
export interface UserProgress {
  id: number;
  user_id: string;
  document_id: string;
  section_id: number | null;
  earned_score: number;
  max_score: number;
  completion_percentage: number;
  is_passed: boolean;
  passing_score: number;
  last_updated: string;
}

/** Args to upsert user progress. **Rust source:** `UpsertUserProgressArgs` */
export interface UpsertUserProgressArgs {
  user_id: string;
  document_id: string;
  section_id?: number;
  earned_score: number;
  max_score: number;
  passing_score?: number;
}

/** SQLite portion of the simulation Clear Answers result. */
export interface ClearAnswersDatabaseResult {
  answerRowsDeleted: number;
  assessedAnswerRowsDeleted: number;
  progressRowsDeleted: number;
  referencedAttachmentPathCount: number;
  invalidAttachmentMetadataRows: number;
  committed: boolean;
}

/** Logical-path-only failure reported by managed attachment cleanup. */
export interface AttachmentCleanupFailure {
  logicalPath: string;
  message: string;
}

/** Filesystem portion of the simulation Clear Answers result. */
export interface AttachmentCleanupResult {
  logicalDirectory: string;
  dataDirectoryAvailable: boolean;
  cleanupAttempted: boolean;
  directoryFound: boolean;
  managedFilesFound: number;
  managedFilesDeleted: number;
  managedFilesRetained: number;
  managedFilesMissing: number;
  cleanupComplete: boolean;
  failures: AttachmentCleanupFailure[];
}

/** Authoritative result returned by `clear_simulation_document_answers`. */
export interface ClearAnswersResult {
  documentId: string;
  database: ClearAnswersDatabaseResult;
  attachments: AttachmentCleanupResult;
}

/** SQLite portion of one exact answer deletion result. */
export interface DeleteAnswerDatabaseResult {
  matched: boolean;
  answerRowsDeleted: number;
  answerTextWasPresent: boolean;
  wasAssessed: boolean;
  referencedAttachmentPathCount: number;
  invalidAttachmentMetadata: boolean;
  committed: boolean;
}

/** Progress recalculation result after an answer deletion commits. */
export interface ProgressRecalculationResult {
  attempted: boolean;
  sectionsUpdated: number;
  complete: boolean;
  failure: string | null;
}

/** Authoritative result returned by `delete_trainee_answer`. */
export interface DeleteAnswerResult {
  userId: string;
  documentId: string;
  questionId: string;
  subQuestionCode: string;
  database: DeleteAnswerDatabaseResult;
  progress: ProgressRecalculationResult;
  attachments: AttachmentCleanupResult;
}

/** Args to update a question score. **Rust source:** `UpdateQuestionScoreArgs` */
export interface UpdateQuestionScoreArgs {
  id: string;
  score: number;
  is_scored: boolean;
  question_type: string;
  display_text?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Links  (mirrors: content_database/types.rs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Link between a question and a section (with joined section metadata).
 *
 * **Rust source:** `QuestionSectionLink`
 */
export interface QuestionSectionLink {
  id: number;
  question_id: string;
  section_id: number;
  score: number;
  display_order: number;
  section_number: number;
  section_title: string;
  section_group: number;
}

/**
 * Section-ref child (L3 hierarchy).
 *
 * **Rust source:** `SectionRefChild`
 */
export interface SectionRefChild {
  id: string;
  parent_id: string;
  sequence: number;
  content: string;
  score: number;
  ref_section_id: number;
  ref_section_number: number;
}

/**
 * Required-count child.
 *
 * **Rust source:** `RequiredCountChild`
 */
export interface RequiredCountChild {
  id: string;
  parent_id: string;
  sequence: number;
  content: string;
  score: number;
  is_scored: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trainee Answers (Phase 5G)  (mirrors: content_database/types.rs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trainee answer record with qualifier assessment info.
 *
 * **Rust source:** `UserAnswer`
 */
export interface BackendUserAnswer {
  user_id: string;
  question_id: string;
  document_id: string;
  sub_question_code: string;
  answer_text: string | null;
  status: string;
  feedback: string | null;
  assessed_at: string | null;
  assessed_by: string | null;
  updated_at: string;
  answer_key: string | null;
  /** Phase 5G: JSON-serialized array of attachment file paths */
  attachments: string | null;
}

/** Args to save a trainee answer. **Rust source:** `SaveTraineeAnswerArgs` */
export interface SaveTraineeAnswerArgs {
  user_id: string;
  question_id: string;
  document_id: string;
  sub_question_code: string;
  answer_text: string;
  /** Phase 5G: JSON-serialized array of attachment file paths */
  attachments?: string;
}

/** Args to save a qualifier assessment. **Rust source:** `SaveQualifierAssessmentArgs` */
export interface SaveQualifierAssessmentArgs {
  user_id: string;
  question_id: string;
  document_id: string;
  sub_question_code: string;
  status: string;
  feedback?: string;
  qualifier_id: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Answer Keys  (mirrors: content_database/types.rs)
// ─────────────────────────────────────────────────────────────────────────────

/** Answer key for a question. **Rust source:** `AnswerKey` */
export interface AnswerKey {
  id: number;
  question_id: string;
  sub_question_code: string;
  answer_key_text: string | null;
  is_required: boolean;
  order_index: number;
}

/**
 * Item for batch-replacing answer keys (camelCase due to `serde(rename_all)` in Rust).
 *
 * **Rust source:** `ReplaceAnswerKeyItem`
 */
export interface ReplaceAnswerKeyItem {
  subCode: string;
  text: string;
  isRequired?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Developer Metrics  (mirrors: content_database/types.rs)
// ─────────────────────────────────────────────────────────────────────────────

/** Developer verification metrics for a section. **Rust source:** `DevSectionMetrics` */
export interface DevSectionMetrics {
  total_questions_raw: number;
  total_leaf_questions: number;
  total_exempted: number;
  total_required_questions: number;
  total_with_answer_keys: number;
  total_sub_questions: number;
  total_answer_targets: number;
  total_answers: number;
  answers_assessed: number;
  answers_passed: number;
  answers_pending: number;
  answers_needs_improvement: number;
}

/** Sub-question usage response. **Rust source:** `SubQuestionUsageResponse` */
export interface SubQuestionUsageResponse {
  usage_map: Record<string, number>;
  total_children: number;
}
