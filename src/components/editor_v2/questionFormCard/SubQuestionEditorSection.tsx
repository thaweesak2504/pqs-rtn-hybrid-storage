import React from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { ListChecks, CheckCircle, Trash2, GripVertical } from 'lucide-react';
import Tooltip from '../../ui/Tooltip';
import { toThaiAlphabet } from '../../../utils/thaiNumbering';
import { DbBranch, DbSubBranch, DbSubQuestion, SubQuestionItem } from './types';

interface SubQuestionEditorSectionProps {
  sqClr: {
    border: string;
    bg: string;
    bgMuted: string;
    bgPrimary: string;
    text: string;
    textPrimary: string;
    textWhite: string;
    textBold: string;
    textDim: string;
    count: string;
    toggle: string;
    btn: string;
    editBtn: string;
    addBtn: string;
    inputBd: string;
    selectBd: string;
    code: string;
    itemBd: string;
    itemText: string;
    activeBg: string;
    check: string;
    activeAll: string;
    bindWrap: string;
  };
  useSubQuestions: boolean;
  setUseSubQuestions: (val: boolean) => void;
  setActiveSubQCodes: React.Dispatch<React.SetStateAction<string[]>>;
  formScoreType: string;
  setFormScoreType: (type: string) => void;
  setFormScoreIsScored: (val: boolean) => void;
  setEffectiveIsGroupHeader: (val: boolean) => void;
  sectionOccupationBranches?: Record<string, { name: string; subs: Record<string, string> }>;
  sectionSelectedBranch?: { main: string; sub: string };
  selMainBranch: string;
  setSelMainBranch: (val: string) => void;
  selSubBranch: string;
  setSelSubBranch: (val: string) => void;
  dbBranches: DbBranch[];
  dbSubBranches: DbSubBranch[];
  autoCodePrefix: string;
  filteredItems: SubQuestionItem[];
  dbSubQuestions: DbSubQuestion[];
  is300: boolean;
  isProtectedBranch: boolean;
  setDbSubQuestions: React.Dispatch<React.SetStateAction<DbSubQuestion[]>>;
  subQuestionList: SubQuestionItem[];
  setSubQuestionList: React.Dispatch<React.SetStateAction<SubQuestionItem[]>>;
  activeSubQCodes: string[];
}

