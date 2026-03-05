import { invoke } from "@tauri-apps/api/tauri";
import {
  ChevronDown,
  FileQuestion,
  Layers,
  Plus
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";

type ViewMode = 'edit' | 'qualifier' | 'trainee' | 'visitor' | 'print';

import {
  QuestionDetail,
  QuestionReferenceDetail
} from "../../types/content";
import ConfirmModal from "../modals/ConfirmModal";
import ImagePreviewModal from "../modals/ImagePreviewModal";
import QuestionTreeNode, { QuestionFormCard, buildPrefix } from "./QuestionTreeNode";

// ============ Types ============

export interface UserAnswer {
  user_id: string;
  question_id: string;
  document_id: string;
  sub_question_code: string;
  answer_text: string | null;
  status: 'pending' | 'passed' | 'needs_improvement';
  feedback: string | null;
  assessed_at: string | null;
  assessed_by: string | null;
  updated_at: string;
}

interface PqsQuestionSectionProps {
  docId: string;
  sectionId?: number;
  sectionNumber: number;
  sectionGroup?: 100 | 200 | 300;
  initialQuestions?: QuestionDetail[];
  readOnly?: boolean;
  refreshTrigger?: number;
  onReferencesUpdated?: () => void; // Added callback
  onQuestionsUpdated?: () => void;
  onProgressUpdate?: () => void; // Called after answers refresh (triggers banner re-fetch)
  // Document-level occupation branch (set in Edit Metadata)
  docBranchMain?: string;
  docBranchSub?: string;
  viewMode?: ViewMode;
}

// ============ Main Component ============

const PqsQuestionSection: React.FC<PqsQuestionSectionProps> = ({
  docId,
  sectionId,
  sectionNumber,
  sectionGroup = 100,
  initialQuestions = [],
  readOnly = false,
  refreshTrigger = 0,
  onReferencesUpdated,
  onQuestionsUpdated,
  onProgressUpdate,
  docBranchMain = '',
  docBranchSub = '',
  viewMode = 'edit',
}) => {
  const is200 = sectionGroup === 200;
  const is300 = sectionGroup === 300;

  // Internal check for question editing permissions
  const canManageQuestions = !readOnly && viewMode === 'edit';

  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [traineeAnswers, setTraineeAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  const [creatingAtParent, setCreatingAtParent] = useState<string | null>(null);
  const [insertingAfterId, setInsertingAfterId] = useState<string | null>(null); // New state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const handleToggleCollapse = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "warning" | "info";
    cancelText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    variant: "danger",
  });

  const fetchQuestions = async (silent?: boolean) => {
    if (!docId || sectionId === undefined) return; // sectionId can be 0, so check for undefined
    try {
      if (!silent) setLoading(true);
      const data = await invoke<QuestionDetail[]>("get_document_questions_with_details", { docId });
      const filtered = data.filter(
        (q) =>
          q.section_id === sectionId ||
          (q.section_id === 0 && q.sequence >= sectionNumber && q.sequence < sectionNumber + 100),
      );

      // For Section 300: recalculate group_score bottom-up (L2 → L1) so badges are always fresh
      if (sectionGroup === 300) {
        // First recalculate L2+ group headers (children with is_group_header)
        const l2GroupHeaders = filtered.filter(q => q.parent_id && q.is_group_header);
        for (const gh of l2GroupHeaders) {
          try {
            const freshScore = await invoke<number>('calculate_group_score', { parentId: gh.id });
            gh.group_score = freshScore;
          } catch { /* keep existing value */ }
        }
        // Then recalculate L1 group headers (top-level)
        const l1GroupHeaders = filtered.filter(q => !q.parent_id && q.is_group_header);
        for (const gh of l1GroupHeaders) {
          try {
            const freshScore = await invoke<number>('calculate_group_score', { parentId: gh.id });
            gh.group_score = freshScore;
          } catch { /* keep existing value */ }
        }
      }

      setQuestions(filtered);

      // --- Fetch Trainee Answers (NEW for Fluent Assessment) ---
      try {
        const answers = await invoke<UserAnswer[]>("get_trainee_answers", {
          userId: "T-001", // MOCK_TRAINEE_ID
          documentId: docId
        });
        setTraineeAnswers(answers);
        // Notify parent to refresh the progress banner after new answers are loaded
        onProgressUpdate?.();
      } catch (err) {
        console.error("Failed to fetch trainee answers:", err);
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (docId) {
      if (initialQuestions.length === 0) {
        fetchQuestions();
      } else {
        setQuestions(initialQuestions);
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, sectionId, refreshTrigger]);

  const getAllIds = (nodes: QuestionDetail[]): string[] =>
    nodes.flatMap(n => [n.id, ...(n.children ? getAllIds(n.children) : [])]);

  const questionTree = useMemo(() => {
    const tree: QuestionDetail[] = [];
    const map = new Map<string, QuestionDetail>();
    questions.forEach((q) => map.set(q.id, { ...q, children: [] }));
    questions.forEach((q) => {
      const node = map.get(q.id)!;
      if (q.parent_id && map.has(q.parent_id)) {
        map.get(q.parent_id)!.children!.push(node);
      } else {
        tree.push(node);
      }
    });
    const sortNodes = (nodes: QuestionDetail[]) => {
      nodes.sort((a, b) => a.sequence - b.sequence);
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) sortNodes(n.children);
      });
    };
    sortNodes(tree);
    return tree;
  }, [questions]);

  // Answer Map for lookup (Composite Key: question_id | sub_question_code)
  const answerMap = useMemo(() => {
    const map = new Map<string, UserAnswer>();
    traineeAnswers.forEach(ans => {
      const key = `${ans.question_id}:${ans.sub_question_code || ""}`;
      map.set(key, ans);
    });
    return map;
  }, [traineeAnswers]);

  const allIds = getAllIds(questionTree);
  const allCollapsed = allIds.length > 0 && allIds.every(id => collapsedIds.has(id));
  const handleToggleAll = () => {
    if (allCollapsed) {
      setCollapsedIds(new Set());
    } else {
      setCollapsedIds(new Set(allIds));
    }
  };

  // อ่าน occupationBranches และ selectedBranch จาก L1 seq=2 เพื่อส่งให้ L1 seq=4 (บังคับใช้สาขาเดียวกัน)
  type OccBranchMap = Record<string, { name: string; subs: Record<string, string> }>;
  const seq2OccupationBranches = useMemo((): OccBranchMap => {
    if (!is200) return {};
    const seq2 = questionTree.find(q => q.sequence === 2);
    if (!seq2?.metadata) return {};
    try {
      const meta = JSON.parse(seq2.metadata);
      return (meta.occupationBranches as OccBranchMap) || {};
    } catch { return {}; }
  }, [questionTree, is200]);

  const effectiveSelectedBranch = useMemo((): { main: string; sub: string } | undefined => {
    if (docBranchMain && docBranchSub) return { main: docBranchMain, sub: docBranchSub };
    if (!is200) return undefined;
    const seq2 = questionTree.find(q => q.sequence === 2);
    if (!seq2?.metadata) return undefined;
    try {
      const meta = JSON.parse(seq2.metadata);
      if (meta.selectedBranch?.main && meta.selectedBranch?.sub) {
        return { main: meta.selectedBranch.main, sub: meta.selectedBranch.sub };
      }
    } catch { return undefined; }
    return undefined;
  }, [questionTree, is200, docBranchMain, docBranchSub]);

  const resetForms = () => {
    setIsCreating(false);
    setCreatingAtParent(null);
    setInsertingAfterId(null);
    setEditingId(null);
  };

  const handleStartCreate = (parentId: string | null = null) => {
    resetForms();
    setCreatingAtParent(parentId);
    setIsCreating(true);
  };

  const handleStartInsertAfter = (targetId: string) => {
    resetForms();
    setInsertingAfterId(targetId);
    setIsCreating(true);
  };

  const handleCreate = async (
    data: {
      content: string;
      description?: string;
      image?: string;
      id?: string;
      references?: QuestionReferenceDetail[];
      metadata?: string;
      childLayout?: "list" | "grid";
    },
    parentId: string | null,
    insertAfterId: string | null = null,
  ) => {
    try {
      // 1. Create Question
      // Construct metadata from image AND answerKey (passed in data.metadata)
      let metaObj: any = {};
      if (data.metadata) {
        try {
          metaObj = JSON.parse(data.metadata);
        } catch { }
      }
      if (data.image) {
        metaObj.image = data.image;
      }
      if (data.childLayout) {
        metaObj.childLayout = data.childLayout;
      }
      const finalMetadata = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : null;

      const newId = await invoke<string>("create_question", {
        args: {
          id: data.id || null, // Pass custom ID if provided
          document_id: docId,
          section_id: sectionId,
          parent_id: parentId,
          content: data.content.trim(),
          description: data.description || null,
          is_header: false,
          sequence: null, // Let backend assign sequence
          answer_type: "text",
          metadata: finalMetadata, // Use merged metadata
        },
      });

      // 1.5 Save References if provided (for L1)
      if (data.references && data.references.length > 0) {
        for (const ref of data.references) {
          await invoke("add_question_reference", {
            req: {
              question_id: newId,
              reference_id: ref.reference.id,
              location_text: ref.location_text,
            },
          });
        }
      }

      // 2. If insertAfterId provided, reorder siblings immediately
      if (insertAfterId) {
        // Find siblings
        const allSiblings = parentId
          ? questions
            .filter((q) => q.parent_id === parentId)
            .sort((a, b) => a.sequence - b.sequence)
          : questions.filter((q) => !q.parent_id).sort((a, b) => a.sequence - b.sequence);

        // Construct new order: [...before, insertAfterId, NEW_ID, ...after]
        const insertionIndex = allSiblings.findIndex((q) => q.id === insertAfterId);
        if (insertionIndex !== -1) {
          const newOrderIds = [
            ...allSiblings.slice(0, insertionIndex + 1).map((q) => q.id),
            newId,
            ...allSiblings.slice(insertionIndex + 1).map((q) => q.id),
          ];
          await invoke("reorder_questions", { questionIds: newOrderIds });
        }
      }

      resetForms();
      await fetchQuestions(true);
      onQuestionsUpdated?.();
      onReferencesUpdated?.(); // Update references count after create
    } catch (err) {
      console.error("Failed to create question:", err);
    }
  };

  const handleUpdate = async (
    id: string,
    content: string,
    description?: string | null,
    metadata?: string | null,
    references?: QuestionReferenceDetail[],
  ) => {
    try {
      // Note: We might want to preserve existing metadata if not passed, but QuestionTreeNode passes the *updated* metadata logic.
      // So we just trust what is passed. If metadata is undefined, we might want to keep existing?
      // But for now, we assume caller handles it (which QuestionTreeNode does).
      // However, if called from simple edit where metadata isn't touched, we need to be careful.
      // QuestionTreeNode's onSave logic constructs full metadata.

      // Fallback: if metadata is undefined (not passed), keep existing.
      let finalMeta = metadata;
      if (metadata === undefined) {
        const q = questions.find((q) => q.id === id);
        finalMeta = q?.metadata || null;
      }

      // Fallback for description?
      let finalDesc = description;
      if (description === undefined) {
        const q = questions.find((q) => q.id === id);
        finalDesc = q?.description || null;
      }
      // Sanitize: never save 'undefined' or 'null' string literals to DB
      if (finalDesc === 'undefined' || finalDesc === 'null') finalDesc = null;

      await invoke("update_question", {
        args: {
          id,
          content: content.trim(),
          description: finalDesc,
          metadata: finalMeta,
        },
      });

      // 2. Sync References (if provided)
      if (references) {
        const question = questions.find((q) => q.id === id);
        const oldRefs = question?.references || [];
        const newRefs = references;

        // Diffing
        const toAdd = newRefs.filter(
          (nr) => !oldRefs.some((or) => or.reference.id === nr.reference.id),
        );
        const toRemove = oldRefs.filter(
          (or) => !newRefs.some((nr) => nr.reference.id === or.reference.id),
        );

        // Execute Additions
        for (const ref of toAdd) {
          await invoke("add_question_reference", {
            req: {
              question_id: id,
              reference_id: ref.reference_id, // Use reference_id
              location_text: ref.location_text,
            },
          });
        }

        // Execute Removals
        for (const ref of toRemove) {
          await invoke("remove_question_reference", { id: ref.id });
        }
      }

      resetForms();
      await fetchQuestions(true);
      onQuestionsUpdated?.();
      onReferencesUpdated?.(); // Update references count after all changes
    } catch (err) {
      console.error("Failed to update question:", err);
    }
  };

  const handleDelete = (question: QuestionDetail) => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการลบคำถาม",
      message: `คุณต้องการลบคำถามนี้ใช่หรือไม่?\n\n"${question.content}"\n\nคำเตือน: การลบนี้จะลบคำถามย่อยที่เกี่ยวข้องทั้งหมด`,
      onConfirm: async () => {
        try {
          await invoke("delete_question", { id: question.id });
          await fetchQuestions(true);
          onQuestionsUpdated?.();
          onReferencesUpdated?.(); // Update references count
        } catch (err) {
          console.error("Failed to delete:", err);
        }
      },
      variant: "warning",
    });
  };

  // ---- Reorder: Move Up/Down ----
  const handleMoveUp = async (questionId: string, siblings: QuestionDetail[]) => {
    const idx = siblings.findIndex((q) => q.id === questionId);
    if (idx <= 0) return; // Already first
    const reordered = [...siblings];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    try {
      await invoke("reorder_questions", { questionIds: reordered.map((q) => q.id) });
      await fetchQuestions(true);
    } catch (err) {
      console.error("Failed to reorder:", err);
    }
  };

  const handleMoveDown = async (questionId: string, siblings: QuestionDetail[]) => {
    const idx = siblings.findIndex((q) => q.id === questionId);
    if (idx < 0 || idx >= siblings.length - 1) return; // Already last
    const reordered = [...siblings];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    try {
      await invoke("reorder_questions", { questionIds: reordered.map((q) => q.id) });
      await fetchQuestions(true);
    } catch (err) {
      console.error("Failed to reorder:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-900"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"></div>
        </div>
        <span className="text-sm text-slate-400">กำลังโหลดคำถาม...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sectionNumber.toString().startsWith('2') ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
              sectionNumber.toString().startsWith('3') ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                sectionNumber.toString().startsWith('1') ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                  'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              }`}>
              <FileQuestion className="w-5 h-5" />
            </div>
            {questionTree.length > 0 && (
              <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border shadow-sm backdrop-blur-sm ${sectionNumber.toString().startsWith('2') ? 'bg-orange-50/80 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800' :
                sectionNumber.toString().startsWith('3') ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800' :
                  sectionNumber.toString().startsWith('1') ? 'bg-green-50/80 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' :
                    'bg-blue-50/80 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                }`}>
                {questionTree.length}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              รายการคำถาม
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Section {sectionNumber} · Question Items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {questionTree.length > 0 && (
            <button
              onClick={handleToggleAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all
                bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700
                text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200
                hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm"
            >
              {allCollapsed ? (
                <><ChevronDown className="w-3.5 h-3.5" /><span>ขยายทั้งหมด</span></>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5 rotate-180" /><span>ยุบทั้งหมด</span></>
              )}
            </button>
          )}
          {!readOnly && !isCreating && !editingId && (!is200 && !is300) && (
            <Button
              variant="primary"
              size="small"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => handleStartCreate(null)}
            >
              เพิ่มคำถาม (ท้ายสุด)
            </Button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="space-y-1">
        {/* Create Form (Top-Level - Append) */}
        {isCreating && creatingAtParent === null && insertingAfterId === null && (!is200 && !is300) && (
          <QuestionFormCard
            prefix={buildPrefix(0, questionTree.length + 1, sectionNumber)}
            level={0}
            onSave={(data: any) => handleCreate(data, null)}
            onCancel={resetForms}
            documentId={docId}
            sectionId={sectionId} // Pass sectionId
          />
        )}

        {/* Question Tree */}
        {questionTree.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            {questionTree.map((question, idx) => (
              <QuestionTreeNode
                key={question.id}
                question={question}
                viewMode={viewMode}
                level={0}
                sectionNumber={sectionNumber}
                sectionGroup={sectionGroup}
                sectionOccupationBranches={is200 && question.sequence === 4 ? seq2OccupationBranches : undefined}
                sectionSelectedBranch={(is200 || is300) ? effectiveSelectedBranch : undefined}
                collapsedIds={collapsedIds}
                onToggleCollapse={handleToggleCollapse}
                readOnly={readOnly}
                editingId={editingId}
                isCreating={isCreating}
                creatingAtParent={creatingAtParent}
                insertingAfterId={insertingAfterId}
                onStartEdit={(id) => {
                  resetForms();
                  setEditingId(id);
                }}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onStartCreate={handleStartCreate}
                onStartInsertAfter={handleStartInsertAfter}
                onCreate={handleCreate}
                onCancel={resetForms}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                siblings={questionTree}
                isFirst={idx === 0}
                isLast={idx === questionTree.length - 1}
                documentId={docId}
                sectionId={sectionId || 0} // Pass sectionId
                onImageClick={(src) => {
                  setSelectedImage(src);
                  setIsImageModalOpen(true);
                }}
                onAlert={(msg, type) =>
                  setConfirmModal({
                    isOpen: true,
                    title: "แจ้งเตือน",
                    message: msg,
                    onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
                    variant: type || "warning",
                    cancelText: "",
                  })
                }
                onRefresh={() => fetchQuestions(true)}
                onQuestionsUpdated={onQuestionsUpdated}
                traineeAnswer={answerMap.get(`${question.id}:`)}
                answerMap={answerMap}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isCreating && questionTree.length === 0 && (
          <div
            className="group relative overflow-hidden rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/30 py-14 cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/5"
            onClick={canManageQuestions ? () => handleStartCreate(null) : undefined}
          >
            <div className="flex flex-col items-center gap-3 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Layers className="w-7 h-7 text-blue-400 dark:text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  ยังไม่มีคำถามในหัวข้อนี้
                </p>
                {canManageQuestions && (
                  <p className="text-xs text-blue-500 mt-1 group-hover:text-blue-600 transition-colors">
                    + คลิกเพื่อเพิ่มคำถามแรก
                  </p>
                )}
              </div>
            </div>
            <div className="absolute top-4 right-6 opacity-[0.04] dark:opacity-[0.06]">
              <FileQuestion className="w-32 h-32 text-slate-900 dark:text-slate-100" />
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      <ImagePreviewModal // Added ImagePreviewModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageSrc={selectedImage || ""}
      />
    </div>
  );
};



export default PqsQuestionSection;
