import { invoke } from '@tauri-apps/api/tauri';
import React, { useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import AddReferenceModal from '../modals/AddReferenceModal';
import ConfirmModal from '../modals/ConfirmModal';

interface DocumentReference {
  id: number;
  code: string;
  title: string;
  classification: string | null;
  category: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string | null;
}

interface SectionReferenceDetail {
  id: number;
  section_id: number;
  reference: DocumentReference;
  display_order: number;
  thai_letter: string;
}

interface ReferenceManagerProps {
  sectionId: number;
  readOnly?: boolean;
  usageCounts?: Map<number, number>; // Map<ReferenceID, Count>
}

const ReferenceManager: React.FC<ReferenceManagerProps> = ({ sectionId, readOnly = false, usageCounts }) => {
  const { showError } = useToast();
  const [references, setReferences] = useState<SectionReferenceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [refToDelete, setRefToDelete] = useState<SectionReferenceDetail | null>(null);

  useEffect(() => {
    fetchReferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const fetchReferences = async () => {
    try {
      setLoading(true);
      const result = await invoke<SectionReferenceDetail[]>('get_section_references', {
        sectionId,
      });
      setReferences(result);
      setError('');
    } catch (err) {
      console.error('Failed to fetch references:', err);
      setError('Failed to load references');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClick = (ref: SectionReferenceDetail) => {
    setRefToDelete(ref);
  };

  const confirmRemoveReference = async () => {
    if (!refToDelete) return;

    try {
      await invoke('remove_section_reference', { sectionRefId: refToDelete.id });
      await fetchReferences();
      setRefToDelete(null);
    } catch (err) {
      console.error('Failed to remove reference:', err);
      showError('ไม่สามารถลบเอกสารอ้างอิงได้');
    }
  };

  if (loading) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-sm">
        Loading references...
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-github-text-primary">
          เอกสารอ้างอิง (References)
        </h3>
        {!readOnly && (
          <button
            className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center gap-1"
            onClick={() => setModalOpen(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Reference
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {references.length === 0 ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-center text-gray-500 dark:text-gray-400 text-sm">
          ยังไม่มีเอกสารอ้างอิง
        </div>
      ) : (
        <div className="space-y-2">
          {references.map((ref) => (
            <div
              key={ref.id}
              className="group flex items-start justify-between p-3 bg-white dark:bg-github-bg-tertiary border border-gray-200 dark:border-github-border-primary rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex-1 min-w-0"> {/* min-w-0 included for text truncation to work if needed */}
                <div className="flex items-baseline gap-3">
                  <span className="font-semibold text-github-text-primary whitespace-nowrap min-w-[1.5rem]">
                    {ref.thai_letter}.
                  </span>

                  <div className="flex-1 flex items-baseline justify-between gap-4">
                    {/* Title & Category */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-github-text-primary leading-relaxed">
                          {ref.reference.title}
                        </span>

                        {ref.reference.category && (
                          <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded whitespace-nowrap align-middle">
                            {ref.reference.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Usage Status + Reference Code */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Reference Code */}
                      <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-mono rounded whitespace-nowrap border border-gray-200 dark:border-gray-700">
                        {ref.reference.code}
                      </span>

                      {/* QA: Usage Status (Icon Only) */}
                      {usageCounts && (
                        <div
                          className="flex items-center"
                          title={(usageCounts.get(ref.reference.id) || 0) > 0
                            ? `ถูกอ้างอิง ${(usageCounts.get(ref.reference.id))} ครั้ง`
                            : 'ยังไม่ได้ถูกนำไปอ้างอิง (Unused)'}
                        >
                          {(usageCounts.get(ref.reference.id) || 0) > 0 ? (
                            <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-orange-400 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {!readOnly && (
                <button
                  onClick={() => handleRemoveClick(ref)}
                  className="ml-2 p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                  title="Remove reference"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Reference Modal */}
      <AddReferenceModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        sectionId={sectionId}
        onSuccess={fetchReferences}
      />

      <ConfirmModal
        isOpen={!!refToDelete}
        onClose={() => setRefToDelete(null)}
        onConfirm={confirmRemoveReference}
        title="ยืนยันการลบการอ้างอิง"
        message={`คุณต้องการลบเอกสารอ้างอิงนี้ออกจากส่วนนี้ใช่หรือไม่?\n\n"${refToDelete?.reference.code} - ${refToDelete?.reference.title}"\n\n(การลบนี้มีผลเฉพาะส่วนนี้เท่านั้น ไม่กระทบฐานข้อมูลกลาง)`}
        confirmText="ลบออก"
        variant="danger"
      />
    </div>
  );
};

export default ReferenceManager;
