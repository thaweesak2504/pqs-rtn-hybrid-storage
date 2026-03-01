import { open as openDialog } from "@tauri-apps/api/dialog";
import { convertFileSrc, invoke } from "@tauri-apps/api/tauri";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileDigit,
  FileText,
  Globe,
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QuestionDetail,
  QuestionReferenceDetail,
  SectionReferenceDetail
} from "../../types/content";
import ConfirmModal from "../modals/ConfirmModal";
import Button from "../ui/Button";
import Tooltip from "../ui/Tooltip";
import AnswerKeyEditor from "./AnswerKeyEditor";
import QuestionDisplayCard from "./QuestionDisplayCard";

const DEFAULT_L1_DESC_BY_SEQ: { [key: number]: string } = {
  2: 'สมรรถนะที่ต้องการ',
  3: 'งานและเกณฑ์การปฏิบัติงานที่กำลังพลดำเนินการได้',
  4: 'สภาวะแวดล้อม',
  5: 'มาตรฐานหรือเอกสารอ้างอิง',
  6: 'จำนวนครั้ง/คะแนน',
};

const toThaiNumber = (num?: number | string | null): string => {
  if (num === null || num === undefined) return '';
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().replace(/\d/g, (match) => thaiDigits[match as any]);
};

const toThaiAlphabet = (n: number) => {
  const alpha = [
    "ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ", "ฎ", "ฏ", "ฐ", "ฑ", "ฒ", "ณ",
    "ด", "ต", "ถ", "ท", "ธ", "น", "บ", "ป", "ผ", "ฝ", "พ", "ฟ", "ภ", "ม", "ย", "ร",
    "ล", "ว", "ศ", "ษ", "ส", "ห", "ฬ", "อ", "ฮ",
  ];
  return n > 0 && n <= alpha.length ? alpha[n - 1] : n.toString();
};

const convertThaiToArabic = (thaiStr: string) => {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return thaiStr.replace(/[๐-๙]/g, (match) => thaiDigits.indexOf(match).toString());
};

const buildPrefix = (
  level: number,
  sequence?: number | null,
  sectionNumber?: number,
): string => {
  if (!sequence) return "";
  const sNum = sectionNumber ? sectionNumber.toString().padStart(3, "0") : "100";
  const tsNum = toThaiNumber(sNum);
  if (level === 0) return tsNum + "." + toThaiNumber(sequence);
  if (level === 1) return toThaiAlphabet(sequence) + ".";
  if (level === 2) return "(" + toThaiNumber(sequence) + ")";
  if (level === 3) return "(" + toThaiAlphabet(sequence) + ")";
  return toThaiNumber(sequence) + ".";
};

const buildPrefix200_300 = (
  level: number,
  sequence: number | null | undefined,
  sectionNumber: number | undefined,
  parentSequence?: number | null,
): string => {
  if (!sequence) return "";
  const sNum = sectionNumber ? sectionNumber.toString().padStart(3, "0") : "200";
  const tsNum = toThaiNumber(sNum);
  if (level === 0) return tsNum + "." + toThaiNumber(sequence);
  if (level === 1) return tsNum + "." + toThaiNumber(parentSequence || 0) + "." + toThaiNumber(sequence);
  if (level === 2) return toThaiAlphabet(sequence) + ".";
  if (level === 3) return "(" + toThaiNumber(sequence) + ")";
  return toThaiNumber(sequence) + ".";
};

// ============ Types ============
interface SubQuestionItem {
  code: string;
  text: string;
  alwaysChecked?: boolean;
}

type ViewMode = 'edit' | 'qualifier' | 'trainee' | 'visitor' | 'print';

