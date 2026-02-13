import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ImageIcon, X, Save, AlertTriangle, Shield, ShieldAlert, ShieldCheck, FileQuestion, Layers, ArrowUp, ArrowDown, MessageSquarePlus, Edit, ChevronDown, ChevronRight, CheckCircle, Globe, Video, Mic, FileDigit, FileText, MoreVertical } from 'lucide-react';
import Button from '../ui/Button';
import DropdownMenu, { DropdownMenuItem } from '../ui/DropdownMenu';
import { invoke } from '@tauri-apps/api/tauri';
import { open as openDialog } from '@tauri-apps/api/dialog';
import { convertFileSrc } from '@tauri-apps/api/tauri';

import ConfirmModal from '../modals/ConfirmModal';
import ImagePreviewModal from '../modals/ImagePreviewModal';
import { QuestionDetail, SectionReferenceDetail, QuestionReferenceDetail } from '../../types/content';

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



// ============ Types ============

interface PqsQuestionSectionProps {
  docId: string;
  sectionId?: number;
  sectionNumber: number;
  initialQuestions?: QuestionDetail[];
  readOnly?: boolean;
  refreshTrigger?: number;
  onReferencesUpdated?: () => void; // Added callback
}



// ============ Main Component ============

const PqsQuestionSection: React.FC<PqsQuestionSectionProps> = ({
  docId, sectionId, sectionNumber, initialQuestions = [], readOnly = false, refreshTrigger = 0, onReferencesUpdated
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
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger',
  });

  const fetchQuestions = async () => {
    if (!docId || sectionId === undefined) return; // sectionId can be 0, so check for undefined
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

  const handleCreate = async (data: { content: string, description?: string, image?: string, id?: string, references?: QuestionReferenceDetail[], metadata?: string }, parentId: string | null, insertAfterId: string | null = null) => {
    try {
      // 1. Create Question
      // Construct metadata from image AND answerKey (passed in data.metadata)
      let metaObj: any = {};
      if (data.metadata) {
        try { metaObj = JSON.parse(data.metadata); } catch (e) { }
      }
      if (data.image) {
        metaObj.image = data.image;
      }
      const finalMetadata = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : null;

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
          metadata: finalMetadata, // Use merged metadata
        }
      });

      // 1.5 Save References if provided (for L1)
      if (data.references && data.references.length > 0) {
        for (const ref of data.references) {
          await invoke('add_question_reference', {
            req: {
              question_id: newId,
              reference_id: ref.reference.id,
              location_text: ref.location_text
            }
          });
        }
      }

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
      onReferencesUpdated?.(); // Update references count after create
    } catch (err) {
      console.error('Failed to create question:', err);
    }
  };

  const handleUpdate = async (id: string, content: string, description?: string | null, metadata?: string | null, references?: QuestionReferenceDetail[]) => {
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

      // 2. Sync References (if provided)
      if (references) {
        const question = questions.find(q => q.id === id);
        const oldRefs = question?.references || [];
        const newRefs = references;

        // Diffing
        const toAdd = newRefs.filter(nr => !oldRefs.some(or => or.reference.id === nr.reference.id));
        const toRemove = oldRefs.filter(or => !newRefs.some(nr => nr.reference.id === or.reference.id));

        // Execute Additions
        for (const ref of toAdd) {
          await invoke('add_question_reference', {
            req: {
              question_id: id,
              reference_id: ref.reference_id, // Use reference_id
              location_text: ref.location_text
            }
          });
        }

        // Execute Removals
        for (const ref of toRemove) {
          await invoke('remove_question_reference', { id: ref.id });
        }
      }

      resetForms();
      await fetchQuestions();
      onReferencesUpdated?.(); // Update references count after all changes
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
          onReferencesUpdated?.(); // Update references count
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
                documentId={docId}
                sectionId={sectionId || 0} // Pass sectionId
                onImageClick={(src) => { setSelectedImage(src); setIsImageModalOpen(true); }}
                onAlert={(msg, type) => setConfirmModal({
                  isOpen: true,
                  title: 'แจ้งเตือน',
                  message: msg,
                  onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
                  variant: type || 'warning',
                  cancelText: ''
                })}
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
  onUpdate: (id: string, content: string, description?: string | null, metadata?: string | null, references?: QuestionReferenceDetail[]) => void;
  onDelete: (question: QuestionDetail) => void;
  onStartCreate: (parentId: string | null) => void;
  onStartInsertAfter: (afterId: string) => void;
  onCreate: (data: { content: string, description?: string, image?: string, id?: string, references?: QuestionReferenceDetail[] }, parentId: string | null, afterId?: string | null) => void;
  onCancel: () => void;
  onMoveUp: (questionId: string, siblings: QuestionDetail[]) => void;
  onMoveDown: (questionId: string, siblings: QuestionDetail[]) => void;
  siblings: QuestionDetail[];
  isFirst: boolean;
  isLast: boolean;
  documentId: string;
  sectionId: number; // Added sectionId
  onImageClick: (src: string) => void;
  onAlert: (message: string, type?: 'warning' | 'danger') => void;
}

