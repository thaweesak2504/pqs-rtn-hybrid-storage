import React, { useEffect, useMemo, useState } from "react";
import { traineeAnswerService } from "../../services/traineeAnswerService";
import type { DeleteAnswerResult } from "../../types";
import WorkflowModal from "./WorkflowModal";

type AssessmentStatus = "pending" | "passed" | "needs_improvement";

interface DeleteAnswerWorkflowModalProps {
  isOpen: boolean;
  userId: string;
  documentId: string;
  questionId: string;
  subQuestionCode: string;
  answerLabel: string;
  answerTextPresent: boolean;
  attachmentCount: number;
  assessmentStatus: AssessmentStatus;
  contentKind?: "answer" | "evidence";
  onClose: () => void;
  onDeleted: (result: DeleteAnswerResult) => void;
  originFocusRef?: React.RefObject<HTMLElement>;
  successFocusRef?: React.RefObject<HTMLElement>;
}

const ASSESSMENT_LABELS: Record<AssessmentStatus, string> = {
  pending: "รอประเมิน (ยังไม่มีผลประเมิน)",
  passed: "ผ่าน",
  needs_improvement: "ปรับปรุง",
};

const resultIsDeleted = (result: DeleteAnswerResult): boolean => (
  result.database.matched
  && result.database.committed
  && result.database.answerRowsDeleted === 1
);

const resultNeedsAttention = (result: DeleteAnswerResult): boolean => (
  !resultIsDeleted(result)
  || !result.progress.complete
  || !result.attachments.cleanupComplete
);

const formatResultDetails = (result: DeleteAnswerResult): string => {
  const lines = [
    `Delete Answer: ${result.documentId} / ${result.questionId} / ${result.subQuestionCode || "(main)"}`,
    `User: ${result.userId}`,
    `Matched: ${result.database.matched}`,
    `Database committed: ${result.database.committed}`,
    `Answer rows deleted: ${result.database.answerRowsDeleted}`,
    `Answer text was present: ${result.database.answerTextWasPresent}`,
    `Was assessed: ${result.database.wasAssessed}`,
    `Attachment paths referenced: ${result.database.referencedAttachmentPathCount}`,
    `Invalid attachment metadata: ${result.database.invalidAttachmentMetadata}`,
    `Progress attempted: ${result.progress.attempted}`,
    `Progress sections updated: ${result.progress.sectionsUpdated}`,
    `Progress complete: ${result.progress.complete}`,
    `Managed files deleted: ${result.attachments.managedFilesDeleted}`,
    `Managed files retained: ${result.attachments.managedFilesRetained}`,
    `Managed files missing: ${result.attachments.managedFilesMissing}`,
    `Filesystem cleanup complete: ${result.attachments.cleanupComplete}`,
  ];
  if (result.progress.failure) lines.push(`Progress failure: ${result.progress.failure}`);
  for (const failure of result.attachments.failures) {
    lines.push(`- ${failure.logicalPath}: ${failure.message}`);
  }
  return lines.join("\n");
};

