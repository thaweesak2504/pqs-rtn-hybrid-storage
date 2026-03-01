import React, { useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { AsyncImagePreview } from "./QuestionTreeNode";
import TraineeAnswerBox from "./TraineeAnswerBox";

// ============ Types ============
interface SubQuestionItem {
  code: string;
  text: string;
  alwaysChecked?: boolean;
}

interface QuestionMetadataDisplayProps {
  metadata: string;
  questionId: string;
  onImageClick?: (src: string) => void;
  parentSubQuestionList?: SubQuestionItem[];
  readOnly?: boolean;
  showAnswerBox?: boolean;
  showAnswerKey?: boolean;
}

// ============ Helpers ============
const toThaiAlphabet = (n: number) => {
  const alpha = [
    "ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ", "ฎ", "ฏ", "ฐ", "ฑ", "ฒ", "ณ",
    "ด", "ต", "ถ", "ท", "ธ", "น", "บ", "ป", "ผ", "ฝ", "พ", "ฟ", "ภ", "ม", "ย", "ร",
    "ล", "ว", "ศ", "ษ", "ส", "ห", "ฬ", "อ", "ฮ",
  ];
  return n > 0 && n <= alpha.length ? alpha[n - 1] : n.toString();
};

// ============ Component ============
const QuestionMetadataDisplay: React.FC<QuestionMetadataDisplayProps> = ({
  metadata,
  questionId,
  onImageClick,
  parentSubQuestionList,
  readOnly = false,
  showAnswerBox = false,
  showAnswerKey = true
}) => {
  const formatAnswerKeyForDisplay = useCallback((raw: string): string => {
    const lines = raw.replace(/\r\n/g, "\n").split("\n");
    const out: string[] = [];

    const thaiAlphaRe = /^([ก-ฮ])\.\s+(.*)$/;
    const thaiDigitRe = /^([๐-๙]+)\.\s+(.*)$/;

    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? "";

      const alphaM = line.match(thaiAlphaRe);
      if (alphaM) {
        const items: string[] = [];
        while (i < lines.length) {
          const m = (lines[i] ?? "").match(thaiAlphaRe);
          if (!m) break;
          items.push(m[2]);
          i++;
        }
        out.push(`<ol class="thai-alpha">${items.map((t) => `<li>${t}</li>`).join("")}</ol>`);
        continue;
      }

      const digitM = line.match(thaiDigitRe);
      if (digitM) {
        const items: string[] = [];
        while (i < lines.length) {
          const m = (lines[i] ?? "").match(thaiDigitRe);
          if (!m) break;
          items.push(m[2]);
          i++;
        }
        out.push(`<ol class="thai-num">${items.map((t) => `<li>${t}</li>`).join("")}</ol>`);
        continue;
      }

      out.push(line);
      i++;
    }

    return out.join("\n");
  }, []);

  const data = useMemo(() => {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }, [metadata]);

  if (!data.image && !data.answerKey && !data.answerKeys) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Image Display (First) */}
      {data.image && (
        <AsyncImagePreview
          path={data.image}
          className="h-32 w-auto object-cover rounded border border-gray-200 dark:border-slate-700 shadow-sm transition-transform hover:scale-105"
          onImageClick={onImageClick}
        />
      )}

      {/* Answer Area Display */}
      {(() => {
        const hasAnswerKeysObj = data.answerKeys && typeof data.answerKeys === "object" && Object.keys(data.answerKeys).length > 0;

        if (hasAnswerKeysObj) {
          // Per-subQ mode
          const keys = data.answerKeys as Record<string, string>;
          const ordered: string[] = parentSubQuestionList
            ? parentSubQuestionList.map(s => s.code).filter(c => c in keys)
            : Array.isArray(data.selectedSubQuestions)
              ? (data.selectedSubQuestions as string[]).filter(c => c in keys)
              : Object.keys(keys);

          return (
            <div className="space-y-1.5">
              {ordered.map(code => {
                const sqIdx = parentSubQuestionList ? parentSubQuestionList.findIndex(s => s.code === code) : -1;
                const label = sqIdx >= 0 ? toThaiAlphabet(sqIdx + 1) : code;
                return (
                  <div key={code} className="flex flex-col gap-1.5">
                    {showAnswerBox && (
                      <TraineeAnswerBox questionId={questionId} subQuestionCode={code} readOnly={readOnly} />
                    )}
                    {showAnswerKey && (
                      <div className="text-sm font-normal text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-900 dark:text-slate-100 shrink-0">เฉลย: <span className="text-amber-600 dark:text-amber-400">{label}.</span></span>
                          <div className="answer-key-markdown min-w-0 flex-1">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                              {formatAnswerKeyForDisplay(keys[code]).replace(/\n/g, "  \n")}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        } else if (data.answerKey || showAnswerBox) {
          // Single mode
          return (
            <div className="flex flex-col gap-1.5">
              {showAnswerBox && (
                <TraineeAnswerBox questionId={questionId} readOnly={readOnly} />
              )}
              {showAnswerKey && data.answerKey && (
                <div className="text-sm font-normal text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-900 dark:text-slate-100 shrink-0">เฉลย:</span>
                    <div className="answer-key-markdown min-w-0 flex-1">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                      >
                        {formatAnswerKeyForDisplay(data.answerKey).replace(/\n/g, "  \n")}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
};

export default React.memo(QuestionMetadataDisplay);
