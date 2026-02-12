import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit, Save, X, ChevronRight, ChevronDown, MessageSquarePlus, FileQuestion, Layers, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react';
import Button from '../ui/Button';
import { invoke } from '@tauri-apps/api/tauri';
import { open as openDialog } from '@tauri-apps/api/dialog';
import { convertFileSrc } from '@tauri-apps/api/tauri';

import ConfirmModal from '../modals/ConfirmModal';
import ImagePreviewModal from '../modals/ImagePreviewModal';
import { QuestionDetail } from '../../types/content';

// ============ Helpers ============

const toThaiNumber = (num: number | string) => {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().split('').map(d => {
    const parsed = parseInt(d);
    return !isNaN(parsed) && parsed >= 0 && parsed <= 9 ? thaiDigits[parsed] : d;
  }).join('');
};

const toThaiAlphabet = (n: number) => {
  const alpha = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'];
  return alpha[n - 1] || `${n}`;
};

const convertThaiToArabic = (thaiStr: string) => {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
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

const buildArabicPrefix = (level: number, sequence: number, sectionNumber: number) => {
  // Use Arabic numerals for file naming (e.g. 101.1)
  if (level === 0) return `${sectionNumber}.${sequence}`;
  return `${sequence}`; // Or whatever makes sense for sub-levels, but usually only L1 images matter
};

// ============ Types ============

interface PqsQuestionSectionProps {
  docId: string;
  sectionId: number;
  sectionNumber: number;
  readOnly?: boolean;
}



// ============ Main Component ============

const PqsQuestionSection: React.FC<PqsQuestionSectionProps> = ({
  docId,
  sectionId,
  sectionNumber,
  readOnly = false,
}) => {
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
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger',
  });

  const fetchQuestions = async () => {
    if (!docId || !sectionId) return;
    try {
      setLoading(true);
      const data = await invoke<QuestionDetail[]>('get_document_questions_with_details', { docId });
      const filtered = data.filter(q =>
        (q.section_id === sectionId) || (q.section_id === 0 && q.sequence >= sectionNumber && q.sequence < sectionNumber + 100)
      );
      setQuestions(filtered);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuestions(); }, [docId, sectionId, sectionNumber]);

  const questionTree = useMemo(() => {
    const tree: QuestionDetail[] = [];
    const map = new Map<string, QuestionDetail>();
    questions.forEach(q => map.set(q.id, { ...q, children: [] }));
    questions.forEach(q => {
      const node = map.get(q.id)!;
      if (q.parent_id && map.has(q.parent_id)) {
        map.get(q.parent_id)!.children!.push(node);
      } else {
        tree.push(node);
      }
    });
    const sortNodes = (nodes: QuestionDetail[]) => {
      nodes.sort((a, b) => a.sequence - b.sequence);
      nodes.forEach(n => { if (n.children && n.children.length > 0) sortNodes(n.children); });
    };
    sortNodes(tree);
    return tree;
  }, [questions]);

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
    data: { content: string, description?: string, image?: string, id?: string },
    parentId: string | null,
    insertAfterId?: string | null
  ) => {
    try {
      const metadata = data.image ? JSON.stringify({ image: data.image }) : null;

      const newId = await invoke<string>('create_question', {
        args: {
          id: data.id || null, // Pass custom ID if provided
          document_id: docId,
          section_id: sectionId,
          parent_id: parentId,
          content: data.content.trim(),
          description: data.description || null,
          is_header: false,
          sequence: null, // Let backend assign sequence
          answer_type: 'text',
          metadata: metadata,
        }
      });

      // 2. If insertAfterId provided, reorder siblings immediately
      if (insertAfterId) {
        // Find siblings
        const allSiblings = parentId
          ? questions.filter(q => q.parent_id === parentId).sort((a, b) => a.sequence - b.sequence)
          : questions.filter(q => !q.parent_id).sort((a, b) => a.sequence - b.sequence);

        // Construct new order: [...before, insertAfterId, NEW_ID, ...after]
        const insertionIndex = allSiblings.findIndex(q => q.id === insertAfterId);
        if (insertionIndex !== -1) {
          const newOrderIds = [
            ...allSiblings.slice(0, insertionIndex + 1).map(q => q.id),
            newId,
            ...allSiblings.slice(insertionIndex + 1).map(q => q.id)
          ];
          await invoke('reorder_questions', { questionIds: newOrderIds });
        }
      }

      resetForms();
      await fetchQuestions();
    } catch (err) {
      console.error('Failed to create question:', err);
    }
  };

  const handleUpdate = async (id: string, content: string, description?: string | null, metadata?: string | null) => {
    try {
      // Note: We might want to preserve existing metadata if not passed, but QuestionTreeNode passes the *updated* metadata logic.
      // So we just trust what is passed. If metadata is undefined, we might want to keep existing? 
      // But for now, we assume caller handles it (which QuestionTreeNode does).
      // However, if called from simple edit where metadata isn't touched, we need to be careful.
      // QuestionTreeNode's onSave logic constructs full metadata.

      // Fallback: if metadata is undefined (not passed), keep existing.
      let finalMeta = metadata;
      if (metadata === undefined) {
        const q = questions.find(q => q.id === id);
        finalMeta = q?.metadata || null;
      }

      // Fallback for description?
      let finalDesc = description;
      if (description === undefined) {
        const q = questions.find(q => q.id === id);
        finalDesc = q?.description || null;
      }

      await invoke('update_question', {
        args: {
          id,
          content: content.trim(),
          description: finalDesc,
          metadata: finalMeta
        }
      });
      resetForms();
      await fetchQuestions();
    } catch (err) {
      console.error('Failed to update question:', err);
    }
  };

  const handleDelete = (question: QuestionDetail) => {
    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการลบคำถาม',
      message: `คุณต้องการลบคำถามนี้ใช่หรือไม่?\n\n"${question.content}"\n\nคำเตือน: การลบนี้จะลบคำถามย่อยที่เกี่ยวข้องทั้งหมด`,
      onConfirm: async () => {
        try {
          await invoke('delete_question', { id: question.id });
          await fetchQuestions();
        } catch (err) { console.error('Failed to delete:', err); }
      },
      variant: 'warning',
    });
  };

  // ---- Reorder: Move Up/Down ----
  const handleMoveUp = async (questionId: string, siblings: QuestionDetail[]) => {
    const idx = siblings.findIndex(q => q.id === questionId);
    if (idx <= 0) return; // Already first
    const reordered = [...siblings];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    try {
      await invoke('reorder_questions', { questionIds: reordered.map(q => q.id) });
      await fetchQuestions();
    } catch (err) { console.error('Failed to reorder:', err); }
  };

  const handleMoveDown = async (questionId: string, siblings: QuestionDetail[]) => {
    const idx = siblings.findIndex(q => q.id === questionId);
    if (idx < 0 || idx >= siblings.length - 1) return; // Already last
    const reordered = [...siblings];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    try {
      await invoke('reorder_questions', { questionIds: reordered.map(q => q.id) });
      await fetchQuestions();
    } catch (err) { console.error('Failed to reorder:', err); }
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileQuestion className="w-5 h-5 text-white" />
            </div>
            {questionTree.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                {questionTree.length}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">รายการคำถาม</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Section {sectionNumber} · Question Items</p>
          </div>
        </div>

        {!readOnly && !isCreating && !editingId && (
          <Button variant="primary" size="small" icon={<Plus className="w-4 h-4" />} onClick={() => handleStartCreate(null)}>
            เพิ่มคำถาม (ท้ายสุด)
          </Button>
        )}
      </div>

      {/* ── Content ── */}
      <div className="space-y-1">

        {/* Create Form (Top-Level - Append) */}
        {isCreating && creatingAtParent === null && insertingAfterId === null && (
          <QuestionFormCard
            prefix={buildPrefix(0, questionTree.length + 1, sectionNumber)}
            level={0}
            onSave={(data) => handleCreate(data, null)}
            onCancel={resetForms}
            documentId={docId} // Pass documentId
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
                readOnly={readOnly}
                editingId={editingId}
                isCreating={isCreating}
                creatingAtParent={creatingAtParent}
                insertingAfterId={insertingAfterId}
                onStartEdit={(id) => { resetForms(); setEditingId(id); }}
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
                documentId={docId} // Pass documentId
                onImageClick={(src) => { setSelectedImage(src); setIsImageModalOpen(true); }}
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">ยังไม่มีคำถามในหัวข้อนี้</p>
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
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      <ImagePreviewModal // Added ImagePreviewModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageSrc={selectedImage || ''}
      />
    </div>
  );
};

// ============ QuestionTreeNode ============

interface QuestionTreeNodeProps {
  question: QuestionDetail;
  level: number;
  sectionNumber: number;
  readOnly: boolean;
  editingId: string | null;
  isCreating: boolean;
  creatingAtParent: string | null;
  insertingAfterId: string | null;
  onStartEdit: (id: string) => void;
  onUpdate: (id: string, content: string, description?: string | null, metadata?: string | null) => void;
  onDelete: (question: QuestionDetail) => void;
  onStartCreate: (parentId: string | null) => void;
  onStartInsertAfter: (afterId: string) => void;
  onCreate: (data: { content: string, description?: string, image?: string, id?: string }, parentId: string | null, afterId?: string | null) => void;
  onCancel: () => void;
  onMoveUp: (questionId: string, siblings: QuestionDetail[]) => void;
  onMoveDown: (questionId: string, siblings: QuestionDetail[]) => void;
  siblings: QuestionDetail[];
  isFirst: boolean;
  isLast: boolean;
  documentId: string;
  onImageClick: (src: string) => void;
}

const QuestionTreeNode: React.FC<QuestionTreeNodeProps> = ({
  question, level, sectionNumber, readOnly, editingId,
  isCreating, creatingAtParent, insertingAfterId,
  onStartEdit, onUpdate, onDelete, onStartCreate, onStartInsertAfter, onCreate, onCancel,
  onMoveUp, onMoveDown, siblings, isFirst, isLast, documentId,
  onImageClick
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const prefix = buildPrefix(level, question.sequence, sectionNumber);
  const hasChildren = question.children && question.children.length > 0;
  const canAddSub = level < 1 && !readOnly;

  // Extract initial image from metadata
  const initialImage = useMemo(() => {
    if (!question.metadata) return undefined;
    try {
      const meta = JSON.parse(question.metadata);
      return meta.image || undefined;
    } catch { return undefined; }
  }, [question.metadata]);

  if (editingId === question.id) {
    return (
      <div className={level > 0 ? 'ml-6' : ''}>
        <QuestionFormCard
          prefix={prefix}
          level={level}
          initialContent={question.content}
          initialDescription={question.description || undefined}
          initialImage={initialImage}
          onSave={(data) => {
            // Construct metadata from image
            const metadata = data.image ? JSON.stringify({ image: data.image }) : null;
            onUpdate(question.id, data.content, data.description || null, metadata);
          }}
          onCancel={onCancel}
          documentId={documentId} // Pass documentId
          existingId={question.id} // Pass existing ID for edit mode
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
        readOnly={readOnly}
        isExpanded={isExpanded}
        hasChildren={!!hasChildren}
        canAddSub={canAddSub}
        isFirst={isFirst}
        isLast={isLast && !hasChildren}
        onToggle={() => setIsExpanded(!isExpanded)}
        onEdit={() => onStartEdit(question.id)}
        onDelete={() => onDelete(question)}
        onAddSub={() => onStartCreate(question.id)}
        onInsertAfter={() => onStartInsertAfter(question.id)}
        onMoveUp={() => onMoveUp(question.id, siblings)}
        onMoveDown={() => onMoveDown(question.id, siblings)}
        onImageClick={onImageClick}
      />

      {/* Insert After Form */}
      {isCreating && insertingAfterId === question.id && (
        <div className={level > 0 ? 'ml-6' : ''}>
          <QuestionFormCard
            prefix={buildPrefix(level, question.sequence + 1, sectionNumber)} // Optimistic next number
            level={level} // Insert sibling has same level
            onSave={(data) => onCreate(data, question.parent_id || null, question.id)}
            onCancel={onCancel}
            documentId={documentId} // Pass documentId
          />
        </div>
      )}

      {isExpanded && hasChildren && (
        <div className="relative">
          <div className="absolute left-[30px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 to-transparent dark:from-blue-800 dark:to-transparent" />
          {question.children!.map((child, idx) => (
            <QuestionTreeNode
              key={child.id}
              question={child}
              level={level + 1}
              sectionNumber={sectionNumber}
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
              documentId={documentId} // Pass documentId
              onImageClick={onImageClick}
            />
          ))}
        </div>
      )}

      {/* Add Sub Form (Append) */}
      {isCreating && creatingAtParent === question.id && (
        <div className="ml-6 mt-1 mb-1">
          <QuestionFormCard
            prefix={buildPrefix(level + 1, (question.children?.length || 0) + 1, sectionNumber)}
            level={level + 1}
            onSave={(data) => onCreate(data, question.id)}
            onCancel={onCancel}
            documentId={documentId} // Pass documentId
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
  initialContent?: string;
  initialDescription?: string;
  initialImage?: string;
  onSave: (data: { content: string, description?: string, image?: string, id?: string }) => void; // Added id
  onCancel: () => void;
  documentId: string; // Added documentId
  existingId?: string; // Edit mode ID
}

const QuestionFormCard: React.FC<QuestionFormCardProps> = ({
  prefix, level, initialContent = '', initialDescription = '', initialImage = '', onSave, onCancel, documentId, existingId
}) => {
  const [content, setContent] = useState(initialContent);
  const [description, setDescription] = useState(initialDescription);
  const [imagePath, setImagePath] = useState<string | null>(initialImage || null);
  // Store a generated ID for new questions that have images uploaded BEFORE save
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const isEdit = !!initialContent;
  const isL1 = level === 0;

  useEffect(() => {
    // Logic for preview moved to AsyncImagePreview
  }, [imagePath]);

  const handleImageUpload = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
      });

      if (selected && typeof selected === 'string') {
        // Determine Question ID
        let targetId = existingId;
        if (!targetId) {
          if (generatedId) {
            targetId = generatedId;
          } else {
            targetId = crypto.randomUUID();
            setGeneratedId(targetId);
          }
        }

        // Sanitize prefix for filename (use Arabic helper)
        // Sanitize prefix for filename (use Arabic helper)
        const friendlyPrefix = convertThaiToArabic(prefix);

        const newPath = await invoke<string>('upload_question_image', {
          path: selected,
          documentId: documentId,
          questionId: targetId,
          friendlyPrefix: friendlyPrefix // Pass the prefix
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
        // Delete physical file
        await invoke('delete_question_image', { path: imagePath });
      } catch (err) {
        console.error("Failed to delete image file:", err);
      }
    }
    setImagePath(null);
  };

  const handleSave = () => {
    if (!content.trim()) return;
    onSave({
      content,
      description: isL1 ? description : undefined,
      image: isL1 ? (imagePath || undefined) : undefined,
      id: !isEdit ? (generatedId || undefined) : undefined // Pass generated ID if creating
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && e.ctrlKey) handleSave();
  };

  return (
    <div className="m-2 rounded-xl border-2 border-blue-400/60 dark:border-blue-500/40 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-slate-800 p-4 shadow-xl shadow-blue-500/10 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
            {prefix}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {isEdit ? '✏️ แก้ไขคำถาม' : '✨ เพิ่มคำถามใหม่'}
          </span>
        </div>

        {/* Content (Main Question) */}
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์คำถาม..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 resize-none text-sm transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
          rows={2}
        />

        {/* L1 Extras: Description & Image */}
        {isL1 && (
          <div className="space-y-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">

            {/* Description */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Description (อธิบายเพิ่มเติม)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="เช่น จากภาพ จงตอบคำถามต่อไปนี้..."
                className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none text-xs"
                rows={2}
              />
            </div>

            {/* Image */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Image (รูปภาพประกอบ)</label>

              {!imagePath ? (
                <button
                  onClick={handleImageUpload}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-500 dark:text-slate-400 transition-all w-full justify-center"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-xs">คลิกเพื่ออัปโหลดรูปภาพ</span>
                </button>
              ) : (
                <div className="relative group inline-block">
                  <div className="w-32 h-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
                    {/* Async Image Preview */}
                    <AsyncImagePreview path={imagePath} />
                  </div>
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-300 dark:text-slate-600 select-none">
            ⌨ Ctrl+Enter = บันทึก · Esc = ยกเลิก
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="small" icon={<X className="w-3.5 h-3.5" />} onClick={onCancel}>
              ยกเลิก
            </Button>
            <Button variant="primary" size="small" icon={<Save className="w-3.5 h-3.5" />} onClick={handleSave} disabled={!content.trim()}>
              {isEdit ? 'บันทึก' : 'เพิ่มคำถาม'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Async Image Helper Component
interface AsyncImagePreviewProps { // Added interface
  path: string;
  className?: string;
  onImageClick?: (src: string) => void;
}

const AsyncImagePreview: React.FC<AsyncImagePreviewProps> = ({ path, className, onImageClick }) => {
  const [src, setSrc] = useState<string>('');
  const [resolvedPath, setResolvedPath] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        if (!path) return;
        if (path.startsWith('http') || path.startsWith('asset')) {
          setSrc(path);
          return;
        }

        // Use backend to get base64 data directly (Reliable method)
        const base64Data = await invoke<string>('get_question_image_base64', { path });
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
          invoke('open_path', { path: resolvedPath });
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
  readOnly: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  canAddSub: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSub: () => void;
  onInsertAfter: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onImageClick?: (src: string) => void;
}

const QuestionDisplayCard: React.FC<QuestionDisplayCardProps> = ({
  question, prefix, level, readOnly, isExpanded,
  hasChildren, canAddSub, isFirst, isLast,
  onToggle, onEdit, onDelete, onAddSub, onInsertAfter, onMoveUp, onMoveDown, onImageClick
}) => {
  const isL1 = level === 0;

  return (
    <div className={`
      group relative flex items-start gap-3 px-4 py-3 transition-all duration-150
      ${isL1
        ? 'bg-white dark:bg-slate-800'
        : 'bg-slate-50/50 dark:bg-slate-800/50 ml-6'
      }
      ${!isLast ? 'border-b border-gray-100 dark:border-slate-700/50' : ''}
      hover:bg-blue-50/50 dark:hover:bg-blue-950/20
    `}>

      {/* L2 connector dot */}
      {!isL1 && (
        <div className="absolute left-[6px] top-1/2 -translate-y-1/2 flex items-center">
          <div className="w-[18px] h-px bg-blue-200 dark:bg-blue-800" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-blue-700 shrink-0" />
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 flex items-center justify-center rounded transition-all shrink-0
          ${hasChildren
            ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            : 'invisible'
          }`}
      >
        {isExpanded
          ? <ChevronDown className="w-3.5 h-3.5" />
          : <ChevronRight className="w-3.5 h-3.5" />
        }
      </button>

      {/* Prefix Badge */}
      <span className={`
        shrink-0 inline-flex items-center justify-center rounded-md text-xs font-bold min-w-[36px] px-1.5 py-0.5
        ${isL1
          ? 'bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-700/70 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
          : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800'
        }
      `}>
        {prefix}
      </span>

      {/* Content */}
      <span className={`flex-1 truncate select-text
        ${isL1
          ? 'text-sm font-medium text-slate-800 dark:text-slate-100'
          : 'text-slate-600 dark:text-slate-300'
        }
      `} title={question.content}>
        {question.content}
        {isL1 && question.description && (
          <div className="mt-1 text-base font-normal text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{question.description}</div>
        )}
        {isL1 && question.metadata && (
          <QuestionMetadataDisplay metadata={question.metadata} onImageClick={onImageClick} />
        )}
      </span>

      {/* Subtask count badge */}
      {hasChildren && (
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
          {question.children?.length} sub
        </span>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-150">

          {/* Insert After (New) */}
          <button
            onClick={onInsertAfter}
            className="p-1 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
            title="แทรกคำถามต่อท้าย"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Separator */}
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Move Up/Down */}
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className={`p-1 rounded transition-colors ${isFirst ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
            title="เลื่อนขึ้น"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className={`p-1 rounded transition-colors ${isLast ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
            title="เลื่อนลง"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Separator */}
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Add Sub */}
          {canAddSub && (
            <button
              onClick={onAddSub}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
              title="เพิ่มคำถามย่อย"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
            title="แก้ไข"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
            title="ลบ"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

// Helper to Display Metadata (Images)
const QuestionMetadataDisplay: React.FC<{ metadata: string; onImageClick?: (src: string) => void }> = ({ metadata, onImageClick }) => {
  const data = useMemo(() => {
    try { return JSON.parse(metadata); } catch { return {}; }
  }, [metadata]);

  if (!data.image) return null;

  return (
    <div className="mt-2 ml-4">
      <AsyncImagePreview
        path={data.image}
        className="h-32 w-auto object-cover rounded border border-gray-200 dark:border-slate-700 shadow-sm transition-transform hover:scale-105"
        onImageClick={onImageClick}
      />
    </div>
  );
};

export default PqsQuestionSection;
