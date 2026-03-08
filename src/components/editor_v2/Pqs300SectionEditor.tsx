import { invoke } from '@tauri-apps/api/tauri';
import { Clock, Trophy } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import Tooltip from '../ui/Tooltip';
import DevProgressVerificationTable from './DevProgressVerificationTable';
import PqsEditorLayout from './PqsEditorLayout';
import PqsHeader from './PqsHeader';
import PqsQuestionSection from './PqsQuestionSection';
import PqsSectionPreview300 from './PqsSectionPreview300';

type ViewMode = 'edit' | 'qualifier' | 'trainee' | 'visitor' | 'print';
type PrintSubView = 'question-only' | 'question-with-key';
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

interface ProgressData {
  earned_score: number;
  max_score: number;
  completion_percentage: number;
  is_passed: boolean;
  passing_score: number;
  total_questions?: number;
  answered_questions?: number;
  passed_questions?: number;
  pending_with_answer?: number;
  needs_improvement_questions?: number;
}

const MOCK_TRAINEE_ID = 'T-001';

// ============ Component ============

interface Pqs300SectionEditorProps {
  docId: string;
  sectionNumber: number;
  title: string;
  subTitle?: string;
  isPreviewMode?: boolean;
  viewMode?: ViewMode;
  printSubView?: PrintSubView;
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
  printSubView: printSubView300 = 'question-only',
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
  const [refreshQuestionsTrigger, setRefreshQuestionsTrigger] = useState(0);

  // Duration & Score state
  const [durationValue, setDurationValue] = useState<number | null>(null);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('weeks');
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [tempDuration, setTempDuration] = useState<string>('');
  const [tempUnit, setTempUnit] = useState<DurationUnit>('weeks');
  const [progress, setProgress] = useState<ProgressData | null>(null);

  const refreshSectionTotalScore = useCallback(async () => {
    if (!sectionId) return;
    try {
      const freshTotal = await invoke<number>('calculate_section_total_score', { sectionId });
      setTotalScore(freshTotal);
    } catch (error) {
      console.error('Failed to refresh section total score:', error);
    }
  }, [sectionId]);

  const refreshSectionProgress = useCallback(async () => {
    if (!sectionId) {
      setProgress(null);
      return;
    }
    try {
      const result = await invoke<ProgressData>('get_section_progress', {
        userId: MOCK_TRAINEE_ID,
        documentId: docId,
        sectionId,
      }).catch(() => null);

      setProgress(result ?? {
        earned_score: 0,
        max_score: 0,
        completion_percentage: 0,
        is_passed: false,
        passing_score: 70,
        total_questions: 0,
        answered_questions: 0,
        passed_questions: 0,
        pending_with_answer: 0,
        needs_improvement_questions: 0,
      });
    } catch (error) {
      console.error('Failed to refresh section progress:', error);
    }
  }, [docId, sectionId]);

  const refreshSectionMetaBar = useCallback(async () => {
    await refreshSectionTotalScore();
    await refreshSectionProgress();
  }, [refreshSectionProgress, refreshSectionTotalScore]);

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

  useEffect(() => {
    refreshSectionMetaBar();
  }, [refreshSectionMetaBar]);

  const earnedScore = progress?.earned_score ?? 0;
  const maxScore = Math.max(progress?.max_score ?? 0, totalScore ?? 0);
  const performancePercent = maxScore > 0
    ? (Math.min(100, Math.round((earnedScore / maxScore) * 100)) || 0)
    : 0;
  const shouldShowAccumulatedProgress = viewMode === 'trainee' || viewMode === 'qualifier';

  // Preview Mode: Render A4 paper view
  if (viewMode === 'print') {
    return (
      <PqsSectionPreview300
        docId={docId}
        sectionId={sectionId}
        sectionNumber={sectionNumber}
        title={currentTitle}
        subTitle={undefined}
      />
    );
  }

  void printSubView300;

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
              <div className="flex flex-wrap items-center gap-6 min-w-0">
              {!readOnly ? (
                <Tooltip content="คลิ๊กเพื่อป้อน จำนวนและหน่วยของเวลา ในการปฏิบัติ" position="top-start">
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
                </Tooltip>
              ) : (
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
              )}
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">คะแนนรวม</span>
                <span className="text-lg font-bold text-purple-700 dark:text-purple-300 font-sarabun">
                  {totalScore != null ? toThaiNumerals(totalScore) : '–'}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">คะแนน</span>
              </div>
              </div>
              {shouldShowAccumulatedProgress && (
                <div className="ml-auto flex items-center gap-3 min-w-[16rem] max-w-full">
                  <div className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    <span className="text-purple-600 dark:text-purple-400">คะแนนสะสม:</span>{' '}
                    <span className="font-sarabun">{toThaiNumerals(earnedScore)}/{toThaiNumerals(maxScore)}</span>
                  </div>
                  <div className="flex-1 min-w-[8rem]">
                    <div className="w-full h-2 bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden border border-purple-200/60 dark:border-purple-800/40">
                      <div
                        className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-700 ease-out"
                        style={{ width: `${performancePercent}%` }}
                        title={`คะแนนสะสม ${performancePercent}%`}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 shrink-0 font-sarabun min-w-[3rem] text-right whitespace-nowrap">
                    {toThaiNumerals(performancePercent)}%
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded whitespace-nowrap ${performancePercent >= 100
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-800/40'
                    : 'text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-800/40'}`}>
                    {performancePercent >= 100 ? 'แล้วเสร็จ' : 'กำลังดำเนินการ'}
                  </span>
                </div>
              )}
              {!readOnly && (
                <span className={`text-xs text-gray-400 whitespace-nowrap ${shouldShowAccumulatedProgress ? 'w-full text-right' : 'ml-auto'}`}>คลิกเพื่อแก้ไข</span>
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
          readOnly={false}
          refreshTrigger={refreshQuestionsTrigger}
          onQuestionsUpdated={() => {
            fetchSectionData();
            setRefreshQuestionsTrigger(prev => prev + 1);
          }}
          onProgressUpdate={refreshSectionMetaBar}
          viewMode={viewMode}
          docBranchMain={docBranchMain}
          docBranchSub={docBranchSub}
        />
      </div>

      {/* 4. Developer Verification Table */}
      {(viewMode === 'edit' || viewMode === 'qualifier' || viewMode === 'trainee') && (
        <DevProgressVerificationTable
          documentId={docId}
          sectionId={sectionId}
          refreshTrigger={refreshQuestionsTrigger}
        />
      )}

    </PqsEditorLayout>
  );
};

export default Pqs300SectionEditor;