export const SubQuestionEditorSection: React.FC<SubQuestionEditorSectionProps> = ({
  sqClr,
  useSubQuestions,
  setUseSubQuestions,
  setActiveSubQCodes,
  formScoreType,
  setFormScoreType,
  setFormScoreIsScored,
  setEffectiveIsGroupHeader,
  sectionOccupationBranches,
  sectionSelectedBranch,
  selMainBranch,
  setSelMainBranch,
  selSubBranch,
  setSelSubBranch,
  dbBranches,
  dbSubBranches,
  autoCodePrefix,
  filteredItems,
  dbSubQuestions,
  is300,
  isProtectedBranch,
  setDbSubQuestions,
  subQuestionList,
  setSubQuestionList,
  activeSubQCodes,
}) => {
  return (
    <div className={`rounded-lg border ${sqClr.border} ${sqClr.bg} p-3 space-y-2`}>
      {/* Header + Opt-in Toggle */}
      <div className="flex items-center gap-2">
        <ListChecks className={`w-4 h-4 ${sqClr.text} shrink-0`} />
        <span className={`text-xs font-bold ${sqClr.textBold} uppercase tracking-wider flex-1`}>
          รายการคำถามย่อย (SubQuestion List)
        </span>
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <div className="relative inline-flex items-center">
            <input type="checkbox" checked={useSubQuestions}
              onChange={(e) => {
                const newValue = e.target.checked;
                setUseSubQuestions(newValue);
                if (!newValue) setActiveSubQCodes([]);

                // Auto-change from Exempted to Normal when enabling sub-questions
                if (newValue && formScoreType === 'exempted') {
                  setFormScoreType('normal');
                  setFormScoreIsScored(false); // Disable scoring initially
                }
                // Always set as Group Header when sub-questions are enabled
                if (newValue) {
                  setEffectiveIsGroupHeader(true); // Set as Group Header
                }
              }}
              className="sr-only peer" />
            <div className={`w-7 h-4 rounded-full bg-slate-300 dark:bg-slate-600 ${sqClr.toggle} transition-colors`}></div>
            <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-3"></div>
          </div>
          <span className={`text-[10px] font-semibold ${useSubQuestions ? sqClr.text : "text-slate-400 dark:text-slate-500"}`}>
            {useSubQuestions ? "ใช้งาน" : "ไม่ใช้"}
          </span>
        </label>
      </div>

      {useSubQuestions && (
        <div className="space-y-2">
          {/* Branch Selector Row */}
          <div className="flex flex-wrap gap-2 items-end">
            {/* Main Branch */}
            <div className="min-w-[140px] max-w-[280px] w-fit">
              <label className={`block text-[10px] ${sqClr.textDim} mb-0.5`}>
                สาขาอาชีพหลัก{sectionOccupationBranches && <span className="ml-1 text-[9px] text-slate-400">(จาก 2xx.2)</span>}
              </label>
              {!sectionOccupationBranches ? (
                <Tooltip
                  disabled={!sectionSelectedBranch}
                  content="ถูกบังคับใช้งานโดยระดับเอกสาร (แก้ไขไม่ได้)"
                  position="top-start"
                  className="w-full"
                >
                  <select value={selMainBranch} onChange={(e) => { setSelMainBranch(e.target.value); setSelSubBranch(""); }}
                    className={`w-full px-2 py-1.5 text-xs border ${sqClr.selectBd} rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none ${sectionSelectedBranch ? 'cursor-not-allowed opacity-80' : ''}`}
                    disabled={!!sectionSelectedBranch}>
                    <option value="">-- เลือก --</option>
                    {dbBranches.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                  </select>
                </Tooltip>
              ) : (
                /* 2xx.4: disabled select แสดงค่าจาก DB (เหมือน 2xx.2) */
                <Tooltip
                  content="แสดงค่าที่เลือกมาจากข้อย่อย 2xx.2"
                  position="top-start"
                  className="w-full"
                >
                  <select value={selMainBranch} disabled
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none cursor-not-allowed opacity-80">
                    <option value="">-- ไม่ได้เลือกใน 2xx.2 --</option>
                    {dbBranches.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                  </select>
                </Tooltip>
              )}
            </div>

            {/* Sub Branch */}
            {selMainBranch && (
              <div className="min-w-[140px] max-w-[280px] w-fit">
                <label className={`block text-[10px] ${sqClr.textDim} mb-0.5`}>สาขาย่อย</label>
                {!sectionOccupationBranches ? (
                  <Tooltip
                    disabled={!sectionSelectedBranch}
                    content="ถูกบังคับใช้งานโดยระดับเอกสาร (แก้ไขไม่ได้)"
                    position="top-start"
                    className="w-full"
                  >
                    <select value={selSubBranch} onChange={(e) => setSelSubBranch(e.target.value)}
                      className={`w-full px-2 py-1.5 text-xs border ${sqClr.selectBd} rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none ${sectionSelectedBranch ? 'cursor-not-allowed opacity-80' : ''}`}
                      disabled={!!sectionSelectedBranch}>
                      <option value="">-- เลือก --</option>
                      {dbSubBranches.map(sb => <option key={sb.code} value={sb.code}>{sb.code} - {sb.name}</option>)}
                    </select>
                  </Tooltip>
                ) : (
                  /* 2xx.4: disabled select แสดงค่าจาก DB (เหมือน 2xx.2) */
                  <Tooltip
                    content="แสดงค่าที่เลือกมาจากข้อย่อย 2xx.2"
                    position="top-start"
                    className="w-full"
                  >
                    <select value={selSubBranch} disabled
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none cursor-not-allowed opacity-80">
                      <option value="">-- ไม่ได้เลือกใน 2xx.2 --</option>
                      {dbSubBranches.map(sb => <option key={sb.code} value={sb.code}>{sb.code} - {sb.name}</option>)}
                    </select>
                  </Tooltip>
                )}
              </div>
            )}

            {/* Auto code display */}
            {autoCodePrefix && (
              <div className="shrink-0">
                <label className={`block text-[10px] ${sqClr.textDim} mb-0.5`}>รหัส (Auto)</label>
                <div className={`px-2 py-1.5 text-xs font-mono font-bold ${sqClr.code} rounded`}>
                  {autoCodePrefix}
                </div>
              </div>
            )}
          </div>

          {/* Filtered item list for current branch */}
          {filteredItems.length > 0 && (
            <div className="grid grid-cols-1 gap-0.5">
              {filteredItems.map((item, localIdx) => {
                const dbSq = dbSubQuestions.find(sq => sq.code === item.code);
                const isLastItem = localIdx === filteredItems.length - 1;
                // For protected branch in 300-series: last item shows forced badge, no actions on any item
                const showForcedBadge = is300 && item.alwaysChecked && (!isProtectedBranch || isLastItem);
                const showActionButtons = !isProtectedBranch;
                return (
                  <div key={item.code} className={`flex items-center gap-2 px-2 py-1 bg-white dark:bg-slate-900/60 border ${sqClr.itemBd} rounded-md group/sq-item`}>
                    <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                    <span className={`text-xs font-bold ${sqClr.itemText} min-w-[1.5ch]`}>{toThaiAlphabet(localIdx + 1)}.</span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded shrink-0">{item.code}</span>
                    <span className="flex-1 text-xs text-slate-700 dark:text-slate-200 truncate">{item.text}</span>
                    {showForcedBadge && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full shrink-0">บังคับ ✓</span>}
                    {showActionButtons && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/sq-item:opacity-100 transition-opacity">
                        {is300 && (
                          <Tooltip content={item.alwaysChecked ? "ยกเลิกบังคับ" : "บังคับเลือกเสมอ"}>
                            <button onClick={async () => { if (dbSq) { const newAc = !item.alwaysChecked; await invoke('update_occupation_sub_question', { id: dbSq.id, text: dbSq.text, alwaysChecked: newAc }); setDbSubQuestions(prev => prev.map(s => s.id === dbSq.id ? { ...s, always_checked: newAc } : s)); if (newAc && useSubQuestions) { setActiveSubQCodes(prev => Array.from(new Set([...prev, item.code]))); } } else { const gi = subQuestionList.findIndex(sq => sq.code === item.code); const u = [...subQuestionList]; const ugi = u[gi]; if (ugi) { u[gi] = { ...ugi, alwaysChecked: !ugi.alwaysChecked }; setSubQuestionList(u); } if (!item.alwaysChecked && useSubQuestions) { setActiveSubQCodes(prev => Array.from(new Set([...prev, item.code]))); } } }}
                                className={`p-0.5 rounded transition-colors ${item.alwaysChecked ? 'text-emerald-500 hover:text-slate-400' : 'text-slate-400 hover:text-emerald-500'}`}>
                                <CheckCircle className="w-3 h-3" />
                            </button>
                          </Tooltip>
                        )}
                        <Tooltip content="ลบ">
                          <button onClick={async () => { if (dbSq) { await invoke('delete_occupation_sub_question', { id: dbSq.id }); setDbSubQuestions(prev => prev.filter(s => s.id !== dbSq.id)); } else { setSubQuestionList(prev => prev.filter(sq => sq.code !== item.code)); } }} className="p-0.5 text-slate-400 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 2: Select active items for children */}
          {filteredItems.length > 0 && autoCodePrefix && (() => {
            const branchCodes = filteredItems.map(sq => sq.code);
            const alwaysCodes = filteredItems.filter(sq => sq.alwaysChecked).map(sq => sq.code);
            const activeInBranch = Array.from(new Set([
              ...activeSubQCodes.filter(c => branchCodes.includes(c)),
              ...alwaysCodes,
            ]));
            const allActive = activeInBranch.length === filteredItems.length;
            return (
              <div className={`pt-2 border-t ${sqClr.border}`}>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <CheckCircle className={`w-3.5 h-3.5 ${sqClr.text}`} />
                  <span className={`text-xs font-bold ${sqClr.textBold} uppercase tracking-wider flex-1`}>เลือกข้อย่อยที่ใช้งาน</span>
                  <span className={`text-[10px] ${sqClr.count}`}>{activeInBranch.length}/{filteredItems.length}</span>
                  <div className="flex gap-1 ml-auto">
                    <button type="button" onClick={() => setActiveSubQCodes(prev => [...prev.filter(c => !branchCodes.includes(c)), ...branchCodes])}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors ${allActive ? sqClr.activeAll : sqClr.addBtn}`}>เลือกทั้งหมด</button>
                    <button type="button" onClick={() => setActiveSubQCodes(prev => [...prev.filter(c => !branchCodes.includes(c)), ...alwaysCodes])}
                      className="px-2 py-0.5 text-[10px] font-bold rounded border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100">ยกเลิกทั้งหมด</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-0.5">
                  {filteredItems.map((sq, idx) => {
                    const isForced = is300 && sq.alwaysChecked === true;
                    const isActive = isForced || activeSubQCodes.includes(sq.code);
                    return (
                      <label key={sq.code} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer select-none text-xs ${isActive ? sqClr.activeBg + ' text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'} ${isForced ? 'opacity-80' : ''}`}>
                        <input type="checkbox" checked={isActive} disabled={isForced} onChange={() => { if (isForced) return; setActiveSubQCodes(prev => isActive ? prev.filter(c => c !== sq.code) : [...prev, sq.code]); }}
                          className={`w-3 h-3 rounded ${sqClr.check}`} />
                        <span className={`font-bold ${sqClr.textBold} min-w-[1.5ch]`}>{toThaiAlphabet(idx + 1)}.</span>
                        <span className="flex-1 truncate">{sq.text}</span>
                        {isForced && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full shrink-0">บังคับ ✓</span>}
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-600">{sq.code}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
