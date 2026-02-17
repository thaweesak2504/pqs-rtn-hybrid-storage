import { open as openDialog } from '@tauri-apps/api/dialog';
import { join } from '@tauri-apps/api/path';
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri';
import { Book, CheckCircle, Edit, FileDigit, FileText, FolderOpen, Globe, Image, Lock, Mic, Plus, Save, Search, Shield, Trash2, Video, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import ConfirmModal from '../modals/ConfirmModal';
import ImagePreviewModal from '../modals/ImagePreviewModal';
import Button from '../ui/Button';


// Types
export interface ReferenceDoc {
  id: string; // The Link ID (SectionReference ID)
  reference_id?: number; // The actual Reference ID (for updates)
  code: string;
  title: string;
  category: string;
  classification: string;
  resource_type: string; // DOCUMENT, WEBLINK, VIDEO, IMAGE, AUDIO, TEMPLATE
  file_path: string;
  description?: string;
  usage_count?: number; // Added usage_count
}

interface PqsReferenceSectionProps {
  references: ReferenceDoc[];
  onAdd: (ref: Omit<ReferenceDoc, 'id'>) => void;
  onEdit: (ref: ReferenceDoc) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
  compact?: boolean;
  sectionId?: number;
  docId?: string; // NEW: Pass Document ID for folder organization (e.g., "100")
  sectionNumber?: string;
  onRefresh?: () => void;
}

const PqsReferenceSection: React.FC<PqsReferenceSectionProps> = ({
  references,
  onAdd,
  onEdit,
  onDelete,
  readOnly = false,
  compact = false,
  sectionId,
  sectionNumber = '100',
  onRefresh
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'idle' | 'create' | 'search'>('idle');

  // Helper to close all forms
  const resetForms = () => {
    setEditingId(null);
    setActiveMode('idle');
  };

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
    variant: 'danger'
  });

  const handleStartCreate = () => {
    resetForms();
    setActiveMode('create');
  };

  const [selectedRefImage, setSelectedRefImage] = useState<string | null>(null);
  const [isRefImageModalOpen, setIsRefImageModalOpen] = useState(false);

  const handleStartSearch = () => {
    resetForms();
    setActiveMode('search');
  };

  const handleStartEdit = (id: string) => {
    resetForms();
    setEditingId(id);
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการนำออก',
      message: 'คุณต้องการนำเอกสารอ้างอิงนี้ออกจากการเชื่อมโยงใช่หรือไม่?\n\n(เอกสารจะถูกนำออกจากรายการของหัวข้อนี้เท่านั้น แต่ยังคงอยู่ในระบบหลัก)',
      onConfirm: () => onDelete(id),
      variant: 'warning'
    });
  };



  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`p-2 rounded-lg ${sectionNumber.startsWith('2') ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
              sectionNumber.startsWith('3') ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                sectionNumber.startsWith('1') ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                  'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              }`}>
              <Book className="w-6 h-6" />
            </div>
            {references.length > 0 && (
              <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border shadow-sm backdrop-blur-sm ${sectionNumber.startsWith('2') ? 'bg-orange-50/80 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800' :
                  sectionNumber.startsWith('3') ? 'bg-purple-50/80 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800' :
                    sectionNumber.startsWith('1') ? 'bg-green-50/80 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' :
                      'bg-blue-50/80 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                }`}>
                {references.length}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">เอกสารอ้างอิง</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Reference Documents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && activeMode === 'idle' && !editingId && (
            <Button
              variant="primary"
              size="small"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleStartSearch}
            >
              เพิ่มเอกสาร
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Toggle Switch inside form area if active - Right Aligned */}
        {activeMode !== 'idle' && (
          <div className="flex justify-end mb-2 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-full max-w-[320px]">
              <button
                onClick={handleStartSearch}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${activeMode === 'search'
                  ? (sectionNumber.startsWith('2') ? 'bg-orange-600 text-white shadow-md' :
                    sectionNumber.startsWith('3') ? 'bg-purple-600 text-white shadow-md' :
                      sectionNumber.startsWith('1') ? 'bg-green-600 text-white shadow-md' :
                        'bg-blue-600 text-white shadow-md')
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                <Search className="w-3.5 h-3.5" /> ค้นหาเอกสารที่มีอยู่
              </button>
              <button
                onClick={handleStartCreate}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${activeMode === 'create'
                  ? (sectionNumber.startsWith('2') ? 'bg-orange-600 text-white shadow-md' :
                    sectionNumber.startsWith('3') ? 'bg-purple-600 text-white shadow-md' :
                      sectionNumber.startsWith('1') ? 'bg-green-600 text-white shadow-md' :
                        'bg-blue-600 text-white shadow-md')
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                <Plus className="w-3.5 h-3.5" /> สร้างเอกสารใหม่
              </button>
            </div>
          </div>
        )}

        {/* Search Card */}
        {activeMode === 'search' && sectionId && (
          <ReferenceSearchCard
            sectionId={sectionId}
            existingReferenceIds={references.map(r => r.reference_id).filter((id): id is number => !!id)}
            onSuccess={() => {
              onRefresh?.();
              resetForms();
            }}
            onCancel={resetForms}
          />
        )}

        {/* Creation Form Card */}
        {activeMode === 'create' && (
          <ReferenceFormCard
            onSave={(data) => {
              onAdd(data);
              setActiveMode('idle');
            }}
            onCancel={() => setActiveMode('idle')}
          />
        )}

        {/* Reference List */}
        <div className="flex flex-col gap-2">
          {references.map((ref, index) => (
            editingId === ref.id ? (
              <ReferenceFormCard
                key={ref.id}
                initialData={ref}
                onSave={(data) => {
                  onEdit({ ...ref, ...data });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ReferenceDisplayCard
                key={ref.id}
                data={ref}
                index={index}
                readOnly={readOnly}
                compact={compact}
                onEdit={() => handleStartEdit(ref.id)}
                onDelete={() => handleDelete(ref.id)}
                onImageClick={(src) => {
                  setSelectedRefImage(src);
                  setIsRefImageModalOpen(true);
                }}
              />
            )
          ))}
        </div>

        {/* Empty State */}
        {activeMode === 'idle' && references.length === 0 && (
          <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={!readOnly ? handleStartSearch : undefined}>
            <Book className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-medium">No references added yet.</p>
            {!readOnly && <p className="text-xs text-blue-500 mt-1">Click to search or add</p>}
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

      <ImagePreviewModal
        isOpen={isRefImageModalOpen}
        onClose={() => setIsRefImageModalOpen(false)}
        imageSrc={selectedRefImage || ''}
      />
    </div>
  );
};

/**
 * Inline Search Card
 * Adheres to inline editing principle, providing a searchable list within the content area.
 */
const ReferenceSearchCard: React.FC<{
  sectionId: number;
  existingReferenceIds: number[];
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ sectionId, existingReferenceIds, onSuccess, onCancel }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [allRefs, setAllRefs] = useState<DocumentReference[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Load all references from DB
  useEffect(() => {
    const load = async () => {
      try {
        const refs = await invoke<DocumentReference[]>('get_references', { search: null, category: null });
        setAllRefs(refs);
      } catch (err) {
        console.error("Failed to load refs:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter out existing references and apply search query + type filter
  const filteredResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return allRefs.filter(ref => {
      // 1. MUST NOT be already linked
      if (existingReferenceIds.includes(ref.id)) return false;

      // 2. Category filter
      if (typeFilter !== 'ALL' && ref.category !== typeFilter) return false;

      // 3. MUST match search query if provided (title or code)
      if (query.length > 0) {
        return ref.title.toLowerCase().includes(query) || ref.code.toLowerCase().includes(query);
      }

      return true; // Show all if no query
    });
  }, [allRefs, existingReferenceIds, searchQuery, typeFilter]);

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
    variant: 'danger'
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteMaster = (e: React.MouseEvent, id: number, code: string) => {
    e.stopPropagation(); // Don't toggle selection
    setConfirmModal({
      isOpen: true,
      title: 'ลบเอกสารหลักถาวร',
      message: `⚠️ คุณต้องการลบเอกสารรหัส "${code}" ออกจากระบบถาวรใช่หรือไม่?\n\n(การกระทำนี้จะทำให้เอกสารนี้หายไปจากทุกหมวดหมู่ที่เคยเชื่อมโยงไว้ และไม่สามารถกู้คืนได้)`,
      onConfirm: async () => {
        try {
          await invoke('delete_reference', { id });
          // Refresh local list
          const refs = await invoke<DocumentReference[]>('get_references', { search: null, category: null });
          setAllRefs(refs);
          // Clear from selection if it was selected
          setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        } catch (err) {
          console.error("Failed to delete master ref:", err);
          alert("ไม่สามารถลบเอกสารหลักได้: " + err);
        }
      },
      variant: 'danger'
    });
  };

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return;
    setAdding(true);
    try {
      for (const refId of Array.from(selectedIds)) {
        await invoke('add_section_reference', {
          sectionId,
          referenceId: refId,
          displayOrder: null
        });
      }
      onSuccess();
    } catch (err) {
      console.error("Failed to batch add references:", err);
      alert("Error adding references: " + err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border-2 border-blue-400 dark:border-blue-600 rounded-xl p-4 shadow-lg animate-in zoom-in-95 duration-200">
      <div className="space-y-4">
        {/* Search & Filter Area */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100"
              placeholder="ค้นหาตามรหัส หรือ ชื่อเอกสาร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="sm:w-1/3">
            <select
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100 appearance-none"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">ทุกหมวดหมู่ (ALL)</option>
              <option value="MANUAL">📘 MANUAL</option>
              <option value="PROC">📋 PROCEDURE</option>
              <option value="TM">🔧 TECH MANUAL</option>
              <option value="SAFETY">⚠️ SAFETY</option>
              <option value="DIAGRAM">📐 DIAGRAM</option>
              <option value="OTHER">📄 OTHER</option>
            </select>
          </div>
        </div>

        {/* Results Area */}
        <div className="max-h-[250px] overflow-y-auto pr-2 custom-scrollbar border border-slate-100 dark:border-slate-700/50 rounded-lg p-1">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">กำลังโหลดข้อมูล...</div>
          ) : filteredResults.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm italic">
              {searchQuery ? 'ไม่พบเอกสารตามที่ค้นหา' : 'ไม่มีเอกสารใหม่ให้เลือก (เอกสารทั้งหมดถูกเพิ่มแล้ว)'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredResults.map(ref => (
                <div
                  key={ref.id}
                  onClick={() => toggleSelect(ref.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-md transition-all text-left cursor-pointer ${selectedIds.has(ref.id) ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      toggleSelect(ref.id);
                    }
                  }}
                >
                  <div className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${selectedIds.has(ref.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                    {selectedIds.has(ref.id) ? <CheckCircle className="w-3.5 h-3.5" /> :
                      ref.resource_type === 'WEBLINK' ? <Globe className="w-3.5 h-3.5 text-emerald-500" /> :
                        ref.resource_type === 'VIDEO' ? <Video className="w-3.5 h-3.5 text-purple-500" /> :
                          ref.resource_type === 'IMAGE' ? <Image className="w-3.5 h-3.5 text-blue-500" /> :
                            ref.resource_type === 'AUDIO' ? <Mic className="w-3.5 h-3.5 text-orange-500" /> :
                              ref.resource_type === 'TEMPLATE' ? <FileDigit className="w-3.5 h-3.5 text-slate-500" /> :
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded shrink-0">
                          {ref.code}
                        </span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={ref.title}>{ref.title}</span>
                      </div>

                      {/* Trash Icon for Global Delete */}
                      <button
                        onClick={(e) => handleDeleteMaster(e, ref.id, ref.code)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        title="ลบออกจากระบบถาวร"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700/50">
          <div className="text-xs text-slate-500">
            {selectedIds.size > 0 && <span>เลือกแล้ว <span className="font-bold text-blue-600">{selectedIds.size}</span> เล่ม</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="small" onClick={onCancel}>ยกเลิก</Button>
            <Button
              variant="primary"
              size="small"
              disabled={selectedIds.size === 0 || adding}
              onClick={handleAddSelected}
              icon={adding ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            >
              {adding ? 'กำลังบันทึก...' : `เพิ่มที่เลือก (${selectedIds.size})`}
            </Button>
          </div>
        </div>
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

interface DocumentReference {
  id: number;
  code: string;
  title: string;
  classification: string | null;
  category: string | null;
  resource_type: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string | null;
}

// --- Sub-Components ---

/**
 * Editable Form Card (Used for both Create and Edit)
 */
const ReferenceFormCard: React.FC<{
  initialData?: ReferenceDoc;
  onSave: (data: Omit<ReferenceDoc, 'id'>) => void;
  onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    title: initialData?.title || '',
    category: initialData?.category || '',
    classification: initialData?.classification || 'Unclassified',
    resource_type: initialData?.resource_type || 'DOCUMENT',
    file_path: initialData?.file_path || ''
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBrowse = async () => {
    try {
      // Define extensions based on resource type
      let extensions: string[] = [];
      if (formData.resource_type === 'DOCUMENT' || formData.resource_type === 'TEMPLATE') {
        extensions = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'txt', 'html'];
      } else if (formData.resource_type === 'VIDEO') {
        extensions = ['mp4', 'mov', 'avi', 'mkv'];
      } else if (formData.resource_type === 'IMAGE') {
        extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      } else if (formData.resource_type === 'AUDIO') {
        extensions = ['mp3', 'wav', 'ogg', 'm4a'];
      }

      const selected = await openDialog({
        multiple: false,
        filters: extensions.length > 0 ? [{ name: formData.resource_type, extensions }] : undefined
      });

      if (selected && typeof selected === 'string') {
        handleChange('file_path', selected);
      }
    } catch (err) {
      console.error("Failed to open file dialog:", err);
    }
  };

  const handleSave = () => {
    if (!formData.title.trim()) return;
    onSave(formData);
  };

  // Auto-Update Code on Category/Class Change (Smart Sequence)
   
  useEffect(() => {
    if (!formData.category) return;

    // If editing: Only auto-update if Category or Classification actually changed from initial
    if (initialData &&
      initialData.category === formData.category &&
      initialData.classification === formData.classification) {
      return;
    }

    const updateSeq = async () => {
      const catMap: Record<string, string> = { 'MANUAL': 'MN', 'PROC': 'PR', 'TM': 'TM', 'SAFETY': 'SF', 'DIAGRAM': 'DG', 'OTHER': 'OT' };
      const classMap: Record<string, string> = { 'Unclassified': '0', 'Restricted': '1', 'Confidential': '2', 'Secret': '3' };

      const newPrefix = catMap[formData.category] || 'OT';
      const newDigit = classMap[formData.classification] || '0';
      const prefixPattern = `${newPrefix}-${newDigit}`;

      try {
        // Fetch all refs matching this prefix to find max sequence
        const existingRefs = await invoke<DocumentReference[]>('get_references', {
          search: prefixPattern,
          category: formData.category
        });

        let maxSeq = 0;
        existingRefs.forEach(ref => {
          // Match digits after the prefix-digit part (supports 3 or 4 digits for transition)
          const m = ref.code.match(/-(\d)(\d+)$/);
          if (m && m[1] === newDigit) {
            const seq = parseInt(m[2], 10);
            if (seq > maxSeq) maxSeq = seq;
          }
        });

        const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
        const newCode = `${newPrefix}-${newDigit}${nextSeq}`;

        if (newCode !== formData.code) {
          handleChange('code', newCode);
        }
      } catch (err) {
        console.error("Failed to fetch sequence:", err);
        // Fallback to placeholder if error
        handleChange('code', `${newPrefix}-${newDigit}XXXX`);
      }
    };

    updateSeq();
  }, [formData.category, formData.classification]);

  return (
    <div className="bg-white dark:bg-slate-800 border-2 border-blue-400 dark:border-blue-600 rounded-xl p-4 shadow-lg animate-in zoom-in-95 duration-200">
      <div className="space-y-3">

        {/* Row 1: Metadata (Category | Class | Code | File) */}
        <div className="flex flex-col sm:flex-row gap-2">

          {/* 1. Category */}
          <div className="relative w-full sm:w-3/12 group">
            <label className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5 block">
              ประเภท (Category)
            </label>
            <div className="relative">
              <select
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100 appearance-none"
                value={formData.category}
                onChange={e => handleChange('category', e.target.value)}
                onFocus={() => setFocusedField('category')}
                onBlur={() => setFocusedField(null)}
              >
                <option value="" disabled>-- Select --</option>
                <option value="MANUAL">📘 MANUAL</option>
                <option value="PROC">📋 PROCEDURE (ระเบียบ)</option>
                <option value="TM">🔧 TECHNICAL MANUAL (คู่มือเทคนิค)</option>
                <option value="SAFETY">⚠️ SAFETY INSTRUCTION (ความปลอดภัย)</option>
                <option value="DIAGRAM">📐 DIAGRAM (แบบแปลน)</option>
                <option value="OTHER">📄 OTHER (อื่นๆ)</option>
              </select>
              <Book className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {focusedField === 'category' && (
              <div className="absolute left-0 -top-6 bg-blue-600 text-white text-[10px] py-0.5 px-2 rounded shadow whitespace-nowrap z-20 animate-in fade-in">
                เลือกประเภทเอกสาร
              </div>
            )}
          </div>

          {/* 2. Classification */}
          <div className="relative w-full sm:w-3/12 group">
            <label className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5 block">
              ชั้นความลับ (Class)
            </label>
            <div className="relative">
              <select
                className={`w-full pl-7 pr-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500 outline-none appearance-none ${formData.classification === 'Confidential' || formData.classification === 'Secret' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100'}`}
                value={formData.classification}
                onChange={e => {
                  handleChange('classification', e.target.value);
                  if (e.target.value === 'Confidential' || e.target.value === 'Secret') handleChange('file_path', '');
                }}
              >
                <option value="Unclassified">1. ไม่กำหนด (Unclassified)</option>
                <option value="Restricted">2. ปกปิด (Restricted)</option>
                <option value="Confidential">3. ลับ (Confidential)</option>
                <option value="Secret">4. ลับมาก (Secret)</option>
              </select>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                {formData.classification === 'Confidential' || formData.classification === 'Secret' ? <Lock className="w-3.5 h-3.5 text-red-500" /> : formData.classification === 'Restricted' ? <Shield className="w-3.5 h-3.5 text-blue-500" /> : <Book className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>

          {/* 3. Ref Code (Editable) */}
          <div className="relative w-full sm:w-2/12">
            <label className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5 block">
              รหัส (Code)
            </label>
            <div className="relative">
              <input
                className="w-full text-center py-1.5 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.code}
                onChange={e => handleChange('code', e.target.value)}
                placeholder="REF-XXXX"
              />
            </div>
          </div>

          {/* 4. Resource Type */}
          <div className="relative w-full sm:w-2/12 group">
            <label className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5 block">
              รูปแบบ (Resource)
            </label>
            <div className="relative">
              <select
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100 appearance-none"
                value={formData.resource_type}
                onChange={e => handleChange('resource_type', e.target.value)}
              >
                <option value="DOCUMENT">📄 DOC</option>
                <option value="WEBLINK">🌐 WEB</option>
                <option value="VIDEO">🎬 VIDEO</option>
                <option value="IMAGE">🖼️ IMAGE</option>
                <option value="AUDIO">🎵 AUDIO</option>
                <option value="TEMPLATE">🧪 TEMP</option>
              </select>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                {formData.resource_type === 'WEBLINK' ? <Globe className="w-3.5 h-3.5" /> :
                  formData.resource_type === 'VIDEO' ? <Video className="w-3.5 h-3.5" /> :
                    formData.resource_type === 'IMAGE' ? <Image className="w-3.5 h-3.5" /> :
                      formData.resource_type === 'AUDIO' ? <Mic className="w-3.5 h-3.5" /> :
                        formData.resource_type === 'TEMPLATE' ? <FileDigit className="w-3.5 h-3.5" /> :
                          <Book className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>

          {/* 5. File Path */}
          <div className="relative w-full sm:w-3/12 group">
            <label className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5 block">
              ไฟล์/ลิงก์ (Path/URL)
            </label>
            <div className="relative">
              <input
                className={`w-full pl-7 pr-10 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500 outline-none ${formData.classification === 'Confidential'
                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                  }`}
                placeholder={formData.resource_type === 'WEBLINK' ? 'https://...' : formData.classification === 'Confidential' ? 'ปิดกั้น (LOCKED)' : "ลากไฟล์มาวาง หรือ ระบุที่อยู่..."}
                value={formData.file_path}
                onChange={e => handleChange('file_path', e.target.value)}
                disabled={formData.classification === 'Confidential'}
                onFocus={() => setFocusedField('file_path')}
                onBlur={() => setFocusedField(null)}
              />
              <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />

              {/* Browse Button */}
              {formData.resource_type !== 'WEBLINK' && formData.classification !== 'Confidential' && (
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                  title="เลือกไฟล์จากเครื่อง (Browse)"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {focusedField === 'file_path' && (
              <div className="absolute right-0 -top-6 bg-blue-600 text-white text-[10px] py-0.5 px-2 rounded shadow whitespace-nowrap z-20 animate-in fade-in">
                {formData.classification === 'Confidential' ? 'ไม่สามารถแนบไฟล์ได้' : formData.resource_type === 'WEBLINK' ? 'ระบุ URL เว็บไซต์' : 'ระบุที่เก็บไฟล์หรือเลือกไฟล์'}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Title */}
        <div className="relative group">
          <label className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5 block">
            ชื่อเรื่อง (Title) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              className="w-full pl-7 pr-2 py-2 text-sm font-medium bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100"
              placeholder="ระบุชื่อเอกสาร (Title)..."
              value={formData.title}
              onChange={e => handleChange('title', e.target.value)}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
            />
            <Edit className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {focusedField === 'title' && (
            <div className="absolute left-0 -top-6 bg-blue-600 text-white text-[10px] py-0.5 px-2 rounded shadow whitespace-nowrap z-20 animate-in fade-in">
              ระบุชื่อเอกสารให้ชัดเจน
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 mt-1">
          <Button variant="ghost" size="small" onClick={onCancel} icon={<X className="w-3.5 h-3.5" />}>
            ยกเลิก
          </Button>
          <Button variant="primary" size="small" onClick={handleSave} disabled={!formData.title} icon={<Save className="w-3.5 h-3.5" />}>
            บันทึกข้อมูล
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Read-Only Display Card (Single Line Row)
 */
const ReferenceDisplayCard: React.FC<{
  data: ReferenceDoc;
  index: number;
  readOnly?: boolean;
  compact?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onImageClick?: (src: string) => void;
}> = ({ data, index, readOnly, compact, onEdit, onDelete, onImageClick }) => {

  // Convert index to Thai Alphabet (ก., ข., ค., ...)
  const getThaiLetter = (i: number) => {
    const thaiChars = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'];
    if (i < thaiChars.length) return `${thaiChars[i]}.`;
    return `${i + 1}.`; // Fallback for very long lists
  };

  const handleOpenResource = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data.file_path) return;

    // Check if it is an image or explicitly set as IMAGE resource type
    const isImage = data.resource_type === 'IMAGE' ||
      ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].some(ext => data.file_path?.toLowerCase().endsWith(ext));

    if (isImage && onImageClick) {
      // Resolve absolute path if relative
      let fullPath = data.file_path || '';
      // Check if path is relative (not http, not absolute win/nix)
      const isRelative = fullPath && !fullPath.startsWith('http') && !fullPath.match(/^[a-zA-Z]:/) && !fullPath.startsWith('/');

      if (isRelative) {
        try {
          // Get authoritative media path from Rust (e.g., .../pqs-rtn-hybrid-storage/media)
          // This avoids guessing bundle IDs or AppData paths which can vary
          const mediaPath = await invoke<string>('get_media_directory_path');

          // We need to go up one level from 'media' to get the root 'pqs-rtn-hybrid-storage'
          const rootPath = await join(mediaPath, '..');

          fullPath = await join(rootPath, data.file_path || '');
        } catch (err) {
          console.error("Failed to resolve path:", err);
        }
      }

      // Use convertFileSrc to generate a valid src for the <img> tag in the modal
      const assetSrc = convertFileSrc(fullPath);
      onImageClick(assetSrc);
    } else {
      try {
        await invoke('open_path', { path: data.file_path });
      } catch (err) {
        console.error("Failed to open resource:", err);
        alert("ไม่สามารถเปิดลิงก์หรือไฟล์ได้: " + err);
      }
    }
  };
  return (
    <div className="group relative flex items-center justify-between gap-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 px-3 py-2 transition-colors">

      {/* LEFT: Index | Title | Category */}
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        {/* 1. Thai Alphabet */}
        <span className="font-bold text-sm text-slate-500 dark:text-slate-400 min-w-[20px]">
          {getThaiLetter(index)}
        </span>

        {/* 2. Title */}
        <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate" title={data.title}>
          {data.title}
        </span>

        {/* 3. Category Badge — hidden in compact mode */}
        {!compact && data.category && (
          <span className="shrink-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
            {data.category === 'MANUAL' ? 'MANUAL' :
              data.category === 'PROC' ? 'PROCEDURE' :
                data.category === 'TM' ? 'TECH MANUAL' :
                  data.category === 'SAFETY' ? 'SAFETY' :
                    data.category === 'DIAGRAM' ? 'DIAGRAM' :
                      data.category === 'OTHER' ? 'OTHER' : data.category}
          </span>
        )}

        {/* Usage Badge — hidden in compact mode */}
        {!compact && ((data.usage_count || 0) > 0 ? (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800" title={`ถูกอ้างอิงในคำถาม ${data.usage_count} ข้อ`}>
            Used: {data.usage_count}
          </span>
        ) : (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 opacity-80" title="ยังไม่ได้ถูกอ้างอิง">
            Unused
          </span>
        ))}
      </div>

      {/* RIGHT: Code | Icon | File | Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 4. Code Badge — hidden in compact mode */}
        {!compact && (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {data.code}
          </span>
        )}

        {/* 5. Resource Icon */}
        <div
          className={`flex items-center transition-transform ${data.file_path ? 'cursor-pointer hover:scale-110' : 'cursor-default opacity-40'}`}
          title={data.file_path ? (data.resource_type === 'WEBLINK' ? `Open: ${data.file_path}` : 'Open File') : 'No file linked'}
          onClick={data.file_path ? handleOpenResource : undefined}
        >
          {data.resource_type === 'WEBLINK' ? (
            <Globe className="w-4 h-4 text-emerald-500" />
          ) : data.resource_type === 'VIDEO' ? (
            <Video className="w-4 h-4 text-purple-500" />
          ) : data.resource_type === 'IMAGE' ? (
            <Image className="w-4 h-4 text-blue-500" />
          ) : data.resource_type === 'AUDIO' ? (
            <Mic className="w-4 h-4 text-orange-500" />
          ) : data.resource_type === 'TEMPLATE' ? (
            <FileDigit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          ) : (
            <FileText className="w-4 h-4 text-slate-400" />
          )}
        </div>

        {/* 6. Classification Icon */}
        <div className="flex items-center" title={data.classification || 'Unclassified'}>
          {data.classification === 'Confidential' || data.classification === 'Secret' ? (
            <Lock className="w-4 h-4 text-red-500" />
          ) : data.classification === 'Restricted' ? (
            <Shield className="w-4 h-4 text-blue-500" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
        </div>

        {/* 7. Actions */}
        {!readOnly && (
          <div className="flex gap-1 pl-2 border-l border-slate-200 dark:border-slate-700">
            <button onClick={onEdit} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PqsReferenceSection;
