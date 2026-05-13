import React, { useState, useCallback, useEffect } from 'react';
import { Book, Edit, FileDigit, FileText, FolderOpen, Globe, Image as ImageIcon, Lock, Mic, Shield, Video, Save, X } from 'lucide-react';
import { open as openDialog } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import Button from '../../ui/Button';
import { logger } from '../../../utils/logger';
import { ReferenceDoc, DocumentReference } from './types';

interface ReferenceFormCardProps {
  initialData?: ReferenceDoc;
  onSave: (data: Omit<ReferenceDoc, 'id'>) => void;
  onCancel: () => void;
}

const ReferenceFormCard: React.FC<ReferenceFormCardProps> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    title: initialData?.title || '',
    category: initialData?.category || '',
    classification: initialData?.classification || 'Unclassified',
    resource_type: initialData?.resource_type || 'DOCUMENT',
    file_path: initialData?.file_path || ''
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

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
      logger.error("Failed to open file dialog:", err);
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
            const seq = parseInt(m[2] || '0', 10);
            if (seq > maxSeq) maxSeq = seq;
          }
        });

        const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
        const newCode = `${newPrefix}-${newDigit}${nextSeq}`;

        if (newCode !== formData.code) {
          handleChange('code', newCode);
        }
      } catch (err) {
        logger.error("Failed to fetch sequence:", err);
        // Fallback to placeholder if error
        handleChange('code', `${newPrefix}-${newDigit}XXXX`);
      }
    };

    updateSeq();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category, formData.classification, initialData, handleChange]);

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
                    formData.resource_type === 'IMAGE' ? <ImageIcon className="w-3.5 h-3.5" /> :
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
                  title="เลือกไฟล์จากเครื่อง (Browse)"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
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

export default ReferenceFormCard;