const QuestionTreeNode: React.FC<QuestionTreeNodeProps> = ({
  question, level, sectionNumber, readOnly, editingId,
  isCreating, creatingAtParent, insertingAfterId,
  onStartEdit, onUpdate, onDelete, onStartCreate, onStartInsertAfter, onCreate, onCancel,
  onMoveUp, onMoveDown, siblings, isFirst, isLast, documentId, sectionId,
  onImageClick, onAlert
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
          initialMetadata={question.metadata} // Pass metadata
          onSave={(data) => {
            // Construct metadata from image AND answerKey
            let metaObj: any = {};
            if (data.metadata) {
              try { metaObj = JSON.parse(data.metadata); } catch (e) { }
            }
            if (data.image) {
              metaObj.image = data.image;
            }
            const finalMetadata = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : null;
            onUpdate(question.id, data.content, data.description || null, finalMetadata, data.references);
          }}
          onCancel={onCancel}
          documentId={documentId}
          sectionId={sectionId} // Pass sectionId
          existingId={question.id}
          initialReferences={question.references} // Pass existing references
          onAlert={onAlert}
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
        isLast={isLast}
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
            documentId={documentId}
            sectionId={sectionId}
            onAlert={onAlert}
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
              documentId={documentId}
              sectionId={sectionId} // Pass sectionId
              onImageClick={onImageClick}
              onAlert={onAlert}
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
            documentId={documentId}
            sectionId={sectionId}
            onAlert={onAlert}
          />
        </div>
      )}
    </div>
  );
};

// ============ QuestionFormCard ============

// ============ QuestionFormCard ============

interface QuestionFormCardProps {
  prefix: string;
  level: number; // New prop to determine if L1
  initialContent?: string;
  initialDescription?: string;
  initialImage?: string;
  initialMetadata?: string | null; // Added initialMetadata
  initialReferences?: QuestionReferenceDetail[];
  onSave: (data: { content: string, description?: string, image?: string, id?: string, references?: QuestionReferenceDetail[], metadata?: string }) => void; // Added references & metadata
  onCancel: () => void;
  documentId: string; // Added documentId
  existingId?: string; // Edit mode ID
  sectionId?: number; // Added sectionId for fetching available references
  onAlert?: (message: string, type?: 'warning' | 'danger') => void;
}

const EMPTY_REFS: QuestionReferenceDetail[] = [];

