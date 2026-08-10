import React, { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export interface WorkflowModalAction {
  id: string;
  label: string;
  onSelect: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

interface WorkflowModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  actions: WorkflowModalAction[];
  onClose: () => void;
}

const actionClasses: Record<NonNullable<WorkflowModalAction["variant"]>, string> = {
  primary: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border-github-border-primary bg-github-bg-tertiary text-github-text-primary hover:bg-github-bg-hover",
  danger: "border-red-600 bg-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30",
};

const WorkflowModal: React.FC<WorkflowModalProps> = ({ isOpen, title, message, actions, onClose }) => {
  const titleId = useId();
  const descriptionId = useId();
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActionError("");
    window.setTimeout(() => firstButtonRef.current?.focus(), 0);

    return () => {
      restoreFocusRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyActionId) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [busyActionId, isOpen, onClose]);

  if (!isOpen) return null;

  const runAction = async (action: WorkflowModalAction) => {
    if (busyActionId || action.disabled) return;
    setActionError("");
    try {
      const result = action.onSelect();
      if (result instanceof Promise) {
        setBusyActionId(action.id);
        await result;
      }
    } catch (error) {
      setActionError(`ไม่สามารถดำเนินการได้: ${String(error)}`);
    } finally {
      setBusyActionId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        className="absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-sm"
        onClick={() => { if (!busyActionId) onClose(); }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-lg rounded-xl border border-github-border-primary bg-github-bg-secondary shadow-2xl"
      >
        <button
          type="button"
          aria-label="ปิด"
          disabled={!!busyActionId}
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-github-text-tertiary hover:bg-github-bg-hover hover:text-github-text-primary disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          <div className="mb-4 flex items-start gap-3 pr-8">
            <span className="rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-github-text-primary">{title}</h2>
              <p id={descriptionId} className="mt-2 whitespace-pre-line text-sm leading-6 text-github-text-secondary">{message}</p>
            </div>
          </div>

          {actionError && (
            <div role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              {actionError}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {actions.map((action, index) => (
              <button
                key={action.id}
                ref={index === 0 ? firstButtonRef : undefined}
                type="button"
                disabled={!!busyActionId || action.disabled}
                onClick={() => { void runAction(action); }}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${actionClasses[action.variant ?? "secondary"]}`}
              >
                {busyActionId === action.id ? "กำลังดำเนินการ..." : action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowModal;
