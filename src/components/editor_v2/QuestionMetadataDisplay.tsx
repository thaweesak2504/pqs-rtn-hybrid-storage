import { invoke } from "@tauri-apps/api/tauri";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { UserAnswer } from "./PqsQuestionSection";
import TraineeAnswerBox from "./TraineeAnswerBox";
import AttachmentPanel from "./AttachmentPanel";

// ============ Types ============
interface SubQuestionItem {
  code: string;
  text: string;
  alwaysChecked?: boolean;
}

interface QuestionMetadataDisplayProps {
  metadata: string;
  questionId: string;
  documentId: string;
  parentSubQuestionList?: SubQuestionItem[];
  readOnly?: boolean;
  showAnswerBox?: boolean;
  showAnswerKey?: boolean;
  mode?: "trainee" | "qualifier" | "viewer" | "edit" | "visitor" | "print";
  traineeAnswer?: UserAnswer;
  answerMap?: Map<string, UserAnswer>;
  onRefresh?: () => void;
  isPrerequisiteDoc?: boolean;
  questionPrefix?: string;
}

interface AnswerKeyRow {
  id: number;
  question_id: string;
  sub_question_code: string;
  answer_key_text: string | null;
  is_required: boolean;
  order_index: number;
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
  documentId,
  parentSubQuestionList,
  readOnly = false,
  showAnswerBox = false,
  showAnswerKey = true,
  mode = "viewer",
  traineeAnswer,
  answerMap,
  onRefresh,
  isPrerequisiteDoc = false,
  questionPrefix,
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
          items.push(m[2] || '');
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
          items.push(m[2] || '');
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

  const [singleAnswerKey, setSingleAnswerKey] = useState("");
  const [multiAnswerKeys, setMultiAnswerKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    invoke<AnswerKeyRow[]>('get_question_answer_keys', { questionId })
      .then(rows => {
        const single = rows.find(r => (r.sub_question_code || '') === '');
        const multi = rows
          .filter(r => (r.sub_question_code || '') !== '')
          .sort((a, b) => a.order_index - b.order_index)
          .reduce<Record<string, string>>((acc, row) => {
            acc[row.sub_question_code] = row.answer_key_text || '';
            return acc;
          }, {});
        setSingleAnswerKey(single?.answer_key_text || '');
        setMultiAnswerKeys(multi);
      })
      .catch(() => {
        setSingleAnswerKey('');
        setMultiAnswerKeys({});
      });
  }, [questionId]);

  const attachments = useMemo(() => {
    if (data.attachments && Array.isArray(data.attachments)) return data.attachments;
    if (data.image) return [data.image];
    return [];
  }, [data]);

  const hasAnswerKeyData = !!singleAnswerKey || Object.keys(multiAnswerKeys).length > 0;

  // Render if: has attachments, OR should show answer box, OR has answer key data in DB
  // (hasAnswerKeyData is checked independently so Trainee mode still renders the answer box)
  if (attachments.length === 0 && !showAnswerBox && !hasAnswerKeyData) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Attachments Display (First) */}
      {attachments.length > 0 && (
        <AttachmentPanel
          attachments={attachments}
          onAttachmentsChange={() => {}}
          documentId={documentId}
          questionId={questionId}
          userId="" // readOnly doesn't need userId
          readOnly={true}
          excludeAudio={true}
        />
      )}

      {/* Answer Area Display */}
      {(() => {
        const hasAnswerKeysObj = Object.keys(multiAnswerKeys).length > 0;

        if (hasAnswerKeysObj) {
          // Per-subQ mode
          const keys = multiAnswerKeys;
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
                    {(showAnswerBox || !!keys[code]) && (mode === "trainee" || mode === "qualifier") && (
                      <TraineeAnswerBox
                        questionId={questionId}
                        documentId={documentId}
                        subQuestionCode={code}
                        readOnly={readOnly}
                        label={label}
                        mode={mode}
                        traineeAnswer={answerMap?.get(`${questionId}:${code}`)}
                        onAnswerSaved={onRefresh}
                        onAssessmentSaved={onRefresh}
                        isPrerequisiteDoc={isPrerequisiteDoc}
                        questionPrefix={questionPrefix ? `${questionPrefix}.${label}` : label}
                        questionAttachments={attachments}
                      />
                    )}
                    {showAnswerKey && (
                      <div className="text-sm font-normal text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-900 dark:text-slate-100 shrink-0">เฉลย: {label && <span className="text-amber-600 dark:text-amber-400">{label}.</span>}</span>
                          <div className="answer-key-markdown min-w-0 flex-1">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                              {formatAnswerKeyForDisplay(keys[code] || '').replace(/\n/g, "  \n")}
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
        } else if (singleAnswerKey || showAnswerBox) {
          // Single mode
          return (
            <div className="flex flex-col gap-1.5">
              {(showAnswerBox || !!singleAnswerKey) && (mode === "trainee" || mode === "qualifier") && (
                <TraineeAnswerBox
                  questionId={questionId}
                  documentId={documentId}
                  readOnly={readOnly}
                  mode={mode}
                  traineeAnswer={traineeAnswer}
                  onAnswerSaved={onRefresh}
                  onAssessmentSaved={onRefresh}
                  isPrerequisiteDoc={isPrerequisiteDoc}
                  questionPrefix={questionPrefix}
                  questionAttachments={attachments}
                />
              )}
              {showAnswerKey && singleAnswerKey && (
                <div className="text-sm font-normal text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-900 dark:text-slate-100 shrink-0">เฉลย:</span>
                    <div className="answer-key-markdown min-w-0 flex-1">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                      >
                        {formatAnswerKeyForDisplay(singleAnswerKey).replace(/\n/g, "  \n")}
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
