import { invoke } from "@tauri-apps/api/tauri";
import { CheckCircle2, MessageSquare, RotateCcw, Save, X } from "lucide-react";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { formatMarkdownWithThaiLists } from '../../utils/thaiNumbering';
import TiptapEditor from './TiptapEditor';
import ConfirmModal from "../modals/ConfirmModal";
import { UserAnswer } from "./PqsQuestionSection";
import { logger } from '../../utils/logger';
import AttachmentPanel from "./AttachmentPanel";
import Tooltip from "../ui/Tooltip";
import { useEditorLock } from "../../hooks/useEditorLock";
import WorkflowModal from "../modals/WorkflowModal";
import DeleteAnswerWorkflowModal from "../modals/DeleteAnswerWorkflowModal";
import { COMMAND_BUTTON_FOCUS } from "../ui/buttonStyles";
import Button from "../ui/Button";

// Simulation Constants
const MOCK_TRAINEE_ID = "T-001";
const MOCK_QUALIFIER_ID = "Q-001";


export type AssessmentStatus = "pending" | "passed" | "needs_improvement";

const ASSESSMENT_STATUS_LABELS: Record<AssessmentStatus, string> = {
  pending: "รอประเมิน",
  passed: "ผ่าน",
  needs_improvement: "ปรับปรุง",
};

interface TraineeAnswerBoxProps {
  questionId: string;
  documentId: string;
  subQuestionCode?: string;
  initialValue?: string;
  status?: AssessmentStatus;
  feedback?: string;
  readOnly?: boolean;
  label?: string; // e.g. "ก", "ข"
  mode: "trainee" | "qualifier" | "viewer" | "edit" | "visitor" | "print";
  onAnswerSaved?: () => void;
  onAssessmentSaved?: () => void;
  traineeAnswer?: UserAnswer;
  isPrerequisiteDoc?: boolean;
  questionPrefix?: string;
}

