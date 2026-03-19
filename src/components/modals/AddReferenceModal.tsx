import { invoke } from '@tauri-apps/api/tauri';
import { BookOpen, Edit, FileText, Lock, Plus, Search, Shield, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from './ConfirmModal';

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
  const [newCategory, setNewCategory] = useState('');
  const [newClassification, setNewClassification] = useState('Unclassified');
  const [newFilePath, setNewFilePath] = useState('');
  const [creating, setCreating] = useState(false);
  const [refToDelete, setRefToDelete] = useState<DocumentReference | null>(null);
  const { showError } = useToast();

  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [existingRefs, setExistingRefs] = useState<number[]>([]);
  const [addingMany, setAddingMany] = useState(false);

  // ... (unchanged code) ...

  // ... (unchanged code) ...

  // Preview code logic
  const previewCode = useMemo(() => {
    if (newCode.trim()) return null;
    if (!newCategory) return 'REF-0XXX';

    const catMap: Record<string, string> = { 'MANUAL': 'MN', 'PROC': 'PR', 'TM': 'TM', 'SAFETY': 'SF', 'DIAGRAM': 'DG', 'OTHER': 'OT', 'LINK': 'LN' };
    const classMap: Record<string, string> = { 'Unclassified': '0', 'Restricted': '1', 'Confidential': '2', 'Secret': '3' };

    const prefix = catMap[newCategory] || 'OT';
    const digit = classMap[newClassification] || '0';
    return `${prefix}-${digit}XXX`;
  }, [newCode, newCategory, newClassification]);

  useEffect(() => {
    if (isOpen && activeTab === 'search') {
      loadAllReferences();
      loadCommonReferences();
      loadSectionReferences();
      setSelectedIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);

  const loadSectionReferences = async () => {
    try {
      const refs = await invoke<any[]>('get_section_references', { sectionId });
      setExistingRefs(refs.map(r => r.reference.id));
    } catch (err) {
      console.error('Failed to load section references:', err);
    }
  };

  const loadAllReferences = async () => {
    try {
      const refs = await invoke<DocumentReference[]>('get_references', {
        search: null,
        category: null,
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
      const catMap: Record<string, string> = { 'MANUAL': 'MN', 'PROC': 'PR', 'TM': 'TM', 'SAFETY': 'SF', 'DIAGRAM': 'DG', 'OTHER': 'OT', 'LINK': 'LN' };
      const prefix = catMap[typeFilter] || typeFilter;
      filtered = filtered.filter(ref =>
        ref.code.startsWith(prefix + '-')
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
          .filter(r => {
            const catMap: Record<string, string> = { 'MANUAL': 'MN', 'PROC': 'PR', 'TM': 'TM', 'SAFETY': 'SF', 'DIAGRAM': 'DG', 'OTHER': 'OT', 'LINK': 'LN' };
            const prefix = catMap[typeFilter] || typeFilter;
            return r.code.startsWith(prefix + '-');
          })
          .map(r => r.code)
      )
    ).sort();
  };

  const handleToggleReference = (refId: number) => {
    if (existingRefs.includes(refId)) return;

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(refId)) {
        next.delete(refId);
      } else {
        next.add(refId);
      }
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      setAddingMany(true);
      setError('');

      // Batch add
      for (const refId of Array.from(selectedIds)) {
        try {
          await invoke('add_section_reference', {
            sectionId,
            referenceId: refId,
            displayOrder: null,
          });
        } catch (err) {
          console.warn(`Failed to add reference ${refId}:`, err);
          // If one fails, we continue with others? Or stop? 
          // Backend checks for existence, so if it's already there it might error.
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to add selected references:', err);
      setError(err.toString());
    } finally {
      setAddingMany(false);
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
          category: newCategory || null,
          classification: newClassification,
          file_path: newFilePath || null,
          reference_type: null,
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
      showError('ไม่สามารถลบได้: ' + err);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setNewCode('');
    setNewTitle('');
    setNewCategory('');
    setNewClassification('Unclassified');
    setNewFilePath('');
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
                    <option value="DIAGRAM">📐 Diagram</option>
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
                        onSelect={handleToggleReference}
                        onDelete={handleDeleteClick}
                        isSelected={selectedIds.has(ref.id)}
                        isAlreadyLinked={existingRefs.includes(ref.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All References / Search Results */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {searchQuery || typeFilter !== 'ALL' || codeFilter !== 'ALL'
                    ? `Search Results(${searchResults.length})`
                    : `All References(${searchResults.length})`}
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
                        onSelect={handleToggleReference}
                        onDelete={handleDeleteClick}
                        isSelected={selectedIds.has(ref.id)}
                        isAlreadyLinked={existingRefs.includes(ref.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
              {/* Cancel Button */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500">
                  {selectedIds.size > 0 && (
                    <span>Selected: <span className="font-bold text-blue-600 dark:text-blue-400">{selectedIds.size}</span> items</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-github-bg-tertiary border border-gray-300 dark:border-github-border-primary rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleAddSelected}
                      disabled={addingMany}
                      className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-md transition-all flex items-center gap-2"
                    >
                      {addingMany ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Add Selected ({selectedIds.size})
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create Tab */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateReference} className="space-y-4">

              {/* Row 1: Metadata (Category, Classification, Code, File) */}
              <div className="flex flex-col md:flex-row gap-3 items-start">

                {/* 1. Category (Width: ~20%) */}
                <div className="w-full md:w-3/12">
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ประเภท (Category) <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <div className="relative group">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onFocus={() => setFocusedField('category')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-github-border-primary rounded-lg bg-white dark:bg-github-bg-tertiary text-github-text-primary focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none transition-all"
                      required
                    >
                      <option value="" disabled>-- เลือก (Select) --</option>
                      <option value="MANUAL">📘 MANUAL</option>
                      <option value="PROC">📋 PROCEDURE (ระเบียบ)</option>
                      <option value="TM">🔧 TECHNICAL MANUAL (คู่มือเทคนิค)</option>
                      <option value="SAFETY">⚠️ SAFETY INSTRUCTION (ความปลอดภัย)</option>
                      <option value="DIAGRAM">📐 DIAGRAM (แบบแปลน)</option>
                      <option value="OTHER">📄 OTHER (อื่นๆ)</option>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    {/* Helper Tooltip */}
                    {focusedField === 'category' && (
                      <div className="absolute left-0 -top-8 bg-blue-600 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap z-10 animate-in fade-in slide-in-from-bottom-1">
                        เลือกประเภทเพื่อสร้างรหัสอ้างอิง
                        <div className="absolute bottom-0 left-4 translate-y-1/2 rotate-45 w-2 h-2 bg-blue-600"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Classification (Width: ~20%) */}
                <div className="w-full md:w-3/12">
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ชั้นความลับ (Class)
                    </label>
                  </div>
                  <div className="relative group">
                    <select
                      value={newClassification}
                      onChange={(e) => {
                        setNewClassification(e.target.value);
                        if (e.target.value === 'Confidential' || e.target.value === 'Secret') setNewFilePath('');
                      }}
                      onFocus={() => setFocusedField('classification')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-github-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none transition-all ${newClassification === 'Confidential' || newClassification === 'Secret' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-white dark:bg-github-bg-tertiary text-github-text-primary'}`}
                    >
                      <option value="Unclassified">1. ไม่กำหนด (Unclassified)</option>
                      <option value="Restricted">2. ปกปิด (Restricted)</option>
                      <option value="Confidential">3. ลับ (Confidential)</option>
                      <option value="Secret">4. ลับมาก (Secret)</option>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      {newClassification === 'Confidential' || newClassification === 'Secret' ? (
                        <Lock className="w-4 h-4 text-red-500" />
                      ) : newClassification === 'Restricted' ? (
                        <Shield className="w-4 h-4 text-blue-500" />
                      ) : (
                        <BookOpen className="w-4 h-4" />
                      )}
                    </div>
                    {/* Helper Tooltip */}
                    {focusedField === 'classification' && (
                      <div className="absolute left-0 -top-8 bg-blue-600 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap z-10 animate-in fade-in slide-in-from-bottom-1">
                        ระดับความลับของเอกสาร
                        <div className="absolute bottom-0 left-4 translate-y-1/2 rotate-45 w-2 h-2 bg-blue-600"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Ref Code Preview (Width: ~15%) - Visual Badge */}
                <div className="w-full md:w-2/12">
                  <div className="mb-1">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      รหัส (Ref Code)
                    </label>
                  </div>
                  <div className="h-[38px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span className={`font-mono font-bold text-sm tracking-wide ${newCategory ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                      {previewCode || '---'}
                    </span>
                  </div>
                </div>

                {/* 4. File Path (Width: ~45%) */}
                <div className="w-full md:w-4/12">
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ไฟล์แนบ (File Path)
                    </label>
                  </div>
                  <div className="relative group">
                    <input
                      type="text"
                      value={newFilePath}
                      onChange={(e) => setNewFilePath(e.target.value)}
                      onFocus={() => setFocusedField('filePath')}
                      onBlur={() => setFocusedField(null)}
                      disabled={newClassification === 'Confidential'}
                      placeholder={newClassification === 'Confidential' ? 'ปิดกั้น (Confidential)' : "C:\\Path\\To\\File.pdf"}
                      className={`w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-github-border-primary rounded-lg text-github-text-primary focus:ring-2 focus:ring-blue-500 shadow-sm transition-all ${newClassification === 'Confidential'
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-github-bg-tertiary'
                        }`}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      {newClassification === 'Confidential' ? <Lock className="w-4 h-4 text-red-400" /> : <FileText className="w-4 h-4" />}
                    </div>

                    {/* Helper Tooltip */}
                    {focusedField === 'filePath' && (
                      <div className="absolute right-0 -top-8 bg-blue-600 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap z-10 animate-in fade-in slide-in-from-bottom-1">
                        {newClassification === 'Confidential' ? 'ไม่สามารถระบุได้สำหรับเอกสารลับ' : 'ระบุที่เก็บไฟล์เพื่อดาวน์โหลด'}
                        <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-blue-600"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Title (Full Width) */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ชื่อเรื่อง (Title) <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-3 pointer-events-none text-gray-400">
                    <Edit className="w-4 h-4" />
                  </div>
                  <textarea
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onFocus={() => setFocusedField('title')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="เช่น คู่มือการใช้งานระบบ Phalanx (ระบุชื่อเอกสารให้ชัดเจน)..."
                    rows={1}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-github-border-primary rounded-lg bg-white dark:bg-github-bg-tertiary text-github-text-primary focus:ring-2 focus:ring-blue-500 shadow-sm min-h-[42px] resize-none overflow-hidden transition-all focus:min-h-[80px]"
                    required
                  />
                  {/* Helper Tooltip */}
                  {focusedField === 'title' && (
                    <div className="absolute left-0 -top-8 bg-blue-600 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap z-10 animate-in fade-in slide-in-from-bottom-1">
                      ระบุชื่อเอกสารให้กระชับและชัดเจน
                      <div className="absolute bottom-0 left-4 translate-y-1/2 rotate-45 w-2 h-2 bg-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-github-border-primary">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      สร้างเอกสาร (Create)
                    </>
                  )}
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
        message={`คุณแน่ใจหรือไม่ที่จะลบเอกสารอ้างอิงนี้ออกจาก "ฐานข้อมูลกลาง" ?\n\n"${refToDelete?.code} - ${refToDelete?.title}"\n\nคำเตือน: การกระทำนี้จะลบการอ้างอิงออกจากเอกสาร PQS ทุกฉบับที่ใช้งานอยู่`}
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
  isSelected?: boolean;
  isAlreadyLinked?: boolean;
}> = ({ reference, onSelect, onDelete, isSelected, isAlreadyLinked }) => {
  return (
    <div className="flex items-center gap-2 group">
      <button
        onClick={() => !isAlreadyLinked && onSelect(reference.id)}
        disabled={isAlreadyLinked}
        className={`flex-1 text-left p-3 border rounded-md transition-colors group flex items-center gap-3 ${isAlreadyLinked
          ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-github-border-primary opacity-60 cursor-not-allowed'
          : isSelected
            ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600'
            : 'border-gray-200 dark:border-github-border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
      >
        <div className="flex-shrink-0">
          {isAlreadyLinked ? (
            <div className="w-5 h-5 flex items-center justify-center text-green-500 bg-green-50 dark:bg-green-900/20 rounded">
              <Shield className="w-3 h-3" />
            </div>
          ) : (
            <div className={`w-5 h-5 border-2 rounded transition-colors flex items-center justify-center ${isSelected
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400'
              }`}>
              {isSelected && <Plus className="w-3.5 h-3.5" />}
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center justify-between gap-4 overflow-hidden">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-github-text-primary'
                }`}>
                {reference.title}
              </span>

              {reference.category && (
                <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded whitespace-nowrap">
                  {reference.category}
                </span>
              )}
              {reference.classification && reference.classification !== 'Unclassified' && (
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${reference.classification === 'Secret' ? 'bg-red-100 text-red-700 border-red-200' :
                  reference.classification === 'Top Secret' ? 'bg-red-600 text-white border-red-700' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                  {reference.classification}
                </span>
              )}
              {isAlreadyLinked && (
                <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-tighter">
                  Already Added
                </span>
              )}
            </div>
          </div>

          <span className="text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 min-w-[80px] text-center whitespace-nowrap">
            {reference.code}
          </span>
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
