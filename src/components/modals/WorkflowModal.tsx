import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { COMMAND_BUTTON_FOCUS } from "../ui/buttonStyles";

export interface WorkflowModalAction {
  id: string;
  label: string;
  onSelect: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "warning" | "danger";
  disabled?: boolean;
  requiresTypedConfirmation?: boolean;
  retryLabel?: string;
}

export interface WorkflowModalTypedConfirmation {
  expectedValue: string;
  label: string;
  instruction: string;
  placeholder?: string;
  mismatchMessage?: string;
}

interface WorkflowModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  actions: WorkflowModalAction[];
  onClose: () => void;
  children?: React.ReactNode;
  typedConfirmation?: WorkflowModalTypedConfirmation;
  copyActionError?: boolean;
  returnFocusRef?: React.RefObject<HTMLElement>;
}

const actionClasses: Record<NonNullable<WorkflowModalAction["variant"]>, string> = {
  primary: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border-github-border-primary bg-github-bg-tertiary text-github-text-primary hover:bg-github-bg-hover",
  warning: "border-amber-500 bg-amber-500 text-slate-950 hover:bg-amber-400 dark:border-amber-400 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400",
  danger: "border-red-600 bg-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30",
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const WorkflowModal: React.FC<WorkflowModalProps> = ({
  isOpen,
  title,
  message,
  actions,
  onClose,
  children,
  typedConfirmation,
  copyActionError = false,
  returnFocusRef,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const confirmationInputId = useId();
  const confirmationInstructionId = useId();
  const confirmationMismatchId = useId();
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const confirmationInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [failedActionId, setFailedActionId] = useState<string | null>(null);
  const [confirmationValue, setConfirmationValue] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const hasTypedConfirmation = typedConfirmation !== undefined;
  const confirmationMatches = typedConfirmation
    ? confirmationValue === typedConfirmation.expectedValue
    : true;
  const confirmationMismatch = confirmationValue.length > 0 && !confirmationMatches;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = returnFocusRef?.current
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setActionError("");
    setFailedActionId(null);
    setConfirmationValue("");
    setCopyFeedback("");
    if (hasTypedConfirmation) {
      confirmationInputRef.current?.focus({ preventScroll: true });
    } else {
      firstButtonRef.current?.focus({ preventScroll: true });
    }

    return () => {
      const restoreTarget = restoreFocusRef.current;
      if (restoreTarget?.isConnected && !restoreTarget.hasAttribute("disabled")) {
        restoreTarget.focus();
      } else {
        document.body.focus();
      }
    };
  }, [hasTypedConfirmation, isOpen, returnFocusRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyActionId) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    // Capture before a parent editing form can consume Escape for its own
    // draft guard. While a modal is open, its close rule owns Escape.
    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [busyActionId, isOpen]);

  const runAction = async (action: WorkflowModalAction) => {
    if (
      busyActionId
      || action.disabled
      || (action.requiresTypedConfirmation && !confirmationMatches)
    ) return;
    setActionError("");
    setFailedActionId(null);
    setCopyFeedback("");
    try {
      const result = action.onSelect();
      if (result instanceof Promise) {
        setBusyActionId(action.id);
        await result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setActionError(`ไม่สามารถดำเนินการได้: ${errorMessage}`);
      setFailedActionId(action.id);
    } finally {
      setBusyActionId(null);
    }
  };

  const copyErrorDetails = async () => {
    if (!actionError) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API ไม่พร้อมใช้งาน");
      }
      await navigator.clipboard.writeText(`${title}\n${actionError}`);
      setCopyFeedback("คัดลอกรายละเอียดแล้ว");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCopyFeedback(`คัดลอกไม่สำเร็จ: ${message}`);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Capture at document level so the trap recovers even if a browser/WebView
    // moves focus outside the dialog before React can receive a bubbling event.
    const keepTabWithinDialog = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusableElements[0]!;
      const last = focusableElements[focusableElements.length - 1]!;
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

      if (event.shiftKey) {
        if (currentIndex <= 0) {
          event.preventDefault();
          last.focus();
        }
      } else if (currentIndex === -1 || currentIndex === focusableElements.length - 1) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", keepTabWithinDialog, true);
    return () => document.removeEventListener("keydown", keepTabWithinDialog, true);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
      <div
        aria-hidden="true"
        data-workflow-backdrop
        className="absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-sm"
        onClick={() => { if (!busyActionId) onClose(); }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative w-full max-w-lg rounded-xl border border-github-border-primary bg-github-bg-secondary shadow-2xl"
      >
        <button
          type="button"
          aria-label="ปิด"
          disabled={!!busyActionId}
          onClick={onClose}
          className={`absolute right-4 top-4 rounded-md p-1 text-github-text-tertiary hover:bg-github-bg-hover hover:text-github-text-primary disabled:opacity-50 ${COMMAND_BUTTON_FOCUS}`}
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

          {children && <div className="mb-4">{children}</div>}

          {typedConfirmation && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <label
                htmlFor={confirmationInputId}
                className="block text-sm font-medium text-github-text-primary"
              >
                {typedConfirmation.label}
              </label>
              <p
                id={confirmationInstructionId}
                className="mt-1 text-xs leading-5 text-github-text-secondary"
              >
                {typedConfirmation.instruction}
              </p>
              <input
                ref={confirmationInputRef}
                id={confirmationInputId}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={confirmationValue}
                disabled={!!busyActionId}
                aria-invalid={confirmationMismatch || undefined}
                aria-describedby={`${confirmationInstructionId}${confirmationMismatch ? ` ${confirmationMismatchId}` : ""}`}
                placeholder={typedConfirmation.placeholder}
                onChange={(event) => setConfirmationValue(event.target.value)}
                className={`mt-2 w-full rounded-md border bg-github-bg-primary px-3 py-2 font-mono text-sm text-github-text-primary ${COMMAND_BUTTON_FOCUS} ${confirmationMismatch ? "border-red-500" : "border-github-border-primary"}`}
              />
              {confirmationMismatch && (
                <p
                  id={confirmationMismatchId}
                  role="status"
                  className="mt-2 text-xs text-red-600 dark:text-red-400"
                >
                  {typedConfirmation.mismatchMessage ?? "รหัสที่พิมพ์ยังไม่ตรงกับรอบจำลอง"}
                </p>
              )}
            </div>
          )}

          {actionError && (
            <div role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              <p>{actionError}</p>
              {copyActionError && (
                <button
                  type="button"
                  onClick={() => { void copyErrorDetails(); }}
                  className={`mt-2 rounded border border-current px-2 py-1 text-xs font-medium ${COMMAND_BUTTON_FOCUS}`}
                >
                  คัดลอกรายละเอียด
                </button>
              )}
            </div>
          )}

          {copyFeedback && (
            <p role="status" className="mb-3 text-xs text-github-text-secondary">
              {copyFeedback}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {actions.map((action, index) => {
              const disabled = !!busyActionId
                || action.disabled
                || (action.requiresTypedConfirmation && !confirmationMatches);
              const label = failedActionId === action.id && action.retryLabel
                ? action.retryLabel
                : action.label;
              return (
                <button
                  key={action.id}
                  ref={index === 0 ? firstButtonRef : undefined}
                  type="button"
                  disabled={disabled}
                  onClick={() => { void runAction(action); }}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${COMMAND_BUTTON_FOCUS} ${actionClasses[action.variant ?? "secondary"]}`}
                >
                  {busyActionId === action.id ? "กำลังดำเนินการ..." : label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowModal;
