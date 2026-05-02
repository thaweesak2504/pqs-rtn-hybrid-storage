import React, { useCallback, useEffect, useMemo, useRef } from "react";

// ============ Thai Helpers ============

const THAI_ALPHA = ["ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ", "ฎ", "ฏ", "ฐ", "ฑ", "ฒ", "ณ", "ด", "ต", "ถ", "ท", "ธ", "น", "บ", "ป", "ผ", "ฝ", "พ", "ฟ", "ภ", "ม", "ย", "ร", "ล", "ว", "ศ", "ษ", "ส", "ห", "ฬ", "อ", "ฮ"];
const THAI_DIGITS = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];

const toThaiDigit = (n: number): string => {
  return n.toString().split("").map(d => THAI_DIGITS[parseInt(d)] || d).join("");
};

type ToolbarAction = "bold" | "italic" | "ol" | "ul" | "thai_alpha" | "thai_num" | "table";

// ============ Component ============

interface AnswerKeyEditorProps {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}

const AnswerKeyEditor: React.FC<AnswerKeyEditorProps> = ({
  value,
  onChange,
  hasError = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const colorMode = useMemo<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }, []);

  const handleChange = useCallback(
    (val?: string) => {
      onChange(val || "");
    },
    [onChange],
  );

  // Helper for trimming pasted text to prevent accidental newlines
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      // Trim leading/trailing whitespace including newlines
      const trimmedText = pastedText.trim();
      
      const el = textareaRef.current;
      if (!el) return;

      const selectionStart = el.selectionStart ?? 0;
      const selectionEnd = el.selectionEnd ?? 0;
      const currentValue = el.value;

      const newValue = currentValue.substring(0, selectionStart) + trimmedText + currentValue.substring(selectionEnd);
      onChange(newValue);

      // Move cursor after pasted text
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + trimmedText.length;
      });
    },
    [onChange]
  );

  const applyAction = useCallback(
    (action: ToolbarAction) => {
      const el = textareaRef.current;
      if (!el) return;

      const selectionStart = el.selectionStart ?? 0;
      const selectionEnd = el.selectionEnd ?? 0;
      const selectedText = el.value.slice(selectionStart, selectionEnd);

      const replaceSelection = (next: string) => {
        el.setRangeText(next, selectionStart, selectionEnd, "end");
        onChange(el.value);
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
    [onChange],
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(el.scrollHeight, 90)}px`;
  }, [value]);

  return (
    <div
      data-color-mode={colorMode}
      className={`answer-key-editor rounded-md overflow-hidden border ${
        hasError
          ? "border-red-500 error"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1 px-2 py-1 border-b border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/20">
        <button
          type="button"
          title="ตัวหนา (Bold)"
          onClick={() => applyAction("bold")}
          className="h-6 px-2 text-xs font-bold rounded border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
        >
          B
        </button>
        <button
          type="button"
          title="ตัวเอียง (Italic)"
          onClick={() => applyAction("italic")}
          className="h-6 px-2 text-xs italic rounded border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
        >
          I
        </button>
        <button
          type="button"
          title="ลิสต์เลข (1. 2. 3.)"
          onClick={() => applyAction("ol")}
          className="h-6 px-2 text-xs rounded border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
        >
          1.
        </button>
        <button
          type="button"
          title="ลิสต์จุด (- )"
          onClick={() => applyAction("ul")}
          className="h-6 px-2 text-xs rounded border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
        >
          -
        </button>
        <button
          type="button"
          title="ลำดับอักษรไทย (ก. ข. ค. ง. ...)"
          onClick={() => applyAction("thai_alpha")}
          className="h-6 px-2 text-xs font-semibold rounded border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
        >
          ก.ข.ค.
        </button>
        <button
          type="button"
          title="ลำดับเลขไทย (๑. ๒. ๓. ...)"
          onClick={() => applyAction("thai_num")}
          className="h-6 px-2 text-xs font-semibold rounded border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
        >
          ๑.๒.๓.
        </button>
        <button
          type="button"
          title="แทรกตาราง (Table)"
          onClick={() => applyAction("table")}
          className="h-6 px-2 text-xs font-semibold rounded border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
        >
          Table
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onPaste={handlePaste}
        placeholder="เฉลยคำตอบ (Answer Key)..."
        className={`w-full p-2 text-sm font-normal resize-none overflow-hidden leading-relaxed font-['Kanit',sans-serif]
          ${hasError
            ? "bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-100 placeholder:text-red-300"
            : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 placeholder:text-slate-300 dark:placeholder:text-slate-600"
          } focus:outline-none focus:ring-1 focus:ring-emerald-500/50`}
        rows={4}
      />
    </div>
  );
};

export default AnswerKeyEditor;
