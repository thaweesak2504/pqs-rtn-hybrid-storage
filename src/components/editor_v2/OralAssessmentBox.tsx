import { invoke } from "@tauri-apps/api/tauri";
import { CheckCircle2, Edit3, FileText, Save, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ConfirmModal from "../modals/ConfirmModal";

type AssessmentStatus = "pending" | "passed" | "needs_improvement";

interface OralAssessmentBoxProps {
  questionId: string;
  documentId: string;
  status?: AssessmentStatus;
  feedback?: string | null;
  onSaved?: () => void;
}

const MOCK_TRAINEE_ID = "T-001";
const MOCK_QUALIFIER_ID = "Q-001";

const OralAssessmentBox: React.FC<OralAssessmentBoxProps> = ({
  questionId,
  documentId,
  status = "pending",
  feedback = "",
  onSaved,
}) => {
  const normalizedStatus = status === "passed" ? "passed" : "pending";
  const [localStatus, setLocalStatus] = useState<"pending" | "passed">(normalizedStatus);
  const [localFeedback, setLocalFeedback] = useState(feedback || "");
  const [draftFeedback, setDraftFeedback] = useState(feedback || "");
  const [isEditorOpen, setIsEditorOpen] = useState(!(feedback || "").trim());
  const [isSaving, setIsSaving] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: "",
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const nextFeedback = feedback || "";
    const nextStatus = status === "passed" ? "passed" : "pending";
    setLocalStatus(nextStatus);
    setLocalFeedback(nextFeedback);
    setDraftFeedback(nextFeedback);
    setIsEditorOpen(!nextFeedback.trim());
  }, [feedback, status]);

  useEffect(() => {
    if (!isEditorOpen || !textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [draftFeedback, isEditorOpen]);

  const trimmedDraft = useMemo(() => draftFeedback.trim(), [draftFeedback]);
  const hasSavedReport = localFeedback.trim().length > 0;

  const persistAssessment = async (targetStatus: "pending" | "passed", nextFeedback: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await invoke("save_qualifier_assessment", {
        args: {
          user_id: MOCK_TRAINEE_ID,
          question_id: questionId,
          document_id: documentId,
          sub_question_code: "",
          status: targetStatus,
          feedback: nextFeedback || null,
          qualifier_id: MOCK_QUALIFIER_ID,
        },
      });
      setLocalStatus(targetStatus);
      setLocalFeedback(nextFeedback);
      setDraftFeedback(nextFeedback);
      setIsEditorOpen(false);
      onSaved?.();
    } catch (error) {
      console.error("Failed to save oral assessment:", error);
      setAlertModal({
        isOpen: true,
        message: "ไม่สามารถบันทึกรายงานการประเมินได้ (โปรดแจ้งนักพัฒนา)",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReport = async () => {
    if (!trimmedDraft) return;
    await persistAssessment(localStatus === "passed" ? "passed" : "pending", trimmedDraft);
  };

  const handleMarkPassed = async () => {
    const nextFeedback = localFeedback.trim() || trimmedDraft;
    if (!nextFeedback) return;
    await persistAssessment("passed", nextFeedback);
  };

  return (
    <>
    <div className="mt-2 rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-900/20 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <FileText className="w-3.5 h-3.5" />
            การประเมิน (Qualifier)
          </span>
          {localStatus === "passed" && (
            <span className="inline-flex items-center rounded-md border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-100/60 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              ผ่านแล้ว
            </span>
          )}
        </div>

        {isEditorOpen ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDraftFeedback(localFeedback);
                setIsEditorOpen(!hasSavedReport);
              }}
              disabled={isSaving}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveReport();
              }}
              disabled={isSaving || !trimmedDraft}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              บันทึก
            </button>
          </div>
        ) : !hasSavedReport ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDraftFeedback(localFeedback);
              setIsEditorOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 dark:border-blue-800/50 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            รายงานการประเมิน
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDraftFeedback(localFeedback);
                setIsEditorOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              แก้ไข
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMarkPassed();
              }}
              disabled={isSaving}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${localStatus === "passed"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-emerald-200 dark:border-emerald-800/50 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              ผ่าน
            </button>
          </div>
        )}
      </div>

      {isEditorOpen && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={draftFeedback}
            onChange={(e) => setDraftFeedback(e.target.value)}
            placeholder="พิมพ์รายงานการประเมินที่นี่..."
            className="w-full resize-none overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm leading-5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
            style={{ minHeight: '2rem', height: '2rem' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
        </div>
      )}

      {!isEditorOpen && hasSavedReport && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <div className="rounded-md border border-slate-200/70 dark:border-slate-700/70 bg-white/80 dark:bg-slate-800/70 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
            {localFeedback}
          </div>
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
    </>
  );
};

export default React.memo(OralAssessmentBox);
