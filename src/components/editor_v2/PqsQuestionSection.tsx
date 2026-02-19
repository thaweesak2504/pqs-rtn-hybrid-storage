import { open as openDialog } from "@tauri-apps/api/dialog";
import { convertFileSrc, invoke } from "@tauri-apps/api/tauri";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Edit,
  FileDigit,
  FileQuestion,
  FileText,
  Globe,
  GripVertical,
  Image,
  ImageIcon,
  Layers,
  ListChecks,
  Lock,
  MessageSquarePlus,
  Mic,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Shield,
  Trash2,
  Video,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Button from "../ui/Button";
import DropdownMenu, { DropdownMenuItem } from "../ui/DropdownMenu";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import {
  QuestionDetail,
  QuestionReferenceDetail,
  SectionReferenceDetail,
} from "../../types/content";
import ConfirmModal from "../modals/ConfirmModal";
import ImagePreviewModal from "../modals/ImagePreviewModal";
import AnswerKeyEditor from "./AnswerKeyEditor";

// ============ Types ============

interface SubQuestionItem {
  code: string;
  text: string;
  alwaysChecked?: boolean;
}

// ============ Helpers ============

const toThaiNumber = (num: number | string) => {
  const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
  return num
    .toString()
    .split("")
    .map((d) => {
      const parsed = parseInt(d);
      return !isNaN(parsed) && parsed >= 0 && parsed <= 9 ? thaiDigits[parsed] : d;
    })
    .join("");
};

const toThaiAlphabet = (n: number) => {
  const alpha = [
    "ก",
    "ข",
    "ค",
    "ง",
    "จ",
    "ฉ",
    "ช",
    "ซ",
    "ฌ",
    "ญ",
    "ฎ",
    "ฏ",
    "ฐ",
    "ฑ",
    "ฒ",
    "ณ",
    "ด",
    "ต",
    "ถ",
    "ท",
    "ธ",
    "น",
    "บ",
    "ป",
    "ผ",
    "ฝ",
    "พ",
    "ฟ",
    "ภ",
    "ม",
    "ย",
    "ร",
    "ล",
    "ว",
    "ศ",
    "ษ",
    "ส",
    "ห",
    "ฬ",
    "อ",
    "ฮ",
  ];
  return alpha[n - 1] || `${n}`;
};

const convertThaiToArabic = (thaiStr: string) => {
  const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
  let result = thaiStr;
  thaiDigits.forEach((td, i) => {
    result = result.split(td).join(i.toString());
  });
  return result;
};

const buildPrefix = (level: number, sequence: number, sectionNumber: number) => {
  if (level === 0) return `${toThaiNumber(sectionNumber)}.${toThaiNumber(sequence)}`;
  return `${toThaiAlphabet(sequence)}.`;
};

const buildPrefix200 = (level: number, sequence: number, sectionNumber: number, parentSequence?: number) => {
  if (level === 0) return `${toThaiNumber(sectionNumber)}.${toThaiNumber(sequence)}`;
  if (level === 1 && parentSequence !== undefined) {
    return `${toThaiNumber(sectionNumber)}.${toThaiNumber(parentSequence)}.${toThaiNumber(sequence)}`;
  }
  return `${toThaiAlphabet(sequence)}.`;
};

// ============ Types ============

