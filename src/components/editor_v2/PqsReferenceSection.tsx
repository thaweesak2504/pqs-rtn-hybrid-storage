import { Book, Plus, Search } from 'lucide-react';
import React, { useState } from 'react';
import ConfirmModal from '../modals/ConfirmModal';
import ImagePreviewModal from '../modals/ImagePreviewModal';
import Button from '../ui/Button';


import { ReferenceDoc, AlertVariant } from './reference/types';
import ReferenceSearchCard from './reference/ReferenceSearchCard';
import ReferenceFormCard from './reference/ReferenceFormCard';
import ReferenceDisplayCard from './reference/ReferenceDisplayCard';

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
  sectionGroup?: 100 | 200 | 300;
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
  sectionGroup = 100,
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
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger'
  });
  const showAlert = (message: string, variant: AlertVariant = 'warning', title = 'แจ้งเตือน') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      variant,
    });
  };

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
    const doc = references.find(r => r.id === id);
    if (doc && (doc.usage_count || 0) > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'แจ้งเตือน (ไม่อนุญาตให้ลบ)',
        message: `ไม่สามารถนำเอกสาร "${doc.title}" ออกได้\n\nเนื่องจากกำลังถูกใช้งานอยู่ในคำถามจำนวน ${doc.usage_count} ข้อ\nกรุณาไปปลดการเรียกใช้ออกจากข้อคำถามให้ครบก่อนทำการนำออก`,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
        variant: 'danger',
        confirmText: 'รับทราบ',
        cancelText: '' // ซ่อนปุ่มยกเลิก
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการนำออก',
      message: 'คุณต้องการนำเอกสารอ้างอิงนี้ออกจากการเชื่อมโยงใช่หรือไม่?\n\n(เอกสารจะถูกนำออกจากรายการของหัวข้อนี้เท่านั้น แต่ยังคงอยู่ในระบบหลัก)',
      onConfirm: () => onDelete(id),
      variant: 'warning',
      confirmText: 'ยืนยัน',
      cancelText: 'ยกเลิก'
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
            onAlert={showAlert}
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
                sectionGroup={sectionGroup}
                onEdit={() => handleStartEdit(ref.id)}
                onDelete={() => handleDelete(ref.id)}
                onAlert={showAlert}
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
          <div 
            className="col-span-full py-12 text-center border border-github-border-primary rounded-xl bg-github-bg-active hover:bg-github-bg-hover hover:border-github-border-active transition-all duration-200 cursor-pointer transform hover:scale-[1.01] active:scale-[0.99] group shadow-github-small hover:shadow-github-medium" 
            onClick={!readOnly ? handleStartSearch : undefined}
          >
            <div className="w-16 h-16 rounded-2xl bg-github-bg-secondary border border-github-border-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:border-github-accent-primary transition-all duration-300">
              <Book className="w-8 h-8 text-github-text-tertiary group-hover:text-github-accent-primary transition-colors" />
            </div>
            <p className="text-base font-semibold text-github-text-primary tracking-tight">ยังไม่มีเอกสารอ้างอิงในหัวข้อนี้</p>
            {!readOnly && (
              <div className="mt-2 flex items-center justify-center gap-2 text-github-accent-primary text-sm font-medium">
                <Search className="w-3.5 h-3.5" />
                <span>คลิกเพื่อค้นหาหรือเพิ่มเอกสาร</span>
              </div>
            )}
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
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />

      <ImagePreviewModal
        isOpen={isRefImageModalOpen}
        onClose={() => setIsRefImageModalOpen(false)}
        imageSrc={selectedRefImage || ''}
      />
    </div>
  );
};

export default PqsReferenceSection;
