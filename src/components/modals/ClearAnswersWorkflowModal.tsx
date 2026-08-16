import React, { useEffect, useState } from "react";
import type { ClearAnswersResult } from "../../types";
import { simulationService } from "../../services/simulationService";
import WorkflowModal from "./WorkflowModal";

interface ClearAnswersWorkflowModalProps {
  isOpen: boolean;
  documentId: string;
  documentTitle: string;
  templateDocumentId: string;
  onClose: () => void;
  onCleared: (result: ClearAnswersResult) => void;
  returnFocusRef?: React.RefObject<HTMLElement>;
}

const formatResultDetails = (result: ClearAnswersResult): string => {
  const lines = [
    `Clear Answers: ${result.documentId}`,
    `Database committed: ${result.database.committed}`,
    `Answers deleted: ${result.database.answerRowsDeleted}`,
    `Assessed answers deleted: ${result.database.assessedAnswerRowsDeleted}`,
    `Progress rows deleted: ${result.database.progressRowsDeleted}`,
    `Attachment paths referenced: ${result.database.referencedAttachmentPathCount}`,
    `Invalid attachment metadata rows: ${result.database.invalidAttachmentMetadataRows}`,
    `Managed files found: ${result.attachments.managedFilesFound}`,
    `Managed files deleted: ${result.attachments.managedFilesDeleted}`,
    `Managed files retained: ${result.attachments.managedFilesRetained}`,
    `Managed files missing: ${result.attachments.managedFilesMissing}`,
    `Filesystem cleanup complete: ${result.attachments.cleanupComplete}`,
  ];
  for (const failure of result.attachments.failures) {
    lines.push(`- ${failure.logicalPath}: ${failure.message}`);
  }
  return lines.join("\n");
};

