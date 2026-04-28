import React from 'react';
import { SubQuestionItem } from './types';
import { toThaiAlphabet } from '../../../utils/thaiNumbering';
import AnswerKeyEditor from '../AnswerKeyEditor';

interface AnswerKeySectionProps {
  is300: boolean;
  isDefaultL1: boolean;
  requireAnswerKey: boolean;
  showSubQuestionEditor: boolean;
  useSubQuestions: boolean;
  activeSubQCodes: string[];
  hasParentSubQ: boolean;
  selectedSubQCodes: string[];
  parentSubQuestionList?: SubQuestionItem[];
  answerKeys: Record<string, string>;
  setAnswerKeys: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  answerKey: string;
  setAnswerKey: (val: string) => void;
  errors: Record<string, boolean>;
  setErrors: (val: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
}

export const AnswerKeySection: React.FC<AnswerKeySectionProps> = ({
  is300,
  isDefaultL1,
  requireAnswerKey,
  showSubQuestionEditor,
  useSubQuestions,
  activeSubQCodes,
  hasParentSubQ,
  selectedSubQCodes,
  parentSubQuestionList,
  answerKeys,
  setAnswerKeys,
  answerKey,
  setAnswerKey,
  errors,
  setErrors
}) => {
  if (is300 || isDefaultL1 || !requireAnswerKey) return null;

  // Hide when sub-questions are enabled but none selected
  if (showSubQuestionEditor && useSubQuestions && activeSubQCodes.length === 0) return null;
  if (hasParentSubQ && selectedSubQCodes.length === 0) return null;

  return (
    <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2">
      {hasParentSubQ && selectedSubQCodes.length > 0 ? (
        /* Per-subQ answer keys */
        selectedSubQCodes.map((code) => {
          const sq = parentSubQuestionList?.find(s => s.code === code);
          const sqIdx = parentSubQuestionList?.findIndex(s => s.code === code);
          const label = sqIdx !== undefined && sqIdx >= 0 ? toThaiAlphabet(sqIdx + 1) : code;
          const hasErr = !!errors.answerKey && !(answerKeys[code] || "").trim();
          return (
            <div key={code}>
              <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                เฉลย: {label}. {sq?.text && <span className="font-normal normal-case text-slate-400 dark:text-slate-500 ml-1">{sq.text}</span>}
              </label>
              <AnswerKeyEditor
                value={answerKeys[code] || ""}
                onChange={(val: string) => {
                  setAnswerKeys(prev => ({ ...prev, [code]: val }));
                  if (errors.answerKey) setErrors(prev => ({ ...prev, answerKey: false }));
                }}
                hasError={hasErr}
              />
            </div>
          );
        })
      ) : (
        /* Single answer key (no subQ selected) */
        <div>
          <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            เฉลย (Answer Key)
          </label>
          <AnswerKeyEditor
            value={answerKey}
            onChange={(val: string) => {
              setAnswerKey(val);
              if (errors.answerKey) setErrors((prev) => ({ ...prev, answerKey: false }));
            }}
            hasError={!!errors.answerKey}
          />
        </div>
      )}
    </div>
  );
};
