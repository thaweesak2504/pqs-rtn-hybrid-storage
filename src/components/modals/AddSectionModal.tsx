import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  sectionGroup: 100 | 200 | 300;
  existingNumbers: number[];
  onSuccess: (newSectionNumber?: number) => void;
}

const AddSectionModal: React.FC<AddSectionModalProps> = ({
  isOpen,
  onClose,
  documentId,
  sectionGroup,
  existingNumbers,
  onSuccess,
}) => {
  const [sectionNumber, setSectionNumber] = useState('');
  const [titleTh, setTitleTh] = useState('');
  const [shortName, setShortName] = useState(''); // Short name without number
  const [menuLabel, setMenuLabel] = useState(''); // Auto-generated: "102 Electrical"
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getSectionGroupName = () => {
    switch (sectionGroup) {
      case 100: return '100 Fundamental Sections';
      case 200: return '200 System Sections';
      case 300: return '300 Watch Station Sections';
    }
  };

  const getValidRange = () => {
    switch (sectionGroup) {
      case 100: return { min: 101, max: 199 };
      case 200: return { min: 201, max: 299 };
      case 300: return { min: 301, max: 399 };
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSectionNumber('');
      setTitleTh('');
      setShortName('');
      setMenuLabel('');
      setError('');
    }
  }, [isOpen]);

  // Auto-generate menu label: "102 Electrical"
  useEffect(() => {
    if (sectionNumber && shortName) {
      const generated = `${sectionNumber} ${shortName}`;
      setMenuLabel(generated);
    } else {
      setMenuLabel('');
    }
  }, [sectionNumber, shortName]);

  // Real-time validation
  useEffect(() => {
    if (!sectionNumber) {
      setError('');
      return;
    }

    const num = parseInt(sectionNumber);
    if (isNaN(num)) {
      setError('Section number must be a valid number');
      return;
    }

    const range = getValidRange();
    if (num < range.min || num > range.max) {
      setError(`Section number must be between ${range.min} and ${range.max}`);
      return;
    }

    if (num === 101) {
      setError('Section 101 is system-defined and auto-created');
      return;
    }

    if (existingNumbers.includes(num)) {
      setError(`Section ${num} already exists`);
      return;
    }

    setError('');
  }, [sectionNumber, existingNumbers, sectionGroup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (error) return;
    if (!sectionNumber || !titleTh || !shortName) {
      setError('All fields are required');
      return;
    }

    if (menuLabel.length > 30) {
      setError('Generated menu label is too long. Please use a shorter name.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { invoke } = await import('@tauri-apps/api/tauri');

      await invoke('create_section', {
        request: {
          document_id: documentId,
          section_group: sectionGroup,
          section_number: parseInt(sectionNumber),
          title_th: titleTh,
          menu_label: menuLabel,
        }
      });

      onSuccess(parseInt(sectionNumber));
      onClose();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const range = getValidRange();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-github-bg-secondary rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-github-border-primary">
          <h2 className="text-xl font-semibold text-github-text-primary">
            ✨ เพิ่มข้อย่อย (Add New Sub Section)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Section Group (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-github-text-primary mb-2">
              กลุ่มหัวข้อ (Section Group)
            </label>
            <input
              type="text"
              value={getSectionGroupName()}
              disabled
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-github-text-primary cursor-not-allowed"
            />
          </div>

          {/* Section Number */}
          <div>
            <label className="block text-sm font-medium text-github-text-primary mb-2">
              ลำดับที่ (Section Number) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={sectionNumber}
              onChange={(e) => setSectionNumber(e.target.value)}
              placeholder={sectionGroup === 100 ? "ตัวอย่าง: 102, 103, 104" : sectionGroup === 200 ? "ตัวอย่าง: 201, 202, 203" : "ตัวอย่าง: 301, 302, 303"}
              className="w-full px-3 py-2 bg-white dark:bg-github-bg-tertiary border border-gray-300 dark:border-github-border-primary rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-github-text-primary"
              min={range.min}
              max={range.max}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {sectionGroup === 100 ? 'ช่วงที่ใช้ได้: 102-199 (101 สงวนไว้โดยระบบ)' : `ช่วงที่ใช้ได้: ${range.min}-${range.max}`}
            </p>
          </div>

          {/* Title (Thai) */}
          <div>
            <label className="block text-sm font-medium text-github-text-primary mb-2">
              ชื่อเรื่อง (Section Title) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titleTh}
              onChange={(e) => setTitleTh(e.target.value)}
              placeholder={
                sectionGroup === 100
                  ? "เช่น ข้อระมัดระวังอันตรายพื้นฐานด้านการสรรพาวุธ Ordnance Safety Fundamentals"
                  : sectionGroup === 200
                    ? "เช่น ระบบเรดาร์ควบคุมการยิง Radar Weapon Assembly System"
                    : "เช่น การปฏิบัติหน้าที่ในตําแหน่ง พลลําเลียงและพลบรรจุ Gunner Mate Watch Station"
              }
              maxLength={200}
              className="w-full px-3 py-2 bg-white dark:bg-github-bg-tertiary border border-gray-300 dark:border-github-border-primary rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-github-text-primary"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {titleTh.length}/200 ตัวอักษร
            </p>
          </div>

          {/* Short Name (English) - Auto-generates Menu Label */}
          <div>
            <label className="block text-sm font-medium text-github-text-primary mb-2">
              เมนูภาษาอังกฤษ (English Menu Name) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder={
                sectionGroup === 100
                  ? "เช่น Ordnance Safety"
                  : sectionGroup === 200
                    ? "เช่น Radar Weapon"
                    : "เช่น Gunner Mate"
              }
              maxLength={25}
              className="w-full px-3 py-2 bg-white dark:bg-github-bg-tertiary border border-gray-300 dark:border-github-border-primary rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-github-text-primary"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {shortName.length}/25 ตัวอักษร
            </p>
            {menuLabel && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  📋 Menu Label: <span className="font-semibold">{menuLabel}</span>
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!!error || !sectionNumber || !titleTh || !shortName || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Section'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSectionModal;
