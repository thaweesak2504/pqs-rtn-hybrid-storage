import { invoke } from "@tauri-apps/api/tauri";
import { Save, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { QuestionDetail, QuestionReferenceDetail } from "../../types/content";
import { buildPrefix, buildPrefix200_300 } from "../../utils/thaiNumbering";
import Button from "../ui/Button";
import { UserAnswer } from "./PqsQuestionSection";
import QuestionDisplayCard from "./QuestionDisplayCard";
import QuestionFormCard from "./QuestionFormCard";
import { logger } from '../../utils/logger';

// ============ Types ============
interface SubQuestionItem {
  code: string;
  text: string;
  alwaysChecked?: boolean;
}
// Note: UserAnswer is imported from PqsQuestionSection

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
  usageRefreshKey?: number;
  subQUsageParentId?: string;
  viewMode?: ViewMode;
  traineeAnswer?: UserAnswer;
  answerMap?: Map<string, UserAnswer>;
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
  usageRefreshKey = 0,
  subQUsageParentId,
  viewMode = 'edit',
  traineeAnswer,
  answerMap,
}) => {
  const is200 = sectionGroup === 200;
  const is300 = sectionGroup === 300;
  const is200or300 = is200 || is300;
  const isExpanded = !collapsedIds.has(question.id);
  // Parse question.metadata ONCE — all derived values below use this
  const parsedQuestionMeta = useMemo(() => {
    if (!question.metadata) return null;
    try { return JSON.parse(question.metadata); } catch { return null; }
  }, [question.metadata]);

  // Section-ref children (3xx.1.4/1.5 children) use section_number as prefix instead of ก.ข.ค.
  const refSectionMeta = useMemo(() => {
    if (!is300 || !parsedQuestionMeta) return null;
    return parsedQuestionMeta.refSectionId ? parsedQuestionMeta : null;
  }, [is300, parsedQuestionMeta]);
  const prefix = refSectionMeta?.refSectionNumber
    ? `${refSectionMeta.refSectionNumber}`
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
  const isExempted200L1 = is200 && level === 0 && question.question_type === 'exempted';
  const canAddSub = level < maxSubLevel && !readOnly && !is300LockedL1 && !is300L2NoL3 && !isPerformanceL2 && !is306L1Display && !isExempted200L1;
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
    if (parsedQuestionMeta) {
      setChildLayout(parsedQuestionMeta.childLayout || "list");
    }
  }, [parsedQuestionMeta]);

  const questionUsesOwnSubQuestions = useMemo(() => {
    return parsedQuestionMeta?.useSubQuestions === true;
  }, [parsedQuestionMeta]);

  // Extract parentSubQuestionList from DB (for passing to children)
  const [ownSubQuestionList, setOwnSubQuestionList] = useState<SubQuestionItem[]>([]);
  useEffect(() => {
    if (!parsedQuestionMeta || !parsedQuestionMeta.useSubQuestions) { setOwnSubQuestionList([]); return; }
    const activeCodes: string[] = Array.isArray(parsedQuestionMeta.activeSubQuestions) ? parsedQuestionMeta.activeSubQuestions : [];
    const selectedBranch: { main: string; sub: string } | undefined = parsedQuestionMeta.selectedBranch || sectionSelectedBranch;
    if (!selectedBranch?.main) { setOwnSubQuestionList([]); return; }
    // Build prefix from question.sequence + selectedBranch (S + L + X + Y)
    // This is the reliable way — activeCodes[0] may be from a different prefix
    const sCode = is300 ? "3" : "2";
    const lCode = question.sequence?.toString() || "0";
    const padBC = (c: string) => c === 'STD' ? '00' : c.padStart(2, '0');
    const derivedPrefix = `${sCode}${lCode}${padBC(selectedBranch.main)}${padBC(selectedBranch.sub)}`;
    invoke<{ id: number; code: string; text: string; always_checked: boolean }[]>(
      'get_all_sub_questions_for_branch',
      { branchCode: selectedBranch.main }
    ).then(dbSqs => {
      const prefixFiltered = derivedPrefix ? dbSqs.filter(sq => sq.code.startsWith(derivedPrefix)) : dbSqs;
      const filtered = prefixFiltered
        .filter(sq => activeCodes.length === 0 || activeCodes.includes(sq.code) || sq.always_checked)
        .map(sq => ({ code: sq.code, text: sq.text, alwaysChecked: sq.always_checked }));
      setOwnSubQuestionList(filtered);
    }).catch((err) => { logger.error('[ownSubQuestionList] invoke error:', err); setOwnSubQuestionList([]); });
  }, [parsedQuestionMeta, is300, question.sequence]);

  const effectiveChildSubQuestionList = questionUsesOwnSubQuestions
    ? ownSubQuestionList
    : parentSubQuestionList;

  // Preserve the topmost SubQ owner as the usage root for a consistent overview.
  // In 200Template only L1 has useSubQuestions; in 300Template both L1 AND L2 may
  // have it, but we want the L1 scope for all descendants.  Once an ancestor has
  // set subQUsageParentId, keep it — only set it when no ancestor has done so yet.
  const effectiveSubQUsageParentId = subQUsageParentId
    || (questionUsesOwnSubQuestions ? question.id : undefined);

  // Extract initial image from metadata
  const initialImage = useMemo(() => {
    return parsedQuestionMeta?.image || undefined;
  }, [parsedQuestionMeta]);

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
        logger.error('Failed to save required_instance score:', err);
      }
      onCancel();
      if (onRefresh) onRefresh();
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
          onSave={async (data) => {
            let metaObj: Record<string, unknown> = {};
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
            // Always send metadata string so backend can clear SubQ fields;
            // use '{}' instead of null to prevent optimistic-update fallback
            const finalMetadata = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : '{}';
            await onUpdate(
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
          parentId={question.parent_id || null}
          currentSectionNumber={sectionNumber}
          usageRefreshKey={usageRefreshKey}
          subQUsageParentId={effectiveSubQUsageParentId}
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
        traineeAnswer={traineeAnswer}
        answerMap={answerMap}
        documentId={documentId}
        onRefresh={onRefresh}
        usageRefreshKey={usageRefreshKey}
        sectionSelectedBranch={sectionSelectedBranch}
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
            parentId={question.parent_id || null}
            sectionId={sectionId}
            onAlert={onAlert}
            parentSubQuestionList={effectiveChildSubQuestionList}
            sectionOccupationBranches={sectionOccupationBranches}
            sectionSelectedBranch={sectionSelectedBranch}
            onRefresh={onRefresh}
            currentSectionNumber={sectionNumber}
            usageRefreshKey={usageRefreshKey}
            subQUsageParentId={effectiveSubQUsageParentId}
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
                parentSubQuestionList={effectiveChildSubQuestionList}
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
                usageRefreshKey={usageRefreshKey}
                subQUsageParentId={effectiveSubQUsageParentId}
                traineeAnswer={answerMap?.get(`${child.id}:`)}
                answerMap={answerMap}
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
            parentSubQuestionList={effectiveChildSubQuestionList}
            sectionOccupationBranches={sectionOccupationBranches}
            sectionSelectedBranch={sectionSelectedBranch}
            onRefresh={onRefresh}
            currentSectionNumber={sectionNumber}
            usageRefreshKey={usageRefreshKey}
            subQUsageParentId={effectiveSubQUsageParentId}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(QuestionTreeNode);


// Exporting helpers that might be useful externally
export { buildPrefix, buildPrefix200_300, convertThaiToArabic, toThaiAlphabet, toThaiNumber } from "../../utils/thaiNumbering";
export { default as AsyncImagePreview } from "./AsyncImagePreview";
export { QuestionFormCard };

