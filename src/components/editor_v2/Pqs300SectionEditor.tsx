import { invoke } from '@tauri-apps/api/tauri';
import { Clock, Trophy } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import PqsEditorLayout from './PqsEditorLayout';
import PqsHeader from './PqsHeader';
import PqsQuestionSection from './PqsQuestionSection';
import PqsSectionPreview from './PqsSectionPreview';

type ViewMode = 'edit' | 'normal' | 'preview';
type DurationUnit = 'days' | 'weeks' | 'months';

const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  days: 'วัน',
  weeks: 'สัปดาห์',
  months: 'เดือน',
};

const toThaiNumerals = (num: number | string): string => {
  const thaiMap = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().replace(/[0-9]/g, (m) => thaiMap[parseInt(m)]);
};

// ============ Component ============

interface Pqs300SectionEditorProps {
  docId: string;
  sectionNumber: number;
  title: string;
  subTitle?: string;
  isPreviewMode?: boolean;
  viewMode?: ViewMode;
  onMenuLabelChange?: () => void;
  docBranchMain?: string;
  docBranchSub?: string;
}

const Pqs300SectionEditor: React.FC<Pqs300SectionEditorProps> = ({
  docId,
  sectionNumber,
  title,
  subTitle,
  viewMode = 'edit',
  onMenuLabelChange,
  docBranchMain,
  docBranchSub,
}) => {
  const readOnly = viewMode !== 'edit';
  const [sectionId, setSectionId] = useState<number>(0);

  // Default prefix for 300Template
  const titlePrefix = "การปฏิบัติหน้าที่ในตำแหน่ง ";

  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentMenuLabel, setCurrentMenuLabel] = useState(subTitle || '');

  // Duration & Score state
  const [durationValue, setDurationValue] = useState<number | null>(null);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('weeks');
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [tempDuration, setTempDuration] = useState<string>('');
  const [tempUnit, setTempUnit] = useState<DurationUnit>('weeks');

  const handleTitleChange = async (newTitle: string) => {
    try {
      await invoke('update_section', {
        args: {
          id: sectionId,
          title_th: newTitle,
          menu_label: `${sectionNumber} ${currentMenuLabel}`.trim(),
          duration_value: durationValue,
          duration_unit: durationUnit,
          total_score: totalScore,
        }
      });
      setCurrentTitle(newTitle);
    } catch (error) {
      console.error("Failed to update title:", error);
      alert("Failed to save title: " + error);
    }
  };

  const handleSubTitleChange = async (newSubTitle: string) => {
    try {
      await invoke('update_section', {
        args: {
          id: sectionId,
          title_th: currentTitle,
          menu_label: `${sectionNumber} ${newSubTitle}`.trim(),
          duration_value: durationValue,
          duration_unit: durationUnit,
          total_score: totalScore,
        }
      });
      setCurrentMenuLabel(newSubTitle);
      onMenuLabelChange?.(); // refresh sidebar
    } catch (error) {
      console.error("Failed to update menu label:", error);
      alert("Failed to save menu label: " + error);
    }
  };

  const handleSaveMeta = async () => {
    const dv = tempDuration ? parseInt(tempDuration) : null;
    try {
      await invoke('update_section', {
        args: {
          id: sectionId,
          title_th: currentTitle,
          menu_label: `${sectionNumber} ${currentMenuLabel}`.trim(),
          duration_value: dv,
          duration_unit: tempUnit,
          total_score: totalScore,
        }
      });
      setDurationValue(dv);
      setDurationUnit(tempUnit);
      setIsEditingMeta(false);
    } catch (error) {
      console.error("Failed to update section meta:", error);
      alert("Failed to save: " + error);
    }
  };


  // Fetch Section ID on mount or when sectionNumber changes
  const fetchSectionData = useCallback(async () => {
    try {
      const sections = await invoke<any[]>('get_sections_by_document', { documentId: docId });
      const currentSection = sections.find(s => s.section_number === sectionNumber);
      if (currentSection) {
        setSectionId(currentSection.id);
        setCurrentTitle(currentSection.title_th);
        // Strip section number prefix — only menu text part is editable
        const rawLabel = currentSection.menu_label || '';
        const prefix = `${sectionNumber} `;
        setCurrentMenuLabel(rawLabel.startsWith(prefix) ? rawLabel.slice(prefix.length) : rawLabel);
        setDurationValue(currentSection.duration_value);
        setDurationUnit(currentSection.duration_unit || 'weeks');
        setTotalScore(currentSection.total_score);
      }
    } catch (error) {
      console.error("Failed to fetch section data:", error);
    }
  }, [docId, sectionNumber]);

  useEffect(() => {
    fetchSectionData();
  }, [fetchSectionData]);

  // Preview Mode: Render A4 paper view
  if (viewMode === 'preview') {
    return (
      <PqsSectionPreview
        docId={docId}
        sectionId={sectionId}
        sectionNumber={sectionNumber}
        title={currentTitle}
        references={[]}
        sectionGroup={300}
      />
    );
  }

  return (
    <PqsEditorLayout section={sectionNumber.toString()}>

      {/* 1. Header Area */}
      <PqsHeader
        section={sectionNumber.toString()}
        title={currentTitle}
        subTitle={currentMenuLabel || subTitle}
        onTitleChange={handleTitleChange}
        onSubTitleChange={readOnly ? undefined : handleSubTitleChange}
        readOnly={readOnly}
        prefix={titlePrefix}
        metadata={{
          id: docId,
          unit_code: '',
          updated_at: new Date().toISOString()
        }}
      />

      {/* 2. Duration & Score Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
        <div className="px-4 py-3">
          {isEditingMeta && !readOnly ? (
            /* Editing Mode */
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">ระยะเวลา:</span>
                <input
                  type="number"
                  min="1"
                  value={tempDuration}
                  onChange={(e) => setTempDuration(e.target.value)}
                  className="w-16 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-purple-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="..."
                />
                <select
                  value={tempUnit}
                  onChange={(e) => setTempUnit(e.target.value as DurationUnit)}
                  className="px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-purple-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {Object.entries(DURATION_UNIT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">คะแนนรวม:</span>
                <span className="text-lg font-bold text-purple-700 dark:text-purple-300 font-sarabun">
                  {totalScore != null ? toThaiNumerals(totalScore) : '–'}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">คะแนน</span>
                <span className="text-xs text-purple-600 dark:text-purple-400 ml-2">
                  (คำนวณอัตโนมัติ)
                </span>
              </div>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={handleSaveMeta}
                  className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded shadow-sm"
                >
                  บันทึก
                </button>
                <button
                  onClick={() => setIsEditingMeta(false)}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          ) : (
            /* Display Mode */
            <div
              className={`flex flex-wrap items-center gap-6 ${!readOnly ? 'cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 -mx-4 -my-3 px-4 py-3 rounded-lg transition-colors' : ''}`}
              onClick={!readOnly ? () => {
                setTempDuration(durationValue?.toString() || '');
                setTempUnit(durationUnit);
                setIsEditingMeta(true);
              } : undefined}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">ระยะเวลาที่ใช้โดยประมาณ</span>
                <span className="text-lg font-bold text-purple-700 dark:text-purple-300 font-sarabun">
                  {durationValue != null ? toThaiNumerals(durationValue) : '–'}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {DURATION_UNIT_LABELS[durationUnit] || durationUnit}
                </span>
              </div>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">คะแนนรวม</span>
                <span className="text-lg font-bold text-purple-700 dark:text-purple-300 font-sarabun">
                  {totalScore != null ? toThaiNumerals(totalScore) : '–'}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">คะแนน</span>
              </div>
              {!readOnly && (
                <span className="text-xs text-gray-400 ml-auto">คลิกเพื่อแก้ไข</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Content Area */}
      <div className="flex flex-col gap-6">
        <PqsQuestionSection
          docId={docId}
          sectionId={sectionId}
          sectionNumber={sectionNumber}
          sectionGroup={300}
          readOnly={readOnly}
          docBranchMain={docBranchMain}
          docBranchSub={docBranchSub}
          onQuestionsUpdated={fetchSectionData}
        />
      </div>

    </PqsEditorLayout>
  );
};

export default Pqs300SectionEditor;
