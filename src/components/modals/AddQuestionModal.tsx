import { invoke } from '@tauri-apps/api/tauri';
import { AlertCircle, BookOpen, HelpCircle, Save, Table, X } from 'lucide-react'; // Added HelpCircle icon
import React, { useEffect, useState } from 'react';
import { QuestionDetail } from '../../types/content'; // Ensure this import exists
import { normalizePolicyGuardError } from '../../utils/policyGuards';

interface DocumentReference {
  id: number;
  code: string;
  title: string;
}

interface SectionReferenceDetail {
  id: number;
  reference: DocumentReference;
  thai_letter: string;
}

interface AnswerKeyRow {
  id: number;
  question_id: string;
  sub_question_code: string;
  answer_key_text: string | null;
  is_required: boolean;
  order_index: number;
}

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: number;
  docId: string;
  onSuccess: () => void;
  nextSeq: number; // Suggested sequence number (e.g., 1 for 101.1)
  sectionNumber: number; // e.g., 101
  initialData?: QuestionDetail | null;
  parentId?: string;
  parentPrefix?: string;
}

const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  isOpen,
  onClose,
  sectionId,
  docId,
  onSuccess,
  nextSeq,
  sectionNumber,
  initialData, // Add this line
  parentId,
  parentPrefix
}) => {
  const [content, setContent] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const contentRef = React.useRef<HTMLTextAreaElement>(null);
  const answerKeyRef = React.useRef<HTMLTextAreaElement>(null);
  // State for references with pages: Map<ReferenceID, PageString>
  const [selectedRefs, setSelectedRefs] = useState<Map<number, string>>(new Map());
  const [availableRefs, setAvailableRefs] = useState<SectionReferenceDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Helper to format numerals
  const toThaiNumber = (num: string | number) => {
    return num.toString();
  };

  // Auto-resize logic
  const adjustHeight = (el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  // Convert sequence to Thai for preview (e.g. 101.1 -> ๑๐๑.๑)
  const thaiNumber = toThaiNumber(sectionNumber);
  const thaiSeq = toThaiNumber(nextSeq);

  // Logic: 
  // 1. If Initial Data: Use its own sequence
  // 2. If Parent Prefix (Sub-Question): parentPrefix + "." + thaiSeq
  // 3. Fallback (Root): sectionNumber + "." + thaiSeq

  const formattedInitialSeq = initialData
    ? toThaiNumber(initialData.sequence)
    : '';

  const previewNumber = initialData
    ? (initialData.parent_id ? `${parentPrefix ? parentPrefix + '.' : ''}${formattedInitialSeq}` : `${thaiNumber}.${formattedInitialSeq}`)
    : parentPrefix
      ? `${parentPrefix}.${thaiSeq}`
      : `${thaiNumber}.${thaiSeq}`;


  useEffect(() => {
    const loadReferences = async () => {
      try {
        setLoading(true);
        const refs = await invoke<SectionReferenceDetail[]>('get_section_references', { sectionId });
        setAvailableRefs(refs);
      } catch (err) {
        console.error('Failed to load references:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      setSubmitError(null);
      loadReferences();

      if (initialData) {
        // Edit Mode: Pre-fill data
        // 1. Content: Try to strip prefix to let user edit just the text
        // Prefix format: "ThaiSection.ThaiSeq "
        // We construct the expected prefix to strip it
        const thaiNum = toThaiNumber(sectionNumber);
        const thaiSeqInit = toThaiNumber(initialData.sequence);
        const prefix = `${thaiNum}.${thaiSeqInit} `;

        let loadedContent = initialData.content;
        if (loadedContent.startsWith(prefix)) {
          loadedContent = loadedContent.slice(prefix.length);
        }
        invoke<AnswerKeyRow[]>('get_question_answer_keys', { questionId: initialData.id })
          .then(rows => {
            const single = rows.find(r => (r.sub_question_code || '') === '');
            setAnswerKey(single?.answer_key_text || '');
          })
          .catch(() => setAnswerKey(''));
        setContent(loadedContent);

        // 2. References
        const newMap = new Map<number, string>();
        if (initialData.references) {
          initialData.references.forEach(ref => {
            if (ref.reference && ref.reference.id) {
              newMap.set(ref.reference.id, ref.location_text || '-');
            }
          });
        }
        setSelectedRefs(newMap);

        // Force resize for existing content
        setTimeout(() => {
          adjustHeight(contentRef.current);
          adjustHeight(answerKeyRef.current);
        }, 100);

      } else {
        // Create Mode
        setContent('');
        setAnswerKey('');
        setSelectedRefs(new Map());
      }
    }
  }, [isOpen, sectionId, initialData, sectionNumber]);

  const toggleReference = (refId: number) => {
    setSelectedRefs(prev => {
      const newMap = new Map(prev);
      if (newMap.has(refId)) {
        newMap.delete(refId);
      } else {
        newMap.set(refId, '-'); // Default page: "-"
      }
      return newMap;
    });
  };

  const updateReferencePage = (refId: number, page: string) => {
    setSelectedRefs(prev => {
      const newMap = new Map(prev);
      if (newMap.has(refId)) {
        newMap.set(refId, page);
      }
      return newMap;
    });
  };

  const insertTableTemplate = () => {
    // Standard Markdown requires a blank line before a table if it follows text.
    // We add \n\n to ensure separation.
    const template = `

| หัวข้อ (Header) | รายละเอียด (Detail) |
|----------------|-------------------|
| ข้อมูล 1        | รายละเอียด 1       |
| ข้อมูล 2        | รายละเอียด 2       |
`;
    setAnswerKey(prev => prev + template);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSaving(true);
      setSubmitError(null);

      const referencesMeta = Array.from(selectedRefs.entries()).map(([id, page]) => ({
        id,
        page
      }));

      const metadata = {
        references: referencesMeta,
      };

      let questionId = initialData?.id || '';

      if (initialData) {
        // Update Mode
        // Don't prefix! Use raw content.
        const finalContent = content.trim();

        await invoke('update_question', {
          args: {
            id: initialData.id,
            content: finalContent,
            metadata: JSON.stringify(metadata)
          }
        });
      } else {
        // Create Mode
        const finalContent = content.trim();
        questionId = crypto.randomUUID();

        await invoke('create_question', {
          args: {
            id: questionId,
            document_id: docId,
            section_id: sectionId,
            parent_id: parentId || null,
            sequence: nextSeq, // Force use of suggested sequence (e.g. 2 for 101.2)
            content: finalContent,
            is_header: false,
            answer_type: 'text', // Default
            metadata: JSON.stringify(metadata)
          }
        });
      }

      await invoke('replace_question_answer_keys', {
        questionId,
        items: answerKey.trim() ? [{ subCode: '', text: answerKey.trim(), isRequired: true }] : []
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save question:', err);
      setSubmitError(normalizePolicyGuardError(err, 'Failed to save question'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-github-bg-secondary rounded-lg shadow-xl max-w-3xl w-full mx-4 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-github-border-primary flex justify-between items-center bg-gray-50 dark:bg-github-bg-tertiary rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {initialData
                ? 'แก้ไขคำถาม (Edit Question)'
                : parentId
                  ? 'เพิ่มคำถามย่อย (Add Sub-Question)'
                  : 'เพิ่มคำถามหลัก (Add L1 Question)'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
              {initialData
                ? `Function: ${previewNumber}`
                : parentId
                  ? `Sub-Function: ${previewNumber}`
                  : `Function: ${previewNumber} (L1 Root)`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`p-2 rounded-full transition-colors ${showHelp ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500'}`}
              title="คู่มือการใช้งาน (Help)"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Markdown Guide Panel */}
        {showHelp && (
          <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-4 border-b border-blue-100 dark:border-blue-900 flex flex-col gap-3 transition-all">
            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> แนะนำการจัดรูปแบบ (Markdown Guide)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-github-text-primary">
              <div className="space-y-2">
                <div className="bg-white dark:bg-github-bg-primary p-2 rounded border border-blue-200 dark:border-blue-800">
                  <span className="font-semibold block text-blue-600 dark:text-blue-400">1. เลขข้อแบบไทย (Ordered List)</span>
                  <code className="block bg-gray-100 dark:bg-gray-800 p-1 rounded mt-1 font-mono">
                    1. รายการที่ 1<br />
                    2. รายการที่ 2
                  </code>
                  <span className="text-gray-500 mt-1 block">แสดงผลเป็น: ๑. รายการที่ 1, ๒. รายการที่ 2</span>
                </div>
                <div className="bg-white dark:bg-github-bg-primary p-2 rounded border border-blue-200 dark:border-blue-800">
                  <span className="font-semibold block text-blue-600 dark:text-blue-400">2. ตัวหนา/ตัวเอียง (Bold/Italic)</span>
                  <code className="block bg-gray-100 dark:bg-gray-800 p-1 rounded mt-1 font-mono">
                    **ตัวหนา**  _ตัวเอียง_
                  </code>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-white dark:bg-github-bg-primary p-2 rounded border border-blue-200 dark:border-blue-800">
                  <span className="font-semibold block text-blue-600 dark:text-blue-400">3. ตาราง (Table)</span>
                  <span className="text-gray-500 block mb-1">ใช้ปุ่ม "แทรกตาราง" หรือพิมพ์เอง:</span>
                  <code className="block bg-gray-100 dark:bg-gray-800 p-1 rounded font-mono whitespace-pre text-[10px]">
                    | หัวข้อ 1 | หัวข้อ 2 |<br />
                    |----------|----------|<br />
                    | ข้อมูล 1 | ข้อมูล 2 |
                  </code>
                  <span className="text-red-500 mt-1 block font-bold">*ต้องมีบรรทัดว่างก่อนตารางเสมอ*</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {submitError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{submitError}</p>
            </div>
          )}

          {/* Question Content Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-github-text-primary">
              รายละเอียดคำถาม (Question Detail) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3 items-start">
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-500 font-mono whitespace-nowrap mt-0.5">
                {previewNumber}
              </div>
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onInput={() => adjustHeight(contentRef.current)} // Force resize on input
                placeholder="พิมพ์รายละเอียดคำถามที่นี่..."
                rows={1}
                className="flex-1 px-4 py-2 border border-blue-200 dark:border-blue-900 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-github-bg-tertiary text-github-text-primary resize-none overflow-hidden"
                autoFocus
                style={{ minHeight: '100px' }}
              />
            </div>
          </div>

          {/* Answer Key Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-github-text-primary flex justify-between items-center">
              <span>เฉลยคำตอบ (Answer Key) <span className="text-gray-400 text-xs font-normal">(สำหรับผู้ตรวจ)</span></span>
              <button
                type="button"
                onClick={insertTableTemplate}
                className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-600 font-normal transition-colors"
              >
                <Table className="w-3 h-3" />
                แทรกตาราง (Insert Table)
              </button>
            </label>
            <textarea
              ref={answerKeyRef}
              value={answerKey}
              onChange={(e) => setAnswerKey(e.target.value)}
              onInput={() => adjustHeight(answerKeyRef.current)} // Force resize on input
              placeholder="พิมพ์คำตอบที่ถูกต้องที่นี่..."
              rows={1}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-github-bg-tertiary text-github-text-primary resize-none overflow-hidden"
              style={{ minHeight: '80px' }}
            />
          </div>

          {/* Reference Selector (QA Feature) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-github-text-primary">
                <BookOpen className="w-4 h-4 text-blue-500" />
                อ้างอิงจาก (Linked References)
              </label>
              <span className="text-xs text-gray-500">
                {selectedRefs.size} selected
              </span>
            </div>

            <div className="bg-gray-50 dark:bg-github-bg-tertiary rounded-lg border border-gray-200 dark:border-github-border-primary p-4 max-h-48 overflow-y-auto">
              {loading ? (
                <p className="text-center text-gray-500 py-4">Loading references...</p>
              ) : availableRefs.length === 0 ? (
                <div className="text-center py-4 space-y-2">
                  <p className="text-gray-500">ยังไม่มีเอกสารอ้างอิงในหมวดนี้</p>
                  <p className="text-xs text-orange-500 cursor-help" title="กรุณาเพิ่ม Reference ที่กล่องด้านบนก่อนสร้างคำถาม">
                    ⚠️ กรุณาเพิ่ม Reference ก่อน
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {availableRefs.map((ref) => {
                    const isSelected = selectedRefs.has(ref.reference.id);
                    const pageValue = selectedRefs.get(ref.reference.id) || '-';

                    return (
                      <div
                        key={ref.id}
                        className={`
                            flex flex-col p-2 rounded-md border transition-all
                            ${isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm'
                            : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                          }
                          `}
                      >
                        {/* Header Row: Checkbox + Title + Code */}
                        <div
                          className="flex items-center cursor-pointer"
                          onClick={() => toggleReference(ref.reference.id)}
                        >
                          <div className={`
                                w-5 h-5 rounded border mr-3 flex items-center justify-center transition-colors flex-shrink-0
                                ${isSelected
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'border-gray-300 dark:border-gray-600'
                            }
                              `}>
                            {isSelected && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>

                          <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="font-mono text-xs font-bold text-gray-500 min-w-[1.2rem]">
                                {ref.thai_letter}.
                              </span>
                              <span className={`text-sm truncate ${isSelected ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                {ref.reference.title}
                              </span>
                            </div>
                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">
                              {ref.reference.code}
                            </span>
                          </div>
                        </div>

                        {/* Page Input Row (Only if selected) */}
                        {isSelected && (
                          <div className="mt-2 ml-8 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="text-xs text-gray-500 whitespace-nowrap">
                              Page / Location:
                            </label>
                            <input
                              type="text"
                              value={pageValue}
                              onChange={(e) => updateReferencePage(ref.reference.id, e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
                              placeholder="e.g. 1-35 or -"
                              onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking input
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedRefs.size === 0 && availableRefs.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10 p-2 rounded">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  คำแนะนำ: ควรเลือก Reference อย่างน้อย 1 รายการ เพื่อการตรวจสอบคุณภาพ (QA)
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-github-border-primary flex justify-end gap-3 bg-gray-50 dark:bg-github-bg-tertiary rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md transition-all shadow-sm"
          >
            ยกเลิก (Cancel)
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? 'กำลังบันทึก...' : (
              <>
                <Save className="w-4 h-4" />
                บันทึกคำถาม (Save Question)
              </>
            )}
          </button>
        </div>

      </div>
    </div >
  );
};

export default AddQuestionModal;
