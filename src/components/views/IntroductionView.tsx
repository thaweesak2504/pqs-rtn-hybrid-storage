import { BookOpen, Pencil, Save, X } from 'lucide-react';
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createGeneralIntroductionSections } from '../../content/introductionContent';
import { introductionService } from '../../services/introductionService';
import WorkflowModal from '../modals/WorkflowModal';
import Button from '../ui/Button';
import { COMMAND_BUTTON_FOCUS } from '../ui/buttonStyles';
import Container from '../ui/Container';

interface IntroductionViewProps {
  documentId: string;
  appliedTo: string;
  isPreviewMode?: boolean;
  viewMode?: 'edit' | 'qualifier' | 'trainee' | 'visitor' | 'print';
  isSimulation?: boolean;
  onAppliedToUpdated?: (appliedTo: string) => void;
}

const IntroductionView: React.FC<IntroductionViewProps> = ({
  documentId,
  appliedTo,
  isPreviewMode = false,
  viewMode = 'edit',
  isSimulation = false,
  onAppliedToUpdated,
}) => {
  const editorTitleId = useId();
  const editorDescriptionId = useId();
  const fieldHelpId = useId();
  const fieldErrorId = useId();
  const dirtyStateId = useId();
  const editCommandRef = useRef<HTMLButtonElement>(null);
  const appliedToFieldRef = useRef<HTMLTextAreaElement>(null);
  const restoreEditCommandFocusRef = useRef(false);
  const activeDocumentIdRef = useRef(documentId);
  const [isEditingAppliedTo, setIsEditingAppliedTo] = useState(false);
  const [appliedToDraft, setAppliedToDraft] = useState(appliedTo);
  const [isSavingAppliedTo, setIsSavingAppliedTo] = useState(false);
  const [appliedToError, setAppliedToError] = useState('');
  const [showDiscardDecision, setShowDiscardDecision] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const canEditAppliedTo = viewMode === 'edit' && !isPreviewMode && !isSimulation;
  const isAppliedToDirty = appliedToDraft !== appliedTo;

  useEffect(() => {
    if (!isEditingAppliedTo) {
      setAppliedToDraft(appliedTo);
    }
  }, [appliedTo, isEditingAppliedTo]);

  useEffect(() => {
    if (activeDocumentIdRef.current === documentId) return;
    activeDocumentIdRef.current = documentId;
    restoreEditCommandFocusRef.current = false;
    setIsEditingAppliedTo(false);
    setShowDiscardDecision(false);
    setAppliedToError('');
    setAnnouncement('');
    setAppliedToDraft(appliedTo);
  }, [appliedTo, documentId]);

  useLayoutEffect(() => {
    if (isEditingAppliedTo) {
      const field = appliedToFieldRef.current;
      field?.focus({ preventScroll: true });
      field?.setSelectionRange(field.value.length, field.value.length);
      return;
    }

    if (restoreEditCommandFocusRef.current) {
      restoreEditCommandFocusRef.current = false;
      editCommandRef.current?.focus({ preventScroll: true });
    }
  }, [canEditAppliedTo, isEditingAppliedTo]);

  const openAppliedToEditor = () => {
    setAppliedToDraft(appliedTo);
    setAppliedToError('');
    setAnnouncement('');
    restoreEditCommandFocusRef.current = false;
    setIsEditingAppliedTo(true);
  };

  const closeAppliedToEditor = () => {
    restoreEditCommandFocusRef.current = true;
    setShowDiscardDecision(false);
    setAppliedToError('');
    setIsEditingAppliedTo(false);
  };

  const requestCancelAppliedTo = () => {
    if (isSavingAppliedTo) return;
    if (isAppliedToDirty) {
      setShowDiscardDecision(true);
      return;
    }
    closeAppliedToEditor();
  };

  const saveAppliedTo = async () => {
    if (isSavingAppliedTo || !isAppliedToDirty) return;

    const normalizedAppliedTo = appliedToDraft.trim();
    if (!normalizedAppliedTo) {
      setAppliedToError('กรุณาระบุข้อความการประยุกต์ใช้ก่อนบันทึก');
      setAnnouncement('ยังบันทึกไม่ได้ กรุณาระบุข้อความการประยุกต์ใช้');
      appliedToFieldRef.current?.focus({ preventScroll: true });
      return;
    }

    setIsSavingAppliedTo(true);
    setAppliedToError('');
    try {
      const result = await introductionService.updateAppliedTo({
        documentId,
        appliedTo: normalizedAppliedTo,
      });
      onAppliedToUpdated?.(result.appliedTo);
      setAnnouncement('บันทึกการประยุกต์ใช้แล้ว');
      closeAppliedToEditor();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setAppliedToError(`ไม่สามารถบันทึกการประยุกต์ใช้ได้: ${detail}`);
      setAnnouncement('บันทึกการประยุกต์ใช้ไม่สำเร็จ');
      appliedToFieldRef.current?.focus({ preventScroll: true });
    } finally {
      setIsSavingAppliedTo(false);
    }
  };

  const handleAppliedToEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !isSavingAppliedTo) {
      event.preventDefault();
      event.stopPropagation();
      requestCancelAppliedTo();
      return;
    }

    const isSaveShortcut = (event.ctrlKey || event.metaKey)
      && (event.code === 'KeyS' || event.key.toLowerCase() === 's');
    if (isSaveShortcut) {
      event.preventDefault();
      event.stopPropagation();
      void saveAppliedTo();
    }
  };

  const toThaiNumber = (num: number) => {
    return num.toString();
  };

  const sections = createGeneralIntroductionSections(appliedTo);

  // Preview Mode - A4 Paper Format (like print)
  if (isPreviewMode) {
    return (
      <div className="flex justify-center bg-github-bg-primary min-w-fit transition-colors duration-300">
        <div className="bg-white dark:bg-github-bg-secondary text-black dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_2.0cm_2.0cm_3.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
          <div className="mb-8">
            <h1 className='font-bold text-center text-lg'>
              กล่าวนำ
            </h1>
          </div>

          <ol className="list-none space-y-4">
            {sections.map((section, index) => (
              <li
                key={section.id}
                data-introduction-section-id={section.id}
                data-content-authority={section.authority}
                className="flex items-baseline gap-[2ch]"
              >
                <span className="font-bold min-w-fit">{toThaiNumber(index + 1)}.</span>
                <div className="flex-1">
                  <h2 className="font-bold">{section.title}</h2>
                  <p className="text-justify indent-8 font-normal mt-1 whitespace-pre-line">
                    {section.content.replace(/\s+/g, ' ').trim()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  // Edit Mode - Modern Card UI
  return (
    <>
    <Container size="medium" padding="large" className="py-6 space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">กล่าวนำ</h1>
            <p className="text-blue-100 text-sm mt-1">Introduction - ข้อมูลพื้นฐานเกี่ยวกับมาตรฐานกำลังพล</p>
          </div>
        </div>
      </div>

      {/* Content Cards */}
      <ol className="list-none space-y-4">
        {sections.map((section, index) => (
          <li
            key={section.id}
            data-introduction-section-id={section.id}
            data-content-authority={section.authority}
            className={`rounded-lg shadow-md border ${section.authority === 'document'
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700'
                : 'bg-white dark:bg-github-bg-secondary border-github-border-primary'
              }`}
          >
            <div className="p-6">
              {/* Section Header */}
              <div className="flex items-start space-x-4 mb-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${section.authority === 'document'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                  {toThaiNumber(index + 1)}
                </div>
                <div className="flex-1">
                  <h2 className={`text-lg font-bold ${section.authority === 'document'
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-github-text-primary'
                    }`}>
                    {section.title}
                  </h2>
                  {section.authority === 'document' && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      ข้อมูลเฉพาะเอกสาร
                    </span>
                  )}
                </div>
                {section.authority === 'document' && canEditAppliedTo && !isEditingAppliedTo && (
                  <Button
                    ref={editCommandRef}
                    variant="outline"
                    size="small"
                    icon={<Pencil className="h-4 w-4" />}
                    aria-label="แก้ไขการประยุกต์ใช้"
                    onClick={openAppliedToEditor}
                  >
                    แก้ไขการประยุกต์ใช้
                  </Button>
                )}
              </div>

              {/* Section Content */}
              {section.authority === 'document' && isEditingAppliedTo && canEditAppliedTo ? (
                <div
                  role="group"
                  aria-labelledby={editorTitleId}
                  aria-describedby={editorDescriptionId}
                  className="ml-12 overflow-hidden rounded-lg border border-blue-400/60 bg-github-bg-secondary shadow-md dark:border-blue-500/50"
                  onKeyDown={handleAppliedToEditorKeyDown}
                >
                  <div className="flex items-start gap-3 border-b border-github-border-primary bg-github-bg-tertiary px-4 py-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    >
                      <Pencil className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 id={editorTitleId} className="font-semibold text-github-text-primary">
                        แก้ไขการประยุกต์ใช้
                      </h3>
                      <p id={editorDescriptionId} className="mt-0.5 text-sm leading-relaxed text-github-text-secondary">
                        แก้ไขเฉพาะข้อมูลของเอกสารเล่มนี้ โดยข้อความนำจะคงเดิมเสมอ
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 px-4 py-4">
                    <div className="rounded-md border border-github-border-primary bg-github-bg-primary px-3 py-2.5">
                      <span className="block text-xs font-medium text-github-text-tertiary">
                        ข้อความนำคงที่
                      </span>
                      <p className="mt-1 text-sm text-github-text-secondary">
                        มาตรฐานกำลังพล เล่มนี้ ใช้กับ
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor={`${editorTitleId}-field`}
                        className="block text-sm font-semibold text-github-text-primary"
                      >
                        การประยุกต์ใช้ <span aria-hidden="true" className="text-red-400">*</span>
                      </label>
                      <textarea
                        ref={appliedToFieldRef}
                        id={`${editorTitleId}-field`}
                        value={appliedToDraft}
                        rows={4}
                        required
                        disabled={isSavingAppliedTo}
                        aria-invalid={!!appliedToError || undefined}
                        aria-describedby={`${fieldHelpId}${appliedToError ? ` ${fieldErrorId}` : ''}`}
                        onChange={(event) => {
                          setAppliedToDraft(event.target.value);
                          if (appliedToError) setAppliedToError('');
                        }}
                        className="mt-2 w-full resize-y rounded-md border border-github-border-primary bg-github-bg-primary px-3 py-2.5 text-left font-normal leading-relaxed text-github-text-primary placeholder:text-github-text-tertiary hover:border-github-border-active focus:border-blue-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <p id={fieldHelpId} className="mt-1.5 text-xs leading-relaxed text-github-text-secondary">
                        ข้อมูลนี้เป็นข้อมูลเฉพาะเอกสารและต้องไม่เว้นว่าง
                      </p>
                    </div>

                    {appliedToError && (
                      <div
                        id={fieldErrorId}
                        role="alert"
                        className="rounded-md border border-red-400 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/70 dark:bg-red-950/40 dark:text-red-200"
                      >
                        <p className="font-medium">{appliedToError}</p>
                        <button
                          type="button"
                          className={`mt-1.5 rounded text-red-700 underline underline-offset-2 hover:text-red-900 dark:text-red-100 dark:hover:text-white ${COMMAND_BUTTON_FOCUS}`}
                          onClick={() => appliedToFieldRef.current?.focus({ preventScroll: true })}
                        >
                          กลับไปแก้ไขช่องการประยุกต์ใช้
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-github-border-primary bg-github-bg-tertiary px-4 py-3">
                    <div className="min-w-0 flex-1">
                      {isAppliedToDirty && (
                        <p
                          id={dirtyStateId}
                          className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300"
                        >
                          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                          มีการแก้ไขที่ยังไม่ได้บันทึก
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="small"
                        icon={<X className="h-4 w-4" />}
                        disabled={isSavingAppliedTo}
                        onClick={requestCancelAppliedTo}
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        icon={<Save className="h-4 w-4" />}
                        loading={isSavingAppliedTo}
                        loadingText="กำลังบันทึก..."
                        disabled={!isAppliedToDirty}
                        data-state={isSavingAppliedTo ? 'saving' : isAppliedToDirty ? 'dirty' : 'clean'}
                        aria-describedby={isAppliedToDirty ? dirtyStateId : undefined}
                        onClick={() => { void saveAppliedTo(); }}
                      >
                        บันทึก
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={`text-justify leading-relaxed ml-12 ${section.authority === 'document'
                    ? 'text-blue-900 dark:text-blue-100 font-medium'
                    : 'text-github-text-secondary'
                  }`}>
                  {section.content}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* Footer Note */}
      <div className="bg-github-bg-secondary dark:bg-gray-800 border border-github-border-primary dark:border-gray-700 rounded-lg p-4 text-sm text-github-text-secondary dark:text-gray-400">
        <p className="flex items-center">
          <span className="mr-2">💡</span>
          <span>ข้อมูลที่แสดงด้านบนจะถูกนำไปใช้ในการสร้างเอกสาร PDF มาตรฐาน RTN</span>
        </p>
      </div>
    </Container>
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
    <WorkflowModal
      isOpen={showDiscardDecision}
      title="การแก้ไขยังไม่ได้บันทึก"
      message="ข้อความการประยุกต์ใช้มีการแก้ไขที่ยังไม่ได้บันทึก เลือกสิ่งที่ต้องการทำก่อนปิดฟอร์มนี้"
      returnFocusRef={appliedToFieldRef}
      onClose={() => setShowDiscardDecision(false)}
      actions={[
        {
          id: 'continue-editing',
          label: 'แก้ไขต่อ',
          onSelect: () => setShowDiscardDecision(false),
        },
        {
          id: 'discard-applied-to',
          label: 'ละทิ้งการแก้ไข',
          variant: 'danger',
          onSelect: () => {
            setAppliedToDraft(appliedTo);
            closeAppliedToEditor();
            setAnnouncement('ละทิ้งการแก้ไขการประยุกต์ใช้แล้ว');
          },
        },
      ]}
    />
    </>
  );
};

export default IntroductionView;
