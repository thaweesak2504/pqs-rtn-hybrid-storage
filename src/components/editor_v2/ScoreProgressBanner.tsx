import { invoke } from '@tauri-apps/api/tauri';
import { Award, CheckCircle2, Clock } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface ScoreProgressBannerProps {
  documentId: string;
  sectionId: number;
  sectionGroup: 100 | 200 | 300; // Determines theme color (Green vs Orange vs Purple)
  refreshTrigger?: number; // Prop to force re-fetch when new answers are saved
}

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

const toThaiNumerals = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '๐';
  const thaiMap = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().replace(/[0-9]/g, (m) => thaiMap[parseInt(m)]);
};

const ScoreProgressBanner: React.FC<ScoreProgressBannerProps> = ({
  documentId,
  sectionId,
  sectionGroup,
  refreshTrigger = 0
}) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  // MOCK User ID for now (Matches TraineeAnswerBox MOCK_TRAINEE_ID)
  const MOCK_TRAINEE_ID = "T-001";

  useEffect(() => {
    let isMounted = true;
    const fetchProgress = async () => {
      if (!sectionId) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const result = await invoke<ProgressData>('get_section_progress', {
          userId: MOCK_TRAINEE_ID,
          documentId: documentId,
          sectionId: sectionId,
        }).catch((e) => {
          console.error("[Banner] get_section_progress failed sectionId:", sectionId, "error:", e);
          return null;
        });

        if (isMounted) {
          setProgress(result ?? {
            earned_score: 0,
            max_score: 0,
            completion_percentage: 0.0,
            is_passed: false,
            passing_score: 70,
            total_questions: 0,
            answered_questions: 0,
            passed_questions: 0,
            pending_with_answer: 0,
            needs_improvement_questions: 0,
          });
        }
      } catch (error) {
        console.error("Failed to fetch progress:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProgress();
    return () => { isMounted = false; };
  }, [documentId, sectionId, refreshTrigger]);

  if (loading) {
    return (
      <div className="w-full h-14 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"></div>
    );
  }

  // No data: section has no questions at all (both score-based and count-based are empty)
  const hasNoData = !progress || (progress.max_score === 0 && (progress.total_questions ?? 0) === 0);
  if (hasNoData) {
    return (
      <div className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
        <span>📊</span>
        <span>ยังไม่มีข้อมูลคะแนนในส่วนนี้ — จะอัปเดตเมื่อ Qualifier ประเมินผล</span>
      </div>
    );
  }

  const isCountMode = progress.max_score === 0 && (progress.total_questions ?? 0) > 0;
  const completedCount = progress.answered_questions ?? 0;
  const totalCount = progress.total_questions ?? 0;
  const passedCount = progress.passed_questions ?? 0;
  const pendingCount = progress.pending_with_answer ?? 0;
  const needsImprovementCount = progress.needs_improvement_questions ?? Math.max(0, completedCount - passedCount - pendingCount);

  const completionPercent = isCountMode
    ? (Math.min(100, Math.round((completedCount / (totalCount || 1)) * 100)) || 0)
    : (Math.min(100, Math.round(progress.completion_percentage)) || 0);

  const performancePercent = isCountMode
    ? (Math.min(100, Math.round(((progress.passed_questions ?? 0) / (progress.total_questions ?? 1)) * 100)) || 0)
    : (Math.min(100, Math.round((progress.earned_score / progress.max_score) * 100)) || 0);

  const isFinished = completionPercent >= 100;

  const statusConfig = isFinished
    ? { label: 'แล้วเสร็จ', icon: <CheckCircle2 className="w-4 h-4 mr-1.5" />, style: 'bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-700/50' }
    : { label: 'กำลังดำเนินการ', icon: <Clock className="w-4 h-4 mr-1.5" />, style: 'bg-orange-100/50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border-orange-200/50 dark:border-orange-700/50' };

  const iconThemeColor = sectionGroup === 100
    ? "text-emerald-500 dark:text-emerald-400"
    : sectionGroup === 200
      ? "text-orange-500 dark:text-orange-400"
      : sectionGroup === 300
        ? "text-purple-500 dark:text-purple-400"
        : "text-slate-500 dark:text-slate-400";

  const headlineLabel = isCountMode ? 'คะแนน' : 'คะแนนสะสม';
  const headlineValue = isCountMode ? `${toThaiNumerals(completedCount)}/${toThaiNumerals(totalCount)}` : `${toThaiNumerals(progress.earned_score)}/${toThaiNumerals(progress.max_score)}`;

  return (
    <div className={`w-full rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 shadow-sm backdrop-blur-md px-4 py-2 flex flex-col xl:flex-row items-center justify-between gap-4 transition-all`}>
      {/* Left Area: Title & Stats & Separator */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4 shrink-0 justify-center">
        <div className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-700/50 px-2.5 py-1 rounded-md border border-slate-200/50 dark:border-slate-600/50 shrink-0">
          <Award className={`w-4 h-4 ${iconThemeColor}`} />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{headlineLabel}:</span>
          <span className="text-base font-normal font-sarabun text-slate-800 dark:text-slate-200 ml-1">{headlineValue}</span>
        </div>

        {/* Status Badge */}
        <div className={`flex shrink-0 items-center px-2.5 py-1 border rounded-md font-semibold text-xs shadow-sm ${statusConfig.style}`}>
          {statusConfig.icon}
          {statusConfig.label}
        </div>

        {/* Vertical Separator */}
        <div className="hidden xl:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2 shrink-0"></div>
      </div>

      {/* Middle Area: 4 Counter Stats */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-3 text-xs md:text-sm font-medium">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
          <span className="opacity-80">ส่งคำตอบ:</span>
          <span className="font-normal text-slate-800 dark:text-slate-100 font-sarabun">{toThaiNumerals(completedCount)}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400">
          <span className="opacity-80">ผ่าน:</span>
          <span className="font-normal font-sarabun">{toThaiNumerals(passedCount)}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-400">
          <span className="opacity-80">รอตรวจ:</span>
          <span className="font-normal font-sarabun">{toThaiNumerals(pendingCount)}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50/60 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40 text-rose-700 dark:text-rose-400">
          <span className="opacity-80">ปรับปรุง:</span>
          <span className="font-normal font-sarabun">{toThaiNumerals(needsImprovementCount)}</span>
        </div>
      </div>

      {/* Right Area: Progress Bar (Orange bg, Green fill based on PASS %) */}
      <div className="flex items-center gap-2 w-full xl:w-auto xl:max-w-[12rem] xl:min-w-[10rem] ml-auto">
        <div className="flex-1">
          <div className="w-full h-2 bg-orange-100 dark:bg-orange-900/30 rounded-full overflow-hidden border border-orange-200/50 dark:border-orange-800/30">
            <div
              className={`h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-1000 ease-out`}
              style={{ width: `${performancePercent}%` }}
              title={`อัตราการสอบผ่าน ${performancePercent}%`}
            />
          </div>
        </div>
        <div className="text-xs font-normal text-slate-600 dark:text-slate-400 shrink-0 min-w-[2.5rem] text-right">
          {toThaiNumerals(performancePercent)}%
        </div>
      </div>
    </div>
  );
};

export default ScoreProgressBanner;
