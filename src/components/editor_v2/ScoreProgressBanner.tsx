import { invoke } from '@tauri-apps/api/tauri';
import { AlertTriangle, Award, CheckCircle2, CircleDashed, Clock, FileCheck2 } from 'lucide-react';
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
      <div className="w-full h-20 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"></div>
    );
  }

  // No data: section has no questions at all (both score-based and count-based are empty)
  const hasNoData = !progress || (progress.max_score === 0 && (progress.total_questions ?? 0) === 0);
  if (hasNoData) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
        <span>📊</span>
        <span>ยังไม่มีข้อมูลคะแนนในส่วนนี้ — จะอัปเดตเมื่อ Qualifier ประเมินผล</span>
      </div>
    );
  }

  // Theme based on Section Group
  const theme = sectionGroup === 100
    ? {
      bg: 'bg-emerald-50 dark:bg-emerald-900/10',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      text: 'text-emerald-700 dark:text-emerald-400',
      barFill: 'bg-emerald-500',
      barBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      icon: 'text-emerald-500 dark:text-emerald-400',
      ring: 'text-emerald-500',
      passedBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700',
    }
    : sectionGroup === 300
      ? {
        bg: 'bg-purple-50 dark:bg-purple-900/10',
        border: 'border-purple-200 dark:border-purple-800/50',
        text: 'text-purple-700 dark:text-purple-400',
        barFill: 'bg-purple-500',
        barBg: 'bg-purple-100 dark:bg-purple-900/30',
        icon: 'text-purple-500 dark:text-purple-400',
        ring: 'text-purple-500',
        passedBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700', // Success is always green
      }
      : {
        bg: 'bg-orange-50 dark:bg-orange-900/10',
        border: 'border-orange-200 dark:border-orange-800/50',
        text: 'text-orange-700 dark:text-orange-400',
        barFill: 'bg-orange-500',
        barBg: 'bg-orange-100 dark:bg-orange-900/30',
        icon: 'text-orange-500 dark:text-orange-400',
        ring: 'text-orange-500',
        passedBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700', // Success is always green
      };

  const isPassed = progress.is_passed;
  const isCountMode = progress.max_score === 0 && (progress.total_questions ?? 0) > 0;
  const completedCount = progress.answered_questions ?? 0;
  const totalCount = progress.total_questions ?? 0;
  const passedCount = progress.passed_questions ?? 0;
  const pendingCount = progress.pending_with_answer ?? 0;
  const needsImprovementCount = progress.needs_improvement_questions ?? Math.max(0, completedCount - passedCount - pendingCount);
  const progressPercent = isCountMode
    ? (Math.min(100, Math.round((completedCount / (totalCount || 1)) * 100)) || 0)
    : (Math.min(100, Math.round(progress.completion_percentage)) || 0);
  const performancePercent = isCountMode
    ? (Math.min(100, Math.round(((progress.passed_questions ?? 0) / (progress.total_questions ?? 1)) * 100)) || 0)
    : (Math.min(100, Math.round((progress.earned_score / progress.max_score) * 100)) || 0);

  const statusConfig = isPassed
    ? { label: 'ผ่านเกณฑ์', icon: <CheckCircle2 className="w-5 h-5 mr-1.5" />, style: theme.passedBg }
    : progressPercent >= 100
      ? { label: 'ต้องปรับปรุง', icon: <CircleDashed className="w-5 h-5 mr-1.5" />, style: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border-rose-300 dark:border-rose-700' }
      : { label: 'รอดำเนินการ', icon: <Clock className="w-5 h-5 mr-1.5" />, style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700' };

  const headlineLabel = isCountMode ? 'ความคืบหน้าการประเมิน' : 'คะแนนสะสม';
  const headlineValue = isCountMode ? `${toThaiNumerals(completedCount)} / ${toThaiNumerals(totalCount)}` : `${toThaiNumerals(progress.earned_score)} / ${toThaiNumerals(progress.max_score)}`;
  const headlineSuffix = isCountMode ? 'รายการที่ตรวจแล้ว' : 'คะแนน';

  return (
    <div className={`w-full rounded-3xl border ${theme.border} ${theme.bg} shadow-sm backdrop-blur-md px-5 py-5 md:px-6 md:py-6 flex flex-col gap-5 transition-all`}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Award className={`w-5 h-5 ${theme.icon}`} />
            <h3 className={`font-bold ${theme.text} text-sm md:text-base`}>{headlineLabel}</h3>
          </div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1 mb-2">
            <span className={`text-3xl font-bold font-sarabun leading-none ${theme.text}`}>{headlineValue}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{headlineSuffix}</span>
          </div>
          <div className={`w-full h-3 ${theme.barBg} rounded-full overflow-hidden`}>
            <div
              className={`h-full ${theme.barFill} transition-all duration-1000 ease-out`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>ความคืบหน้า {toThaiNumerals(progressPercent)}%</span>
            <span>{isCountMode ? 'ผ่านได้เมื่อทุกคำตอบผ่านครบทั้งหมด' : `เกณฑ์ขั้นต่ำ ${toThaiNumerals(progress.passing_score)}%`}</span>
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end shrink-0 gap-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            สถานะผลประเมิน
          </div>
          <div className={`flex items-center px-4 py-2 border rounded-full font-bold shadow-sm transition-all ${statusConfig.style}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isCountMode
              ? `ผ่านแล้ว ${toThaiNumerals(passedCount)} / ${toThaiNumerals(totalCount)} รายการ`
              : `ผลสัมฤทธิ์ ${toThaiNumerals(performancePercent)}%`}
          </div>
        </div>
      </div>

      {isCountMode && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-800/60 bg-white/70 dark:bg-slate-900/40 px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-semibold">ผ่านแล้ว</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{toThaiNumerals(passedCount)}</div>
          </div>
          <div className="rounded-2xl border border-amber-200/70 dark:border-amber-800/60 bg-white/70 dark:bg-slate-900/40 px-4 py-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <FileCheck2 className="w-4 h-4" />
              <span className="text-xs font-semibold">รอตรวจ / รอดำเนินการ</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{toThaiNumerals(pendingCount)}</div>
          </div>
          <div className="rounded-2xl border border-rose-200/70 dark:border-rose-800/60 bg-white/70 dark:bg-slate-900/40 px-4 py-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-semibold">ต้องปรับปรุง</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{toThaiNumerals(needsImprovementCount)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreProgressBanner;
