import { invoke } from "@tauri-apps/api/tauri";
import {
    FileText,
    Plus,
    Save,
    Trash2,
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
import WorkflowModal from "../modals/WorkflowModal";
import Button from "../ui/Button";
import Tooltip from "../ui/Tooltip";
import AnswerKeyEditor from "./questionFormCard/AnswerKeyEditor";
import ReferenceEditor from "./questionFormCard/ReferenceEditor";
import { SubQuestionListEditor, SubQuestionBindingEditor } from "./questionFormCard/SubQuestionEditor";
import {
  ExemptedCheckbox,
  ExemptedExplainCheckbox,
  ScoreInput,
  RequiredCountInput,
  PrerequisiteExemptedCheckbox,
  SectionPickerEditor
} from "./questionFormCard/QuestionMetadataEditor";
import { logger } from '../../utils/logger';
import AttachmentPanel from "./AttachmentPanel";

import { AnswerKeyRow, CreatorAnswerKeyInput, QuestionFormCardProps, SubQuestionItem } from "./questionFormCard/types";
import {
  EMPTY_REFS,
  REFERENCE_PAGE_ALLOWED_CHARS,
  REFERENCE_PAGE_ERROR_MESSAGE,
  REFERENCE_PAGE_VALID_FORMAT,
} from "./questionFormCard/constants";
import { getThemeColors } from "./questionFormCard/themeColors";
import { useScrollVisibility } from "./questionFormCard/useScrollVisibility";
import { useCreatorFormWorkflow } from "../../hooks/useCreatorFormWorkflow";
import { hasMeaningfulRichText } from "../../utils/richText";
import {
  creatorQuestionService,
  CreatorMappingImpactReport,
} from "../../services/creatorQuestionService";


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
  isInsidePrerequisiteDoc,
  fullPrefix,
  workflowId,
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
  // isPrerequisiteChild targets exactly the L2 children (3xx.1.1 and 3xx.1.2) for Exempted checkbox logic
  const isPrerequisiteChild = is300 && level === 1 && questionSequence !== undefined && questionSequence >= 1 && questionSequence <= 2 && isChildOf1;
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
  const isPrerequisiteSubLevel = is300 && level >= 2 && isInsidePrerequisiteDoc;

  // Accent colors for sub-question theming (orange/amber for 200, purple for 300)
  const sqClr = getThemeColors(is300);
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

  // Phase 5G: Multi-attachment state (replaces single-image system)
  // Backward compat: migrate metadata.image → attachments array on init
  const initialQuestionAttachments = useMemo<string[]>(() => {
    if (parsedInitialMeta?.attachments && Array.isArray(parsedInitialMeta.attachments)) {
      return parsedInitialMeta.attachments.filter((path: unknown): path is string => typeof path === "string");
    }
    // Backward compat: existing single image → first attachment
    if (initialImage) return [initialImage];
    return [];
  }, [initialImage, parsedInitialMeta]);
  const [questionAttachments, setQuestionAttachments] = useState<string[]>(initialQuestionAttachments);
  const draftUploadedAttachmentPathsRef = useRef<Set<string>>(new Set());
  const [currentChildLayout, setCurrentChildLayout] = useState<"list" | "grid">(initialChildLayout);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [isBackgroundSaved, setIsBackgroundSaved] = useState(false);

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
        setScorePerInstance(children[0]?.score || 0);
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
    const syncMeta: Record<string, unknown> = {};
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
  const [isAnswerKeyLoaded, setIsAnswerKeyLoaded] = useState<boolean>(!existingId);

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
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  type DirtyArea = "question" | "description" | "subQuestions" | "references" | "answerKey" | "attachments";
  const [dirtyAreas, setDirtyAreas] = useState<Set<DirtyArea>>(() => new Set());
  const [discardDraftModalOpen, setDiscardDraftModalOpen] = useState(false);
  const [mappingImpact, setMappingImpact] = useState<CreatorMappingImpactReport | null>(null);
  const pendingTransitionRef = useRef<(() => void) | null>(null);
  const { register: registerWorkflow, update: updateWorkflow, release: releaseWorkflow } = useCreatorFormWorkflow();
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ content?: boolean; answerKey?: boolean; refs?: boolean }>(
    {},
  ); // Inline Validation State

  const markDirty = useCallback((area: DirtyArea) => {
    setIsDraftDirty(true);
    setDirtyAreas((previous) => {
      if (previous.has(area)) return previous;
      const next = new Set(previous);
      next.add(area);
      return next;
    });
  }, []);

  const handleQuestionAttachmentsChange = useCallback((next: string[]) => {
    setQuestionAttachments(next);
    markDirty("attachments");
  }, [markDirty]);

  useEffect(() => {
    if (!existingId) {
      setAnswerKey("");
      setAnswerKeys({});
      setIsAnswerKeyLoaded(true);
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
        setIsAnswerKeyLoaded(true);
      })
      .catch(() => {
        setAnswerKey('');
        setAnswerKeys({});
        setIsAnswerKeyLoaded(true);
      });
  }, [existingId]);

  const showExtraButtons = is200or300 ? (level === 0 || level === 1) : isL1; // 200/300: show for L0 & L1, others: L0 only

  // Refs for auto-resizing
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const answerKeyRef = useRef<HTMLTextAreaElement>(null);
  const formCardRef = useScrollVisibility([
    showDescription,
    questionAttachments.length,
    requireRef,
    requireAnswerKey,
    isRefExpanded,
    linkedRefs.length
  ]);

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

  // Fetch Available References
  useEffect(() => {
    if (requireRef && sectionId) {
      invoke<SectionReferenceDetail[]>("get_section_references", { sectionId })
        .then((refs) => setAvailableRefs(refs))
        .catch((err) => logger.error("Failed to fetch section references:", err));
    }
  }, [requireRef, sectionId, usageRefreshKey]);

  const handleToggleReferenceEditor = () => {
    setIsRefExpanded((prev) => !prev);
  };

  const handleToggleDraftReference = (refId: string) => {
    if (draftSelectedRefIds.includes(refId)) {
      markDirty("references");
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

    markDirty("references");
    setDraftSelectedRefIds((prev) => [...prev, refId]);
  };

  const handleDraftPageChange = (refId: string, value: string) => {
    if (!draftSelectedRefIds.includes(refId)) return;

    if (!REFERENCE_PAGE_ALLOWED_CHARS.test(value)) {
      setDraftPageErrors((prev) => ({ ...prev, [refId]: REFERENCE_PAGE_ERROR_MESSAGE }));
      return;
    }

    markDirty("references");
    setDraftPageByRefId((prev) => ({ ...prev, [refId]: value }));
    const trimmed = value.trim();
    setDraftPageErrors((prev) => {
      const next = { ...prev };
      if (!trimmed || REFERENCE_PAGE_VALID_FORMAT.test(trimmed)) delete next[refId];
      else next[refId] = REFERENCE_PAGE_ERROR_MESSAGE;
      return next;
    });
  };

  const buildReferencesFromDraft = (): QuestionReferenceDetail[] => {
    return draftSelectedRefIds.flatMap((refId, index) => {
      const available = availableRefs.find((item) => item.reference.id.toString() === refId);
      const existing = linkedRefs.find((item) => item.reference.id.toString() === refId);
      const reference = available?.reference ?? existing?.reference;
      if (!reference) return [];

      const trimmedPage = (draftPageByRefId[refId] || "").trim();
      return [{
        id: existing?.id || 0,
        question_id: existing?.question_id || existingId || "temp",
        reference_id: reference.id,
        reference,
        location_text: trimmedPage || null,
        display_order: index + 1,
        thai_letter: available?.thai_letter ?? existing?.thai_letter ?? "",
      } satisfies QuestionReferenceDetail];
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

    const nextLinkedRefs = buildReferencesFromDraft();

    setLinkedRefs(nextLinkedRefs);
    setDraftPageErrors({});
    setIsRefExpanded(false);
    if (errors.refs) setErrors((prev) => ({ ...prev, refs: false }));
  };

  // Phase 5G: Question attachment upload/delete handlers for AttachmentPanel
  const handleQuestionAttachmentUpload = useCallback(async (sourcePath: string): Promise<string> => {
    let targetId = existingId;
    if (!targetId) {
      if (generatedId) {
        targetId = generatedId;
      } else {
        targetId = crypto.randomUUID();
        setGeneratedId(targetId);
      }
    }
    const friendlyPrefix = convertThaiToArabic(fullPrefix || prefix);
    const relPath = await invoke<string>("upload_question_image", {
      path: sourcePath,
      documentId: documentId,
      questionId: targetId,
      friendlyPrefix: friendlyPrefix,
    });
    draftUploadedAttachmentPathsRef.current.add(relPath);
    return relPath;
  }, [existingId, generatedId, fullPrefix, prefix, documentId]);

  // AttachmentPanel edits are part of the Question draft. Physical deletion is deferred
  // until the Question save succeeds, so Cancel/Discard can restore the persisted list.
  const deferQuestionAttachmentDelete = useCallback(async (): Promise<void> => undefined, []);

  const deleteAttachmentFiles = useCallback(async (paths: string[]) => {
    await Promise.all(paths.map(async (path) => {
      try {
        await invoke("delete_question_image", { path });
      } catch (err) {
        logger.error("Failed to clean up Question attachment:", err);
      }
    }));
  }, []);

  const cleanupRemovedPersistedAttachments = useCallback(async () => {
    const current = new Set(questionAttachments);
    await deleteAttachmentFiles(initialQuestionAttachments.filter((path) => !current.has(path)));
  }, [deleteAttachmentFiles, initialQuestionAttachments, questionAttachments]);

  const cleanupAddedDraftAttachments = useCallback(async () => {
    await deleteAttachmentFiles(Array.from(draftUploadedAttachmentPathsRef.current));
  }, [deleteAttachmentFiles]);

  const cleanupRemovedDraftUploads = useCallback(async () => {
    const current = new Set(questionAttachments);
    await deleteAttachmentFiles(
      Array.from(draftUploadedAttachmentPathsRef.current).filter((path) => !current.has(path)),
    );
  }, [deleteAttachmentFiles, questionAttachments]);

  const canonicalizeSubQuestionCodes = (codes: string[]): string[] => {
    const unique = Array.from(new Set(codes));
    if (!parentSubQuestionList?.length) return unique;
    const selected = new Set(unique);
    return parentSubQuestionList
      .map((item) => item.code)
      .filter((code) => selected.has(code));
  };

  const buildAnswerKeyItems = (): CreatorAnswerKeyInput[] => {
    if (!requireAnswerKey || is300) return [];
    if (hasParentSubQ && selectedSubQCodes.length > 0) {
      return canonicalizeSubQuestionCodes(selectedSubQCodes).map(code => ({
        subCode: code,
        text: answerKeys[code] || '',
        isRequired: true,
      }));
    }
    return [{ subCode: '', text: answerKey, isRequired: true }];
  };

  const performSave = async (
    showValidationAlert = true,
    confirmMappingChange = false,
  ): Promise<boolean> => {

    // Reset errors
    setErrors({});
    const newErrors: { content?: boolean; answerKey?: boolean; refs?: boolean } = {};
    let hasError = false;
    const currentDraftReferences = requireRef ? buildReferencesFromDraft() : [];
    const referencePageErrors = draftSelectedRefIds.reduce<Record<string, string>>((acc, refId) => {
      const page = (draftPageByRefId[refId] || "").trim();
      if (page && !REFERENCE_PAGE_VALID_FORMAT.test(page)) {
        acc[refId] = REFERENCE_PAGE_ERROR_MESSAGE;
      }
      return acc;
    }, {});

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
        const missingAny = selectedSubQCodes.some(c => !hasMeaningfulRichText(answerKeys[c]));
        if (missingAny) { newErrors.answerKey = true; hasError = true; }
      } else if (!hasMeaningfulRichText(answerKey)) {
        newErrors.answerKey = true;
        hasError = true;
      }
    }
    if (!is300 && !isDefaultL1 && requireRef && currentDraftReferences.length === 0) {
      newErrors.refs = true;
      hasError = true;
    }
    if (!is300 && !isDefaultL1 && requireRef && Object.keys(referencePageErrors).length > 0) {
      newErrors.refs = true;
      hasError = true;
      setDraftPageErrors((previous) => ({ ...previous, ...referencePageErrors }));
      setIsRefExpanded(true);
    }

    if (hasError) {
      setErrors(newErrors);
      // Construct alert message based on errors
      const messages = [];
      if (newErrors.content) messages.push("คำถาม (Question)");
      if (newErrors.answerKey) messages.push("เฉลย (Answer Key)");
      if (newErrors.refs) messages.push("เอกสารอ้างอิง (References)");

      const invalidPageMessage = Object.keys(referencePageErrors).length > 0
        ? `\n\n${REFERENCE_PAGE_ERROR_MESSAGE}`
        : "";
      const missingParts = `กรุณาตรวจสอบข้อมูลต่อไปนี้:\n- ${messages.join("\n- ")}${invalidPageMessage}`;
      if (!showValidationAlert) throw new Error(missingParts);
      if (onAlert) {
        onAlert(missingParts, "warning");
      } else {
        setAlertMessage(missingParts);
        setIsAlertOpen(true);
      }
      return false;
    }

    let newMeta: Record<string, unknown> = {};
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
      const effectiveSelected = canonicalizeSubQuestionCodes([...selectedSubQCodes, ...forcedCodes]);
      if (effectiveSelected.length > 0) newMeta.selectedSubQuestions = effectiveSelected;
      else delete newMeta.selectedSubQuestions;
    }
    // CRITICAL: Always send metadata even if empty to ensure DB update (empty JSON clears metadata)
    const metadataString = Object.keys(newMeta).length > 0 ? JSON.stringify(newMeta) : '{}';

    // Validation: warn if useSubQuestions=true but no active items selected
    if (showSubQuestionEditor && useSubQuestions && effectiveActiveSubQCodes.length === 0) {
      const validationMessage = 'ยังไม่ได้เลือกคำถามย่อยที่ใช้งาน\nต้องเลือกคำถามย่อยอย่างน้อย 1 ข้อก่อนบันทึก';
      if (!showValidationAlert) throw new Error(validationMessage);
      setAlertMessage(validationMessage);
      setIsAlertOpen(true);
      return false;
    }

    // --- Background-saved L2: update existing DB record instead of creating new ---
    if (isBackgroundSaved && !isEdit && generatedId) {
      try {
        // Update L2 content/metadata
        let metaObj: Record<string, unknown> = {};
        if (metadataString) {
          try { metaObj = JSON.parse(metadataString); } catch { }
        }
        // Phase 5G: store attachments array, remove legacy image
        delete metaObj.image;
        if (questionAttachments.length > 0) metaObj.attachments = questionAttachments;
        else delete metaObj.attachments;
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
        await invoke('replace_question_answer_keys', {
          questionId: generatedId,
          items: buildAnswerKeyItems(),
        });
        await cleanupRemovedPersistedAttachments();
        await cleanupRemovedDraftUploads();
      } catch (err) {
        logger.error('Failed to finalize background-saved L2:', err);
      }
      // Refresh tree and close form (silent — avoids full reload flicker in 300 editor)
      onRefresh?.();
      onCancel();
      return true;
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

    // Phase 5G: Inject attachments into metadata before saving
    let finalMeta = metadataString;
    try {
      const metaForSave: Record<string, unknown> = metadataString ? JSON.parse(metadataString) : {};
      delete metaForSave.image; // Remove legacy single-image field
      if (questionAttachments.length > 0) metaForSave.attachments = questionAttachments;
      else delete metaForSave.attachments;
      finalMeta = Object.keys(metaForSave).length > 0 ? JSON.stringify(metaForSave) : '{}';
    } catch { /* keep metadataString as-is */ }

    const answerKeyItems = buildAnswerKeyItems();
    if (sectionGroup === 200 && isEdit && existingId && !confirmMappingChange) {
      let proposedSubQuestionCodes: string[] = [];
      try {
        const parsed = JSON.parse(finalMeta) as { selectedSubQuestions?: unknown };
        if (Array.isArray(parsed.selectedSubQuestions)) {
          proposedSubQuestionCodes = parsed.selectedSubQuestions.filter(
            (code): code is string => typeof code === "string",
          );
        }
      } catch {
        // Backend remains authoritative and will report malformed metadata.
      }
      const impact = await creatorQuestionService.analyzeChange({
        questionId: existingId,
        documentId,
        proposedSubQuestionCodes,
        proposedAnswerKeys: answerKeyItems,
      });
      if (impact.isBlocked || impact.requiresConfirmation) {
        setDiscardDraftModalOpen(false);
        setMappingImpact(impact);
        return false;
      }
    }

    await onSave({
      content,
      description: showExtraButtons ? description : undefined,
      image: undefined, // Legacy field — no longer used
      id: !isEdit ? questionId : undefined,
      references: currentDraftReferences,
      metadata: finalMeta,
      answerKeys: answerKeyItems,
      confirmMappingChange,
      childLayout: showExtraButtons ? currentChildLayout : undefined,
    });

    await cleanupRemovedPersistedAttachments();
    await cleanupRemovedDraftUploads();

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

    setIsDraftDirty(false);
    setDirtyAreas(new Set());
    // Close form after save completes
    onCancel();
    return true;
  };

  const saveDraft = async (
    showFailureAlert = true,
    confirmMappingChange = false,
  ): Promise<boolean> => {
    if (isSaving) return false;
    setIsSaving(true);
    try {
      return await performSave(showFailureAlert, confirmMappingChange);
    } catch (error) {
      logger.error('Creator Question save failed:', error);
      if (!showFailureAlert) throw error;
      setAlertMessage(`ไม่สามารถบันทึก Question และ Answer Key ได้\nข้อมูลร่างยังอยู่ กรุณาตรวจสอบแล้วลองอีกครั้ง\n\nรายละเอียด: ${String(error)}`);
      setIsAlertOpen(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    void saveDraft();
  };

  // Cleanup background-saved L2 if user cancels
  const discardDraft = useCallback(async () => {
    await cleanupAddedDraftAttachments();
    if (isBackgroundSaved && generatedId) {
      try {
        await invoke('delete_question', { id: generatedId });
      } catch (err) {
        logger.error('Failed to cleanup background-saved L2:', err);
      }
    }
    onCancel();
  }, [cleanupAddedDraftAttachments, isBackgroundSaved, generatedId, onCancel]);

  const handleCancel = useCallback(() => {
    if (isDraftDirty) {
      pendingTransitionRef.current = null;
      setDiscardDraftModalOpen(true);
      return;
    }
    void discardDraft();
  }, [discardDraft, isDraftDirty]);

  const requestWorkflowTransition = useCallback((proceed: () => void) => {
    if (isSaving) return;
    if (isDraftDirty) {
      pendingTransitionRef.current = proceed;
      setDiscardDraftModalOpen(true);
      return;
    }

    void discardDraft().then(proceed);
  }, [discardDraft, isDraftDirty, isSaving]);

  useEffect(() => {
    if (!workflowId) return;
    registerWorkflow(workflowId, requestWorkflowTransition);
    return () => releaseWorkflow(workflowId);
  }, [registerWorkflow, releaseWorkflow, requestWorkflowTransition, workflowId]);

  useEffect(() => {
    if (workflowId) updateWorkflow(workflowId, requestWorkflowTransition);
  }, [requestWorkflowTransition, updateWorkflow, workflowId]);

  const keepEditing = useCallback(() => {
    pendingTransitionRef.current = null;
    setDiscardDraftModalOpen(false);
  }, []);

  const discardAndProceed = useCallback(async () => {
    const proceed = pendingTransitionRef.current;
    pendingTransitionRef.current = null;
    setDiscardDraftModalOpen(false);
    await discardDraft();
    proceed?.();
  }, [discardDraft]);

  const saveAndProceed = async () => {
    const proceed = pendingTransitionRef.current;
    const saved = await saveDraft(false);
    if (!saved) return;
    pendingTransitionRef.current = null;
    setDiscardDraftModalOpen(false);
    proceed?.();
  };

  const closeMappingImpact = useCallback(() => {
    pendingTransitionRef.current = null;
    setMappingImpact(null);
  }, []);

  const confirmMappingImpact = async () => {
    const proceed = pendingTransitionRef.current;
    const saved = await saveDraft(false, true);
    if (!saved) return;
    pendingTransitionRef.current = null;
    setMappingImpact(null);
    proceed?.();
  };

  const dirtyAreaLabels = [
    ["question", "คำถาม (Question)"],
    ["description", "คำอธิบาย (Description)"],
    ["subQuestions", "คำถามย่อย (Sub-questions)"],
    ["references", "เอกสารอ้างอิง (References)"],
    ["answerKey", "คำเฉลย (Answer Key)"],
    ["attachments", "ไฟล์แนบ (Attachments)"],
  ].filter(([area]) => dirtyAreas.has(area as DirtyArea)).map(([, label]) => label);
  const unsavedDraftMessage = `ข้อ ${fullPrefix || prefix} มีการแก้ไขที่ยังไม่ได้บันทึก:\n${
    (dirtyAreaLabels.length > 0 ? dirtyAreaLabels : ["รายละเอียดในฟอร์ม"])
      .map((label) => `• ${label}`)
      .join("\n")
  }\n\nเลือกสิ่งที่ต้องการทำก่อนออกจากฟอร์มนี้`;

  const mappingImpactMessage = mappingImpact
    ? [
        `คุณกำลังนำคำถามย่อยต่อไปนี้ออกจากข้อ ${fullPrefix || prefix}:`,
        ...mappingImpact.items.map((item) => {
          const subQuestionIndex = parentSubQuestionList?.findIndex(
            (subQuestion) => subQuestion.code === item.subQuestionCode,
          ) ?? -1;
          const subQuestionLabel = subQuestionIndex >= 0
            ? `${toThaiAlphabet(subQuestionIndex + 1)}.`
            : item.subQuestionCode;
          const description = item.label ? ` ${item.label}` : "";
          return [
            `• คำถามย่อย ${subQuestionLabel}${description}`,
            `  คำเฉลยที่จะถูกนำออก ${item.answerKeyCount} รายการ`,
            `  คำตอบ Trainee ${item.traineeAnswerCount} · ผลประเมิน ${item.assessedAnswerCount} · ไฟล์แนบ ${item.attachmentCount}`,
          ].join("\n");
        }),
        mappingImpact.isBlocked
          ? "\nไม่สามารถนำคำถามย่อยนี้ออกได้ เพราะมีงานของ Trainee อยู่แล้ว ระบบยังไม่ได้เปลี่ยนหรือลบข้อมูลใด ๆ\nเลือก “กลับไปแก้ไข” แล้วเลือกคำถามย่อยนั้นกลับคืน"
          : "\nขณะนี้ยังเป็นเพียง Draft และยังไม่มีข้อมูลถูกนำออก\n\n“กลับไปตรวจสอบ” — กลับสู่ฟอร์มโดยคง Draft ไว้ หากไม่ต้องการนำออก ให้เลือกคำถามย่อยนั้นกลับ แล้วคำเฉลยเดิมจะปรากฏอีกครั้ง\n\n“นำออกและบันทึก” — นำคำถามย่อยและคำเฉลยตามรายการข้างต้นออกจากเอกสารต้นฉบับฉบับนี้ ส่วน Simulation ที่สร้างแยกไว้แล้วจะไม่ถูกเปลี่ยนแปลง",
      ].join("\n")
    : "";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (isSaving) return;
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
    const isSaveShortcut = (e.ctrlKey || e.metaKey)
      && (e.code === "KeyS" || e.key.toLowerCase() === "s");
    if (isSaveShortcut) {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
      return;
    }
    if (e.key === "Enter" && e.ctrlKey) handleSave();
  };

  return (
    <div
      ref={formCardRef}
      onInput={() => setIsDraftDirty(true)}
      onChange={() => setIsDraftDirty(true)}
      onKeyDown={handleKeyDown}
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
                  onClick={() => {
                    setShowDescription(true);
                    markDirty("description");
                  }}
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              </Tooltip>

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

        {isDraftDirty && dirtyAreaLabels.length > 0 && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-1.5 rounded-md border border-amber-400/60 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-600/50 dark:bg-amber-950/25 dark:text-amber-200"
          >
            <span className="font-semibold">ยังไม่ได้บันทึก:</span>
            {dirtyAreaLabels.map((label) => (
              <span key={label} className="rounded-full bg-amber-200/70 px-2 py-0.5 dark:bg-amber-900/60">
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Content (Main Question) - Compact & Auto-expanding */}
        {!isRequiredInstance && <div>
          <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            คำถาม (Question) <span className="text-red-500">*</span>
            {dirtyAreas.has("question") && <span className="ml-2 text-amber-500 normal-case">แก้ไขแล้ว</span>}
          </label>
          <textarea
            ref={contentRef}
            autoFocus={!isDefaultL1}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              markDirty("question");
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
              markDirty("question");

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
        <ExemptedCheckbox
          is300={is300} isRequiredInstance={isRequiredInstance} isPrerequisiteQuestion={isPrerequisiteQuestion}
          isPrerequisiteChild={isPrerequisiteChild} isSection300Selector={isSection300Selector}
          isSection100Selector={isSection100Selector} isSection200Selector={isSection200Selector}
          isExamChild={isExamChild} isFixedPracticeL1={isFixedPracticeL1} isPerformanceL2={isPerformanceL2}
          isInsidePrerequisiteDoc={isInsidePrerequisiteDoc} isPrerequisiteSubLevel={isPrerequisiteSubLevel}
          formScoreType={formScoreType} setFormScoreType={setFormScoreType}
          setFormScoreDisplayText={setFormScoreDisplayText} setFormScoreIsScored={setFormScoreIsScored}
          setFormScoreValue={setFormScoreValue} setDescription={setDescription}
          setShowDescription={setShowDescription} setUseSubQuestions={setUseSubQuestions}
          setRequiredCount={setRequiredCount} setRequiredCountChildren={setRequiredCountChildren}
          questionAttachments={questionAttachments} setQuestionAttachments={handleQuestionAttachmentsChange}
          handleQuestionAttachmentDelete={deferQuestionAttachmentDelete}
          isL1={isL1} hasActualChildren={hasActualChildren}
        />

        {/* ── 200-series: all L1 start as "(ไม่ต้องอธิบาย)"; 2xx.2/2xx.4 add default descriptions when activated ── */}
        <ExemptedExplainCheckbox
          isExemptableL1_200={isExemptableL1_200} formScoreType={formScoreType} setFormScoreType={setFormScoreType}
          setFormScoreDisplayText={setFormScoreDisplayText} setDescription={setDescription}
          setShowDescription={setShowDescription} setUseSubQuestions={setUseSubQuestions}
          questionAttachments={questionAttachments} setQuestionAttachments={handleQuestionAttachmentsChange}
          handleQuestionAttachmentDelete={deferQuestionAttachmentDelete}
          isDefaultDescL1_200={isDefaultDescL1_200} questionSequence={questionSequence}
          isL1={isL1} hasActualChildren={hasActualChildren}
        />

        {/* Form Extras */}
        <div className="space-y-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
          {/* Description - L1 Only for 100/300, L0+L1 for 200 (Optional) */}
          {showExtraButtons && showDescription && (
            <div className="group/desc animate-in slide-in-from-top-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                คำอธิบาย (Description)
                {dirtyAreas.has("description") && <span className="ml-2 text-amber-500 normal-case">แก้ไขแล้ว</span>}
              </label>
              <div className="relative">
                <textarea
                  ref={descriptionRef}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    markDirty("description");
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
                    setDescription(newValue);
                    markDirty("description");

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
                        markDirty("description");
                      }}
                      type="button"
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
            <SubQuestionListEditor
              sqClr={sqClr}
              useSubQuestions={useSubQuestions}
              setUseSubQuestions={setUseSubQuestions}
              setActiveSubQCodes={setActiveSubQCodes}
              formScoreType={formScoreType}
              setFormScoreType={setFormScoreType}
              setFormScoreIsScored={setFormScoreIsScored}
              setEffectiveIsGroupHeader={setEffectiveIsGroupHeader}
              sectionOccupationBranches={sectionOccupationBranches}
              sectionSelectedBranch={sectionSelectedBranch}
              selMainBranch={selMainBranch}
              setSelMainBranch={setSelMainBranch}
              selSubBranch={selSubBranch}
              setSelSubBranch={setSelSubBranch}
              dbBranches={dbBranches}
              dbSubBranches={dbSubBranches}
              autoCodePrefix={autoCodePrefix}
              filteredItems={filteredItems}
              dbSubQuestions={dbSubQuestions}
              setDbSubQuestions={setDbSubQuestions}
              is300={is300}
              isProtectedBranch={isProtectedBranch}
              subQuestionList={subQuestionList}
              setSubQuestionList={setSubQuestionList}
              activeSubQCodes={activeSubQCodes}
            />
          )}

          {/* ── SubQuestion Binding (children of L1 with SubQuestionList) ── */}
          {hasParentSubQ && parentSubQuestionList && (
            <SubQuestionBindingEditor
              sqClr={sqClr}
              selectedSubQCodes={selectedSubQCodes}
              setSelectedSubQCodes={(next) => {
                markDirty("subQuestions");
                setSelectedSubQCodes(next);
              }}
              parentSubQuestionList={parentSubQuestionList}
              is300={is300}
              subQUsageData={subQUsageData}
              isDirty={dirtyAreas.has("subQuestions")}
            />
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
                      markDirty("references");
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
                      markDirty("answerKey");
                      if (!e.target.checked) {
                        setAnswerKey("");
                        setAnswerKeys({});
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
              <ReferenceEditor
                isExpanded={isRefExpanded}
                draftSelectedRefIds={draftSelectedRefIds}
                hasError={!!errors.refs}
                isDirty={dirtyAreas.has("references")}
                availableRefs={availableRefs}
                draftPageErrors={draftPageErrors}
                draftPageByRefId={draftPageByRefId}
                onToggleExpand={handleToggleReferenceEditor}
                onToggleDraftRef={handleToggleDraftReference}
                onDraftPageChange={handleDraftPageChange}
                onUpdateReferences={handleUpdateReferences}
              />
            </>
          )}

          {/* Phase 5G: Question Attachments Panel (Image/PDF/Video) */}
          {showExtraButtons && !isInsidePrerequisiteDoc && !is300 && (
            <div className="pt-1">
              {dirtyAreas.has("attachments") && (
                <div className="mb-1 text-xs font-bold text-amber-500">ไฟล์แนบ (Attachments) แก้ไขแล้ว</div>
              )}
              <AttachmentPanel
                attachments={questionAttachments}
                onAttachmentsChange={handleQuestionAttachmentsChange}
                documentId={documentId}
                questionId={existingId || generatedId || ''}
                userId=""
                excludeAudio
                onUploadFile={handleQuestionAttachmentUpload}
                onDeleteFile={deferQuestionAttachmentDelete}
                filePrefix={fullPrefix || prefix}
              />
            </div>
          )}
        </div>

        {/* Answer Key (conditional on toggle — hidden for default 200 L1, hidden when useSubQuestions=true but none selected, hidden when hasParentSubQ but none selected) */}
        {!is300 && !isDefaultL1 && requireAnswerKey && !isInsidePrerequisiteDoc
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
                  const hasErr = !!errors.answerKey && !hasMeaningfulRichText(answerKeys[code]);
                  return (
                    <div key={code}>
                      <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                        เฉลย: {label}. <span className="text-red-500">*</span> {sq?.text && <span className="font-normal normal-case text-slate-400 dark:text-slate-500 ml-1">{sq.text}</span>}
                        {dirtyAreas.has("answerKey") && <span className="ml-2 text-amber-500 normal-case">แก้ไขแล้ว</span>}
                      </label>
                      {isAnswerKeyLoaded ? (
                        <AnswerKeyEditor
                          value={answerKeys[code] || ""}
                          onChange={(val: string) => {
                            setAnswerKeys(prev => ({ ...prev, [code]: val }));
                            markDirty("answerKey");
                            if (errors.answerKey && hasMeaningfulRichText(val)) setErrors(prev => ({ ...prev, answerKey: false }));
                          }}
                          hasError={hasErr}
                        />
                      ) : (
                        <div className="h-[90px] w-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700" />
                      )}
                    </div>
                  );
                })
              ) : (
                /* Single answer key (no subQ selected) */
                <div>
                  <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    เฉลย (Answer Key) <span className="text-red-500">*</span>
                    {dirtyAreas.has("answerKey") && <span className="ml-2 text-amber-500 normal-case">แก้ไขแล้ว</span>}
                  </label>
                  {isAnswerKeyLoaded ? (
                    <AnswerKeyEditor
                      value={answerKey}
                      onChange={(val: string) => {
                        setAnswerKey(val);
                        markDirty("answerKey");
                        if (errors.answerKey && hasMeaningfulRichText(val)) setErrors((prev) => ({ ...prev, answerKey: false }));
                      }}
                      hasError={!!errors.answerKey}
                    />
                  ) : (
                    <div className="h-[90px] w-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700" />
                  )}
                </div>
              )}
            </div>
          )}

        {/* ── Scoring section (hidden when exempted or fixedPracticeL1) ── */}
        {!isInsidePrerequisiteDoc && (
          <ScoreInput
            is300={is300} formScoreType={formScoreType} isFixedPracticeL1={isFixedPracticeL1}
            isPerformanceL2={isPerformanceL2} is306L1={is306L1} effectiveIsGroupHeader={effectiveIsGroupHeader}
            requiredCount={requiredCount} isPrerequisiteQuestion={isPrerequisiteQuestion}
            isPrerequisiteChild={isPrerequisiteChild} isSection300Selector={isSection300Selector}
            isSection100Selector={isSection100Selector} isSection200Selector={isSection200Selector}
            isExamChild={isExamChild} isRequiredInstance={isRequiredInstance}
            formScoreValue={formScoreValue} setFormScoreValue={setFormScoreValue}
            formScoreIsScored={formScoreIsScored} setFormScoreIsScored={setFormScoreIsScored}
          />
        )}

        <RequiredCountInput
          isPerformanceL2={isPerformanceL2} is306L1={is306L1} isRequiredInstance={isRequiredInstance}
          formScoreType={formScoreType} requiredCount={requiredCount} setRequiredCount={setRequiredCount}
          scorePerInstance={scorePerInstance} setScorePerInstance={setScorePerInstance}
          requiredCountChildren={requiredCountChildren} existingId={existingId}
          generatedId={generatedId} parentId={parentId} handleSyncRequiredCount={handleSyncRequiredCount}
          prefix={prefix}
        />

        {/* Special handling for 3xx.1.1-3xx.1.3 (Prerequisite Children) */}
        <PrerequisiteExemptedCheckbox
          is300={is300} isPrerequisiteChild={isPrerequisiteChild}
          formScoreType={formScoreType} setFormScoreType={setFormScoreType}
          setFormScoreDisplayText={setFormScoreDisplayText}
        />

        {/* Section Picker for 3xx.1.3 (300Sections), 3xx.1.4 (100Sections) and 3xx.1.5 (200Sections) — L3 section_ref children */}
        <SectionPickerEditor
          is300={is300} isSection300Selector={isSection300Selector} isSection100Selector={isSection100Selector}
          isSection200Selector={isSection200Selector} formScoreType={formScoreType}
          setFormScoreType={setFormScoreType} setFormScoreDisplayText={setFormScoreDisplayText}
          sectionRefChildren={sectionRefChildren} setSectionRefChildren={setSectionRefChildren}
          isEdit={isEdit} existingId={existingId} sectionId={sectionId} availableSections={availableSections}
          currentSectionNumber={currentSectionNumber} backRefSectionIds={backRefSectionIds} documentId={documentId}
        />

        {/* Group Header Info (Section 300 only) - auto-calc info */}
        {is300 && effectiveIsGroupHeader && !isSection300Selector && formScoreType !== 'exempted' && !isPrerequisiteChild && (
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
              disabled={isSaving}
              className="h-7 text-xs px-2"
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              size="small"
              icon={<Save className="w-3 h-3" />}
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 text-xs px-2"
            >
              {isSaving ? "กำลังบันทึก..." : (isEdit ? "บันทึก" : "เพิ่ม")}
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

      <WorkflowModal
        isOpen={discardDraftModalOpen}
        onClose={keepEditing}
        title="การแก้ไขยังไม่ได้บันทึก"
        message={unsavedDraftMessage}
        actions={[
          {
            id: "continue",
            label: "แก้ไขต่อ",
            onSelect: keepEditing,
            variant: "secondary",
          },
          {
            id: "discard",
            label: "ละทิ้งการแก้ไข",
            onSelect: discardAndProceed,
            variant: "danger",
          },
          {
            id: "save",
            label: pendingTransitionRef.current ? "บันทึกแล้วไปข้อใหม่" : "บันทึก",
            onSelect: saveAndProceed,
            variant: "primary",
          },
        ]}
      />

      <WorkflowModal
        isOpen={mappingImpact !== null}
        onClose={closeMappingImpact}
        title={mappingImpact?.isBlocked
          ? "ไม่สามารถนำคำถามย่อยนี้ออกได้"
          : `ยืนยันการนำคำถามย่อยออกจากข้อ ${fullPrefix || prefix}`}
        message={mappingImpactMessage}
        actions={mappingImpact?.isBlocked
          ? [
              {
                id: "back",
                label: "กลับไปแก้ไข",
                onSelect: closeMappingImpact,
                variant: "primary",
              },
            ]
          : [
              {
                id: "back",
                label: "กลับไปตรวจสอบ",
                onSelect: closeMappingImpact,
                variant: "secondary",
              },
              {
                id: "confirm",
                label: "นำออกและบันทึก",
                onSelect: confirmMappingImpact,
                variant: "danger",
              },
            ]}
      />

    </div>
  );
};

export default QuestionFormCard;
