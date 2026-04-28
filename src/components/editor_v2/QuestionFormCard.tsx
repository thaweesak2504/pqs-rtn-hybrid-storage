import React from "react";
import {
    FileDigit,
    FileText,
    ImageIcon,
    Save,
    Trash2,
    X
} from "lucide-react";

import { QuestionFormCardProps } from './questionFormCard/types';
import { getThemeColors } from './questionFormCard/themeColors';
import { useQuestionForm } from './questionFormCard/useQuestionForm';
import { SubQuestionEditorSection } from './questionFormCard/SubQuestionEditorSection';
import { SubQuestionBindingSection } from './questionFormCard/SubQuestionBindingSection';
import { SectionPickerSection } from './questionFormCard/SectionPickerSection';
import { ReferenceSection } from './questionFormCard/ReferenceSection';
import { ScoringSection } from './questionFormCard/ScoringSection';
import { AnswerKeySection } from './questionFormCard/AnswerKeySection';
import { ExemptedToggleSection } from './questionFormCard/ExemptedToggleSection';

import ConfirmModal from "../modals/ConfirmModal";
import Button from "../ui/Button";
import Tooltip from "../ui/Tooltip";
import AsyncImagePreview from "./AsyncImagePreview";

const QuestionFormCard: React.FC<QuestionFormCardProps> = (props) => {
  const {
    prefix,
    level,
  } = props;

  const {
    state,
    refs,
    computed,
    handlers,
    props: hookProps
  } = useQuestionForm(props);

  const colors = getThemeColors(props.sectionGroup || 100);

  return (
    <div
      ref={refs.formCardRef}
      className={`relative group bg-white dark:bg-slate-900 rounded-xl border-2 ${state.errors.content ? 'border-red-500 shadow-lg shadow-red-500/10' : colors.border} transition-all duration-300 overflow-hidden mb-6`}
    >
      {/* Header */}
      <div className={`px-4 py-2.5 ${colors.bgMuted} border-b ${colors.border} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${colors.bgPrimary} ${colors.textWhite} shadow-sm`}>
            {level === 0 ? <FileText size={16} /> : <FileDigit size={16} />}
          </div>
          <div>
            <span className={`text-xs font-bold ${colors.textPrimary} uppercase tracking-wider`}>
              {level === 0 ? "หัวข้อหลัก" : `หัวข้อย่อยระดับ ${level}`}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">{prefix}</span>
              {state.isBackgroundSaved && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  SAVED
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="ยกเลิก">
            <button
              onClick={handlers.handleCancel}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Content Editor */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            คำถาม (Question Content)
          </label>
          <textarea
            ref={refs.contentRef}
            autoFocus
            value={state.content}
            onChange={(e) => {
              state.setContent(e.target.value);
              if (state.errors.content) state.setErrors(prev => ({ ...prev, content: false }));
            }}
            placeholder="กรุณากรอกรายละเอียดคำถาม..."
            className={`w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-slate-800 dark:text-white transition-all duration-200 min-h-[80px] focus:ring-4 focus:ring-opacity-10 ${state.errors.content
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500'
              }`}
          />
        </div>

        {/* Exempted / Toggle Section */}
        <ExemptedToggleSection
          {...computed}
          {...state}
        />

        {/* Description Editor */}
        {state.showDescription && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              คำอธิบายเพิ่มเติม (Description)
            </label>
            <textarea
              ref={refs.descriptionRef}
              value={state.description}
              onChange={(e) => state.setDescription(e.target.value)}
              placeholder="กรุณากรอกคำอธิบายหรือคำสั่ง (ถ้ามี)..."
              className="w-full px-3 py-2 text-sm border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-10 transition-all duration-200 min-h-[60px]"
            />
          </div>
        )}

        {/* Scoring & Required Count Section */}
        <ScoringSection
          {...computed}
          {...state}
          existingId={hookProps.existingId || null}
          parentId={hookProps.parentId || null}
          handleSyncRequiredCount={handlers.handleSyncRequiredCount}
          prefix={prefix}
        />

        {/* Sub-Question Editor (200.2, 200.4, 300.2-5) */}
        {state.showSubQuestionEditor && (
          <SubQuestionEditorSection
            {...computed}
            {...state}
            sqClr={colors}
            isProtectedBranch={computed.isProtectedBranch}
            sectionOccupationBranches={hookProps.sectionOccupationBranches}
            sectionSelectedBranch={hookProps.sectionSelectedBranch}
          />
        )}

        {/* Sub-Question Selection (Child questions of L1 with SubQ) */}
        {computed.hasParentSubQ && (
          <SubQuestionBindingSection
            parentSubQuestionList={props.parentSubQuestionList || []}
            selectedSubQCodes={state.selectedSubQCodes}
            setSelectedSubQCodes={state.setSelectedSubQCodes}
            usage_map={state.subQUsageData.usage_map}
            total_children={state.subQUsageData.total_children}
            is300={computed.is300}
            sqClr={colors}
          />
        )}

        {/* Section Picker (300.3, 300.4, 300.5) */}
        {(computed.isSection300Selector || computed.isSection100Selector || computed.isSection200Selector) && (
          <SectionPickerSection
            is300={computed.is300}
            isSection100Selector={computed.isSection100Selector}
            isSection200Selector={computed.isSection200Selector}
            isSection300Selector={computed.isSection300Selector}
            availableSections={state.availableSections}
            sectionRefChildren={state.sectionRefChildren}
            backRefSectionIds={state.backRefSectionIds}
            handleAddSectionRef={handlers.handleAddSectionRef}
            handleRemoveSectionRef={handlers.handleRemoveSectionRef}
            formScoreType={state.formScoreType}
            setFormScoreType={state.setFormScoreType}
            setFormScoreDisplayText={state.setFormScoreDisplayText}
            setShowDescription={state.setShowDescription}
            fetchSectionRefChildren={handlers.fetchSectionRefChildren}
            isEdit={state.isEdit}
            existingId={hookProps.existingId || null}
            sectionId={hookProps.sectionId}
            documentId={hookProps.documentId || ""}
            setSectionRefChildren={state.setSectionRefChildren}
          />
        )}

        {/* Reference Linking */}
        {!computed.is300 && (
          <ReferenceSection
            isDefaultL1={hookProps.isDefaultL1 || false}
            requireRef={state.requireRef}
            linkedRefs={state.linkedRefs}
            isRefExpanded={state.isRefExpanded}
            availableRefs={state.availableRefs}
            draftSelectedRefIds={state.draftSelectedRefIds}
            draftPageByRefId={state.draftPageByRefId}
            draftPageErrors={state.draftPageErrors}
            hasError={!!state.errors.refs}
            handleToggleReferenceEditor={handlers.handleToggleReferenceEditor}
            handleToggleDraftReference={handlers.handleToggleDraftReference}
            handleDraftPageChange={handlers.handleDraftPageChange}
            handleUpdateReferences={handlers.handleUpdateReferences}
          />
        )}

        {/* Answer Key */}
        <AnswerKeySection
          {...computed}
          {...state}
          isDefaultL1={hookProps.isDefaultL1 || false}
        />

        {/* Image Display & Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {state.imagePath ? (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="group/img relative">
                  <AsyncImagePreview
                    path={state.imagePath}
                    className="h-14 w-14 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-sm transition-transform group-hover/img:scale-105"
                  />
                  <button
                    onClick={handlers.handleRemoveImage}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">มีรูปภาพประกอบ</span>
                  <button
                    onClick={handlers.handleImageUpload}
                    className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors mt-0.5"
                  >
                    เปลี่ยนรูปภาพ
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handlers.handleImageUpload}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 group/btn"
              >
                <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 group-hover/btn:bg-blue-100 dark:group-hover/btn:bg-blue-900/40 transition-colors">
                  <ImageIcon size={14} />
                </div>
                เพิ่มรูปภาพประกอบ
              </button>
            )}
          </div>

          {/* Child Layout Selector (Grid/List) */}
          {computed.showExtraButtons && (
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => state.setCurrentChildLayout('list')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${state.currentChildLayout === 'list'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                LIST
              </button>
              <button
                onClick={() => state.setCurrentChildLayout('grid')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${state.currentChildLayout === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                GRID
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className={`px-4 py-3 ${colors.bgMuted} border-t ${colors.border} flex items-center justify-end gap-3`}>
        <Button
          variant="secondary"
          size="small"
          onClick={handlers.handleCancel}
          className="text-xs font-bold"
        >
          ยกเลิก
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={handlers.handleSave}
          icon={<Save size={14} />}
          className={`${colors.bgPrimary} ${colors.textWhite} text-xs font-bold shadow-lg shadow-blue-500/20`}
        >
          {state.isEdit ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
        </Button>
      </div>

      {/* Alert Notification */}
      <ConfirmModal
        isOpen={state.isAlertOpen}
        onClose={() => state.setIsAlertOpen(false)}
        onConfirm={() => state.setIsAlertOpen(false)}
        title="พบข้อผิดพลาด"
        message={state.alertMessage}
        variant="warning"
        confirmText="ตกลง"
      />
    </div>
  );
};

export default QuestionFormCard;