interface PqsQuestionSectionProps {
  docId: string;
  sectionId?: number;
  sectionNumber: number;
  sectionGroup?: 100 | 200 | 300;
  initialQuestions?: QuestionDetail[];
  readOnly?: boolean;
  refreshTrigger?: number;
  onReferencesUpdated?: () => void; // Added callback
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
}) => {
  const is200 = sectionGroup === 200;
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const [creatingAtParent, setCreatingAtParent] = useState<string | null>(null);
  const [insertingAfterId, setInsertingAfterId] = useState<string | null>(null); // New state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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

  const fetchQuestions = async () => {
    if (!docId || sectionId === undefined) return; // sectionId can be 0, so check for undefined
    try {
      setLoading(true);
      const data = await invoke<QuestionDetail[]>("get_document_questions_with_details", { docId });
      const filtered = data.filter(
        (q) =>
          q.section_id === sectionId ||
          (q.section_id === 0 && q.sequence >= sectionNumber && q.sequence < sectionNumber + 100),
      );
      setQuestions(filtered);
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

  const seq2SelectedBranch = useMemo((): { main: string; sub: string } => {
    if (!is200) return { main: "", sub: "" };
    const seq2 = questionTree.find(q => q.sequence === 2);
    if (!seq2?.metadata) return { main: "", sub: "" };
    try {
      const meta = JSON.parse(seq2.metadata);
      return { main: meta.selectedBranch?.main || "", sub: meta.selectedBranch?.sub || "" };
    } catch { return { main: "", sub: "" }; }
  }, [questionTree, is200]);

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
      await fetchQuestions();
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
      await fetchQuestions();
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
          await fetchQuestions();
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
      await fetchQuestions();
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
      await fetchQuestions();
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

        {!readOnly && !isCreating && !editingId && !is200 && (
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

      {/* ── Content ── */}
      <div className="space-y-1">
        {/* Create Form (Top-Level - Append) */}
        {isCreating && creatingAtParent === null && insertingAfterId === null && !is200 && (
          <QuestionFormCard
            prefix={buildPrefix(0, questionTree.length + 1, sectionNumber)}
            level={0}
            onSave={(data) => handleCreate(data, null)}
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
                level={0}
                sectionNumber={sectionNumber}
                sectionGroup={sectionGroup}
                sectionOccupationBranches={is200 && question.sequence === 4 ? seq2OccupationBranches : undefined}
                sectionSelectedBranch={is200 && question.sequence === 4 ? seq2SelectedBranch : undefined}
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
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isCreating && questionTree.length === 0 && (
          <div
            className="group relative overflow-hidden rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/30 py-14 cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/5"
            onClick={!readOnly ? () => handleStartCreate(null) : undefined}
          >
            <div className="flex flex-col items-center gap-3 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Layers className="w-7 h-7 text-blue-400 dark:text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  ยังไม่มีคำถามในหัวข้อนี้
                </p>
                {!readOnly && (
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

// ============ QuestionTreeNode ============

interface QuestionTreeNodeProps {
  question: QuestionDetail;
  level: number;
  sectionNumber: number;
  sectionGroup: 100 | 200 | 300;
  parentSequence?: number;
  readOnly: boolean;
  editingId: string | null;
  isCreating: boolean;
  creatingAtParent: string | null;
  insertingAfterId: string | null;
  onStartEdit: (id: string) => void;
  onUpdate: (
    id: string,
    content: string,
    description?: string | null,
    metadata?: string | null,
    references?: QuestionReferenceDetail[],
  ) => void;
  onDelete: (question: QuestionDetail) => void;
  onStartCreate: (parentId: string | null) => void;
  onStartInsertAfter: (afterId: string) => void;
  onCreate: (
    data: {
      content: string;
      description?: string;
      image?: string;
      id?: string;
      references?: QuestionReferenceDetail[];
      childLayout?: "list" | "grid";
    },
    parentId: string | null,
    afterId?: string | null,
  ) => void;
  onCancel: () => void;
  onMoveUp: (questionId: string, siblings: QuestionDetail[]) => void;
  onMoveDown: (questionId: string, siblings: QuestionDetail[]) => void;
  siblings: QuestionDetail[];
  isFirst: boolean;
  isLast: boolean;
  documentId: string;
  sectionId: number;
  onImageClick: (src: string) => void;
  onAlert: (message: string, type?: "warning" | "danger") => void;
  parentLayout?: "list" | "grid";
  parentSubQuestionList?: SubQuestionItem[];
  sectionOccupationBranches?: Record<string, { name: string; subs: Record<string, string> }>;
  sectionSelectedBranch?: { main: string; sub: string };
}

const QuestionTreeNode: React.FC<QuestionTreeNodeProps> = ({
  question,
  level,
  sectionNumber,
  sectionGroup,
  parentSequence,
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
}) => {
  const is200 = sectionGroup === 200;
  const [isExpanded, setIsExpanded] = useState(true);
  const prefix = is200
    ? buildPrefix200(level, question.sequence, sectionNumber, parentSequence)
    : buildPrefix(level, question.sequence, sectionNumber);
  const hasChildren = question.children && question.children.length > 0;
  const maxSubLevel = is200 ? 2 : 1;
  const canAddSub = level < maxSubLevel && !readOnly;
  const isDefault200L1 = is200 && level === 0;

  const [childLayout, setChildLayout] = useState<"list" | "grid">("list");

  useEffect(() => {
    if (question.metadata) {
      try {
        const meta = JSON.parse(question.metadata);
        setChildLayout(meta.childLayout || "list");
      } catch { }
    }
  }, [question.metadata]);

  // Extract parentSubQuestionList from this question's metadata (for passing to children)
  const ownSubQuestionList = useMemo((): SubQuestionItem[] => {
    if (!question.metadata) return [];
    try {
      const meta = JSON.parse(question.metadata);
      if (!meta.useSubQuestions) return [];
      const list: SubQuestionItem[] = Array.isArray(meta.subQuestionList) ? meta.subQuestionList : [];
      const activeCodes: string[] = Array.isArray(meta.activeSubQuestions) ? meta.activeSubQuestions : [];
      if (activeCodes.length === 0) return [];
      return list.filter(sq => activeCodes.includes(sq.code));
    } catch { return []; }
  }, [question.metadata]);

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

  if (editingId === question.id) {
    return (
      <div className={level > 0 && parentLayout !== "grid" ? "ml-12" : ""}>
        <QuestionFormCard
          prefix={prefix}
          level={level}
          sectionGroup={sectionGroup}
          isDefault200L1={isDefault200L1}
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
          questionSequence={question.sequence}
          parentSubQuestionList={parentSubQuestionList}
          sectionOccupationBranches={sectionOccupationBranches}
          sectionSelectedBranch={sectionSelectedBranch}
        />
      </div>
    );
  }

  return (
    <div>
      <QuestionDisplayCard
        question={question}
        prefix={prefix}
        level={level}
        sectionGroup={sectionGroup}
        readOnly={readOnly}
        isExpanded={isExpanded}
        hasChildren={!!hasChildren}
        canAddSub={canAddSub}
        isFirst={isFirst}
        isLast={isLast}
        isDefault200L1={isDefault200L1}
        onToggle={() => setIsExpanded(!isExpanded)}
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
            prefix={is200 ? buildPrefix200(level, question.sequence + 1, sectionNumber, parentSequence) : buildPrefix(level, question.sequence + 1, sectionNumber)}
            level={level}
            sectionGroup={sectionGroup}
            onSave={(data) => onCreate(data, question.parent_id || null, question.id)}
            onCancel={onCancel}
            documentId={documentId}
            sectionId={sectionId}
            onAlert={onAlert}
            parentSubQuestionList={parentSubQuestionList}
          />
        </div>
      )}

      {isExpanded && hasChildren && (
        <div className="relative">
          {childLayout !== "grid" && parentLayout !== "grid" && (
            <div className="absolute left-[30px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 to-transparent dark:from-blue-800 dark:to-transparent" />
          )}
          <div className={childLayout === "grid" ? "grid grid-cols-1 md:grid-cols-2 ml-12" : ""}>
            {question.children!.map((child, idx) => (
              <QuestionTreeNode
                key={child.id}
                question={child}
                level={level + 1}
                sectionNumber={sectionNumber}
                sectionGroup={sectionGroup}
                parentSequence={question.sequence}
                parentSubQuestionList={ownSubQuestionList.length > 0 ? ownSubQuestionList : parentSubQuestionList}
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
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Sub Form (Append) */}
      {isCreating && creatingAtParent === question.id && (
        <div className={childLayout === "grid" ? "m-1" : "ml-12 mt-1 mb-1"}>
          <QuestionFormCard
            prefix={is200 ? buildPrefix200(level + 1, (question.children?.length || 0) + 1, sectionNumber, question.sequence) : buildPrefix(level + 1, (question.children?.length || 0) + 1, sectionNumber)}
            level={level + 1}
            sectionGroup={sectionGroup}
            onSave={(data) => onCreate(data, question.id)}
            onCancel={onCancel}
            documentId={documentId}
            sectionId={sectionId}
            onAlert={onAlert}
            parentSubQuestionList={ownSubQuestionList.length > 0 ? ownSubQuestionList : parentSubQuestionList}
          />
        </div>
      )}
    </div>
  );
};

// ============ QuestionFormCard ============

interface QuestionFormCardProps {
  prefix: string;
  level: number; // New prop to determine if L1
  sectionGroup?: 100 | 200 | 300;
  isDefault200L1?: boolean; // Flag for default 200 L1 questions (restricted editing)
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
  sectionId?: number; // Added sectionId for fetching available references
  onAlert?: (message: string, type?: "warning" | "danger") => void;
  childLayout?: "list" | "grid";
  questionSequence?: number;
  parentSubQuestionList?: SubQuestionItem[];
  sectionOccupationBranches?: Record<string, { name: string; subs: Record<string, string> }>;
  sectionSelectedBranch?: { main: string; sub: string };
}

const EMPTY_REFS: QuestionReferenceDetail[] = [];

const QuestionFormCard: React.FC<QuestionFormCardProps> = ({
  prefix,
  level,
  sectionGroup = 100,
  isDefault200L1 = false,
  initialContent = "",
  initialDescription = "",
  initialImage = "",
  initialMetadata = null,
  initialReferences = EMPTY_REFS,
  onSave,
  onCancel,
  documentId,
  existingId,
  sectionId,
  onAlert,
  childLayout: initialChildLayout = "list",
  questionSequence,
  parentSubQuestionList,
  sectionOccupationBranches,
  sectionSelectedBranch,
}) => {
  const is200 = sectionGroup === 200;
  const [content, setContent] = useState(initialContent);
  const [description, setDescription] = useState(initialDescription);
  const [showDescription, setShowDescription] = useState(!!initialDescription); // State for optional description
  const [imagePath, setImagePath] = useState<string | null>(initialImage || null);
  const [currentChildLayout, setCurrentChildLayout] = useState<"list" | "grid">(initialChildLayout);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  // ---- SubQuestionList Editor State (for L1 headers 2xx.2, 2xx.4 only) ----
  type OccBranchMap = Record<string, { name: string; subs: Record<string, string> }>;
  const showSubQuestionEditor = is200 && level === 0 && (questionSequence === 2 || questionSequence === 4);
  const [useSubQuestions, setUseSubQuestions] = useState<boolean>(() => {
    if (!initialMetadata) return false;
    try { return JSON.parse(initialMetadata).useSubQuestions === true; } catch { return false; }
  });
  const [subQuestionList, setSubQuestionList] = useState<SubQuestionItem[]>(() => {
    if (!initialMetadata) return [];
    try { const m = JSON.parse(initialMetadata); return Array.isArray(m.subQuestionList) ? m.subQuestionList : []; } catch { return []; }
  });
  const [occupationBranches, setOccupationBranches] = useState<OccBranchMap>(() => {
    const merged: OccBranchMap = { ...(sectionOccupationBranches || {}) };
    if (initialMetadata) {
      try {
        const m = JSON.parse(initialMetadata);
        if (m.occupationBranches) {
          for (const [code, val] of Object.entries(m.occupationBranches as OccBranchMap)) {
            if (!merged[code]) merged[code] = { ...(val as any) };
            else merged[code].subs = { ...merged[code].subs, ...(val as any).subs };
          }
        }
      } catch { }
    }
    return merged;
  });
  const [selMainBranch, setSelMainBranch] = useState<string>(() => {
    // 2xx.4: บังคับใช้ค่าจาก 2xx.2 เสมอ
    if (sectionSelectedBranch) return sectionSelectedBranch.main;
    if (!initialMetadata) return "";
    try { return JSON.parse(initialMetadata).selectedBranch?.main || ""; } catch { return ""; }
  });
  const [selSubBranch, setSelSubBranch] = useState<string>(() => {
    // 2xx.4: บังคับใช้ค่าจาก 2xx.2 เสมอ
    if (sectionSelectedBranch) return sectionSelectedBranch.sub;
    if (!initialMetadata) return "";
    try { return JSON.parse(initialMetadata).selectedBranch?.sub || ""; } catch { return ""; }
  });
  const [activeSubQCodes, setActiveSubQCodes] = useState<string[]>(() => {
    if (!initialMetadata) return [];
    try { const m = JSON.parse(initialMetadata); return Array.isArray(m.activeSubQuestions) ? m.activeSubQuestions : []; } catch { return []; }
  });
  const [selectedSubQCodes, setSelectedSubQCodes] = useState<string[]>(() => {
    if (!initialMetadata) return [];
    try { const m = JSON.parse(initialMetadata); return Array.isArray(m.selectedSubQuestions) ? m.selectedSubQuestions : []; } catch { return []; }
  });
  const [newMainName, setNewMainName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [isAddingMain, setIsAddingMain] = useState(false);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [editingMainCode, setEditingMainCode] = useState<string | null>(null);
  const [editingMainName, setEditingMainName] = useState("");
  const [editingSubCode, setEditingSubCode] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState("");
  const [newSqText, setNewSqText] = useState("");

  // Auto-generate code: S + L + X + Y + Z
  const sCode = sectionGroup === 200 ? "2" : sectionGroup === 300 ? "3" : "1";
  const lCode = questionSequence?.toString() || "0";
  const autoCodePrefix = selMainBranch && selSubBranch ? `${sCode}${lCode}${selMainBranch}${selSubBranch}` : "";
  const nextZ = useMemo(() => {
    if (!autoCodePrefix) return "";
    const used = subQuestionList.filter(sq => sq.code.startsWith(autoCodePrefix)).map(sq => sq.code.slice(4));
    for (const z of ["1","2","3","4","5","6","7","8","9","A"]) { if (!used.includes(z)) return z; }
    return "";
  }, [autoCodePrefix, subQuestionList]);
  const autoCode = autoCodePrefix && nextZ ? `${autoCodePrefix}${nextZ}` : "";
  const filteredItems = useMemo(() => {
    if (!autoCodePrefix) return [];
    return subQuestionList.filter(sq => sq.code.startsWith(autoCodePrefix));
  }, [autoCodePrefix, subQuestionList]);
  const prevPrefixRef = useRef(autoCodePrefix);
  useEffect(() => {
    if (prevPrefixRef.current !== autoCodePrefix && prevPrefixRef.current !== "") {
      if (autoCodePrefix) setActiveSubQCodes(prev => prev.filter(c => c.startsWith(autoCodePrefix)));
    }
    prevPrefixRef.current = autoCodePrefix;
  }, [autoCodePrefix]);

  // hasParentSubQ: this question is a child of a L1 with SubQuestionList
  const hasParentSubQ = !!(parentSubQuestionList && parentSubQuestionList.length > 0);

  // Sync selectedSubQCodes เมื่อ parentSubQuestionList เปลี่ยน (reorder/delete)
  useEffect(() => {
    if (!parentSubQuestionList || parentSubQuestionList.length === 0) return;
    const validCodes = new Set(parentSubQuestionList.map(sq => sq.code));
    setSelectedSubQCodes(prev => prev.filter(c => validCodes.has(c)));
  }, [parentSubQuestionList]);

  // Reference Linking State
  const [availableRefs, setAvailableRefs] = useState<SectionReferenceDetail[]>([]);
  const [linkedRefs, setLinkedRefs] = useState<QuestionReferenceDetail[]>(initialReferences);
  const [selectedRefId, setSelectedRefId] = useState<string>("");
  const [pageInput, setPageInput] = useState<string>("");
  const [answerKey, setAnswerKey] = useState<string>(() => {
    if (!initialMetadata) return "";
    try {
      const meta = JSON.parse(initialMetadata);
      return meta.answerKey || "";
    } catch {
      return "";
    }
  });

  // Toggle states for optional required fields
  const [requireRef, setRequireRef] = useState<boolean>(() => {
    if (!initialMetadata) return is200 ? false : true; // Default: Unrequired for 200, Required for others
    try {
      const meta = JSON.parse(initialMetadata);
      return meta.requireRef !== false;
    } catch {
      return is200 ? false : true;
    }
  });
  const [requireAnswerKey, setRequireAnswerKey] = useState<boolean>(() => {
    if (!initialMetadata) return true;
    try {
      const meta = JSON.parse(initialMetadata);
      return meta.requireAnswerKey !== false;
    } catch {
      return true;
    }
  });

  const [isRefExpanded, setIsRefExpanded] = useState(false); // Collapsible State
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [errors, setErrors] = useState<{ content?: boolean; answerKey?: boolean; refs?: boolean }>(
    {},
  ); // Inline Validation State

  const isEdit = !!initialContent;
  const isL1 = level === 0;
  const showExtraButtons = is200 ? (level === 0 || level === 1) : isL1; // 200: show for L0 & L1, others: L0 only

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
        .catch((err) => console.error("Failed to fetch section references:", err));
    }
  }, [requireRef, sectionId]);

  const handleAddReference = async () => {
    if (!selectedRefId) return;
    const refIdNum = parseInt(selectedRefId);
    const selectedRef = availableRefs.find((r) => r.reference.id === refIdNum);
    if (!selectedRef) return;

    if (linkedRefs.some((r) => r.reference.id === refIdNum)) {
      if (onAlert) onAlert("เอกสารนี้ถูกเชื่อมโยงแล้ว", "warning");
      else alert("เอกสารนี้ถูกเชื่อมโยงแล้ว");
      return;
    }

    const newRef: QuestionReferenceDetail = {
      id: 0,
      question_id: existingId || "temp",
      reference_id: selectedRef.reference.id,
      reference: selectedRef.reference,
      location_text: pageInput || null,
      display_order: linkedRefs.length + 1,
      thai_letter: selectedRef.thai_letter,
    };

    if (existingId) {
      setLinkedRefs([...linkedRefs, newRef]);
      setSelectedRefId("");
      setPageInput("");
    } else {
      setLinkedRefs([...linkedRefs, newRef]);
      setSelectedRefId("");
      setPageInput("");
    }

    // Clear reference validation error if it exists
    if (errors.refs) setErrors((prev) => ({ ...prev, refs: false }));
  };

  const handleRemoveReference = async (ref: QuestionReferenceDetail) => {
    const updatedRefs = linkedRefs.filter((r) => r.reference.id !== ref.reference.id);
    setLinkedRefs(updatedRefs);

    // Also clear error state on removal to signal fresh state
    if (errors.refs) setErrors((prev) => ({ ...prev, refs: false }));
  };

  const handleImageUpload = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "Image", extensions: ["jpg", "jpeg", "png", "webp"] }],
      });

      if (selected && typeof selected === "string") {
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
          path: selected,
          documentId: documentId,
          questionId: targetId,
          friendlyPrefix: friendlyPrefix,
        });
        setImagePath(newPath);
      }
    } catch (err) {
      console.error("Failed to upload image:", err);
    }
  };

  const handleRemoveImage = async () => {
    if (imagePath) {
      try {
        await invoke("delete_question_image", { path: imagePath });
      } catch (err) {
        console.error("Failed to delete image file:", err);
      }
    }
    setImagePath(null);
  };

  const handleSave = () => {
    // Reset errors
    setErrors({});
    const newErrors: { content?: boolean; answerKey?: boolean; refs?: boolean } = {};
    let hasError = false;

    // Validation (skip answer key & refs for default 200 L1 — those fields are hidden)
    if (!content.trim()) {
      newErrors.content = true;
      hasError = true;
    }
    if (!isDefault200L1 && requireAnswerKey && !answerKey.trim()) {
      newErrors.answerKey = true;
      hasError = true;
    }
    if (!isDefault200L1 && requireRef && linkedRefs.length === 0) {
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
    // Save answer key
    if (requireAnswerKey && answerKey.trim()) {
      newMeta.answerKey = answerKey.trim();
    } else {
      delete newMeta.answerKey;
    }
    // Save SubQuestionList data (for 2xx.2 and 2xx.4 L1 headers)
    if (showSubQuestionEditor) {
      if (useSubQuestions) {
        newMeta.useSubQuestions = true;
        if (subQuestionList.length > 0) newMeta.subQuestionList = subQuestionList;
        else delete newMeta.subQuestionList;
        // 2xx.4: ไม่ save occupationBranches และ selectedBranch ลงใน metadata ตัวเอง (รับจาก 2xx.2 เสมอ)
        if (!sectionOccupationBranches) {
          if (Object.keys(occupationBranches).length > 0) newMeta.occupationBranches = occupationBranches;
          else delete newMeta.occupationBranches;
          if (selMainBranch) newMeta.selectedBranch = { main: selMainBranch, sub: selSubBranch };
          else delete newMeta.selectedBranch;
        } else {
          delete newMeta.occupationBranches;
          delete newMeta.selectedBranch;
        }
        newMeta.activeSubQuestions = activeSubQCodes;
      } else {
        delete newMeta.useSubQuestions;
        // เก็บ subQuestionList ไว้เพื่อให้กลับมาแก้ไขได้
        if (subQuestionList.length > 0) newMeta.subQuestionList = subQuestionList;
        else delete newMeta.subQuestionList;
        // 2xx.4: ไม่ save occupationBranches ลงใน metadata ตัวเอง
        if (!sectionOccupationBranches) {
          if (Object.keys(occupationBranches).length > 0) newMeta.occupationBranches = occupationBranches;
        } else {
          delete newMeta.occupationBranches;
        }
        delete newMeta.activeSubQuestions;
        delete newMeta.selectedBranch;
      }
    }
    // Save selectedSubQuestions (for child questions of L1 with SubQuestionList)
    if (hasParentSubQ) {
      if (selectedSubQCodes.length > 0) newMeta.selectedSubQuestions = selectedSubQCodes;
      else delete newMeta.selectedSubQuestions;
    }
    const metadataString = Object.keys(newMeta).length > 0 ? JSON.stringify(newMeta) : undefined;

    onSave({
      content,
      description: showExtraButtons ? description : undefined,
      image: showExtraButtons ? imagePath || undefined : undefined,
      id: !isEdit ? generatedId || undefined : undefined,
      references: requireRef ? linkedRefs : [],
      metadata: metadataString,
      childLayout: showExtraButtons ? currentChildLayout : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setAnswerKey("");
      onCancel();
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
          {showExtraButtons && (
            <div className="flex items-center gap-1">
              {!showDescription && (
                <button
                  type="button"
                  onClick={() => setShowDescription(true)}
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  title="เพิ่มคำอธิบาย"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              )}
              {!imagePath && (
                <button
                  type="button"
                  onClick={handleImageUpload}
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  title="เพิ่มรูปภาพ"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
              )}
              {!isDefault200L1 && (
                <button
                  type="button"
                  onClick={() => setCurrentChildLayout((prev) => (prev === "grid" ? "list" : "grid"))}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-all border shadow-sm
                    ${currentChildLayout === "grid"
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  title="สลับโหมดการแสดงผลคำถามย่อย"
                >
                  <Plus
                    className={`w-3 h-3 transition-transform ${currentChildLayout === "grid" ? "rotate-45" : ""}`}
                  />
                  {currentChildLayout === "grid" ? "2 คอลัมน์" : "1 คอลัมน์"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content (Main Question) - Compact & Auto-expanding */}
        <div>
          <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            คำถาม (Question) <span className="text-red-500">*</span>
          </label>
          <textarea
            ref={contentRef}
            autoFocus={!isDefault200L1}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (errors.content) setErrors((prev) => ({ ...prev, content: false }));
            }}
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์คำถาม..."
            disabled={isDefault200L1}
            className={`w-full p-2 border rounded-md text-sm font-semibold resize-none min-h-[36px] overflow-hidden leading-relaxed
              ${isDefault200L1 ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed" : ""}
              ${errors.content
                ? "border-red-500 bg-red-50 dark:bg-red-900/10 focus:ring-red-500 placeholder:text-red-300"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900/80 dark:text-slate-100 focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 placeholder:text-slate-300 dark:placeholder:text-slate-600"
              } focus:outline-none focus:ring-1`}
            rows={1}
          />
        </div>

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
                  placeholder="คำอธิบายเพิ่มเติม (Description)..."
                  className="w-full p-2 pr-7 border border-gray-200 dark:border-gray-700 rounded-md bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none text-sm min-h-[34px] overflow-hidden"
                  rows={1}
                />
                <button
                  onClick={() => {
                    setDescription("");
                    setShowDescription(false);
                  }}
                  className="absolute top-1.5 right-1.5 p-0.5 text-slate-300 hover:text-red-500 rounded opacity-0 group-hover/desc:opacity-100 transition-opacity"
                  title="ลบคำอธิบาย"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* ── SubQuestionList Editor (2xx.2 and 2xx.4 L1 headers only) ── */}
          {showSubQuestionEditor && (
            <div className="rounded-lg border border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-950/20 p-3 space-y-2">
              {/* Header + Opt-in Toggle */}
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                <span className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wider flex-1">
                  รายการคำถามย่อย (SubQuestion List)
                </span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <div className="relative inline-flex items-center">
                    <input type="checkbox" checked={useSubQuestions}
                      onChange={(e) => { setUseSubQuestions(e.target.checked); if (!e.target.checked) setActiveSubQCodes([]); }}
                      className="sr-only peer" />
                    <div className="w-7 h-4 rounded-full bg-slate-300 dark:bg-slate-600 peer-checked:bg-orange-500 transition-colors"></div>
                    <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-3"></div>
                  </div>
                  <span className={`text-[10px] font-semibold ${useSubQuestions ? "text-orange-600 dark:text-orange-400" : "text-slate-400 dark:text-slate-500"}`}>
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
                      <label className="block text-[10px] text-orange-600/70 dark:text-orange-400/50 mb-0.5">
                        สาขาอาชีพหลัก{sectionOccupationBranches && <span className="ml-1 text-[9px] text-slate-400">(จาก 2xx.2)</span>}
                      </label>
                      {!sectionOccupationBranches && editingMainCode ? (
                        <div className="flex gap-1">
                          <input type="text" maxLength={50} value={editingMainName} onChange={e => setEditingMainName(e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs border border-orange-300 dark:border-orange-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-orange-400" autoFocus />
                          <button onClick={() => { if (!editingMainName.trim()) return; setOccupationBranches(prev => ({ ...prev, [editingMainCode]: { ...prev[editingMainCode], name: editingMainName.trim() } })); setEditingMainCode(null); setEditingMainName(""); }}
                            className="px-1.5 py-1 text-[10px] font-bold rounded bg-orange-500 text-white hover:bg-orange-600"><CheckCircle className="w-3 h-3" /></button>
                          <button onClick={() => { setEditingMainCode(null); setEditingMainName(""); }}
                            className="px-1.5 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      ) : !sectionOccupationBranches && !isAddingMain ? (
                        <div className="flex gap-1">
                          <select value={selMainBranch} onChange={(e) => { setSelMainBranch(e.target.value); setSelSubBranch(""); setIsAddingSub(false); }}
                            className="flex-1 px-2 py-1.5 text-xs border border-orange-200 dark:border-orange-800 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-orange-400 outline-none">
                            <option value="">-- เลือก --</option>
                            {Object.entries(occupationBranches).map(([code, b]) => <option key={code} value={code}>{code} - {b.name}</option>)}
                          </select>
                          {selMainBranch && <>
                            <button onClick={() => { setEditingMainCode(selMainBranch); setEditingMainName(occupationBranches[selMainBranch]?.name || ""); }}
                              className="px-1.5 py-1 text-[10px] rounded border border-orange-200 dark:border-orange-700 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30" title="แก้ไขชื่อ"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => { if (!window.confirm(`ลบสาขา "${occupationBranches[selMainBranch]?.name}"?`)) return; const u = { ...occupationBranches }; delete u[selMainBranch]; setOccupationBranches(u); setSelMainBranch(""); setSelSubBranch(""); setSubQuestionList(prev => prev.filter(sq => !sq.code.startsWith(`${sCode}${lCode}${selMainBranch}`))); }}
                              className="px-1.5 py-1 text-[10px] rounded border border-red-200 dark:border-red-800/50 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="ลบสาขา"><Trash2 className="w-3 h-3" /></button>
                          </>}
                          <button onClick={() => setIsAddingMain(true)} className="px-1.5 py-1 text-[10px] font-bold rounded border border-orange-300 dark:border-orange-700 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200" title="เพิ่มสาขาใหม่"><Plus className="w-3 h-3" /></button>
                        </div>
                      ) : !sectionOccupationBranches ? (
                        <div className="flex gap-1">
                          <input type="text" placeholder="ชื่อสาขา" maxLength={50} value={newMainName} onChange={e => setNewMainName(e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs border border-orange-300 dark:border-orange-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-orange-400" autoFocus />
                          <button onClick={() => { if (!newMainName.trim()) return; const nc = (Object.keys(occupationBranches).length + 1).toString(); setOccupationBranches({ ...occupationBranches, [nc]: { name: newMainName.trim(), subs: {} } }); setSelMainBranch(nc); setSelSubBranch(""); setNewMainName(""); setIsAddingMain(false); }}
                            className="px-1.5 py-1 text-[10px] font-bold rounded bg-orange-500 text-white hover:bg-orange-600"><CheckCircle className="w-3 h-3" /></button>
                          <button onClick={() => { setNewMainName(""); setIsAddingMain(false); }} className="px-1.5 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        /* 2xx.4: disabled select แสดงค่าจาก 2xx.2 */
                        <select value={selMainBranch} disabled
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none cursor-not-allowed opacity-80">
                          <option value="">-- ไม่ได้เลือกใน 2xx.2 --</option>
                          {Object.entries(occupationBranches).map(([code, b]) => <option key={code} value={code}>{code} - {b.name}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Sub Branch */}
                    {selMainBranch && (
                      <div className="min-w-[140px] max-w-[280px] w-fit">
                        <label className="block text-[10px] text-orange-600/70 dark:text-orange-400/50 mb-0.5">สาขาย่อย</label>
                        {!sectionOccupationBranches && editingSubCode ? (
                          <div className="flex gap-1">
                            <input type="text" maxLength={50} value={editingSubName} onChange={e => setEditingSubName(e.target.value)}
                              className="flex-1 px-2 py-1.5 text-xs border border-orange-300 dark:border-orange-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-orange-400" autoFocus />
                            <button onClick={() => { if (!editingSubName.trim()) return; setOccupationBranches(prev => ({ ...prev, [selMainBranch]: { ...prev[selMainBranch], subs: { ...prev[selMainBranch].subs, [editingSubCode]: editingSubName.trim() } } })); setEditingSubCode(null); setEditingSubName(""); }}
                              className="px-1.5 py-1 text-[10px] font-bold rounded bg-orange-500 text-white hover:bg-orange-600"><CheckCircle className="w-3 h-3" /></button>
                            <button onClick={() => { setEditingSubCode(null); setEditingSubName(""); }} className="px-1.5 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                          </div>
                        ) : !sectionOccupationBranches && !isAddingSub ? (
                          <div className="flex gap-1">
                            <select value={selSubBranch} onChange={(e) => setSelSubBranch(e.target.value)}
                              className="flex-1 px-2 py-1.5 text-xs border border-orange-200 dark:border-orange-800 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-orange-400 outline-none">
                              <option value="">-- เลือก --</option>
                              {occupationBranches[selMainBranch] && Object.entries(occupationBranches[selMainBranch].subs).map(([code, name]) => <option key={code} value={code}>{code} - {name}</option>)}
                            </select>
                            {selSubBranch && <>
                              <button onClick={() => { setEditingSubCode(selSubBranch); setEditingSubName(occupationBranches[selMainBranch]?.subs[selSubBranch] || ""); }}
                                className="px-1.5 py-1 text-[10px] rounded border border-orange-200 dark:border-orange-700 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30" title="แก้ไขชื่อ"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => { if (!window.confirm(`ลบสาขาย่อย "${occupationBranches[selMainBranch]?.subs[selSubBranch]}"?`)) return; const us = { ...occupationBranches[selMainBranch].subs }; delete us[selSubBranch]; setOccupationBranches(prev => ({ ...prev, [selMainBranch]: { ...prev[selMainBranch], subs: us } })); setSelSubBranch(""); setSubQuestionList(prev => prev.filter(sq => !sq.code.startsWith(`${sCode}${lCode}${selMainBranch}${selSubBranch}`))); }}
                                className="px-1.5 py-1 text-[10px] rounded border border-red-200 dark:border-red-800/50 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="ลบสาขาย่อย"><Trash2 className="w-3 h-3" /></button>
                            </>}
                            <button onClick={() => setIsAddingSub(true)} className="px-1.5 py-1 text-[10px] font-bold rounded border border-orange-300 dark:border-orange-700 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200" title="เพิ่มสาขาย่อยใหม่"><Plus className="w-3 h-3" /></button>
                          </div>
                        ) : !sectionOccupationBranches ? (
                          <div className="flex gap-1">
                            <input type="text" placeholder="ชื่อสาขาย่อย" maxLength={50} value={newSubName} onChange={e => setNewSubName(e.target.value)}
                              className="flex-1 px-2 py-1.5 text-xs border border-orange-300 dark:border-orange-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-orange-400" autoFocus />
                            <button onClick={() => { if (!newSubName.trim()) return; const subs = occupationBranches[selMainBranch]?.subs || {}; const nc = (Object.keys(subs).length + 1).toString(); setOccupationBranches({ ...occupationBranches, [selMainBranch]: { ...occupationBranches[selMainBranch], subs: { ...subs, [nc]: newSubName.trim() } } }); setSelSubBranch(nc); setNewSubName(""); setIsAddingSub(false); }}
                              className="px-1.5 py-1 text-[10px] font-bold rounded bg-orange-500 text-white hover:bg-orange-600"><CheckCircle className="w-3 h-3" /></button>
                            <button onClick={() => { setNewSubName(""); setIsAddingSub(false); }} className="px-1.5 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          /* 2xx.4: disabled select แสดงค่าจาก 2xx.2 */
                          <select value={selSubBranch} disabled
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none cursor-not-allowed opacity-80">
                            <option value="">-- ไม่ได้เลือกใน 2xx.2 --</option>
                            {occupationBranches[selMainBranch] && Object.entries(occupationBranches[selMainBranch].subs).map(([code, name]) => <option key={code} value={code}>{code} - {name}</option>)}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Auto code display */}
                    {autoCodePrefix && (
                      <div className="shrink-0">
                        <label className="block text-[10px] text-orange-600/70 dark:text-orange-400/50 mb-0.5">รหัส (Auto)</label>
                        <div className="px-2 py-1.5 text-xs font-mono font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded">
                          {autoCode || <span className="text-slate-400">เต็ม</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Filtered item list for current branch */}
                  {filteredItems.length > 0 && (
                    <div className="space-y-1">
                      {filteredItems.map((item, localIdx) => {
                        const globalIdx = subQuestionList.findIndex(sq => sq.code === item.code);
                        return (
                          <div key={item.code} className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900/60 border border-orange-100 dark:border-orange-900/30 rounded-md group/sq-item">
                            <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 min-w-[1.5ch]">{toThaiAlphabet(localIdx + 1)}.</span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded shrink-0">{item.code}</span>
                            <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate">{item.text}</span>
                            {item.alwaysChecked && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full shrink-0">Auto ✓</span>}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/sq-item:opacity-100 transition-opacity">
                              <button onClick={() => { const u = [...subQuestionList]; u[globalIdx] = { ...u[globalIdx], alwaysChecked: !u[globalIdx].alwaysChecked }; setSubQuestionList(u); }}
                                className={`p-0.5 rounded transition-colors ${item.alwaysChecked ? 'text-emerald-500 hover:text-slate-400' : 'text-slate-400 hover:text-emerald-500'}`} title={item.alwaysChecked ? "ยกเลิกบังคับ" : "บังคับเลือกเสมอ"}>
                                <CheckCircle className="w-3 h-3" />
                              </button>
                              {localIdx > 0 && <button onClick={() => { const pi = subQuestionList.findIndex(sq => sq.code === filteredItems[localIdx - 1].code); const u = [...subQuestionList]; [u[pi], u[globalIdx]] = [u[globalIdx], u[pi]]; setSubQuestionList(u); }} className="p-0.5 text-slate-400 hover:text-blue-500 rounded" title="เลื่อนขึ้น"><ArrowUp className="w-3 h-3" /></button>}
                              {localIdx < filteredItems.length - 1 && <button onClick={() => { const ni = subQuestionList.findIndex(sq => sq.code === filteredItems[localIdx + 1].code); const u = [...subQuestionList]; [u[globalIdx], u[ni]] = [u[ni], u[globalIdx]]; setSubQuestionList(u); }} className="p-0.5 text-slate-400 hover:text-blue-500 rounded" title="เลื่อนลง"><ArrowDown className="w-3 h-3" /></button>}
                              <button onClick={() => setSubQuestionList(subQuestionList.filter((_, i) => i !== globalIdx))} className="p-0.5 text-slate-400 hover:text-red-500 rounded" title="ลบ"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add new item */}
                  {autoCode && (
                    <div className="flex gap-1.5 items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] text-orange-600/70 dark:text-orange-400/50 mb-0.5">ข้อความ — รหัส: <span className="font-mono font-bold">{autoCode}</span></label>
                        <input type="text" value={newSqText} onChange={e => setNewSqText(e.target.value)} placeholder="พิมพ์คำถามย่อย..."
                          className="w-full px-2 py-1.5 text-xs border border-orange-200 dark:border-orange-800 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-orange-400 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                          onKeyDown={e => { if (e.key === "Enter" && newSqText.trim()) { setSubQuestionList([...subQuestionList, { code: autoCode, text: newSqText.trim() }]); setNewSqText(""); } }} />
                      </div>
                      <button onClick={() => { if (!newSqText.trim()) return; setSubQuestionList([...subQuestionList, { code: autoCode, text: newSqText.trim() }]); setNewSqText(""); }}
                        disabled={!newSqText.trim()}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded border border-orange-300 dark:border-orange-700 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                        <Plus className="w-3 h-3" /> เพิ่ม
                      </button>
                    </div>
                  )}

                  {/* Step 2: Select active items for children */}
                  {filteredItems.length > 0 && autoCodePrefix && (() => {
                    const branchCodes = filteredItems.map(sq => sq.code);
                    const activeInBranch = activeSubQCodes.filter(c => branchCodes.includes(c));
                    const allActive = activeInBranch.length === filteredItems.length;
                    const alwaysCodes = filteredItems.filter(sq => sq.alwaysChecked).map(sq => sq.code);
                    return (
                      <div className="pt-2 border-t border-orange-200 dark:border-orange-800/50">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex-1">เลือกข้อย่อยที่ใช้งาน</span>
                          <span className="text-[10px] text-amber-500">{activeInBranch.length}/{filteredItems.length}</span>
                          <div className="flex gap-1 ml-auto">
                            <button type="button" onClick={() => setActiveSubQCodes(prev => [...prev.filter(c => !branchCodes.includes(c)), ...branchCodes])}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors ${allActive ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200'}`}>เลือกทั้งหมด</button>
                            <button type="button" onClick={() => setActiveSubQCodes(prev => [...prev.filter(c => !branchCodes.includes(c)), ...alwaysCodes])}
                              className="px-2 py-0.5 text-[10px] font-bold rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100">ยกเลิกทั้งหมด</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5">
                          {filteredItems.map((sq, idx) => {
                            const isActive = activeSubQCodes.includes(sq.code);
                            return (
                              <label key={sq.code} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer select-none text-xs ${isActive ? 'bg-amber-50 dark:bg-amber-900/20 text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                <input type="checkbox" checked={isActive} onChange={() => setActiveSubQCodes(prev => isActive ? prev.filter(c => c !== sq.code) : [...prev, sq.code])}
                                  className="w-3 h-3 rounded border-amber-400 text-amber-600 focus:ring-amber-500" />
                                <span className="font-bold text-amber-700 dark:text-amber-400 min-w-[1.5ch]">{toThaiAlphabet(idx + 1)}.</span>
                                <span className="flex-1 truncate">{sq.text}</span>
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
            <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <ListChecks className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">เลือกคำถามย่อย (Select Sub-Questions)</span>
                <span className="text-[10px] text-amber-500">{selectedSubQCodes.length}/{parentSubQuestionList!.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {parentSubQuestionList!.map((sq, idx) => {
                  const isChecked = selectedSubQCodes.includes(sq.code);
                  const isForced = sq.alwaysChecked === true;
                  return (
                    <label key={sq.code} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer select-none text-xs ${isChecked ? 'bg-amber-50 dark:bg-amber-900/20 text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'} ${isForced ? 'opacity-70' : ''}`}>
                      <input type="checkbox" checked={isChecked} disabled={isForced}
                        onChange={() => { if (isForced) return; setSelectedSubQCodes(prev => isChecked ? prev.filter(c => c !== sq.code) : [...prev, sq.code]); }}
                        className="w-3 h-3 rounded border-amber-400 text-amber-600 focus:ring-amber-500" />
                      <span className="font-bold text-amber-700 dark:text-amber-400 min-w-[1.5ch]">{toThaiAlphabet(idx + 1)}.</span>
                      <span className="flex-1">{sq.text}</span>
                      {isForced && <span className="text-[9px] text-emerald-500 font-bold">Auto ✓</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toggle Options: Reference + Answer Key (Hidden for default 200 L1) */}
          {!isDefault200L1 && (
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
                        setSelectedRefId("");
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

          {/* References Section (Both L1 & L2, conditional on toggle — hidden for default 200 L1) */}
          {!isDefault200L1 && requireRef && (
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
                {/* 1. Selected References List (Always Visible) */}
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
                      <button
                        onClick={() => handleRemoveReference(ref)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="ลบเอกสารอ้างอิง"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 2. Add Reference Section (Collapsible) */}
                {linkedRefs.length < 2 && (
                  <div
                    className={`border rounded-md transition-all duration-200 ${isRefExpanded
                      ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
                      : "border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50 dark:bg-slate-900/30"
                      }`}
                  >
                    {/* Toggle Header */}
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

                    {/* Selector Content */}
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
                                      {/* Thai Letter */}
                                      <span
                                        className={`text-[10px] font-bold w-5 text-center ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}
                                      >
                                        {r.thai_letter}.
                                      </span>

                                      {/* Selection Checkbox/Icon Area */}
                                      <div
                                        className={`shrink-0 w-6 h-6 rounded flex items-center justify-center border cursor-default ${isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400"}`}
                                      >
                                        {isSelected ? (
                                          <CheckCircle className="w-4 h-4" />
                                        ) : (
                                          // Resource Type Icon
                                          <>
                                            {r.reference.resource_type === "WEBLINK" ? (
                                              <Globe className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : r.reference.resource_type === "VIDEO" ? (
                                              <Video className="w-3.5 h-3.5 text-purple-500" />
                                            ) : r.reference.resource_type === "IMAGE" ? (
                                              <Image className="w-3.5 h-3.5 text-blue-500" />
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

                                      {/* Title Area */}
                                      <div className="flex-1 min-w-0 flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded shrink-0">
                                          {r.reference.code}
                                        </span>
                                        <span
                                          className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate"
                                          title={r.reference.title}
                                        >
                                          {r.reference.title}
                                        </span>
                                      </div>

                                      {/* Status Area (Usage + Class) */}
                                      <div className="shrink-0 flex items-center gap-2">
                                        {/* Usage Badge — hidden for 200 sections */}
                                        {!is200 && (r.usage_count > 0 ? (
                                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                            Used: {r.usage_count}
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/20 opacity-80">
                                            Unused
                                          </span>
                                        ))}

                                        {/* Classification Icon */}
                                        <div
                                          className="flex items-center"
                                          title={r.reference.classification || "Unclassified"}
                                        >
                                          {r.reference.classification === "Confidential" ||
                                            r.reference.classification === "Secret" ? (
                                            <Lock className="w-3.5 h-3.5 text-red-500" />
                                          ) : r.reference.classification === "Restricted" ? (
                                            <Shield className="w-3.5 h-3.5 text-blue-500" />
                                          ) : (
                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                          )}
                                        </div>
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

        {/* Answer Key (conditional on toggle — hidden for default 200 L1) */}
        {!isDefault200L1 && requireAnswerKey && (
          <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
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

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-300 dark:text-slate-600 select-none"></span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="small"
              icon={<X className="w-3 h-3" />}
              onClick={onCancel}
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

// Async Image Helper Component
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
    <img
      src={src}
      alt="Preview"
      title="คลิกเพื่อเปิดรูปภาพขยาย"
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
  );
};

// ============ QuestionDisplayCard ============

interface QuestionDisplayCardProps {
  question: QuestionDetail;
  prefix: string;
  level: number;
  sectionGroup?: 100 | 200 | 300;
  readOnly: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  canAddSub: boolean;
  isFirst: boolean;
  isLast: boolean;
  isDefault200L1?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSub: () => void;
  onInsertAfter: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onImageClick?: (src: string) => void;
  parentLayout?: "list" | "grid";
  parentSubQuestionList?: SubQuestionItem[];
}

const QuestionDisplayCard: React.FC<QuestionDisplayCardProps> = ({
  question,
  prefix,
  level,
  sectionGroup = 100,
  readOnly,
  isExpanded,
  hasChildren,
  canAddSub,
  isFirst,
  isLast,
  isDefault200L1 = false,
  onToggle,
  onEdit,
  onDelete,
  onAddSub,
  onInsertAfter,
  onMoveUp,
  onMoveDown,
  onImageClick,
  parentLayout = "list",
  parentSubQuestionList,
}) => {
  const isL1 = level === 0;
  const is200 = sectionGroup === 200;
  const showDescriptionImage = is200 ? (level === 0 || level === 1) : isL1;

  // Compute inline sub-question checkboxes for L2/L3
  const inlineSubQItems = useMemo(() => {
    if (!parentSubQuestionList || parentSubQuestionList.length === 0) return null;
    if (!question.metadata) return parentSubQuestionList.map(sq => ({ sq, checked: false }));
    try {
      const meta = JSON.parse(question.metadata);
      const selected: string[] = Array.isArray(meta.selectedSubQuestions) ? meta.selectedSubQuestions : [];
      return parentSubQuestionList.map(sq => ({ sq, checked: selected.includes(sq.code) }));
    } catch { return parentSubQuestionList.map(sq => ({ sq, checked: false })); }
  }, [parentSubQuestionList, question.metadata]); // 200: show for L0 & L1, others: L0 only

  return (
    <div
      className={`
      group relative flex items-start gap-3 px-4 py-3 transition-all duration-150
      ${isL1
          ? "bg-white dark:bg-slate-800"
          : parentLayout === "grid"
            ? "bg-slate-50/80 dark:bg-slate-800/80 m-1 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm"
            : "bg-slate-50/50 dark:bg-slate-800/50 ml-12"
        }
      ${!isLast && parentLayout !== "grid" ? "border-b border-gray-100 dark:border-slate-700/50" : ""}
      hover:bg-blue-50/50 dark:hover:bg-blue-950/20
    `}
    >
      {/* L2 connector dot */}
      {!isL1 && parentLayout !== "grid" && (
        <div className="absolute left-[-18px] top-[24px] -translate-y-1/2 flex items-center">
          <div className="w-[32px] h-px bg-blue-200 dark:bg-blue-800" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-blue-700 shrink-0" />
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 mt-1 flex items-center justify-center rounded transition-all shrink-0
          ${hasChildren
            ? "text-slate-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            : "invisible"
          }`}
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Prefix Badge */}
      <span
        className={`
        shrink-0 inline-flex items-center justify-center
        ${isL1
            ? "rounded-md min-w-[36px] px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-700/70 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
            : "min-w-[24px] text-sm font-normal text-blue-600 dark:text-blue-400" // L2: No box, just text
          }
      `}
      >
        {prefix}
      </span>

      {/* Content */}
      <div
        className={`flex-1 flex flex-col min-w-0 select-text
        ${isL1
            ? "text-sm text-slate-900 dark:text-slate-100" // L1: Stronger emphasis
            : "text-sm text-slate-700 dark:text-slate-300" // L2: Normal weight as requested
          }
      `}
      >
        {/* Row 1: Content + Refs + Inline SubQ Checkboxes */}
        <div className={`flex items-center gap-2 min-w-0 ${inlineSubQItems ? "pr-2" : "pr-8"}`}>
          <div className="flex-1 truncate min-w-0" title={question.content}>
            <span className={isL1 ? "font-semibold" : "font-normal"}>{question.content}</span>
            {question.references && question.references.length > 0 && (
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400 font-normal">
                (
                {question.references
                  .map((ref) => `${ref.thai_letter || "?"}.${ref.location_text || "-"}`)
                  .join(", ")}
                )
              </span>
            )}
          </div>
          {/* Inline SubQ checkboxes — ชิดขวา */}
          {inlineSubQItems && (
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              {inlineSubQItems.map(({ sq, checked }, idx) => (
                <span key={sq.code} className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{toThaiAlphabet(idx + 1)}.</span>
                  <span className={`w-3.5 h-3.5 inline-flex items-center justify-center rounded border text-[9px] font-bold shrink-0
                    ${checked
                      ? "border-amber-400 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                      : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent"
                    }`}>
                    {checked ? "✓" : ""}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {showDescriptionImage && question.description && (
          <div className="mt-1 text-sm font-normal text-slate-500 dark:text-slate-300 whitespace-pre-wrap">
            {question.description}
          </div> // Description: Match L2 style
        )}
        {/* SubQuestionList display for 2xx.2 / 2xx.4 L1 */}
        {is200 && isL1 && question.metadata && (() => {
          try {
            const meta = JSON.parse(question.metadata);
            if (!meta.useSubQuestions) return null;
            const list: SubQuestionItem[] = Array.isArray(meta.subQuestionList) ? meta.subQuestionList : [];
            const activeCodes: string[] = Array.isArray(meta.activeSubQuestions) ? meta.activeSubQuestions : [];
            if (activeCodes.length === 0) {
              return (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400">
                  <span>⚠</span><span>ยังไม่ได้เลือกคำถามย่อยที่ใช้งาน</span>
                </div>
              );
            }
            const display = list.filter(sq => activeCodes.includes(sq.code));
            if (display.length === 0) {
              return (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400">
                  <span>⚠</span><span>ยังไม่ได้เลือกคำถามย่อยที่ใช้งาน</span>
                </div>
              );
            }
            return (
              <div className="mt-1.5 space-y-0.5">
                {display.map((sq, idx) => (
                  <div key={sq.code} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-300">
                    <span className="font-bold text-orange-600 dark:text-orange-400 min-w-[1.5ch]">{toThaiAlphabet(idx + 1)}.</span>
                    <span>{sq.text}</span>
                    {sq.alwaysChecked && <span className="text-[8px] text-emerald-500">✓</span>}
                  </div>
                ))}
              </div>
            );
          } catch { return null; }
        })()}
        {question.metadata && (
          <QuestionMetadataDisplay metadata={question.metadata} onImageClick={onImageClick} />
        )}
      </div>

      {/* Subtask count badge */}
      {hasChildren && (
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full shrink-0">
          {question.children?.length} sub
        </span>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="pl-2 border-l border-slate-200 dark:border-slate-700 shrink-0">
          <DropdownMenu
            trigger={
              <button className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            }
            items={
              isDefault200L1
                ? ([
                  ...(canAddSub
                    ? [{
                        label: "เพิ่มคำถามย่อย (Add Sub-Question)",
                        icon: <MessageSquarePlus />,
                        onClick: onAddSub,
                      }]
                    : []),
                  {
                    label: "แก้ไข (Edit)",
                    icon: <Edit />,
                    onClick: onEdit,
                  },
                ] as DropdownMenuItem[])
                : ([
                  {
                    label: "แทรกคำถามต่อท้าย (Insert After)",
                    icon: <Plus />,
                    onClick: onInsertAfter,
                  },
                  { label: "separator", onClick: () => { }, separator: true },
                  {
                    label: "เลื่อนขึ้น (Move Up)",
                    icon: <ArrowUp />,
                    onClick: onMoveUp,
                    disabled: isFirst,
                  },
                  {
                    label: "เลื่อนลง (Move Down)",
                    icon: <ArrowDown />,
                    onClick: onMoveDown,
                    disabled: isLast,
                  },
                  { label: "separator", onClick: () => { }, separator: true },
                  ...(canAddSub
                    ? [
                      {
                        label: "เพิ่มคำถามย่อย (Add Sub-Question)",
                        icon: <MessageSquarePlus />,
                        onClick: onAddSub,
                      },
                    ]
                    : []),
                  {
                    label: "แก้ไข (Edit)",
                    icon: <Edit />,
                    onClick: onEdit,
                  },
                  {
                    label: "ลบ (Delete)",
                    icon: <Trash2 />,
                    onClick: onDelete,
                    danger: true,
                  },
                ] as DropdownMenuItem[])
            }
          />
        </div>
      )}
    </div>
  );
};

// Helper to Display Metadata (Images)
const QuestionMetadataDisplay: React.FC<{
  metadata: string;
  onImageClick?: (src: string) => void;
}> = ({ metadata, onImageClick }) => {
  const formatAnswerKeyForDisplay = useCallback((raw: string): string => {
    const lines = raw.replace(/\r\n/g, "\n").split("\n");
    const out: string[] = [];

    const thaiAlphaRe = /^([ก-ฮ])\.\s+(.*)$/;
    const thaiDigitRe = /^([๐-๙]+)\.\s+(.*)$/;

    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? "";

      const alphaM = line.match(thaiAlphaRe);
      if (alphaM) {
        const items: string[] = [];
        while (i < lines.length) {
          const m = (lines[i] ?? "").match(thaiAlphaRe);
          if (!m) break;
          items.push(m[2]);
          i++;
        }
        out.push(`<ol class="thai-alpha">${items.map((t) => `<li>${t}</li>`).join("")}</ol>`);
        continue;
      }

      const digitM = line.match(thaiDigitRe);
      if (digitM) {
        const items: string[] = [];
        while (i < lines.length) {
          const m = (lines[i] ?? "").match(thaiDigitRe);
          if (!m) break;
          items.push(m[2]);
          i++;
        }
        out.push(`<ol class="thai-num">${items.map((t) => `<li>${t}</li>`).join("")}</ol>`);
        continue;
      }

      out.push(line);
      i++;
    }

    return out.join("\n");
  }, []);

  const data = useMemo(() => {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }, [metadata]);

  if (!data.image && !data.answerKey) return null;

  return (
    <div className="mt-2 ml-4 space-y-2">
      {/* Image Display (First) */}
      {data.image && (
        <AsyncImagePreview
          path={data.image}
          className="h-32 w-auto object-cover rounded border border-gray-200 dark:border-slate-700 shadow-sm transition-transform hover:scale-105"
          onImageClick={onImageClick}
        />
      )}

      {/* Answer Key Display (Last) — render as markdown */}
      {data.answerKey && (
        <div className="text-sm font-normal text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
          <div className="flex items-start gap-2">
            <span className="text-slate-900 dark:text-slate-100 shrink-0">เฉลย:</span>
            <div className="answer-key-markdown min-w-0 flex-1">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {formatAnswerKeyForDisplay(data.answerKey).replace(/\n/g, "  \n")}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PqsQuestionSection;
