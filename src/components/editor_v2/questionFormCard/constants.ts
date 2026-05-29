import { QuestionReferenceDetail } from "../../../types/content";

export const EMPTY_REFS: QuestionReferenceDetail[] = [];
export const REFERENCE_PAGE_ALLOWED_CHARS = /^[0-9-]*$/;
export const REFERENCE_PAGE_VALID_FORMAT = /^(?:\d+|\d+-\d+)$/;
export const REFERENCE_PAGE_ERROR_MESSAGE = "รูปแบบเลขหน้าไม่ถูกต้อง: ใช้เลขอารบิก และ - เท่านั้น เช่น 5 หรือ 2-56 ฯ";
