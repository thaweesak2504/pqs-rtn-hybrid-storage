import React, { useState, useEffect, useMemo } from 'react';
import { Check, X, Plus } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { QuestionDetail } from '../../types/content';
import QuestionRenderer from '../questions/QuestionRenderer';
import ReferenceManager from '../sections/ReferenceManager';
import AddQuestionModal from '../modals/AddQuestionModal';
import ConfirmModal from '../modals/ConfirmModal';

interface SectionQuestionViewProps {
  isPreviewMode?: boolean;
  docId: string;
  sectionId: number;
  sectionNumber: number; // e.g. 200, 300
  title: string;
  hideHeader?: boolean; // Hide section header + references (when parent already shows them)
}

const SectionQuestionView: React.FC<SectionQuestionViewProps> = ({
  isPreviewMode = false,
  docId,
  sectionId,
  sectionNumber,
  title,
  hideHeader = false
}) => {
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionDetail | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<QuestionDetail | null>(null);
  const [parentQuestion, setParentQuestion] = useState<QuestionDetail | null>(null);
  const [activeParentPrefix, setActiveParentPrefix] = useState<string>('');

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(title);
  const [allExpanded, setAllExpanded] = useState(false);

  const handleToggleAll = () => {
    setAllExpanded(!allExpanded);
  };

  useEffect(() => {
    setTitleVal(title);
  }, [title]);

  const toThaiNumber = (num: number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => thaiDigits[parseInt(d)] || d).join('');
  };

  const handleTitleSave = async () => {
    if (titleVal.trim() === '' || titleVal === title) {
      setIsEditingTitle(false);
      setTitleVal(title);
      return;
    }

    try {
      await invoke('update_section', {
        args: {
          id: sectionId,
          title_th: titleVal,
          menu_label: `${sectionNumber} ${titleVal.substring(0, 20)}...` // Auto-update menu label too
        }
      });
      setIsEditingTitle(false);
      // We might need to refresh parent or context to see title change in sidebar, 
      // but for now local update is handled by prop update from parent if parent refreshes.
      // If parent doesn't refresh, we might need to trigger a callback. 
      // For now, let's assume parent (ActiveDocumentPage) refreshes or we live with stale sidebar until reload.
      // Actually, ActiveDocumentPage fetches usage, maybe not sections.
      // We'll rely on props updating if we want full consistency, but standard React pattern is 
      // optimistic update or callback. 
      // Let's reload the page content? No, that's heavy.
      // Just exit edit mode. The Sidebar might differ until refresh.
    } catch (error) {
      console.error("Failed to update section title:", error);
      alert("Failed to save title");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setTitleVal(title);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [docId, sectionNumber, sectionId]);

  const fetchQuestions = async () => {
    if (!docId) return;

    try {
      setLoading(true);
      const data = await invoke<QuestionDetail[]>('get_document_questions_with_details', { docId });

      // Filter for specific section
      // Match by Section ID (Database Row ID) OR by Sequence (Legacy)
      const filteredQuestions = data.filter(q =>
        (q.section_id === sectionId) || (q.section_id === 0 && q.sequence >= sectionNumber && q.sequence < sectionNumber + 100)
      );
      setQuestions(filteredQuestions);
    } catch (error) {
      console.error(`Failed to fetch questions for section ${sectionNumber}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    console.log(`Answer changed for ${questionId}: ${value}`);
    // TODO: Implement save logic
  };

  const handleEdit = (question: QuestionDetail, parentPrefix: string) => {
    setEditingQuestion(question);
    setActiveParentPrefix(parentPrefix);
    setIsAddModalOpen(true);
  };

  const handleAddSubQuestion = (parent: QuestionDetail, prefix: string) => {
    setParentQuestion(parent);
    setActiveParentPrefix(prefix);
    setEditingQuestion(null); // Ensure we are not in edit mode
    setIsAddModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditingQuestion(null);
    setParentQuestion(null);
    setActiveParentPrefix('');
  };

  const handleSuccess = () => {
    fetchQuestions(); // Refresh list
    handleModalClose();
  };

  const handleDeleteCallback = (question: QuestionDetail) => {
    setQuestionToDelete(question);
  };

  const confirmDelete = async () => {
    if (!questionToDelete) return;

    try {
      await invoke('delete_question', { id: questionToDelete.id });
      setQuestionToDelete(null);
      fetchQuestions(); // Refresh
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert('Failed to delete question');
    }
  };

  // Build Hierarchy Tree
  const questionTree = useMemo(() => {
    const tree: QuestionDetail[] = [];
    const map = new Map<string, QuestionDetail>();

    // 1. Initialize map
    questions.forEach(q => {
      map.set(q.id, { ...q, children: [] });
    });

    // 2. Build tree
    questions.forEach(q => {
      const node = map.get(q.id)!;
      if (q.parent_id && map.has(q.parent_id)) {
        map.get(q.parent_id)!.children!.push(node);
      } else {
        tree.push(node);
      }
    });

    // 3. Sort by sequence
    const sortNodes = (nodes: QuestionDetail[]) => {
      nodes.sort((a, b) => a.sequence - b.sequence);
      nodes.forEach(n => {
        if (n.children && n.children.length > 0) {
          sortNodes(n.children);
        }
      });
    };
    sortNodes(tree);

    return tree;
  }, [questions]);


  // Calculate Usage Counts (Memoized out of render loop)
  // const usageCounts = useMemo(() => { ... }, [questions]);
  // Unused for now as we are strictly following Moc layout which lists specific references manually or we need to map them differently.
  // Keeping logic if needed later but commenting out to fix lint.

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Section {sectionNumber}...</div>;
  }

  // Preview Mode
  if (isPreviewMode) {
    return (
      <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
        <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-github-text-primary box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_2.0cm_2.0cm_3.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
          <div className="mb-4">
            <h1 className='font-bold text-lg'>
              {toThaiNumber(sectionNumber)} {title}
            </h1>
          </div>

          <div className="mb-4">
            <ReferenceManager sectionId={sectionId} readOnly={true} />
          </div>

          <div className="space-y-4">
            {questionTree.map((question) => (
              <QuestionRenderer
                key={question.id}
                question={question}
                level={0}
                readOnly={true}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className={`flex flex-col h-full font-th-sarabun text-lg ${isPreviewMode ? '' : 'p-4'}`}>

      {/* Section Header (Moc Style) — hidden when parent already shows header */}
      {!hideHeader && (
        <div className="mb-4">
          {/* Title Row: Grid with 5ch gap */}
          <div className="grid grid-cols-[max-content_1fr] gap-x-[5ch] items-baseline">
            <span className="font-bold whitespace-nowrap text-black dark:text-github-text-primary">
              {toThaiNumber(sectionNumber)}
            </span>

            <div className="font-bold text-black dark:text-github-text-primary">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleVal}
                    onChange={(e) => setTitleVal(e.target.value)}
                    onBlur={handleTitleSave} // Auto-save on blur
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="bg-white dark:bg-github-bg-tertiary border border-blue-500 rounded px-2 py-1 text-github-text-primary flex-1 min-w-[300px]"
                  />
                  <button onClick={handleTitleSave} className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded text-green-600">
                    <Check size={18} />
                  </button>
                  <button onClick={() => { setIsEditingTitle(false); setTitleVal(title); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <span
                  onClick={() => !isPreviewMode && setIsEditingTitle(true)}
                  className={`${!isPreviewMode ? 'cursor-text hover:underline decoration-gray-400 underline-offset-4' : ''}`}
                  title="Click to edit title"
                >
                  {title}
                </span>
              )}
            </div>
          </div>

          {/* References Row (Indented) */}
          <div className="ml-[5ch] mt-2 text-black dark:text-github-text-primary">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold">เอกสารอ้างอิง :</span>
              {/* Toggle All Button - Moved here as start of references or inline */}
              <button
                onClick={handleToggleAll}
                className="ml-auto px-3 py-0.5 bg-[#f9f9f9] dark:bg-github-bg-secondary border border-[#333] dark:border-github-border-primary rounded text-sm hover:bg-[#e8e6e6] dark:hover:bg-github-bg-hover transition-colors font-th-sarabun"
              >
                {allExpanded ? 'ซ่อนคำตอบ' : 'แสดงคำตอบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          เพิ่มคำถามหลัก (Add L1 Question)
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questionTree.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">ยังไม่มีข้อมูลคำถามในส่วนนี้</p>
            <p className="text-sm text-gray-400 mt-2">คลิก "เพิ่มคำถามหลัก" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          questionTree.map((question) => (
            <div
              key={question.id}
              className="bg-white dark:bg-github-bg-secondary p-6 rounded-lg shadow-sm border border-github-border-primary"
            >
              <QuestionRenderer
                key={question.id}
                question={question}
                level={0}
                onAnswerChange={!isPreviewMode ? handleAnswerChange : undefined}
                onEdit={!isPreviewMode ? handleEdit : undefined}
                onDelete={!isPreviewMode ? handleDeleteCallback : undefined}
                onAddSubQuestion={!isPreviewMode ? handleAddSubQuestion : undefined}
                readOnly={isPreviewMode}
                parentPrefix={toThaiNumber(sectionNumber)}
                // Dynamic Max Depth: 
                // Section 100 (Fundamentals): Limit to L2 (Root + 1 level) -> depth 1
                // Section 200/300: Standard depth (usually 3 levels) -> depth 2 or undefined
                visibleMaxDepth={sectionNumber < 200 ? 1 : undefined}
                forceExpand={allExpanded}
              />
            </div>
          ))
        )}
      </div>

      {/* Add Question Modal */}
      <AddQuestionModal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        sectionId={sectionId}
        docId={docId}
        onSuccess={handleSuccess}
        nextSeq={parentQuestion && parentQuestion.children
          ? parentQuestion.children.length + 1
          : questions.filter(q => !q.parent_id).length + 1}
        sectionNumber={sectionNumber}
        initialData={editingQuestion}
        parentId={parentQuestion?.id}
        parentPrefix={activeParentPrefix}
      />

      <ConfirmModal
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={confirmDelete}
        title="ยืนยันการลบคำถาม"
        message={`คุณต้องการลบคำถามนี้ใช่หรือไม่?\n\n"${questionToDelete?.content}"\n\nคำเตือน: การลบนี้จะลบคำตอบและข้อมูลที่เกี่ยวข้องทั้งหมด`}
        confirmText="ลบคำถาม"
        cancelText="ยกเลิก"
      />
    </div>
  );
};

export default SectionQuestionView;
