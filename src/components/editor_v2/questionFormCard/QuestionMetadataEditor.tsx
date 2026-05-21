import Tooltip from "../../ui/Tooltip";
import { invoke } from "@tauri-apps/api/tauri";
import { logger } from "../../../utils/logger";
import { toThaiAlphabet } from "../../../utils/thaiNumbering";

// 1. Unified "ไม่ต้องปฏิบัติ" checkbox
export const ExemptedCheckbox = ({
  is300, isRequiredInstance, isPrerequisiteQuestion, isPrerequisiteChild,
  isPrerequisiteSubLevel,
  isSection300Selector, isSection100Selector, isSection200Selector, isExamChild,
  isFixedPracticeL1, isPerformanceL2, formScoreType, setFormScoreType,
  setFormScoreDisplayText, setFormScoreIsScored, setFormScoreValue,
  setDescription, setShowDescription, setUseSubQuestions, setRequiredCount,
  setRequiredCountChildren, questionAttachments, setQuestionAttachments,
  handleQuestionAttachmentDelete, isL1, hasActualChildren
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) => {
  if (!(is300 && !isRequiredInstance && !isPrerequisiteQuestion && !isPrerequisiteChild && !isPrerequisiteSubLevel && !isSection300Selector && !isSection100Selector && !isSection200Selector && !isExamChild && !isFixedPracticeL1 && !isPerformanceL2)) {
    return null;
  }
  return (
    <div className="rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">การปฏิบัติ</span>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={formScoreType === 'exempted'}
            onChange={(e) => {
              const isExempted = e.target.checked;
              setFormScoreType(isExempted ? 'exempted' : 'normal');
              if (isExempted) {
                setFormScoreDisplayText('(ไม่ต้องปฏิบัติ)');
                setFormScoreIsScored(false);
                setFormScoreValue('0');
                setDescription('');
                setShowDescription(false);
                setUseSubQuestions(false);
                setRequiredCount(0);
                setRequiredCountChildren([]);
                // Phase 5G: delete all question attachments when exempted
                if (questionAttachments && questionAttachments.length > 0) {
                  for (const p of questionAttachments) {
                    try { handleQuestionAttachmentDelete(p); } catch { /* ignore */ }
                  }
                  setQuestionAttachments([]);
                }
              } else {
                setFormScoreDisplayText('');
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
      {isL1 && hasActualChildren && formScoreType === 'exempted' && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded">
          <div className="flex items-start gap-2">
            <span className="text-red-600 dark:text-red-400 text-sm font-bold">⚠️</span>
            <div className="flex-1 text-xs text-red-700 dark:text-red-300">
              <div className="font-bold mb-1">คำเตือน: คำถามนี้มีคำถามย่อยอยู่</div>
              <div>เมื่อบันทึกเป็น "ไม่ต้องปฏิบัติ" คำถามย่อยทั้งหมดจะถูกลบออกจากฐานข้อมูลอัตโนมัติ</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 2. 200-series "ไม่ต้องอธิบาย" checkbox
export const ExemptedExplainCheckbox = ({
  isExemptableL1_200, formScoreType, setFormScoreType, setFormScoreDisplayText,
  setDescription, setShowDescription, setUseSubQuestions, questionAttachments,
  setQuestionAttachments, handleQuestionAttachmentDelete,
  isDefaultDescL1_200, questionSequence, isL1, hasActualChildren
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) => {
  if (!isExemptableL1_200) return null;
  return (
    <div className="rounded-md border border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-950/20 p-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">การอธิบาย</span>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={formScoreType === 'exempted'}
            onChange={(e) => {
              const isExempted = e.target.checked;
              setFormScoreType(isExempted ? 'exempted' : 'normal');
              if (isExempted) {
                setFormScoreDisplayText('(ไม่ต้องอธิบาย)');
                setDescription('');
                setShowDescription(false);
                setUseSubQuestions(false);
                // Phase 5G: delete all question attachments when exempted
                if (questionAttachments && questionAttachments.length > 0) {
                  for (const p of questionAttachments) {
                    try { handleQuestionAttachmentDelete(p); } catch { /* ignore */ }
                  }
                  setQuestionAttachments([]);
                }
              } else {
                setFormScoreDisplayText('');
                if (isDefaultDescL1_200 && questionSequence !== undefined) {
                  const DEFAULT_200_DESC: Record<number, string> = {
                    2: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคำถามที่กำหนด',
                    4: 'จงอธิบายค่าทำงานปกติ ค่าสูงสุด ต่ำสุด ของการทำงาน ตามรายการที่กำหนด',
                  };
                  setDescription(DEFAULT_200_DESC[questionSequence] || '');
                  setShowDescription(true);
                }
              }
            }}
            className="accent-orange-600 w-3.5 h-3.5"
          />
          ไม่ต้องอธิบาย
        </label>
        {formScoreType === 'exempted' && (
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded">
            (ไม่ต้องอธิบาย)
          </span>
        )}
      </div>
      {isL1 && hasActualChildren && formScoreType === 'exempted' && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded">
          <div className="flex items-start gap-2">
            <span className="text-red-600 dark:text-red-400 text-sm font-bold">⚠️</span>
            <div className="flex-1 text-xs text-red-700 dark:text-red-300">
              <div className="font-bold mb-1">คำเตือน: คำถามนี้มีรายการย่อยอยู่</div>
              <div>เมื่อบันทึกเป็น "ไม่ต้องอธิบาย" รายการย่อยทั้งหมดจะถูกลบออกจากฐานข้อมูลอัตโนมัติ</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 3. Score Input
export const ScoreInput = ({
  is300, formScoreType, isFixedPracticeL1, isPerformanceL2, is306L1,
  effectiveIsGroupHeader, requiredCount, isPrerequisiteQuestion,
  isPrerequisiteChild, isSection300Selector, isSection100Selector,
  isSection200Selector, isExamChild, isRequiredInstance,
  formScoreValue, setFormScoreValue, formScoreIsScored, setFormScoreIsScored
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) => {
  if (!(is300 && formScoreType !== 'exempted' && !isFixedPracticeL1 && !((isPerformanceL2 || is306L1) ? (effectiveIsGroupHeader || requiredCount > 0) : effectiveIsGroupHeader) && !isPrerequisiteQuestion && !isPrerequisiteChild && !isSection300Selector && !isSection100Selector && !isSection200Selector && !isExamChild)) {
    return null;
  }
  return (
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
  );
};

// 4. Required Count Input
export const RequiredCountInput = ({
  isPerformanceL2, is306L1, isRequiredInstance, formScoreType,
  requiredCount, setRequiredCount, scorePerInstance, setScorePerInstance,
  requiredCountChildren, existingId, generatedId, parentId,
  handleSyncRequiredCount, prefix
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) => {
  if (!((isPerformanceL2 || is306L1) && !isRequiredInstance && formScoreType !== 'exempted')) {
    return null;
  }
  return (
    <div className="rounded-md border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-950/20 p-2 space-y-2">
      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">จำนวนครั้งที่ต้องปฏิบัติ</span>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-600 dark:text-slate-300">จำนวนครั้ง</label>
          <button
            type="button"
            onClick={() => setRequiredCount((prev: number) => Math.max(0, prev - 1))}
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
            onClick={() => setRequiredCount((prev: number) => Math.min(20, prev + 1))}
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
          {/* eslint-disable @typescript-eslint/no-explicit-any */}
          {requiredCountChildren.map((child: any, idx: number) => (
            <div key={child.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pl-2">
              <span className="text-indigo-500 font-medium">{is306L1 ? `${prefix}.${child.sequence}` : `${toThaiAlphabet(idx + 1)}.`}</span>
              <span className="flex-1 truncate">{child.content}</span>
              <span className="text-indigo-500 font-medium">{child.score} คะแนน</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 5. Prerequisite Exempted
export const PrerequisiteExemptedCheckbox = ({
  is300, isPrerequisiteChild, formScoreType, setFormScoreType, setFormScoreDisplayText
 
}: any) => {
  if (!(is300 && isPrerequisiteChild)) return null;
  return (
    <div className="rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">การปฏิบัติ</span>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={formScoreType === 'exempted'}
            onChange={(e) => {
              const newType = e.target.checked ? 'exempted' : 'normal';
              setFormScoreType(newType);
              if (newType === 'exempted') {
                setFormScoreDisplayText('(ไม่ต้องปฏิบัติ)');
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
    </div>
  );
};

// 6. Section Picker
export const SectionPickerEditor = ({
  is300, isSection300Selector, isSection100Selector, isSection200Selector,
  formScoreType, setFormScoreType, setFormScoreDisplayText,
  sectionRefChildren, setSectionRefChildren, isEdit, existingId, sectionId,
  availableSections, currentSectionNumber, backRefSectionIds, documentId
 
}: any) => {
  if (!(is300 && (isSection300Selector || isSection100Selector || isSection200Selector))) {
    return null;
  }
  return (
    <div className="rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 p-2 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">การปฏิบัติ</span>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={formScoreType === 'exempted'}
            onChange={(e) => {
              const newType = e.target.checked ? 'exempted' : 'normal';
              setFormScoreType(newType);
              if (newType === 'exempted') {
                setFormScoreDisplayText('(ไม่ต้องปฏิบัติ)');
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

      {formScoreType !== 'exempted' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {isSection300Selector ? 'เลือก Section 300 ที่ต้องผ่าน' : isSection100Selector ? 'เลือก Section 100 ที่ต้องผ่าน' : 'เลือก Section 200 ที่ต้องผ่าน'}
            </span>
          </div>

          {sectionRefChildren.length > 0 && (
            <div className="space-y-0.5">
              {/* eslint-disable @typescript-eslint/no-explicit-any */}
              {sectionRefChildren.map((child: any) => (
                <div key={child.id} className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300">
                  <span className="font-medium">{child.ref_section_number}</span>
                  <span className="flex-1">{child.content}</span>
                  {isEdit && (
                    <Tooltip content="คะแนน">
                      <input
                        type="number"
                        min={0}
                        value={child.score}
                        onChange={(e) => {
                          const newScore = parseInt(e.target.value) || 0;
 
                          setSectionRefChildren((prev: any[]) => prev.map(c => c.id === child.id ? { ...c, score: newScore } : c));
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
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-200 border-t border-purple-200 dark:border-purple-700 pt-1 mt-1">
                <span>รวม</span>
                <span className="ml-auto">{sectionRefChildren.reduce((sum: number, c: unknown) => sum + (c as {score: number}).score, 0)} คะแนน</span>
              </div>
            </div>
          )}

          {isEdit && existingId && sectionId ? (
            <div className="border border-purple-200 dark:border-purple-700 rounded bg-white dark:bg-slate-800 max-h-56 overflow-y-auto">
              {availableSections.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400">ไม่พบ Section ในกลุ่มนี้</div>
              ) : (<>
                <div className="sticky top-0 z-10 flex gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-800/50">
                  <button type="button" onClick={async () => {
                    const unchecked = availableSections
 
                      .filter((s: any) => !sectionRefChildren.find((c: any) => c.ref_section_id === s.id))
 
                      .filter((s: any) => !(currentSectionNumber !== undefined && s.section_number === currentSectionNumber))
 
                      .filter((s: any) => !backRefSectionIds.has(s.id));
                    if (unchecked.length === 0) return;
                    try {
 
                      const children = await invoke<any[]>('batch_add_section_ref_children', {
                        args: {
                          parent_id: existingId, document_id: documentId, section_id: sectionId,
 
                          sections: unchecked.map((s: any) => ({ linked_section_id: s.id, linked_section_number: s.section_number, linked_section_title: s.title_th })),
                        }
                      });
                      setSectionRefChildren(children);
                    } catch (e) { logger.error('Failed to select all:', e); }
                  }} className="text-[10px] px-2 py-0.5 rounded bg-purple-600 text-white hover:bg-purple-700">เลือกทั้งหมด</button>
                  <button type="button" onClick={async () => {
                    try {
                      await invoke('remove_all_section_ref_children', { parentId: existingId });
                      setSectionRefChildren([]);
                    } catch (e) { logger.error('Failed to deselect all:', e); }
                  }} className="text-[10px] px-2 py-0.5 rounded border border-red-300 dark:border-red-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">ยกเลิกทั้งหมด</button>
                </div>
                <div className="divide-y divide-purple-100 dark:divide-purple-800/50">
                  {/* eslint-disable @typescript-eslint/no-explicit-any */}
                  {availableSections.map((s: any) => {
 
                    const existingChild = sectionRefChildren.find((c: any) => c.ref_section_id === s.id);
                    const checked = !!existingChild;
                    const isSelf = currentSectionNumber !== undefined && s.section_number === currentSectionNumber;
                    const isBackRef = backRefSectionIds.has(s.id);
                    const isDisabled = isSelf || isBackRef;
                    return (
                      <label key={s.id} className={`flex items-center gap-2 px-3 py-1.5 ${isDisabled ? 'cursor-not-allowed bg-slate-100/60 dark:bg-slate-700/30' : 'cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isDisabled}
                          onChange={async () => {
                            if (isDisabled) return;
                            if (checked && existingChild) {
                              try {
                                await invoke('remove_section_ref_child', { questionId: existingChild.id });
 
                                setSectionRefChildren((prev: any[]) => prev.filter(c => c.id !== existingChild.id));
                              } catch (e) { logger.error('Failed to remove section ref child:', e); }
                            } else {
                              try {
 
                                const newChild = await invoke<any>('add_section_ref_child', {
                                  args: { parent_id: existingId, document_id: documentId, section_id: sectionId, linked_section_id: s.id, linked_section_number: s.section_number, linked_section_title: s.title_th }
                                });
 
                                setSectionRefChildren((prev: any[]) => [...prev, newChild].sort((a, b) => a.ref_section_number - b.ref_section_number));
                              } catch (e) { logger.error('Failed to add section ref child:', e); }
                            }
                          }}
                          className="accent-purple-600 w-3.5 h-3.5 shrink-0"
                        />
                        <span className={`text-xs font-medium shrink-0 ${isDisabled ? 'text-slate-500 dark:text-slate-400' : 'text-purple-600 dark:text-purple-400'}`}>{s.section_number}</span>
                        <span className={`text-xs flex-1 ${isDisabled ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-400 dark:decoration-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{s.title_th}</span>
                        {isSelf && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded shrink-0">(ตัวเอง)</span>}
                        {isBackRef && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded shrink-0">(อ้างอิงสูงกว่า)</span>}
                      </label>
                    );
                  })}
                </div>
              </>)}
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic mt-2">
              (สามารถเลือก Section ได้หลังจากบันทึกคำถามนี้แล้ว)
            </div>
          )}
        </div>
      )}
    </div>
  );
};
