import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import AddReferenceModal from '../modals/AddReferenceModal';

interface DocumentReference {
  id: number;
  code: string;
  title: string;
  short_name: string | null;
  category: string | null;
  is_common: boolean;
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
}

const ReferenceManager: React.FC<ReferenceManagerProps> = ({ sectionId, readOnly = false }) => {
  const [references, setReferences] = useState<SectionReferenceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchReferences();
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

  const handleRemoveReference = async (refId: number) => {
    if (!confirm('ต้องการลบเอกสารอ้างอิงนี้?')) return;

    try {
      await invoke('remove_section_reference', { sectionRefId: refId });
      await fetchReferences();
    } catch (err) {
      console.error('Failed to remove reference:', err);
      alert('ไม่สามารถลบเอกสารอ้างอิงได้');
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
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-github-text-primary">
                    {ref.thai_letter}.
                  </span>
                  <div>
                    <p className="text-github-text-primary">
                      {ref.reference.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-mono rounded">
                        {ref.reference.code}
                      </span>
                      {ref.reference.category && (
                        <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                          {ref.reference.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {!readOnly && (
                <button
                  onClick={() => handleRemoveReference(ref.id)}
                  className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-opacity"
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
    </div>
  );
};

export default ReferenceManager;
