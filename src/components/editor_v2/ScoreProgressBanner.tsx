import { invoke } from '@tauri-apps/api/tauri';
import { Award, CheckCircle2, CircleDashed, Clock } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface ScoreProgressBannerProps {
  documentId: string;
  sectionId: number;
  sectionGroup: 100 | 200; // Determines theme color (Green vs Orange)
  refreshTrigger?: number; // Prop to force re-fetch when new answers are saved
}

interface ProgressData {
  earned_score: number;
  max_score: number;
  completion_percentage: number;
  is_passed: boolean;
  passing_score: number;
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
      if (!sectionId) return;
      try {
        setLoading(true);
        const result = await invoke<ProgressData>('get_section_progress', {
          userId: MOCK_TRAINEE_ID,
          documentId: documentId,
          sectionId: sectionId,
        }).catch((e) => {
          console.warn("get_section_progress failed:", e);
          return null;
        });

        if (isMounted) {
          setProgress(result ?? {
            earned_score: 0,
            max_score: 0,
            completion_percentage: 0.0,
            is_passed: false,
            passing_score: 70
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

  if (!progress || progress.max_score === 0) {
    return null; // Don't show if there's no max score (no questions to score)
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
  const scorePercent = Math.min(100, Math.round((progress.earned_score / progress.max_score) * 100)) || 0;

  // Status Badge Logic
  const statusConfig = isPassed
    ? { label: 'ผ่านเกณฑ์', icon: <CheckCircle2 className="w-5 h-5 mr-1.5" />, style: theme.passedBg }
    : progress.completion_percentage >= 100
      ? { label: 'ไม่ผ่านเกณฑ์', icon: <CircleDashed className="w-5 h-5 mr-1.5" />, style: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border-rose-300 dark:border-rose-700' }
      : { label: 'กำลังดำเนินการ', icon: <Clock className="w-5 h-5 mr-1.5" />, style: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600' };

  return (
    <div className={`w-full rounded-2xl border ${theme.border} ${theme.bg} shadow-sm backdrop-blur-md px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all`}>

      {/* 1. Score Bar (Left/Main) */}
      <div className="flex-1 w-full flex flex-col gap-2">
        <div className="flex items-end justify-between mb-1">
          <div className="flex items-center gap-2">
            <Award className={`w-5 h-5 ${theme.icon}`} />
            <h3 className={`font-bold ${theme.text} text-sm`}>คะแนนสะสม</h3>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold font-sarabun leading-none ${theme.text}`}>
              {toThaiNumerals(progress.earned_score)}
            </span>
            <span className="text-sm font-sarabun text-slate-500 dark:text-slate-400">
              / {toThaiNumerals(progress.max_score)}
            </span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className={`w-full h-2.5 ${theme.barBg} rounded-full overflow-hidden`}>
          <div
            className={`h-full ${theme.barFill} transition-all duration-1000 ease-out`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          <span>ความสำเร็จ: {scorePercent}%</span>
          <span>เกณฑ์ขั้นต่ำ: {toThaiNumerals(progress.passing_score)}%</span>
        </div>
      </div>

      {/* 2. Divider (Desktop only) */}
      <div className={`hidden sm:block w-px h-12 bg-slate-200 dark:bg-slate-700/50`}></div>

      {/* 3. Status Badge (Right) */}
      <div className="flex flex-col items-end shrink-0">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
          สถานะประเมินผล
        </div>
        <div className={`flex items-center px-4 py-2 border rounded-full font-bold shadow-sm transition-all ${statusConfig.style}`}>
          {statusConfig.icon}
          {statusConfig.label}
        </div>
      </div>

    </div>
  );
};

export default ScoreProgressBanner;
