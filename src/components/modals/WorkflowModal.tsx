import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { COMMAND_BUTTON_FOCUS } from "../ui/buttonStyles";

export interface WorkflowModalAction {
  id: string;
  label: string;
  onSelect: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "warning" | "danger";
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

const WorkflowModal: React.FC<WorkflowModalProps> = ({ isOpen, title, message, actions, onClose }) => {
  const titleId = useId();
  const descriptionId = useId();
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActionError("");
    firstButtonRef.current?.focus({ preventScroll: true });

    return () => {
      const restoreTarget = restoreFocusRef.current;
      if (restoreTarget?.isConnected && !restoreTarget.hasAttribute("disabled")) {
        restoreTarget.focus();
      } else {
        document.body.focus();
      }
    };
  }, [isOpen]);

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
    if (busyActionId || action.disabled) return;
    setActionError("");
    try {
      const result = action.onSelect();
      if (result instanceof Promise) {
        setBusyActionId(action.id);
        await result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setActionError(`ไม่สามารถดำเนินการได้: ${errorMessage}`);
    } finally {
      setBusyActionId(null);
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
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${COMMAND_BUTTON_FOCUS} ${actionClasses[action.variant ?? "secondary"]}`}
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
