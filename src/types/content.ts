/**
 * @fileoverview Frontend-specific content types for PQS documents.
 *
 * These types are used by React components for rendering question trees,
 * answer forms, and reference displays. They may differ slightly from the
 * backend types in `backend.ts` (e.g. `section_id` is `number | null` here
 * but `i64` in Rust).
 *
 * @module types/content
 */

/**
 * A PQS question as stored in the database.
 *
 * @see BackendQuestion in `backend.ts` for the exact Rust mirror.
 */
export interface Question {
  id: string;
  document_id: string;
  section_id: number | null;
  parent_id: string | null;
  sequence: number;
  content: string;
  is_header: boolean;
  description: string | null;
  /** `'text'` | `'choice'` | `'none'` */
  answer_type: string | null;
  metadata: string | null;
  score: number | null;
  /** `'normal'` | `'performance'` | `'exempted'` */
  question_type: string | null;
  group_score: number | null;
  /** e.g. `"(ไม่ต้องปฏิบัติ)"` */
  display_text: string | null;
  is_group_header: boolean | null;
  is_scored: boolean | null;
}

/** A choice option for a multiple-choice question. */
export interface QuestionChoice {
  id: number;
  question_id: string;
  label: string | null;
  content: string;
  is_correct: boolean;
  sequence: number;
}

/** A link between a question and a document reference. */
export interface QuestionReference {
  id: number;
  question_id: string;
  reference_id: number;
  /** Page/section location text, e.g. `"35"` */
  location_text: string | null;
  display_order: number;
}

/**
 * Fully hydrated question with children, choices, and references
 * for recursive frontend rendering.
 */
export interface QuestionDetail extends Question {
  choices: QuestionChoice[];
  references: QuestionReferenceDetail[];
  /** Child questions for recursive rendering. */
  children?: QuestionDetail[];
}

/** Question reference with joined reference details. */
export interface QuestionReferenceDetail extends QuestionReference {
  reference: {
    id: number;
    code: string;
    title: string;
    category: string | null;
    classification: string | null;
    resource_type: string | null;
    file_path: string | null;
  };
  /** Calculated Thai letter for display, e.g. `"ก."` */
  thai_letter: string;
}

/** A user's answer to a question (frontend representation). */
export interface UserAnswer {
  id: number;
  user_id: string;
  question_id: string;
  document_id: string;
  answer_value: string | null;
  is_verified: boolean;
  verified_by: string | null;
  updated_at: string;
}

/** Section reference with joined reference details and usage info. */
export interface SectionReferenceDetail {
  id: number;
  section_id: number;
  reference: {
    id: number;
    code: string;
    title: string;
    category: string | null;
    classification: string | null;
    resource_type: string | null;
    file_path: string | null;
  };
  display_order: number;
  /** Calculated Thai letter for display, e.g. `"ก."` */
  thai_letter: string;
  /** How many questions reference this in the section. */
  usage_count: number;
}

