import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

// Thai Helpers
const THAI_ALPHA = ["ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ", "ฎ", "ฏ", "ฐ", "ฑ", "ฒ", "ณ", "ด", "ต", "ถ", "ท", "ธ", "น", "บ", "ป", "ผ", "ฝ", "พ", "ฟ", "ภ", "ม", "ย", "ร", "ล", "ว", "ศ", "ษ", "ส", "ห", "ฬ", "อ", "ฮ"];
const THAI_DIGITS = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];

const toThaiDigit = (n: number): string => {
  return n.toString().split("").map(d => THAI_DIGITS[parseInt(d)] || d).join("");
};

type ToolbarAction = "bold" | "italic" | "ol" | "ul" | "thai_alpha" | "thai_num" | "table";

interface TraineeAnswerBoxProps {
  questionId: string;
  subQuestionCode?: string;
  initialValue?: string;
  readOnly?: boolean;
  label?: string; // e.g. "ก", "ข"
}

const TraineeAnswerBox: React.FC<TraineeAnswerBoxProps> = ({
  questionId,
  subQuestionCode,
  initialValue = "",
  readOnly = false,
  label,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleEditStart = () => {
    if (readOnly) return;
    setIsEditing(true);
    // Focus textarea after render
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 10);
  };

  const cleanValue = value.trim();

  // Idle / View Mode
  if (!isEditing) {
    return (
      <div
        data-question-id={questionId}
        data-sub-question-code={subQuestionCode}
        className={`px-2 py-1.5 text-sm rounded-md border transition-colors bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 ${readOnly ? "" : "cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40"
          }`}
        onClick={handleEditStart}
      >
        <div className="flex items-start gap-2 text-sm font-normal">
          <span className="text-blue-800 dark:text-blue-300 shrink-0">คำตอบ: {label && <span className="text-amber-600 dark:text-amber-400 font-medium">{label}.</span>}</span>
          {cleanValue ? (
            <div className="answer-key-markdown min-w-0 flex-1 text-slate-800 dark:text-slate-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {cleanValue.replace(/\n/g, "  \n")}
              </ReactMarkdown>
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic">
              {readOnly ? "ยังไม่มีคำตอบ" : "[คลิกเพื่อระบุคำตอบ...]"}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div
      ref={containerRef}
      data-color-mode={colorMode}
      data-question-id={questionId}
      data-sub-question-code={subQuestionCode}
      className={`rounded-md overflow-hidden border border-blue-300 dark:border-blue-600 shadow-sm transition-all focus-within:ring-1 focus-within:ring-blue-500/50 focus-within:border-blue-500 bg-white dark:bg-slate-900`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 px-2 py-1.5 border-b border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-blue-800 dark:text-blue-300 text-sm font-medium px-2 py-0.5 mr-1 bg-blue-100 dark:bg-blue-900/50 rounded">
            คำตอบ {label && <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">{label}.</span>}
          </span>
          <button
            type="button"
            title="ตัวหนา (Bold)"
            onClick={() => applyAction("bold")}
            className="h-6 px-2 text-xs font-bold rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            B
          </button>
          <button
            type="button"
            title="ตัวเอียง (Italic)"
            onClick={() => applyAction("italic")}
            className="h-6 px-2 text-xs italic rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            I
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          <button
            type="button"
            title="ลิสต์เลข (1. 2. 3.)"
            onClick={() => applyAction("ol")}
            className="h-6 px-2 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            1.
          </button>
          <button
            type="button"
            title="ลิสต์จุด (- )"
            onClick={() => applyAction("ul")}
            className="h-6 px-2 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            -
          </button>
          <button
            type="button"
            title="ลำดับอักษรไทย (ก. ข. ค. ง. ...)"
            onClick={() => applyAction("thai_alpha")}
            className="h-6 px-2 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ก.ข.ค.
          </button>
          <button
            type="button"
            title="ลำดับเลขไทย (๑. ๒. ๓. ...)"
            onClick={() => applyAction("thai_num")}
            className="h-6 px-2 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ๑.๒.๓.
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          <button
            type="button"
            title="แทรกตาราง (Table)"
            onClick={() => applyAction("table")}
            className="h-6 px-2 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Table
          </button>
        </div>
        <button
          onClick={() => setIsEditing(false)}
          className="h-6 px-3 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          บันทึกคำตอบ
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPaste={handlePaste}
        placeholder="ระบุคำตอบของคุณที่นี่..."
        className="w-full p-2 text-sm font-normal resize-none overflow-hidden leading-relaxed font-['Kanit',sans-serif] bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
        rows={4}
      />
    </div>
  );
};

export default TraineeAnswerBox;