const TraineeAnswerBox: React.FC<TraineeAnswerBoxProps> = ({
  questionId,
  documentId,
  subQuestionCode,
  initialValue = "",
  status = "pending",
  feedback = "",
  readOnly = false,
  label,
  mode = "trainee",
  onAnswerSaved,
  onAssessmentSaved,
  traineeAnswer,
  isPrerequisiteDoc = false,
  questionPrefix,
}) => {
  const initialAssessmentStatus = traineeAnswer?.status ?? status;
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [localFeedback, setLocalFeedback] = useState(feedback);
  const [localStatus, setLocalStatus] = useState<AssessmentStatus>(initialAssessmentStatus);
  const [savedAssessmentStatus, setSavedAssessmentStatus] = useState<AssessmentStatus>(initialAssessmentStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [savingAssessmentAction, setSavingAssessmentAction] = useState<AssessmentStatus | null>(null);
  const [assessmentAnnouncement, setAssessmentAnnouncement] = useState("");
  const [assessmentValidationMessage, setAssessmentValidationMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isQualifierPanelOpen, setIsQualifierPanelOpen] = useState(false);
  const { lock, unlock, updateLock } = useEditorLock();
  const boxId = useMemo(() => `box-${questionId}-${documentId}-${subQuestionCode || ""}`, [questionId, documentId, subQuestionCode]);

  // Phase 5G: Attachments
  const [attachments, setAttachments] = useState<string[]>([]);
  // Track original values for change detection (anti-fake-save)
  const [originalValue, setOriginalValue] = useState(initialValue);
  const [originalAttachments, setOriginalAttachments] = useState<string[]>([]);
  const [originalFeedback, setOriginalFeedback] = useState(feedback);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: "",
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [discardDraftModalOpen, setDiscardDraftModalOpen] = useState(false);
  const [cancelImprovementModalOpen, setCancelImprovementModalOpen] = useState(false);
  // textareaRef removed — TiptapEditor manages its own ref
  const containerRef = useRef<HTMLDivElement>(null);
  const editAnswerButtonRef = useRef<HTMLButtonElement>(null);
  const deleteAnswerButtonRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreAnswerFocusRef = useRef(false);
  const qualifierTriggerRef = useRef<HTMLButtonElement>(null);
  const qualifierFirstActionRef = useRef<HTMLButtonElement>(null);
  const qualifierFeedbackRef = useRef<HTMLTextAreaElement>(null);
  const shouldFocusQualifierPanelRef = useRef(false);
  const shouldFocusQualifierFeedbackRef = useRef(false);
  const shouldRestoreQualifierFocusRef = useRef(false);
  const previousModeRef = useRef(mode);
  const is300 = questionPrefix ? (questionPrefix.startsWith("3") || questionPrefix.startsWith("๓")) : false;
  const assessmentFeedbackId = `${boxId}-qualifier-feedback`;
  const assessmentFeedbackHelpId = `${assessmentFeedbackId}-help`;

  // Sync with props
  useEffect(() => {
    if (traineeAnswer) {
      const answerText = traineeAnswer.answer_text || "";
      const feedbackText = traineeAnswer.feedback || "";
      setValue(answerText);
      setOriginalValue(answerText);
      setLocalStatus(traineeAnswer.status || "pending");
      setSavedAssessmentStatus(traineeAnswer.status || "pending");
      setLocalFeedback(feedbackText);
      setOriginalFeedback(feedbackText);
      setAssessmentValidationMessage("");
      // Phase 5G: Parse attachments JSON
      try {
        const parsed = traineeAnswer.attachments ? JSON.parse(traineeAnswer.attachments) : [];
        const attachArr = Array.isArray(parsed) ? parsed : [];
        setAttachments(attachArr);
        setOriginalAttachments(attachArr);
      } catch { setAttachments([]); setOriginalAttachments([]); }
    } else {
      setValue(initialValue);
      setOriginalValue(initialValue);
      setLocalStatus(status);
      setSavedAssessmentStatus(status);
      setLocalFeedback(feedback);
      setOriginalFeedback(feedback);
      setAssessmentValidationMessage("");
      setAttachments([]);
      setOriginalAttachments([]);
    }
  }, [traineeAnswer, initialValue, status, feedback]);

  useEffect(() => {
    const previousMode = previousModeRef.current;
    if (previousMode === mode) return;
    previousModeRef.current = mode;

    if (previousMode === "qualifier" || mode === "qualifier") {
      setIsQualifierPanelOpen(false);
      setLocalStatus(traineeAnswer?.status ?? status);
      setLocalFeedback(traineeAnswer?.feedback ?? feedback);
      setAssessmentValidationMessage("");
      shouldFocusQualifierPanelRef.current = false;
      shouldFocusQualifierFeedbackRef.current = false;
      shouldRestoreQualifierFocusRef.current = false;
    }
  }, [feedback, mode, status, traineeAnswer]);

  useLayoutEffect(() => {
    if (isEditing || deleteModalOpen || !shouldRestoreAnswerFocusRef.current) return;
    shouldRestoreAnswerFocusRef.current = false;
    editAnswerButtonRef.current?.focus({ preventScroll: true });
  }, [deleteModalOpen, isEditing]);

  useLayoutEffect(() => {
    if (isQualifierPanelOpen && shouldFocusQualifierFeedbackRef.current) {
      shouldFocusQualifierFeedbackRef.current = false;
      qualifierFeedbackRef.current?.focus({ preventScroll: true });
      return;
    }

    if (isQualifierPanelOpen && shouldFocusQualifierPanelRef.current) {
      shouldFocusQualifierPanelRef.current = false;
      qualifierFirstActionRef.current?.focus({ preventScroll: true });
      return;
    }

    if (!isQualifierPanelOpen && shouldRestoreQualifierFocusRef.current) {
      shouldRestoreQualifierFocusRef.current = false;
      qualifierTriggerRef.current?.focus({ preventScroll: true });
    }
  }, [isQualifierPanelOpen, localStatus]);

  const colorMode = useMemo<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }, []);


  const handleSaveAnswer = async () => {
    if (isSaving) return;

    // Validation: Prevent fake save — Trainee must actually provide content
    const trimmedValue = value.trim();
    const attachmentsJson = attachments.length > 0 ? JSON.stringify(attachments) : null;

    // For prerequisite docs: must have at least 1 attachment
    if (isPrerequisiteDoc && attachments.length === 0) {
      setAlertModal({ isOpen: true, message: "กรุณาแนบเอกสารหลักฐานอย่างน้อย 1 ไฟล์" });
      return;
    }

    // For regular questions: must have non-empty answer text
    if (!isPrerequisiteDoc && !trimmedValue) {
      setAlertModal({ isOpen: true, message: "กรุณาระบุคำตอบก่อนบันทึก" });
      return;
    }

    setIsSaving(true);
    setIsSaved(false);
    try {
      // 1. Physically delete any files from disk that were deleted in the editor
      const deletedFiles = originalAttachments.filter(file => !attachments.includes(file));
      for (const file of deletedFiles) {
        try {
          await invoke("delete_trainee_attachment", { path: file });
        } catch (err) {
          logger.error("Failed to delete trainee attachment from disk:", err);
        }
      }

      // 2. Save answer to DB
      await invoke("save_trainee_answer", {
        args: {
          user_id: MOCK_TRAINEE_ID,
          question_id: questionId,
          document_id: documentId,
          sub_question_code: subQuestionCode || "",
          answer_text: value,
          attachments: attachmentsJson,
        }
      });
      // Update originals after successful save
      setOriginalValue(value);
      setOriginalAttachments([...attachments]);
      shouldRestoreAnswerFocusRef.current = true;
      setIsEditing(false);
      unlock(boxId);
      onAnswerSaved?.();
    } catch (error) {
      logger.error("Failed to save answer:", error);
      setAlertModal({
        isOpen: true,
        message: "ไม่สามารถบันทึกคำตอบได้ (โปรดแจ้งนักพัฒนา)",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasDirtyAnswerDraft = useMemo(() => (
    value !== originalValue
    || attachments.length !== originalAttachments.length
    || attachments.some((attachment, index) => attachment !== originalAttachments[index])
  ), [attachments, originalAttachments, originalValue, value]);

  const discardAnswerDraft = useCallback(async () => {
    // Find newly uploaded files to delete from disk
    const newFiles = attachments.filter(file => !originalAttachments.includes(file));
    for (const file of newFiles) {
      try {
        await invoke("delete_trainee_attachment", { path: file });
      } catch (err) {
        logger.error("Failed to delete temp attachment on cancel:", err);
      }
    }
    
    setValue(originalValue);
    setAttachments([...originalAttachments]);
    setDiscardDraftModalOpen(false);
    shouldRestoreAnswerFocusRef.current = true;
    setIsEditing(false);
    unlock(boxId);
  }, [attachments, boxId, originalAttachments, originalValue, unlock]);

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (hasDirtyAnswerDraft) {
      setDiscardDraftModalOpen(true);
      return;
    }
    void discardAnswerDraft();
  };

  const handleRequestSwitch = useCallback(() => {
    if (isSaving) return false;
    if (hasDirtyAnswerDraft) {
      setDiscardDraftModalOpen(true);
      return false;
    }
    setIsEditing(false);
    unlock(boxId);
    return true;
  }, [boxId, hasDirtyAnswerDraft, isSaving, unlock]);

  // Keep the global lock callback synchronized with the latest draft state.
  // The callback captured when editing started must not remain "clean" after typing.
  useEffect(() => {
    if (isEditing) updateLock(boxId, handleRequestSwitch);
  }, [boxId, handleRequestSwitch, isEditing, updateLock]);

  const hasSavedAnswer = originalValue.trim().length > 0 || originalAttachments.length > 0;

  const handleClearAnswer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModalOpen(true);
  };

  const handleAnswerDeleted = () => {
    // The backend result is authoritative. This callback is called only after
    // one exact answer identity was deleted and its transaction committed.
    setValue("");
    setOriginalValue("");
    setAttachments([]);
    setOriginalAttachments([]);
    setLocalStatus("pending");
    setSavedAssessmentStatus("pending");
    setLocalFeedback("");
    setOriginalFeedback("");
    setAssessmentValidationMessage("");
    shouldRestoreAnswerFocusRef.current = true;
    setIsEditing(false);
    unlock(boxId);
    onAnswerSaved?.();
  };

  const handleTraineeAttachmentDelete = useCallback(async (relPath: string): Promise<void> => {
    // Actual file deletion from disk is deferred until Save is clicked.
    logger.debug("Trainee attachment deletion deferred until save:", relPath);
  }, []);

  const handleSaveAssessment = async (targetStatus: AssessmentStatus) => {
    if (isSaving) return;

    // Validation: "needs_improvement" requires non-empty feedback
    if (targetStatus === "needs_improvement") {
      const trimmedFeedback = localFeedback.trim();
      if (!trimmedFeedback) {
        const message = "กรุณาระบุข้อเสนอแนะสำหรับการปรับปรุงก่อนบันทึก";
        setAssessmentValidationMessage(message);
        setAssessmentAnnouncement(message);
        qualifierFeedbackRef.current?.focus({ preventScroll: true });
        return;
      }
      // Prevent re-saving identical feedback (no actual change)
      if (localStatus === "needs_improvement" && trimmedFeedback === originalFeedback.trim()) {
        const message = "ยังไม่มีการเปลี่ยนแปลงข้อเสนอแนะ — กรุณาแก้ไขก่อนบันทึก";
        setAssessmentValidationMessage(message);
        setAssessmentAnnouncement(message);
        qualifierFeedbackRef.current?.focus({ preventScroll: true });
        return;
      }
    }

    setAssessmentValidationMessage("");
    setAssessmentAnnouncement(`กำลังบันทึกการประเมินสถานะ ${ASSESSMENT_STATUS_LABELS[targetStatus]}`);
    setIsSaving(true);
    setSavingAssessmentAction(targetStatus);
    setIsSaved(false);
    try {
      await invoke("save_qualifier_assessment", {
        args: {
          user_id: MOCK_TRAINEE_ID,
          question_id: questionId,
          document_id: documentId,
          sub_question_code: subQuestionCode || "",
          status: targetStatus,
          feedback: targetStatus === "needs_improvement" ? localFeedback.trim() : null,
          qualifier_id: MOCK_QUALIFIER_ID,
        }
      });
      setLocalStatus(targetStatus);
      setSavedAssessmentStatus(targetStatus);
      // Update original feedback after successful save
      if (targetStatus === "needs_improvement") {
        setOriginalFeedback(localFeedback.trim());
      } else {
        // Clear feedback completely when passing or reverting to pending
        setOriginalFeedback("");
        setLocalFeedback("");
      }
      // Close panel after successful save
      shouldRestoreQualifierFocusRef.current = true;
      setIsQualifierPanelOpen(false);
      setAssessmentAnnouncement(`บันทึกการประเมินสถานะ ${ASSESSMENT_STATUS_LABELS[targetStatus]} เรียบร้อยแล้ว`);
      // Immediately close and refresh after save per user request
      onAssessmentSaved?.();
    } catch (error) {
      logger.error("Failed to save assessment:", error);
      setAssessmentAnnouncement("ไม่สามารถบันทึกการประเมินได้");
      setAlertModal({
        isOpen: true,
        message: "ไม่สามารถบันทึกการประเมินได้ (โปรดแจ้งนักพัฒนา)",
      });
    } finally {
      setSavingAssessmentAction(null);
      setIsSaving(false);
    }
  };

  // applyAction and handlePaste removed — TiptapEditor handles formatting internally

  // auto-resize effect removed — TiptapEditor grows naturally

  const handleEditStart = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const canEdit = mode === "trainee" || (mode === "edit" && !readOnly);
    if (readOnly || !canEdit || localStatus === "passed") return;

    if (!lock(boxId, handleRequestSwitch)) {
      return;
    }
    setIsEditing(true);
  };

  const handleOpenQualifierPanel = (event: React.MouseEvent) => {
    event.stopPropagation();
    shouldFocusQualifierPanelRef.current = true;
    setIsQualifierPanelOpen(true);
  };

  const handleCloseQualifierPanel = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    if (isSaving) return;
    setLocalStatus(savedAssessmentStatus);
    setLocalFeedback(originalFeedback);
    setAssessmentValidationMessage("");
    shouldRestoreQualifierFocusRef.current = true;
    setIsQualifierPanelOpen(false);
    setAssessmentAnnouncement("ปิดส่วนการประเมินและละทิ้งการเปลี่ยนแปลงที่ยังไม่ได้บันทึกแล้ว");
  };

  const handleSelectNeedsImprovement = (event: React.MouseEvent) => {
    event.stopPropagation();
    setLocalStatus("needs_improvement");
    setAssessmentValidationMessage("");
    setAssessmentAnnouncement("เลือกสถานะปรับปรุง กรุณาระบุข้อเสนอแนะ");
    shouldFocusQualifierFeedbackRef.current = true;
  };

  const handleConfirmCancelImprovement = async () => {
    // Close the confirmation first so its focus restoration can return to the
    // originating command while the existing assessment save path runs.
    setCancelImprovementModalOpen(false);
    await handleSaveAssessment("pending");
  };

  const handleAttachmentsChange = (newAttachments: string[]) => {
    setAttachments(newAttachments);
  };

  const cleanValue = value.trim();
  const hasAnswer = cleanValue.length > 0 || attachments.length > 0;
  const canEditAnswer = !readOnly
    && (mode === "trainee" || mode === "edit")
    && localStatus !== "passed";
  const answerIdentity = questionPrefix || questionId;
  const fullAnswerLabel = `${answerIdentity}${label ? ` คำถามย่อย ${label}` : ""}`;
  const deleteAnswerHelpId = `${boxId}-delete-answer-help`;
  const deleteWorkflowModal = (
    <DeleteAnswerWorkflowModal
      key="delete-answer-workflow"
      isOpen={deleteModalOpen}
      userId={MOCK_TRAINEE_ID}
      documentId={documentId}
      questionId={questionId}
      subQuestionCode={subQuestionCode || ""}
      answerLabel={fullAnswerLabel}
      answerTextPresent={originalValue.trim().length > 0}
      attachmentCount={originalAttachments.length}
      assessmentStatus={savedAssessmentStatus}
      contentKind={isPrerequisiteDoc ? "evidence" : "answer"}
      onClose={() => setDeleteModalOpen(false)}
      onDeleted={handleAnswerDeleted}
      originFocusRef={deleteAnswerButtonRef}
      successFocusRef={editAnswerButtonRef}
    />
  );

  // Status Styles
  const statusConfig = {
    pending: {
      borderColor: hasAnswer ? "border-amber-400 dark:border-amber-500/50" : "border-slate-200 dark:border-slate-800",
      bgColor: hasAnswer ? "bg-amber-50/50 dark:bg-amber-900/10" : "bg-slate-50/30 dark:bg-slate-900/10",
      textColor: hasAnswer ? "text-amber-800 dark:text-amber-300" : "text-slate-500",
      icon: hasAnswer ? <span className="text-sm">💡</span> : null,
      label: hasAnswer ? "รอประเมิน" : (isPrerequisiteDoc ? "ยังไม่ได้ส่งเอกสารหลักฐาน" : "ยังไม่ได้ส่งคำตอบ")
    },
    passed: {
      borderColor: "border-emerald-200 dark:border-emerald-800/50",
      bgColor: "bg-emerald-50/50 dark:bg-emerald-900/10",
      textColor: "text-emerald-800 dark:text-emerald-300",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      label: "ผ่าน"
    },
    needs_improvement: {
      borderColor: "border-rose-200 dark:border-rose-800/50",
      bgColor: "bg-rose-50/50 dark:bg-rose-900/10",
      textColor: "text-rose-800 dark:text-rose-300",
      icon: <RotateCcw className="w-4 h-4 text-rose-600" />,
      label: "ปรับปรุง"
    }
  };

  const formatThaiTime = (dateStr?: string | null) => {
    if (!dateStr || !dateStr.trim()) return null;
    // Ensure the date string is treated as UTC if it doesn't have a timezone suffix
    // SQLite datetime('now') returns 'YYYY-MM-DD HH:MM:SS'
    const isoStr = (dateStr.includes('Z') || dateStr.includes('+')) ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return null;
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('th-TH', { month: 'short' });
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${hours}:${minutes}`;
  };

  const timestampText = formatThaiTime(traineeAnswer?.updated_at) || formatThaiTime(traineeAnswer?.assessed_at);

  const config = statusConfig[localStatus] || statusConfig.pending;
  const answerCommandText = isPrerequisiteDoc
    ? (hasAnswer ? "แก้ไขเอกสารหลักฐาน" : "แนบเอกสารหลักฐาน")
    : (hasAnswer ? "แก้ไขคำตอบ" : "ตอบคำถาม");
  const answerCommand = canEditAnswer ? (
    <button
      ref={editAnswerButtonRef}
      type="button"
      onClick={handleEditStart}
      className={`shrink-0 rounded border border-blue-200 bg-white px-2 py-1 text-[10px] font-bold text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-blue-900/20 ${COMMAND_BUTTON_FOCUS}`}
      aria-label={`${answerCommandText} ข้อ ${answerIdentity}${label ? ` คำถามย่อย ${label}` : ""}`}
    >
      {answerCommandText}
    </button>
  ) : null;
  const qualifierClosedCommand = mode === "qualifier"
    && hasAnswer
    && !isQualifierPanelOpen
    && localStatus !== "needs_improvement" ? (
      <Button
        ref={qualifierTriggerRef}
        onClick={handleOpenQualifierPanel}
        variant="outline"
        size="small"
        icon={<RotateCcw className="w-3 h-3" />}
        className="h-7 px-2.5 !text-[10px] !font-bold text-blue-600 dark:text-blue-400"
      >
        {localStatus === "passed" ? "แก้ไขการประเมิน" : "เปิดการประเมิน"}
      </Button>
    ) : null;

  // View Mode
  if (!isEditing) {
    return (
      <>
      {deleteWorkflowModal}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {assessmentAnnouncement}
      </div>
      <div className="flex flex-col gap-1.5 w-full">
        {/* Feedback Display for Trainee */}
        {localStatus === "needs_improvement" && localFeedback && (
          <div className="px-3 py-2 text-xs bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-md text-rose-700 dark:text-rose-400 flex items-center justify-between gap-2">
            <div className="flex-1 italic flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold not-italic">คำแนะนำ:</span> {localFeedback}
              </div>
            </div>

            {/* Edit Feedback Button for Qualifier */}
            {mode === "qualifier" && !isQualifierPanelOpen && (
              <Button
                ref={qualifierTriggerRef}
                onClick={handleOpenQualifierPanel}
                variant="outline"
                size="small"
                className="h-7 shrink-0 px-2 !text-[10px] !font-bold text-blue-600 dark:text-blue-400"
              >
                แก้ไขคำแนะนำ
              </Button>
            )}
          </div>
        )}

        <div
          ref={containerRef}
          className={`px-3 py-2.5 text-sm font-normal rounded-md border ${config.bgColor} ${config.borderColor}`}
        >
          <div className="min-w-0 pb-[2px]">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="shrink-0 text-slate-900 dark:text-slate-100">
                {isPrerequisiteDoc ? "เอกสารหลักฐาน:" : "คำตอบ:"}{" "}
                <span className="text-amber-600 dark:text-amber-400">{label ? `${label}.` : ""}</span>
              </span>

              {!hasAnswer && (
                <span className="text-slate-400 dark:text-slate-500 italic">
                  {isPrerequisiteDoc ? "ยังไม่มีเอกสารหลักฐาน" : "ยังไม่มีคำตอบ"}
                </span>
              )}

              {hasAnswer && localStatus === "pending" && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bgColor} ${config.textColor} border ${config.borderColor} flex items-center gap-1 whitespace-nowrap`}>
                  {config.icon} {config.label}
                </span>
              )}
              {hasAnswer && localStatus === "passed" && (
                <>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">ตรวจสอบแล้ว</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bgColor} ${config.textColor} border ${config.borderColor} flex items-center gap-1 whitespace-nowrap`}>
                    {config.icon} {config.label}
                  </span>
                </>
              )}
              {hasAnswer && localStatus === "needs_improvement" && (
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {mode === "qualifier" ? "ปรับปรุง" : "รอการแก้ไข"}
                </span>
              )}
              {hasAnswer && timestampText && (
                <span
                  aria-label={`อัปเดตล่าสุด ${timestampText}`}
                  className="text-[10px] font-bold text-slate-500 dark:text-slate-300 whitespace-nowrap"
                >
                  {timestampText}
                </span>
              )}

              {(answerCommand || qualifierClosedCommand) && (
                <div className="ml-auto">{answerCommand || qualifierClosedCommand}</div>
              )}
            </div>

            {!isPrerequisiteDoc && cleanValue && (
              <div className="answer-key-markdown mt-2 w-full min-w-0 text-slate-800 dark:text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {formatMarkdownWithThaiLists(cleanValue)}
                </ReactMarkdown>
              </div>
            )}

          </div>

          {/* Phase 5G: Attachments Panel (View mode) */}
          {attachments.length > 0 && (!is300 || isPrerequisiteDoc) && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <AttachmentPanel
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                documentId={documentId}
                questionId={questionId}
                userId={MOCK_TRAINEE_ID}
                readOnly={true}
                onlyImageAndPdf={isPrerequisiteDoc}
                filePrefix={questionPrefix}
              />
            </div>
          )}

          {/* Qualifier Assessment Controls — available for all statuses when Qualifier mode */}
          {mode === "qualifier" && hasAnswer && (() => {
            // Panel is open (pending, needs_improvement, or re-opened from passed)
            if (isQualifierPanelOpen) {
              return (
                <div
                  role="region"
                  aria-label={`การประเมิน ข้อ ${answerIdentity}${label ? ` คำถามย่อย ${label}` : ""}`}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && !isSaving) {
                      event.preventDefault();
                      handleCloseQualifierPanel(event);
                    }
                  }}
                  className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">การประเมิน (Qualifier)</span>
                    <div role="group" aria-label="คำสั่งการประเมิน" className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
                      {/* ผ่าน button — toggles between pass/revert */}
                      {localStatus === "passed" ? (
                        <Button
                          ref={qualifierFirstActionRef}
                          onClick={(e) => { e.stopPropagation(); handleSaveAssessment("pending"); }}
                          disabled={isSaving}
                          loading={savingAssessmentAction === "pending"}
                          loadingText="กำลังบันทึก..."
                          variant="outline"
                          size="small"
                          icon={<RotateCcw className="w-3.5 h-3.5" />}
                          className="h-8 !text-xs !font-bold !border-amber-300 !bg-amber-50 !text-amber-700 hover:!bg-amber-100 dark:!border-amber-700 dark:!bg-amber-900/20 dark:!text-amber-400 dark:hover:!bg-amber-900/30"
                        >
                          ยกเลิกผ่าน
                        </Button>
                      ) : (
                        <Button
                          ref={qualifierFirstActionRef}
                          onClick={(e) => { e.stopPropagation(); handleSaveAssessment("passed"); }}
                          disabled={isSaving}
                          loading={savingAssessmentAction === "passed"}
                          loadingText="กำลังบันทึก..."
                          variant="outline"
                          size="small"
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          className="h-8 !text-xs !font-bold !border-emerald-200 !bg-white !text-emerald-700 hover:!bg-emerald-50 dark:!border-emerald-800 dark:!bg-slate-800 dark:!text-emerald-400 dark:hover:!bg-emerald-900/20"
                        >
                          ผ่าน
                        </Button>
                      )}
                      {localStatus === "needs_improvement" && savedAssessmentStatus === "needs_improvement" ? (
                        <Button
                          onClick={(event) => {
                            event.stopPropagation();
                            setCancelImprovementModalOpen(true);
                          }}
                          disabled={isSaving}
                          loading={savingAssessmentAction === "pending"}
                          loadingText="กำลังบันทึก..."
                          variant="outline"
                          size="small"
                          icon={<RotateCcw className="w-3.5 h-3.5" />}
                          className="h-8 !text-xs !font-bold !border-amber-300 !bg-amber-50 !text-amber-700 hover:!bg-amber-100 dark:!border-amber-700 dark:!bg-amber-900/20 dark:!text-amber-400 dark:hover:!bg-amber-900/30"
                        >
                          ยกเลิกการปรับปรุง
                        </Button>
                      ) : localStatus !== "passed" && (
                        <Button
                          onClick={handleSelectNeedsImprovement}
                          disabled={isSaving}
                          variant="outline"
                          size="small"
                          icon={<RotateCcw className="w-3.5 h-3.5" />}
                          aria-pressed={localStatus === "needs_improvement"}
                          data-state={localStatus === "needs_improvement" ? "selected" : "available"}
                          className={`h-8 !text-xs !font-bold ${localStatus === "needs_improvement"
                            ? "!border-rose-600 !bg-rose-600 !text-white shadow-sm hover:!bg-rose-700"
                            : "!border-rose-200 !bg-white !text-rose-700 hover:!bg-rose-50 dark:!border-rose-800 dark:!bg-slate-800 dark:!text-rose-400 dark:hover:!bg-rose-900/20"
                          }`}
                        >
                          ปรับปรุง
                        </Button>
                      )}
                      <Button
                        onClick={handleCloseQualifierPanel}
                        disabled={isSaving}
                        variant="outline"
                        size="small"
                        icon={<X className="w-3.5 h-3.5" />}
                        className="h-8 !text-xs !font-bold !border-slate-500 !bg-slate-50 !text-slate-700 shadow-sm hover:!bg-slate-100 dark:!border-slate-400 dark:!bg-slate-800 dark:!text-slate-200 dark:hover:!bg-slate-700"
                      >
                        ปิดการประเมิน
                      </Button>
                    </div>
                  </div>

                  {localStatus === "needs_improvement" && (
                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200" onClick={e => e.stopPropagation()}>
                      <label htmlFor={assessmentFeedbackId} className="text-[10px] font-bold text-slate-500 uppercase">ข้อเสนอแนะสำหรับการปรับปรุง</label>
                      <textarea
                        ref={qualifierFeedbackRef}
                        id={assessmentFeedbackId}
                        value={localFeedback}
                        onChange={(e) => {
                          setLocalFeedback(e.target.value);
                          if (assessmentValidationMessage) setAssessmentValidationMessage("");
                        }}
                        aria-describedby={assessmentFeedbackHelpId}
                        aria-invalid={assessmentValidationMessage ? "true" : undefined}
                        placeholder="พิมพ์คำแนะนำที่นี่เพื่อให้ Trainee นำไปแก้ไข..."
                        rows={3}
                        className="w-full p-2 text-sm bg-rose-50/30 dark:bg-rose-900/10 border border-rose-200/50 dark:border-rose-800/30 rounded focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                        style={{ minHeight: '72px', resize: 'vertical' }}
                      />
                      {(() => {
                        const feedbackReady = localFeedback.trim().length > 0 && localFeedback.trim() !== originalFeedback.trim();
                        const feedbackHelpText = assessmentValidationMessage
                          || (localFeedback.trim().length === 0
                            ? "จำเป็นต้องระบุข้อเสนอแนะก่อนบันทึก"
                            : !feedbackReady
                              ? "กรุณาแก้ไขข้อเสนอแนะเดิมก่อนบันทึก"
                              : "พร้อมบันทึกข้อเสนอแนะ");
                        return (
                          <div className="flex items-center justify-between gap-3">
                            <p
                              id={assessmentFeedbackHelpId}
                              role={assessmentValidationMessage ? "alert" : undefined}
                              className={`text-[10px] ${assessmentValidationMessage ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}
                            >
                              {feedbackHelpText}
                            </p>
                            <Tooltip
                              content={!feedbackReady ? "กรุณาพิมพ์ข้อเสนอแนะก่อนบันทึก" : null}
                              position="top-end"
                            >
                              <Button
                                onClick={e => { e.stopPropagation(); handleSaveAssessment("needs_improvement"); }}
                                disabled={isSaving}
                                aria-disabled={!feedbackReady || undefined}
                                aria-describedby={assessmentFeedbackHelpId}
                                loading={savingAssessmentAction === "needs_improvement"}
                                loadingText="กำลังบันทึก..."
                                variant="secondary"
                                size="small"
                                icon={isSaved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                                className={`h-8 !text-[10px] !font-bold ${!feedbackReady ? "!cursor-not-allowed opacity-50" : ""}`}
                              >
                                {isSaved ? "บันทึกคำแนะนำเรียบร้อย!" : "บันทึกคำแนะนำ"}
                              </Button>
                            </Tooltip>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })()}
        </div>
      </div>

      <ConfirmModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: "" })}
        onConfirm={() => setAlertModal({ isOpen: false, message: "" })}
        title="แจ้งเตือน"
        message={alertModal.message}
        variant="warning"
      />

      <WorkflowModal
        isOpen={cancelImprovementModalOpen}
        title="ยกเลิกการปรับปรุง?"
        message={`การประเมินข้อนี้จะกลับเป็น “รอประเมิน” และคำแนะนำสำหรับการปรับปรุงจะถูกล้าง
คำตอบและไฟล์แนบของ Trainee จะยังคงอยู่ แต่ระบบจะคำนวณ Progress ใหม่`}
        actions={[
          {
            id: "continue-improvement",
            label: "กลับไปประเมินต่อ",
            variant: "secondary",
            onSelect: () => setCancelImprovementModalOpen(false),
          },
          {
            id: "confirm-cancel-improvement",
            label: "ยืนยันยกเลิกการปรับปรุง",
            variant: "danger",
            onSelect: handleConfirmCancelImprovement,
          },
        ]}
        onClose={() => setCancelImprovementModalOpen(false)}
      />
      </>
    );
  }

  // Edit Mode (Trainee only)
  return (
    <>
    {deleteWorkflowModal}
    <div
      ref={containerRef}
      data-color-mode={colorMode}
      data-question-id={questionId}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !isSaving) {
          event.preventDefault();
          event.stopPropagation();
          handleCancelEdit();
        }
      }}
      className={`rounded-md overflow-hidden border border-blue-400 dark:border-blue-500 shadow-xl transition-all ring-2 ring-blue-500/20 bg-white dark:bg-slate-900 z-10 w-full font-normal`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 px-2 py-1.5 border-b border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-slate-800 font-normal">
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-slate-900 dark:text-slate-100 shrink-0 text-sm">
              {isPrerequisiteDoc ? 'เอกสารหลักฐาน:' : 'คำตอบ:'} <span className="text-amber-600 dark:text-amber-400">{label ? `${label}.` : ''}</span>
            </span>
          </div>
          {/* Toolbar buttons removed — TiptapEditor provides its own toolbar */}
        </div>
        <div className="flex items-center gap-1.5">
          {hasSavedAnswer && (
            <Tooltip
              content={hasDirtyAnswerDraft
                ? `กรุณาบันทึกหรือยกเลิกการแก้ไขก่อนล้าง${isPrerequisiteDoc ? "เอกสารหลักฐาน" : "คำตอบ"}`
                : isPrerequisiteDoc
                  ? "ลบเอกสารหลักฐานและผลประเมินของข้อนี้"
                  : "ลบคำตอบ ผลประเมิน และไฟล์แนบของข้อนี้"}
              position="top-end"
            >
              <button
                ref={deleteAnswerButtonRef}
                type="button"
                onClick={handleClearAnswer}
                disabled={isSaving || hasDirtyAnswerDraft}
                aria-label={`ล้าง${isPrerequisiteDoc ? "เอกสารหลักฐาน" : "คำตอบ"}ข้อ ${fullAnswerLabel}`}
                aria-describedby={hasDirtyAnswerDraft ? deleteAnswerHelpId : undefined}
                className={`h-6 rounded border border-rose-200 px-2 text-[10px] font-bold text-rose-500 transition-colors hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:text-rose-400 dark:hover:text-rose-200 ${COMMAND_BUTTON_FOCUS}`}
              >
                {isPrerequisiteDoc ? "ล้างเอกสารหลักฐาน" : "ล้างคำตอบ"}
              </button>
            </Tooltip>
          )}
          {hasSavedAnswer && hasDirtyAnswerDraft && (
            <span id={deleteAnswerHelpId} className="sr-only">
              กรุณาบันทึกหรือยกเลิกการแก้ไขก่อนล้าง{isPrerequisiteDoc ? "เอกสารหลักฐาน" : "คำตอบ"}
            </span>
          )}
          <button
            onClick={handleCancelEdit}
            disabled={isSaving}
            className="h-6 px-2 text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ยกเลิก
          </button>
          {(() => {
            const trimmed = value.trim();
            const attachJson = attachments.length > 0 ? JSON.stringify(attachments) : null;
            const origAttachJson = originalAttachments.length > 0 ? JSON.stringify(originalAttachments) : null;
            const hasContent = isPrerequisiteDoc ? attachments.length > 0 : trimmed.length > 0;
            const hasChange = trimmed !== originalValue.trim() || attachJson !== origAttachJson;
            const canSave = hasContent && (localStatus !== "needs_improvement" || hasChange);
            return (
              <Tooltip
                content={!canSave
                  ? localStatus === "needs_improvement"
                    ? `กรุณาแก้ไข${isPrerequisiteDoc ? "เอกสารหลักฐาน" : "คำตอบ"}ก่อนบันทึก`
                    : isPrerequisiteDoc
                      ? "กรุณาแนบเอกสารหลักฐาน"
                      : "กรุณาระบุคำตอบ"
                  : null}
                position="top-end"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleSaveAnswer(); }}
                  disabled={isSaving || !canSave}
                  className={`h-6 px-3 text-xs font-bold rounded transition-colors flex items-center gap-1 shadow-sm ${
                    canSave
                      ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                      : "bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Save className="w-3 h-3" />
                  บันทึก
                </button>
              </Tooltip>
            );
          })()}
        </div>
      </div>
      {!isPrerequisiteDoc && (
        <div className="px-1 pb-1">
          <TiptapEditor
            initialContent={value}
            onChange={(md) => setValue(md)}
            placeholder="ระบุคำตอบของคุณที่นี่..."
            editorId={`trainee-answer-${documentId}-${questionId}-${subQuestionCode || "main"}`}
            ariaLabel={`คำตอบ ข้อ ${questionPrefix || questionId}${label ? ` คำถามย่อย ${label}` : ""}`}
            variant="default"
            minHeight="120px"
          />
        </div>
      )}
      {isPrerequisiteDoc && (
        <div className="p-4 text-center">
           <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium italic">
             กรุณาแนบไฟล์เอกสารหลักฐาน (PDF หรือรูปภาพ) เพื่อรับการประเมิน
           </p>
        </div>
      )}
      {/* Phase 5G: Attachments Panel (Edit mode) */}
      {(!is300 || isPrerequisiteDoc) && (
        <div className="px-3 pb-2">
          <AttachmentPanel
            attachments={attachments}
            onAttachmentsChange={handleAttachmentsChange}
            documentId={documentId}
            questionId={questionId}
            userId={MOCK_TRAINEE_ID}
            onlyImageAndPdf={isPrerequisiteDoc}
            filePrefix={questionPrefix}
            onDeleteFile={handleTraineeAttachmentDelete}
            autoFocusUpload={isPrerequisiteDoc}
          />
        </div>
      )}
    </div>

    <ConfirmModal
      isOpen={alertModal.isOpen}
      onClose={() => setAlertModal({ isOpen: false, message: "" })}
      onConfirm={() => setAlertModal({ isOpen: false, message: "" })}
      title="แจ้งเตือน"
      message={alertModal.message}
      variant="warning"
    />

    <WorkflowModal
      isOpen={discardDraftModalOpen}
      title="ละทิ้งการแก้ไขคำตอบ?"
      message={`ข้อความและไฟล์แนบที่แก้ไขในครั้งนี้ยังไม่ได้บันทึก
เลือก “แก้ไขต่อ” เพื่อกลับไปทำงานต่อ หรือ “ละทิ้งการแก้ไข” เพื่อลบเฉพาะการเปลี่ยนแปลงครั้งนี้`}
      actions={[
        {
          id: "continue-editing",
          label: "แก้ไขต่อ",
          variant: "secondary",
          onSelect: () => setDiscardDraftModalOpen(false),
        },
        {
          id: "discard-answer-draft",
          label: "ละทิ้งการแก้ไข",
          variant: "danger",
          onSelect: discardAnswerDraft,
        },
      ]}
      onClose={() => setDiscardDraftModalOpen(false)}
    />

    </>
  );
};

export default React.memo(TraineeAnswerBox);