interface QuestionTreeNodeProps {
  question: QuestionDetail;
  level: number;
  sectionNumber?: number;
  sectionGroup?: 100 | 200 | 300;
  parentSequence?: number | null;
  readOnly: boolean;
  editingId: string | null;
  isCreating: boolean;
  creatingAtParent: string | null;
  insertingAfterId: string | null;
  onStartEdit: (id: string) => void;
  onUpdate: (id: string, content: string, description: string | null, metadata: string | null, references?: QuestionReferenceDetail[]) => void;
  onDelete: (q: QuestionDetail) => void;
  onStartCreate: (parentId: string | null) => void;
  onStartInsertAfter: (id: string) => void;
  onCreate: (data: { content: string; description?: string; image?: string; id?: string; metadata?: string; references?: QuestionReferenceDetail[]; childLayout?: "list" | "grid"; }, parentId: string | null, insertAfterId: string | null) => void;
  onCancel: () => void;
  onMoveUp: (id: string, siblings: QuestionDetail[]) => void;
  onMoveDown: (id: string, siblings: QuestionDetail[]) => void;
  siblings: QuestionDetail[];
  isFirst: boolean;
  isLast: boolean;
  documentId: string;
  sectionId?: number;
  onImageClick?: (src: string) => void;
  onAlert?: (msg: string, type?: "warning" | "danger") => void;
  parentLayout?: "list" | "grid";
  parentSubQuestionList?: SubQuestionItem[];
  sectionOccupationBranches?: Record<string, { name: string; subs: Record<string, string> }>;
  sectionSelectedBranch?: { main: string; sub: string };
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  isParentDefault300L1?: boolean;
  onRefresh?: () => void;
  onQuestionsUpdated?: () => void;
  viewMode?: ViewMode;
}
const QuestionTreeNode: React.FC<QuestionTreeNodeProps> = ({
  question,
  level,
  sectionNumber,
  sectionGroup,
  parentSequence,
  collapsedIds,
  onToggleCollapse,
  parentSubQuestionList,
  sectionOccupationBranches,
  sectionSelectedBranch,
  readOnly,
  editingId,
  isCreating,
  creatingAtParent,
  insertingAfterId,
  onStartEdit,
  onUpdate,
  onDelete,
  onStartCreate,
  onStartInsertAfter,
  onCreate,
  onCancel,
  onMoveUp,
  onMoveDown,
  siblings,
  isFirst,
  isLast,
  documentId,
  sectionId,
  onImageClick,
  onAlert,
  parentLayout = "list",
  isParentDefault300L1 = false,
  onRefresh,
  onQuestionsUpdated,
  viewMode = 'edit',
}) => {
  const is200 = sectionGroup === 200;
  const is300 = sectionGroup === 300;
  const is200or300 = is200 || is300;
  const isExpanded = !collapsedIds.has(question.id);
  // Section-ref children (3xx.1.4/1.5 children) use section_number as prefix instead of ก.ข.ค.
  const refSectionMeta = useMemo(() => {
    if (!is300 || !question.metadata) return null;
    try { const m = JSON.parse(question.metadata); return m.refSectionId ? m : null; } catch { return null; }
  }, [is300, question.metadata]);
  const prefix = refSectionMeta?.refSectionNumber
    ? `${toThaiNumber(refSectionMeta.refSectionNumber)}.`
    : is200or300
      ? buildPrefix200_300(level, question.sequence as number, sectionNumber, parentSequence)
      : buildPrefix(level, question.sequence as number, sectionNumber);
  const hasChildren = question.children && question.children.length > 0;

  // Convert sequence to number for comparisons
  const qSeqNum = Number(question.sequence);
  const pSeqNum = Number(parentSequence);

  // 300Template: 3xx.1.1-3xx.1.3 (L2, parentSeq=1, seq=1-3) can add L3; others cannot
  const is300L2AllowL3 = is300 && level === 1 && isParentDefault300L1 && pSeqNum === 1 && qSeqNum >= 1 && qSeqNum <= 3;
  const maxSubLevel = is300L2AllowL3 ? 3 : is200or300 ? 2 : 1;
  // 300Template: 3xx.1 (seq=1) and 3xx.7 (seq=7) L1 cannot add L2 sub-questions
  const is300LockedL1 = is300 && level === 0 && (qSeqNum === 1 || qSeqNum === 7);
  // 300Template: default L2 that CANNOT add L3 (3xx.1.4-1.5, 3xx.7.1-7.2)
  const is300L2NoL3 = is300 && level === 1 && isParentDefault300L1 && !is300L2AllowL3;
  // Performance L2 (3xx.2-3xx.6) with required count children: disable manual "Add Sub-Question"
  const isPerformanceL2 = is300 && level === 1 && !isParentDefault300L1 && !!question.is_group_header;
  // 3xx.6 L1: children added only via required count, no manual "Add Sub-Question"
  const is306L1Display = is300 && level === 0 && qSeqNum === 6;
  const canAddSub = level < maxSubLevel && !readOnly && !is300LockedL1 && !is300L2NoL3 && !isPerformanceL2 && !is306L1Display;
  // L3 created by required count (question_type='required_instance'): disable "Insert After"
  const isRequiredCountChild = question.question_type === 'required_instance';
  // 300Template: default L2 cannot insert sibling (no "แทรกคำถามต่อท้าย")
  const canInsertSibling = !(is300 && level === 1 && isParentDefault300L1) && !isRequiredCountChild;
  const isDefault200L1 = is200 && level === 0;
  const isDefault300L1 = is300 && level === 0;
  const isDefaultL1 = isDefault200L1 || isDefault300L1;
  const isDefault300L2 = is300 && level === 1 && isParentDefault300L1;

  const [childLayout, setChildLayout] = useState<"list" | "grid">("list");

  useEffect(() => {
    if (question.metadata) {
      try {
        const meta = JSON.parse(question.metadata);
        setChildLayout(meta.childLayout || "list");
      } catch { }
    }
  }, [question.metadata]);

  // Extract parentSubQuestionList from DB (for passing to children)
  const [ownSubQuestionList, setOwnSubQuestionList] = useState<SubQuestionItem[]>([]);
  useEffect(() => {
    if (!question.metadata) { setOwnSubQuestionList([]); return; }
    try {
      const meta = JSON.parse(question.metadata);
      if (!meta.useSubQuestions) { setOwnSubQuestionList([]); return; }
      const activeCodes: string[] = Array.isArray(meta.activeSubQuestions) ? meta.activeSubQuestions : [];
      const selectedBranch: { main: string; sub: string } | undefined = meta.selectedBranch;
      if (!selectedBranch?.main) { setOwnSubQuestionList([]); return; }
      // Build prefix from question.sequence + selectedBranch (S + L + X + Y)
      // This is the reliable way — activeCodes[0] may be from a different prefix
      const sCode = is300 ? "3" : "2";
      const lCode = question.sequence?.toString() || "0";
      const derivedPrefix = `${sCode}${lCode}${selectedBranch.main}${selectedBranch.sub}`;
      invoke<{ id: number; code: string; text: string; always_checked: boolean }[]>(
        'get_all_sub_questions_for_branch',
        { branchCode: selectedBranch.main }
      ).then(dbSqs => {
        const prefixFiltered = derivedPrefix ? dbSqs.filter(sq => sq.code.startsWith(derivedPrefix)) : dbSqs;
        const filtered = prefixFiltered
          .filter(sq => activeCodes.length === 0 || activeCodes.includes(sq.code) || sq.always_checked)
          .map(sq => ({ code: sq.code, text: sq.text, alwaysChecked: sq.always_checked }));
        setOwnSubQuestionList(filtered);
      }).catch((err) => { console.error('[ownSubQuestionList] invoke error:', err); setOwnSubQuestionList([]); });
    } catch (e) { console.error('[ownSubQuestionList] parse error:', e); setOwnSubQuestionList([]); }
  }, [question.metadata, is300, question.sequence]);

  // Extract initial image from metadata
  const initialImage = useMemo(() => {
    if (!question.metadata) return undefined;
    try {
      const meta = JSON.parse(question.metadata);
      return meta.image || undefined;
    } catch {
      return undefined;
    }
  }, [question.metadata]);

  // ── Score-only inline form for: 3xx.6 L2 (required_instance) + 3xx.1.4/1.5 L3 (section_ref) ──
  const is306L2Child = isRequiredCountChild && is300 && level === 1 && pSeqNum === 6;
  const useInlineScoreForm = is306L2Child || !!refSectionMeta;
  const [riIsScored, setRiIsScored] = useState(!!question.is_scored);
  const [riScoreValue, setRiScoreValue] = useState(String(question.score ?? 0));
  useEffect(() => {
    if (editingId === question.id && useInlineScoreForm) {
      setRiIsScored(!!question.is_scored);
      setRiScoreValue(String(question.score ?? 0));
    }
  }, [editingId, question.id, question.is_scored, question.score, useInlineScoreForm]);

  if (editingId === question.id && useInlineScoreForm) {
    const handleRiSave = async () => {
      try {
        await invoke('update_question_score', {
          args: {
            id: question.id,
            score: riIsScored ? parseInt(riScoreValue) || 0 : 0,
            is_scored: riIsScored,
            question_type: question.question_type || 'normal',
            display_text: null,
          }
        });
      } catch (err) {
        console.error('Failed to save required_instance score:', err);
      }
      onCancel();
      if (onRefresh) onRefresh();
      if (onQuestionsUpdated) onQuestionsUpdated();
    };
    return (
      <div className={level > 0 && parentLayout !== "grid" ? "ml-12" : ""}>
        <div className="rounded-lg border-2 border-purple-400 dark:border-purple-600 bg-white dark:bg-slate-900 shadow-lg p-3 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
              {prefix}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">✏️ แก้ไขคะแนน</span>
            <span className="flex-1 text-xs text-slate-500 dark:text-slate-400 truncate">{question.content}</span>
          </div>
          {/* Score Row */}
          <div className="rounded-md border border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/20 p-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">คะแนน</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={riIsScored}
                  onChange={(e) => setRiIsScored(e.target.checked)}
                  className="accent-purple-600 w-3.5 h-3.5"
                />
                มีคะแนน (is_scored)
              </label>
              {riIsScored && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={riScoreValue}
                    onChange={(e) => setRiScoreValue(e.target.value)}
                    className="w-16 px-2 py-0.5 text-xs border border-purple-300 dark:border-purple-700 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-purple-400"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">คะแนน</span>
                </div>
              )}
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <Button variant="outline" size="small" icon={<X className="w-3 h-3" />} onClick={onCancel} className="h-7 text-xs px-2">
              ยกเลิก
            </Button>
            <Button variant="primary" size="small" icon={<Save className="w-3 h-3" />} onClick={handleRiSave} className="h-7 text-xs px-2">
              บันทึก
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (editingId === question.id) {
    return (
      <div className={level > 0 && parentLayout !== "grid" ? "ml-12" : ""}>
        <QuestionFormCard
          prefix={prefix}
          level={level}
          sectionGroup={sectionGroup}
          isDefaultL1={isDefaultL1}
          isDefault300L2={isDefault300L2}
          initialContent={question.content}
          initialDescription={question.description || undefined}
          initialImage={initialImage}
          initialMetadata={question.metadata}
          onSave={(data) => {
            let metaObj: any = {};
            if (data.metadata) {
              try {
                metaObj = JSON.parse(data.metadata);
              } catch { }
            }
            // Save childLayout for L0 (100/300) or L0+L1 (200)
            const shouldSaveChildLayout = is200 ? (level === 0 || level === 1) : (level === 0);
            if (shouldSaveChildLayout) metaObj.childLayout = data.childLayout || childLayout;
            if (data.image) {
              metaObj.image = data.image;
            } else {
              delete metaObj.image;
            }
            const finalMetadata = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : null;
            onUpdate(
              question.id,
              data.content,
              data.description || null,
              finalMetadata,
              data.references,
            );
          }}
          onCancel={onCancel}
          documentId={documentId}
          sectionId={sectionId}
          existingId={question.id}
          initialReferences={question.references}
          onAlert={onAlert}
          childLayout={childLayout}
          questionSequence={qSeqNum}
          parentSubQuestionList={parentSubQuestionList}
          sectionOccupationBranches={sectionOccupationBranches}
          sectionSelectedBranch={sectionSelectedBranch}
          initialScore={question.score ?? 0}
          initialIsScored={!!question.is_scored}
          initialQuestionType={question.question_type || 'normal'}
          initialDisplayText={question.display_text || ''}
          initialIsGroupHeader={!!question.is_group_header}
          onRefresh={onRefresh}
          onQuestionsUpdated={onQuestionsUpdated}
          currentSectionNumber={sectionNumber}
        />
      </div>
    );
  }

  return (
    <div>
      <QuestionDisplayCard
        question={question}
        viewMode={viewMode}
        prefix={prefix}
        level={level}
        sectionGroup={sectionGroup}
        readOnly={readOnly}
        isExpanded={isExpanded}
        hasChildren={!!hasChildren}
        canAddSub={canAddSub}
        canInsertSibling={canInsertSibling}
        isFirst={isFirst}
        isLast={isLast}
        isDefaultL1={isDefaultL1}
        isDefault300L2={isDefault300L2}
        onToggle={() => onToggleCollapse(question.id)}
        onEdit={() => onStartEdit(question.id)}
        onDelete={() => onDelete(question)}
        onAddSub={() => onStartCreate(question.id)}
        onInsertAfter={() => onStartInsertAfter(question.id)}
        onMoveUp={() => onMoveUp(question.id, siblings)}
        onMoveDown={() => onMoveDown(question.id, siblings)}
        onImageClick={onImageClick}
        parentLayout={parentLayout}
        parentSubQuestionList={parentSubQuestionList}
      />

      {/* Insert After Form */}
      {isCreating && insertingAfterId === question.id && (
        <div className={level > 0 && parentLayout !== "grid" ? "ml-12" : ""}>
          <QuestionFormCard
            prefix={is200or300 ? buildPrefix200_300(level, qSeqNum + 1, sectionNumber, parentSequence) : buildPrefix(level, qSeqNum + 1, sectionNumber)}
            level={level}
            sectionGroup={sectionGroup}
            onSave={(data) => onCreate(data, question.parent_id || null, question.id)}
            onCancel={onCancel}
            documentId={documentId}
            sectionId={sectionId}
            onAlert={onAlert}
            parentSubQuestionList={parentSubQuestionList}
            sectionOccupationBranches={sectionOccupationBranches}
            sectionSelectedBranch={sectionSelectedBranch}
            currentSectionNumber={sectionNumber}
          />
        </div>
      )}

      {isExpanded && hasChildren && !(is300 && level === 1 && (qSeqNum === 3 || qSeqNum === 4 || qSeqNum === 5) && question.question_type === 'exempted') && (
        <div className="relative">
          {childLayout !== "grid" && parentLayout !== "grid" && (
            <div className={`absolute ${level === 0 ? "left-[30px]" : "left-[62px]"} top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 to-transparent dark:from-blue-800 dark:to-transparent`} />
          )}
          <div className={childLayout === "grid" ? "grid grid-cols-1 md:grid-cols-2 ml-12" : ""}>
            {question.children!.map((child, idx) => (
              <QuestionTreeNode
                key={child.id}
                question={child}
                viewMode={viewMode}
                level={level + 1}
                sectionNumber={sectionNumber}
                sectionGroup={sectionGroup}
                parentSequence={question.sequence as number}
                parentSubQuestionList={ownSubQuestionList.length > 0 ? ownSubQuestionList : parentSubQuestionList}
                collapsedIds={collapsedIds}
                onToggleCollapse={onToggleCollapse}
                isParentDefault300L1={is300 && level === 0 && (qSeqNum === 1 || qSeqNum === 7)}
                readOnly={readOnly}
                editingId={editingId}
                isCreating={isCreating}
                creatingAtParent={creatingAtParent}
                insertingAfterId={insertingAfterId}
                onStartEdit={onStartEdit}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onStartCreate={onStartCreate}
                onStartInsertAfter={onStartInsertAfter}
                onCreate={onCreate}
                onCancel={onCancel}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                siblings={question.children!}
                isFirst={idx === 0}
                isLast={idx === question.children!.length - 1}
                documentId={documentId}
                sectionId={sectionId}
                onImageClick={onImageClick}
                onAlert={onAlert}
                parentLayout={childLayout}
                sectionOccupationBranches={sectionOccupationBranches}
                sectionSelectedBranch={sectionSelectedBranch}
                onRefresh={onRefresh}
                onQuestionsUpdated={onQuestionsUpdated}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Sub Form (Append) */}
      {isCreating && creatingAtParent === question.id && (
        <div className={childLayout === "grid" ? "m-1" : "ml-12 mt-1 mb-1"}>
          <QuestionFormCard
            prefix={is200or300 ? buildPrefix200_300(level + 1, (question.children?.length || 0) + 1, sectionNumber, qSeqNum) : buildPrefix(level + 1, (question.children?.length || 0) + 1, sectionNumber)}
            level={level + 1}
            sectionGroup={sectionGroup}
            onSave={(data) => onCreate(data, question.id, null)}
            onCancel={onCancel}
            documentId={documentId}
            parentId={question.id}
            sectionId={sectionId}
            onAlert={onAlert}
            parentSubQuestionList={ownSubQuestionList.length > 0 ? ownSubQuestionList : parentSubQuestionList}
            sectionOccupationBranches={sectionOccupationBranches}
            sectionSelectedBranch={sectionSelectedBranch}
            onRefresh={onRefresh}
            onQuestionsUpdated={onQuestionsUpdated}
            currentSectionNumber={sectionNumber}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(QuestionTreeNode);

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
  initialReferences?: QuestionReferenceDetail[];
  onSave: (data: {
    content: string;
    description?: string;
    image?: string;
    id?: string;
    references?: QuestionReferenceDetail[];
    metadata?: string;
    childLayout?: "list" | "grid";
  }) => void; // Added references, metadata & childLayout
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
  onQuestionsUpdated?: () => void;
  currentSectionNumber?: number; // For "Don't select yourself" logic in Section Picker
}

const EMPTY_REFS: QuestionReferenceDetail[] = [];

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
  onQuestionsUpdated,
}) => {
  const is200 = sectionGroup === 200;
  const is300 = sectionGroup === 300;
  const is200or300 = is200 || is300;
  const isL1 = level === 0;
  const isEdit = !!existingId;

  // Special question type detection for Section 300
  const isPrerequisiteQuestion = is300 && questionSequence && isL1 && questionSequence === 1; // 3xx.1 only
  // We need to know if its parent is 3xx.1. We can check prefix!
  // In Thai numerals: 1 is ๑. So `prefix.includes('.๑.')` works for 3xx.1.x
  const isPrerequisiteChild = is300 && !isL1 && questionSequence !== undefined && questionSequence >= 1 && questionSequence <= 2 && prefix.includes('.๑.'); // 3xx.1.1-3xx.1.2
  const isSection300Selector = is300 && !isL1 && questionSequence === 3 && prefix.includes('.๑.'); // 3xx.1.3 → select 300Sections (no score)
  const isSection100Selector = is300 && !isL1 && questionSequence === 4 && prefix.includes('.๑.'); // 3xx.1.4 → select 100Sections
  const isSection200Selector = is300 && !isL1 && questionSequence === 5 && prefix.includes('.๑.'); // 3xx.1.5 → select 200Sections
  const isExamChild = is300 && !isL1 && prefix.includes('.๗.'); // 3xx.7.1, 3xx.7.2 → no scoring controls
  // 3xx.6 L1 = required count practice (has scoring, no exempted, auto-creates L2 children)
  const is306L1 = is300 && isL1 && questionSequence === 6;
  const isDefaultDescL1 = is300 && isL1 && questionSequence !== undefined && questionSequence >= 2 && questionSequence <= 6;
  // 2xx.2 = ส่วนประกอบ, 2xx.4 = ค่าทำงาน — exempted toggle with default description when not exempted
  const isDefaultDescL1_200 = is200 && isL1 && (questionSequence === 2 || questionSequence === 4);
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
        2: 'จงอธิบายส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ ตามรายการที่กำหนด',
        4: 'จงอธิบายค่าทำงานปกติ ค่าสูงสุด ต่ำสุด ของการทำงาน ตามรายการที่กำหนด',
      };
      setDescription(DEFAULT_200_DESC[questionSequence] || '');
    }

  }, [isPrerequisiteQuestion, isSection300Selector, isSection100Selector, isSection200Selector, isDefaultDescL1, isDefaultDescL1_200, questionSequence]);

  const [imagePath, setImagePath] = useState<string | null>(initialImage || null);
  const [currentChildLayout, setCurrentChildLayout] = useState<"list" | "grid">(initialChildLayout);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [isBackgroundSaved, setIsBackgroundSaved] = useState(false);

  // ---- Score Editor State (Section 300 only) ----
  const [formScoreIsScored, setFormScoreIsScored] = useState<boolean>(initialIsScored);
  const [formScoreValue] = useState<string>(initialScore.toString());
  // Use DB value directly — backend seeds 3xx.1.1-3xx.1.5 as 'exempted' from creation
  const [formScoreType, setFormScoreType] = useState<string>(initialQuestionType);
  const [formScoreDisplayText] = useState<string>(initialDisplayText || '');

  // ---- Section Selector State (for 3xx.1.4 and 3xx.1.5) ----
  // NEW: Link-based approach using QuestionSectionLinks table (no content copying, no sync needed)
  interface SectionItem { id: number; section_number: number; title_th: string; menu_label: string; }
  interface SectionRefChild { id: string; parent_id: string; sequence: number; content: string; score: number; ref_section_id: number; ref_section_number: number; }
  const [, setAvailableSections] = useState<SectionItem[]>([]);
  const [, setSectionRefChildren] = useState<SectionRefChild[]>([]);
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
        .catch(err => console.error("Failed to check children count:", err));
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
  useEffect(() => {
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
          console.error("Failed to update question score:", error);
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
          console.error("Failed to update question score:", error);
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

  // ---- SubQuestionList Editor State (for L1 headers 2xx.2, 2xx.4, 3xx.2-3xx.5 only) ----
  // Base condition for showing sub-question editor
  const baseShowSubQuestionEditor = level === 0 && (
    (is200 && (questionSequence === 2 || questionSequence === 4)) ||
    (is300 && (questionSequence === 2 || questionSequence === 3 || questionSequence === 4 || questionSequence === 5))
  );

  // Disable for exempted prerequisite questions OR exempted 2xx.2/2xx.4
  const [showSubQuestionEditor, setShowSubQuestionEditor] = useState(() =>
    baseShowSubQuestionEditor
    && !(isPrerequisiteQuestion && formScoreType === 'exempted')
    && !(isPrerequisiteChild && formScoreType === 'exempted')
    && !(isDefaultDescL1_200 && formScoreType === 'exempted')
  );

  // Re-evaluate when formScoreType changes
  useEffect(() => {
    setShowSubQuestionEditor(
      baseShowSubQuestionEditor
      && !(isPrerequisiteQuestion && formScoreType === 'exempted')
      && !(isPrerequisiteChild && formScoreType === 'exempted')
      && !(isDefaultDescL1_200 && formScoreType === 'exempted')
    );
  }, [baseShowSubQuestionEditor, isPrerequisiteQuestion, isPrerequisiteChild, isDefaultDescL1_200, formScoreType]);
  const [useSubQuestions, setUseSubQuestions] = useState<boolean>(() => {
    if (!initialMetadata) return false;
    try { return JSON.parse(initialMetadata).useSubQuestions === true; } catch { return false; }
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
  // const [subQuestionList, setSubQuestionList] = useState<SubQuestionItem[]>(() => {

  const [selMainBranch, setSelMainBranch] = useState<string>(() => {
    if (sectionSelectedBranch) return sectionSelectedBranch.main;
    if (!initialMetadata) return "";
    try { return JSON.parse(initialMetadata).selectedBranch?.main || ""; } catch { return ""; }
  });
  const [selSubBranch, setSelSubBranch] = useState<string>(() => {
    if (sectionSelectedBranch) return sectionSelectedBranch.sub;
    if (!initialMetadata) return "";
    try { return JSON.parse(initialMetadata).selectedBranch?.sub || ""; } catch { return ""; }
  });
  const [activeSubQCodes, setActiveSubQCodes] = useState<string[]>(() => {
    if (!initialMetadata) return [];
    try { const m = JSON.parse(initialMetadata); return Array.isArray(m.activeSubQuestions) ? m.activeSubQuestions : []; } catch { return []; }
  });
  const [selectedSubQCodes, setSelectedSubQCodes] = useState<string[]>(() => {
    const saved: string[] = (() => {
      if (!initialMetadata) return [];
      try { const m = JSON.parse(initialMetadata); return Array.isArray(m.selectedSubQuestions) ? m.selectedSubQuestions : []; } catch { return []; }
    })();
    // For 300Template: auto-include alwaysChecked items from parentSubQuestionList
    const alwaysCodes = (sectionGroup === 300 && parentSubQuestionList)
      ? parentSubQuestionList.filter(sq => sq.alwaysChecked).map(sq => sq.code)
      : [];
    return Array.from(new Set([...saved, ...alwaysCodes]));
  });
  const [newMainName, setNewMainName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [isAddingMain, setIsAddingMain] = useState(false);
  const [isAddingSub, setIsAddingSub] = useState(false);
  // const [editingMainCode, setEditingMainCode] = useState<string | null>(null);
  // const [editingMainName, setEditingMainName] = useState("");
  const [editingSubCode, setEditingSubCode] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState("");
  const [newSqText, setNewSqText] = useState("");

  // Sync children for required count (L2→L3 for isPerformanceL2, L1→L2 for is306L1)
  // @ts-ignore
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
        console.error('Failed to sync 306 L2 children:', err);
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
        console.error('Failed to background save L2:', err);
        return;
      }
    } else {
      // Existing L2: update metadata so backend sync picks up latest sub-questions
      try {
        await invoke('update_question', {
          args: { id: questionId, content: content.trim() || '(รอบันทึก)', description: null, metadata: syncMetaStr }
        });
      } catch (err) {
        console.error('Failed to update L2 metadata before sync:', err);
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
      console.error('Failed to sync required count children:', err);
    }
  }, [is306L1, isPerformanceL2, existingId, generatedId, sectionId, documentId, parentId, content, description, requiredCount, scorePerInstance, useSubQuestions, selMainBranch, selSubBranch, activeSubQCodes, selectedSubQCodes]);

  // Fetch branches from DB on mount (both normal and 2xx.4)
  useEffect(() => {
    if (!showSubQuestionEditor) return;
    invoke<DbBranch[]>('get_occupation_branches').then(setDbBranches).catch(console.error);
  }, [showSubQuestionEditor]);

  // Fetch sub-branches when main branch changes (both normal and 2xx.4)
  useEffect(() => {
    if (!showSubQuestionEditor || !selMainBranch) { setDbSubBranches([]); return; }
    invoke<DbSubBranch[]>('get_occupation_sub_branches', { branchCode: selMainBranch }).then(setDbSubBranches).catch(console.error);
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
        .catch(console.error);
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
        .catch(console.error);
    }
  }, [showSubQuestionEditor, selMainBranch, selSubBranch, sectionOccupationBranches]);

  // --- The rest of the QuestionFormCard continues here, I'll resume in the next payload ---
  // Refs

  const [availableRefs, setAvailableRefs] = useState<SectionReferenceDetail[]>([]);
  const [linkedRefs, setLinkedRefs] = useState<QuestionReferenceDetail[]>(initialReferences);
  const [isRefExpanded, setIsRefExpanded] = useState(false);
  const [selectedRefId, setSelectedRefId] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [requireRef, setRequireRef] = useState<boolean>(() => {
    if (!initialMetadata) return false;
    try { return JSON.parse(initialMetadata).requireRef === true; } catch { return false; }
  });

  // Answer Key
  const [requireAnswerKey, setRequireAnswerKey] = useState<boolean>(() => {
    if (!initialMetadata) return false;
    try { return JSON.parse(initialMetadata).requireAnswerKey === true; } catch { return false; }
  });
  const [answerKey, setAnswerKey] = useState<string>(() => {
    if (!initialMetadata) return "";
    try { return JSON.parse(initialMetadata).answerKey || ""; } catch { return ""; }
  });

  // Per-subquestion Answer Keys
  // Dictionary: { "code": "answer" }
  const [answerKeys, setAnswerKeys] = useState<{ [key: string]: string }>(() => {
    if (!initialMetadata) return {};
    try { return JSON.parse(initialMetadata).answerKeys || {}; } catch { return {}; }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ content?: boolean; refs?: boolean; answerKey?: boolean }>({});
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg: string) => {
    if (onAlert) {
      onAlert(msg, "warning");
    } else {
      setAlertMessage(msg);
      setIsAlertOpen(true);
    }
  };

  useEffect(() => {
    if (sectionId) {
      invoke<SectionReferenceDetail[]>('get_section_references', { sectionId })
        .then((refs) => {
          setAvailableRefs(refs);
        })
        .catch((e) => {
          console.error("Failed to load section references:", e);
        });
    }
  }, [sectionId]);

  // Handle auto-expanding refs panel if validation fails
  useEffect(() => {
    if (errors.refs) {
      setIsRefExpanded(true);
    }
  }, [errors.refs]);


  // Determine if this question HAS a parent with sub-questions enabled
  const hasParentSubQ = !!parentSubQuestionList && parentSubQuestionList.length > 0;

  const handleSelectSubQ = (code: string) => {
    setSelectedSubQCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };
  const handleSelectAllSubQ = () => {
    if (hasParentSubQ) {
      setSelectedSubQCodes(parentSubQuestionList.map((sq) => sq.code));
    }
  };
  const handleDeselectAllSubQ = () => {
    // Keep only alwaysChecked items
    if (hasParentSubQ) {
      const alwaysCodes = parentSubQuestionList.filter(sq => sq.alwaysChecked).map(sq => sq.code);
      setSelectedSubQCodes(alwaysCodes);
    }
  };

  const handleAddReference = () => {
    if (!selectedRefId) return;
    const ref = availableRefs.find((r) => r.reference.id.toString() === selectedRefId);
    if (!ref) return;

    if (linkedRefs.length >= 2) {
      showAlert("สามารถอ้างอิงเอกสารได้สูงสุด 2 รายการต่อคำถาม");
      return;
    }

    if (linkedRefs.some((lr) => lr.reference.id === ref.reference.id)) {
      showAlert("เอกสารนี้ถูกอ้างอิงแล้ว");
      return;
    }

    setLinkedRefs((prev) => [
      ...prev,
      {
        id: Date.now(),
        question_id: existingId || generatedId || "",
        reference_id: ref.reference.id,
        location_text: pageInput.trim() || null,
        display_order: prev.length + 1,
        thai_letter: ref.thai_letter,
        reference: ref.reference,
      },
    ]);
    setSelectedRefId("");
    setPageInput("");
    setErrors((prev) => ({ ...prev, refs: false }));
  };

  const handleRemoveReference = (ref: QuestionReferenceDetail) => {
    setLinkedRefs((prev) => prev.filter((r) => r.reference.id !== ref.reference.id));
  };


  const handleSave = async () => {
    if (isSaving) return;

    const newErrors: any = {};
    if (!content.trim() && !isDefault300L2 && !isPrerequisiteQuestion && !isPrerequisiteChild && !isSection300Selector && !isSection100Selector && !isSection200Selector) {
      newErrors.content = true;
    }

    // Require Ref check (unless L1)
    if (requireRef && !isDefaultL1 && !is300 && linkedRefs.length === 0) {
      newErrors.refs = true;
      showAlert("กรุณาเลือกเอกสารอ้างอิงอย่างน้อย 1 รายการ หรือปิดการอ้างอิง");
    }

    // Require Answer Key check
    if (requireAnswerKey && !is300 && !isDefaultL1) {
      if (showSubQuestionEditor && useSubQuestions && activeSubQCodes.length === 0) {
        // No answer key needed here, sub-questions not selected
      } else if (hasParentSubQ && selectedSubQCodes.length > 0) {
        // Parent subQ mode: validate all selected subQs
        let missingCount = 0;
        selectedSubQCodes.forEach(code => {
          if (!(answerKeys[code] || "").trim()) missingCount++;
        });
        if (missingCount > 0) {
          newErrors.answerKey = true;
          showAlert("กรุณาระบุเฉลยสำหรับชิ้นส่วนย่อยที่เลือกให้ครบถ้วน");
        }
      } else {
        // Single question mode
        if (!answerKey.trim()) {
          newErrors.answerKey = true;
          showAlert("กรุณาระบุคำเฉลย หรือปิดฟังก์ชันคำเฉลย");
        }
      }
    }

    // Performance L2 checks (only validate if no L3 children created yet — if they exist, let user save to update title)
    if (isPerformanceL2) {
      const score = parseInt(formScoreValue) || 0;

      if (requiredCountChildren.length === 0) {
        // No L3 children generated yet
        if (requiredCount > 0) {
          if (scorePerInstance <= 0) {
            showAlert("กรุณาระบุ คะแนน/ครั้ง ให้มากกว่า 0 เมื่อมีการนับจำนวนครั้ง");
            return;
          }
        } else {
          if (score <= 0 && !isRequiredInstance) {
            showAlert("เมื่อจำนวนครั้งเป็น 0 (ประเมินครั้งเดียว) ต้องระบุคะแนนรวมมากกว่า 0");
            return;
          }
        }
      } else {
        // L3 children generated -> validate formScoreValue matches total sum or let backend handle it?
        // Better: let backend auto-calc, just validate scorePerInstance > 0
        if (scorePerInstance <= 0) {
          showAlert("กรุณาระบุ คะแนน/ครั้ง ให้มากกว่า 0");
          return;
        }
      }
    }

    // Exempted Prerequisite Child Score Reset Ensure
    if (isPrerequisiteChild && formScoreType === 'exempted') {
      // Score and text are handled by useEffect and db directly
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      const metadataToSave: any = {};

      // Handle L1 Sub-Questions State
      if (showSubQuestionEditor && useSubQuestions) {
        metadataToSave.useSubQuestions = true;
        if (selMainBranch) metadataToSave.selectedBranch = { main: selMainBranch, sub: selSubBranch };
        if (activeSubQCodes.length > 0) metadataToSave.activeSubQuestions = activeSubQCodes;
        // Legacy: keep subQuestionList for older viewers just in case
        metadataToSave.subQuestionList = activeSubQCodes.map(code => {
          const dictSq = dbSubQuestions.find(s => s.code === code);
          return { code, text: dictSq?.text || "", alwaysChecked: dictSq?.always_checked || false };
        });
      }

      // Handle L2 Selected Sub-Questions
      if (hasParentSubQ && selectedSubQCodes.length > 0) {
        metadataToSave.selectedSubQuestions = selectedSubQCodes;
      }

      // Extras & Answer Keys
      if (requireRef) metadataToSave.requireRef = true;
      if (requireAnswerKey) {
        metadataToSave.requireAnswerKey = true;
        if (hasParentSubQ && selectedSubQCodes.length > 0) {
          metadataToSave.answerKeys = answerKeys;
        } else {
          metadataToSave.answerKey = answerKey; // Save string directly
        }
      }

      // Clean up metadata
      if (!is200or300 && Object.keys(metadataToSave).length === 0) {
        // 100 section has no legacy subQuestions
      }

      // Image
      let finalImage = imagePath;
      if (!imagePath && initialImage) finalImage = null; // Removed
      else if (imagePath) finalImage = imagePath;

      const finalContent = isDefault300L2 ? initialContent : content.trim();

      onSave({
        content: finalContent,
        description: showDescription ? description : undefined,
        image: finalImage || undefined,
        id: generatedId || undefined,
        references: linkedRefs,
        metadata: Object.keys(metadataToSave).length > 0 ? JSON.stringify(metadataToSave) : undefined,
        childLayout: currentChildLayout,
      });

      // ---- Process form scores/types for Section 300 ----
      if (is300 && existingId) {
        const payloadScore = formScoreIsScored ? parseInt(formScoreValue) || 0 : 0;
        await invoke('update_question_score', {
          args: {
            id: existingId,
            score: payloadScore,
            is_scored: formScoreIsScored,
            question_type: formScoreType, // Can be 'exempted'
            display_text: formScoreDisplayText || null,
          }
        });
      } else if (is300 && generatedId) {
        // If it was just created in background, the score was 0. Update it now.
        const payloadScore = formScoreIsScored ? parseInt(formScoreValue) || 0 : 0;
        await invoke('update_question_score', {
          args: {
            id: generatedId,
            score: payloadScore,
            is_scored: formScoreIsScored,
            question_type: formScoreType,
            display_text: formScoreDisplayText || null,
          }
        });
      }

      // Update Group Header Status
      const qIdToUpdate = existingId || generatedId;
      if (qIdToUpdate && (isL1 || isPerformanceL2)) {
        await invoke('update_group_header_status', {
          id: qIdToUpdate,
          isGroupHeader: effectiveIsGroupHeader
        });
      }

      // Section Selectors update text from backend after saving score, triggers group score re-calc
      // Only do this if we are not exempted!
      if (qIdToUpdate && (isSection300Selector || isSection100Selector || isSection200Selector) && formScoreType !== 'exempted') {
        // Force refresh all questions via PqsQuestionSection to re-render score
        if (onRefresh) {
          onRefresh();
        }
        if (onQuestionsUpdated) {
          onQuestionsUpdated();
        }
      }

    } catch (error) {
      console.error("Save error:", error);
      setIsAlertOpen(true);
      setAlertMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    // If we generated an ID through background save but cancel, we should delete it.
    if (!existingId && generatedId && isBackgroundSaved) {
      try {
        await invoke('delete_question', { id: generatedId });
        console.log(`Cleaned up background-saved question ${generatedId}`);
      } catch (e) {
        console.error("Failed to cleanup background question", e);
      }
    }
    onCancel();
  };

  const handleUploadImage = async () => {
    try {
      const selectedPath = await openDialog({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpeg", "jpg", "webp", "gif"],
          },
        ],
      });

      if (selectedPath && typeof selectedPath === "string") {
        setImagePath(selectedPath);
      }
    } catch (e) {
      console.error("Failed to select image", e);
      showAlert("ไม่สามารถเลือกรูปภาพได้");
    }
  };

  const handleRemoveImage = () => {
    setImagePath(null);
  };
  return (
    <div
      className={`border rounded-lg p-3 sm:p-4 bg-white dark:bg-slate-900 shadow-sm transition-all
        ${isPrerequisiteQuestion ? 'border-amber-300 dark:border-amber-700/50 shadow-amber-100 dark:shadow-amber-900/10' :
          isSection300Selector || isSection100Selector || isSection200Selector ? 'border-amber-300 dark:border-amber-700/50 shadow-amber-100 dark:shadow-amber-900/10' :
            is200 ? 'border-orange-300 dark:border-orange-700/50 shadow-orange-100 dark:shadow-orange-900/10' :
              is300 ? 'border-purple-300 dark:border-purple-700/50 shadow-purple-100 dark:shadow-purple-900/10' :
                'border-blue-300 dark:border-blue-700/50 hover:border-blue-400 dark:hover:border-blue-600'}`
      }
    >
      <div className="flex flex-col gap-3">
        {/* Header indicator - Title + Required Note */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded font-bold text-xs shadow-sm
                ${isPrerequisiteQuestion ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
                  isSection300Selector || isSection100Selector || isSection200Selector ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
                    is200 ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' :
                      is300 ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white' :
                        'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'}`}
            >
              {prefix}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isEdit ? "แก้ไขเนื้อหา" : "สร้างคำถามใหม่"}
            </span>

          </div>
          <span className="text-xs font-medium text-red-500">* จำเป็นต้องกรอก</span>
        </div>


        {/* Form Fields container */}
        <div className="flex flex-col gap-3">

          {/* Type / Exempted Selector for 100/200/300 L1 (only default descriptions) */}
          {(isPrerequisiteQuestion || isDefaultDescL1 || isDefaultDescL1_200) && (
            <div className="rounded border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formScoreType === 'exempted'}
                  onChange={e => setFormScoreType(e.target.checked ? 'exempted' : 'normal')}
                  className="accent-amber-600 w-4 h-4"
                  disabled={hasActualChildren}
                />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  เว้นการปฏิบัติ (ไม่ต้องทดสอบหัวข้อนี้){hasActualChildren ? ' - ไปลบคำถามย่อยออกก่อนถึงจะติ๊กเว้นการปฏิบัติได้' : ''}
                </span>
              </label>
            </div>
          )}

          {/* Conditional Input based on Section Selector vs Normal Content */}
          {/* Main Question Content (Textarea) */}
          {!(isSection300Selector || isSection100Selector || isSection200Selector) && (
            <div className="relative">
              {!isDefault300L2 && (
                <textarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (errors.content) setErrors((prev) => ({ ...prev, content: false }));
                  }}
                  disabled={hasActualChildren && formScoreType === 'exempted'}
                  placeholder="พิมพ์ข้อความคำถามที่นี่..."
                  className={`w-full min-h-[80px] p-3 text-sm rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 resize-y transition-shadow placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed
                  ${errors.content
                      ? "border-2 border-red-400 dark:border-red-600 ring-2 ring-red-100 dark:ring-red-900/50 bg-red-50 dark:bg-red-900/10 placeholder:text-red-300"
                      : "border border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                />
              )}
              {isDefault300L2 && (
                <div className="w-full min-h-[80px] p-3 text-sm rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 select-none">
                  {initialContent} <span className="text-xs text-slate-400 ml-2">(ข้อความมาตรฐาน แก้ไขไม่ได้)</span>
                </div>
              )}
              {errors.content && (
                <span className="absolute -bottom-5 left-1 text-xs text-red-500 font-medium flex items-center gap-1 animate-in slide-in-from-top-1">
                  <X className="w-3 h-3" /> กรุณากรอกเนื้อหาคำถาม
                </span>
              )}
            </div>
          )}

          {/* Additional Settings Toggles */}
          {/* Show 3 toggle options only if not exempted */}
          {formScoreType !== 'exempted' && (!is300 || !isPrerequisiteChild) && (
            <div className={`flex flex-wrap items-center gap-4 py-1 border-t border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20 px-2 rounded ${isSection300Selector || isSection100Selector || isSection200Selector ? 'hidden' : ''}`}>
              {/* Description Toggle */}
              {(!isPrerequisiteQuestion && !isSection300Selector && !isSection100Selector && !isSection200Selector && !isDefaultDescL1 && !isDefaultDescL1_200) && (
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={showDescription}
                      onChange={(e) => {
                        setShowDescription(e.target.checked);
                        if (!e.target.checked) setDescription("");
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 rounded-full bg-slate-300 dark:bg-slate-600 peer-checked:bg-blue-500 transition-colors"></div>
                    <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-3"></div>
                  </div>
                  <span
                    className={`text-xs font-semibold transition-colors ${showDescription ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500 line-through"}`}
                  >
                    คำอธิบาย (Description)
                  </span>
                </label>
              )}

              {/* Sub-Questions Toggle (L1 default descriptions only: 2xx.2/4, 3xx.2/3/4/5) */}
              {showSubQuestionEditor && (
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={useSubQuestions}
                      onChange={(e) => setUseSubQuestions(e.target.checked)}
                      disabled={hasActualChildren && !useSubQuestions} // disable changing back to normal if actual L2 exist
                      className="sr-only peer disabled:cursor-not-allowed"
                    />
                    <div className={`w-7 h-4 rounded-full bg-slate-300 dark:bg-slate-600 transition-colors ${useSubQuestions ? sqClr.toggle : ''} ${hasActualChildren && !useSubQuestions ? 'opacity-50' : ''}`}></div>
                    <div className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${useSubQuestions ? 'translate-x-3' : ''}`}></div>
                  </div>
                  <span className={`text-xs font-semibold transition-colors ${useSubQuestions ? sqClr.textBold : "text-slate-400 dark:text-slate-500 line-through"}`}>
                    ใช้คำถามย่อย (Sub-Questions Option) {hasActualChildren && !useSubQuestions && '(มีคำถามย่อยจริงอยู่แล้ว)'}
                  </span>
                </label>
              )}

              {/* L2 Display Sub-Questions Selector Option (if parent had subQs enabled) */}
              {hasParentSubQ && (
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  ({parentSubQuestionList.length} หัวข้อย่อยผูกกับคำถามนี้)
                </span>
              )}

              {/* Image Toggle - Only for L1 config (Section 100/300) OR L0+L1 config (Section 200) */}
              {(!isPrerequisiteQuestion && !isSection300Selector && !isSection100Selector && !isSection200Selector) && (isDefaultL1 || (is200or300 && (level === 0 || level === 1))) && (
                <button
                  type="button"
                  onClick={handleUploadImage}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md border transition-colors ${imagePath
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  {imagePath ? "เปลี่ยนรูปภาพ" : "แนบรูปภาพ"}
                </button>
              )}

              {/* Child Layout Toggle (L1 Only for 100/300, L0+L1 for 200) */}
              {(!isPrerequisiteQuestion && !isSection300Selector && !isSection100Selector && !isSection200Selector) && (isDefaultL1 || (is200or300 && (level === 0 || level === 1))) && (
                <div className="flex items-center bg-slate-200/50 dark:bg-slate-700/50 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 ml-auto">
                  <Tooltip content="แสดงคำถามย่อยแบบ รายการ (แนวดิ่ง)">
                    <button
                      type="button"
                      onClick={() => setCurrentChildLayout("list")}
                      className={`p-1 rounded ${currentChildLayout === "list"
                        ? "bg-white shadow-sm text-blue-600 dark:bg-slate-600 dark:text-blue-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                    >
                      <ListChecks className="w-4 h-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="แสดงคำถามย่อยแบบ ตาราง (เรียงคู่)">
                    <button
                      type="button"
                      onClick={() => setCurrentChildLayout("grid")}
                      className={`p-1 rounded ${currentChildLayout === "grid"
                        ? "bg-white shadow-sm text-blue-600 dark:bg-slate-600 dark:text-blue-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="7" height="7" x="3" y="3" rx="1" />
                        <rect width="7" height="7" x="14" y="3" rx="1" />
                        <rect width="7" height="7" x="14" y="14" rx="1" />
                        <rect width="7" height="7" x="3" y="14" rx="1" />
                      </svg>
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          )}
          {/* L1 Sub-Questions Selector (for 2xx.2, 2xx.4, 3xx.2-3xx.5) */}
          {showSubQuestionEditor && useSubQuestions && (
            <div className={`mt-2 rounded-md border p-3 ${sqClr.bg} ${sqClr.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className={`w-4 h-4 ${sqClr.text}`} />
                <span className={`text-sm font-bold ${sqClr.textBold}`}>
                  เลือกคำถามย่อย (Sub-Questions)
                </span>
                <span className={`text-xs ${sqClr.textDim} ml-auto`}>
                  เลือกแล้ว {activeSubQCodes.length} ข้อ
                </span>
              </div>

              {/* Branch Selectors Row */}
              <div className="flex gap-2">
                {/* Main Branch Selector */}
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {sectionOccupationBranches ? 'เลือกสายวิทยาการ (Main Branch)' : 'เลือกพรรค (Main Branch)'}
                  </label>
                  <div className="flex gap-1" onDoubleClick={() => setIsAddingMain(true)}>
                    {!isAddingMain ? (
                      <select
                        value={selMainBranch}
                        onChange={(e) => {
                          setSelMainBranch(e.target.value);
                          setSelSubBranch("");
                          setActiveSubQCodes([]);
                        }}
                        className={`w-full h-8 text-xs border rounded bg-white dark:bg-slate-800 dark:text-white ${sqClr.selectBd} outline-none cursor-pointer`}
                      >
                        <option value="">-- เลือก --</option>
                        {dbBranches.map(b => (
                          <option key={b.code} value={b.code}>
                            {b.code} - {b.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newMainName.trim()) return setIsAddingMain(false);
                          // Determine next code
                          const codes = dbBranches.map(b => parseInt(b.code)).filter(c => !isNaN(c));
                          const nextCode = codes.length > 0 ? Math.max(...codes) + 1 : 1;
                          const codeStr = nextCode.toString().padStart(2, '0');
                          try {
                            const newBranch = await invoke<DbBranch>('add_occupation_branch', { code: codeStr, name: newMainName.trim() });
                            setDbBranches(prev => [...prev, newBranch]);
                            setSelMainBranch(newBranch.code);
                            setIsAddingMain(false);
                            setNewMainName("");
                          } catch (err) { console.error('Add main branch failed:', err); }
                        }}
                        className="flex-1 flex gap-1"
                      >
                        <input
                          autoFocus
                          value={newMainName}
                          onChange={e => setNewMainName(e.target.value)}
                          placeholder="ชื่อพรรคใหม่"
                          className={`flex-1 h-8 px-2 text-xs border rounded bg-white dark:bg-slate-800 ${sqClr.inputBd}`}
                        />
                        <button type="submit" className={`h-8 px-2 rounded text-xs whitespace-nowrap ${sqClr.btn}`}>บันทึก</button>
                        <button type="button" onClick={() => setIsAddingMain(false)} className="h-8 px-2 rounded bg-slate-200 dark:bg-slate-700 text-xs">ยกเลิก</button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Sub Branch Selector */}
                {!sectionOccupationBranches && (
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">เลือกเหล่า (Sub Branch)</label>
                    <div className="flex gap-1" onDoubleClick={() => selMainBranch && setIsAddingSub(true)}>
                      {!isAddingSub ? (
                        <select
                          value={selSubBranch}
                          onChange={(e) => {
                            setSelSubBranch(e.target.value);
                            setActiveSubQCodes([]);
                          }}
                          disabled={!selMainBranch}
                          className={`w-full h-8 text-xs border rounded bg-white dark:bg-slate-800 dark:text-white ${sqClr.selectBd} outline-none cursor-pointer disabled:opacity-50`}
                        >
                          <option value="">-- เลือก --</option>
                          {dbSubBranches.map(sb => (
                            <option key={sb.code} value={sb.code}>
                              {sb.code} - {sb.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newSubName.trim() || !selMainBranch) return setIsAddingSub(false);
                            // Determine next code based on main branch
                            const currentSubs = dbSubBranches.map(sb => sb.code);
                            let codeNum = 1;
                            let nextCodeStr = `${selMainBranch}${codeNum.toString().padStart(2, '0')}`;
                            while (currentSubs.includes(nextCodeStr)) {
                              codeNum++;
                              nextCodeStr = `${selMainBranch}${codeNum.toString().padStart(2, '0')}`;
                            }
                            try {
                              const newSub = await invoke<DbSubBranch>('add_occupation_sub_branch', { branchCode: selMainBranch, code: nextCodeStr, name: newSubName.trim() });
                              setDbSubBranches(prev => [...prev, newSub]);
                              setSelSubBranch(newSub.code);
                              setIsAddingSub(false);
                              setNewSubName("");
                            } catch (err) { console.error('Add sub branch failed:', err); }
                          }}
                          className="flex-1 flex gap-1"
                        >
                          <input
                            autoFocus
                            value={newSubName}
                            onChange={e => setNewSubName(e.target.value)}
                            placeholder="ชื่อเหล่าใหม่"
                            className={`flex-1 h-8 px-2 text-xs border rounded bg-white dark:bg-slate-800 ${sqClr.inputBd}`}
                          />
                          <button type="submit" className={`h-8 px-2 rounded text-xs whitespace-nowrap ${sqClr.btn}`}>บันทึก</button>
                          <button type="button" onClick={() => setIsAddingSub(false)} className="h-8 px-2 rounded bg-slate-200 dark:bg-slate-700 text-xs">ยกเลิก</button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-Questions Checklist */}
              {selMainBranch && (selSubBranch || sectionOccupationBranches) && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-purple-200/50 dark:border-purple-800/30">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">รายการคำถามย่อย (Dbl-Click เพื่อแก้ไข)</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const normalCodes = dbSubQuestions.filter(sq => !sq.always_checked).map(sq => sq.code);
                          setActiveSubQCodes(prev => Array.from(new Set([...prev, ...normalCodes])));
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${sqClr.activeAll}`}
                      >
                        เลือกทั้งหมด
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const alwaysCodes = dbSubQuestions.filter(sq => sq.always_checked).map(sq => sq.code);
                          setActiveSubQCodes(alwaysCodes); // Keep only alwaysChecked
                        }}
                        className="text-[10px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        ยกเลิกทั้งหมด
                      </button>
                    </div>
                  </div>

                  {dbSubQuestions.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2 text-center">ไม่มีรายการในหมวดหมู่นี้</div>
                  ) : (
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto p-1 pr-2 custom-scrollbar`}>
                      {dbSubQuestions.map((sq) => {
                        const isChecked = activeSubQCodes.includes(sq.code);
                        const isAlways = sq.always_checked;

                        return (
                          <label
                            key={sq.id}
                            onDoubleClick={() => {
                              // Only allow editing if not the special inherited list
                              if (!sectionOccupationBranches) {
                                setEditingSubCode(sq.code);
                                setEditingSubName(sq.text);
                              }
                            }}
                            className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors
                              ${isChecked
                                ? `${sqClr.activeBg} ${sqClr.itemBd} shadow-sm`
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700"
                              }
                              ${editingSubCode === sq.code ? 'ring-2 ring-blue-400 border-transparent' : ''}
                              ${isAlways ? 'opacity-80' : ''}`}
                            title={isAlways ? "ข้อบังคับ (Always Checked)" : "ดับเบิ้ลคลิกเพื่อแก้ไขข้อความ"}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isAlways} // Prevent unchecking always items
                              onChange={() => {
                                if (isAlways) return;
                                setActiveSubQCodes(prev =>
                                  prev.includes(sq.code)
                                    ? prev.filter(c => c !== sq.code)
                                    : [...prev, sq.code]
                                );
                              }}
                              className={`mt-0.5 w-3.5 h-3.5 rounded disabled:cursor-not-allowed ${sqClr.check}`}
                            />
                            {editingSubCode === sq.code ? (
                              <form
                                className="flex-1 flex flex-col gap-1"
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  if (!editingSubName.trim()) return setEditingSubCode(null);
                                  try {
                                    await invoke('update_sub_question', { id: sq.id, text: editingSubName.trim() });
                                    setDbSubQuestions(prev => prev.map(s => s.id === sq.id ? { ...s, text: editingSubName.trim() } : s));
                                    setEditingSubCode(null);
                                  } catch (err) { console.error('Update sq failed:', err); }
                                }}
                              >
                                <textarea
                                  autoFocus
                                  value={editingSubName}
                                  onChange={e => setEditingSubName(e.target.value)}
                                  className={`w-full text-xs p-1 h-16 border rounded ${sqClr.inputBd}`}
                                />
                                <div className="flex gap-1 justify-end">
                                  <button type="submit" className={`px-2 py-0.5 text-[10px] rounded ${sqClr.btn}`}>บันทึก</button>
                                  <button type="button" onClick={() => setEditingSubCode(null)} className="px-2 py-0.5 text-[10px] rounded bg-slate-200 dark:bg-slate-700">ยกเลิก</button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={`text-[9px] font-mono px-1 py-0.5 rounded leading-none shrink-0 ${sqClr.code}`}>
                                    {sq.code}
                                  </span>
                                  {isAlways && (
                                    <span className="text-[8px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 py-0.5 rounded">
                                      ภาคบังคับ
                                    </span>
                                  )}
                                  {sectionOccupationBranches && sq.sub_branch_code && (
                                    <span className="text-[8px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded truncate">
                                      {sq.sub_branch_code}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-xs leading-tight ${isChecked ? sqClr.itemText : "text-slate-600 dark:text-slate-300"}`}>
                                  {sq.text}
                                </span>
                              </div>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Add New Sub-Question Form */}
                  {!sectionOccupationBranches && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newSqText.trim()) return;
                        // Determine next sequence & code
                        const currentSeqs = dbSubQuestions.map(sq => sq.sequence);
                        let nextSeq = 1;
                        if (currentSeqs.length > 0) nextSeq = Math.max(...currentSeqs) + 1;
                        // Build code: S L MMMM NNNN X X... where M=Main, N=Sub, X=Seq
                        const sCode = is300 ? "3" : "2";
                        // Using questionSequence isn't always correct (e.g. 2xx.2 vs 2xx.4), but good enough for generic code if we know it's L1
                        const lCode = questionSequence ? questionSequence.toString() : "0";
                        const nextCodeStr = `${sCode}${lCode}${selMainBranch}${selSubBranch}${nextSeq}`;

                        try {
                          const newSq = await invoke<DbSubQuestion>('add_sub_question', {
                            branchCode: selMainBranch,
                            subBranchCode: selSubBranch,
                            code: nextCodeStr,
                            text: newSqText.trim(),
                            sequence: nextSeq,
                            alwaysChecked: false
                          });
                          setDbSubQuestions(prev => [...prev, newSq]);
                          setActiveSubQCodes(prev => [...prev, newSq.code]); // Auto-check it
                          setNewSqText("");
                        } catch (err) { console.error('Add sq failed:', err); }
                      }}
                      className="mt-2 flex gap-1"
                    >
                      <input
                        value={newSqText}
                        onChange={e => setNewSqText(e.target.value)}
                        placeholder="+ เพิ่มคำถามย่อยใหม่ในหมวดนี้..."
                        className={`flex-1 h-8 px-2 text-xs border rounded bg-white dark:bg-slate-800 focus:outline-none ${sqClr.inputBd}`}
                      />
                      <button
                        type="submit"
                        disabled={!newSqText.trim()}
                        className={`h-8 px-3 text-xs font-bold rounded transition-colors disabled:opacity-50 ${sqClr.btn}`}
                      >
                        เพิ่ม
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* L2 Display Sub-Questions Selector (when parent had subQs enabled) */}
          {hasParentSubQ && (
            <div className={`mt-2 rounded-md border p-3 ${sqClr.bg} ${sqClr.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className={`w-4 h-4 ${sqClr.text}`} />
                <span className={`text-sm font-bold ${sqClr.textBold}`}>
                  เชื่อมกับคำถามย่อย (Bind to Sub-Questions)
                </span>
                <span className={`text-xs ${sqClr.textDim} ml-auto`}>
                  เลือกแล้ว {selectedSubQCodes.length} ข้อ
                </span>
              </div>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={handleSelectAllSubQ}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${sqClr.activeAll}`}
                >
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllSubQ}
                  className="text-[10px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ยกเลิกทั้งหมด
                </button>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1 pr-2 custom-scrollbar`}>
                {parentSubQuestionList.map((sq, idx) => {
                  const isChecked = selectedSubQCodes.includes(sq.code);
                  const isAlways = sq.alwaysChecked;
                  return (
                    <label
                      key={sq.code}
                      className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors
                        ${isChecked
                          ? `${sqClr.activeBg} ${sqClr.itemBd} shadow-sm`
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700"
                        }
                        ${isAlways ? 'opacity-80' : ''}`}
                      title={isAlways ? "ข้อบังคับ (Always Checked)" : "เลือกเพื่อเชื่อมโยงกับคำถามนี้"}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isAlways} // Prevent unchecking always items
                        onChange={() => handleSelectSubQ(sq.code)}
                        className={`mt-0.5 w-3.5 h-3.5 rounded disabled:cursor-not-allowed ${sqClr.check}`}
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[10px] font-bold ${sqClr.textBold} w-4`}>
                            {toThaiAlphabet(idx + 1)}.
                          </span>
                          <span className={`text-[9px] font-mono px-1 py-0.5 rounded leading-none ${sqClr.code}`}>
                            {sq.code}
                          </span>
                          {isAlways && (
                            <span className="text-[8px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 py-0.5 rounded">
                              ภาคบังคับ
                            </span>
                          )}
                        </div>
                        <span className={`text-xs ml-5 leading-tight ${isChecked ? sqClr.itemText : "text-slate-600 dark:text-slate-300"}`}>
                          {sq.text}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reference & AnswerKey Toggles Group (Both L1 & L2) — hidden for 300Template */}
          {!is300 && !isDefaultL1 && (
            <div className={`flex flex-wrap items-center gap-4 py-2 border-t border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20 px-2 rounded ${hasParentSubQ || (showSubQuestionEditor && useSubQuestions) ? 'mt-2' : ''}`}>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={requireRef}
                    onChange={(e) => {
                      setRequireRef(e.target.checked);
                      if (!e.target.checked) setErrors((prev) => ({ ...prev, refs: false }));
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

          {/* References Section */}
          {!isDefaultL1 && !is300 && requireRef && (
            <>
              <label className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                <span>เอกสารอ้างอิง (References)</span>
                <span
                  className={`text-xs font-normal ${errors.refs ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}
                >
                  (เลือกแล้ว {linkedRefs.length}/2 รายการ)
                </span>
              </label>

              {/* Collapsible References */}
              <div
                className={`rounded-md overflow-hidden space-y-2 ${errors.refs ? "p-2 border border-red-500 bg-red-50 dark:bg-red-900/10" : ""}`}
              >
                {/* Selected Refs List (Always Visible) */}
                <div className="space-y-1">
                  {linkedRefs.map((ref, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm group/ref-item shadow-sm"
                    >
                      <span className="flex-1 truncate text-slate-700 dark:text-slate-200">
                        <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">
                          {ref.thai_letter ? `${ref.thai_letter}.` : "?."}
                        </span>
                        {ref.reference.title}{" "}
                        <span className="text-slate-400 ml-1">
                          (หน้า {ref.location_text || "-"})
                        </span>
                      </span>
                      <Tooltip content="ลบเอกสารอ้างอิง">
                        <button
                          onClick={() => handleRemoveReference(ref)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  ))}
                </div>

                {/* Add Ref Section (Collapsible) */}
                {linkedRefs.length < 2 && (
                  <div
                    className={`border rounded-md transition-all duration-200 ${isRefExpanded
                      ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
                      : "border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50 dark:bg-slate-900/30"
                      }`}
                  >
                    <div
                      className="flex items-center justify-between p-2 cursor-pointer"
                      onClick={() => setIsRefExpanded(!isRefExpanded)}
                    >
                      <span
                        className={`text-xs font-medium ${isRefExpanded ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}
                      >
                        {isRefExpanded
                          ? "ซ่อนตัวเลือก (Hide Options)"
                          : "+ เพิ่มเอกสารอ้างอิง (Add Reference)"}
                      </span>
                      {isRefExpanded ? (
                        <ChevronDown className="w-4 h-4 text-blue-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    {isRefExpanded && (
                      <div className="p-2 border-t border-blue-100 dark:border-blue-800/50">
                        <div className="flex flex-col gap-2 animate-in slide-in-from-top-1">
                          <div className="max-h-[150px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-slate-900 p-1 custom-scrollbar">
                            {availableRefs.filter(
                              (avail) =>
                                !linkedRefs.some(
                                  (linked) => linked.reference.id === avail.reference.id,
                                ),
                            ).length === 0 ? (
                              <div className="text-center py-2 text-xs text-gray-400 italic">
                                ไม่มีเอกสารเพิ่มเติม
                              </div>
                            ) : (
                              availableRefs
                                .filter(
                                  (avail) =>
                                    !linkedRefs.some(
                                      (linked) => linked.reference.id === avail.reference.id,
                                    ),
                                )
                                .map((r) => {
                                  const isSelected = selectedRefId === r.reference.id.toString();
                                  return (
                                    <div
                                      key={r.reference.id}
                                      onClick={() =>
                                        setSelectedRefId((prev) =>
                                          prev === r.reference.id.toString()
                                            ? ""
                                            : r.reference.id.toString(),
                                        )
                                      }
                                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors border-b border-gray-100 dark:border-slate-800/50 last:border-0 ${isSelected ? "bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700" : "hover:bg-gray-50 dark:hover:bg-slate-800 border-transparent"}`}
                                    >
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

                                      <div className="flex-1 min-w-0 flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded shrink-0">
                                          {r.reference.code}
                                        </span>
                                        <Tooltip content={r.reference.title}>
                                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                            {r.reference.title}
                                          </span>
                                        </Tooltip>
                                      </div>

                                      <div className="shrink-0 flex items-center gap-2">
                                        {!is200 && (r.usage_count > 0 ? (
                                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                            Used: {r.usage_count}
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/20 opacity-80">
                                            Unused
                                          </span>
                                        ))}

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
                                  );
                                })
                            )}
                          </div>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              placeholder="เลขหน้า (เช่น 25, 1-5) ไม่ป้อนเลขหน้า จะแสดง -"
                              value={pageInput}
                              onChange={(e) => setPageInput(e.target.value)}
                              className="flex-1 px-2 py-1 h-8 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400"
                            />
                            <Button
                              variant="outline"
                              size="small"
                              onClick={handleAddReference}
                              disabled={!selectedRefId}
                              icon={<Plus className="w-3 h-3" />}
                              className="h-8 text-xs px-3"
                            >
                              เพิ่ม
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Image Preview */}
          {(!isPrerequisiteQuestion && !isSection300Selector && !isSection100Selector && !isSection200Selector) && imagePath && (
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

        {/* Answer Key (conditional) */}
        {!is300 && !isDefaultL1 && requireAnswerKey
          && !(showSubQuestionEditor && useSubQuestions && activeSubQCodes.length === 0)
          && !(hasParentSubQ && selectedSubQCodes.length === 0)
          && (
            <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2">
              {hasParentSubQ && selectedSubQCodes.length > 0 ? (
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

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 mt-2 border-t border-slate-100 dark:border-slate-800">
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
              className={`h-7 text-xs px-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        cancelText=""
      />
    </div>
  );
};
// ============ AsyncImagePreview ============

interface AsyncImagePreviewProps {
  // Added interface
  path: string;
  className?: string;
  onImageClick?: (src: string) => void;
}

const AsyncImagePreview: React.FC<AsyncImagePreviewProps> = ({ path, className, onImageClick }) => {
  const [src, setSrc] = useState<string>("");
  const [resolvedPath, setResolvedPath] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        if (!path) return;
        if (path.startsWith("http") || path.startsWith("asset")) {
          setSrc(path);
          return;
        }

        // Use backend to get base64 data directly (Reliable method)
        const base64Data = await invoke<string>("get_question_image_base64", { path });
        setSrc(base64Data);
        setResolvedPath(path); // Keep original path for opening
      } catch (e) {
        console.error("Failed to load image preview", e);
        // Fallback
        setSrc(convertFileSrc(path));
      }
    }
    load();
  }, [path]);

  if (!src) return <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 ${className}`} />;

  return (
    <Tooltip content="คลิกเพื่อเปิดรูปภาพขยาย">
      <img
        src={src}
        alt="Preview"
        className={`cursor-pointer ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          if (onImageClick) {
            onImageClick(src);
          } else if (resolvedPath) {
            invoke("open_path", { path: resolvedPath });
          }
        }}
        onError={() => {
          console.error("Image load error for src:", src);
        }}
      />
    </Tooltip>
  );
};

// Exporting helpers that might be useful externally
export { AsyncImagePreview, buildPrefix, buildPrefix200_300, convertThaiToArabic, QuestionFormCard, toThaiAlphabet, toThaiNumber };

