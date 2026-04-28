import React from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { logger } from '../../../utils/logger';
import Tooltip from '../../ui/Tooltip';
import { SectionItem, SectionRefChild } from './types';

interface SectionPickerSectionProps {
  is300: boolean;
  isSection300Selector: boolean;
  isSection100Selector: boolean;
  isSection200Selector: boolean;
  formScoreType: string;
  setFormScoreType: (type: string) => void;
  setFormScoreDisplayText: (text: string) => void;
  sectionRefChildren: SectionRefChild[];
  setSectionRefChildren: React.Dispatch<React.SetStateAction<SectionRefChild[]>>;
  isEdit: boolean;
  existingId?: string | null;
  sectionId?: number;
  documentId: string;
  availableSections: SectionItem[];
  currentSectionNumber?: number;
  backRefSectionIds: Set<number>;
  handleAddSectionRef: (targetSectionId: number, targetSectionNumber: string, targetSectionTitle: string) => Promise<void>;
  handleRemoveSectionRef: (childQuestionId: string) => Promise<void>;
  setShowDescription: (val: boolean) => void;
  fetchSectionRefChildren: () => Promise<void>;
}

export const SectionPickerSection: React.FC<SectionPickerSectionProps> = ({
  is300,
  isSection300Selector,
  isSection100Selector,
  isSection200Selector,
  formScoreType,
  setFormScoreType,
  setFormScoreDisplayText,
  sectionRefChildren,
  setSectionRefChildren,
  isEdit,
  existingId,
  sectionId,
  documentId,
  availableSections,
  currentSectionNumber,
  backRefSectionIds,
  handleAddSectionRef,
  handleRemoveSectionRef,
  setShowDescription,
  fetchSectionRefChildren,
}) => {
  if (!is300 || (!isSection300Selector && !isSection100Selector && !isSection200Selector)) {
    return null;
  }

  return (
    <div className="rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-2 space-y-2">
      {/* Single checkbox: ปฏิบัติ / ไม่ต้องปฏิบัติ */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">การปฏิบัติ</span>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={formScoreType === 'exempted'}
            onChange={async (e) => {
              const isExempted = e.target.checked;
              const newType = isExempted ? 'exempted' : 'normal';
              setFormScoreType(newType);
              if (isExempted) {
                setFormScoreDisplayText('(ไม่ต้องปฏิบัติ)');
                if (existingId) {
                  try {
                    await invoke('remove_all_section_ref_children', { parentId: existingId });
                    fetchSectionRefChildren();
                  } catch (err) { logger.error('Failed cleanup ref children:', err); }
                }
                setShowDescription(false);
              } else {
                setFormScoreDisplayText('');
                setShowDescription(true);
              }
            }}
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

      {/* When NOT exempted: show section list directly */}
      {formScoreType !== 'exempted' && (
        <div className="space-y-2">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {isSection300Selector ? 'เลือก Section 300 ที่ต้องผ่าน' : isSection100Selector ? 'เลือก Section 100 ที่ต้องผ่าน' : 'เลือก Section 200 ที่ต้องผ่าน'}
            </span>
          </div>

          {/* Current L3 section-ref children summary with score */}
          {sectionRefChildren.length > 0 && (
            <div className="space-y-0.5">
              {sectionRefChildren.map(child => (
                <div key={child.id} className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300">
                  <span className="font-medium">{child.ref_section_number}</span>
                  <span className="flex-1">{child.content}</span>
                  {/* Show score for 3xx.1.3/3xx.1.4/3xx.1.5 */}
                  {isEdit && (
                    <Tooltip content="คะแนน">
                      <input
                        type="number"
                        min={0}
                        value={child.score}
                        onChange={(e) => {
                          const newScore = parseInt(e.target.value) || 0;
                          setSectionRefChildren(prev => prev.map(c => c.id === child.id ? { ...c, score: newScore } : c));
                        }}
                        onBlur={async (e) => {
                          const newScore = parseInt(e.target.value) || 0;
                          try {
                            await invoke('update_section_ref_score', { questionId: child.id, score: newScore });
                          } catch (err) { logger.error('Failed to update section ref score:', err); }
                        }}
                        className="w-12 text-center text-xs px-1 py-0.5 border border-purple-200 dark:border-purple-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                      />
                    </Tooltip>
                  )}
                  {!isEdit && child.score > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                      {child.score} คะแนน
                    </span>
                  )}
                </div>
              ))}
              {/* Show total score for 3xx.1.3/3xx.1.4/3xx.1.5 */}
              {(
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-200 border-t border-purple-200 dark:border-purple-700 pt-1 mt-1">
                  <span>รวม</span>
                  <span className="ml-auto">{sectionRefChildren.reduce((sum, c) => sum + c.score, 0)} คะแนน</span>
                </div>
              )}
            </div>
          )}

          {/* Section checkboxes — always visible when ต้องปฏิบัติ, edit mode + saved only */}
          {isEdit && existingId && sectionId ? (
            <div className="border border-purple-200 dark:border-purple-700 rounded bg-white dark:bg-slate-800 max-h-56 overflow-y-auto">
              {availableSections.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400">ไม่พบ Section ในกลุ่มนี้</div>
              ) : (<>
                <div className="sticky top-0 z-10 flex gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-800/50">
                  <button type="button" onClick={async () => {
                    const unchecked = availableSections
                      .filter(s => !sectionRefChildren.find(c => c.ref_section_id === s.id))
                      .filter(s => !(currentSectionNumber !== undefined && s.section_number === currentSectionNumber))
                      .filter(s => !backRefSectionIds.has(s.id));
                    if (unchecked.length === 0) return;
                    try {
                      const children = await invoke<SectionRefChild[]>('batch_add_section_ref_children', {
                        args: {
                          parent_id: existingId, document_id: documentId, section_id: sectionId,
                          ref_section_ids: unchecked.map(s => s.id)
                        }
                      });
                      setSectionRefChildren(prev => [...prev, ...children].sort((a, b) => a.ref_section_number - b.ref_section_number));
                    } catch (err) { logger.error('Failed batch add:', err); }
                  }} className="text-[10px] font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30">
                    เลือกทั้งหมด
                  </button>
                  <button type="button" onClick={async () => {
                    if (sectionRefChildren.length === 0) return;
                    try {
                      await invoke('remove_all_section_ref_children', { parentId: existingId });
                      setSectionRefChildren([]);
                    } catch (err) { logger.error('Failed batch remove:', err); }
                  }} className="text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                    ยกเลิกทั้งหมด
                  </button>
                </div>
                <div className="py-1">
                  {availableSections.map(sec => {
                    const child = sectionRefChildren.find(c => c.ref_section_id === sec.id);
                    const isChecked = !!child;
                    const isSelf = currentSectionNumber !== undefined && sec.section_number === currentSectionNumber;
                    const isBackRef = backRefSectionIds.has(sec.id);
                    const isDisabled = isSelf || isBackRef;

                    return (
                      <label key={sec.id} className={`flex items-start gap-2 px-3 py-1.5 cursor-pointer text-xs ${isChecked ? 'bg-purple-50/50 dark:bg-purple-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className="flex items-center h-4 mt-0.5">
                          <input type="checkbox" checked={isChecked} disabled={isDisabled} onChange={() => { if (isDisabled) return; if (isChecked) { handleRemoveSectionRef(child.id); } else { handleAddSectionRef(sec.id, sec.section_number.toString(), sec.title_th); } }} className="w-3 h-3 text-purple-600 accent-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold ${isChecked ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-200'}`}>
                            {sec.menu_label}
                            {isSelf && <span className="ml-2 text-[10px] font-normal text-red-500">(ตัวเอง)</span>}
                            {isBackRef && <span className="ml-2 text-[10px] font-normal text-red-500">(มีการอ้างอิงกลับ)</span>}
                          </div>
                          <div className="text-slate-500 truncate">{sec.title_th}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>)}
            </div>
          ) : (
            <div className="text-xs text-amber-600 dark:text-amber-400 italic">
              ต้องบันทึกคำถามก่อน จึงจะเลือก Section ที่เกี่ยวข้องได้
            </div>
          )}
        </div>
      )}
    </div>
  );
};
