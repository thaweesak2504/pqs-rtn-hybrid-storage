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
  level: number;
  sectionGroup?: 100 | 200 | 300;
  isDefaultL1?: boolean;
  isDefault300L2?: boolean;
  initialContent?: string;
  initialDescription?: string;
  initialImage?: string;
  initialMetadata?: string | null;
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
  }) => void | Promise<void>;
  onCancel: () => void;
  documentId: string;
  existingId?: string;
  parentId?: string | null;
  sectionId?: number;
  onAlert?: (message: string, type?: "warning" | "danger") => void;
  childLayout?: "list" | "grid";
  questionSequence?: number;
  parentSubQuestionList?: SubQuestionItem[];
  sectionOccupationBranches?: Record<string, { name: string; subs: Record<string, string> }>;
  sectionSelectedBranch?: { main: string; sub: string };
  initialScore?: number;
  initialIsScored?: boolean;
  initialQuestionType?: string;
  initialDisplayText?: string;
  initialIsGroupHeader?: boolean;
  onRefresh?: () => void;
  currentSectionNumber?: number;
  usageRefreshKey?: number;
  subQUsageParentId?: string;
}

export interface SectionItem {
  id: number;
  section_number: number;
  title_th: string;
  menu_label: string;
}

export interface SectionRefChild {
  id: string;
  parent_id: string;
  sequence: number;
  content: string;
  score: number;
  ref_section_id: number;
  ref_section_number: number;
}

export interface RequiredCountChild {
  id: string;
  parent_id: string;
  sequence: number;
  content: string;
  score: number;
  is_scored: boolean;
}

export interface DbBranch {
  code: string;
  name: string;
}

export interface DbSubBranch {
  code: string;
  branch_code: string;
  name: string;
}

export interface DbSubQuestion {
  id: number;
  branch_code: string;
  sub_branch_code: string;
  code: string;
  text: string;
  always_checked: boolean;
  sequence: number;
}

export interface SubQuestionUsageResponse {
  usage_map: Record<string, number>;
  total_children: number;
}

export const EMPTY_REFS: QuestionReferenceDetail[] = [];
export const REFERENCE_PAGE_ALLOWED_CHARS = /^[0-9-]*$/;
export const REFERENCE_PAGE_VALID_FORMAT = /^(?:\d+|\d+-\d+)$/;
export const REFERENCE_PAGE_ERROR_MESSAGE = "รูปแบบเลขหน้าไม่ถูกต้อง: ใช้เลขอารบิก และ - เท่านั้น เช่น 5 หรือ 2-56 ฯ";

export const DEFAULT_L1_DESC_BY_SEQ: Record<number, string> = {
  2: 'จงแสดงการตรวจสอบและการเตรียมความพร้อมก่อนการใช้งาน ตามรายการที่กำหนด',
  3: 'จงปฏิบัติหน้าที่ในตำแหน่ง ตามหัวข้อที่กำหนด',
  4: 'จงตรวจสอบ แก้ไข และปรนนิบัติบำรุง ตามรายการที่กำหนด',
  5: 'จงปฏิบัติงานในกรณีที่มีความขัดข้องของระบบและอุปกรณ์ ตามรายการที่กำหนด',
  6: 'จงระบุตำแหน่งและส่วนประกอบที่สำคัญของอุปกรณ์ ตามรายการที่กำหนด',
};
