import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { X, Search, Plus, BookOpen } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

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

interface AddReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: number;
  onSuccess: () => void;
}

const AddReferenceModal: React.FC<AddReferenceModalProps> = ({
  isOpen,
  onClose,
  sectionId,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'create'>('search');

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [codeFilter, setCodeFilter] = useState('ALL');
  const [commonRefs, setCommonRefs] = useState<DocumentReference[]>([]);
  const [allRefs, setAllRefs] = useState<DocumentReference[]>([]);

  // Create tab state
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newReferenceType, setNewReferenceType] = useState('MANUAL'); // Default to MANUAL
  const [newIsCommon, setNewIsCommon] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refToDelete, setRefToDelete] = useState<DocumentReference | null>(null);

  const [error, setError] = useState('');

  // ... (unchanged code) ...

  // ... (unchanged code) ...

  // Preview code based on selected type
  const previewCode = newCode.trim() || `${newReferenceType}_XXX`;

  useEffect(() => {
    if (isOpen && activeTab === 'search') {
      loadAllReferences();
      loadCommonReferences();
    }
  }, [isOpen, activeTab]);

  const loadAllReferences = async () => {
    try {
      const refs = await invoke<DocumentReference[]>('get_references', {
        search: null,
        category: null,
        commonOnly: false,
      });
      setAllRefs(refs);
    } catch (err) {
      console.error('Failed to load references:', err);
    }
  };

  const loadCommonReferences = async () => {
    try {
      const refs = await invoke<DocumentReference[]>('get_references', {
        search: null,
        category: null,
        commonOnly: true,
      });
      setCommonRefs(refs);
    } catch (err) {
      console.error('Failed to load common references:', err);
    }
  };

  // Client-side 3-level filtering - MEMOIZED to prevent infinite loops
  const searchResults = useMemo(() => {
    let filtered = [...allRefs];

    // 1. Type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(ref =>
        ref.code.startsWith(typeFilter + '_')
      );
    }

    // 2. Code filter (specific code)
    if (codeFilter !== 'ALL') {
      filtered = filtered.filter(ref => ref.code === codeFilter);
    }

    // 3. Title search (3+ characters)
    if (searchQuery.trim().length >= 3) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ref =>
        ref.title.toLowerCase().includes(query) ||
        ref.code.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [typeFilter, codeFilter, searchQuery, allRefs]);

  // Get unique codes for dropdown
  const getUniqueCodes = () => {
    if (typeFilter === 'ALL') {
      return Array.from(new Set(allRefs.map(r => r.code))).sort();
    }
    return Array.from(
      new Set(
        allRefs
          .filter(r => r.code.startsWith(typeFilter + '_'))
          .map(r => r.code)
      )
    ).sort();
  };

  const handleSelectReference = async (refId: number) => {
    try {
      await invoke('add_section_reference', {
        sectionId,
        referenceId: refId,
        displayOrder: null, // Auto-assign
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to add reference:', err);
      setError(err.toString());
    }
  };

  const handleCreateReference = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTitle.trim()) {
      setError('Title is required');
      return;
    }

    // Send empty string for auto-gen, or custom code
    const finalCode = newCode.trim();

    try {
      setCreating(true);
      setError('');

      const newRef = await invoke<DocumentReference>('create_reference', {
        request: {
          code: finalCode,
          title: newTitle.trim(),
          short_name: null,
          category: null, // Removed field - type is used instead
          is_common: newIsCommon,
          reference_type: newReferenceType || null,
        },
      });

      // Link to section
      await invoke('add_section_reference', {
        sectionId,
        referenceId: newRef.id,
        displayOrder: null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create reference:', err);
      setError(err.toString());
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (ref: DocumentReference) => {
    setRefToDelete(ref);
  };

  const confirmDeleteReference = async () => {
    if (!refToDelete) return;
    try {
      await invoke('delete_reference', { id: refToDelete.id });
      loadAllReferences();
      loadCommonReferences();
      setRefToDelete(null);
    } catch (err: any) {
      alert('Failed to delete: ' + err);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setNewCode('');
    setNewTitle('');
    setNewReferenceType('MANUAL');
    setNewIsCommon(false);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-github-bg-secondary rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-github-border-primary">
          <h2 className="text-xl font-semibold text-github-text-primary flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Add Reference
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-github-border-primary">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'search'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Search Existing
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'create'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create New
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              {/* Filter Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                {/* Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setCodeFilter('ALL');
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-tertiary text-github-text-primary focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Types</option>
                    <option value="MANUAL">📘 Manual</option>
                    <option value="PROC">📋 Procedure</option>
                    <option value="TM">🔧 Technical Manual</option>
                    <option value="SAFETY">⚠️ Safety</option>
                    <option value="LINK">🔗 Link</option>
                    <option value="OTHER">📄 Other</option>
                  </select>
                </div>

                {/* Code Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Reference Code
                  </label>
                  <select
                    value={codeFilter}
                    onChange={(e) => setCodeFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-tertiary text-github-text-primary focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Codes</option>
                    {getUniqueCodes().map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title (3+ characters)..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-tertiary text-github-text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>


              {/* Common References - show only when NO filters */}
              {typeFilter === 'ALL' && codeFilter === 'ALL' && !searchQuery && commonRefs.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <span className="text-yellow-500">★</span> Common References
                  </h3>
                  <div className="space-y-2">
                    {commonRefs.map((ref) => (
                      <ReferenceItem
                        key={`common-${ref.id}`}
                        reference={ref}
                        onSelect={handleSelectReference}
                        onDelete={handleDeleteClick}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All References / Search Results */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {searchQuery || typeFilter !== 'ALL' || codeFilter !== 'ALL'
                    ? `Search Results (${searchResults.length})`
                    : `All References (${searchResults.length})`}
                </h3>
                {searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No references found. Try different filters or create a new one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Filter out common refs from main list to avoid duplication if no search active? 
                        Optional, but cleaner. For now show all is safer. */}
                    {searchResults.map((ref) => (
                      <ReferenceItem
                        key={ref.id}
                        reference={ref}
                        onSelect={handleSelectReference}
                        onDelete={handleDeleteClick}
                      />
                    ))}
                  </div>
                )}
              </div>
              {/* Cancel Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-github-bg-tertiary border border-gray-300 dark:border-github-border-primary rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Create Tab */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateReference} className="space-y-4">
              {/* Reference Type - First */}
              <div>
                <label className="block text-sm font-medium text-github-text-primary mb-2">
                  Reference Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newReferenceType}
                  onChange={(e) => setNewReferenceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-tertiary text-github-text-primary focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="MANUAL">📘 Manual (คู่มือ)</option>
                  <option value="PROC">📋 Procedure (ขั้นตอน)</option>
                  <option value="TM">🔧 Technical Manual (คู่มือเทคนิค)</option>
                  <option value="SAFETY">⚠️ Safety Document (เอกสารความปลอดภัย)</option>
                  <option value="LINK">🔗 Web Link (ลิงก์)</option>
                  <option value="OTHER">📄 Other (อื่นๆ)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Code will be: <span className="font-mono font-semibold">{newReferenceType}_XXX</span>
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-github-text-primary mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. NAVSEA OP4154 Vol.1 Pt.1 Operator's Manual for CIWS Phalanx"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-tertiary text-github-text-primary focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Full title of the reference document</p>
              </div>

              {/* Code - Optional with Auto-Gen */}
              <div>
                <label className="block text-sm font-medium text-github-text-primary mb-2">
                  Reference Code <span className="text-xs text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-github-border-primary rounded-md bg-white dark:bg-github-bg-tertiary text-github-text-primary focus:ring-2 focus:ring-blue-500"
                />
                {previewCode && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 Code will be: <span className="font-mono font-semibold">{previewCode}</span>
                    </p>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {newCode.trim() ? 'Custom code (must be unique)' : `Sequential: ${newReferenceType}_001, ${newReferenceType}_002...`}
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isCommon"
                  checked={newIsCommon}
                  onChange={(e) => setNewIsCommon(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="isCommon" className="ml-2 text-sm text-github-text-primary">
                  Mark as common reference (suggest in future searches)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-github-border-primary">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create & Add'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!refToDelete}
        onClose={() => setRefToDelete(null)}
        onConfirm={confirmDeleteReference}
        title="ลบเอกสารจากฐานข้อมูล"
        message={`คุณแน่ใจหรือไม่ที่จะลบเอกสารอ้างอิงนี้ออกจาก "ฐานข้อมูลกลาง"?\n\n"${refToDelete?.code} - ${refToDelete?.title}"\n\nคำเตือน: การกระทำนี้จะลบการอ้างอิงออกจากเอกสาร PQS ทุกฉบับที่ใช้งานอยู่`}
        confirmText="ลบถาวร"
        variant="danger"
      />
    </div>
  );
};

// Helper component for reference item
const ReferenceItem: React.FC<{
  reference: DocumentReference;
  onSelect: (id: number) => void;
  onDelete?: (ref: DocumentReference) => void;
}> = ({ reference, onSelect, onDelete }) => {
  return (
    <div className="flex items-center gap-2 group">
      <button
        onClick={() => onSelect(reference.id)}
        className="flex-1 text-left p-3 border border-gray-200 dark:border-github-border-primary rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3 overflow-hidden">
            {/* Title & Badges - LEFT */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-github-text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                  {reference.title}
                </span>

                {reference.category && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded whitespace-nowrap">
                    {reference.category}
                  </span>
                )}
                {reference.is_common && (
                  <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded whitespace-nowrap">★ Common</span>
                )}
              </div>
            </div>

            {/* Code - RIGHT */}
            <span className="text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 min-w-[80px] text-center whitespace-nowrap">
              {reference.code}
            </span>
          </div>

          <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0" />
        </div>
      </button>

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(reference);
          }}
          className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 rounded-md transition-colors"
          title="Delete from database"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default AddReferenceModal;
