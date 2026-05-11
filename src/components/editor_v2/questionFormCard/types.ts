import { QuestionReferenceDetail } from "../../../types/content";

export interface SubQuestionItem {
  code: string;
  text: string;
  alwaysChecked?: boolean;
}

export interface AnswerKeyRow {
  id: number;
  question_id: string;
  sub_question_code: string;
  answer_key_text: string | null;
  is_required: boolean;
  order_index: number;
}

export interface QuestionFormCardProps {
  prefix: string;
  level: number; // New prop to determine if L1
  sectionGroup?: 100 | 200 | 300;
  isDefaultL1?: boolean; // Flag for default L1 questions (restricted editing)
  isDefault300L2?: boolean; // Flag for default L2 questions in 300Template (lock text)
  initialContent?: string;
  initialDescription?: string;
  initialImage?: string;
  initialMetadata?: string | null; // Added initialMetadata
  initialAnswerKeys?: AnswerKeyRow[];
  initialReferences?: QuestionReferenceDetail[];
  onSave: (data: {
    content: string;
    description?: string;
    image?: string;
    id?: string;
    references?: QuestionReferenceDetail[];
    metadata?: string;
    answerKeys?: AnswerKeyRow[];
    childLayout?: "list" | "grid";
  }) => void | Promise<void>; // Added references, metadata & childLayout
  onCancel: () => void;
  documentId: string; // Added documentId
  existingId?: string; // Edit mode ID
  parentId?: string | null; // Parent question ID (for background save of new L2)
  sectionId?: number; // Added sectionId for fetching available references
  onAlert?: (message: string, type?: "warning" | "danger") => void;
  childLayout?: "list" | "grid";
  questionSequence?: number;
  parentSubQuestionList?: SubQuestionItem[];
  sectionOccupationBranches?: Record<string, { name: string; subs: Record<string, string> }>;
  sectionSelectedBranch?: { main: string; sub: string };
  // Scoring props (Section 300)
  initialScore?: number;
  initialIsScored?: boolean;
  initialQuestionType?: string;
  initialDisplayText?: string;
  initialIsGroupHeader?: boolean;
  onRefresh?: () => void; // Callback to refresh question tree after DB changes
  currentSectionNumber?: number; // For "Don't select yourself" logic in Section Picker
  usageRefreshKey?: number;
  subQUsageParentId?: string; // L1 ancestor ID for consistent SubQ usage counting across L2/L3
  isInsidePrerequisiteDoc?: boolean; // True for 3xx.1.1/3xx.1.2 and their children
}
