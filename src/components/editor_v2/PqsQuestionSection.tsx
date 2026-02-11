import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit, Save, X, ChevronRight, ChevronDown, MessageSquarePlus, FileQuestion, Layers, ArrowUp, ArrowDown } from 'lucide-react';
import Button from '../ui/Button';
import { invoke } from '@tauri-apps/api/tauri';
import ConfirmModal from '../modals/ConfirmModal';
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

const buildPrefix = (level: number, sequence: number, sectionNumber: number) => {
  if (level === 0) return `${toThaiNumber(sectionNumber)}.${toThaiNumber(sequence)}`;
  return `${toThaiAlphabet(sequence)}.`;
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
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    setEditingId(null);
  };

  const handleStartCreate = (parentId: string | null = null) => {
    resetForms();
    setCreatingAtParent(parentId);
    setIsCreating(true);
  };

  const handleCreate = async (content: string, parentId: string | null) => {
    try {
      const siblingCount = parentId
        ? questions.filter(q => q.parent_id === parentId).length
        : questions.filter(q => !q.parent_id).length;
      await invoke('create_question', {
        args: {
          document_id: docId, section_id: sectionId, parent_id: parentId,
          content: content.trim(), is_header: false, sequence: siblingCount + 1,
          answer_type: 'text', metadata: null,
        }
      });
      resetForms();
      await fetchQuestions();
    } catch (err) {
      console.error('Failed to create question:', err);
    }
  };

  const handleUpdate = async (id: string, content: string) => {
    try {
      const q = questions.find(q => q.id === id);
      await invoke('update_question', { args: { id, content: content.trim(), metadata: q?.metadata || null } });
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
            เพิ่มคำถาม
          </Button>
        )}
      </div>

      {/* ── Content ── */}
      <div className="space-y-1">

        {/* Create Form (Top-Level) */}
        {isCreating && creatingAtParent === null && (
          <QuestionFormCard
            prefix={buildPrefix(0, questionTree.length + 1, sectionNumber)}
            onSave={(content) => handleCreate(content, null)}
            onCancel={resetForms}
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
                onStartEdit={(id) => { resetForms(); setEditingId(id); }}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onStartCreate={handleStartCreate}
                onCreate={handleCreate}
                onCancel={resetForms}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                siblings={questionTree}
                isFirst={idx === 0}
                isLast={idx === questionTree.length - 1}
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
  onStartEdit: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onDelete: (question: QuestionDetail) => void;
  onStartCreate: (parentId: string) => void;
  onCreate: (content: string, parentId: string | null) => void;
  onCancel: () => void;
  onMoveUp: (questionId: string, siblings: QuestionDetail[]) => void;
  onMoveDown: (questionId: string, siblings: QuestionDetail[]) => void;
  siblings: QuestionDetail[];
  isFirst: boolean;
  isLast: boolean;
}

const QuestionTreeNode: React.FC<QuestionTreeNodeProps> = ({
  question, level, sectionNumber, readOnly, editingId,
  isCreating, creatingAtParent, onStartEdit, onUpdate,
  onDelete, onStartCreate, onCreate, onCancel,
  onMoveUp, onMoveDown, siblings, isFirst, isLast,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const prefix = buildPrefix(level, question.sequence, sectionNumber);
  const hasChildren = question.children && question.children.length > 0;
  const canAddSub = level < 1 && !readOnly;

  if (editingId === question.id) {
    return (
      <div className={level > 0 ? 'ml-6' : ''}>
        <QuestionFormCard
          prefix={prefix}
          initialContent={question.content}
          onSave={(content) => onUpdate(question.id, content)}
          onCancel={onCancel}
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
        onMoveUp={() => onMoveUp(question.id, siblings)}
        onMoveDown={() => onMoveDown(question.id, siblings)}
      />

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
              onStartEdit={onStartEdit}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onStartCreate={onStartCreate}
              onCreate={onCreate}
              onCancel={onCancel}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              siblings={question.children!}
              isFirst={idx === 0}
              isLast={idx === question.children!.length - 1}
            />
          ))}
        </div>
      )}

      {isCreating && creatingAtParent === question.id && (
        <div className="ml-6 mt-1 mb-1">
          <QuestionFormCard
            prefix={buildPrefix(level + 1, (question.children?.length || 0) + 1, sectionNumber)}
            onSave={(content) => onCreate(content, question.id)}
            onCancel={onCancel}
          />
        </div>
      )}
    </div>
  );
};

// ============ QuestionFormCard ============

interface QuestionFormCardProps {
  prefix: string;
  initialContent?: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

const QuestionFormCard: React.FC<QuestionFormCardProps> = ({
  prefix, initialContent = '', onSave, onCancel,
}) => {
  const [content, setContent] = useState(initialContent);
  const isEdit = !!initialContent;

  const handleSave = () => { if (!content.trim()) return; onSave(content); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && e.ctrlKey) handleSave();
  };

  return (
    <div className="m-2 rounded-xl border-2 border-blue-400/60 dark:border-blue-500/40 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-slate-800 p-4 shadow-xl shadow-blue-500/10 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
            {prefix}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {isEdit ? '✏️ แก้ไขคำถาม' : '✨ เพิ่มคำถามใหม่'}
          </span>
        </div>

        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์คำถาม..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 resize-none text-sm transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
          rows={2}
        />

        <div className="flex items-center justify-between">
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
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const QuestionDisplayCard: React.FC<QuestionDisplayCardProps> = ({
  question, prefix, level, readOnly, isExpanded,
  hasChildren, canAddSub, isFirst, isLast,
  onToggle, onEdit, onDelete, onAddSub, onMoveUp, onMoveDown,
}) => {
  const isL1 = level === 0;

  return (
    <div className={`
      group relative flex items-center gap-3 px-4 py-3 transition-all duration-150
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
      <span className={`flex-1 text-sm truncate
        ${isL1
          ? 'font-medium text-slate-800 dark:text-slate-100'
          : 'text-slate-600 dark:text-slate-300'
        }
      `} title={question.content}>
        {question.content}
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

export default PqsQuestionSection;