const DeleteAnswerResultSummary: React.FC<{
  result: DeleteAnswerResult;
  contentKind: "answer" | "evidence";
}> = ({ result, contentKind }) => {
  const deleted = resultIsDeleted(result);
  const needsAttention = resultNeedsAttention(result);
  const isEvidence = contentKind === "evidence";
  const metrics = [
    [isEvidence ? "ชุดหลักฐานที่ลบ" : "คำตอบที่ลบ", result.database.answerRowsDeleted],
    ["ผลประเมินที่ลบ", result.database.wasAssessed ? 1 : 0],
    ["Section Progress ที่คำนวณใหม่", result.progress.sectionsUpdated],
    ["ไฟล์ที่ลบ", result.attachments.managedFilesDeleted],
  ] as const;

  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-md border border-github-border-primary bg-github-bg-primary px-3 py-2">
            <div className="text-xs text-github-text-tertiary">{label}</div>
            <div className="mt-0.5 text-lg font-semibold text-github-text-primary">{value}</div>
          </div>
        ))}
      </div>

      <div className={`rounded-md border px-3 py-2 text-sm ${!needsAttention
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      }`}>
        {!deleted
          ? `ไม่พบ${isEvidence ? "เอกสารหลักฐาน" : "คำตอบ"}ตาม identity ที่ระบุ จึงไม่มีข้อมูลถูกลบ`
          : !result.progress.complete
            ? `ลบ${isEvidence ? "เอกสารหลักฐาน" : "คำตอบ"}แล้ว แต่การคำนวณ Progress ใหม่ไม่สมบูรณ์`
            : !result.attachments.cleanupComplete
              ? `ลบ${isEvidence ? "เอกสารหลักฐาน" : "คำตอบ"}และคำนวณ Progress แล้ว แต่ไฟล์บางส่วนต้องตรวจสอบ`
              : `ลบ${isEvidence ? "เอกสารหลักฐาน" : "คำตอบ"} คำนวณ Progress และจัดการไฟล์แนบเสร็จสมบูรณ์`}
      </div>

      {needsAttention && (
        <div className="rounded-md border border-github-border-primary bg-github-bg-primary p-3 text-xs text-github-text-secondary">
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
            <dt>คำตอบตรงกับ identity</dt>
            <dd>{result.database.matched ? "ใช่" : "ไม่"}</dd>
            <dt>Progress recalculation</dt>
            <dd>{result.progress.complete ? "สมบูรณ์" : "ต้องตรวจสอบ"}</dd>
            <dt>ไฟล์ที่ยังถูกใช้งานและเก็บไว้</dt>
            <dd>{result.attachments.managedFilesRetained}</dd>
            <dt>ไฟล์ที่หาไม่พบ</dt>
            <dd>{result.attachments.managedFilesMissing}</dd>
          </dl>
          {(result.progress.failure || result.attachments.failures.length > 0) && (
            <ul aria-label="รายละเอียดที่ต้องตรวจสอบ" className="mt-2 space-y-1 border-t border-github-border-primary pt-2">
              {result.progress.failure && <li>{`Progress: ${result.progress.failure}`}</li>}
              {result.attachments.failures.map((failure, index) => (
                <li key={`${failure.logicalPath}-${index}`}>
                  <span className="font-mono text-github-text-primary">{failure.logicalPath}</span>
                  {`: ${failure.message}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const DeleteAnswerWorkflowModal: React.FC<DeleteAnswerWorkflowModalProps> = ({
  isOpen,
  userId,
  documentId,
  questionId,
  subQuestionCode,
  answerLabel,
  answerTextPresent,
  attachmentCount,
  assessmentStatus,
  contentKind = "answer",
  onClose,
  onDeleted,
  originFocusRef,
  successFocusRef,
}) => {
  const [result, setResult] = useState<DeleteAnswerResult | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const isEvidence = contentKind === "evidence";
  const contentLabel = isEvidence ? "เอกสารหลักฐาน" : "คำตอบ";

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setCopyFeedback("");
    }
  }, [isOpen]);

  const deleteAnswer = async () => {
    try {
      const nextResult = await traineeAnswerService.deleteAnswer({
        userId,
        questionId,
        documentId,
        subQuestionCode,
      });
      if (!nextResult?.database || !nextResult.progress || !nextResult.attachments) {
        throw new Error("Backend ไม่ได้ส่งผลการลบที่สมบูรณ์กลับมา");
      }
      setResult(nextResult);
      if (resultIsDeleted(nextResult)) onDeleted(nextResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`ลบ${contentLabel}ข้อ ${answerLabel} ไม่สำเร็จ: ${message}`);
    }
  };

  const closeWorkflow = () => {
    setResult(null);
    setCopyFeedback("");
    onClose();
  };

  const copyResultDetails = async () => {
    if (!result) return;
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API ไม่พร้อมใช้งาน");
    await navigator.clipboard.writeText(formatResultDetails(result));
    setCopyFeedback("คัดลอกรายละเอียดแล้ว");
  };

  const needsAttention = result !== null && resultNeedsAttention(result);
  const resultTitle = useMemo(() => {
    if (!result) return "";
    if (!resultIsDeleted(result)) return `ไม่พบ${contentLabel}ที่ต้องลบ`;
    return needsAttention
      ? `ลบ${contentLabel}แล้ว แต่มีรายการต้องตรวจสอบ`
      : `ลบ${contentLabel}เรียบร้อย`;
  }, [contentLabel, needsAttention, result]);

  return (
    <>
      <WorkflowModal
        isOpen={isOpen && result === null}
        title={`ลบ${contentLabel}ข้อ ${answerLabel}?`}
        message={`คำสั่งนี้ย้อนกลับไม่ได้ และมีผลเฉพาะ${contentLabel}ตามข้อที่แสดงด้านล่าง`}
        onClose={closeWorkflow}
        copyActionError
        returnFocusRef={originFocusRef}
        actions={[
          {
            id: "review-answer",
            label: "กลับไปแก้ไข",
            variant: "secondary",
            onSelect: closeWorkflow,
          },
          {
            id: "confirm-delete-answer",
            label: `ลบ${contentLabel}ข้อนี้`,
            retryLabel: "ลองลบอีกครั้ง",
            variant: "danger",
            onSelect: deleteAnswer,
          },
        ]}
      >
        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-github-border-primary bg-github-bg-primary p-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-github-text-tertiary">{isEvidence ? "ข้อ" : "คำตอบ"}</dt>
              <dd className="font-medium text-github-text-primary">{answerLabel}</dd>
              {!isEvidence && (
                <>
                  <dt className="text-github-text-tertiary">ข้อความ</dt>
                  <dd className="text-github-text-primary">{answerTextPresent ? "มีข้อความคำตอบ" : "ไม่มีข้อความคำตอบ"}</dd>
                </>
              )}
              <dt className="text-github-text-tertiary">ไฟล์แนบ</dt>
              <dd className="text-github-text-primary">{attachmentCount} ไฟล์</dd>
              <dt className="text-github-text-tertiary">การประเมิน</dt>
              <dd className="text-github-text-primary">{ASSESSMENT_LABELS[assessmentStatus]}</dd>
            </dl>
          </div>
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
            <div className="font-medium text-red-700 dark:text-red-300">ผลของคำสั่งนี้</div>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-github-text-secondary">
              <li>{isEvidence ? "ลบชุดเอกสารหลักฐานและผลประเมินของข้อนี้" : "ลบข้อความ ผลประเมิน และไฟล์แนบที่เป็นของคำตอบข้อนี้"}</li>
              <li>คำนวณ Progress ราย Section ของรอบจำลองใหม่</li>
              <li>{isEvidence ? "เอกสารหลักฐานข้ออื่น Questions และข้อมูล Source จะไม่เปลี่ยน" : "คำตอบข้ออื่น Questions และ Answer Keys จะไม่เปลี่ยน"}</li>
            </ul>
          </div>
        </div>
      </WorkflowModal>

      <WorkflowModal
        isOpen={isOpen && result !== null}
        title={resultTitle}
        message={result ? `ผลจากฐานข้อมูลสำหรับ${contentLabel}ข้อ ${answerLabel}` : ""}
        onClose={closeWorkflow}
        returnFocusRef={result && resultIsDeleted(result) ? successFocusRef : originFocusRef}
        actions={[
          ...(needsAttention
            ? [{
              id: "copy-delete-result",
              label: "คัดลอกรายละเอียด",
              variant: "secondary" as const,
              onSelect: copyResultDetails,
            }]
            : []),
          {
            id: "close-delete-result",
            label: "ปิดผลการลบ",
            variant: "primary",
            onSelect: closeWorkflow,
          },
        ]}
      >
        {result && <DeleteAnswerResultSummary result={result} contentKind={contentKind} />}
        {copyFeedback && <p role="status" className="mt-3 text-xs text-github-text-secondary">{copyFeedback}</p>}
      </WorkflowModal>
    </>
  );
};

export default DeleteAnswerWorkflowModal;
