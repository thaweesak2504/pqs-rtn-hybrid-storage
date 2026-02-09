import React, { useState, useEffect } from 'react';
import { Book, Plus, Trash2, Edit, Save, X, FileText, Lock, Shield } from 'lucide-react';
import Button from '../ui/Button';

// Types
export interface ReferenceDoc {
  id: string; // The Link ID (SectionReference ID)
  reference_id?: number; // The actual Reference ID (for updates)
  code: string;
  title: string;
  category: string;
  classification: string; // Unclassified, Restricted, Confidential, Secret
  file_path: string;
  description?: string;
}

interface PqsReferenceSectionProps {
  references: ReferenceDoc[];
  onAdd: (ref: Omit<ReferenceDoc, 'id'>) => void;
  onEdit: (ref: ReferenceDoc) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

const PqsReferenceSection: React.FC<PqsReferenceSectionProps> = ({
  references,
  onAdd,
  onEdit,
  onDelete,
  readOnly = false
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Helper to close all forms
  const resetForms = () => {
    setEditingId(null);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    resetForms();
    setIsCreating(true);
  };

  const handleStartEdit = (id: string) => {
    resetForms();
    setEditingId(id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this reference?')) {
      onDelete(id);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Book className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">เอกสารอ้างอิง</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Reference Documents</p>
          </div>
        </div>
        {!readOnly && !isCreating && (
          <Button variant="primary" size="small" icon={<Plus className="w-4 h-4" />} onClick={handleStartCreate}>
            Add Reference
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Creation Form Card */}
        {isCreating && (
          <ReferenceFormCard
            onSave={(data) => {
              onAdd(data);
              setIsCreating(false);
            }}
            onCancel={() => setIsCreating(false)}
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
                onEdit={() => handleStartEdit(ref.id)}
                onDelete={() => handleDelete(ref.id)}
              />
            )
          ))}
        </div>

        {/* Empty State */}
        {!isCreating && references.length === 0 && (
          <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={!readOnly ? handleStartCreate : undefined}>
            <Book className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-medium">No references added yet.</p>
            {!readOnly && <p className="text-xs text-blue-500 mt-1">Click to add</p>}
          </div>
        )}
      </div>
    </div>
  );
};

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
    file_path: initialData?.file_path || ''
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) return;
    onSave(formData);
  };

  // Auto-Update Code on Category/Class Change
  useEffect(() => {
    if (!formData.category) return;

    const catMap: Record<string, string> = { 'MANUAL': 'MN', 'PROC': 'PR', 'TM': 'TM', 'SAFETY': 'SF', 'DIAGRAM': 'DG', 'OTHER': 'OT' };
    const classMap: Record<string, string> = { 'Unclassified': '0', 'Restricted': '1', 'Confidential': '2', 'Secret': '3' };

    const newPrefix = catMap[formData.category] || 'OT';
    const newDigit = classMap[formData.classification] || '0';

    // Regex to parse existing code: Prefix-Digit-Suffix
    // e.g. "MN-0001", "OT-1ABC"
    // Group 1: Prefix (Letters)
    // Group 2: Digit (Number)
    // Group 3: Suffix (Any)
    // We look for pattern: ^([A-Z]+)-(\d)(.*)$
    const match = formData.code.match(/^([A-Z]+)-(\d)(.*)$/);

    if (match) {
      // If code matches pattern, preserve suffix but update Prefix and Digit
      const currentSuffix = match[3];
      const newCode = `${newPrefix}-${newDigit}${currentSuffix}`;
      if (newCode !== formData.code) {
        handleChange('code', newCode);
      }
    } else {
      // If code doesn't match standard pattern (or is empty), just force new prefix/digit if it's empty or "REF-0XXX" placeholder
      if (!formData.code || formData.code === 'REF-0XXX' || formData.code.includes('XXX')) {
        handleChange('code', `${newPrefix}-${newDigit}XXX`);
      }
      // If it's a custom code like "my-doc-1", we leave it alone unless user manually edits it.
    }
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

          {/* 4. File Path */}
          <div className="relative w-full sm:w-4/12 group">
            <label className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5 block">
              ไฟล์แนบ (File Path)
            </label>
            <div className="relative">
              <input
                className={`w-full pl-7 pr-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500 outline-none ${formData.classification === 'Confidential'
                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                  }`}
                placeholder={formData.classification === 'Confidential' ? 'ปิดกั้น (LOCKED)' : "C:\\Path\\To\\File.pdf"}
                value={formData.file_path}
                onChange={e => handleChange('file_path', e.target.value)}
                disabled={formData.classification === 'Confidential'}
                onFocus={() => setFocusedField('file_path')}
                onBlur={() => setFocusedField(null)}
              />
              <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {focusedField === 'file_path' && (
              <div className="absolute right-0 -top-6 bg-blue-600 text-white text-[10px] py-0.5 px-2 rounded shadow whitespace-nowrap z-20 animate-in fade-in">
                {formData.classification === 'Confidential' ? 'ไม่สามารถแนบไฟล์ได้' : 'ระบุที่เก็บไฟล์'}
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
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={handleSave} disabled={!formData.title} icon={<Save className="w-3.5 h-3.5" />}>
            Save Reference
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
  onEdit: () => void;
  onDelete: () => void;
}> = ({ data, index, readOnly, onEdit, onDelete }) => {

  // Convert index to Thai Alphabet (ก., ข., ค., ...)
  const getThaiLetter = (i: number) => {
    const thaiChars = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'];
    if (i < thaiChars.length) return `${thaiChars[i]}.`;
    return `${i + 1}.`; // Fallback for very long lists
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

        {/* 3. Category Badge */}
        {data.category && (
          <span className="shrink-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
            {data.category === 'MANUAL' ? 'MANUAL' :
              data.category === 'PROC' ? 'PROCEDURE' :
                data.category === 'TM' ? 'TECH MANUAL' :
                  data.category === 'SAFETY' ? 'SAFETY' :
                    data.category === 'DIAGRAM' ? 'DIAGRAM' :
                      data.category === 'OTHER' ? 'OTHER' : data.category}
          </span>
        )}
      </div>

      {/* RIGHT: Code | Icon | File | Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 4. Code Badge */}
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {data.code}
        </span>

        {/* 5. Classification Icon */}
        <div className="flex items-center" title={data.classification || 'Unclassified'}>
          {!data.classification || data.classification === 'Unclassified' ? (
            <Book className="w-4 h-4 text-slate-400" />
          ) : data.classification === 'Confidential' || data.classification === 'Secret' ? (
            <Lock className="w-4 h-4 text-red-500" />
          ) : (
            <Shield className="w-4 h-4 text-blue-500" />
          )}
        </div>

        {/* 6. File Icon (if exists) */}
        {data.file_path && (
          <div className="text-slate-400" title={data.file_path}>
            <FileText className="w-4 h-4 hover:text-blue-500 cursor-pointer" />
          </div>
        )}

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
