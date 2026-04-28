import React from 'react';
import { ListChecks } from 'lucide-react';
import Button from '../../ui/Button';
import { toThaiAlphabet } from '../../../utils/thaiNumbering';
import { SubQuestionItem } from './types';

interface SubQuestionBindingSectionProps {
  sqClr: any;
  selectedSubQCodes: string[];
  setSelectedSubQCodes: React.Dispatch<React.SetStateAction<string[]>>;
  parentSubQuestionList: SubQuestionItem[] | undefined;
  is300: boolean;
  usage_map: Record<string, number>;
  total_children: number;
}

export const SubQuestionBindingSection: React.FC<SubQuestionBindingSectionProps> = ({
  sqClr,
  selectedSubQCodes,
  setSelectedSubQCodes,
  parentSubQuestionList,
  is300,
  usage_map,
  total_children,
}) => {
  if (!parentSubQuestionList || parentSubQuestionList.length === 0) return null;

  return (
    <div className={`rounded-lg border ${sqClr.bindWrap} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ListChecks className={`w-4 h-4 ${sqClr.text}`} />
          <span className={`text-xs font-bold ${sqClr.textBold} uppercase tracking-wider`}>เลือกคำถามย่อย (Select Sub-Questions)</span>
          <span className={`text-[10px] ${sqClr.count}`}>{selectedSubQCodes.length}/{parentSubQuestionList.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={selectedSubQCodes.length > 0 && selectedSubQCodes.length < parentSubQuestionList.filter(sq => !(is300 && sq.alwaysChecked === true)).length ? "primary" : "outline"}
            size="small"
            onClick={() => {
              const allCodes = parentSubQuestionList.filter(sq => !(is300 && sq.alwaysChecked === true)).map(sq => sq.code);
              setSelectedSubQCodes(allCodes);
            }}
            disabled={selectedSubQCodes.length === parentSubQuestionList.filter(sq => !(is300 && sq.alwaysChecked === true)).length}
            className={`text-xs px-1.5 py-0.5 ${is300 ? 'hover:border-purple-500' : ''}`}
          >
            เลือกทั้งหมด
          </Button>
          <Button
            variant={selectedSubQCodes.length > 0 ? "primary" : "outline"}
            size="small"
            onClick={() => setSelectedSubQCodes([])}
            disabled={selectedSubQCodes.length === 0}
            className={`text-xs px-1.5 py-0.5 ${is300 ? 'hover:border-purple-500' : ''}`}
          >
            ยกเลิกทั้งหมด
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {parentSubQuestionList.map((sq, idx) => {
          const isForced = is300 && sq.alwaysChecked === true;
          const isChecked = isForced || selectedSubQCodes.includes(sq.code);
          return (
            <label key={sq.code} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer select-none text-xs ${isChecked ? sqClr.activeBg + ' text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'} ${isForced ? 'opacity-70' : ''}`}>
              <input type="checkbox" checked={isChecked} disabled={isForced}
                onChange={() => { if (isForced) return; setSelectedSubQCodes(prev => isChecked ? prev.filter(c => c !== sq.code) : [...prev, sq.code]); }}
                className={`w-3 h-3 rounded ${sqClr.check}`} />
              <span className={`font-bold ${sqClr.textBold} min-w-[1.5ch]`}>{toThaiAlphabet(idx + 1)}.</span>
              <span className="flex-1">{sq.text}</span>
              {isForced && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full shrink-0">บังคับ ✓</span>}
              {/* Sub-question usage badge (from relational table) */}
              {!isForced && (() => {
                const count = usage_map[sq.code] || 0;
                const total = total_children;
                if (count === 0) {
                  return <span className="ml-auto text-[10px] px-2 py-[1px] rounded-full bg-orange-100 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 font-bold whitespace-nowrap">Unused (0/{total})</span>;
                }
                return <span className="ml-auto text-[10px] px-2 py-[1px] rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 font-bold whitespace-nowrap">Used: {count}/{total}</span>;
              })()}
            </label>
          );
        })}
      </div>
    </div>
  );
};
