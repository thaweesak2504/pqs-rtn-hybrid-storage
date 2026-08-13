import { Edit3 } from "lucide-react";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { formatMarkdownWithThaiLists } from "../../../utils/thaiNumbering";
import Button from "../../ui/Button";
import TiptapEditor from "../TiptapEditor";

// ============ Component ============

interface AnswerKeyEditorProps {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  editorId: string;
  ariaLabel: string;
  isActive?: boolean;
  autoFocus?: boolean;
  onActivate?: () => void;
}

const AnswerKeyEditor: React.FC<AnswerKeyEditorProps> = ({
  value,
  onChange,
  hasError = false,
  editorId,
  ariaLabel,
  isActive = true,
  autoFocus = false,
  onActivate,
}) => {
  return (
    <div
      data-answer-key-state={isActive ? "active" : "inactive"}
      className={`answer-key-editor ${
        hasError ? "ring-2 ring-red-500/50" : ""
      }`}
    >
      {isActive ? (
        <TiptapEditor
          initialContent={value}
          onChange={onChange}
          placeholder="เฉลยคำตอบ (Answer Key)..."
          variant="emerald"
          minHeight="90px"
          autoFocus={autoFocus}
          editorId={editorId}
          ariaLabel={ariaLabel}
        />
      ) : (
        <div className="flex items-start gap-2 rounded-md border border-emerald-200/70 bg-emerald-50/40 px-2.5 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/15">
          <div className="answer-key-markdown min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {formatMarkdownWithThaiLists(value)}
              </ReactMarkdown>
            ) : (
              <span className={hasError
                ? "font-medium text-red-600 dark:text-red-400"
                : "italic text-slate-400 dark:text-slate-500"}
              >
                {hasError ? "จำเป็นต้องระบุคำเฉลย" : "ยังไม่มีคำเฉลย"}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="small"
            icon={<Edit3 className="h-3.5 w-3.5" />}
            onClick={onActivate}
            aria-label={`แก้ไข ${ariaLabel}`}
            className="h-7 shrink-0 !px-2 !py-1 !text-xs text-emerald-700 dark:text-emerald-300"
          >
            แก้ไขเฉลย
          </Button>
        </div>
      )}
    </div>
  );
};

export default AnswerKeyEditor;
