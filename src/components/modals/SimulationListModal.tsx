import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FolderOpen,
  Paperclip,
  RefreshCw,
  Trash2,
  UserCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  simulationService,
  type SimulationDocumentSummary,
} from "../../services/simulationService";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import WorkflowModal from "./WorkflowModal";

interface SimulationListModalProps {
  isOpen: boolean;
  templateDocumentId: string;
  onClose: () => void;
  onOpenSimulation: (documentId: string) => void;
  onCountChange?: (count: number) => void;
}

const formatDateTime = (value: string) => {
  if (!value) return "-";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
};

const getStatus = (item: SimulationDocumentSummary) => {
  if (item.needs_improvement_count > 0) {
    return { label: "ต้องปรับปรุง", classes: "border-rose-500/40 bg-rose-500/10 text-rose-400" };
  }
  if (item.answered_count === 0 && item.attachment_count === 0) {
    return { label: "ยังไม่มีคำตอบ", classes: "border-slate-500/40 bg-slate-500/10 text-slate-400" };
  }
  if (item.assessed_count < item.answered_count) {
    return { label: "รอประเมิน", classes: "border-amber-500/40 bg-amber-500/10 text-amber-400" };
  }
  return { label: "ประเมินแล้ว", classes: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" };
};

const SimulationListModal: React.FC<SimulationListModalProps> = ({
  isOpen,
  templateDocumentId,
  onClose,
  onOpenSimulation,
  onCountChange,
}) => {
  const [items, setItems] = useState<SimulationDocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SimulationDocumentSummary | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await simulationService.listForTemplate(templateDocumentId);
      setItems(result);
      onCountChange?.(result.length);
    } catch (loadError) {
      setError(`ไม่สามารถโหลดรายการรอบจำลองได้: ${String(loadError)}`);
    } finally {
      setIsLoading(false);
    }
  }, [onCountChange, templateDocumentId]);

  useEffect(() => {
    if (isOpen) void loadItems();
  }, [isOpen, loadItems]);

  const totals = useMemo(() => items.reduce(
    (sum, item) => ({
      answers: sum.answers + item.answered_count,
      assessments: sum.assessments + item.assessed_count,
      attachments: sum.attachments + item.attachment_count,
    }),
    { answers: 0, assessments: 0, attachments: 0 },
  ), [items]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await simulationService.deleteSimulation(deleteTarget.simulation_document_id);
    setDeleteTarget(null);
    await loadItems();
  };

  const openAttachmentDirectory = async (item: SimulationDocumentSummary) => {
    setError("");
    try {
      await simulationService.openAttachmentDirectory(item.attachment_directory);
    } catch (openError) {
      setError(`ไม่สามารถเปิดโฟลเดอร์ไฟล์แนบได้: ${String(openError)}`);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`รอบจำลองของ ${templateDocumentId}`}
        size="full"
        className="max-w-6xl"
        closeOnBackdrop={!deleteTarget}
        closeOnEscape={!deleteTarget}
      >
        <div className="flex max-h-[75vh] flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
            <div>
              <p className="font-medium text-github-text-primary">
                มีรอบจำลองที่ยังอยู่จริง {items.length} รอบ
              </p>
              <p className="mt-1 text-xs leading-5 text-github-text-secondary">
                เลขท้าย SIM เป็นลำดับการสร้าง ไม่ใช่จำนวนที่ยังเหลืออยู่ • คำตอบและการประเมินเก็บใน content.db
              </p>
              <p className="text-xs leading-5 text-github-text-secondary">
                ไฟล์แนบแยกตามรอบใน data/&lt;รหัส-SIM&gt;/trainee-attachments
              </p>
            </div>
            <Button
              variant="outline"
              size="small"
              loading={isLoading}
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void loadItems()}
            >
              รีเฟรช
            </Button>
          </div>

          {items.length > 0 && (
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg border border-github-border-primary bg-github-bg-secondary p-3">
                <div className="text-xl font-semibold text-github-text-primary">{totals.answers}</div>
                <div className="text-xs text-github-text-tertiary">คำตอบทั้งหมด</div>
              </div>
              <div className="rounded-lg border border-github-border-primary bg-github-bg-secondary p-3">
                <div className="text-xl font-semibold text-github-text-primary">{totals.assessments}</div>
                <div className="text-xs text-github-text-tertiary">การประเมินทั้งหมด</div>
              </div>
              <div className="rounded-lg border border-github-border-primary bg-github-bg-secondary p-3">
                <div className="text-xl font-semibold text-github-text-primary">{totals.attachments}</div>
                <div className="text-xs text-github-text-tertiary">ไฟล์แนบทั้งหมด</div>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {isLoading && items.length === 0 && (
              <div className="py-12 text-center text-sm text-github-text-secondary">กำลังตรวจสอบรอบจำลอง...</div>
            )}
            {!isLoading && !error && items.length === 0 && (
              <div className="rounded-lg border border-dashed border-github-border-primary py-12 text-center">
                <UserCircle className="mx-auto mb-3 h-8 w-8 text-github-text-tertiary" />
                <p className="font-medium text-github-text-primary">ยังไม่มีรอบจำลองที่เก็บอยู่</p>
                <p className="mt-1 text-sm text-github-text-secondary">เริ่มรอบจำลองใหม่จากหน้า Template ได้</p>
              </div>
            )}
            {items.map((item) => {
              const status = getStatus(item);
              return (
                <article
                  key={item.simulation_document_id}
                  className="rounded-xl border border-github-border-primary bg-github-bg-secondary p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-amber-400">{item.simulation_document_id}</h3>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.classes}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-github-text-secondary">
                        <span className="inline-flex items-center gap-1"><UserCircle className="h-3.5 w-3.5" />Trainee: {item.trainee_id}</span>
                        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />สร้าง: {formatDateTime(item.created_at)}</span>
                        <span>ล่าสุด: {formatDateTime(item.latest_activity_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.attachment_count > 0 && (
                        <Button
                          variant="ghost"
                          size="small"
                          icon={<FolderOpen className="h-4 w-4" />}
                          onClick={() => void openAttachmentDirectory(item)}
                        >
                          เปิดโฟลเดอร์ไฟล์
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="small"
                        icon={<ExternalLink className="h-4 w-4" />}
                        onClick={() => onOpenSimulation(item.simulation_document_id)}
                      >
                        เปิดรอบนี้
                      </Button>
                      <Button
                        variant="ghost"
                        size="small"
                        className="text-red-400 hover:text-red-300"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => setDeleteTarget(item)}
                      >
                        ลบ
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    <Metric label="คำตอบ" value={item.answered_count} />
                    <Metric label="ประเมินแล้ว" value={item.assessed_count} />
                    <Metric label="ผ่าน" value={item.passed_count} icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />} />
                    <Metric label="ปรับปรุง" value={item.needs_improvement_count} icon={<AlertCircle className="h-3.5 w-3.5 text-rose-400" />} />
                    <Metric label="ไฟล์แนบ" value={item.attachment_count} icon={<Paperclip className="h-3.5 w-3.5" />} />
                    <Metric label="Progress" value={item.progress_record_count} />
                  </div>
                  <div className="mt-3 truncate rounded-md bg-github-bg-primary px-3 py-2 font-mono text-[11px] text-github-text-tertiary" title={item.attachment_directory}>
                    ไฟล์แนบ: {item.attachment_directory}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </Modal>

      <WorkflowModal
        isOpen={!!deleteTarget}
        title="ลบรอบจำลองที่เลือก"
        message={deleteTarget
          ? `ต้องการลบ ${deleteTarget.simulation_document_id} ใช่หรือไม่?\n\nคำตอบ การประเมิน Progress และไฟล์แนบของรอบนี้จะถูกลบถาวร แต่ Template และรอบจำลองอื่นจะไม่ถูกกระทบ`
          : ""}
        onClose={() => setDeleteTarget(null)}
        actions={[
          { id: "back", label: "กลับไปดูรายการ", onSelect: () => setDeleteTarget(null), variant: "secondary" },
          { id: "delete", label: "ลบรอบนี้", onSelect: confirmDelete, variant: "danger" },
        ]}
      />
    </>
  );
};

const Metric: React.FC<{ label: string; value: number; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-md border border-github-border-primary bg-github-bg-primary px-3 py-2">
    <div className="flex items-center gap-1 text-xs text-github-text-tertiary">{icon}{label}</div>
    <div className="mt-0.5 font-semibold text-github-text-primary">{value}</div>
  </div>
);

export default SimulationListModal;
