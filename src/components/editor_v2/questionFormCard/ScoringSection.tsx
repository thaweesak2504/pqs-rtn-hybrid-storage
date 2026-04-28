import React from 'react';
import { RequiredCountChild } from './types';
import { toThaiAlphabet } from '../../../utils/thaiNumbering';

interface ScoringSectionProps {
  is300: boolean;
  formScoreType: string;
  isFixedPracticeL1: boolean;
  isPrerequisiteQuestion: boolean;
  isPrerequisiteChild: boolean;
  isSection300Selector: boolean;
  isSection100Selector: boolean;
  isSection200Selector: boolean;
  isExamChild: boolean;
  isPerformanceL2: boolean;
  is306L1: boolean;
  isRequiredInstance: boolean;
  effectiveIsGroupHeader: boolean;
  requiredCount: number;
  formScoreValue: string;
  setFormScoreValue: (val: string) => void;
  formScoreIsScored: boolean;
  setFormScoreIsScored: (val: boolean) => void;
  requiredCountChildren: RequiredCountChild[];
  scorePerInstance: number;
  setScorePerInstance: (val: number) => void;
  setRequiredCount: (val: number | ((prev: number) => number)) => void;
  handleSyncRequiredCount: () => void;
  existingId: string | null;
  generatedId: string | null;
  parentId: string | null;
  prefix: string;
}

export const ScoringSection: React.FC<ScoringSectionProps> = ({
  is300,
  formScoreType,
  isFixedPracticeL1,
  isPrerequisiteQuestion,
  isPrerequisiteChild,
  isSection300Selector,
  isSection100Selector,
  isSection200Selector,
  isExamChild,
  isPerformanceL2,
  is306L1,
  isRequiredInstance,
  effectiveIsGroupHeader,
  requiredCount,
  formScoreValue,
  setFormScoreValue,
  formScoreIsScored,
  setFormScoreIsScored,
  requiredCountChildren,
  scorePerInstance,
  setScorePerInstance,
  setRequiredCount,
  handleSyncRequiredCount,
  existingId,
  generatedId,
  parentId,
  prefix
}) => {
  if (!is300 || formScoreType === 'exempted' || isFixedPracticeL1) return null;

  // Conditions for hiding scoring section
  const shouldHideScoring = (isPerformanceL2 || is306L1) 
    ? (effectiveIsGroupHeader || requiredCount > 0) 
    : effectiveIsGroupHeader;

  const isSpecialQuestion = isPrerequisiteQuestion || isPrerequisiteChild || isSection300Selector || isSection100Selector || isSection200Selector || isExamChild;

  return (
    <>
      {/* Scoring fields */}
      {!shouldHideScoring && !isSpecialQuestion && (
        <div className="rounded-md border border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/20 p-2 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">คะแนน</span>
            {isPerformanceL2 && requiredCount === 0 && !isRequiredInstance ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={formScoreValue}
                  onChange={(e) => setFormScoreValue(e.target.value)}
                  className={`w-16 px-2 py-0.5 text-xs border rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-purple-400 ${parseInt(formScoreValue) === 0
                    ? 'border-red-300 dark:border-red-700 ring-1 ring-red-400'
                    : 'border-purple-300 dark:border-purple-700'
                    }`}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">คะแนน</span>
                {parseInt(formScoreValue) === 0 && (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                    ไม่กำหนดจำนวนครั้ง ต้องกำหนดคะแนน
                  </span>
                )}
              </div>
            ) : (
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formScoreIsScored}
                  onChange={(e) => setFormScoreIsScored(e.target.checked)}
                  disabled={effectiveIsGroupHeader}
                  className="accent-purple-600 w-3.5 h-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                มีคะแนน (is_scored)
              </label>
            )}
            {formScoreIsScored && !(isPerformanceL2 && requiredCount === 0) && (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={formScoreValue}
                  onChange={(e) => setFormScoreValue(e.target.value)}
                  className="w-16 px-2 py-0.5 text-xs border border-purple-300 dark:border-purple-700 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-purple-400"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">คะแนน</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Required Count section */}
      {(isPerformanceL2 || is306L1) && !isRequiredInstance && (
        <div className="rounded-md border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-950/20 p-2 space-y-2">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">จำนวนครั้งที่ต้องปฏิบัติ</span>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-600 dark:text-slate-300">จำนวนครั้ง</label>
              <button
                type="button"
                onClick={() => setRequiredCount(prev => Math.max(0, prev - 1))}
                className="w-6 h-6 flex items-center justify-center rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-sm font-bold"
              >−</button>
              <input
                type="number"
                min="0"
                max="20"
                value={requiredCount}
                onChange={(e) => setRequiredCount(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                className="w-12 px-1 py-0.5 text-xs text-center border border-indigo-300 dark:border-indigo-700 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={() => setRequiredCount(prev => Math.min(20, prev + 1))}
                className="w-6 h-6 flex items-center justify-center rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-sm font-bold"
              >+</button>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-600 dark:text-slate-300">คะแนน/ครั้ง</label>
              <input
                type="number"
                min="0"
                value={scorePerInstance}
                onChange={(e) => setScorePerInstance(parseInt(e.target.value) || 0)}
                className="w-14 px-1 py-0.5 text-xs text-center border border-indigo-300 dark:border-indigo-700 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            {requiredCount > 0 && (
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                รวม {requiredCount} × {scorePerInstance} = {requiredCount * scorePerInstance} คะแนน
              </span>
            )}
            {(requiredCount > 0 || requiredCountChildren.length > 0) && (existingId || generatedId || parentId) ? (
              <button
                type="button"
                onClick={handleSyncRequiredCount}
                className="px-3 py-1 text-xs font-medium rounded bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
              >
                ✓ อัปเดต
              </button>
            ) : null}
          </div>
          {requiredCountChildren.length > 0 && (
            <div className="mt-2 space-y-2">
              {requiredCountChildren.map((child, idx) => (
                <div key={child.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pl-2">
                  <span className="text-indigo-500 font-medium">{is306L1 ? `${prefix}.${child.sequence}` : `${toThaiAlphabet(idx + 1)}.`}</span>
                  <span className="flex-1 truncate">{child.content}</span>
                  <span className="text-indigo-500 font-medium">{child.score} คะแนน</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Group Header Info */}
      {effectiveIsGroupHeader && !isSection300Selector && (
        <div className="rounded-md border border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/20 p-2">
          <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
            <span className="font-bold uppercase tracking-wider">Group Header</span>
            <span>• คะแนนรวมคำนวณอัตโนมัติจากคำถามย่อย (auto-calc)</span>
          </div>
        </div>
      )}
    </>
  );
};
