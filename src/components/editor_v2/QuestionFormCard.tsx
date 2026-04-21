import { open as openDialog } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/tauri";
import {
    CheckCircle,
    ChevronDown,
    ChevronRight,
    FileDigit,
    FileText,
    Globe,
    GripVertical,
    ImageIcon,
    ListChecks,
    Lock as LockIcon,
    Mic,
    Plus,
    Save,
    Shield,
    Trash2,
    Video,
    X
} from "lucide-react";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { QuestionReferenceDetail, SectionReferenceDetail } from "../../types/content";
import {
    DEFAULT_L1_DESC_BY_SEQ,
    convertThaiToArabic,
    toThaiAlphabet
} from "../../utils/thaiNumbering";
import ConfirmModal from "../modals/ConfirmModal";
import Button from "../ui/Button";
import Tooltip from "../ui/Tooltip";
import AnswerKeyEditor from "./AnswerKeyEditor";
import AsyncImagePreview from "./AsyncImagePreview";
import { logger } from '../../utils/logger';

// ============ Types ============
interface SubQuestionItem {
  code: string;
  text: string;
  alwaysChecked?: boolean;
}

// ============ QuestionFormCard ============

interface QuestionFormCardProps {
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
}

interface AnswerKeyRow {
  id: number;
  question_id: string;
  sub_question_code: string;
  answer_key_text: string | null;
  is_required: boolean;
  order_index: number;
}

const EMPTY_REFS: QuestionReferenceDetail[] = [];
const REFERENCE_PAGE_ALLOWED_CHARS = /^[0-9-]*$/;
const REFERENCE_PAGE_VALID_FORMAT = /^(?:\d+|\d+-\d+)$/;
const REFERENCE_PAGE_ERROR_MESSAGE = "รูปแบบเลขหน้าไม่ถูกต้อง: ใช้เลขอารบิก และ - เท่านั้น เช่น 5 หรือ 2-56 ฯ";


