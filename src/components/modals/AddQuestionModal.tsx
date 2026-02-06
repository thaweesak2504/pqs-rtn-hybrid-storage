import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { X, BookOpen, Save, AlertCircle } from 'lucide-react';
import { QuestionDetail } from '../../types/content'; // Ensure this import exists

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
  // State for references with pages: Map<ReferenceID, PageString>
  const [selectedRefs, setSelectedRefs] = useState<Map<number, string>>(new Map());
  const [availableRefs, setAvailableRefs] = useState<SectionReferenceDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Helper to convert to Thai numerals
  const toThaiNumber = (num: string | number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => {
      const parsed = parseInt(d);
      return !isNaN(parsed) && parsed >= 0 && parsed <= 9 ? thaiDigits[parsed] : d;
    }).join('');
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
    if (isOpen) {
      loadReferences();

      if (initialData) {
        // Edit Mode: Pre-fill data
        // 1. Content: Try to strip prefix to let user edit just the text
        // Prefix format: "ThaiSection.ThaiSeq "
        // We construct the expected prefix to strip it
        const thaiNum = toThaiNumber(sectionNumber);
        const thaiSeqInit = toThaiNumber(initialData.sequence);
        const prefix = `${thaiNum}.${thaiSeqInit} `;

        // Debug logging
        console.log('Edit Mode - Initial Data:', initialData);
        if (initialData.references) {
          console.log('Initial References:', initialData.references);
        }

        let loadedContent = initialData.content;
        if (loadedContent.startsWith(prefix)) {
          loadedContent = loadedContent.slice(prefix.length);
        }
        if (initialData.metadata) {
          try {
            const meta = JSON.parse(initialData.metadata);
            if (meta.answerKey) {
              setAnswerKey(meta.answerKey);
            }
          } catch (e) { console.error('Error parsing metadata', e); }
        }
        setContent(loadedContent);

        // 2. References
        const newMap = new Map<number, string>();
        if (initialData.references) {
          initialData.references.forEach(ref => {
            // ref is SectionReferenceDetail, but we need DocumentReference ID for the map key?
            // Wait, initialData.references type in QuestionDetail might be different?
            // Let's check type. QuestionDetail references is SectionReferenceDetail[] usually.
            // In QuestionDetail interface: references?: SectionReferenceDetail[];
            // SectionReferenceDetail has { id, reference: { id, ... }, ... }
            // The Map key is document_reference id (reference.id).
            // Debug ref item
            console.log('Processing Ref:', ref);
            if (ref.reference && ref.reference.id) {
              console.log('Adding to map:', ref.reference.id, ref.location_text);
              newMap.set(ref.reference.id, ref.location_text || '-');
            } else {
              console.warn('Ref missing reference or id:', ref);
            }
          });
        }
        console.log('Final Selected Refs Map:', newMap);
        setSelectedRefs(newMap);

      } else {
        // Create Mode
        setContent('');
        setAnswerKey('');
        setSelectedRefs(new Map());
      }
    }
  }, [isOpen, sectionId, initialData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSaving(true);

      const referencesMeta = Array.from(selectedRefs.entries()).map(([id, page]) => ({
        id,
        page
      }));

      const metadata = {
        references: referencesMeta,
        answerKey: answerKey.trim() || null
      };

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

        await invoke('create_question', {
          args: {
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

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save question:', err);
      alert('Failed to save question');
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
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

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
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="พิมพ์รายละเอียดคำถามที่นี่..."
                rows={4}
                className="flex-1 px-4 py-2 border border-blue-200 dark:border-blue-900 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-github-bg-tertiary text-github-text-primary resize-none"
                autoFocus
              />
            </div>
          </div>

          {/* Answer Key Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-github-text-primary">
              เฉลยคำตอบ (Answer Key) <span className="text-gray-400 text-xs font-normal">(สำหรับผู้ตรวจ)</span>
            </label>
            <textarea
              value={answerKey}
              onChange={(e) => setAnswerKey(e.target.value)}
              placeholder="พิมพ์คำตอบที่ถูกต้องที่นี่..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-github-bg-tertiary text-github-text-primary resize-none"
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