const ClearAnswersResultSummary: React.FC<{ result: ClearAnswersResult }> = ({ result }) => {
  const database = result.database;
  const attachments = result.attachments;
  const metrics = [
    ["คำตอบที่ลบ", database.answerRowsDeleted],
    ["รายการที่เคยประเมิน", database.assessedAnswerRowsDeleted],
    ["Progress ที่ลบ", database.progressRowsDeleted],
    ["ไฟล์ที่ลบ", attachments.managedFilesDeleted],
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

      <div className={`rounded-md border px-3 py-2 text-sm ${attachments.cleanupComplete
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      }`}>
        {attachments.cleanupComplete
          ? "ฐานข้อมูลและการล้างไฟล์แนบเสร็จสมบูรณ์"
          : "ฐานข้อมูลล้างสำเร็จแล้ว แต่ไฟล์แนบบางส่วนต้องตรวจสอบเพิ่มเติม"}
      </div>

      {!attachments.cleanupComplete && (
        <div className="rounded-md border border-github-border-primary bg-github-bg-primary p-3 text-xs text-github-text-secondary">
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
            <dt>ไฟล์ที่ยังถูกใช้งานและเก็บไว้</dt>
            <dd>{attachments.managedFilesRetained}</dd>
            <dt>ไฟล์ที่หาไม่พบ</dt>
            <dd>{attachments.managedFilesMissing}</dd>
            <dt>Metadata ที่อ่านไม่ได้</dt>
            <dd>{database.invalidAttachmentMetadataRows}</dd>
          </dl>
          {attachments.failures.length > 0 && (
            <ul aria-label="รายการไฟล์ที่ต้องตรวจสอบ" className="mt-2 space-y-1 border-t border-github-border-primary pt-2">
              {attachments.failures.map((failure, index) => (
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

const ClearAnswersWorkflowModal: React.FC<ClearAnswersWorkflowModalProps> = ({
  isOpen,
  documentId,
  documentTitle,
  templateDocumentId,
  onClose,
  onCleared,
  returnFocusRef,
}) => {
  const [result, setResult] = useState<ClearAnswersResult | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setCopyFeedback("");
    }
  }, [isOpen]);

  const clearAnswers = async () => {
    try {
      const nextResult = await simulationService.clearAnswers(documentId);
      setResult(nextResult);
      onCleared(nextResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`ล้างข้อมูลของ ${documentId} ไม่สำเร็จ: ${message}`);
    }
  };

  const copyResultDetails = async () => {
    if (!result) return;
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard API ไม่พร้อมใช้งาน");
    }
    await navigator.clipboard.writeText(formatResultDetails(result));
    setCopyFeedback("คัดลอกรายละเอียดแล้ว");
  };

  const closeWorkflow = () => {
    setResult(null);
    setCopyFeedback("");
    onClose();
  };

  const hasPartialCleanup = result !== null && !result.attachments.cleanupComplete;

  return (
    <>
      <WorkflowModal
        isOpen={isOpen && result === null}
        title="ล้างข้อมูล Trainee ของรอบจำลอง"
        message="คำสั่งนี้ย้อนกลับไม่ได้ และมีผลเฉพาะงาน Trainee ภายในรอบจำลองที่ระบุ"
        onClose={closeWorkflow}
        copyActionError
        returnFocusRef={returnFocusRef}
        typedConfirmation={{
          expectedValue: documentId,
          label: "พิมพ์รหัสรอบจำลองเพื่อยืนยัน",
          instruction: `พิมพ์ ${documentId} ให้ตรงกันทุกตัวอักษรเพื่อเปิดคำสั่งล้าง`,
          placeholder: documentId,
        }}
        actions={[
          {
            id: "review-clear-scope",
            label: "กลับไปตรวจสอบ",
            variant: "secondary",
            onSelect: closeWorkflow,
          },
          {
            id: "confirm-clear-answers",
            label: "ล้างข้อมูล Trainee ของรอบนี้",
            retryLabel: "ลองล้างอีกครั้ง",
            variant: "danger",
            requiresTypedConfirmation: true,
            onSelect: clearAnswers,
          },
        ]}
      >
        <div className="space-y-3 text-sm">
          <dl className="rounded-md border border-github-border-primary bg-github-bg-primary p-3">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-github-text-tertiary">รอบจำลอง</dt>
              <dd className="break-all font-mono font-semibold text-github-text-primary">{documentId}</dd>
              <dt className="text-github-text-tertiary">เอกสาร</dt>
              <dd className="text-github-text-primary">{documentTitle}</dd>
              <dt className="text-github-text-tertiary">เอกสารต้นทาง</dt>
              <dd className="break-all font-mono text-github-text-primary">{templateDocumentId}</dd>
            </div>
          </dl>

          <div className="grid gap-2 sm:grid-cols-2">
            <section aria-labelledby="clear-scope-delete" className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
              <h3 id="clear-scope-delete" className="font-medium text-red-700 dark:text-red-300">ข้อมูลที่จะลบ</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-github-text-secondary">
                <li>คำตอบและการประเมิน</li>
                <li>Progress ของรอบนี้</li>
                <li>ไฟล์แนบของ Trainee ในรอบนี้</li>
              </ul>
            </section>
            <section aria-labelledby="clear-scope-preserve" className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <h3 id="clear-scope-preserve" className="font-medium text-emerald-700 dark:text-emerald-300">ข้อมูลที่เก็บไว้</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-github-text-secondary">
                <li>Questions และ Answer Keys</li>
                <li>Source Document</li>
                <li>Simulation รอบอื่นทั้งหมด</li>
              </ul>
            </section>
          </div>
        </div>
      </WorkflowModal>

      <WorkflowModal
        isOpen={isOpen && result !== null}
        title={hasPartialCleanup
          ? "ล้างข้อมูลแล้ว แต่ไฟล์บางส่วนต้องตรวจสอบ"
          : "ล้างข้อมูล Trainee เรียบร้อย"}
        message={result
          ? `ผลจากฐานข้อมูลสำหรับ ${result.documentId}`
          : ""}
        onClose={closeWorkflow}
        returnFocusRef={returnFocusRef}
        actions={[
          ...(hasPartialCleanup
            ? [{
              id: "copy-clear-result",
              label: "คัดลอกรายละเอียด",
              variant: "secondary" as const,
              onSelect: copyResultDetails,
            }]
            : []),
          {
            id: "close-clear-result",
            label: "ปิดผลการล้าง",
            variant: "primary",
            onSelect: closeWorkflow,
          },
        ]}
      >
        {result && <ClearAnswersResultSummary result={result} />}
        {copyFeedback && (
          <p role="status" className="mt-3 text-xs text-github-text-secondary">{copyFeedback}</p>
        )}
      </WorkflowModal>
    </>
  );
};

export default ClearAnswersWorkflowModal;
