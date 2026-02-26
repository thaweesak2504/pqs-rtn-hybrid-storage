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
  X
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

const buildPrefix200_300 = (level: number, sequence: number, sectionNumber: number, parentSequence?: number) => {
  if (level === 0) return `${toThaiNumber(sectionNumber)}.${toThaiNumber(sequence)}`;
  if (level === 1 && parentSequence !== undefined) {
    return `${toThaiNumber(sectionNumber)}.${toThaiNumber(parentSequence)}.${toThaiNumber(sequence)}`;
  }
  return `${toThaiAlphabet(sequence)}.`;
};

// Default descriptions for 3xx.2-3xx.6 L1 questions (locked, cannot be edited)
const DEFAULT_L1_DESC_BY_SEQ: Record<number, string> = {
  2: 'จงอธิบายหรือปฏิบัติงานปกติ ตามรายการที่กำหนด',
  3: 'จงอธิบายหรือปฏิบัติงานกรณีพิเศษ ตามรายการที่กำหนด',
  4: 'จงอธิบายหรือปฏิบัติงานกรณีเหตุขัดข้อง ตามรายการที่กำหนด',
  5: 'จงอธิบายหรือปฏิบัติงานกรณีเหตุฉุกเฉิน ตามรายการที่กำหนด',
  6: 'ผู้ทดสอบควบคุมการปฏิบัติหน้าที่ในตำแหน่งอย่างใกล้ชิด ประเมินผ่านการปฏิบัติหรือไม่',
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
  onQuestionsUpdated?: () => void;
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
}) => {
  const is200 = sectionGroup === 200;
  const is300 = sectionGroup === 300;
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
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
      await fetchQuestions();
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
          await fetchQuestions();
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

        <div className="flex items-center gap-2">
          {questionTree.length > 0 && (
            <button
              onClick={handleToggleAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all
                bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700
                text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200
                hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm"
              title={allCollapsed ? "ขยายทั้งหมด" : "ยุบทั้งหมด"}
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
                onRefresh={fetchQuestions}
                onQuestionsUpdated={onQuestionsUpdated}
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
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  isParentDefault300L1?: boolean;
  onRefresh?: () => void;
  onQuestionsUpdated?: () => void;
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
      ? buildPrefix200_300(level, question.sequence, sectionNumber, parentSequence)
      : buildPrefix(level, question.sequence, sectionNumber);
  const hasChildren = question.children && question.children.length > 0;
  // 300Template: 3xx.1.1-3xx.1.3 (L2, parentSeq=1, seq=1-3) can add L3; others cannot
  const is300L2AllowL3 = is300 && level === 1 && isParentDefault300L1 && parentSequence === 1 && question.sequence >= 1 && question.sequence <= 3;
  const maxSubLevel = is300L2AllowL3 ? 3 : is200or300 ? 2 : 1;
  // 300Template: 3xx.1 (seq=1) and 3xx.7 (seq=7) L1 cannot add L2 sub-questions
  const is300LockedL1 = is300 && level === 0 && (question.sequence === 1 || question.sequence === 7);
  // 300Template: default L2 that CANNOT add L3 (3xx.1.4-1.5, 3xx.7.1-7.2)
  const is300L2NoL3 = is300 && level === 1 && isParentDefault300L1 && !is300L2AllowL3;
  // Performance L2 (3xx.2-3xx.6) with required count children: disable manual "Add Sub-Question"
  const isPerformanceL2 = is300 && level === 1 && !isParentDefault300L1 && !!question.is_group_header;
  // 3xx.6 L1: children added only via required count, no manual "Add Sub-Question"
  const is306L1Display = is300 && level === 0 && question.sequence === 6;
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
          questionSequence={question.sequence}
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
            prefix={is200or300 ? buildPrefix200_300(level, question.sequence + 1, sectionNumber, parentSequence) : buildPrefix(level, question.sequence + 1, sectionNumber)}
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
          />
        </div>
      )}

      {isExpanded && hasChildren && !(is300 && level === 1 && (question.sequence === 4 || question.sequence === 5) && question.question_type === 'exempted') && (
        <div className="relative">
          {childLayout !== "grid" && parentLayout !== "grid" && (
            <div className={`absolute ${level === 0 ? "left-[30px]" : "left-[62px]"} top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 to-transparent dark:from-blue-800 dark:to-transparent`} />
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
                collapsedIds={collapsedIds}
                onToggleCollapse={onToggleCollapse}
                isParentDefault300L1={is300 && level === 0 && (question.sequence === 1 || question.sequence === 7)}
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
            prefix={is200or300 ? buildPrefix200_300(level + 1, (question.children?.length || 0) + 1, sectionNumber, question.sequence) : buildPrefix(level + 1, (question.children?.length || 0) + 1, sectionNumber)}
            level={level + 1}
            sectionGroup={sectionGroup}
            onSave={(data) => onCreate(data, question.id)}
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
  const isPrerequisiteChild = is300 && !isL1 && questionSequence !== undefined && questionSequence >= 1 && questionSequence <= 3 && prefix.includes('.๑.'); // 3xx.1.1-3xx.1.3
  const isSection100Selector = is300 && !isL1 && questionSequence === 4 && prefix.includes('.๑.'); // 3xx.1.4 → select 100Sections
  const isSection200Selector = is300 && !isL1 && questionSequence === 5 && prefix.includes('.๑.'); // 3xx.1.5 → select 200Sections
  const isExamChild = is300 && !isL1 && prefix.includes('.๗.'); // 3xx.7.1, 3xx.7.2 → no scoring controls
  // 3xx.6 L1 = required count practice (has scoring, no exempted, auto-creates L2 children)
  const is306L1 = is300 && isL1 && questionSequence === 6;
  // 3xx.7 L1 = up to command decision → no exempted/scoring
  const isFixedPracticeL1 = is300 && isL1 && questionSequence !== undefined && questionSequence >= 7;
  const isDefaultDescL1 = is300 && isL1 && questionSequence !== undefined && questionSequence >= 2 && questionSequence <= 6;
  // L2 children of 3xx.2-3xx.6 → can have required_count (จำนวนครั้ง) L3 children
  const isPerformanceL2 = is300 && level === 1 && !isPrerequisiteChild && !isSection100Selector && !isSection200Selector && !isExamChild;

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
    // If it's already exempted, don't show description
    if (initialQuestionType === 'exempted') return false;
    
    // Auto-show description for 3xx.1 prerequisite questions and 3xx.1.4/1.5 section selectors
    if (isPrerequisiteQuestion) return true;
    if (isSection100Selector || isSection200Selector) return true;
    // Auto-show description for 3xx.2-3xx.6 L1 questions
    if (isDefaultDescL1) return true;
    return !!initialDescription;
  });

  // Auto-set default description for 3xx.1, 3xx.1.4/1.5, and 3xx.2-3xx.6 L1
  // Force-overwrite on mount so description always matches the locked constant in code
  useEffect(() => {
    if (isPrerequisiteQuestion) {
      setDescription("เพื่อให้การทดสอบตาม มาตรฐานกำลังพลเกิดประโยชน์สูงสุดและสำเร็จตามวัตถุประสงค์ ผู้เข้ารับการทดสอบต้องมีคุณสมบัติ ดังต่อไปนี้");
    } else if (isSection100Selector) {
      setDescription("การปฏิบัติหน้าที่ในตำแหน่งนี้ ต้องผ่าน การทดสอบความรู้พื้นฐาน ที่กำหนด ดังนี้");
    } else if (isSection200Selector) {
      setDescription("การปฏิบัติหน้าที่ในตำแหน่งนี้ ต้องผ่าน การทดสอบระบบ ที่กำหนด ดังนี้");
    } else if (isDefaultDescL1 && questionSequence !== undefined) {
      setDescription(DEFAULT_L1_DESC_BY_SEQ[questionSequence] || '');
    }
   
  }, [isPrerequisiteQuestion, isSection100Selector, isSection200Selector, isDefaultDescL1, questionSequence]);

  const [imagePath, setImagePath] = useState<string | null>(initialImage || null);
  const [currentChildLayout, setCurrentChildLayout] = useState<"list" | "grid">(initialChildLayout);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [isBackgroundSaved, setIsBackgroundSaved] = useState(false);

  // ---- Score Editor State (Section 300 only) ----
  const [formScoreIsScored, setFormScoreIsScored] = useState<boolean>(initialIsScored);
  const [formScoreValue, setFormScoreValue] = useState<string>(initialScore.toString());
  const [formScoreType, setFormScoreType] = useState<string>(initialQuestionType);
  const [formScoreDisplayText, setFormScoreDisplayText] = useState<string>(initialDisplayText);

  // ---- Section Selector State (for 3xx.1.4 and 3xx.1.5) ----
  // NEW: Link-based approach using QuestionSectionLinks table (no content copying, no sync needed)
  interface SectionItem { id: number; section_number: number; title_th: string; menu_label: string; }
  interface SectionRefChild { id: string; parent_id: string; sequence: number; content: string; score: number; ref_section_id: number; ref_section_number: number; }
  const [availableSections, setAvailableSections] = useState<SectionItem[]>([]);
  const [sectionRefChildren, setSectionRefChildren] = useState<SectionRefChild[]>([]);
  // Fetch available sections (master data from Sections table)
  useEffect(() => {
    if (!(isSection100Selector || isSection200Selector) || !documentId) return;
    const targetGroup = isSection100Selector ? 100 : 200;
    invoke<{ id: number; document_id: string; section_group: number; section_number: number; title_th: string; menu_label: string; display_order: number; is_system_defined: number; duration_value: number | null; duration_unit: string | null; total_score: number | null; created_at: string; updated_at: string; }[]>('get_sections_by_document', { documentId })
      .then(sections => {
        const filtered = sections
          .filter(s => s.section_group === targetGroup)
          .map(s => ({ id: s.id, section_number: s.section_number, title_th: s.title_th, menu_label: s.menu_label }));
        setAvailableSections(filtered);
      })
      .catch(() => setAvailableSections([]));
  }, [isSection100Selector, isSection200Selector, documentId]);

  // Fetch existing L3 section-ref children (real Questions with question_type='section_ref')
  const fetchSectionRefChildren = useCallback(async () => {
    if (!(isSection100Selector || isSection200Selector) || !existingId) { setSectionRefChildren([]); return; }
    try {
      const children = await invoke<SectionRefChild[]>('get_section_ref_children', { parentId: existingId });
      setSectionRefChildren(children);
    } catch { setSectionRefChildren([]); }
  }, [isSection100Selector, isSection200Selector, existingId]);
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
    if ((isSection100Selector || isSection200Selector) && existingId) {
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
  }, [isSection100Selector, isSection200Selector, existingId, formScoreType, fetchSectionRefChildren]);

  // ---- SubQuestionList Editor State (for L1 headers 2xx.2, 2xx.4, 3xx.2-3xx.5 only) ----
  // Base condition for showing sub-question editor
  const baseShowSubQuestionEditor = level === 0 && (
    (is200 && (questionSequence === 2 || questionSequence === 4)) ||
    (is300 && (questionSequence === 2 || questionSequence === 3 || questionSequence === 4 || questionSequence === 5))
  );

  // Disable for exempted prerequisite questions (3xx.1 when question_type = 'exempted')
  const [showSubQuestionEditor, setShowSubQuestionEditor] = useState(() =>
    baseShowSubQuestionEditor && !(isPrerequisiteQuestion && formScoreType === 'exempted') && !(isPrerequisiteChild && formScoreType === 'exempted')
  );

  // Re-evaluate when formScoreType changes
  useEffect(() => {
    setShowSubQuestionEditor(
      baseShowSubQuestionEditor && !(isPrerequisiteQuestion && formScoreType === 'exempted') && !(isPrerequisiteChild && formScoreType === 'exempted')
    );
  }, [baseShowSubQuestionEditor, isPrerequisiteQuestion, isPrerequisiteChild, formScoreType]);
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
  const [subQuestionList, setSubQuestionList] = useState<SubQuestionItem[]>(() => {
    if (!initialMetadata) return [];
    try { const m = JSON.parse(initialMetadata); return Array.isArray(m.subQuestionList) ? m.subQuestionList : []; } catch { return []; }
  });

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
  const [editingMainCode, setEditingMainCode] = useState<string | null>(null);
  const [editingMainName, setEditingMainName] = useState("");
  const [editingSubCode, setEditingSubCode] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState("");
  const [newSqText, setNewSqText] = useState("");

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

  // Auto-generate code: S + L + X + Y + Z
  // For 2xx.4, use '24' prefix instead of '2' + questionSequence
  const autoCodePrefix = useMemo(() => {
    if (!selMainBranch || !selSubBranch) return "";
    if (sectionOccupationBranches) {
      // 2xx.4 / 3xx.4: use 'S4' prefix with inherited branches
      const sCode = sectionGroup === 200 ? "2" : sectionGroup === 300 ? "3" : "1";
      return `${sCode}4${selMainBranch}${selSubBranch}`;
    }
    // Normal case: S + L + X + Y
    const sCode = sectionGroup === 200 ? "2" : sectionGroup === 300 ? "3" : "1";
    const lCode = questionSequence?.toString() || "0";
    return `${sCode}${lCode}${selMainBranch}${selSubBranch}`;
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

  const nextZ = useMemo(() => {
    if (!autoCodePrefix) return "";
    const used = filteredItems.map(sq => sq.code.replace(autoCodePrefix, ""));
    for (const z of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "A"]) { if (!used.includes(z)) return z; }
    return "";
  }, [autoCodePrefix, filteredItems]);
  const autoCode = autoCodePrefix && nextZ ? `${autoCodePrefix}${nextZ}` : "";

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
  // answerKeys: per-subQ answer key map {code: text} — used when hasParentSubQ
  const [answerKeys, setAnswerKeys] = useState<Record<string, string>>(() => {
    if (!initialMetadata) return {};
    try {
      const meta = JSON.parse(initialMetadata);
      return (meta.answerKeys && typeof meta.answerKeys === "object") ? meta.answerKeys : {};
    } catch {
      return {};
    }
  });

  // Toggle states for optional required fields
  const [requireRef, setRequireRef] = useState<boolean>(() => {
    if (!initialMetadata) return is200or300 ? false : true; // Default: Unrequired for 200/300, Required for others
    try {
      const meta = JSON.parse(initialMetadata);
      if (meta.requireRef !== undefined) return meta.requireRef;
      return is200or300 ? false : true;
    } catch {
      return is200or300 ? false : true;
    }
  });

  const [requireAnswerKey, setRequireAnswerKey] = useState<boolean>(() => {
    if (!initialMetadata) return is300 ? false : true; // Default: Unrequired for 300, Required for others
    try {
      const meta = JSON.parse(initialMetadata);
      if (meta.requireAnswerKey !== undefined) return meta.requireAnswerKey;
      return is300 ? false : true;
    } catch {
      return is300 ? false : true;
    }
  });

  const [isRefExpanded, setIsRefExpanded] = useState(false); // Collapsible State
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [errors, setErrors] = useState<{ content?: boolean; answerKey?: boolean; refs?: boolean }>(
    {},
  ); // Inline Validation State

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

  const handleSave = async () => {
    // Reset errors
    setErrors({});
    const newErrors: { content?: boolean; answerKey?: boolean; refs?: boolean } = {};
    let hasError = false;

    // Validation (skip answer key & refs for default 200 L1 — those fields are hidden)
    if (!content.trim()) {
      newErrors.content = true;
      hasError = true;
    }
    const is300 = sectionGroup === 300;
    const showAnswerKey = !is300 && (!isDefaultL1 && requireAnswerKey && !useSubQuestions && (!hasParentSubQ || activeSubQCodes.length > 0));
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
    // If exempted, clear all sub-question and scoring metadata
    if (isL1 && formScoreType === 'exempted') {
      delete newMeta.useSubQuestions;
      delete newMeta.subQuestionList;
      delete newMeta.occupationBranches;
      delete newMeta.activeSubQuestions;
      delete newMeta.selectedBranch;
      delete newMeta.answerKey;
      delete newMeta.answerKeys;
    }
    // Save toggle states (only store non-default values)
    if (!requireRef) newMeta.requireRef = false;
    else delete newMeta.requireRef;
    if (!requireAnswerKey) newMeta.requireAnswerKey = false;
    else delete newMeta.requireAnswerKey;
    // Save answer key
    if (requireAnswerKey) {
      if (hasParentSubQ && selectedSubQCodes.length > 0) {
        // save per-subQ answer keys
        const filtered: Record<string, string> = {};
        for (const code of selectedSubQCodes) {
          const v = (answerKeys[code] || "").trim();
          if (v) filtered[code] = v;
        }
        if (Object.keys(filtered).length > 0) newMeta.answerKeys = filtered;
        else delete newMeta.answerKeys;
        delete newMeta.answerKey;
      } else if (answerKey.trim()) {
        newMeta.answerKey = answerKey.trim();
        delete newMeta.answerKeys;
      } else {
        delete newMeta.answerKey;
        delete newMeta.answerKeys;
      }
    } else {
      delete newMeta.answerKey;
      delete newMeta.answerKeys;
    }
    // Save SubQuestionList data (for 2xx.2 and 2xx.4 L1 headers)
    // Skip if exempted - metadata already cleared above
    const alwaysCodesInBranch = is300 ? filteredItems.filter((sq) => sq.alwaysChecked).map((sq) => sq.code) : [];
    const effectiveActiveSubQCodes = Array.from(new Set([...activeSubQCodes, ...alwaysCodesInBranch]));
    if (!(isL1 && formScoreType === 'exempted')) {
      if (showSubQuestionEditor) {
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
    const metadataString = Object.keys(newMeta).length > 0 ? JSON.stringify(newMeta) : undefined;

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
          try { metaObj = JSON.parse(metadataString); } catch {}
        }
        if (imagePath) metaObj.image = imagePath;
        if (showExtraButtons && currentChildLayout) metaObj.childLayout = currentChildLayout;
        const finalMeta = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : null;

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
      } catch (err) {
        console.error('Failed to finalize background-saved L2:', err);
      }
      // Refresh tree and close form
      onRefresh?.();
      onQuestionsUpdated?.();
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
        console.error('Failed to save question score:', err);
      }
    }

    onSave({
      content,
      description: showExtraButtons ? description : undefined,
      image: showExtraButtons ? imagePath || undefined : undefined,
      id: !isEdit ? questionId : undefined,
      references: requireRef ? linkedRefs : [],
      metadata: metadataString,
      childLayout: showExtraButtons ? currentChildLayout : undefined,
    });

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
        console.error('Failed to sync required count children:', err);
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
        console.error('Failed to save question score for new L2:', err);
      }
    }
  };

  // Cleanup background-saved L2 if user cancels
  const handleCancel = useCallback(async () => {
    if (isBackgroundSaved && generatedId) {
      try {
        await invoke('delete_question', { id: generatedId });
      } catch (err) {
        console.error('Failed to cleanup background-saved L2:', err);
      }
    }
    onCancel();
  }, [isBackgroundSaved, generatedId, onCancel]);

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
          {showExtraButtons && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowDescription(true)}
                className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                title="เพิ่มคำอธิบาย"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
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
              {!isDefaultL1 && !is300 && (
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
        </div>

        {/* ── Unified "ไม่ต้องปฏิบัติ" checkbox (right after question title for visibility) ── */}
        {is300 && !isPrerequisiteQuestion && !isPrerequisiteChild && !isSection100Selector && !isSection200Selector && !isExamChild && !isFixedPracticeL1 && !is306L1 && (
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
                      // Clear everything
                      setFormScoreDisplayText('(ไม่ต้องปฏิบัติ)');
                      setFormScoreIsScored(false);
                      setFormScoreValue('0');
                      setDescription('');
                      setShowDescription(false);
                      setUseSubQuestions(false);
                      setRequiredCount(0);
                      setRequiredCountChildren([]);
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
                  disabled={!!isPrerequisiteQuestion || !!isSection100Selector || !!isSection200Selector || !!isDefaultDescL1 || formScoreType === 'exempted'}
                  className={`w-full p-2 pr-7 border rounded-md resize-none text-sm min-h-[34px] overflow-hidden ${(isPrerequisiteQuestion || isSection100Selector || isSection200Selector || isDefaultDescL1 || formScoreType === 'exempted')
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                    : 'border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50'
                    }`}
                  rows={1}
                />
                {!isPrerequisiteQuestion && !isSection100Selector && !isSection200Selector && !isDefaultDescL1 && formScoreType !== 'exempted' && (
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
                      {!sectionOccupationBranches && editingMainCode ? (
                        <div className="flex gap-1">
                          <input type="text" maxLength={50} value={editingMainName} onChange={e => setEditingMainName(e.target.value)}
                            className={`flex-1 px-2 py-1.5 text-xs border ${sqClr.inputBd} rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none`} autoFocus />
                          <button onClick={async () => { if (!editingMainName.trim()) return; await invoke('update_occupation_branch', { code: editingMainCode, name: editingMainName.trim() }); setDbBranches(prev => prev.map(b => b.code === editingMainCode ? { ...b, name: editingMainName.trim() } : b)); setEditingMainCode(null); setEditingMainName(""); }}
                            className={`px-1.5 py-1 text-[10px] font-bold rounded ${sqClr.btn}`}><CheckCircle className="w-3 h-3" /></button>
                          <button onClick={() => { setEditingMainCode(null); setEditingMainName(""); }}
                            className="px-1.5 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      ) : !sectionOccupationBranches && !isAddingMain ? (
                        <div className="flex gap-1">
                          <select value={selMainBranch} onChange={(e) => { setSelMainBranch(e.target.value); setSelSubBranch(""); setIsAddingSub(false); }}
                            className={`flex-1 px-2 py-1.5 text-xs border ${sqClr.selectBd} rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none`}>
                            <option value="">-- เลือก --</option>
                            {dbBranches.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                          </select>
                          {selMainBranch && <>
                            <button onClick={() => { setEditingMainCode(selMainBranch); setEditingMainName(dbBranches.find(b => b.code === selMainBranch)?.name || ""); }}
                              className={`px-1.5 py-1 text-[10px] rounded border ${sqClr.editBtn}`} title="แก้ไขชื่อ"><Pencil className="w-3 h-3" /></button>
                            <button onClick={async () => { const br = dbBranches.find(b => b.code === selMainBranch); if (!window.confirm(`ลบสาขา "${br?.name}"?`)) return; await invoke('delete_occupation_branch', { code: selMainBranch }); setDbBranches(prev => prev.filter(b => b.code !== selMainBranch)); setSelMainBranch(""); setSelSubBranch(""); }}
                              className="px-1.5 py-1 text-[10px] rounded border border-red-200 dark:border-red-800/50 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="ลบสาขา"><Trash2 className="w-3 h-3" /></button>
                          </>}
                          <button onClick={() => setIsAddingMain(true)} className={`px-1.5 py-1 text-[10px] font-bold rounded border ${sqClr.addBtn}`} title="เพิ่มสาขาใหม่"><Plus className="w-3 h-3" /></button>
                        </div>
                      ) : !sectionOccupationBranches ? (
                        <div className="flex gap-1">
                          <input type="text" placeholder="ชื่อสาขา" maxLength={50} value={newMainName} onChange={e => setNewMainName(e.target.value)}
                            className={`flex-1 px-2 py-1.5 text-xs border ${sqClr.inputBd} rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none`} autoFocus />
                          <button onClick={async () => { if (!newMainName.trim()) return; const nc = (dbBranches.length + 1).toString(); try { const created = await invoke<{ code: string; name: string }>('create_occupation_branch', { code: nc, name: newMainName.trim() }); setDbBranches(prev => [...prev, created]); setSelMainBranch(nc); setSelSubBranch(""); } catch (e: any) { console.error(e); } setNewMainName(""); setIsAddingMain(false); }}
                            className={`px-1.5 py-1 text-[10px] font-bold rounded ${sqClr.btn}`}><CheckCircle className="w-3 h-3" /></button>
                          <button onClick={() => { setNewMainName(""); setIsAddingMain(false); }} className="px-1.5 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        /* 2xx.4: disabled select แสดงค่าจาก DB (เหมือน 2xx.2) */
                        <select value={selMainBranch} disabled
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none cursor-not-allowed opacity-80">
                          <option value="">-- ไม่ได้เลือกใน 2xx.2 --</option>
                          {dbBranches.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Sub Branch */}
                    {selMainBranch && (
                      <div className="min-w-[140px] max-w-[280px] w-fit">
                        <label className={`block text-[10px] ${sqClr.textDim} mb-0.5`}>สาขาย่อย</label>
                        {!sectionOccupationBranches && editingSubCode ? (
                          <div className="flex gap-1">
                            <input type="text" maxLength={50} value={editingSubName} onChange={e => setEditingSubName(e.target.value)}
                              className={`flex-1 px-2 py-1.5 text-xs border ${sqClr.inputBd} rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none`} autoFocus />
                            <button onClick={async () => { if (!editingSubName.trim()) return; await invoke('update_occupation_sub_branch', { code: editingSubCode, branchCode: selMainBranch, name: editingSubName.trim() }); setDbSubBranches(prev => prev.map(sb => sb.code === editingSubCode ? { ...sb, name: editingSubName.trim() } : sb)); setEditingSubCode(null); setEditingSubName(""); }}
                              className={`px-1.5 py-1 text-[10px] font-bold rounded ${sqClr.btn}`}><CheckCircle className="w-3 h-3" /></button>
                            <button onClick={() => { setEditingSubCode(null); setEditingSubName(""); }} className="px-1.5 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                          </div>
                        ) : !sectionOccupationBranches && !isAddingSub ? (
                          <div className="flex gap-1">
                            <select value={selSubBranch} onChange={(e) => setSelSubBranch(e.target.value)}
                              className={`flex-1 px-2 py-1.5 text-xs border ${sqClr.selectBd} rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none`}>
                              <option value="">-- เลือก --</option>
                              {dbSubBranches.map(sb => <option key={sb.code} value={sb.code}>{sb.code} - {sb.name}</option>)}
                            </select>
                            {selSubBranch && <>
                              <button onClick={() => { setEditingSubCode(selSubBranch); setEditingSubName(dbSubBranches.find(sb => sb.code === selSubBranch)?.name || ""); }}
                                className={`px-1.5 py-1 text-[10px] rounded border ${sqClr.editBtn}`} title="แก้ไขชื่อ"><Pencil className="w-3 h-3" /></button>
                              <button onClick={async () => { const sb = dbSubBranches.find(s => s.code === selSubBranch); if (!window.confirm(`ลบสาขาย่อย "${sb?.name}"?`)) return; await invoke('delete_occupation_sub_branch', { code: selSubBranch, branchCode: selMainBranch }); setDbSubBranches(prev => prev.filter(s => s.code !== selSubBranch)); setSelSubBranch(""); }}
                                className="px-1.5 py-1 text-[10px] rounded border border-red-200 dark:border-red-800/50 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="ลบสาขาย่อย"><Trash2 className="w-3 h-3" /></button>
                            </>}
                            <button onClick={() => setIsAddingSub(true)} className={`px-1.5 py-1 text-[10px] font-bold rounded border ${sqClr.addBtn}`} title="เพิ่มสาขาย่อยใหม่"><Plus className="w-3 h-3" /></button>
                          </div>
                        ) : !sectionOccupationBranches ? (
                          <div className="flex gap-1">
                            <input type="text" placeholder="ชื่อสาขาย่อย" maxLength={50} value={newSubName} onChange={e => setNewSubName(e.target.value)}
                              className={`flex-1 px-2 py-1.5 text-xs border ${sqClr.inputBd} rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none`} autoFocus />
                            <button onClick={async () => { if (!newSubName.trim()) return; const nc = (dbSubBranches.length + 1).toString(); try { const created = await invoke<{ code: string; branch_code: string; name: string }>('create_occupation_sub_branch', { code: nc, branchCode: selMainBranch, name: newSubName.trim() }); setDbSubBranches(prev => [...prev, created]); setSelSubBranch(nc); } catch (e: any) { console.error(e); } setNewSubName(""); setIsAddingSub(false); }}
                              className={`px-1.5 py-1 text-[10px] font-bold rounded ${sqClr.btn}`}><CheckCircle className="w-3 h-3" /></button>
                            <button onClick={() => { setNewSubName(""); setIsAddingSub(false); }} className="px-1.5 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          /* 2xx.4: disabled select แสดงค่าจาก DB (เหมือน 2xx.2) */
                          <select value={selSubBranch} disabled
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none cursor-not-allowed opacity-80">
                            <option value="">-- ไม่ได้เลือกใน 2xx.2 --</option>
                            {dbSubBranches.map(sb => <option key={sb.code} value={sb.code}>{sb.code} - {sb.name}</option>)}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Auto code display */}
                    {autoCodePrefix && (
                      <div className="shrink-0">
                        <label className={`block text-[10px] ${sqClr.textDim} mb-0.5`}>รหัส (Auto)</label>
                        <div className={`px-2 py-1.5 text-xs font-mono font-bold ${sqClr.code} rounded`}>
                          {autoCode || <span className="text-slate-400">เต็ม</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Filtered item list for current branch */}
                  {filteredItems.length > 0 && (
                    <div className="space-y-1">
                      {filteredItems.map((item, localIdx) => {
                        const dbSq = dbSubQuestions.find(sq => sq.code === item.code);
                        return (
                          <div key={item.code} className={`flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900/60 border ${sqClr.itemBd} rounded-md group/sq-item`}>
                            <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                            <span className={`text-xs font-bold ${sqClr.itemText} min-w-[1.5ch]`}>{toThaiAlphabet(localIdx + 1)}.</span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded shrink-0">{item.code}</span>
                            <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate">{item.text}</span>
                            {is300 && item.alwaysChecked && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full shrink-0">Auto ✓</span>}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/sq-item:opacity-100 transition-opacity">
                              {is300 && <button onClick={async () => { if (dbSq) { const newAc = !item.alwaysChecked; await invoke('update_occupation_sub_question', { id: dbSq.id, text: dbSq.text, alwaysChecked: newAc }); setDbSubQuestions(prev => prev.map(s => s.id === dbSq.id ? { ...s, always_checked: newAc } : s)); if (newAc && useSubQuestions) { setActiveSubQCodes(prev => Array.from(new Set([...prev, item.code]))); } } else { const gi = subQuestionList.findIndex(sq => sq.code === item.code); const u = [...subQuestionList]; u[gi] = { ...u[gi], alwaysChecked: !u[gi].alwaysChecked }; setSubQuestionList(u); if (!item.alwaysChecked && useSubQuestions) { setActiveSubQCodes(prev => Array.from(new Set([...prev, item.code]))); } } }}
                                className={`p-0.5 rounded transition-colors ${item.alwaysChecked ? 'text-emerald-500 hover:text-slate-400' : 'text-slate-400 hover:text-emerald-500'}`} title={item.alwaysChecked ? "ยกเลิกบังคับ" : "บังคับเลือกเสมอ"}>
                                <CheckCircle className="w-3 h-3" />
                              </button>}
                              <button onClick={async () => { if (dbSq) { await invoke('delete_occupation_sub_question', { id: dbSq.id }); setDbSubQuestions(prev => prev.filter(s => s.id !== dbSq.id)); } else { setSubQuestionList(prev => prev.filter(sq => sq.code !== item.code)); } }} className="p-0.5 text-slate-400 hover:text-red-500 rounded" title="ลบ"><Trash2 className="w-3 h-3" /></button>
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
                        <label className={`block text-[10px] ${sqClr.textDim} mb-0.5`}>ข้อความ — รหัส: <span className="font-mono font-bold">{autoCode}</span></label>
                        <input type="text" value={newSqText}
                          onChange={e => setNewSqText(e.target.value)}
                          onPaste={e => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData("text");
                            const trimmedText = pastedText.trim();
                            const target = e.target as HTMLInputElement;
                            const start = target.selectionStart || 0;
                            const end = target.selectionEnd || 0;
                            const currentValue = target.value;
                            const newValue = currentValue.substring(0, start) + trimmedText + currentValue.substring(end);
                            setNewSqText(newValue);
                            requestAnimationFrame(() => {
                              target.selectionStart = target.selectionEnd = start + trimmedText.length;
                            });
                          }}
                          placeholder="พิมพ์คำถามย่อย..."
                          className={`w-full px-2 py-1.5 text-xs border ${sqClr.inputBd} rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600`}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && newSqText.trim()) {
                              try {
                                // For 2xx.4, determine sub_branch_code from existing codes or use selSubBranch
                                let subBranchCode = selSubBranch;
                                if (sectionOccupationBranches && dbSubQuestions.length > 0) {
                                  // Extract sub_branch_code from first existing sub-question (format: S+L+X+Y+Z)
                                  const firstCode = dbSubQuestions[0].code;
                                  if (firstCode.length >= 4) {
                                    subBranchCode = firstCode.substring(3, 4); // Y position
                                  }
                                }
                                const created = await invoke<DbSubQuestion>('create_occupation_sub_question', {
                                  req: { branch_code: selMainBranch, sub_branch_code: subBranchCode, code: autoCode, text: newSqText.trim() }
                                });
                                setDbSubQuestions(prev => [...prev, created]);
                              } catch (err: any) { console.error(err); }
                              setNewSqText("");
                            }
                          }} />
                      </div>
                      <button onClick={async () => {
                        if (!newSqText.trim()) return;
                        try {
                          // For 2xx.4, determine sub_branch_code from existing codes or use selSubBranch
                          let subBranchCode = selSubBranch;
                          if (sectionOccupationBranches && dbSubQuestions.length > 0) {
                            // Extract sub_branch_code from first existing sub-question (format: S+L+X+Y+Z)
                            const firstCode = dbSubQuestions[0].code;
                            if (firstCode.length >= 4) {
                              subBranchCode = firstCode.substring(3, 4); // Y position
                            }
                          }
                          const created = await invoke<DbSubQuestion>('create_occupation_sub_question', {
                            req: { branch_code: selMainBranch, sub_branch_code: subBranchCode, code: autoCode, text: newSqText.trim() }
                          });
                          setDbSubQuestions(prev => [...prev, created]);
                        } catch (err: any) { console.error(err); }
                        setNewSqText("");
                      }}
                        disabled={!newSqText.trim()}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded border ${sqClr.addBtn} disabled:opacity-40 disabled:cursor-not-allowed shrink-0`}>
                        <Plus className="w-3 h-3" /> เพิ่ม
                      </button>
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
                          <span className={`text-[10px] font-bold ${sqClr.textBold} uppercase tracking-wider flex-1`}>เลือกข้อย่อยที่ใช้งาน</span>
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
                                {isForced && <span className="text-[9px] font-bold text-emerald-500">Auto ✓</span>}
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
              <div className="flex items-center gap-2 mb-2">
                <ListChecks className={`w-4 h-4 ${sqClr.text}`} />
                <span className={`text-xs font-bold ${sqClr.textBold} uppercase tracking-wider`}>เลือกคำถามย่อย (Select Sub-Questions)</span>
                <span className={`text-[10px] ${sqClr.count}`}>{selectedSubQCodes.length}/{parentSubQuestionList!.length}</span>
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
                      {isForced && <span className="text-[9px] text-emerald-500 font-bold">Auto ✓</span>}
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

          {/* References Section (Both L1 & L2, conditional on toggle — hidden for default 200/300 L1, hidden for 300Template) */}
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
        {is300 && formScoreType !== 'exempted' && !isFixedPracticeL1 && !((isPerformanceL2 || is306L1) ? (effectiveIsGroupHeader || requiredCount > 0) : (initialIsGroupHeader && !isL1)) && !isPrerequisiteQuestion && !isPrerequisiteChild && !isSection100Selector && !isSection200Selector && !isExamChild && (
          <div className="rounded-md border border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/20 p-2 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">คะแนน</span>
              {isPerformanceL2 && requiredCount === 0 ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={formScoreValue}
                    onChange={(e) => setFormScoreValue(e.target.value)}
                    className={`w-16 px-2 py-0.5 text-xs border rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-purple-400 ${
                      parseInt(formScoreValue) === 0 
                        ? 'border-red-300 dark:border-red-700 ring-1 ring-red-400' 
                        : 'border-purple-300 dark:border-purple-700'
                    }`}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">คะแนน</span>
                  {parseInt(formScoreValue) === 0 && (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded">
                      ต้องกำหนดคะแนน
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


        {(isPerformanceL2 || is306L1) && formScoreType !== 'exempted' && (
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
              ) : (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                  ไม่กำหนดจำนวนครั้ง ต้องกำหนดคะแนน
                </span>
              )}
            </div>
            {requiredCountChildren.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {requiredCountChildren.map((child, idx) => (
                  <div key={child.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pl-2">
                    <span className="text-indigo-500 font-medium">{is306L1 ? `${prefix}.${toThaiNumber(child.sequence)}` : `${toThaiAlphabet(idx + 1)}.`}</span>
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

        {/* Section Picker for 3xx.1.4 (100Sections) and 3xx.1.5 (200Sections) — L3 section_ref children */}
        {is300 && (isSection100Selector || isSection200Selector) && (
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
                    {isSection100Selector ? 'เลือก Section 100 ที่ต้องผ่าน' : 'เลือก Section 200 ที่ต้องผ่าน'}
                  </span>
                </div>

                {/* Current L3 section-ref children summary with score */}
                {sectionRefChildren.length > 0 && (
                  <div className="space-y-0.5">
                    {sectionRefChildren.map(child => (
                      <div key={child.id} className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300">
                        <span className="font-medium">{toThaiNumber(child.ref_section_number)}</span>
                        <span className="flex-1">{child.content}</span>
                        {isEdit && (
                          <input
                            type="number"
                            min={0}
                            value={child.score}
                            onChange={async (e) => {
                              const newScore = parseInt(e.target.value) || 0;
                              try {
                                await invoke('update_section_ref_score', { questionId: child.id, score: newScore });
                                setSectionRefChildren(prev => prev.map(c => c.id === child.id ? { ...c, score: newScore } : c));
                              } catch (err) { console.error('Failed to update section ref score:', err); }
                            }}
                            className="w-12 text-center text-xs px-1 py-0.5 border border-purple-200 dark:border-purple-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            title="คะแนน"
                          />
                        )}
                        {!isEdit && child.score > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                            {child.score} คะแนน
                          </span>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-200 border-t border-purple-200 dark:border-purple-700 pt-1 mt-1">
                      <span>รวม</span>
                      <span className="ml-auto">{sectionRefChildren.reduce((sum, c) => sum + c.score, 0)} คะแนน</span>
                    </div>
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
                            .filter(s => !sectionRefChildren.find(c => c.ref_section_id === s.id));
                          if (unchecked.length === 0) return;
                          try {
                            const children = await invoke<SectionRefChild[]>('batch_add_section_ref_children', {
                              args: {
                                parent_id: existingId, document_id: documentId, section_id: sectionId,
                                sections: unchecked.map(s => ({ linked_section_id: s.id, linked_section_number: s.section_number, linked_section_title: s.title_th })),
                              }
                            });
                            setSectionRefChildren(children);
                          } catch (e) { console.error('Failed to select all:', e); }
                        }} className="text-[10px] px-2 py-0.5 rounded bg-purple-600 text-white hover:bg-purple-700">เลือกทั้งหมด</button>
                        <button type="button" onClick={async () => {
                          try {
                            await invoke('remove_all_section_ref_children', { parentId: existingId });
                            setSectionRefChildren([]);
                          } catch (e) { console.error('Failed to deselect all:', e); }
                        }} className="text-[10px] px-2 py-0.5 rounded border border-red-300 dark:border-red-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">ยกเลิกทั้งหมด</button>
                      </div>
                      <div className="divide-y divide-purple-100 dark:divide-purple-800/50">
                        {availableSections.map(s => {
                          const existingChild = sectionRefChildren.find(c => c.ref_section_id === s.id);
                          const checked = !!existingChild;
                          return (
                            <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={async () => {
                                  if (checked && existingChild) {
                                    try {
                                      await invoke('remove_section_ref_child', { questionId: existingChild.id });
                                      setSectionRefChildren(prev => prev.filter(c => c.id !== existingChild.id));
                                    } catch (e) { console.error('Failed to remove section ref child:', e); }
                                  } else {
                                    try {
                                      const newChild = await invoke<SectionRefChild>('add_section_ref_child', {
                                        args: { parent_id: existingId, document_id: documentId, section_id: sectionId, linked_section_id: s.id, linked_section_number: s.section_number, linked_section_title: s.title_th }
                                      });
                                      setSectionRefChildren(prev => [...prev, newChild].sort((a, b) => a.ref_section_number - b.ref_section_number));
                                    } catch (e) { console.error('Failed to add section ref child:', e); }
                                  }
                                }}
                                className="accent-purple-600 w-3.5 h-3.5 shrink-0"
                              />
                              <span className="text-xs font-medium text-purple-600 dark:text-purple-400 shrink-0">{toThaiNumber(s.section_number)}</span>
                              <span className="text-xs text-slate-700 dark:text-slate-300">{s.title_th}</span>
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
        {is300 && effectiveIsGroupHeader && (
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
  canInsertSibling?: boolean;
  isFirst: boolean;
  isLast: boolean;
  isDefaultL1?: boolean;
  isDefault300L2?: boolean;
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
  canInsertSibling = true,
  isFirst,
  isLast,
  isDefaultL1 = false,
  isDefault300L2 = false,
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
  const is200 = sectionGroup === 200;
  const is300 = sectionGroup === 300;
  const is200or300 = is200 || is300;
  const isL1 = level === 0;

  // Special question type detection for Section 300
  const questionSequence = question.sequence ? parseInt(question.sequence.toString()) : null;
  const isSection100or200Selector = is300 && questionSequence && !isL1 && (questionSequence === 4 || questionSequence === 5) && prefix.includes('.๑.');

  // Section-ref L3 children are now rendered via the question tree (QuestionTreeNode),
  // so no special inline fetch/display is needed here.

  // Fetch sub-questions from DB for display in L1 header (2xx.2 / 2xx.4 / 3xx.2 / 3xx.4)
  const [displaySubQList, setDisplaySubQList] = useState<SubQuestionItem[]>([]);
  const [displayActiveCodes, setDisplayActiveCodes] = useState<string[]>([]);
  useEffect(() => {
    if (!is200or300 || !isL1 || !question.metadata) { setDisplaySubQList([]); setDisplayActiveCodes([]); return; }
    try {
      const meta = JSON.parse(question.metadata);
      if (!meta.useSubQuestions) { setDisplaySubQList([]); setDisplayActiveCodes([]); return; }
      const activeCodes: string[] = Array.isArray(meta.activeSubQuestions) ? meta.activeSubQuestions : [];
      const selectedBranch: { main: string; sub: string } | undefined = meta.selectedBranch;
      if (!selectedBranch?.main) { setDisplaySubQList([]); setDisplayActiveCodes(activeCodes); return; }
      // Build prefix from question.sequence + selectedBranch (S + L + X + Y)
      // This is the reliable way — activeCodes[0] may be from a different prefix
      const sCode = is300 ? "3" : "2";
      const lCode = question.sequence?.toString() || "0";
      const derivedPrefix = `${sCode}${lCode}${selectedBranch.main}${selectedBranch.sub}`;
      invoke<{ id: number; code: string; text: string; always_checked: boolean }[]>(
        'get_all_sub_questions_for_branch',
        { branchCode: selectedBranch.main }
      ).then(dbSqs => {
        const filtered = derivedPrefix
          ? dbSqs.filter(sq => sq.code.startsWith(derivedPrefix))
          : dbSqs;
        const items = filtered.map(sq => ({ code: sq.code, text: sq.text, alwaysChecked: sq.always_checked }));
        setDisplaySubQList(items);
        // For 300Template: merge always_checked codes into displayActiveCodes so Auto items always show
        if (is300) {
          const alwaysCodes = items.filter(sq => sq.alwaysChecked).map(sq => sq.code);
          setDisplayActiveCodes(Array.from(new Set([...activeCodes, ...alwaysCodes])));
        } else {
          setDisplayActiveCodes(activeCodes);
        }
      }).catch(() => { setDisplaySubQList([]); setDisplayActiveCodes(activeCodes); });
    } catch { setDisplaySubQList([]); setDisplayActiveCodes([]); }
  }, [is200or300, is300, isL1, question.metadata, question.sequence]);
  const showDescriptionImage = is200or300 ? (level === 0 || level === 1) : isL1;

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
            : level === 1 && is200or300
              ? "bg-slate-50/50 dark:bg-slate-800/50 ml-12" // L2: standard indent
              : "bg-slate-50/50 dark:bg-slate-800/50 ml-20" // L3: deeper indent
        }
      ${!isLast && parentLayout !== "grid" ? "border-b border-gray-100 dark:border-slate-700/50" : ""}
      hover:bg-blue-50/50 dark:hover:bg-blue-950/20
    `}
    >
      {/* L2 connector dot */}
      {level === 1 && is200or300 && parentLayout !== "grid" && (
        <div className="absolute left-[-18px] top-[24px] -translate-y-1/2 flex items-center">
          <div className="w-[32px] h-px bg-blue-200 dark:bg-blue-800" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-blue-700 shrink-0" />
        </div>
      )}

      {/* L3 connector dot only */}
      {!(isL1 || (level === 1 && is200or300)) && parentLayout !== "grid" && (
        <div className="absolute left-[-18px] top-[24px] -translate-y-1/2 flex items-center">
          <div className="w-[32px] h-px bg-blue-200 dark:bg-blue-800" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-blue-700 shrink-0" />
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 mt-0.5 flex items-center justify-center rounded transition-all shrink-0
          ${!isL1 ? "ml-2" : ""}
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
            : level === 1 && is200or300
              ? "min-w-[24px] text-sm font-bold text-blue-600 dark:text-blue-400" // L2: Bold blue
              : "min-w-[24px] text-sm font-normal " + (is300 ? "text-purple-600 dark:text-purple-400" : "text-orange-600 dark:text-orange-400") // L3: Normal color
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
            : level === 1 && is200or300
              ? "text-sm font-medium text-slate-800 dark:text-slate-200" // L2: Medium weight, slightly darker
              : "text-sm font-normal text-slate-600 dark:text-slate-400" // L3: Normal weight, slightly lighter
          }
      `}
      >
        {/* Row 1: Content + Refs + Inline SubQ Checkboxes */}
        <div className="flex items-start gap-2 min-w-0 pr-2">
          <div className="flex-1 min-w-0" title={question.content}>
            <span className={isL1 ? "font-semibold" : ""}>{question.content}</span>
            {question.references && question.references.length > 0 && (
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400 font-normal">
                (
                {question.references
                  .map((ref) => `${ref.thai_letter || "?"}.${ref.location_text || "-"}`)
                  .join(", ")}
                )
              </span>
            )}
            {/* Exempted badge */}
            {question.question_type === 'exempted' && (
              <span className="ml-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                {question.display_text || "(ไม่ต้องปฏิบัติ)"}
              </span>
            )}
          </div>
          {/* Score badges — aligned right, purple theme for 300 */}
          {is300 && (
            <div className="flex items-center gap-2 shrink-0">
              {/* Group header (L1/L2 with children): show group_score */}
              {question.is_group_header && (question.group_score != null && question.group_score > 0) && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                  !question.parent_id
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
                    : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                }`}>
                  {!question.parent_id ? (
                    <><span className="mr-2">รวม:</span>{toThaiNumber(question.group_score)} คะแนน</>
                  ) : (
                    <>{toThaiNumber(question.group_score)} คะแนน</>
                  )}
                </span>
              )}
              {/* Individual scored item (L2/L3): show score (emerald) */}
              {!question.is_group_header && question.is_scored && (question.score != null && question.score > 0) && (
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {toThaiNumber(question.score)} คะแนน
                </span>
              )}
            </div>
          )}
          {/* Inline SubQ checkboxes — ชิดขวา (ซ่อนเมื่อ L2 เป็น group_header มี L3 จำนวนครั้ง) */}
          {inlineSubQItems && !question.is_group_header && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {inlineSubQItems.map(({ sq, checked }, idx) => (
                <span key={sq.code} className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  <span className={`font-bold ${is300 ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}>{toThaiAlphabet(idx + 1)}.</span>
                  <span className={`w-3.5 h-3.5 inline-flex items-center justify-center rounded border text-[9px] font-bold shrink-0
                    ${checked
                      ? is300 ? "border-purple-400 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400" : "border-amber-400 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                    }`}
                  >
                    {checked && "✔"}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {showDescriptionImage && question.description && question.description !== 'undefined' && question.description !== 'null' && question.question_type !== 'exempted' && !(isSection100or200Selector && question.question_type === 'exempted') && (
          <div className="mt-1 text-sm font-normal text-slate-700 dark:text-slate-400 whitespace-pre-wrap">
            {question.description}
          </div> // Description: Match L2 style
        )}
        {/* Section-ref L3 children for 3xx.1.4/1.5 are rendered via QuestionTreeNode as normal children */}
        {isSection100or200Selector && question.question_type !== 'exempted' && !(question.children && question.children.length > 0) && (
          <div className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded inline-block">
            ⚠ ยังไม่ได้เลือก Section
          </div>
        )}
        {/* SubQuestionList display for 2xx.2 / 2xx.4 / 3xx.2 / 3xx.4 L1 — DB-backed */}
        {is200or300 && isL1 && displaySubQList.length > 0 && (() => {
          if (displayActiveCodes.length === 0) {
            return (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400">
                <span>⚠</span><span>ยังไม่ได้เลือกคำถามย่อยที่ใช้งาน</span>
              </div>
            );
          }
          const display = displaySubQList.filter(sq => displayActiveCodes.includes(sq.code) || sq.alwaysChecked);
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
                  <span className={`font-bold min-w-[1.5ch] ${is300 ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}>{toThaiAlphabet(idx + 1)}.</span>
                  <span>{sq.text}</span>
                  {sq.alwaysChecked && <span className="text-[8px] text-emerald-500">✓</span>}
                </div>
              ))}
            </div>
          );
        })()}
        {question.metadata && (
          <QuestionMetadataDisplay metadata={question.metadata} onImageClick={onImageClick} parentSubQuestionList={parentSubQuestionList} />
        )}
      </div>


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
              isDefault300L2
                ? ([
                  ...(canAddSub && question.question_type !== 'exempted'
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
                : isDefaultL1
                  ? ([
                    ...(canAddSub && question.question_type !== 'exempted'
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
                  : question.question_type === 'required_instance'
                    ? ([
                      {
                        label: "แก้ไข (Edit)",
                        icon: <Edit />,
                        onClick: onEdit,
                      },
                    ] as DropdownMenuItem[])
                    : ([
                      ...(canInsertSibling ? [
                        {
                          label: "แทรกคำถามต่อท้าย (Insert After)",
                          icon: <Plus />,
                          onClick: onInsertAfter,
                        },
                        { label: "separator", onClick: () => { }, separator: true },
                      ] : []),
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
  parentSubQuestionList?: SubQuestionItem[];
}> = ({ metadata, onImageClick, parentSubQuestionList }) => {
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

  if (!data.image && !data.answerKey && !data.answerKeys) return null;

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
      {data.answerKeys && typeof data.answerKeys === "object" && Object.keys(data.answerKeys).length > 0 ? (
        /* Per-subQ answer keys — เรียงตาม selectedSubQuestions หรือ parentSubQuestionList */
        <div className="space-y-1.5">
          {((): [string, string][] => {
            const keys = data.answerKeys as Record<string, string>;
            // เรียงตาม parentSubQuestionList ถ้ามี ไม่งั้นเรียงตาม selectedSubQuestions ใน metadata
            const ordered: string[] = parentSubQuestionList
              ? parentSubQuestionList.map(s => s.code).filter(c => c in keys)
              : Array.isArray(data.selectedSubQuestions)
                ? (data.selectedSubQuestions as string[]).filter(c => c in keys)
                : Object.keys(keys);
            return ordered.map(c => [c, keys[c]]);
          })().map(([code, text]) => {
            const sqIdx = parentSubQuestionList ? parentSubQuestionList.findIndex(s => s.code === code) : -1;
            const label = sqIdx >= 0 ? toThaiAlphabet(sqIdx + 1) : code;
            return (
              <div key={code} className="text-sm font-normal text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                <div className="flex items-start gap-2">
                  <span className="text-slate-900 dark:text-slate-100 shrink-0">เฉลย: <span className="text-amber-600 dark:text-amber-400">{label}.</span></span>
                  <div className="answer-key-markdown min-w-0 flex-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {formatAnswerKeyForDisplay(text).replace(/\n/g, "  \n")}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : data.answerKey ? (
        /* Single answer key */
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
      ) : null}
    </div>
  );
};

export default PqsQuestionSection;
