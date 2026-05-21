import { invoke } from "@tauri-apps/api/tauri";
import { CheckCircle2, MessageSquare, RotateCcw, Save } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import ConfirmModal from "../modals/ConfirmModal";
import { UserAnswer } from "./PqsQuestionSection";
import { logger } from '../../utils/logger';
import AttachmentPanel from "./AttachmentPanel";
import Tooltip from "../ui/Tooltip";

// Simulation Constants
const MOCK_TRAINEE_ID = "T-001";
const MOCK_QUALIFIER_ID = "Q-001";

// Thai Helpers
const THAI_ALPHA = ["ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ", "ฎ", "ฏ", "ฐ", "ฑ", "ฒ", "ณ", "ด", "ต", "ถ", "ท", "ธ", "น", "บ", "ป", "ผ", "ฝ", "พ", "ฟ", "ภ", "ม", "ย", "ร", "ล", "ว", "ศ", "ษ", "ส", "ห", "ฬ", "อ", "ฮ"];
const THAI_DIGITS = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];

const toThaiDigit = (n: number): string => {
  return n.toString().split("").map(d => THAI_DIGITS[parseInt(d)] || d).join("");
};

export type AssessmentStatus = "pending" | "passed" | "needs_improvement";

type ToolbarAction = "bold" | "italic" | "ol" | "ul" | "thai_alpha" | "thai_num" | "table";

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
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [localFeedback, setLocalFeedback] = useState(feedback);
  const [localStatus, setLocalStatus] = useState<AssessmentStatus>(status);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isQualifierPanelOpen, setIsQualifierPanelOpen] = useState(status === "pending");
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with props
  useEffect(() => {
    if (traineeAnswer) {
      const answerText = traineeAnswer.answer_text || "";
      const feedbackText = traineeAnswer.feedback || "";
      setValue(answerText);
      setOriginalValue(answerText);
      setLocalStatus(traineeAnswer.status || "pending");
      setLocalFeedback(feedbackText);
      setOriginalFeedback(feedbackText);
      setIsQualifierPanelOpen(traineeAnswer.status === "pending");
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
      setLocalFeedback(feedback);
      setOriginalFeedback(feedback);
      setIsQualifierPanelOpen(status === "pending");
      setAttachments([]);
      setOriginalAttachments([]);
    }
  }, [traineeAnswer, initialValue, status, feedback]);

  const colorMode = useMemo<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }, []);

  // Handle outside click to save and close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    }
    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing]);

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
      setIsEditing(false);
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

  const handleSaveAssessment = async (targetStatus: AssessmentStatus) => {
    if (isSaving) return;

    // Validation: "needs_improvement" requires non-empty feedback
    if (targetStatus === "needs_improvement") {
      const trimmedFeedback = localFeedback.trim();
      if (!trimmedFeedback) {
        setAlertModal({ isOpen: true, message: "กรุณาระบุข้อเสนอแนะสำหรับการปรับปรุงก่อนบันทึก" });
        return;
      }
      // Prevent re-saving identical feedback (no actual change)
      if (localStatus === "needs_improvement" && trimmedFeedback === originalFeedback.trim()) {
        setAlertModal({ isOpen: true, message: "ยังไม่มีการเปลี่ยนแปลงข้อเสนอแนะ — กรุณาแก้ไขก่อนบันทึก" });
        return;
      }
    }

    setIsSaving(true);
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
      // Update original feedback after successful save
      if (targetStatus === "needs_improvement") {
        setOriginalFeedback(localFeedback.trim());
      } else {
        // Clear feedback completely when passing or reverting to pending
        setOriginalFeedback("");
        setLocalFeedback("");
      }
      // Close panel after successful save
      setIsQualifierPanelOpen(false);
      // Immediately close and refresh after save per user request
      onAssessmentSaved?.();
    } catch (error) {
      logger.error("Failed to save assessment:", error);
      setAlertModal({
        isOpen: true,
        message: "ไม่สามารถบันทึกการประเมินได้ (โปรดแจ้งนักพัฒนา)",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const applyAction = useCallback(
    (action: ToolbarAction) => {
      const el = textareaRef.current;
      if (!el) return;

      const selectionStart = el.selectionStart ?? 0;
      const selectionEnd = el.selectionEnd ?? 0;
      const selectedText = el.value.slice(selectionStart, selectionEnd);

      const replaceSelection = (next: string) => {
        el.setRangeText(next, selectionStart, selectionEnd, "end");
        setValue(el.value);
        el.focus();
      };

      if (action === "bold") {
        replaceSelection(`**${selectedText || "ข้อความ"}**`);
        return;
      }
      if (action === "italic") {
        replaceSelection(`*${selectedText || "ข้อความ"}*`);
        return;
      }
      if (action === "ul") {
        const lines = (selectedText || "รายการ").split("\n").map((l) => `- ${l || ""}`);
        replaceSelection(lines.join("\n"));
        return;
      }
      if (action === "ol") {
        const lines = Array.from({ length: 10 }, (_, i) => `${i + 1}. รายการที่ ${i + 1}`);
        replaceSelection(`\n${lines.join("\n")}\n`);
        return;
      }
      if (action === "thai_alpha") {
        const items = THAI_ALPHA.slice(0, 10).map((ch, i) => `${ch}. รายการที่ ${i + 1}`).join("\n");
        replaceSelection(`\n${items}\n`);
        return;
      }
      if (action === "thai_num") {
        const items = Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `${toThaiDigit(n)}. รายการที่ ${n}`).join("\n");
        replaceSelection(`\n${items}\n`);
        return;
      }
      if (action === "table") {
        const table = `\n| หัวข้อ 1 | หัวข้อ 2 | หัวข้อ 3 | หัวข้อ 4 |\n| --- | --- | --- | --- |\n| ข้อมูล | ข้อมูล | ข้อมูล | ข้อมูล |\n| ข้อมูล | ข้อมูล | ข้อมูล | ข้อมูล |\n`;
        replaceSelection(table);
      }
    },
    []
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const trimmedText = pastedText.trim();

      const el = textareaRef.current;
      if (!el) return;

      const selectionStart = el.selectionStart ?? 0;
      const selectionEnd = el.selectionEnd ?? 0;
      const currentValue = el.value;

      const newValue = currentValue.substring(0, selectionStart) + trimmedText + currentValue.substring(selectionEnd);
      setValue(newValue);

      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + trimmedText.length;
      });
    },
    []
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || !isEditing) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(el.scrollHeight, 90)}px`;
  }, [value, isEditing]);

  const handleEditStart = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Prevent parent toggle
    // Allow 'trainee' or 'edit' mode to edit the answer (edit mode only if not locked)
    const canEdit = mode === "trainee" || (mode === "edit" && !readOnly);
    if (readOnly || !canEdit || localStatus === "passed") return;
    setIsEditing(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 10);
  };

  const handleAttachmentsChange = async (newAttachments: string[]) => {
    setAttachments(newAttachments);
    if (mode === "trainee") {
      try {
        await invoke("save_trainee_answer", {
          args: {
            user_id: MOCK_TRAINEE_ID,
            question_id: questionId,
            document_id: documentId,
            sub_question_code: subQuestionCode || "",
            answer_text: value.trim(),
            attachments: newAttachments.length > 0 ? JSON.stringify(newAttachments) : null,
          }
        });
        if (onAnswerSaved) onAnswerSaved();
      } catch (err) {
        logger.error("Failed to auto-save attachments:", err);
      }
    }
  };

  const cleanValue = value.trim();
  const hasAnswer = cleanValue.length > 0 || attachments.length > 0;

  // Status Styles
  const statusConfig = {
    pending: {
      borderColor: hasAnswer ? "border-amber-400 dark:border-amber-500/50" : "border-slate-200 dark:border-slate-800",
      bgColor: hasAnswer ? "bg-amber-50/50 dark:bg-amber-900/10" : "bg-slate-50/30 dark:bg-slate-900/10",
      textColor: hasAnswer ? "text-amber-800 dark:text-amber-300" : "text-slate-500",
      icon: hasAnswer ? <span className="text-sm">💡</span> : null,
      label: hasAnswer ? "รอประเมิน" : "ยังไม่ได้ส่งคำตอบ"
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

  // View Mode
  if (!isEditing) {
    return (
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
              <button
                onClick={(e) => { e.stopPropagation(); setIsQualifierPanelOpen(true); }}
                className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-blue-200 dark:border-blue-700 hover:bg-blue-50 transition-colors"
              >
                แก้ไขคำแนะนำ
              </button>
            )}
          </div>
        )}

        <div
          ref={containerRef}
          className={`px-3 py-2.5 text-sm font-normal rounded-md border transition-all ${config.bgColor} ${config.borderColor} ${readOnly || localStatus === "passed" || (mode !== "trainee" && mode !== "edit") ? "cursor-default" : "cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500"}`}
          onClick={handleEditStart}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 pb-[2px]">
              <div className="flex items-start justify-between gap-4">
                {/* Left Side: Prefix + Content */}
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {!isPrerequisiteDoc && (
                    <>
                      <span className="text-slate-900 dark:text-slate-100 shrink-0">คำตอบ: <span className="text-amber-600 dark:text-amber-400">{label ? `${label}.` : ''}</span></span>

                      {cleanValue ? (
                        <div className="answer-key-markdown min-w-0 flex-1 text-slate-800 dark:text-slate-200">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {cleanValue.replace(/\n/g, "  \n")}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center flex-wrap gap-2 min-w-0">
                          <span className="text-slate-400 dark:text-slate-500 italic mt-[2px]">
                            {readOnly ? "ยังไม่มีคำตอบ" : "[คลิกเพื่อระบุคำตอบ...]"}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bgColor} ${config.textColor} border ${config.borderColor} flex items-center gap-1`}>
                            {config.icon} {config.label}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {isPrerequisiteDoc && (
                    <span className="text-slate-900 dark:text-slate-100 shrink-0">
                      เอกสารหลักฐาน: <span className="text-amber-600 dark:text-amber-400">{label ? `${label}.` : ''}</span>
                      {attachments.length === 0 && !readOnly && (
                        <span className="text-slate-400 dark:text-slate-500 italic ml-2 text-xs">
                          [คลิกเพื่อแนบเอกสาร...]
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Right Side: Status Badges (Only shown if answer exists) */}
                {(hasAnswer || !!timestampText) && (
                  <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0 mt-[2px]">
                    {/* Timestamp display */}
                    {timestampText && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                        {timestampText}
                      </span>
                    )}

                    {/* Status Badges */}
                    {localStatus === "pending" && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bgColor} ${config.textColor} border ${config.borderColor} flex items-center gap-1 whitespace-nowrap`}>
                        {config.icon} {config.label}
                      </span>
                    )}
                    {localStatus === "passed" && (
                      <>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">ตรวจสอบแล้ว</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bgColor} ${config.textColor} border ${config.borderColor} flex items-center gap-1 whitespace-nowrap`}>
                          {config.icon} {config.label}
                        </span>
                      </>
                    )}
                    {localStatus === "needs_improvement" && (
                      <>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">รอการแก้ไข</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bgColor} ${config.textColor} border ${config.borderColor} flex items-center gap-1 whitespace-nowrap`}>
                          {config.icon} {config.label}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Phase 5G: Attachments Panel (View mode) */}
          {attachments.length > 0 && (
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
            // PASSED state: show a compact "แก้ไขการประเมิน" button to reopen the panel
            if (localStatus === "passed" && !isQualifierPanelOpen) {
              return (
                <div className="mt-3 pt-2 border-t border-emerald-100 dark:border-emerald-900/30 flex items-center justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsQualifierPanelOpen(true); }}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    แก้ไขการประเมิน
                  </button>
                </div>
              );
            }

            // Panel is open (pending, needs_improvement, or re-opened from passed)
            if (isQualifierPanelOpen) {
              return (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">การประเมิน (Qualifier)</span>
                    <div className="flex items-center gap-2">
                      {/* ผ่าน button — toggles between pass/revert */}
                      {localStatus === "passed" ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveAssessment("pending"); }}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          ยกเลิกผ่าน
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveAssessment("passed"); }}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ผ่าน
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setLocalStatus("needs_improvement"); }}
                        disabled={isSaving || localStatus === "passed"}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${localStatus === "needs_improvement" ? "bg-rose-600 text-white shadow-lg" : localStatus === "passed" ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50" : "bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        ปรับปรุง
                      </button>
                    </div>
                  </div>

                  {localStatus === "needs_improvement" && (
                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200" onClick={e => e.stopPropagation()}>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">ข้อเสนอแนะสำหรับการปรับปรุง</label>
                      <textarea
                        value={localFeedback}
                        onChange={(e) => setLocalFeedback(e.target.value)}
                        placeholder="พิมพ์คำแนะนำที่นี่เพื่อให้ Trainee นำไปแก้ไข..."
                        rows={3}
                        className="w-full p-2 text-sm bg-rose-50/30 dark:bg-rose-900/10 border border-rose-200/50 dark:border-rose-800/30 rounded focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                        style={{ minHeight: '72px', resize: 'vertical' }}
                      />
                      {(() => {
                        const feedbackReady = localFeedback.trim().length > 0 && localFeedback.trim() !== originalFeedback.trim();
                        return (
                          <div className="flex justify-end">
                            <Tooltip
                              content={!feedbackReady ? "กรุณาพิมพ์ข้อเสนอแนะก่อนบันทึก" : null}
                              position="top-end"
                            >
                              <button
                                onClick={e => { e.stopPropagation(); handleSaveAssessment("needs_improvement"); }}
                                disabled={isSaving || !feedbackReady}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1.5 shadow-sm ${
                                  isSaved
                                    ? "bg-emerald-600 text-white"
                                    : feedbackReady
                                      ? "bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 cursor-pointer"
                                      : "bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60"
                                }`}
                              >
                                {isSaved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                                {isSaved ? "บันทึกคำแนะนำเรียบร้อย!" : "บันทึกคำแนะนำ"}
                              </button>
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
    );
  }

  // Edit Mode (Trainee only)
  return (
    <>
    <div
      ref={containerRef}
      data-color-mode={colorMode}
      data-question-id={questionId}
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
          {!isPrerequisiteDoc && (
            <>
              <button
                type="button"
                title="ตัวหนา (Bold)"
                onClick={(e) => { e.stopPropagation(); applyAction("bold"); }}
                className="h-6 px-2 text-xs font-bold rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                B
              </button>
              <button
                type="button"
                title="ตัวเอียง (Italic)"
                onClick={(e) => { e.stopPropagation(); applyAction("italic"); }}
                className="h-6 px-2 text-xs italic rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                I
              </button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
              <button
                type="button"
                title="ลำดับอักษรไทย (ก. ข. ค. ง. ...)"
                onClick={(e) => { e.stopPropagation(); applyAction("thai_alpha"); }}
                className="h-6 px-2 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ก.ข.ค.
              </button>
              <button
                type="button"
                title="ลำดับเลขไทย (๑. ๒. ๓. ...)"
                onClick={(e) => { e.stopPropagation(); applyAction("thai_num"); }}
                className="h-6 px-2 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ๑.๒.๓.
              </button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
              <button
                type="button"
                title="แทรกตาราง (Table)"
                onClick={(e) => { e.stopPropagation(); applyAction("table"); }}
                className="h-6 px-2 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Table
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
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
                content={!canSave ? (localStatus === "needs_improvement" ? "กรุณาแก้ไขคำตอบก่อนบันทึก" : "กรุณาระบุคำตอบ") : null}
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
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={handlePaste}
          placeholder="ระบุคำตอบของคุณที่นี่..."
          className="w-full p-3 text-sm font-normal resize-none overflow-hidden leading-relaxed font-['Kanit',sans-serif] bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none min-h-[120px]"
        />
      )}
      {isPrerequisiteDoc && (
        <div className="p-4 text-center">
           <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium italic">
             กรุณาแนบไฟล์เอกสารหลักฐาน (PDF หรือรูปภาพ) เพื่อรับการประเมิน
           </p>
        </div>
      )}
      {/* Phase 5G: Attachments Panel (Edit mode) */}
      <div className="px-3 pb-2">
        <AttachmentPanel
          attachments={attachments}
          onAttachmentsChange={handleAttachmentsChange}
          documentId={documentId}
          questionId={questionId}
          userId={MOCK_TRAINEE_ID}
          onlyImageAndPdf={isPrerequisiteDoc}
          filePrefix={questionPrefix}
        />
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
    </>
  );
};

export default React.memo(TraineeAnswerBox);
