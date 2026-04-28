import React from 'react';

interface ExemptedToggleSectionProps {
  is300: boolean;
  is200: boolean;
  isRequiredInstance: boolean;
  isPrerequisiteQuestion: boolean;
  isPrerequisiteChild: boolean;
  isSection300Selector: boolean;
  isSection100Selector: boolean;
  isSection200Selector: boolean;
  isExamChild: boolean;
  isFixedPracticeL1: boolean;
  isPerformanceL2: boolean;
  isL1: boolean;
  hasActualChildren: boolean;
  formScoreType: string;
  setFormScoreType: (val: string) => void;
  setFormScoreDisplayText: (val: string) => void;
  setFormScoreIsScored: (val: boolean) => void;
  setFormScoreValue: (val: string) => void;
  setDescription: (val: string) => void;
  setShowDescription: (val: boolean) => void;
  setUseSubQuestions: (val: boolean) => void;
  setRequiredCount: (val: number) => void;
  setRequiredCountChildren: (val: any[]) => void;
  imagePath: string | null;
  setImagePath: (val: string | null) => void;
  setPendingImageDelete: (val: boolean) => void;
  setPendingImageUpload: (val: string | null) => void;
  isExemptableL1_200: boolean;
  isDefaultDescL1_200: boolean;
  questionSequence?: number;
}

export const ExemptedToggleSection: React.FC<ExemptedToggleSectionProps> = ({
  is300,
  isRequiredInstance,
  isPrerequisiteQuestion,
  isPrerequisiteChild,
  isSection300Selector,
  isSection100Selector,
  isSection200Selector,
  isExamChild,
  isFixedPracticeL1,
  isPerformanceL2,
  isL1,
  hasActualChildren,
  formScoreType,
  setFormScoreType,
  setFormScoreDisplayText,
  setFormScoreIsScored,
  setFormScoreValue,
  setDescription,
  setShowDescription,
  setUseSubQuestions,
  setRequiredCount,
  setRequiredCountChildren,
  imagePath,
  setImagePath,
  setPendingImageDelete,
  setPendingImageUpload,
  isExemptableL1_200,
  isDefaultDescL1_200,
  questionSequence,
}) => {
  // 300-series toggle
  const show300Toggle = is300 && !isRequiredInstance && !isPrerequisiteQuestion && !isPrerequisiteChild && !isSection300Selector && !isSection100Selector && !isSection200Selector && !isExamChild && !isFixedPracticeL1 && !isPerformanceL2;

  // Prerequisite child toggle
  const showPrereqChildToggle = is300 && isPrerequisiteChild;

  // 200-series toggle
  const show200Toggle = isExemptableL1_200;

  if (!show300Toggle && !showPrereqChildToggle && !show200Toggle) return null;

  const handleToggleExempted = (isExempted: boolean, series: '200' | '300' | 'prereq') => {
    setFormScoreType(isExempted ? 'exempted' : 'normal');
    if (isExempted) {
      const displayTxt = series === '200' ? '(ไม่ต้องอธิบาย)' : '(ไม่ต้องปฏิบัติ)';
      setFormScoreDisplayText(displayTxt);
      if (series !== 'prereq') {
        setFormScoreIsScored(false);
        setFormScoreValue('0');
        setDescription('');
        setShowDescription(false);
        setUseSubQuestions(false);
        setRequiredCount(0);
        setRequiredCountChildren([]);
        if (imagePath) {
          setPendingImageDelete(true);
          setPendingImageUpload(null);
          setImagePath(null);
        }
      }
    } else {
      setFormScoreDisplayText('');
      if (series === '200' && isDefaultDescL1_200 && questionSequence !== undefined) {
        const DEFAULT_200_DESC: Record<number, string> = {
          2: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคำถามที่กำหนด',
          4: 'จงอธิบายค่าทำงานปกติ ค่าสูงสุด ต่ำสุด ของการทำงาน ตามรายการที่กำหนด',
        };
        setDescription(DEFAULT_200_DESC[questionSequence] || '');
        setShowDescription(true);
      } else if (series === '300') {
        // No specific restore logic for 300 normal mode besides clearing text
      }
    }
  };

  if (show300Toggle) {
    return (
      <div className="rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">การปฏิบัติ</span>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={formScoreType === 'exempted'}
              onChange={(e) => handleToggleExempted(e.target.checked, '300')}
              className="accent-amber-600 w-3.5 h-3.5"
            />
            ไม่ต้องปฏิบัติ
          </label>
          {formScoreType === 'exempted' && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
              (ไม่ต้องปฏิบัติ)
            </span>
          )}
        </div>
        {isL1 && hasActualChildren && formScoreType === 'exempted' && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded">
            <div className="flex items-start gap-2">
              <span className="text-red-600 dark:text-red-400 text-sm font-bold">⚠️</span>
              <div className="flex-1 text-xs text-red-700 dark:text-red-300">
                <div className="font-bold mb-1">คำเตือน: คำถามนี้มีคำถามย่อยอยู่</div>
                <div>เมื่อบันทึกเป็น "ไม่ต้องปฏิบัติ" คำถามย่อยทั้งหมดจะถูกลบออกจากฐานข้อมูลอัตโนมัติ</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (showPrereqChildToggle) {
    return (
      <div className="rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">การปฏิบัติ</span>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={formScoreType === 'exempted'}
              onChange={(e) => handleToggleExempted(e.target.checked, 'prereq')}
              className="accent-amber-600 w-3.5 h-3.5"
            />
            ไม่ต้องปฏิบัติ
          </label>
          {formScoreType === 'exempted' && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
              (ไม่ต้องปฏิบัติ)
            </span>
          )}
        </div>
      </div>
    );
  }

  if (show200Toggle) {
    return (
      <div className="rounded-md border border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-950/20 p-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">การอธิบาย</span>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={formScoreType === 'exempted'}
              onChange={(e) => handleToggleExempted(e.target.checked, '200')}
              className="accent-orange-600 w-3.5 h-3.5"
            />
            ไม่ต้องอธิบาย
          </label>
          {formScoreType === 'exempted' && (
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded">
              (ไม่ต้องอธิบาย)
            </span>
          )}
        </div>
        {isL1 && hasActualChildren && formScoreType === 'exempted' && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded">
            <div className="flex items-start gap-2">
              <span className="text-red-600 dark:text-red-400 text-sm font-bold">⚠️</span>
              <div className="flex-1 text-xs text-red-700 dark:text-red-300">
                <div className="font-bold mb-1">คำเตือน: คำถามนี้มีรายการย่อยอยู่</div>
                <div>เมื่อบันทึกเป็น "ไม่ต้องอธิบาย" รายการย่อยทั้งหมดจะถูกลบออกจากฐานข้อมูลอัตโนมัติ</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