const QuestionFormCard: React.FC<QuestionFormCardProps> = ({
  prefix,
  level,
  sectionGroup = 100,
  isDefaultL1 = false,
  isDefault300L2 = false,
  initialContent = "",
  initialDescription = "",
  initialImage = "",
  initialMetadata = null,
  initialReferences = EMPTY_REFS,
  onSave,
  onCancel,
  documentId,
  existingId,
  parentId,
  sectionId,
  onAlert,
  childLayout: initialChildLayout = "list",
  questionSequence,
  parentSubQuestionList,
  sectionOccupationBranches,
  sectionSelectedBranch,
  initialScore = 0,
  initialIsScored = false,
  initialQuestionType = 'normal',
  initialDisplayText = '',
  initialIsGroupHeader = false,
  onRefresh,
  currentSectionNumber,
  usageRefreshKey = 0,
  subQUsageParentId,
}) => {
  const is200 = sectionGroup === 200;
  const is300 = sectionGroup === 300;
  const is200or300 = is200 || is300;
  const isL1 = level === 0;
  const isEdit = !!existingId;

  // Parse initialMetadata ONCE — all derived state initializers below use this
  const parsedInitialMeta = useMemo(() => {
    if (!initialMetadata) return null;
    try { return JSON.parse(initialMetadata); } catch { return null; }
  }, [initialMetadata]);

  // Special question type detection for Section 300
  const isPrerequisiteQuestion = is300 && questionSequence && isL1 && questionSequence === 1; // 3xx.1 only
  // We need to know if its parent is 3xx.1. Check prefix for both Thai (๑) and Arabic (1) numerals.
  const isChildOf1 = prefix.includes('.๑.') || prefix.includes('.1.');
  const isChildOf7 = prefix.includes('.๗.') || prefix.includes('.7.');
  const isPrerequisiteChild = is300 && !isL1 && questionSequence !== undefined && questionSequence >= 1 && questionSequence <= 2 && isChildOf1; // 3xx.1.1-3xx.1.2
  const isSection300Selector = is300 && !isL1 && questionSequence === 3 && isChildOf1; // 3xx.1.3 → select 300Sections (no score)
  const isSection100Selector = is300 && !isL1 && questionSequence === 4 && isChildOf1; // 3xx.1.4 → select 100Sections
  const isSection200Selector = is300 && !isL1 && questionSequence === 5 && isChildOf1; // 3xx.1.5 → select 200Sections
  const isExamChild = is300 && !isL1 && isChildOf7; // 3xx.7.1, 3xx.7.2 → no scoring controls
  // 3xx.6 L1 = required count practice (has scoring, no exempted, auto-creates L2 children)
  const is306L1 = is300 && isL1 && questionSequence === 6;
  // 3xx.7 L1 = up to command decision → no exempted/scoring
  const isFixedPracticeL1 = is300 && isL1 && questionSequence !== undefined && questionSequence >= 7;
  const isDefaultDescL1 = is300 && isL1 && questionSequence !== undefined && questionSequence >= 2 && questionSequence <= 6;
  const isExemptableL1_200 = is200 && isL1;
  // 2xx.2 = ส่วนประกอบ, 2xx.4 = ค่าทำงาน — exempted toggle with default description when not exempted
  const isDefaultDescL1_200 = isExemptableL1_200 && (questionSequence === 2 || questionSequence === 4);
  // Auto-created children (required_instance) → score-only edit form
  const isRequiredInstance = is300 && initialQuestionType === 'required_instance';
  // L2 children of 3xx.2-3xx.6 → can have required_count (จำนวนครั้ง) L3 children
  const isPerformanceL2 = is300 && level === 1 && !isPrerequisiteChild && !isSection300Selector && !isSection100Selector && !isSection200Selector && !isExamChild;

  // Accent colors for sub-question theming (orange/amber for 200, purple for 300)
  const sqClr = is300 ? {
    border: 'border-purple-200 dark:border-purple-800/50', bg: 'bg-purple-50/50 dark:bg-purple-950/20',
    text: 'text-purple-600 dark:text-purple-400', textBold: 'text-purple-700 dark:text-purple-300',
    textDim: 'text-purple-600/70 dark:text-purple-400/50', count: 'text-purple-500',
    toggle: 'peer-checked:bg-purple-500', btn: 'bg-purple-500 text-white hover:bg-purple-600',
    editBtn: 'border-purple-200 dark:border-purple-700 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/30',
    addBtn: 'border-purple-300 dark:border-purple-700 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200',
    inputBd: 'border-purple-300 dark:border-purple-700 focus:ring-1 focus:ring-purple-400',
    selectBd: 'border-purple-200 dark:border-purple-800 focus:ring-1 focus:ring-purple-400',
    code: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800',
    itemBd: 'border-purple-100 dark:border-purple-900/30', itemText: 'text-purple-600 dark:text-purple-400',
    activeBg: 'bg-purple-50 dark:bg-purple-900/20', check: 'accent-purple-600 border-purple-400 text-purple-600 focus:ring-purple-500',
    activeAll: 'border-purple-500 bg-purple-500 text-white',
    bindWrap: 'border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/20',
  } : {
    border: 'border-orange-200 dark:border-orange-800/50', bg: 'bg-orange-50/50 dark:bg-orange-950/20',
    text: 'text-orange-600 dark:text-orange-400', textBold: 'text-orange-700 dark:text-orange-300',
    textDim: 'text-orange-600/70 dark:text-orange-400/50', count: 'text-orange-500',
    toggle: 'peer-checked:bg-orange-500', btn: 'bg-orange-500 text-white hover:bg-orange-600',
    editBtn: 'border-orange-200 dark:border-orange-700 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30',
    addBtn: 'border-orange-300 dark:border-orange-700 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200',
    inputBd: 'border-orange-300 dark:border-orange-700 focus:ring-1 focus:ring-orange-400',
    selectBd: 'border-orange-200 dark:border-orange-800 focus:ring-1 focus:ring-orange-400',
    code: 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800',
    itemBd: 'border-orange-100 dark:border-orange-900/30', itemText: 'text-orange-600 dark:text-orange-400',
    activeBg: 'bg-amber-50 dark:bg-amber-900/20', check: 'accent-amber-600 border-amber-400 text-amber-600 focus:ring-amber-500',
    activeAll: 'border-amber-500 bg-amber-500 text-white',
    bindWrap: 'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20',
  };
  const [content, setContent] = useState(initialContent);
  const [description, setDescription] = useState(initialDescription);
  const [showDescription, setShowDescription] = useState(() => {
    // Don't show description when already exempted in DB
    if (initialQuestionType === 'exempted') return false;

    // Auto-show description for 3xx.1 prerequisite questions and 3xx.1.3/1.4/1.5 section selectors
    if (isPrerequisiteQuestion) return true;
    if (isSection300Selector || isSection100Selector || isSection200Selector) return true;
    // Auto-show description for 3xx.2-3xx.6 L1 questions
    if (isDefaultDescL1) return true;
    // Auto-show description for 2xx.2, 2xx.4 when not exempted
    if (isDefaultDescL1_200) return true;
    return !!initialDescription;
  });

  // Auto-set default description for 3xx.1, 3xx.1.4/1.5, and 3xx.2-3xx.6 L1
  // Force-overwrite on mount so description always matches the locked constant in code
  useEffect(() => {
    if (isPrerequisiteQuestion) {
      setDescription("เพื่อให้การทดสอบตาม มาตรฐานกำลังพลเกิดประโยชน์สูงสุดและสำเร็จตามวัตถุประสงค์ ผู้เข้ารับการทดสอบต้องมีคุณสมบัติ ดังต่อไปนี้");
    } else if (isSection300Selector) {
      setDescription("การปฏิบัติหน้าที่ในตำแหน่งนี้ ต้องผ่าน การปฏิบัติหน้าที่ ที่กำหนด ดังนี้");
    } else if (isSection100Selector) {
      setDescription("การปฏิบัติหน้าที่ในตำแหน่งนี้ ต้องผ่าน การทดสอบความรู้พื้นฐาน ที่กำหนด ดังนี้");
    } else if (isSection200Selector) {
      setDescription("การปฏิบัติหน้าที่ในตำแหน่งนี้ ต้องผ่าน การทดสอบระบบ ที่กำหนด ดังนี้");
    } else if (isDefaultDescL1 && questionSequence !== undefined) {
      setDescription(DEFAULT_L1_DESC_BY_SEQ[questionSequence] || '');
    } else if (isDefaultDescL1_200 && questionSequence !== undefined) {
      // Default description for 2xx.2 and 2xx.4 when not exempted (shown when toggle is off)
      const DEFAULT_200_DESC: Record<number, string> = {
        2: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคำถามที่กำหนด',
        4: 'จงอธิบายค่าทำงานปกติ ค่าสูงสุด ต่ำสุด ของการทำงาน ตามรายการที่กำหนด',
      };
      setDescription(DEFAULT_200_DESC[questionSequence] || '');
    }

  }, [isPrerequisiteQuestion, isSection300Selector, isSection100Selector, isSection200Selector, isDefaultDescL1, isDefaultDescL1_200, questionSequence]);

  const [imagePath, setImagePath] = useState<string | null>(initialImage || null);
  const [currentChildLayout, setCurrentChildLayout] = useState<"list" | "grid">(initialChildLayout);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [isBackgroundSaved, setIsBackgroundSaved] = useState(false);

  // Image operation state - defer upload/delete until Save
  const [pendingImageUpload, setPendingImageUpload] = useState<string | null>(null); // source file path
  const [pendingImageDelete, setPendingImageDelete] = useState<boolean>(false);
  const [originalImagePath] = useState<string | null>(initialImage || null); // for rollback on cancel

  // ---- Score Editor State (Section 300 only) ----
  const [formScoreIsScored, setFormScoreIsScored] = useState<boolean>(initialIsScored);
  const [formScoreValue, setFormScoreValue] = useState<string>(initialScore.toString());
  // Use DB value directly — backend seeds 3xx.1.1-3xx.1.5 as 'exempted' from creation
  const [formScoreType, setFormScoreType] = useState<string>(initialQuestionType);
  const [formScoreDisplayText, setFormScoreDisplayText] = useState<string>(initialDisplayText || '');

  // ---- Section Selector State (for 3xx.1.4 and 3xx.1.5) ----
  // NEW: Link-based approach using QuestionSectionLinks table (no content copying, no sync needed)
  interface SectionItem { id: number; section_number: number; title_th: string; menu_label: string; }
  interface SectionRefChild { id: string; parent_id: string; sequence: number; content: string; score: number; ref_section_id: number; ref_section_number: number; }
  const [availableSections, setAvailableSections] = useState<SectionItem[]>([]);
  const [sectionRefChildren, setSectionRefChildren] = useState<SectionRefChild[]>([]);
  // Section IDs that already reference this section (back-refs → would create circular dependency)
  const [backRefSectionIds, setBackRefSectionIds] = useState<Set<number>>(new Set());
  // Fetch available sections (master data from Sections table)
  useEffect(() => {
    if (!(isSection300Selector || isSection100Selector || isSection200Selector) || !documentId) return;
    const targetGroup = isSection100Selector ? 100 : isSection200Selector ? 200 : 300;
    invoke<{ id: number; document_id: string; section_group: number; section_number: number; title_th: string; menu_label: string; display_order: number; is_system_defined: number; duration_value: number | null; duration_unit: string | null; total_score: number | null; created_at: string; updated_at: string; }[]>('get_sections_by_document', { documentId })
      .then(sections => {
        const filtered = sections
          .filter(s => s.section_group === targetGroup)
          .map(s => ({ id: s.id, section_number: s.section_number, title_th: s.title_th, menu_label: s.menu_label }));
        setAvailableSections(filtered);
      })
      .catch(() => setAvailableSections([]));
  }, [isSection100Selector, isSection200Selector, isSection300Selector, documentId]);

  // Fetch sections that already reference this section (for circular dependency prevention)
  useEffect(() => {
    if (!(isSection300Selector || isSection100Selector || isSection200Selector) || !sectionId) return;
    invoke<number[]>('get_back_referencing_section_ids', { sectionId })
      .then(ids => setBackRefSectionIds(new Set(ids)))
      .catch(() => setBackRefSectionIds(new Set()));
  }, [isSection100Selector, isSection200Selector, isSection300Selector, sectionId]);

  // Fetch existing L3 section-ref children (real Questions with question_type='section_ref')
  const fetchSectionRefChildren = useCallback(async () => {
    if (!(isSection300Selector || isSection100Selector || isSection200Selector) || !existingId) { setSectionRefChildren([]); return; }
    try {
      const children = await invoke<SectionRefChild[]>('get_section_ref_children', { parentId: existingId });
      setSectionRefChildren(children);
    } catch { setSectionRefChildren([]); }
  }, [isSection100Selector, isSection200Selector, isSection300Selector, existingId]);
  useEffect(() => { fetchSectionRefChildren(); }, [fetchSectionRefChildren]);

  // ---- Required Count State (for L2 children of 3xx.2-3xx.6, and for 3xx.6 L1 itself) ----
  interface RequiredCountChild { id: string; parent_id: string; sequence: number; content: string; score: number; is_scored: boolean; }
  const [requiredCountChildren, setRequiredCountChildren] = useState<RequiredCountChild[]>([]);
  const [requiredCount, setRequiredCount] = useState<number>(0);
  const [scorePerInstance, setScorePerInstance] = useState<number>(initialScore);
  // Dynamic group header flag — may be reverted when L3 children are all deleted
  const [effectiveIsGroupHeader, setEffectiveIsGroupHeader] = useState<boolean>(initialIsGroupHeader);

  // Track if this question has actual children in the database (for Exempted warning)
  const [hasActualChildren, setHasActualChildren] = useState<boolean>(false);

  useEffect(() => {
    if (existingId) {
      invoke<boolean>('check_has_children', { parentId: existingId })
        .then(hasChildren => {
          setHasActualChildren(hasChildren);
          // If has children but initialIsGroupHeader is false, update effectiveIsGroupHeader
          if (hasChildren && !initialIsGroupHeader) {
            setEffectiveIsGroupHeader(true);
          }
        })
        .catch(err => logger.error("Failed to check children count:", err));
    }
  }, [existingId, initialIsGroupHeader]);

  const fetchRequiredCountChildren = useCallback(async () => {
    if ((!isPerformanceL2 && !is306L1) || !existingId) { setRequiredCountChildren([]); return; }
    try {
      const children = await invoke<RequiredCountChild[]>('get_required_count_children', { parentId: existingId });
      setRequiredCountChildren(children);
      setRequiredCount(children.length);
      if (children.length > 0) {
        setScorePerInstance(children[0].score);
        setEffectiveIsGroupHeader(true);
      } else {
        // No children but was group_header → stale state, revert
        if (!is306L1) setEffectiveIsGroupHeader(false);
      }
    } catch { setRequiredCountChildren([]); }
  }, [isPerformanceL2, is306L1, existingId]);
  useEffect(() => { fetchRequiredCountChildren(); }, [fetchRequiredCountChildren]);


  // Update question score when formScoreType changes for prerequisite children (3xx.1.1-1.3)
  const prereqChildMountRef = useRef(true);
  useEffect(() => {
    if (prereqChildMountRef.current) { prereqChildMountRef.current = false; return; }
    if (isPrerequisiteChild && existingId) {
      const updateScore = async () => {
        try {
          await invoke('update_question_score', {
            args: {
              id: existingId,
              score: 0,
              is_scored: false,
              question_type: formScoreType,
              display_text: formScoreType === 'exempted' ? '(ไม่ต้องปฏิบัติ)' : ''
            }
          });
        } catch (error) {
          logger.error("Failed to update question score:", error);
        }
      };
      updateScore();
    }
  }, [isPrerequisiteChild, existingId, formScoreType]);

  // Update question score when formScoreType changes for section selectors (3xx.1.4/1.5)
  // NOTE: Do NOT call onRefresh/onQuestionsUpdated here — that causes infinite loop
  // (fetchQuestions → setLoading → tree unmount → form remount → useEffect fires again)
  // Tree refresh + total score update happen on Save via handleSave → onSave → handleUpdate
  const sectionSelectorMountRef = useRef(true);
  useEffect(() => {
    if ((isSection300Selector || isSection100Selector || isSection200Selector) && existingId) {
      if (sectionSelectorMountRef.current) {
        sectionSelectorMountRef.current = false;
        return; // Skip initial mount — score is already saved in DB
      }
      const updateScore = async () => {
        try {
          await invoke('update_question_score', {
            args: {
              id: existingId,
              score: 0,
              is_scored: false,
              question_type: formScoreType,
              display_text: formScoreType === 'exempted' ? '(ไม่ต้องปฏิบัติ)' : ''
            }
          });
          // When switching to exempted: clear all section-ref children and refresh local list
          if (formScoreType === 'exempted') {
            await invoke('remove_all_section_ref_children', { parentId: existingId });
            fetchSectionRefChildren();
          }
        } catch (error) {
          logger.error("Failed to update question score:", error);
        }
      };
      updateScore();
      // Toggle description visibility based on exempted status
      if (formScoreType === 'exempted') {
        setShowDescription(false);
      } else {
        setShowDescription(true);
      }
    }
  }, [isSection300Selector, isSection100Selector, isSection200Selector, existingId, formScoreType, fetchSectionRefChildren]);

  // ---- SubQuestionList Editor State (for L1 headers 2xx.2, 2xx.4, 3xx.2-3xx.5) ----
  // Base condition for showing sub-question editor
  // NOTE: 3xx.1.3/1.4/1.5 are section selectors (children of 3xx.1), NOT sub-question editors
  const baseShowSubQuestionEditor = level === 0 && (
    (is200 && (questionSequence === 2 || questionSequence === 4)) ||
    (is300 && questionSequence && questionSequence >= 2 && questionSequence <= 5)
  );

  // Disable for exempted prerequisite questions, exempted 2xx.2/2xx.4, or exempted 3xx.2-5
  const [showSubQuestionEditor, setShowSubQuestionEditor] = useState(() =>
    baseShowSubQuestionEditor
    && !(isPrerequisiteQuestion && formScoreType === 'exempted')
    && !(isPrerequisiteChild && formScoreType === 'exempted')
    && !(isDefaultDescL1_200 && formScoreType === 'exempted')
    && !(isDefaultDescL1 && formScoreType === 'exempted')
  );

  // Re-evaluate when formScoreType changes
  useEffect(() => {
    setShowSubQuestionEditor(
      baseShowSubQuestionEditor
      && !(isPrerequisiteQuestion && formScoreType === 'exempted')
      && !(isPrerequisiteChild && formScoreType === 'exempted')
      && !(isDefaultDescL1_200 && formScoreType === 'exempted')
      && !(isDefaultDescL1 && formScoreType === 'exempted')
    );
  }, [baseShowSubQuestionEditor, isPrerequisiteQuestion, isPrerequisiteChild, isDefaultDescL1_200, isDefaultDescL1, formScoreType]);
  const [useSubQuestions, setUseSubQuestions] = useState<boolean>(() => {
    return parsedInitialMeta?.useSubQuestions === true;
  });

  // Reset useSubQuestions when formScoreType becomes exempted
  useEffect(() => {
    if (formScoreType === 'exempted') {
      setUseSubQuestions(false);
    }
  }, [formScoreType]);

  // L1 with useSubQuestions enabled = Group Header (auto-calc mode)
  // This handles both: toggle ON in editor AND re-mount from saved metadata
  useEffect(() => {
    if (isL1 && useSubQuestions) {
      setEffectiveIsGroupHeader(true);
      setFormScoreIsScored(false);
    }
  }, [isL1, useSubQuestions]);

  // L2 Performance with requiredCount > 0 = Group Header (auto-calc from L3 instances)
  useEffect(() => {
    if (isPerformanceL2) {
      if (requiredCount > 0) {
        setEffectiveIsGroupHeader(true);
        setFormScoreIsScored(false);
      } else {
        // requiredCount = 0 means L2 is a leaf node (no L3 children)
        setEffectiveIsGroupHeader(false);
        setFormScoreIsScored(true);
      }
    }
  }, [isPerformanceL2, requiredCount]);

  // DB-backed occupation branches state
  interface DbBranch { code: string; name: string; }
  interface DbSubBranch { code: string; branch_code: string; name: string; }
  interface DbSubQuestion { id: number; branch_code: string; sub_branch_code: string; code: string; text: string; always_checked: boolean; sequence: number; }
  const [dbBranches, setDbBranches] = useState<DbBranch[]>([]);
  const [dbSubBranches, setDbSubBranches] = useState<DbSubBranch[]>([]);
  const [dbSubQuestions, setDbSubQuestions] = useState<DbSubQuestion[]>([]);

  // Keep legacy subQuestionList for backward compat display only
  const [subQuestionList, setSubQuestionList] = useState<SubQuestionItem[]>(() => {
    return Array.isArray(parsedInitialMeta?.subQuestionList) ? parsedInitialMeta.subQuestionList : [];
  });

  const [selMainBranch, setSelMainBranch] = useState<string>(() => {
    if (sectionSelectedBranch) return sectionSelectedBranch.main;
    return parsedInitialMeta?.selectedBranch?.main || "";
  });
  const [selSubBranch, setSelSubBranch] = useState<string>(() => {
    if (sectionSelectedBranch) return sectionSelectedBranch.sub;
    return parsedInitialMeta?.selectedBranch?.sub || "";
  });
  const [activeSubQCodes, setActiveSubQCodes] = useState<string[]>(() => {
    return Array.isArray(parsedInitialMeta?.activeSubQuestions) ? parsedInitialMeta.activeSubQuestions : [];
  });
  const [selectedSubQCodes, setSelectedSubQCodes] = useState<string[]>(() => {
    const saved: string[] = Array.isArray(parsedInitialMeta?.selectedSubQuestions) ? parsedInitialMeta.selectedSubQuestions : [];
    // For 300Template: auto-include alwaysChecked items from parentSubQuestionList
    const alwaysCodes = (sectionGroup === 300 && parentSubQuestionList)
      ? parentSubQuestionList.filter(sq => sq.alwaysChecked).map(sq => sq.code)
      : [];
    return Array.from(new Set([...saved, ...alwaysCodes]));
  });
  // Sync children for required count (L2→L3 for isPerformanceL2, L1→L2 for is306L1)
  const handleSyncRequiredCount = useCallback(async () => {
    if (is306L1) {
      // 3xx.6 L1: sync L2 children using description as content
      if (!sectionId || !existingId) return;
      try {
        const children = await invoke<RequiredCountChild[]>('sync_required_count_children', {
          args: {
            parent_id: existingId,
            document_id: documentId,
            section_id: sectionId,
            desired_count: requiredCount,
            score_per_instance: scorePerInstance,
            content_override: description || content.trim(),
          }
        });
        setRequiredCountChildren(children);
        if (children.length > 0) setEffectiveIsGroupHeader(true);
      } catch (err) {
        logger.error('Failed to sync 306 L2 children:', err);
      }
      return;
    }

    // CRITICAL: abort if no parentId - would create root-level L1 instead of L2
    if (!isPerformanceL2 || !sectionId || (!existingId && !generatedId && !parentId)) return;

    // Build current metadata from form state (sub-questions will be copied to L3)
    const syncMeta: Record<string, any> = {};
    if (useSubQuestions) {
      syncMeta.useSubQuestions = true;
      if (selMainBranch) syncMeta.selectedBranch = { main: selMainBranch, sub: selSubBranch };
      if (activeSubQCodes.length > 0) syncMeta.activeSubQuestions = activeSubQCodes;
    }
    if (selectedSubQCodes.length > 0) syncMeta.selectedSubQuestions = selectedSubQCodes;
    const syncMetaStr = Object.keys(syncMeta).length > 0 ? JSON.stringify(syncMeta) : null;

    let questionId = existingId || generatedId;

    // Background save L2 if not yet created in DB
    if (!questionId) {
      questionId = crypto.randomUUID();
      setGeneratedId(questionId);
      try {
        await invoke<string>('create_question', {
          args: {
            id: questionId,
            document_id: documentId,
            section_id: sectionId,
            parent_id: parentId || null,
            content: content.trim() || '(รอบันทึก)',
            description: null,
            is_header: false,
            sequence: null,
            answer_type: 'text',
            metadata: syncMetaStr,
          }
        });
        setIsBackgroundSaved(true);
      } catch (err) {
        logger.error('Failed to background save L2:', err);
        return;
      }
    } else {
      // Existing L2: update metadata so backend sync picks up latest sub-questions
      try {
        await invoke('update_question', {
          args: { id: questionId, content: content.trim() || '(รอบันทึก)', description: null, metadata: syncMetaStr }
        });
      } catch (err) {
        logger.error('Failed to update L2 metadata before sync:', err);
      }
    }

    // Sync L3 children (DO NOT call onRefresh here - it unmounts the form!)
    try {
      const children = await invoke<RequiredCountChild[]>('sync_required_count_children', {
        args: {
          parent_id: questionId,
          document_id: documentId,
          section_id: sectionId,
          desired_count: requiredCount,
          score_per_instance: scorePerInstance,
        }
      });
      setRequiredCountChildren(children);
    } catch (err) {
      logger.error('Failed to sync required count children:', err);
    }
  }, [is306L1, isPerformanceL2, existingId, generatedId, sectionId, documentId, parentId, content, description, requiredCount, scorePerInstance, useSubQuestions, selMainBranch, selSubBranch, activeSubQCodes, selectedSubQCodes]);

  // Fetch branches from DB on mount (both normal and 2xx.4)
  useEffect(() => {
    if (!showSubQuestionEditor) return;
    invoke<DbBranch[]>('get_occupation_branches').then(setDbBranches).catch(logger.error);
  }, [showSubQuestionEditor]);

  // Fetch sub-branches when main branch changes (both normal and 2xx.4)
  useEffect(() => {
    if (!showSubQuestionEditor || !selMainBranch) { setDbSubBranches([]); return; }
    invoke<DbSubBranch[]>('get_occupation_sub_branches', { branchCode: selMainBranch }).then(setDbSubBranches).catch(logger.error);
  }, [showSubQuestionEditor, selMainBranch]);

  // Fetch sub-questions when branch+sub-branch changes
  useEffect(() => {
    if (!showSubQuestionEditor || !selMainBranch || !selSubBranch) { setDbSubQuestions([]); return; }

    // For 2xx.4 (inherited branches), fetch all sub-questions for the main branch
    if (sectionOccupationBranches) {
      invoke<DbSubQuestion[]>('get_all_sub_questions_for_branch', { branchCode: selMainBranch })
        .then(sqs => {
          setDbSubQuestions(sqs);
          // Auto-include always_checked items into activeSubQCodes
          const alwaysCodes = sqs.filter(sq => sq.always_checked).map(sq => sq.code);
          if (alwaysCodes.length > 0) {
            setActiveSubQCodes(prev => Array.from(new Set([...prev, ...alwaysCodes])));
          }
        })
        .catch(logger.error);
    } else {
      // Normal case: fetch by specific sub-branch
      invoke<DbSubQuestion[]>('get_occupation_sub_questions', { branchCode: selMainBranch, subBranchCode: selSubBranch })
        .then(sqs => {
          setDbSubQuestions(sqs);
          // Auto-include always_checked items into activeSubQCodes
          const alwaysCodes = sqs.filter(sq => sq.always_checked).map(sq => sq.code);
          if (alwaysCodes.length > 0) {
            setActiveSubQCodes(prev => Array.from(new Set([...prev, ...alwaysCodes])));
          }
        })
        .catch(logger.error);
    }
  }, [showSubQuestionEditor, selMainBranch, selSubBranch, sectionOccupationBranches]);

  // Auto-generate code prefix: AB + CC + DD (6-char, 8-digit format)
  // Pad branch codes to 2 digits: 'STD' → '00', '1' → '01'
  const padBC = (c: string) => c === 'STD' ? '00' : c.padStart(2, '0');
  const autoCodePrefix = useMemo(() => {
    if (!selMainBranch || !selSubBranch) return "";
    if (sectionOccupationBranches) {
      // 2xx.4 / 3xx.4: use 'S4' prefix with inherited branches
      const sCode = sectionGroup === 200 ? "2" : sectionGroup === 300 ? "3" : "1";
      return `${sCode}4${padBC(selMainBranch)}${padBC(selSubBranch)}`;
    }
    // Normal case: S + L + CC + DD
    const sCode = sectionGroup === 200 ? "2" : sectionGroup === 300 ? "3" : "1";
    const lCode = questionSequence?.toString() || "0";
    return `${sCode}${lCode}${padBC(selMainBranch)}${padBC(selSubBranch)}`;
  }, [sectionGroup, questionSequence, selMainBranch, selSubBranch, sectionOccupationBranches]);

  // Use DB sub-questions as the source of truth for filtered items
  const filteredItems: SubQuestionItem[] = useMemo(() => {
    if (dbSubQuestions.length > 0) {
      // For 2xx.4, filter by 24XXX prefix; for normal case, filter by autoCodePrefix
      const items = dbSubQuestions.map(sq => ({ code: sq.code, text: sq.text, alwaysChecked: sq.always_checked }));
      if (sectionOccupationBranches) {
        // 2xx.4: show only sub-questions with 24XXX prefix (not 22XXX from 2xx.2)
        return autoCodePrefix ? items.filter(sq => sq.code.startsWith(autoCodePrefix)) : [];
      }
      // Normal case: filter by specific prefix
      if (!autoCodePrefix) return [];
      return items.filter(sq => sq.code.startsWith(autoCodePrefix));
    }
    // Fallback to legacy subQuestionList for backward compat
    if (!autoCodePrefix) return [];
    return subQuestionList.filter(sq => sq.code.startsWith(autoCodePrefix));
  }, [dbSubQuestions, subQuestionList, autoCodePrefix, sectionOccupationBranches]);

  // Enforce always-checked items when SubQuestion mode is enabled (300Template only).
  // These items must always remain active in the current branch.
  useEffect(() => {
    if (!is300 || !useSubQuestions || filteredItems.length === 0) return;
    const alwaysCodes = filteredItems.filter((sq) => sq.alwaysChecked).map((sq) => sq.code);
    if (alwaysCodes.length === 0) return;
    setActiveSubQCodes((prev) => Array.from(new Set([...prev, ...alwaysCodes])));
  }, [is300, useSubQuestions, filteredItems]);

  // Check if selected branch is protected (ต้นแบบมาตรฐาน) — cannot add sub-questions
  const isProtectedBranch = useMemo(() => {
    const branch = dbBranches.find(b => b.code === selMainBranch);
    return branch?.name === 'ต้นแบบมาตรฐาน';
  }, [dbBranches, selMainBranch]);

  const prevPrefixRef = useRef(autoCodePrefix);
  useEffect(() => {
    if (prevPrefixRef.current !== autoCodePrefix && prevPrefixRef.current !== "") {
      if (autoCodePrefix) setActiveSubQCodes(prev => prev.filter(c => c.startsWith(autoCodePrefix)));
    }
    prevPrefixRef.current = autoCodePrefix;
  }, [autoCodePrefix]);

  // hasParentSubQ: this question is a child of a L1 with SubQuestionList
  const hasParentSubQ = !!(parentSubQuestionList && parentSubQuestionList.length > 0);

  // ---- SubQ Usage Count (fetched from backend via QuestionSubQuestionLinks table) ----
  // Use subQUsageParentId (L1 ancestor) when available so L2 and L3 show the same overview.
  // Falls back to parentId for backward compatibility.
  const usageParentId = subQUsageParentId || parentId;
  interface SubQuestionUsageResponse { usage_map: Record<string, number>; total_children: number; }
  const [subQUsageData, setSubQUsageData] = useState<SubQuestionUsageResponse>({ usage_map: {}, total_children: 0 });
  useEffect(() => {
    if (!hasParentSubQ || !usageParentId) { setSubQUsageData({ usage_map: {}, total_children: 0 }); return; }
    invoke<SubQuestionUsageResponse>('get_sub_question_usage_counts', { parentId: usageParentId })
      .then(data => setSubQUsageData(data))
      .catch(() => setSubQUsageData({ usage_map: {}, total_children: 0 }));
  }, [hasParentSubQ, usageParentId, usageRefreshKey]);

  // Sync selectedSubQCodes เมื่อ parentSubQuestionList เปลี่ยน (reorder/delete)
  // For 300Template: also inject alwaysChecked codes
  useEffect(() => {
    if (!parentSubQuestionList || parentSubQuestionList.length === 0) return;
    const validCodes = new Set(parentSubQuestionList.map(sq => sq.code));
    const alwaysCodes = sectionGroup === 300
      ? parentSubQuestionList.filter(sq => sq.alwaysChecked).map(sq => sq.code)
      : [];
    setSelectedSubQCodes(prev => {
      const filtered = prev.filter(c => validCodes.has(c));
      return Array.from(new Set([...filtered, ...alwaysCodes]));
    });
  }, [parentSubQuestionList, sectionGroup]);

  // Reference Linking State
  const [availableRefs, setAvailableRefs] = useState<SectionReferenceDetail[]>([]);
  const [linkedRefs, setLinkedRefs] = useState<QuestionReferenceDetail[]>(initialReferences);
  const [draftSelectedRefIds, setDraftSelectedRefIds] = useState<string[]>(() =>
    initialReferences.map((ref) => ref.reference.id.toString()),
  );
  const [draftPageByRefId, setDraftPageByRefId] = useState<Record<string, string>>(() =>
    initialReferences.reduce<Record<string, string>>((acc, ref) => {
      acc[ref.reference.id.toString()] = ref.location_text || "";
      return acc;
    }, {}),
  );
  const [draftPageErrors, setDraftPageErrors] = useState<Record<string, string>>({});
  const [answerKey, setAnswerKey] = useState<string>("");
  const [answerKeys, setAnswerKeys] = useState<Record<string, string>>({});

  // Toggle states for optional required fields
  const [requireRef, setRequireRef] = useState<boolean>(() => {
    if (parsedInitialMeta?.requireRef !== undefined) return parsedInitialMeta.requireRef;
    return is300 ? false : true; // Default: Unrequired for 300, Required for others (100, 200)
  });

  const [requireAnswerKey, setRequireAnswerKey] = useState<boolean>(() => {
    if (parsedInitialMeta?.requireAnswerKey !== undefined) return parsedInitialMeta.requireAnswerKey;
    return is300 ? false : true; // Default: Unrequired for 300, Required for others
  });

  const [isRefExpanded, setIsRefExpanded] = useState(false); // Collapsible State
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [errors, setErrors] = useState<{ content?: boolean; answerKey?: boolean; refs?: boolean }>(
    {},
  ); // Inline Validation State

  useEffect(() => {
    if (!existingId) {
      setAnswerKey("");
      setAnswerKeys({});
      return;
    }

    invoke<AnswerKeyRow[]>('get_question_answer_keys', { questionId: existingId })
      .then(rows => {
        const single = rows.find(r => (r.sub_question_code || '') === '');
        const multi = rows
          .filter(r => (r.sub_question_code || '') !== '')
          .sort((a, b) => a.order_index - b.order_index)
          .reduce<Record<string, string>>((acc, row) => {
            acc[row.sub_question_code] = row.answer_key_text || '';
            return acc;
          }, {});
        setAnswerKey(single?.answer_key_text || '');
        setAnswerKeys(multi);
      })
      .catch(() => {
        setAnswerKey('');
        setAnswerKeys({});
      });
  }, [existingId]);

  const showExtraButtons = is200or300 ? (level === 0 || level === 1) : isL1; // 200/300: show for L0 & L1, others: L0 only

  // Refs for auto-resizing
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const answerKeyRef = useRef<HTMLTextAreaElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const hasInitialAutoScrolledRef = useRef(false);

  const findScrollableParent = (el: HTMLElement | null): HTMLElement | null => {
    if (!el) return null;
    let parent = el.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      const canScroll = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
      if (canScroll && parent.scrollHeight > parent.clientHeight) return parent;
      parent = parent.parentElement;
    }
    return null;
  };

  const ensureFormFullyVisible = (smooth = false) => {
    const formEl = formCardRef.current;
    if (!formEl) return;

    const scrollParent = findScrollableParent(formEl);
    const behavior: ScrollBehavior = smooth ? "smooth" : "auto";

    // Extra bottom space to avoid fixed footer / OS taskbar overlap feeling
    const bottomSafeArea = 88;
    const topPadding = 8;
    const bottomPadding = 12;

    if (!scrollParent) {
      const rect = formEl.getBoundingClientRect();
      const visibleTop = topPadding;
      const visibleBottom = window.innerHeight - bottomSafeArea;

      if (rect.bottom > visibleBottom) {
        window.scrollBy({ top: rect.bottom - visibleBottom + bottomPadding, behavior });
        return;
      }
      if (rect.top < visibleTop) {
        window.scrollBy({ top: rect.top - visibleTop - bottomPadding, behavior });
      }
      return;
    }

    const formRect = formEl.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    const visibleTop = parentRect.top + topPadding;
    const visibleBottom = parentRect.bottom - bottomPadding;

    if (formRect.bottom > visibleBottom) {
      scrollParent.scrollBy({ top: formRect.bottom - visibleBottom + bottomPadding, behavior });
      return;
    }
    if (formRect.top < visibleTop) {
      scrollParent.scrollBy({ top: formRect.top - visibleTop - bottomPadding, behavior });
    }
  };

  // Auto-resize textarea helper (Strict)
  const adjustHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "0px";
    el.style.height = el.scrollHeight + "px";
  };

  // Trigger resize on content change
  useLayoutEffect(() => {
    adjustHeight(contentRef.current);
  }, [content]);

  useLayoutEffect(() => {
    if (isL1) adjustHeight(descriptionRef.current);
  }, [description, isL1]);

  useLayoutEffect(() => {
    adjustHeight(answerKeyRef.current);
  }, [answerKey]);

  // Bottom-awareness: keep newly opened form fully visible without manual scrolling.
  useEffect(() => {
    if (hasInitialAutoScrolledRef.current) return;
    hasInitialAutoScrolledRef.current = true;
    const rafId = window.requestAnimationFrame(() => ensureFormFullyVisible(true));
    return () => window.cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check visibility when optional sections expand/collapse and change form height.
  useEffect(() => {
    if (!hasInitialAutoScrolledRef.current) return;
    const rafId = window.requestAnimationFrame(() => ensureFormFullyVisible(false));
    return () => window.cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDescription, imagePath, requireRef, requireAnswerKey, isRefExpanded, linkedRefs.length]);

  // Fetch Available References
  useEffect(() => {
    if (requireRef && sectionId) {
      invoke<SectionReferenceDetail[]>("get_section_references", { sectionId })
        .then((refs) => setAvailableRefs(refs))
        .catch((err) => logger.error("Failed to fetch section references:", err));
    }
  }, [requireRef, sectionId, usageRefreshKey]);

  const syncReferenceDraftFromLinkedRefs = useCallback(() => {
    setDraftSelectedRefIds(linkedRefs.map((ref) => ref.reference.id.toString()));
    setDraftPageByRefId(
      linkedRefs.reduce<Record<string, string>>((acc, ref) => {
        acc[ref.reference.id.toString()] = ref.location_text || "";
        return acc;
      }, {}),
    );
    setDraftPageErrors({});
  }, [linkedRefs]);

  const handleToggleReferenceEditor = () => {
    if (!isRefExpanded) syncReferenceDraftFromLinkedRefs();
    setIsRefExpanded((prev) => !prev);
  };

  const handleToggleDraftReference = (refId: string) => {
    if (draftSelectedRefIds.includes(refId)) {
      setDraftSelectedRefIds((prev) => prev.filter((id) => id !== refId));
      setDraftPageErrors((prev) => {
        const next = { ...prev };
        delete next[refId];
        return next;
      });
      return;
    }

    if (draftSelectedRefIds.length >= 2) {
      const message = "เลือกเอกสารอ้างอิงได้สูงสุด 2 รายการ";
      if (onAlert) onAlert(message, "warning");
      else {
        setAlertMessage(message);
        setIsAlertOpen(true);
      }
      return;
    }

    setDraftSelectedRefIds((prev) => [...prev, refId]);
  };

  const handleDraftPageChange = (refId: string, value: string) => {
    if (!draftSelectedRefIds.includes(refId)) return;

    if (!REFERENCE_PAGE_ALLOWED_CHARS.test(value)) {
      setDraftPageErrors((prev) => ({ ...prev, [refId]: REFERENCE_PAGE_ERROR_MESSAGE }));
      return;
    }

    setDraftPageByRefId((prev) => ({ ...prev, [refId]: value }));
    const trimmed = value.trim();
    setDraftPageErrors((prev) => {
      const next = { ...prev };
      if (!trimmed || REFERENCE_PAGE_VALID_FORMAT.test(trimmed)) delete next[refId];
      else next[refId] = REFERENCE_PAGE_ERROR_MESSAGE;
      return next;
    });
  };

  const handleUpdateReferences = async () => {
    const nextErrors: Record<string, string> = {};
    for (const refId of draftSelectedRefIds) {
      const trimmed = (draftPageByRefId[refId] || "").trim();
      if (trimmed && !REFERENCE_PAGE_VALID_FORMAT.test(trimmed)) {
        nextErrors[refId] = REFERENCE_PAGE_ERROR_MESSAGE;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setDraftPageErrors((prev) => ({ ...prev, ...nextErrors }));
      if (onAlert) onAlert(REFERENCE_PAGE_ERROR_MESSAGE, "warning");
      else {
        setAlertMessage(REFERENCE_PAGE_ERROR_MESSAGE);
        setIsAlertOpen(true);
      }
      return;
    }

    const selectedRefSet = new Set(draftSelectedRefIds);
    const nextLinkedRefs = availableRefs
      .filter((ref) => selectedRefSet.has(ref.reference.id.toString()))
      .map((ref, index) => {
        const existingRef = linkedRefs.find((linked) => linked.reference.id === ref.reference.id);
        const refId = ref.reference.id.toString();
        const trimmedPage = (draftPageByRefId[refId] || "").trim();
        return {
          id: existingRef?.id || 0,
          question_id: existingRef?.question_id || existingId || "temp",
          reference_id: ref.reference.id,
          reference: ref.reference,
          location_text: trimmedPage || null,
          display_order: index + 1,
          thai_letter: ref.thai_letter,
        } satisfies QuestionReferenceDetail;
      });

    setLinkedRefs(nextLinkedRefs);
    setDraftPageErrors({});
    setIsRefExpanded(false);
    if (errors.refs) setErrors((prev) => ({ ...prev, refs: false }));
  };

  const handleImageUpload = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "Image", extensions: ["jpg", "jpeg", "png", "webp"] }],
      });

      if (selected && typeof selected === "string") {
        // Store pending upload - don't execute until Save
        setPendingImageUpload(selected);
        setPendingImageDelete(false);
        // Show preview using the selected file path
        setImagePath(selected);
      }
    } catch (err) {
      logger.error("Failed to select image:", err);
    }
  };

  const handleRemoveImage = () => {
    // Mark for deletion - don't execute until Save
    setPendingImageDelete(true);
    setPendingImageUpload(null);
    setImagePath(null);
  };

  const persistAnswerKeys = async (questionId: string) => {
    try {
      // Prevent clearing answer keys for parent questions that have children
      // This preserves parent answer boxes when child questions are added
      const hasChildren = effectiveIsGroupHeader || hasActualChildren;
      
      if (requireAnswerKey) {
        if (hasParentSubQ && selectedSubQCodes.length > 0) {
          await invoke('replace_question_answer_keys', {
            questionId,
            items: selectedSubQCodes.map(code => ({
              subCode: code,
              text: answerKeys[code] || '',
              isRequired: true,
            }))
          });
        } else {
          await invoke('replace_question_answer_keys', {
            questionId,
            items: [{ subCode: '', text: answerKey, isRequired: true }]
          });
        }
      } else {
        // Only clear answer keys if the question truly doesn't need them AND doesn't have children
        if (!hasChildren) {
          await invoke('replace_question_answer_keys', { questionId, items: [] });
        }
        // If has children, preserve existing answer keys even if requireAnswerKey is temporarily false
      }
    } catch (err) {
      logger.error('Failed to reconcile answer keys:', err);
    }
  };

  const handleSave = async () => {
    // Execute pending image operations BEFORE saving
    let finalImagePath = imagePath;
    
    // Handle pending image upload
    if (pendingImageUpload) {
      try {
        // Delete old image first if it exists (replacement scenario)
        if (originalImagePath) {
          try {
            await invoke('delete_question_image', { path: originalImagePath });
          } catch (err) {
            logger.error("Failed to delete old image:", err);
            // Continue with upload anyway
          }
        }
        
        let targetId = existingId;
        if (!targetId) {
          if (generatedId) {
            targetId = generatedId;
          } else {
            targetId = crypto.randomUUID();
            setGeneratedId(targetId);
          }
        }
        const friendlyPrefix = convertThaiToArabic(prefix);
        const newPath = await invoke<string>("upload_question_image", {
          path: pendingImageUpload,
          documentId: documentId,
          questionId: targetId,
          friendlyPrefix: friendlyPrefix,
        });
        finalImagePath = newPath;
        setImagePath(newPath);
        setPendingImageUpload(null);
        setPendingImageDelete(false); // Clear delete flag since we're replacing
      } catch (err) {
        logger.error("Failed to upload image:", err);
        if (onAlert) {
          onAlert("ไม่สามารถอัปโหลดรูปภาพได้", "danger");
        }
        return;
      }
    }
    // Handle pending image deletion (only if no new upload)
    else if (pendingImageDelete && originalImagePath) {
      try {
        await invoke('delete_question_image', { path: originalImagePath });
        finalImagePath = null;
        setPendingImageDelete(false);
      } catch (err) {
        logger.error("Failed to delete image file:", err);
        // Continue anyway - deletion failure shouldn't block save
      }
    }

    // Reset errors
    setErrors({});
    const newErrors: { content?: boolean; answerKey?: boolean; refs?: boolean } = {};
    let hasError = false;

    // Validation (skip answer key & refs for default 200 L1 — those fields are hidden)
    if (!content.trim()) {
      newErrors.content = true;
      hasError = true;
    }
    // NOTE: is300 from outer scope (line 654) is reused here — no redeclaration needed
    // Mirror the UI display condition (line 2180): show/validate AK when the AK editor is visible.
    // Old condition used activeSubQCodes (an L1-only field) — leaf questions never have it,
    // so validation was always skipped for 200Template SubQ leaf questions.
    const showAnswerKey = !is300 && (!isDefaultL1 && requireAnswerKey && !useSubQuestions && !(hasParentSubQ && selectedSubQCodes.length === 0));
    if (showAnswerKey) {
      if (hasParentSubQ && selectedSubQCodes.length > 0) {
        // ตรวจว่าทุก subQ ที่เลือกมี answer key
        const missingAny = selectedSubQCodes.some(c => !(answerKeys[c] || "").trim());
        if (missingAny) { newErrors.answerKey = true; hasError = true; }
      } else if (!answerKey.trim()) {
        newErrors.answerKey = true;
        hasError = true;
      }
    }
    if (!is300 && !isDefaultL1 && requireRef && linkedRefs.length === 0) {
      newErrors.refs = true;
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      // Construct alert message based on errors
      const messages = [];
      if (newErrors.content) messages.push("คำถาม (Question)");
      if (newErrors.answerKey) messages.push("เฉลย (Answer Key)");
      if (newErrors.refs) messages.push("เอกสารอ้างอิง (References)");

      const missingParts = `กรุณากรอกข้อมูลให้ครบถ้วน:\n- ${messages.join("\n- ")}`;
      if (onAlert) {
        onAlert(missingParts, "warning");
      } else {
        setAlertMessage(missingParts);
        setIsAlertOpen(true);
      }
      return;
    }

    let newMeta: any = {};
    if (initialMetadata) {
      try {
        newMeta = JSON.parse(initialMetadata);
      } catch { }
    }
    // Save toggle states (only store non-default values)
    if (!requireRef) newMeta.requireRef = false;
    else delete newMeta.requireRef;
    if (!requireAnswerKey) newMeta.requireAnswerKey = false;
    else delete newMeta.requireAnswerKey;
    // Save answer key -> Removed from JSON. Now stored in QuestionAnswerKeys table via update_answer_key API.
    delete newMeta.answerKey;
    delete newMeta.answerKeys;
    // Save SubQuestionList data (for 2xx.2 and 2xx.4 L1 headers)
    const alwaysCodesInBranch = is300 ? filteredItems.filter((sq) => sq.alwaysChecked).map((sq) => sq.code) : [];
    const effectiveActiveSubQCodes = Array.from(new Set([...activeSubQCodes, ...alwaysCodesInBranch]));
    if (isL1 && formScoreType === 'exempted') {
      // Clear all SubQ metadata when exempted
      delete newMeta.useSubQuestions;
      delete newMeta.subQuestionList;
      delete newMeta.occupationBranches;
      delete newMeta.activeSubQuestions;
      delete newMeta.selectedBranch;
    } else if (showSubQuestionEditor) {
      if (useSubQuestions) {
        newMeta.useSubQuestions = true;
        // Branches and sub-questions are now stored in DB tables, not metadata
        delete newMeta.subQuestionList;
        delete newMeta.occupationBranches;
        // Always save selectedBranch for both 2xx.2 and 2xx.4 (needed for display)
        if (selMainBranch) newMeta.selectedBranch = { main: selMainBranch, sub: selSubBranch };
        else delete newMeta.selectedBranch;
        newMeta.activeSubQuestions = effectiveActiveSubQCodes;
      } else {
        delete newMeta.useSubQuestions;
        delete newMeta.subQuestionList;
        delete newMeta.occupationBranches;
        delete newMeta.activeSubQuestions;
        delete newMeta.selectedBranch;
      }
    }
    // Save selectedSubQuestions (for child questions of L1 with SubQuestionList)
    if (hasParentSubQ) {
      const forcedCodes = (sectionGroup === 300 && parentSubQuestionList)
        ? parentSubQuestionList.filter(sq => sq.alwaysChecked).map(sq => sq.code)
        : [];
      const effectiveSelected = Array.from(new Set([...selectedSubQCodes, ...forcedCodes]));
      if (effectiveSelected.length > 0) newMeta.selectedSubQuestions = effectiveSelected;
      else delete newMeta.selectedSubQuestions;
    }
    // CRITICAL: Always send metadata even if empty to ensure DB update (empty JSON clears metadata)
    const metadataString = Object.keys(newMeta).length > 0 ? JSON.stringify(newMeta) : '{}';

    // Validation: warn if useSubQuestions=true but no active items selected
    if (showSubQuestionEditor && useSubQuestions && effectiveActiveSubQCodes.length === 0) {
      setAlertMessage('ยังไม่ได้เลือกคำถามย่อยที่ใช้งาน\nต้องเลือกคำถามย่อยอย่างน้อย 1 ข้อก่อนบันทึก');
      setIsAlertOpen(true);
      return;
    }

    // --- Background-saved L2: update existing DB record instead of creating new ---
    if (isBackgroundSaved && !isEdit && generatedId) {
      try {
        // Update L2 content/metadata
        let metaObj: any = {};
        if (metadataString) {
          try { metaObj = JSON.parse(metadataString); } catch { }
        }
        if (finalImagePath) metaObj.image = finalImagePath;
        if (showExtraButtons && currentChildLayout) metaObj.childLayout = currentChildLayout;
        const finalMeta = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : '{}';

        await invoke('update_question', {
          args: {
            id: generatedId,
            content: content.trim(),
            description: showExtraButtons ? description || null : null,
            metadata: finalMeta,
          }
        });
        // Update score
        if (is300) {
          await invoke('update_question_score', {
            args: {
              id: generatedId,
              score: formScoreIsScored ? parseInt(formScoreValue) || 0 : 0,
              is_scored: formScoreIsScored,
              question_type: formScoreType,
              display_text: formScoreType === 'exempted' ? (formScoreDisplayText || '(ไม่ต้องปฏิบัติ)') : null,
            }
          });
        }
        // Final sync of L3 children
        if (requiredCount > 0 && sectionId) {
          await invoke('sync_required_count_children', {
            args: {
              parent_id: generatedId,
              document_id: documentId,
              section_id: sectionId,
              desired_count: requiredCount,
              score_per_instance: scorePerInstance,
            }
          });
        }
        await persistAnswerKeys(generatedId);
      } catch (err) {
        logger.error('Failed to finalize background-saved L2:', err);
      }
      // Refresh tree and close form (silent — avoids full reload flicker in 300 editor)
      onRefresh?.();
      onCancel();
      return;
    }

    // --- Normal flow (new question or editing existing) ---
    let questionId = existingId;
    if (!isEdit) {
      if (generatedId) {
        questionId = generatedId;
      } else {
        questionId = crypto.randomUUID();
        setGeneratedId(questionId);
      }
    }

    // Save scoring fields BEFORE onSave so DB has fresh scores when fetchQuestions runs
    if (is300 && isEdit && existingId) {
      try {
        await invoke('update_question_score', {
          args: {
            id: existingId,
            score: formScoreIsScored ? parseInt(formScoreValue) || 0 : 0,
            is_scored: formScoreIsScored,
            question_type: formScoreType,
            display_text: formScoreType === 'exempted' ? (formScoreDisplayText || '(ไม่ต้องปฏิบัติ)') : null,
          }
        });
      } catch (err) {
        logger.error('Failed to save question score:', err);
      }
    }

    // Save question_type & display_text for all 2xx L1 questions (exempted toggle, no scoring)
    if (isExemptableL1_200 && isEdit && existingId) {
      try {
        await invoke('update_question_score', {
          args: {
            id: existingId,
            score: 0,
            is_scored: false,
            question_type: formScoreType,
            display_text: formScoreType === 'exempted' ? '(ไม่ต้องอธิบาย)' : null,
          }
        });
      } catch (err) {
        logger.error('Failed to save 200-series exempted state:', err);
      }
    }

    await onSave({
      content,
      description: showExtraButtons ? description : undefined,
      image: showExtraButtons ? finalImagePath || undefined : undefined,
      id: !isEdit ? questionId : undefined,
      references: requireRef ? linkedRefs : [],
      metadata: metadataString,
      childLayout: showExtraButtons ? currentChildLayout : undefined,
    });

    // Save relational answer keys AFTER onSave so that the question record is guaranteed to exist
    if (questionId) {
      await persistAnswerKeys(questionId);
    }

    // Auto-sync required count children AFTER onSave (L2 of 3xx.2-3xx.6, or L1 of 3xx.6)
    if ((isPerformanceL2 || is306L1) && sectionId && questionId && requiredCount > 0) {
      try {
        await invoke('sync_required_count_children', {
          args: {
            parent_id: questionId,
            document_id: documentId,
            section_id: sectionId,
            desired_count: requiredCount,
            score_per_instance: scorePerInstance,
            content_override: is306L1 ? (description || content.trim()) : null,
          }
        });
      } catch (err) {
        logger.error('Failed to sync required count children:', err);
      }
    }

    // Save scoring fields AFTER onSave for new L2 questions
    if (is300 && isPerformanceL2 && !isEdit && questionId) {
      try {
        await invoke('update_question_score', {
          args: {
            id: questionId,
            score: formScoreIsScored ? parseInt(formScoreValue) || 0 : 0,
            is_scored: formScoreIsScored,
            question_type: formScoreType,
            display_text: formScoreType === 'exempted' ? (formScoreDisplayText || '(ไม่ต้องปฏิบัติ)') : null,
          }
        });
      } catch (err) {
        logger.error('Failed to save question score for new L2:', err);
      }
    }

    // NOTE: onRefresh removed — onSave → handleUpdate already triggers setBgSyncTrigger → fetchQuestions.
    // Calling onRefresh here caused a redundant second fetch from DB.

    // Close form after save completes
    onCancel();
  };

  // Cleanup background-saved L2 if user cancels
  const handleCancel = useCallback(async () => {
    // Restore original image state (rollback pending operations)
    setImagePath(originalImagePath);
    setPendingImageUpload(null);
    setPendingImageDelete(false);
    
    if (isBackgroundSaved && generatedId) {
      try {
        await invoke('delete_question', { id: generatedId });
      } catch (err) {
        logger.error('Failed to cleanup background-saved L2:', err);
      }
    }
    onCancel();
  }, [isBackgroundSaved, generatedId, originalImagePath, onCancel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setAnswerKey("");
      handleCancel();
    }
    if (e.key === "Enter" && e.ctrlKey) handleSave();
  };

  return (
    <div
      ref={formCardRef}
      className="m-1 rounded-lg border border-blue-400/60 dark:border-blue-500/40 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-slate-800 p-3 shadow-md backdrop-blur-sm animate-in zoom-in-95 duration-200"
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
              {prefix}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {isEdit ? "✏️ แก้ไข" : "✨ สร้างใหม่"}
            </span>
          </div>

          {/* Optional Toggles (L1 Only for 100/300, L0+L1 for 200) */}
          {showExtraButtons && !isRequiredInstance && (
            <div className="flex items-center gap-1">
              <Tooltip content="เพิ่มคำอธิบาย" position="top-end">
                <button
                  type="button"
                  onClick={() => setShowDescription(true)}
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              {!imagePath && (
                <Tooltip content="เพิ่มรูปภาพ" position="top-end">
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              )}
              {!isDefaultL1 && !is300 && (
                <Tooltip content="สลับโหมดการแสดงผลคำถามย่อย" position="top-end">
                  <button
                    type="button"
                    onClick={() => setCurrentChildLayout((prev) => (prev === "grid" ? "list" : "grid"))}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-all border shadow-sm
                      ${currentChildLayout === "grid"
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                      }`}
                  >
                    <Plus
                      className={`w-3 h-3 transition-transform ${currentChildLayout === "grid" ? "rotate-45" : ""}`}
                    />
                    {currentChildLayout === "grid" ? "2 คอลัมน์" : "1 คอลัมน์"}
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        {/* Content (Main Question) - Compact & Auto-expanding */}
        {!isRequiredInstance && <div>
          <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            คำถาม (Question) <span className="text-red-500">*</span>
          </label>
          <textarea
            ref={contentRef}
            autoFocus={!isDefaultL1}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (errors.content) setErrors((prev) => ({ ...prev, content: false }));
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pastedText = e.clipboardData.getData("text");
              const trimmedText = pastedText.trim();

              const target = e.target as HTMLTextAreaElement;
              const start = target.selectionStart || 0;
              const end = target.selectionEnd || 0;
              const currentValue = target.value;

              const newValue = currentValue.substring(0, start) + trimmedText + currentValue.substring(end);
              setContent(newValue);

              requestAnimationFrame(() => {
                target.selectionStart = target.selectionEnd = start + trimmedText.length;
              });

              if (errors.content) setErrors((prev) => ({ ...prev, content: false }));
            }}
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์คำถาม..."
            disabled={isDefaultL1 || isDefault300L2}
            className={`w-full p-2 border rounded-md text-sm font-semibold resize-none min-h-[36px] overflow-hidden leading-relaxed
              ${(isDefaultL1 || isDefault300L2) ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed" : ""}
              ${errors.content
                ? "border-red-500 bg-red-50 dark:bg-red-900/10 focus:ring-red-500 placeholder:text-red-300"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900/80 dark:text-slate-100 focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 placeholder:text-slate-300 dark:placeholder:text-slate-600"
              } focus:outline-none focus:ring-1`}
            rows={1}
          />
        </div>}

        {/* ── Unified "ไม่ต้องปฏิบัติ" checkbox (right after question title for visibility) ── */}
        {is300 && !isRequiredInstance && !isPrerequisiteQuestion && !isPrerequisiteChild && !isSection300Selector && !isSection100Selector && !isSection200Selector && !isExamChild && !isFixedPracticeL1 && !isPerformanceL2 && (
          <div className="rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">การปฏิบัติ</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formScoreType === 'exempted'}
                  onChange={(e) => {
                    const isExempted = e.target.checked;
                    setFormScoreType(isExempted ? 'exempted' : 'normal');
                    if (isExempted) {
                      // Clear everything including image
                      setFormScoreDisplayText('(ไม่ต้องปฏิบัติ)');
                      setFormScoreIsScored(false);
                      setFormScoreValue('0');
                      setDescription('');
                      setShowDescription(false);
                      setUseSubQuestions(false);
                      setRequiredCount(0);
                      setRequiredCountChildren([]);
                      // Clear image (mark for deletion on Save)
                      if (imagePath) {
                        setPendingImageDelete(true);
                        setPendingImageUpload(null);
                        setImagePath(null);
                      }
                    } else {
                      setFormScoreDisplayText('');
                    }
                  }}
                  className="accent-amber-600 w-3.5 h-3.5"
                />
                ไม่ต้องปฏิบัติ
              </label>
              {formScoreType === 'exempted' && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                  (ไม่ต้องปฏิบัติ)
                </span>
              )}
            </div>
            {isL1 && hasActualChildren && formScoreType === 'exempted' && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 text-sm font-bold">⚠️</span>
                  <div className="flex-1 text-xs text-red-700 dark:text-red-300">
                    <div className="font-bold mb-1">คำเตือน: คำถามนี้มีคำถามย่อยอยู่</div>
                    <div>เมื่อบันทึกเป็น "ไม่ต้องปฏิบัติ" คำถามย่อยทั้งหมดจะถูกลบออกจากฐานข้อมูลอัตโนมัติ</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 200-series: all L1 start as "(ไม่ต้องอธิบาย)"; 2xx.2/2xx.4 add default descriptions when activated ── */}
        {isExemptableL1_200 && (
          <div className="rounded-md border border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-950/20 p-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">การอธิบาย</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formScoreType === 'exempted'}
                  onChange={(e) => {
                    const isExempted = e.target.checked;
                    setFormScoreType(isExempted ? 'exempted' : 'normal');
                    if (isExempted) {
                      setFormScoreDisplayText('(ไม่ต้องอธิบาย)');
                      setDescription('');
                      setShowDescription(false);
                      setUseSubQuestions(false);
                      // Clear image (mark for deletion on Save)
                      if (imagePath) {
                        setPendingImageDelete(true);
                        setPendingImageUpload(null);
                        setImagePath(null);
                      }
                    } else {
                      setFormScoreDisplayText('');
                      if (isDefaultDescL1_200 && questionSequence !== undefined) {
                        const DEFAULT_200_DESC: Record<number, string> = {
                          2: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคำถามที่กำหนด',
                          4: 'จงอธิบายค่าทำงานปกติ ค่าสูงสุด ต่ำสุด ของการทำงาน ตามรายการที่กำหนด',
                        };
                        setDescription(DEFAULT_200_DESC[questionSequence] || '');
                        setShowDescription(true);
                      }
                    }
                  }}
                  className="accent-orange-600 w-3.5 h-3.5"
                />
                ไม่ต้องอธิบาย
              </label>
              {formScoreType === 'exempted' && (
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded">
                  (ไม่ต้องอธิบาย)
                </span>
              )}
            </div>
            {isL1 && hasActualChildren && formScoreType === 'exempted' && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 text-sm font-bold">⚠️</span>
                  <div className="flex-1 text-xs text-red-700 dark:text-red-300">
                    <div className="font-bold mb-1">คำเตือน: คำถามนี้มีรายการย่อยอยู่</div>
                    <div>เมื่อบันทึกเป็น "ไม่ต้องอธิบาย" รายการย่อยทั้งหมดจะถูกลบออกจากฐานข้อมูลอัตโนมัติ</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Extras */}
        <div className="space-y-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
          {/* Description - L1 Only for 100/300, L0+L1 for 200 (Optional) */}
          {showExtraButtons && showDescription && (
            <div className="group/desc animate-in slide-in-from-top-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                คำอธิบาย (Description)
              </label>
              <div className="relative">
                <textarea
                  ref={descriptionRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData("text");
                    const trimmedText = pastedText.trim();

                    const target = e.target as HTMLTextAreaElement;
                    const start = target.selectionStart || 0;
                    const end = target.selectionEnd || 0;
                    const currentValue = target.value;

                    const newValue = currentValue.substring(0, start) + trimmedText + currentValue.substring(end);
                    setDescription(newValue);

                    requestAnimationFrame(() => {
                      target.selectionStart = target.selectionEnd = start + trimmedText.length;
                    });
                  }}
                  placeholder="คำอธิบายเพิ่มเติม (Description)..."
                  disabled={!!isPrerequisiteQuestion || !!isSection300Selector || !!isSection100Selector || !!isSection200Selector || !!isDefaultDescL1 || formScoreType === 'exempted'}
                  className={`w-full p-2 pr-7 border rounded-md resize-none text-sm min-h-[34px] overflow-hidden ${(isPrerequisiteQuestion || isSection300Selector || isSection100Selector || isSection200Selector || isDefaultDescL1 || formScoreType === 'exempted')
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                    : 'border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50'
                    }`}
                  rows={1}
                />
                {!isPrerequisiteQuestion && !isSection300Selector && !isSection100Selector && !isSection200Selector && !isDefaultDescL1 && formScoreType !== 'exempted' && (
                  <Tooltip content="ลบคำอธิบาย">
                    <button
                      onClick={() => {
                        setDescription("");
                        setShowDescription(false);
                      }}
                      className="absolute top-1.5 right-1.5 p-0.5 text-slate-300 hover:text-red-500 rounded opacity-0 group-hover/desc:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          )}

          {/* ── SubQuestionList Editor (2xx.2 and 2xx.4 L1 headers only) ── */}
          {showSubQuestionEditor && (
            <div className={`rounded-lg border ${sqClr.border} ${sqClr.bg} p-3 space-y-2`}>
              {/* Header + Opt-in Toggle */}
              <div className="flex items-center gap-2">
                <ListChecks className={`w-4 h-4 ${sqClr.text} shrink-0`} />
                <span className={`text-xs font-bold ${sqClr.textBold} uppercase tracking-wider flex-1`}>
                  รายการคำถามย่อย (SubQuestion List)
                </span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <div className="relative inline-flex items-center">
                    <input type="checkbox" checked={useSubQuestions}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setUseSubQuestions(newValue);
                        if (!newValue) setActiveSubQCodes([]);

                        // Auto-change from Exempted to Normal when enabling sub-questions
                        if (newValue && formScoreType === 'exempted') {
                          setFormScoreType('normal');
                          setFormScoreIsScored(false); // Disable scoring initially
                        }
                        // Always set as Group Header when sub-questions are enabled
                        if (newValue) {
                          setEffectiveIsGroupHeader(true); // Set as Group Header
                        }
                      }}
                      className="sr-only peer" />
                    <div className={`w-7 h-4 rounded-full bg-slate-300 dark:bg-slate-600 ${sqClr.toggle} transition-colors`}></div>
                    <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-3"></div>
                  </div>
                  <span className={`text-[10px] font-semibold ${useSubQuestions ? sqClr.text : "text-slate-400 dark:text-slate-500"}`}>
                    {useSubQuestions ? "ใช้งาน" : "ไม่ใช้"}
                  </span>
                </label>
              </div>

              {useSubQuestions && (
                <div className="space-y-2">
                  {/* Branch Selector Row */}
                  <div className="flex flex-wrap gap-2 items-end">
                    {/* Main Branch */}
                    <div className="min-w-[140px] max-w-[280px] w-fit">
                      <label className={`block text-[10px] ${sqClr.textDim} mb-0.5`}>
                        สาขาอาชีพหลัก{sectionOccupationBranches && <span className="ml-1 text-[9px] text-slate-400">(จาก 2xx.2)</span>}
                      </label>
                      {!sectionOccupationBranches ? (
                        <Tooltip
                          disabled={!sectionSelectedBranch}
                          content="ถูกบังคับใช้งานโดยระดับเอกสาร (แก้ไขไม่ได้)"
                          position="top-start"
                          className="w-full"
                        >
                          <select value={selMainBranch} onChange={(e) => { setSelMainBranch(e.target.value); setSelSubBranch(""); }}
                            className={`w-full px-2 py-1.5 text-xs border ${sqClr.selectBd} rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none ${sectionSelectedBranch ? 'cursor-not-allowed opacity-80' : ''}`}
                            disabled={!!sectionSelectedBranch}>
                            <option value="">-- เลือก --</option>
                            {dbBranches.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                          </select>
                        </Tooltip>
                      ) : (
                        /* 2xx.4: disabled select แสดงค่าจาก DB (เหมือน 2xx.2) */
                        <Tooltip
                          content="แสดงค่าที่เลือกมาจากข้อย่อย 2xx.2"
                          position="top-start"
                          className="w-full"
                        >
                          <select value={selMainBranch} disabled
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none cursor-not-allowed opacity-80">
                            <option value="">-- ไม่ได้เลือกใน 2xx.2 --</option>
                            {dbBranches.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                          </select>
                        </Tooltip>
                      )}
                    </div>

                    {/* Sub Branch */}
                    {selMainBranch && (
                      <div className="min-w-[140px] max-w-[280px] w-fit">
                        <label className={`block text-[10px] ${sqClr.textDim} mb-0.5`}>สาขาย่อย</label>
                        {!sectionOccupationBranches ? (
                          <Tooltip
                            disabled={!sectionSelectedBranch}
                            content="ถูกบังคับใช้งานโดยระดับเอกสาร (แก้ไขไม่ได้)"
                            position="top-start"
                            className="w-full"
                          >
                            <select value={selSubBranch} onChange={(e) => setSelSubBranch(e.target.value)}
                              className={`w-full px-2 py-1.5 text-xs border ${sqClr.selectBd} rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none ${sectionSelectedBranch ? 'cursor-not-allowed opacity-80' : ''}`}
                              disabled={!!sectionSelectedBranch}>
                              <option value="">-- เลือก --</option>
                              {dbSubBranches.map(sb => <option key={sb.code} value={sb.code}>{sb.code} - {sb.name}</option>)}
                            </select>
                          </Tooltip>
                        ) : (
                          /* 2xx.4: disabled select แสดงค่าจาก DB (เหมือน 2xx.2) */
                          <Tooltip
                            content="แสดงค่าที่เลือกมาจากข้อย่อย 2xx.2"
                            position="top-start"
                            className="w-full"
                          >
                            <select value={selSubBranch} disabled
                              className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none cursor-not-allowed opacity-80">
                              <option value="">-- ไม่ได้เลือกใน 2xx.2 --</option>
                              {dbSubBranches.map(sb => <option key={sb.code} value={sb.code}>{sb.code} - {sb.name}</option>)}
                            </select>
                          </Tooltip>
                        )}
                      </div>
                    )}

                    {/* Auto code display */}
                    {autoCodePrefix && (
                      <div className="shrink-0">
                        <label className={`block text-[10px] ${sqClr.textDim} mb-0.5`}>รหัส (Auto)</label>
                        <div className={`px-2 py-1.5 text-xs font-mono font-bold ${sqClr.code} rounded`}>
                          {autoCodePrefix}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Filtered item list for current branch */}
                  {filteredItems.length > 0 && (
                    <div className="grid grid-cols-1 gap-0.5">
                      {filteredItems.map((item, localIdx) => {
                        const dbSq = dbSubQuestions.find(sq => sq.code === item.code);
                        const isLastItem = localIdx === filteredItems.length - 1;
                        // For protected branch in 300-series: last item shows forced badge, no actions on any item
                        const showForcedBadge = is300 && item.alwaysChecked && (!isProtectedBranch || isLastItem);
                        const showActionButtons = !isProtectedBranch;
                        return (
                          <div key={item.code} className={`flex items-center gap-2 px-2 py-1 bg-white dark:bg-slate-900/60 border ${sqClr.itemBd} rounded-md group/sq-item`}>
                            <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                            <span className={`text-xs font-bold ${sqClr.itemText} min-w-[1.5ch]`}>{toThaiAlphabet(localIdx + 1)}.</span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded shrink-0">{item.code}</span>
                            <span className="flex-1 text-xs text-slate-700 dark:text-slate-200 truncate">{item.text}</span>
                            {showForcedBadge && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full shrink-0">บังคับ ✓</span>}
                            {showActionButtons && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/sq-item:opacity-100 transition-opacity">
                                {is300 && (
                                  <Tooltip content={item.alwaysChecked ? "ยกเลิกบังคับ" : "บังคับเลือกเสมอ"}>
                                    <button onClick={async () => { if (dbSq) { const newAc = !item.alwaysChecked; await invoke('update_occupation_sub_question', { id: dbSq.id, text: dbSq.text, alwaysChecked: newAc }); setDbSubQuestions(prev => prev.map(s => s.id === dbSq.id ? { ...s, always_checked: newAc } : s)); if (newAc && useSubQuestions) { setActiveSubQCodes(prev => Array.from(new Set([...prev, item.code]))); } } else { const gi = subQuestionList.findIndex(sq => sq.code === item.code); const u = [...subQuestionList]; u[gi] = { ...u[gi], alwaysChecked: !u[gi].alwaysChecked }; setSubQuestionList(u); if (!item.alwaysChecked && useSubQuestions) { setActiveSubQCodes(prev => Array.from(new Set([...prev, item.code]))); } } }}
                                        className={`p-0.5 rounded transition-colors ${item.alwaysChecked ? 'text-emerald-500 hover:text-slate-400' : 'text-slate-400 hover:text-emerald-500'}`}>
                                        <CheckCircle className="w-3 h-3" />
                                    </button>
                                  </Tooltip>
                                )}
                                <Tooltip content="ลบ">
                                  <button onClick={async () => { if (dbSq) { await invoke('delete_occupation_sub_question', { id: dbSq.id }); setDbSubQuestions(prev => prev.filter(s => s.id !== dbSq.id)); } else { setSubQuestionList(prev => prev.filter(sq => sq.code !== item.code)); } }} className="p-0.5 text-slate-400 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                                </Tooltip>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Step 2: Select active items for children */}
                  {filteredItems.length > 0 && autoCodePrefix && (() => {
                    const branchCodes = filteredItems.map(sq => sq.code);
                    const alwaysCodes = filteredItems.filter(sq => sq.alwaysChecked).map(sq => sq.code);
                    const activeInBranch = Array.from(new Set([
                      ...activeSubQCodes.filter(c => branchCodes.includes(c)),
                      ...alwaysCodes,
                    ]));
                    const allActive = activeInBranch.length === filteredItems.length;
                    return (
                      <div className={`pt-2 border-t ${sqClr.border}`}>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <CheckCircle className={`w-3.5 h-3.5 ${sqClr.text}`} />
                          <span className={`text-xs font-bold ${sqClr.textBold} uppercase tracking-wider flex-1`}>เลือกข้อย่อยที่ใช้งาน</span>
                          <span className={`text-[10px] ${sqClr.count}`}>{activeInBranch.length}/{filteredItems.length}</span>
                          <div className="flex gap-1 ml-auto">
                            <button type="button" onClick={() => setActiveSubQCodes(prev => [...prev.filter(c => !branchCodes.includes(c)), ...branchCodes])}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors ${allActive ? sqClr.activeAll : sqClr.addBtn}`}>เลือกทั้งหมด</button>
                            <button type="button" onClick={() => setActiveSubQCodes(prev => [...prev.filter(c => !branchCodes.includes(c)), ...alwaysCodes])}
                              className="px-2 py-0.5 text-[10px] font-bold rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100">ยกเลิกทั้งหมด</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5">
                          {filteredItems.map((sq, idx) => {
                            const isForced = is300 && sq.alwaysChecked === true;
                            const isActive = isForced || activeSubQCodes.includes(sq.code);
                            return (
                              <label key={sq.code} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer select-none text-xs ${isActive ? sqClr.activeBg + ' text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'} ${isForced ? 'opacity-80' : ''}`}>
                                <input type="checkbox" checked={isActive} disabled={isForced} onChange={() => { if (isForced) return; setActiveSubQCodes(prev => isActive ? prev.filter(c => c !== sq.code) : [...prev, sq.code]); }}
                                  className={`w-3 h-3 rounded ${sqClr.check}`} />
                                <span className={`font-bold ${sqClr.textBold} min-w-[1.5ch]`}>{toThaiAlphabet(idx + 1)}.</span>
                                <span className="flex-1 truncate">{sq.text}</span>
                                {isForced && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full shrink-0">บังคับ ✓</span>}
                                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-600">{sq.code}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ── SubQuestion Binding (children of L1 with SubQuestionList) ── */}
          {hasParentSubQ && (
            <div className={`rounded-lg border ${sqClr.bindWrap} p-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ListChecks className={`w-4 h-4 ${sqClr.text}`} />
                  <span className={`text-xs font-bold ${sqClr.textBold} uppercase tracking-wider`}>เลือกคำถามย่อย (Select Sub-Questions)</span>
                  <span className={`text-[10px] ${sqClr.count}`}>{selectedSubQCodes.length}/{parentSubQuestionList!.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant={selectedSubQCodes.length > 0 && selectedSubQCodes.length < parentSubQuestionList!.filter(sq => !(is300 && sq.alwaysChecked === true)).length ? "primary" : "outline"}
                    size="small"
                    onClick={() => {
                      const allCodes = parentSubQuestionList!.filter(sq => !(is300 && sq.alwaysChecked === true)).map(sq => sq.code);
                      setSelectedSubQCodes(allCodes);
                    }}
                    disabled={selectedSubQCodes.length === parentSubQuestionList!.filter(sq => !(is300 && sq.alwaysChecked === true)).length}
                    className={`text-xs px-1.5 py-0.5 ${is300 ? 'hover:border-purple-500' : ''}`}
                  >
                    เลือกทั้งหมด
                  </Button>
                  <Button
                    variant={selectedSubQCodes.length > 0 ? "primary" : "outline"}
                    size="small"
                    onClick={() => setSelectedSubQCodes([])}
                    disabled={selectedSubQCodes.length === 0}
                    className={`text-xs px-1.5 py-0.5 ${is300 ? 'hover:border-purple-500' : ''}`}
                  >
                    ยกเลิกทั้งหมด
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {parentSubQuestionList!.map((sq, idx) => {
                  const isForced = is300 && sq.alwaysChecked === true;
                  const isChecked = isForced || selectedSubQCodes.includes(sq.code);
                  return (
                    <label key={sq.code} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer select-none text-xs ${isChecked ? sqClr.activeBg + ' text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'} ${isForced ? 'opacity-70' : ''}`}>
                      <input type="checkbox" checked={isChecked} disabled={isForced}
                        onChange={() => { if (isForced) return; setSelectedSubQCodes(prev => isChecked ? prev.filter(c => c !== sq.code) : [...prev, sq.code]); }}
                        className={`w-3 h-3 rounded ${sqClr.check}`} />
                      <span className={`font-bold ${sqClr.textBold} min-w-[1.5ch]`}>{toThaiAlphabet(idx + 1)}.</span>
                      <span className="flex-1">{sq.text}</span>
                      {isForced && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full shrink-0">บังคับ ✓</span>}
                      {/* Sub-question usage badge (from relational table) */}
                      {!isForced && hasParentSubQ && (() => {
                        const count = subQUsageData.usage_map[sq.code] || 0;
                        const total = subQUsageData.total_children;
                        if (count === 0) {
                          return <span className="ml-auto text-[10px] px-2 py-[1px] rounded-full bg-orange-100 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 font-bold whitespace-nowrap">Unused (0/{total})</span>;
                        }
                        return <span className="ml-auto text-[10px] px-2 py-[1px] rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 font-bold whitespace-nowrap">Used: {count}/{total}</span>;
                      })()}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toggle Options: Reference + Answer Key (Hidden for default 200/300 L1, hidden for 300Template entirely) */}
          {!isDefaultL1 && !is300 && (
            <div className="flex items-center gap-4 py-1">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={requireRef}
                    onChange={(e) => {
                      setRequireRef(e.target.checked);
                      if (!e.target.checked) {
                        setLinkedRefs([]);
                        setDraftSelectedRefIds([]);
                        setDraftPageByRefId({});
                        setDraftPageErrors({});
                        setIsRefExpanded(false);
                        setErrors((prev) => ({ ...prev, refs: false }));
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 rounded-full bg-slate-300 dark:bg-slate-600 peer-checked:bg-indigo-500 transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-3"></div>
                </div>
                <span
                  className={`text-xs font-semibold transition-colors ${requireRef ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 line-through"}`}
                >
                  เอกสารอ้างอิง (Reference) {requireRef && <span className="text-red-500">*</span>}
                </span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={requireAnswerKey}
                    onChange={(e) => {
                      setRequireAnswerKey(e.target.checked);
                      if (!e.target.checked) {
                        setAnswerKey("");
                        setErrors((prev) => ({ ...prev, answerKey: false }));
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 rounded-full bg-slate-300 dark:bg-slate-600 peer-checked:bg-emerald-500 transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-3"></div>
                </div>
                <span
                  className={`text-xs font-semibold transition-colors ${requireAnswerKey ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 line-through"}`}
                >
                  คำเฉลย (Answer Key) {requireAnswerKey && <span className="text-red-500">*</span>}
                </span>
              </label>
            </div>
          )}

          {/* References Section (Both L1 & L2, conditional on toggle — hidden for default 200/300 L1, hidden for 300Template) */}
          {!isDefaultL1 && !is300 && requireRef && (
            <>
              <label className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                <span>เอกสารอ้างอิง (References)</span>
                <span
                  className={`text-xs font-normal ${errors.refs ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}
                >
                  (เลือกแล้ว {isRefExpanded ? draftSelectedRefIds.length : linkedRefs.length}/2 รายการ)
                </span>
              </label>

              {/* Collapsible References */}
              <div
                className={`rounded-md overflow-hidden space-y-2 ${errors.refs ? "p-2 border border-red-500 bg-red-50 dark:bg-red-900/10" : ""}`}
              >
                <div
                  className={`border rounded-md transition-all duration-200 ${isRefExpanded
                    ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
                    : "border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50 dark:bg-slate-900/30"
                    }`}
                >
                    {/* Toggle Header */}
                    <div
                      className="flex items-center justify-between p-2 cursor-pointer"
                      onClick={handleToggleReferenceEditor}
                    >
                      <span
                        className={`text-xs font-medium ${isRefExpanded ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}
                      >
                        {isRefExpanded
                          ? "ซ่อนตัวเลือก (Hide Options)"
                          : linkedRefs.length > 0
                            ? "แก้ไขเอกสารอ้างอิง (Update References)"
                            : "+ เพิ่มเอกสารอ้างอิง (Add References)"}
                      </span>
                      {isRefExpanded ? (
                        <ChevronDown className="w-4 h-4 text-blue-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    {/* Selector Content */}
                    {isRefExpanded && (
                      <div className="p-2 border-t border-blue-100 dark:border-blue-800/50">
                        <div className="flex flex-col gap-2 animate-in slide-in-from-top-1">
                          <div className="max-h-[150px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-slate-900 p-1 custom-scrollbar">
                            {availableRefs.length === 0 ? (
                              <div className="text-center py-2 text-xs text-gray-400 italic">
                                ไม่มีเอกสารเพิ่มเติม
                              </div>
                            ) : (
                              availableRefs
                                .map((r) => {
                                  const refId = r.reference.id.toString();
                                  const isSelected = draftSelectedRefIds.includes(refId);
                                  const pageError = draftPageErrors[refId];
                                  return (
                                    <div
                                      key={r.reference.id}
                                      onClick={() => handleToggleDraftReference(refId)}
                                      className={`p-2 rounded cursor-pointer transition-colors border-b border-gray-100 dark:border-slate-800/50 last:border-0 ${isSelected ? "bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700" : "hover:bg-gray-50 dark:hover:bg-slate-800 border-transparent"}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span
                                          className={`text-[10px] font-bold w-5 text-center ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}
                                        >
                                          {r.thai_letter}.
                                        </span>

                                        <div
                                          className={`shrink-0 w-6 h-6 rounded flex items-center justify-center border cursor-default ${isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400"}`}
                                        >
                                          {isSelected ? (
                                            <CheckCircle className="w-4 h-4" />
                                          ) : (
                                            <>
                                              {r.reference.resource_type === "WEBLINK" ? (
                                                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                                              ) : r.reference.resource_type === "VIDEO" ? (
                                                <Video className="w-3.5 h-3.5 text-purple-500" />
                                              ) : r.reference.resource_type === "IMAGE" ? (
                                                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                                              ) : r.reference.resource_type === "AUDIO" ? (
                                                <Mic className="w-3.5 h-3.5 text-orange-500" />
                                              ) : r.reference.resource_type === "TEMPLATE" ? (
                                                <FileDigit className="w-3.5 h-3.5 text-slate-500" />
                                              ) : (
                                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                              )}
                                            </>
                                          )}
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                                            <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded shrink-0">
                                              {r.reference.code}
                                            </span>
                                            <div className="min-w-0 flex-1 flex items-center gap-2">
                                              <Tooltip content={r.reference.title}>
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                  {r.reference.title}
                                                </span>
                                              </Tooltip>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Page
                                              </span>
                                              <input
                                                type="text"
                                                value={draftPageByRefId[refId] || ""}
                                                onChange={(e) => handleDraftPageChange(refId, e.target.value)}
                                                disabled={!isSelected}
                                                aria-invalid={!!pageError}
                                                placeholder={isSelected ? "5 หรือ 2-56" : "เลือก Ref ก่อน"}
                                                className={`w-28 px-2 py-1 h-8 text-xs text-slate-900 dark:text-slate-100 border rounded bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-900/40 dark:disabled:text-slate-500 ${pageError ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"}`}
                                              />
                                            </div>
                                          </div>
                                          {pageError && (
                                            <p className="text-[11px] text-red-600 dark:text-red-400">{pageError}</p>
                                          )}
                                        </div>

                                        <div className="shrink-0 flex items-center gap-2">
                                          {r.usage_count > 0 ? (
                                            <span className="px-2 py-[1px] rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                              Used: {r.usage_count}
                                            </span>
                                          ) : (
                                            <span className="px-2 py-[1px] rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 opacity-80">
                                              Unused
                                            </span>
                                          )}

                                          <Tooltip content={r.reference.classification || "Unclassified"}>
                                            <div className="flex items-center">
                                              {r.reference.classification === "Confidential" ||
                                                r.reference.classification === "Secret" ? (
                                                <LockIcon className="w-3.5 h-3.5 text-red-500" />
                                              ) : r.reference.classification === "Restricted" ? (
                                                <Shield className="w-3.5 h-3.5 text-blue-500" />
                                              ) : (
                                                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                              )}
                                            </div>
                                          </Tooltip>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              เลือกได้สูงสุด 2 รายการ และแก้ไขเลขหน้าได้พร้อมกันในแต่ละแถว
                            </p>
                            <Button
                              variant="outline"
                              size="small"
                              onClick={handleUpdateReferences}
                              disabled={Object.keys(draftPageErrors).length > 0}
                              icon={<Plus className="w-3 h-3" />}
                              className="h-8 text-xs px-3"
                            >
                              Update
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
              </div>
            </>
          )}

          {/* Image Preview (L1 Only for 100/300, L0+L1 for 200) */}
          {showExtraButtons && imagePath && (
            <div className="flex items-center gap-2 pt-1">
              <div className="relative group inline-block">
                <div className="w-16 h-12 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 overflow-hidden">
                  <AsyncImagePreview path={imagePath} className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-1.5 -right-1.5 p-0.5 text-slate-300 hover:text-red-500 rounded bg-white dark:bg-slate-800 shadow-sm transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Answer Key (conditional on toggle — hidden for default 200 L1, hidden when useSubQuestions=true but none selected, hidden when hasParentSubQ but none selected) */}
        {!is300 && !isDefaultL1 && requireAnswerKey
          && !(showSubQuestionEditor && useSubQuestions && activeSubQCodes.length === 0)
          && !(hasParentSubQ && selectedSubQCodes.length === 0)
          && (
            <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2">
              {hasParentSubQ && selectedSubQCodes.length > 0 ? (
                /* Per-subQ answer keys */
                selectedSubQCodes.map((code) => {
                  const sq = parentSubQuestionList!.find(s => s.code === code);
                  const sqIdx = parentSubQuestionList!.findIndex(s => s.code === code);
                  const label = sqIdx >= 0 ? toThaiAlphabet(sqIdx + 1) : code;
                  const hasErr = !!errors.answerKey && !(answerKeys[code] || "").trim();
                  return (
                    <div key={code}>
                      <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                        เฉลย: {label}. {sq?.text && <span className="font-normal normal-case text-slate-400 dark:text-slate-500 ml-1">{sq.text}</span>}
                      </label>
                      <AnswerKeyEditor
                        value={answerKeys[code] || ""}
                        onChange={(val: string) => {
                          setAnswerKeys(prev => ({ ...prev, [code]: val }));
                          if (errors.answerKey) setErrors(prev => ({ ...prev, answerKey: false }));
                        }}
                        hasError={hasErr}
                      />
                    </div>
                  );
                })
              ) : (
                /* Single answer key (no subQ selected) */
                <div>
                  <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    เฉลย (Answer Key)
                  </label>
                  <AnswerKeyEditor
                    value={answerKey}
                    onChange={(val: string) => {
                      setAnswerKey(val);
                      if (errors.answerKey) setErrors((prev) => ({ ...prev, answerKey: false }));
                    }}
                    hasError={!!errors.answerKey}
                  />
                </div>
              )}
            </div>
          )}

        {/* ── Scoring section (hidden when exempted or fixedPracticeL1) ── */}
        {is300 && formScoreType !== 'exempted' && !isFixedPracticeL1 && !((isPerformanceL2 || is306L1) ? (effectiveIsGroupHeader || requiredCount > 0) : effectiveIsGroupHeader) && !isPrerequisiteQuestion && !isPrerequisiteChild && !isSection300Selector && !isSection100Selector && !isSection200Selector && !isExamChild && (
          <div className="rounded-md border border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/20 p-2 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">คะแนน</span>
              {isPerformanceL2 && requiredCount === 0 && !isRequiredInstance ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={formScoreValue}
                    onChange={(e) => setFormScoreValue(e.target.value)}
                    className={`w-16 px-2 py-0.5 text-xs border rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-purple-400 ${parseInt(formScoreValue) === 0
                      ? 'border-red-300 dark:border-red-700 ring-1 ring-red-400'
                      : 'border-purple-300 dark:border-purple-700'
                      }`}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">คะแนน</span>
                  {parseInt(formScoreValue) === 0 && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                      ไม่กำหนดจำนวนครั้ง ต้องกำหนดคะแนน
                    </span>
                  )}
                </div>
              ) : (
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formScoreIsScored}
                    onChange={(e) => setFormScoreIsScored(e.target.checked)}
                    disabled={effectiveIsGroupHeader}
                    className="accent-purple-600 w-3.5 h-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  มีคะแนน (is_scored)
                </label>
              )}
              {formScoreIsScored && !(isPerformanceL2 && requiredCount === 0) && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={formScoreValue}
                    onChange={(e) => setFormScoreValue(e.target.value)}
                    className="w-16 px-2 py-0.5 text-xs border border-purple-300 dark:border-purple-700 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-purple-400"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">คะแนน</span>
                </div>
              )}
            </div>
          </div>
        )}


        {(isPerformanceL2 || is306L1) && !isRequiredInstance && formScoreType !== 'exempted' && (
          <div className="rounded-md border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-950/20 p-2 space-y-2">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">จำนวนครั้งที่ต้องปฏิบัติ</span>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-600 dark:text-slate-300">จำนวนครั้ง</label>
                <button
                  type="button"
                  onClick={() => setRequiredCount(prev => Math.max(0, prev - 1))}
                  className="w-6 h-6 flex items-center justify-center rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-sm font-bold"
                >−</button>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={requiredCount}
                  onChange={(e) => setRequiredCount(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                  className="w-12 px-1 py-0.5 text-xs text-center border border-indigo-300 dark:border-indigo-700 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setRequiredCount(prev => Math.min(20, prev + 1))}
                  className="w-6 h-6 flex items-center justify-center rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-sm font-bold"
                >+</button>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-600 dark:text-slate-300">คะแนน/ครั้ง</label>
                <input
                  type="number"
                  min="0"
                  value={scorePerInstance}
                  onChange={(e) => setScorePerInstance(parseInt(e.target.value) || 0)}
                  className="w-14 px-1 py-0.5 text-xs text-center border border-indigo-300 dark:border-indigo-700 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              {requiredCount > 0 && (
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                  รวม {requiredCount} × {scorePerInstance} = {requiredCount * scorePerInstance} คะแนน
                </span>
              )}
              {(requiredCount > 0 || requiredCountChildren.length > 0) && (existingId || generatedId || parentId) ? (
                <button
                  type="button"
                  onClick={handleSyncRequiredCount}
                  className="px-3 py-1 text-xs font-medium rounded bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                >
                  ✓ อัปเดต
                </button>
              ) : null}
            </div>
            {requiredCountChildren.length > 0 && (
              <div className="mt-2 space-y-2">
                {requiredCountChildren.map((child, idx) => (
                  <div key={child.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pl-2">
                    <span className="text-indigo-500 font-medium">{is306L1 ? `${prefix}.${child.sequence}` : `${toThaiAlphabet(idx + 1)}.`}</span>
                    <span className="flex-1 truncate">{child.content}</span>
                    <span className="text-indigo-500 font-medium">{child.score} คะแนน</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Special handling for 3xx.1.1-3xx.1.3 (Prerequisite Children) */}
        {is300 && isPrerequisiteChild && (
          <div className="rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">การปฏิบัติ</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formScoreType === 'exempted'}
                  onChange={(e) => {
                    const newType = e.target.checked ? 'exempted' : 'normal';
                    setFormScoreType(newType);
                    if (newType === 'exempted') {
                      setFormScoreDisplayText('(ไม่ต้องปฏิบัติ)');
                    }
                  }}
                  className="accent-amber-600 w-3.5 h-3.5"
                />
                ไม่ต้องปฏิบัติ
              </label>
              {formScoreType === 'exempted' && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                  (ไม่ต้องปฏิบัติ)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Section Picker for 3xx.1.3 (300Sections), 3xx.1.4 (100Sections) and 3xx.1.5 (200Sections) — L3 section_ref children */}
        {is300 && (isSection300Selector || isSection100Selector || isSection200Selector) && (
          <div className="rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-2 space-y-2">
            {/* Single checkbox: ปฏิบัติ / ไม่ต้องปฏิบัติ */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">การปฏิบัติ</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formScoreType === 'exempted'}
                  onChange={(e) => {
                    const newType = e.target.checked ? 'exempted' : 'normal';
                    setFormScoreType(newType);
                    if (newType === 'exempted') {
                      setFormScoreDisplayText('(ไม่ต้องปฏิบัติ)');
                    }
                  }}
                  className="accent-amber-600 w-3.5 h-3.5"
                />
                ไม่ต้องปฏิบัติ
              </label>
              {formScoreType === 'exempted' && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                  (ไม่ต้องปฏิบัติ)
                </span>
              )}
            </div>

            {/* When NOT exempted: show section list directly */}
            {formScoreType !== 'exempted' && (
              <div className="space-y-2">
                {/* Section header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    {isSection300Selector ? 'เลือก Section 300 ที่ต้องผ่าน' : isSection100Selector ? 'เลือก Section 100 ที่ต้องผ่าน' : 'เลือก Section 200 ที่ต้องผ่าน'}
                  </span>
                </div>

                {/* Current L3 section-ref children summary with score */}
                {sectionRefChildren.length > 0 && (
                  <div className="space-y-0.5">
                    {sectionRefChildren.map(child => (
                      <div key={child.id} className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300">
                        <span className="font-medium">{child.ref_section_number}</span>
                        <span className="flex-1">{child.content}</span>
                        {/* Show score for 3xx.1.3/3xx.1.4/3xx.1.5 */}
                        {isEdit && (
                          <Tooltip content="คะแนน">
                            <input
                              type="number"
                              min={0}
                              value={child.score}
                              onChange={(e) => {
                                const newScore = parseInt(e.target.value) || 0;
                                setSectionRefChildren(prev => prev.map(c => c.id === child.id ? { ...c, score: newScore } : c));
                              }}
                              onBlur={async (e) => {
                                const newScore = parseInt(e.target.value) || 0;
                                try {
                                  await invoke('update_section_ref_score', { questionId: child.id, score: newScore });
                                } catch (err) { logger.error('Failed to update section ref score:', err); }
                              }}
                              className="w-12 text-center text-xs px-1 py-0.5 border border-purple-200 dark:border-purple-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            />
                          </Tooltip>
                        )}
                        {!isEdit && child.score > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                            {child.score} คะแนน
                          </span>
                        )}
                      </div>
                    ))}
                    {/* Show total score for 3xx.1.3/3xx.1.4/3xx.1.5 */}
                    {(
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-200 border-t border-purple-200 dark:border-purple-700 pt-1 mt-1">
                        <span>รวม</span>
                        <span className="ml-auto">{sectionRefChildren.reduce((sum, c) => sum + c.score, 0)} คะแนน</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Section checkboxes — always visible when ต้องปฏิบัติ, edit mode + saved only */}
                {isEdit && existingId && sectionId ? (
                  <div className="border border-purple-200 dark:border-purple-700 rounded bg-white dark:bg-slate-800 max-h-56 overflow-y-auto">
                    {availableSections.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-400">ไม่พบ Section ในกลุ่มนี้</div>
                    ) : (<>
                      <div className="sticky top-0 z-10 flex gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-800/50">
                        <button type="button" onClick={async () => {
                          const unchecked = availableSections
                            .filter(s => !sectionRefChildren.find(c => c.ref_section_id === s.id))
                            .filter(s => !(currentSectionNumber !== undefined && s.section_number === currentSectionNumber))
                            .filter(s => !backRefSectionIds.has(s.id));
                          if (unchecked.length === 0) return;
                          try {
                            const children = await invoke<SectionRefChild[]>('batch_add_section_ref_children', {
                              args: {
                                parent_id: existingId, document_id: documentId, section_id: sectionId,
                                sections: unchecked.map(s => ({ linked_section_id: s.id, linked_section_number: s.section_number, linked_section_title: s.title_th })),
                              }
                            });
                            setSectionRefChildren(children);
                          } catch (e) { logger.error('Failed to select all:', e); }
                        }} className="text-[10px] px-2 py-0.5 rounded bg-purple-600 text-white hover:bg-purple-700">เลือกทั้งหมด</button>
                        <button type="button" onClick={async () => {
                          try {
                            await invoke('remove_all_section_ref_children', { parentId: existingId });
                            setSectionRefChildren([]);
                          } catch (e) { logger.error('Failed to deselect all:', e); }
                        }} className="text-[10px] px-2 py-0.5 rounded border border-red-300 dark:border-red-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">ยกเลิกทั้งหมด</button>
                      </div>
                      <div className="divide-y divide-purple-100 dark:divide-purple-800/50">
                        {availableSections.map(s => {
                          const existingChild = sectionRefChildren.find(c => c.ref_section_id === s.id);
                          const checked = !!existingChild;
                          // Don't select yourself: disable if this section is the current one
                          const isSelf = currentSectionNumber !== undefined && s.section_number === currentSectionNumber;
                          // Disable if target section already references this section (would create circular)
                          const isBackRef = backRefSectionIds.has(s.id);
                          const isDisabled = isSelf || isBackRef;
                          return (
                            <label key={s.id} className={`flex items-center gap-2 px-3 py-1.5 ${isDisabled ? 'cursor-not-allowed bg-slate-100/60 dark:bg-slate-700/30' : 'cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isDisabled}
                                onChange={async () => {
                                  if (isDisabled) return;
                                  if (checked && existingChild) {
                                    try {
                                      await invoke('remove_section_ref_child', { questionId: existingChild.id });
                                      setSectionRefChildren(prev => prev.filter(c => c.id !== existingChild.id));
                                    } catch (e) { logger.error('Failed to remove section ref child:', e); }
                                  } else {
                                    try {
                                      const newChild = await invoke<SectionRefChild>('add_section_ref_child', {
                                        args: { parent_id: existingId, document_id: documentId, section_id: sectionId, linked_section_id: s.id, linked_section_number: s.section_number, linked_section_title: s.title_th }
                                      });
                                      setSectionRefChildren(prev => [...prev, newChild].sort((a, b) => a.ref_section_number - b.ref_section_number));
                                    } catch (e) { logger.error('Failed to add section ref child:', e); }
                                  }
                                }}
                                className="accent-purple-600 w-3.5 h-3.5 shrink-0"
                              />
                              <span className={`text-xs font-medium shrink-0 ${isDisabled ? 'text-slate-500 dark:text-slate-400' : 'text-purple-600 dark:text-purple-400'}`}>{s.section_number}</span>
                              <span className={`text-xs flex-1 ${isDisabled ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-400 dark:decoration-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{s.title_th}</span>
                              {isSelf && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded shrink-0">(ตัวเอง)</span>}
                              {isBackRef && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded shrink-0">(อ้างอิงสูงกว่า)</span>}
                            </label>
                          );
                        })}
                      </div>
                    </>)}
                  </div>
                ) : (
                  <div className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
                    ⚠ บันทึกก่อน แล้วค่อยเลือก Section
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Group Header Info (Section 300 only) - auto-calc info */}
        {is300 && effectiveIsGroupHeader && !isSection300Selector && (
          <div className="rounded-md border border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/20 p-2">
            <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
              <span className="font-bold uppercase tracking-wider">Group Header</span>
              <span>• คะแนนรวมคำนวณอัตโนมัติจากคำถามย่อย (auto-calc)</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-300 dark:text-slate-600 select-none"></span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="small"
              icon={<X className="w-3 h-3" />}
              onClick={handleCancel}
              className="h-7 text-xs px-2"
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              size="small"
              icon={<Save className="w-3 h-3" />}
              onClick={handleSave}
              className="h-7 text-xs px-2"
            >
              {isEdit ? "บันทึก" : "เพิ่ม"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onConfirm={() => setIsAlertOpen(false)}
        title="แจ้งเตือน"
        message={alertMessage}
        confirmText="ตกลง"
        variant="warning"
        cancelText="" // Hide cancel button
      />

    </div>
  );
};

export default QuestionFormCard;