const QuestionFormCard: React.FC<QuestionFormCardProps> = ({
  prefix, level, initialContent = '', initialDescription = '', initialImage = '', initialMetadata = null, initialReferences = EMPTY_REFS,
  onSave, onCancel, documentId, existingId, sectionId, onAlert
}) => {
  const [content, setContent] = useState(initialContent);
  const [description, setDescription] = useState(initialDescription);
  const [imagePath, setImagePath] = useState<string | null>(initialImage || null);
  // Store a generated ID for new questions that have images uploaded BEFORE save
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  // Reference Linking State
  const [availableRefs, setAvailableRefs] = useState<SectionReferenceDetail[]>([]);
  const [linkedRefs, setLinkedRefs] = useState<QuestionReferenceDetail[]>(initialReferences);
  const [selectedRefId, setSelectedRefId] = useState<string>(''); // string for select value
  const [pageInput, setPageInput] = useState<string>('-'); // Default to "-"
  const [answerKey, setAnswerKey] = useState<string>(() => {
    if (!initialMetadata) return '';
    try {
      const meta = JSON.parse(initialMetadata);
      return meta.answerKey || '';
    } catch { return ''; }
  }); // Correct Answer State Initialized from Metadata

  const isEdit = !!initialContent;
  const isL1 = level === 0;



  // Fetch Available References for this Section
  useEffect(() => {
    if (isL1 && sectionId) {
      invoke<SectionReferenceDetail[]>('get_section_references', { sectionId })
        .then(refs => setAvailableRefs(refs))
        .catch(err => console.error("Failed to fetch section references:", err));
    }
  }, [isL1, sectionId]);

  // Handle Adding Reference
  const handleAddReference = async () => {
    if (!selectedRefId) return;
    const refIdNum = parseInt(selectedRefId);
    const selectedRef = availableRefs.find(r => r.reference.id === refIdNum);
    if (!selectedRef) return;

    // Check if already linked
    if (linkedRefs.some(r => r.reference.id === refIdNum)) {
      if (onAlert) onAlert("เอกสารนี้ถูกเชื่อมโยงแล้ว", "warning");
      else alert("เอกสารนี้ถูกเชื่อมโยงแล้ว");
      return;
    }

    // Logic: Always update local state. References are saved on "Save" button click.

    // Construct the new reference object (Optimistic)

    // Construct the new reference object (Optimistic)
    const newRef: QuestionReferenceDetail = {
      id: 0, // Temporary ID
      question_id: existingId || 'temp',
      reference_id: selectedRef.reference.id, // Added reference_id
      reference: selectedRef.reference,
      location_text: pageInput || null,
      display_order: linkedRefs.length + 1,
      thai_letter: selectedRef.thai_letter
    };

    if (existingId) {
      // Edit mode: Just update local state for now
      setLinkedRefs([...linkedRefs, newRef]);
      setSelectedRefId('');
      setPageInput('');
    } else {
      // Creating mode: Just update local state
      setLinkedRefs([...linkedRefs, newRef]);
      setSelectedRefId('');
      setPageInput('');
    }
  };

  const handleRemoveReference = async (ref: QuestionReferenceDetail) => {
    // Logic: Always update local state. Removal happens on "Save".
    setLinkedRefs(linkedRefs.filter(r => r.reference.id !== ref.reference.id));
  };

  const handleImageUpload = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
      });

      if (selected && typeof selected === 'string') {
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
        const newPath = await invoke<string>('upload_question_image', {
          path: selected,
          documentId: documentId,
          questionId: targetId,
          friendlyPrefix: friendlyPrefix
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
        await invoke('delete_question_image', { path: imagePath });
      } catch (err) {
        console.error("Failed to delete image file:", err);
      }
    }
    setImagePath(null);
  };

  const handleSave = () => {
    if (!content.trim()) return;

    // Validation for L1: Must have at least 1 reference
    if (isL1 && linkedRefs.length === 0) {
      if (onAlert) onAlert("กรุณาเลือกเอกสารอ้างอิงอย่างน้อย 1 รายการครับ", "warning");
      else alert("กรุณาเลือกเอกสารอ้างอิงอย่างน้อย 1 รายการครับ");
      return;
    }

    // Construct metadata string (Answer Key +/ Image +/ Other)
    // Note: Image is handled by handleUpdate/handleCreate logic via returned generic 'image' field if not L1?
    // Actually QuestionFormCard handles Image state locally and passes it as 'image' field.
    // So 'metadata' from here mainly carries 'answerKey'.
    // BUT we must preserve existing metadata if answerKey changes.

    let metadataString: string | undefined = undefined;
    if (answerKey.trim()) {
      // Preserve existing metadata if needed
      let newMeta: any = {};
      if (initialMetadata) {
        try { newMeta = JSON.parse(initialMetadata); } catch (e) { }
      }
      newMeta.answerKey = answerKey.trim();
      metadataString = JSON.stringify(newMeta);
    } else if (initialMetadata) {
      // If clearing answerKey but keeping other metadata
      try {
        const existing = JSON.parse(initialMetadata);
        if (existing.answerKey) delete existing.answerKey;
        if (Object.keys(existing).length > 0) metadataString = JSON.stringify(existing);
      } catch (e) { }
    }

    onSave({
      content,
      description: isL1 ? description : undefined,
      image: isL1 ? (imagePath || undefined) : undefined,
      id: !isEdit ? (generatedId || undefined) : undefined,
      references: isL1 ? linkedRefs : undefined,
      metadata: metadataString // Pass metadata
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setAnswerKey('');
      onCancel();
    }
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

        {/* L1 Extras: Description & Image & References */}
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

            {/* Linked References */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">
                เอกสารอ้างอิง ({linkedRefs.length}/2)
              </label>

              {/* List */}
              <div className="space-y-2 mb-2">
                {linkedRefs.map((ref, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                    <span className="flex-1 truncate text-slate-700 dark:text-slate-200">
                      <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">{ref.thai_letter ? `${ref.thai_letter}.` : '?.'}</span>
                      {ref.reference.code} - {ref.reference.title} (หน้า {ref.location_text || '-'})
                    </span>
                    <button onClick={() => handleRemoveReference(ref)} className="text-red-400 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New (Limit 2) */}
              {linkedRefs.length < 2 && (
                <div className="flex gap-2">
                  {availableRefs.length === 0 ? (
                    <div className="flex-1 p-2 text-xs text-orange-500 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between gap-2">
                      <span>⚠️ ไม่พบเอกสารใน Section นี้ ({sectionId})</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (sectionId) {
                            invoke<SectionReferenceDetail[]>('get_section_references', { sectionId })
                              .then(refs => setAvailableRefs(refs))
                              .catch(err => {
                                if (onAlert) onAlert("Fetch error: " + err, 'danger');
                                else alert("Fetch error: " + err);
                              });
                          } else {
                            if (onAlert) onAlert("No Section ID", 'warning');
                            else alert("No Section ID");
                          }
                        }}
                        className="px-2 py-1 bg-white border border-orange-300 rounded hover:bg-orange-100"
                      >
                        Refresh
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      {/* 1. Custom Reference Picker (List) - MIRRORING Section Manager */}
                      <div className="max-h-[200px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-slate-900 p-1 custom-scrollbar">
                        {availableRefs.filter(avail => !linkedRefs.some(linked => linked.reference.id === avail.reference.id)).length === 0 ? (
                          <div className="text-center py-4 text-xs text-gray-400 italic">ไม่มีเอกสารเพิ่มเติมให้เลือก</div>
                        ) : (
                          availableRefs.filter(avail => !linkedRefs.some(linked => linked.reference.id === avail.reference.id)).map(r => {
                            const isSelected = selectedRefId === r.reference.id.toString();
                            return (
                              <div
                                key={r.reference.id}
                                onClick={() => setSelectedRefId(prev => prev === r.reference.id.toString() ? '' : r.reference.id.toString())}
                                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700' : 'hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent'}`}
                              >
                                {/* Thai Letter (Sequence) */}
                                <span className={`text-sm font-bold w-6 text-center ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {r.thai_letter}.
                                </span>

                                {/* Icon (Resource Type) */}
                                <div className={`shrink-0 w-6 h-6 rounded flex items-center justify-center border ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400'}`}>
                                  {isSelected ? <CheckCircle className="w-3.5 h-3.5" /> :
                                    r.reference.resource_type === 'WEBLINK' ? <Globe className="w-3.5 h-3.5 text-emerald-500" /> :
                                      r.reference.resource_type === 'VIDEO' ? <Video className="w-3.5 h-3.5 text-purple-500" /> :
                                        r.reference.resource_type === 'IMAGE' ? <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> :
                                          r.reference.resource_type === 'AUDIO' ? <Mic className="w-3.5 h-3.5 text-orange-500" /> :
                                            r.reference.resource_type === 'TEMPLATE' ? <FileDigit className="w-3.5 h-3.5 text-slate-500" /> :
                                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  }
                                </div>

                                {/* Content & Classification (Inline) */}
                                <div className="flex flex-col min-w-0 flex-1 justify-center">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 rounded">{r.reference.code}</span>
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate" title={r.reference.title}>{r.reference.title}</span>

                                    {/* Classification Icon - Inline & Resized */}
                                    {r.reference.classification && (
                                      <div className="flex items-center ml-1" title={`Classification: ${r.reference.classification}`}>
                                        {r.reference.classification === 'Secret' || r.reference.classification === 'Top Secret' ? (
                                          <ShieldAlert className={`w-3.5 h-3.5 ${r.reference.classification === 'Top Secret' ? 'text-red-700' : 'text-red-500'}`} />
                                        ) : r.reference.classification === 'Confidential' ? (
                                          <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                                        ) : r.reference.classification === 'Restricted' ? (
                                          <Shield className="w-3.5 h-3.5 text-yellow-500" />
                                        ) : r.reference.classification === 'Unclassified' ? (
                                          <Shield className="w-3.5 h-3.5 text-green-500" />
                                        ) : (
                                          <Shield className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Usage Badge - MIRRORING */}
                                <div className="flex flex-col items-end gap-1">
                                  {r.usage_count > 0 ? (
                                    <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full border border-green-200 dark:border-green-800 whitespace-nowrap" title={`ถูกอ้างอิงแล้ว ${r.usage_count} ครั้ง`}>
                                      Used: {r.usage_count}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800 whitespace-nowrap opacity-80">
                                      Unused
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* 2. Page Input & Add Button */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="ระบุเลขหน้า (e.g. -, 1-25)"
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            className={`w-full p-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${pageInput === '-' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}
                          />
                          {pageInput === '-' && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 group">
                              <AlertTriangle className="w-4 h-4 text-yellow-500 cursor-help" />
                              <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                กรุณาพยายามเพิ่มเติมหน้าที่ใช้ออกคำถามจะสมบูรณ์ที่สุด
                              </div>
                            </div>
                          )}
                        </div>
                        <Button variant="secondary" size="small" onClick={handleAddReference} disabled={!selectedRefId}>
                          <Plus className="w-3 h-3 mr-1" /> เพิ่ม
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

        {/* Correct Answer (All Levels) */}
        <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
          <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Correct Answer (เฉลย)</label>
          <textarea
            value={answerKey}
            onChange={(e) => setAnswerKey(e.target.value)}
            placeholder="คำตอบที่ถูกต้อง..."
            className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none text-xs"
            rows={2}
          />
        </div>

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
        <div className="absolute left-[6px] top-[24px] -translate-y-1/2 flex items-center">
          <div className="w-[18px] h-px bg-blue-200 dark:bg-blue-800" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-blue-700 shrink-0" />
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 mt-1 flex items-center justify-center rounded transition-all shrink-0
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
        shrink-0 inline-flex items-center justify-center
        ${isL1
          ? 'rounded-md min-w-[36px] px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-700/70 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
          : 'min-w-[24px] text-sm font-normal text-blue-600 dark:text-blue-400' // L2: No box, just text
        }
      `}>
        {prefix}
      </span>

      {/* Content */}
      <div className={`flex-1 flex flex-col min-w-0 select-text
        ${isL1
          ? 'text-sm text-slate-900 dark:text-slate-100' // L1: Stronger emphasis
          : 'text-sm text-slate-700 dark:text-slate-300' // L2: Normal weight as requested
        }
      `}>

        {/* Row 1: Content + Refs (Inline) */}
        <div className="truncate pr-8" title={question.content}>
          <span className={isL1 ? 'font-semibold' : 'font-normal'}>{question.content}</span>
          {isL1 && question.references && question.references.length > 0 && (
            <span className="ml-2 text-sm text-slate-500 font-normal">
              ({question.references.map(ref => `${ref.thai_letter || '?'}.${ref.location_text || '-'}`).join(', ')})
            </span>
          )}
        </div>

        {isL1 && question.description && (
          <div className="mt-1 text-sm font-normal text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{question.description}</div> // Description: Match L2 style
        )}
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
            items={[
              {
                label: 'แทรกคำถามต่อท้าย (Insert After)',
                icon: <Plus />,
                onClick: onInsertAfter
              },
              { label: 'separator', onClick: () => { }, separator: true },
              {
                label: 'เลื่อนขึ้น (Move Up)',
                icon: <ArrowUp />,
                onClick: onMoveUp,
                disabled: isFirst
              },
              {
                label: 'เลื่อนลง (Move Down)',
                icon: <ArrowDown />,
                onClick: onMoveDown,
                disabled: isLast
              },
              { label: 'separator', onClick: () => { }, separator: true },
              ...(canAddSub ? [{
                label: 'เพิ่มคำถามย่อย (Add Sub-Question)',
                icon: <MessageSquarePlus />,
                onClick: onAddSub
              }] : []),
              {
                label: 'แก้ไข (Edit)',
                icon: <Edit />,
                onClick: onEdit
              },
              {
                label: 'ลบ (Delete)',
                icon: <Trash2 />,
                onClick: onDelete,
                danger: true
              }
            ] as DropdownMenuItem[]}
          />
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

      {/* Answer Key Display (Last) */}
      {data.answerKey && (
        <div className="flex items-start gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
          <span className="font-bold">เฉลย:</span>
          <span className="whitespace-pre-wrap">{data.answerKey}</span>
        </div>
      )}
    </div>
  );
};

export default PqsQuestionSection;
