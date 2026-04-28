import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open as openDialog } from "@tauri-apps/api/dialog";
import { logger } from '../../../utils/logger';
import { QuestionReferenceDetail, SectionReferenceDetail } from "../../../types/content";
import { 
  QuestionFormCardProps, 
  SectionItem, 
  SectionRefChild, 
  RequiredCountChild, 
  DbBranch, 
  DbSubBranch, 
  DbSubQuestion, 
  SubQuestionItem,
  AnswerKeyRow,
  SubQuestionUsageResponse,
  EMPTY_REFS,
  DEFAULT_L1_DESC_BY_SEQ,
  REFERENCE_PAGE_VALID_FORMAT,
  REFERENCE_PAGE_ERROR_MESSAGE,
  REFERENCE_PAGE_ALLOWED_CHARS
} from './types';
import { convertThaiToArabic } from "../../../utils/thaiNumbering";
import { useScrollVisibility } from './useScrollVisibility';

export const useQuestionForm = (props: QuestionFormCardProps) => {
  const {
    prefix, level, sectionGroup = 100, isDefaultL1 = false,
    initialContent = "", initialDescription = "", initialImage = "", initialMetadata = null,
    initialReferences = EMPTY_REFS, onSave, onCancel, documentId, existingId, parentId,
    sectionId, onAlert, childLayout: initialChildLayout = "list", questionSequence,
    parentSubQuestionList, sectionOccupationBranches, sectionSelectedBranch,
    initialScore = 0, initialIsScored = false, initialQuestionType = 'normal',
    initialDisplayText = '', initialIsGroupHeader = false, onRefresh,
    usageRefreshKey = 0, subQUsageParentId, currentSectionNumber,
  } = props;

  const is200 = sectionGroup === 200;
  const is300 = sectionGroup === 300;
  const is200or300 = is200 || is300;
  const isL1 = level === 0;
  const isEdit = !!existingId;

  // Refs
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  // Parse initialMetadata once
  const parsedInitialMeta = useMemo(() => {
    if (!initialMetadata) return null;
    try { return JSON.parse(initialMetadata); } catch { return null; }
  }, [initialMetadata]);

  // State
  const [content, setContent] = useState(initialContent);
  const [description, setDescription] = useState(initialDescription);
  const [imagePath, setImagePath] = useState<string | null>(initialImage || null);
  const [currentChildLayout, setCurrentChildLayout] = useState<"list" | "grid">(initialChildLayout);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [isBackgroundSaved, setIsBackgroundSaved] = useState(false);
  const [pendingImageUpload, setPendingImageUpload] = useState<string | null>(null);
  const [pendingImageDelete, setPendingImageDelete] = useState<boolean>(false);
  const [originalImagePath] = useState<string | null>(initialImage || null);
  const [formScoreIsScored, setFormScoreIsScored] = useState<boolean>(initialIsScored);
  const [formScoreValue, setFormScoreValue] = useState<string>(initialScore.toString());
  const [formScoreType, setFormScoreType] = useState<string>(initialQuestionType);
  const [formScoreDisplayText, setFormScoreDisplayText] = useState<string>(initialDisplayText || '');
  const [availableSections, setAvailableSections] = useState<SectionItem[]>([]);
  const [sectionRefChildren, setSectionRefChildren] = useState<SectionRefChild[]>([]);
  const [backRefSectionIds, setBackRefSectionIds] = useState<Set<number>>(new Set());
  const [requiredCountChildren, setRequiredCountChildren] = useState<RequiredCountChild[]>([]);
  const [requiredCount, setRequiredCount] = useState<number>(0);
  const [scorePerInstance, setScorePerInstance] = useState<number>(initialScore);
  const [effectiveIsGroupHeader, setEffectiveIsGroupHeader] = useState<boolean>(initialIsGroupHeader);
  const [hasActualChildren, setHasActualChildren] = useState<boolean>(false);
  const [dbBranches, setDbBranches] = useState<DbBranch[]>([]);
  const [dbSubBranches, setDbSubBranches] = useState<DbSubBranch[]>([]);
  const [dbSubQuestions, setDbSubQuestions] = useState<DbSubQuestion[]>([]);
  const [activeSubQCodes, setActiveSubQCodes] = useState<string[]>([]);
  const [selectedSubQCodes, setSelectedSubQCodes] = useState<string[]>([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [availableRefs, setAvailableRefs] = useState<SectionReferenceDetail[]>([]);
  const [linkedRefs, setLinkedRefs] = useState<QuestionReferenceDetail[]>(initialReferences);
  const [isRefExpanded, setIsRefExpanded] = useState(false);
  const [draftSelectedRefIds, setDraftSelectedRefIds] = useState<string[]>([]);
  const [draftPageByRefId, setDraftPageByRefId] = useState<Record<string, string>>({});
  const [draftPageErrors, setDraftPageErrors] = useState<Record<string, string>>({});
  const [subQUsageData, setSubQUsageData] = useState<SubQuestionUsageResponse>({ usage_map: {}, total_children: 0 });
  const [answerKey, setAnswerKey] = useState<string>("");
  const [answerKeys, setAnswerKeys] = useState<Record<string, string>>({});

  const [selMainBranch, setSelMainBranch] = useState<string>(() => sectionSelectedBranch ? sectionSelectedBranch.main : parsedInitialMeta?.selectedBranch?.main || "");
  const [selSubBranch, setSelSubBranch] = useState<string>(() => sectionSelectedBranch ? sectionSelectedBranch.sub : parsedInitialMeta?.selectedBranch?.sub || "");

  const [useSubQuestions, setUseSubQuestions] = useState<boolean>(() => parsedInitialMeta?.useSubQuestions === true);
  const [subQuestionList, setSubQuestionList] = useState<SubQuestionItem[]>(() => Array.isArray(parsedInitialMeta?.subQuestionList) ? parsedInitialMeta.subQuestionList : []);
  const [requireRef, setRequireRef] = useState<boolean>(() => {
    if (parsedInitialMeta?.requireRef !== undefined) return parsedInitialMeta.requireRef;
    return is300 ? false : true;
  });
  const [requireAnswerKey, setRequireAnswerKey] = useState<boolean>(() => {
    if (parsedInitialMeta?.requireAnswerKey !== undefined) return parsedInitialMeta.requireAnswerKey;
    return is300 ? false : true;
  });

  const isPrerequisiteQuestion = !!(is300 && questionSequence && isL1 && questionSequence === 1);
  const isChildOf1 = prefix.includes('.๑.') || prefix.includes('.1.');
  const isChildOf7 = prefix.includes('.๗.') || prefix.includes('.7.');
  const isPrerequisiteChild = !!(is300 && !isL1 && questionSequence !== undefined && questionSequence >= 1 && questionSequence <= 2 && isChildOf1);
  const isSection300Selector = !!(is300 && !isL1 && questionSequence === 3 && isChildOf1);
  const isSection100Selector = !!(is300 && !isL1 && questionSequence === 4 && isChildOf1);
  const isSection200Selector = !!(is300 && !isL1 && questionSequence === 5 && isChildOf1);
  const isExamChild = !!(is300 && !isL1 && isChildOf7);
  const is306L1 = !!(is300 && isL1 && questionSequence === 6);
  const isFixedPracticeL1 = !!(is300 && isL1 && questionSequence !== undefined && questionSequence >= 7);
  const isDefaultDescL1 = !!(is300 && isL1 && questionSequence !== undefined && questionSequence >= 2 && questionSequence <= 6);
  const isExemptableL1_200 = !!(is200 && isL1);
  const isDefaultDescL1_200 = !!(isExemptableL1_200 && (questionSequence === 2 || questionSequence === 4));
  const isRequiredInstance = is300 && initialQuestionType === 'required_instance';
  const isPerformanceL2 = !!(is300 && level === 1 && !isPrerequisiteChild && !isSection300Selector && !isSection100Selector && !isSection200Selector && !isExamChild);
  const hasParentSubQ = !!(parentSubQuestionList && parentSubQuestionList.length > 0);
  const isProtectedBranch = useMemo(() => {
    const branch = dbBranches.find(b => b.code === (selMainBranch || ""));
    return branch?.name === 'ต้นแบบมาตรฐาน';
  }, [dbBranches, selMainBranch]);

  const [showDescription, setShowDescription] = useState(() => {
    if (initialQuestionType === 'exempted') return false;
    if (isPrerequisiteQuestion || isSection300Selector || isSection100Selector || isSection200Selector || isDefaultDescL1 || isDefaultDescL1_200) return true;
    return !!initialDescription;
  });

  const baseShowSubQuestionEditor = !!(level === 0 && ((is200 && (questionSequence === 2 || questionSequence === 4)) || (is300 && questionSequence && questionSequence >= 2 && questionSequence <= 5)));
  const [showSubQuestionEditor, setShowSubQuestionEditor] = useState(() => baseShowSubQuestionEditor && !(isPrerequisiteQuestion && formScoreType === 'exempted') && !(isPrerequisiteChild && formScoreType === 'exempted') && !(isDefaultDescL1_200 && formScoreType === 'exempted') && !(isDefaultDescL1 && formScoreType === 'exempted'));

  const showExtraButtons = is200or300 ? (level === 0 || level === 1) : isL1;

  // Hooks
  useScrollVisibility(formCardRef, [showDescription, imagePath, requireRef, requireAnswerKey, isRefExpanded, linkedRefs.length]);

  // Effects
  useEffect(() => {
    if (isPrerequisiteQuestion) setDescription("เพื่อให้การทดสอบตาม มาตรฐานกำลังพลเกิดประโยชน์สูงสุดและสำเร็จตามวัตถุประสงค์ ผู้เข้ารับการทดสอบต้องมีคุณสมบัติ ดังต่อไปนี้");
    else if (isSection300Selector) setDescription("การปฏิบัติหน้าที่ในตำแหน่งนี้ ต้องผ่าน การปฏิบัติหน้าที่ ที่กำหนด ดังนี้");
    else if (isSection100Selector) setDescription("การปฏิบัติหน้าที่ในตำแหน่งนี้ ต้องผ่าน การทดสอบความรู้พื้นฐาน ที่กำหนด ดังนี้");
    else if (isSection200Selector) setDescription("การปฏิบัติหน้าที่ในตำแหน่งนี้ ต้องผ่าน การทดสอบระบบ ที่กำหนด ดังนี้");
    else if (isDefaultDescL1 && questionSequence !== undefined) setDescription(DEFAULT_L1_DESC_BY_SEQ[questionSequence] || '');
    else if (isDefaultDescL1_200 && questionSequence !== undefined) {
      const DEFAULT_200_DESC: Record<number, string> = { 2: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคำถามที่กำหนด', 4: 'จงอธิบายค่าทำงานปกติ ค่าสูงสุด ต่ำสุด ของการทำงาน ตามรายการที่กำหนด' };
      setDescription(DEFAULT_200_DESC[questionSequence] || '');
    }
  }, [isPrerequisiteQuestion, isSection300Selector, isSection100Selector, isSection200Selector, isDefaultDescL1, isDefaultDescL1_200, questionSequence]);

  useEffect(() => {
    if (existingId) {
      invoke<AnswerKeyRow[]>('get_question_answer_keys', { questionId: existingId }).then(rows => {
        const single = rows.find(r => (r.sub_question_code || '') === '');
        const multi = rows.filter(r => (r.sub_question_code || '') !== '').sort((a, b) => a.order_index - b.order_index).reduce<Record<string, string>>((acc, row) => { acc[row.sub_question_code] = row.answer_key_text || ''; return acc; }, {});
        setAnswerKey(single?.answer_key_text || ''); setAnswerKeys(multi);
      }).catch(err => logger.error('Failed fetch AK:', err));
    }
  }, [existingId]);

  useEffect(() => {
    if (requireRef && sectionId) invoke<SectionReferenceDetail[]>("get_section_references", { sectionId }).then(setAvailableRefs).catch(err => logger.error('Failed fetch section refs:', err));
  }, [requireRef, sectionId, usageRefreshKey]);

  useEffect(() => {
    if (!(isSection300Selector || isSection100Selector || isSection200Selector) || !documentId) return;
    const targetGroup = isSection100Selector ? 100 : isSection200Selector ? 200 : 300;
    invoke<any[]>('get_sections_by_document', { documentId }).then(sections => {
      const filtered = sections.filter(s => s.section_group === targetGroup).map(s => ({ id: s.id, section_number: s.section_number, title_th: s.title_th, menu_label: s.menu_label }));
      setAvailableSections(filtered);
    }).catch(() => setAvailableSections([]));
  }, [isSection100Selector, isSection200Selector, isSection300Selector, documentId]);

  useEffect(() => {
    if (!(isSection300Selector || isSection100Selector || isSection200Selector) || !sectionId) return;
    invoke<number[]>('get_back_referencing_section_ids', { sectionId }).then(ids => setBackRefSectionIds(new Set(ids))).catch(() => setBackRefSectionIds(new Set()));
  }, [isSection100Selector, isSection200Selector, isSection300Selector, sectionId]);

  const fetchSectionRefChildren = useCallback(async () => {
    if (!(isSection300Selector || isSection100Selector || isSection200Selector) || !existingId) { setSectionRefChildren([]); return; }
    try { const children = await invoke<SectionRefChild[]>('get_section_ref_children', { parentId: existingId }); setSectionRefChildren(children); } catch { setSectionRefChildren([]); }
  }, [isSection100Selector, isSection200Selector, isSection300Selector, existingId]);
  useEffect(() => { fetchSectionRefChildren(); }, [fetchSectionRefChildren]);

  useEffect(() => {
    if (existingId) {
      invoke<boolean>('check_has_children', { parentId: existingId }).then(hasChildren => {
        setHasActualChildren(hasChildren); if (hasChildren && !initialIsGroupHeader) setEffectiveIsGroupHeader(true);
      }).catch(err => logger.error("Failed children check:", err));
    }
  }, [existingId, initialIsGroupHeader]);

  const fetchRequiredCountChildren = useCallback(async () => {
    if ((!isPerformanceL2 && !is306L1) || !existingId) { setRequiredCountChildren([]); return; }
    try {
      const children = await invoke<RequiredCountChild[]>('get_required_count_children', { parentId: existingId });
      setRequiredCountChildren(children); setRequiredCount(children.length);
      if (children.length > 0) { setScorePerInstance(children[0]?.score || 0); setEffectiveIsGroupHeader(true); }
      else if (!is306L1) setEffectiveIsGroupHeader(false);
    } catch { setRequiredCountChildren([]); }
  }, [isPerformanceL2, is306L1, existingId]);
  useEffect(() => { fetchRequiredCountChildren(); }, [fetchRequiredCountChildren]);

  const usageParentId = subQUsageParentId || parentId;
  useEffect(() => {
    if (!hasParentSubQ || !usageParentId) { setSubQUsageData({ usage_map: {}, total_children: 0 }); return; }
    invoke<SubQuestionUsageResponse>('get_sub_question_usage_counts', { parentId: usageParentId }).then(data => setSubQUsageData(data)).catch(() => setSubQUsageData({ usage_map: {}, total_children: 0 }));
  }, [hasParentSubQ, usageParentId, usageRefreshKey]);

  useEffect(() => {
    if (!parentSubQuestionList || parentSubQuestionList.length === 0) return;
    const validCodes = new Set(parentSubQuestionList.map(sq => sq.code));
    const alwaysCodes = sectionGroup === 300 ? parentSubQuestionList.filter(sq => sq.alwaysChecked).map(sq => sq.code) : [];
    setSelectedSubQCodes(prev => {
      const filtered = prev.filter(c => validCodes.has(c));
      return Array.from(new Set([...filtered, ...alwaysCodes]));
    });
  }, [parentSubQuestionList, sectionGroup]);

  const prereqChildMountRef = useRef(true);
  useEffect(() => {
    if (prereqChildMountRef.current) { prereqChildMountRef.current = false; return; }
    if (isPrerequisiteChild && existingId) invoke('update_question_score', { args: { id: existingId, score: 0, is_scored: false, question_type: formScoreType, display_text: formScoreType === 'exempted' ? '(ไม่ต้องปฏิบัติ)' : '' } }).catch(err => logger.error("Failed score update:", err));
  }, [isPrerequisiteChild, existingId, formScoreType]);

  const sectionSelectorMountRef = useRef(true);
  useEffect(() => {
    if ((isSection300Selector || isSection100Selector || isSection200Selector) && existingId) {
      if (sectionSelectorMountRef.current) { sectionSelectorMountRef.current = false; return; }
      invoke('update_question_score', { args: { id: existingId, score: 0, is_scored: false, question_type: formScoreType, display_text: formScoreType === 'exempted' ? (formScoreDisplayText || '(ไม่ต้องปฏิบัติ)') : null } })
        .then(() => { if (formScoreType === 'exempted') { invoke('remove_all_section_ref_children', { parentId: existingId }).then(() => fetchSectionRefChildren()); setShowDescription(false); } else { setShowDescription(true); } })
        .catch(err => logger.error("Failed score update:", err));
    }
  }, [isSection300Selector, isSection100Selector, isSection200Selector, existingId, formScoreType, fetchSectionRefChildren, formScoreDisplayText]);

  useEffect(() => {
    setShowSubQuestionEditor(baseShowSubQuestionEditor && !(isPrerequisiteQuestion && formScoreType === 'exempted') && !(isPrerequisiteChild && formScoreType === 'exempted') && !(isDefaultDescL1_200 && formScoreType === 'exempted') && !(isDefaultDescL1 && formScoreType === 'exempted'));
  }, [baseShowSubQuestionEditor, isPrerequisiteQuestion, isPrerequisiteChild, isDefaultDescL1_200, isDefaultDescL1, formScoreType]);

  useEffect(() => { if (formScoreType === 'exempted') setUseSubQuestions(false); }, [formScoreType]);
  useEffect(() => { if (isL1 && useSubQuestions) { setEffectiveIsGroupHeader(true); setFormScoreIsScored(false); } }, [isL1, useSubQuestions]);
  useEffect(() => {
    if (isPerformanceL2) { if (requiredCount > 0) { setEffectiveIsGroupHeader(true); setFormScoreIsScored(false); } else { setEffectiveIsGroupHeader(false); setFormScoreIsScored(true); } }
  }, [isPerformanceL2, requiredCount]);

  useEffect(() => { if (showSubQuestionEditor) invoke<DbBranch[]>('get_occupation_branches').then(setDbBranches).catch(logger.error); }, [showSubQuestionEditor]);
  useEffect(() => { if (showSubQuestionEditor && selMainBranch) invoke<DbSubBranch[]>('get_occupation_sub_branches', { branchCode: selMainBranch }).then(setDbSubBranches).catch(logger.error); }, [showSubQuestionEditor, selMainBranch]);
  useEffect(() => {
    if (!showSubQuestionEditor || !selMainBranch || !selSubBranch) { setDbSubQuestions([]); return; }
    const f = isProtectedBranch ? invoke<DbSubQuestion[]>('get_all_sub_questions_for_branch', { branchCode: selMainBranch }) : invoke<DbSubQuestion[]>('get_occupation_sub_questions', { branchCode: selMainBranch, subBranchCode: selSubBranch });
    f.then(sqs => { setDbSubQuestions(sqs); const a = sqs.filter(s => s.always_checked).map(s => s.code); if (a.length > 0) setActiveSubQCodes(p => Array.from(new Set([...p, ...a]))); }).catch(logger.error);
  }, [showSubQuestionEditor, selMainBranch, selSubBranch, isProtectedBranch]);

  const autoCodePrefix = useMemo(() => {
    if (!selMainBranch || !selSubBranch) return "";
    const s = sectionGroup === 200 ? "2" : sectionGroup === 300 ? "3" : "1";
    const l = questionSequence?.toString() || "0";
    const pad = (c: string) => c === 'STD' ? '00' : c.padStart(2, '0');
    return isProtectedBranch ? (s + "4" + pad(selMainBranch) + pad(selSubBranch)) : (s + l + pad(selMainBranch) + pad(selSubBranch));
  }, [sectionGroup, questionSequence, selMainBranch, selSubBranch, isProtectedBranch]);

  const filteredItems = useMemo(() => {
    if (dbSubQuestions.length > 0) return autoCodePrefix ? dbSubQuestions.map(sq => ({ code: sq.code, text: sq.text, alwaysChecked: sq.always_checked })).filter(sq => sq.code.startsWith(autoCodePrefix)) : [];
    return autoCodePrefix ? subQuestionList.filter(sq => sq.code.startsWith(autoCodePrefix)) : [];
  }, [dbSubQuestions, subQuestionList, autoCodePrefix]);

  useEffect(() => {
    if (!is300 || !useSubQuestions || filteredItems.length === 0) return;
    const a = filteredItems.filter(sq => sq.alwaysChecked).map(sq => sq.code);
    if (a.length > 0) setActiveSubQCodes(p => Array.from(new Set([...p, ...a])));
  }, [is300, useSubQuestions, filteredItems]);

  const prevPrefixRef = useRef(autoCodePrefix);
  useEffect(() => {
    if (prevPrefixRef.current !== autoCodePrefix && prevPrefixRef.current !== "") { if (autoCodePrefix) setActiveSubQCodes(prev => prev.filter(c => c.startsWith(autoCodePrefix))); }
    prevPrefixRef.current = autoCodePrefix;
  }, [autoCodePrefix]);

  // Handlers
  const handleImageUpload = async () => {
    try {
      const selected = await openDialog({ multiple: false, filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }] });
      if (selected && typeof selected === "string") { setImagePath(selected); setPendingImageUpload(selected); setPendingImageDelete(false); }
    } catch (err) { logger.error("Upload error:", err); }
  };
  const handleRemoveImage = () => { setImagePath(null); setPendingImageDelete(true); setPendingImageUpload(null); };

  const syncReferenceDraftFromLinkedRefs = useCallback(() => {
    setDraftSelectedRefIds(linkedRefs.map((ref) => ref.reference.id.toString()));
    setDraftPageByRefId(linkedRefs.reduce<Record<string, string>>((acc, ref) => { acc[ref.reference.id.toString()] = ref.location_text || ""; return acc; }, {}));
    setDraftPageErrors({});
  }, [linkedRefs]);

  const handleToggleReferenceEditor = () => { if (!isRefExpanded) syncReferenceDraftFromLinkedRefs(); setIsRefExpanded((prev) => !prev); };
  const handleToggleDraftReference = (refId: string) => { 
    if (draftSelectedRefIds.includes(refId)) { setDraftSelectedRefIds((prev) => prev.filter((id) => id !== refId)); setDraftPageErrors((prev) => { const next = { ...prev }; delete next[refId]; return next; }); return; }
    if (draftSelectedRefIds.length >= 2) { const message = "เลือกเอกสารอ้างอิงได้สูงสุด 2 รายการ"; if (onAlert) onAlert(message, "warning"); else { setAlertMessage(message); setIsAlertOpen(true); } return; }
    setDraftSelectedRefIds((prev) => [...prev, refId]);
  };
  const handleDraftPageChange = (refId: string, value: string) => { 
    if (!draftSelectedRefIds.includes(refId)) return;
    if (!REFERENCE_PAGE_ALLOWED_CHARS.test(value)) { setDraftPageErrors((prev) => ({ ...prev, [refId]: REFERENCE_PAGE_ERROR_MESSAGE })); return; }
    setDraftPageByRefId((prev) => ({ ...prev, [refId]: value }));
    const trimmed = value.trim(); setDraftPageErrors((prev) => { const next = { ...prev }; if (!trimmed || REFERENCE_PAGE_VALID_FORMAT.test(trimmed)) delete next[refId]; else next[refId] = REFERENCE_PAGE_ERROR_MESSAGE; return next; });
  };
  const handleUpdateReferences = async () => {
    const nE: Record<string, string> = {};
    for (const rid of draftSelectedRefIds) { const t = (draftPageByRefId[rid] || "").trim(); if (t && !REFERENCE_PAGE_VALID_FORMAT.test(t)) nE[rid] = REFERENCE_PAGE_ERROR_MESSAGE; }
    if (Object.keys(nE).length > 0) { setDraftPageErrors(p => ({ ...p, ...nE })); if (onAlert) onAlert(REFERENCE_PAGE_ERROR_MESSAGE, "warning"); else { setAlertMessage(REFERENCE_PAGE_ERROR_MESSAGE); setIsAlertOpen(true); } return; }
    const sS = new Set(draftSelectedRefIds);
    const nL = availableRefs.filter(r => sS.has(r.reference.id.toString())).map((r, i) => {
      const eR = linkedRefs.find(l => l.reference.id === r.reference.id);
      const rid = r.reference.id.toString();
      const tP = (draftPageByRefId[rid] || "").trim();
      return { id: eR?.id || 0, question_id: eR?.question_id || existingId || "temp", reference_id: r.reference.id, reference: r.reference, location_text: tP || null, display_order: i + 1, thai_letter: r.thai_letter } satisfies QuestionReferenceDetail;
    });
    setLinkedRefs(nL); setDraftPageErrors({}); setIsRefExpanded(false); if (errors.refs) setErrors(p => ({ ...p, refs: false }));
  };

  const handleAddSectionRef = async (linked_section_id: number, linked_section_number: string, linked_section_title: string) => {
    if (!existingId || !documentId || !sectionId) return;
    try {
      const newChild = await invoke<SectionRefChild>('add_section_ref_child', { args: { parent_id: existingId, document_id: documentId, section_id: sectionId, linked_section_id, linked_section_number, linked_section_title } });
      setSectionRefChildren(prev => [...prev, newChild].sort((a, b) => a.ref_section_number - b.ref_section_number));
    } catch (e) { logger.error('Add ref fail:', e); }
  };
  const handleRemoveSectionRef = async (questionId: string) => { try { await invoke('remove_section_ref_child', { questionId }); setSectionRefChildren(prev => prev.filter(c => c.id !== questionId)); } catch (e) { logger.error('Remove ref fail:', e); } };

  const persistAnswerKeys = async (qId: string) => {
    try {
      const hC = effectiveIsGroupHeader || hasActualChildren;
      if (requireAnswerKey) {
        const items = (hasParentSubQ && selectedSubQCodes.length > 0) ? selectedSubQCodes.map(c => ({ subCode: c, text: answerKeys[c] || '', isRequired: true })) : [{ subCode: '', text: answerKey, isRequired: true }];
        await invoke('replace_question_answer_keys', { questionId: qId, items });
      } else if (!hC) await invoke('replace_question_answer_keys', { questionId: qId, items: [] });
    } catch (err) { logger.error('AK sync fail:', err); }
  };

  const handleSyncRequiredCount = async () => {
    if (is306L1) {
      if (!sectionId || !existingId) return;
      try {
        const children = await invoke<RequiredCountChild[]>('sync_required_count_children', {
          args: { parent_id: existingId, document_id: documentId, section_id: sectionId, desired_count: requiredCount, score_per_instance: scorePerInstance, content_override: description || content.trim() }
        });
        setRequiredCountChildren(children);
        if (children.length > 0) setEffectiveIsGroupHeader(true);
      } catch (err) { logger.error('Failed sync 306 children:', err); }
      return;
    }
    if (!isPerformanceL2 || !sectionId || (!existingId && !generatedId && !parentId)) return;
    const syncMeta: any = {};
    if (useSubQuestions) { syncMeta.useSubQuestions = true; if (selMainBranch) syncMeta.selectedBranch = { main: selMainBranch, sub: selSubBranch }; if (activeSubQCodes.length > 0) syncMeta.activeSubQuestions = activeSubQCodes; }
    if (selectedSubQCodes.length > 0) syncMeta.selectedSubQuestions = selectedSubQCodes;
    const syncMetaStr = Object.keys(syncMeta).length > 0 ? JSON.stringify(syncMeta) : null;
    let qId = existingId || generatedId;
    if (!qId) {
      qId = crypto.randomUUID(); setGeneratedId(qId);
      try {
        await invoke('create_question', { args: { id: qId, document_id: documentId, section_id: sectionId, parent_id: parentId || null, content: content.trim() || '(รอบันทึก)', description: null, is_header: false, sequence: null, answer_type: 'text', metadata: syncMetaStr } });
        setIsBackgroundSaved(true);
      } catch (err) { logger.error('Failed background save:', err); return; }
    } else {
      try { await invoke('update_question', { args: { id: qId, content: content.trim() || '(รอบันทึก)', description: null, metadata: syncMetaStr } }); }
      catch (err) { logger.error('Failed update L2 meta:', err); }
    }
    try {
      const children = await invoke<RequiredCountChild[]>('sync_required_count_children', { args: { parent_id: qId, document_id: documentId, section_id: sectionId, desired_count: requiredCount, score_per_instance: scorePerInstance } });
      setRequiredCountChildren(children);
    } catch (err) { logger.error('Failed sync children:', err); }
  };

  const handleCancelInternal = async () => {
    setImagePath(originalImagePath); setPendingImageUpload(null); setPendingImageDelete(false);
    if (isBackgroundSaved && generatedId) { try { await invoke('delete_question', { id: generatedId }); } catch (err) { logger.error('Failed cleanup background L2:', err); } }
    onCancel();
  };

  const handleSave = async () => {
    let fP = imagePath;
    if (pendingImageUpload) {
      try {
        if (originalImagePath) await invoke('delete_question_image', { path: originalImagePath }).catch(() => {});
        let tId = existingId || generatedId || crypto.randomUUID();
        if (!existingId && !generatedId) setGeneratedId(tId);
        fP = await invoke<string>("upload_question_image", { path: pendingImageUpload, documentId, questionId: tId, friendlyPrefix: convertThaiToArabic(prefix) });
        setImagePath(fP); setPendingImageUpload(null); setPendingImageDelete(false);
      } catch (err) { logger.error("Upload fail:", err); if (onAlert) onAlert("ไม่สามารถอัปโหลดรูปภาพได้", "danger"); return; }
    } else if (pendingImageDelete && originalImagePath) { await invoke('delete_question_image', { path: originalImagePath }).catch(() => {}); fP = null; setPendingImageDelete(false); }

    setErrors({}); const nE: Record<string, boolean> = {}; let hE = false;
    if (!content.trim()) { nE.content = true; hE = true; }
    const sAK = !is300 && (!isDefaultL1 && requireAnswerKey && !useSubQuestions && !(hasParentSubQ && selectedSubQCodes.length === 0));
    if (sAK) {
      if (hasParentSubQ && selectedSubQCodes.length > 0) { if (selectedSubQCodes.some(c => !(answerKeys[c] || "").trim())) { nE.answerKey = true; hE = true; } }
      else if (!answerKey.trim()) { nE.answerKey = true; hE = true; }
    }
    if (!is300 && !isDefaultL1 && requireRef && linkedRefs.length === 0) { nE.refs = true; hE = true; }
    if (hE) {
      setErrors(nE); const ms = [];
      if (nE.content) ms.push("คำถาม (Question)"); if (nE.answerKey) ms.push("เฉลย (Answer Key)"); if (nE.refs) ms.push("เอกสารอ้างอิง (References)");
      const mP = "กรุณากรอกข้อมูลให้ครบถ้วน:\n- " + ms.join("\n- ");
      if (onAlert) onAlert(mP, "warning"); else { setAlertMessage(mP); setIsAlertOpen(true); }
      return;
    }

    let nM: any = parsedInitialMeta ? { ...parsedInitialMeta } : {};
    if (!requireRef) nM.requireRef = false; else delete nM.requireRef;
    if (!requireAnswerKey) nM.requireAnswerKey = false; else delete nM.requireAnswerKey;
    delete nM.answerKey; delete nM.answerKeys;
    const aC = is300 ? filteredItems.filter(s => s.alwaysChecked).map(s => s.code) : [];
    const eA = Array.from(new Set([...activeSubQCodes, ...aC]));
    if (isL1 && formScoreType === 'exempted') { ['useSubQuestions','subQuestionList','occupationBranches','activeSubQuestions','selectedBranch'].forEach(k => delete nM[k]); }
    else if (showSubQuestionEditor) { if (useSubQuestions) { nM.useSubQuestions = true; if (selMainBranch) nM.selectedBranch = { main: selMainBranch, sub: selSubBranch }; else delete nM.selectedBranch; nM.activeSubQuestions = eA; } else { ['useSubQuestions','subQuestionList','occupationBranches','activeSubQuestions','selectedBranch'].forEach(k => delete nM[k]); } }
    if (hasParentSubQ) { const fC = (is300 && parentSubQuestionList) ? parentSubQuestionList.filter(sq => sq.alwaysChecked).map(sq => sq.code) : []; const eS = Array.from(new Set([...selectedSubQCodes, ...fC])); if (eS.length > 0) nM.selectedSubQuestions = eS; else delete nM.selectedSubQuestions; }
    const mS = Object.keys(nM).length > 0 ? JSON.stringify(nM) : '{}';

    if (showSubQuestionEditor && useSubQuestions && eA.length === 0) { setAlertMessage('ยังไม่ได้เลือกคำถามย่อยที่ใช้งาน\nต้องเลือกคำถามย่อยอย่างน้อย 1 ข้อก่อนบันทึก'); setIsAlertOpen(true); return; }

    if (isBackgroundSaved && !isEdit && generatedId) {
      try {
        const mO = JSON.parse(mS); if (fP) mO.image = fP; if (currentChildLayout) mO.childLayout = currentChildLayout;
        await invoke('update_question', { args: { id: generatedId, content: content.trim(), description: showExtraButtons ? description || null : null, metadata: JSON.stringify(mO) } });
        if (is300) await invoke('update_question_score', { args: { id: generatedId, score: formScoreIsScored ? parseInt(formScoreValue) || 0 : 0, is_scored: formScoreIsScored, question_type: formScoreType, display_text: formScoreType === 'exempted' ? (formScoreDisplayText || '(ไม่ต้องปฏิบัติ)') : null } });
        if (requiredCount > 0 && sectionId) await invoke('sync_required_count_children', { args: { parent_id: generatedId, document_id: documentId, section_id: sectionId, desired_count: requiredCount, score_per_instance: scorePerInstance } });
        await persistAnswerKeys(generatedId);
      } catch (err) { logger.error('BG final fail:', err); }
      onRefresh?.(); onCancel(); return;
    }

    let qId = existingId || generatedId || crypto.randomUUID(); if (!existingId && !generatedId) setGeneratedId(qId);
    if (is300 && isEdit && existingId) await invoke('update_question_score', { args: { id: existingId, score: formScoreIsScored ? parseInt(formScoreValue) || 0 : 0, is_scored: formScoreIsScored, question_type: formScoreType, display_text: formScoreType === 'exempted' ? (formScoreDisplayText || '(ไม่ต้องปฏิบัติ)') : null } }).catch(err => logger.error('Score save fail:', err));
    if (isExemptableL1_200 && isEdit && existingId) await invoke('update_question_score', { args: { id: existingId, score: 0, is_scored: false, question_type: formScoreType, display_text: formScoreType === 'exempted' ? '(ไม่ต้องอธิบาย)' : null } }).catch(err => logger.error('200 exempt fail:', err));
    
    await onSave({ content, description: showExtraButtons ? description : undefined, image: showExtraButtons ? fP || undefined : undefined, id: !isEdit ? qId : undefined, references: requireRef ? linkedRefs : [], metadata: mS, childLayout: showExtraButtons ? currentChildLayout : undefined });
    if (qId) await persistAnswerKeys(qId);
    if ((isPerformanceL2 || is306L1) && sectionId && qId && requiredCount > 0) await invoke('sync_required_count_children', { args: { parent_id: qId, document_id: documentId, section_id: sectionId, desired_count: requiredCount, score_per_instance: scorePerInstance, content_override: is306L1 ? (description || content.trim()) : null } }).catch(err => logger.error('Sync fail:', err));
    if (is300 && isPerformanceL2 && !isEdit && qId) await invoke('update_question_score', { args: { id: qId, score: formScoreIsScored ? parseInt(formScoreValue) || 0 : 0, is_scored: formScoreIsScored, question_type: formScoreType, display_text: formScoreType === 'exempted' ? (formScoreDisplayText || '(ไม่ต้องปฏิบัติ)') : null } }).catch(err => logger.error('L2 score save fail:', err));
    onCancel();
  };

  return {
    state: {
      content, setContent, description, setDescription, showDescription, setShowDescription, imagePath, setImagePath, currentChildLayout, setCurrentChildLayout, generatedId, setGeneratedId, isBackgroundSaved, setIsBackgroundSaved, pendingImageUpload, setPendingImageUpload, pendingImageDelete, setPendingImageDelete, formScoreIsScored, setFormScoreIsScored, formScoreValue, setFormScoreValue, formScoreType, setFormScoreType, formScoreDisplayText, setFormScoreDisplayText, availableSections, setAvailableSections, sectionRefChildren, setSectionRefChildren, backRefSectionIds, setBackRefSectionIds, requiredCountChildren, setRequiredCountChildren, requiredCount, setRequiredCount, scorePerInstance, setScorePerInstance, effectiveIsGroupHeader, setEffectiveIsGroupHeader, hasActualChildren, setHasActualChildren, dbBranches, setDbBranches, dbSubBranches, setDbSubBranches, dbSubQuestions, setDbSubQuestions, activeSubQCodes, setActiveSubQCodes, selectedSubQCodes, setSelectedSubQCodes, isAlertOpen, setIsAlertOpen, alertMessage, setAlertMessage, useSubQuestions, setUseSubQuestions, showSubQuestionEditor, setShowSubQuestionEditor, selMainBranch, setSelMainBranch, selSubBranch, setSelSubBranch, subQuestionList, setSubQuestionList, errors, setErrors, requireRef, setRequireRef, requireAnswerKey, setRequireAnswerKey, answerKey, setAnswerKey, answerKeys, setAnswerKeys, linkedRefs, setLinkedRefs, isRefExpanded, setIsRefExpanded, draftSelectedRefIds, setDraftSelectedRefIds, draftPageByRefId, setDraftPageByRefId, draftPageErrors, setDraftPageErrors, availableRefs, subQUsageData, isEdit
    },
    refs: { contentRef, descriptionRef, formCardRef },
    computed: {
      is200, is300, is200or300, isL1, isPrerequisiteQuestion, isPrerequisiteChild, isSection300Selector, isSection100Selector, isSection200Selector, isExamChild, is306L1, isFixedPracticeL1, isDefaultDescL1, isExemptableL1_200, isDefaultDescL1_200, isRequiredInstance, isPerformanceL2, baseShowSubQuestionEditor, autoCodePrefix, filteredItems, hasParentSubQ, isProtectedBranch, showExtraButtons
    },
    handlers: {
      handleImageUpload, handleRemoveImage, handleSyncRequiredCount, handleCancel: handleCancelInternal, handleToggleReferenceEditor, handleToggleDraftReference, handleDraftPageChange, handleUpdateReferences, handleSave, handleAddSectionRef, handleRemoveSectionRef, fetchSectionRefChildren
    },
    props: {
      existingId, parentId, sectionId, documentId, sectionOccupationBranches, sectionSelectedBranch, onRefresh, currentSectionNumber, isDefaultL1
    }
  };
};