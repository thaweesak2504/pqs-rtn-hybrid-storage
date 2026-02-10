
export interface Question {
  id: string;
  document_id: string;
  section_id: number | null;
  parent_id: string | null;
  sequence: number;
  content: string;
  is_header: boolean;
  description: string | null;
  answer_type: string | null; // 'text', 'choice', 'none'
  metadata: string | null;
}

export interface QuestionChoice {
  id: number;
  question_id: string;
  label: string | null;
  content: string;
  is_correct: boolean;
  sequence: number;
}

export interface QuestionReference {
  id: number;
  question_id: string;
  reference_id: number;
  location_text: string | null; // e.g. "35"
  display_order: number;
}

// Full hydrated object for frontend
export interface QuestionDetail extends Question {
  choices: QuestionChoice[];
  references: QuestionReferenceDetail[];
  children?: QuestionDetail[]; // For recursive rendering
}

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
  thai_letter: string; // Calculated field for display (ก., ข.)
}

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
