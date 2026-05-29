import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckCircle, Globe, Video, Image as ImageIcon, Mic, FileDigit, FileText, Trash2, Save } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import Button from '../../ui/Button';
import Tooltip from '../../ui/Tooltip';
import ConfirmModal from '../../modals/ConfirmModal';
import { DocumentReference, AlertVariant } from './types';
import { logger } from '../../../utils/logger';

interface ReferenceSearchCardProps {
  sectionId: number;
  existingReferenceIds: number[];
  onAlert: (message: string, variant?: AlertVariant, title?: string) => void;
  onSuccess: () => void;
  onCancel: () => void;
}

const ReferenceSearchCard: React.FC<ReferenceSearchCardProps> = ({ sectionId, existingReferenceIds, onAlert, onSuccess, onCancel }) => {
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
        logger.error("Failed to load refs:", err);
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
          logger.error("Failed to delete master ref:", err);
          onAlert("ไม่สามารถลบเอกสารหลักได้: " + err, 'warning');
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
      logger.error("Failed to batch add references:", err);
      onAlert("Error adding references: " + err, 'danger');
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
                          ref.resource_type === 'IMAGE' ? <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> :
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
                        <Tooltip content={ref.title}>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{ref.title}</span>
                        </Tooltip>
                      </div>

                      {/* Trash Icon for Global Delete */}
                      <Tooltip content="ลบออกจากระบบถาวร" position="left">
                        <button
                          onClick={(e) => handleDeleteMaster(e, ref.id, ref.code)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
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

export default ReferenceSearchCard;
