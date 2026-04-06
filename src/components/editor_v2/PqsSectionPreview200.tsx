import { invoke } from '@tauri-apps/api/tauri';
import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { QuestionDetail } from '../../types/content';
import Tooltip from '../ui/Tooltip';
import { ReferenceDoc } from './PqsReferenceSection';
import TraineeAnswerBox from './TraineeAnswerBox';

interface AnswerKeyRow {
  id: number;
  question_id: string;
  sub_question_code: string;
  answer_key_text: string | null;
  is_required: boolean;
  order_index: number;
}

type PrintSubView = 'question-only' | 'question-with-key';

// ============ Helpers ============

const toThaiNumber = (num: number | string) => {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().split('').map(d => {
    const parsed = parseInt(d);
    return !isNaN(parsed) && parsed >= 0 && parsed <= 9 ? thaiDigits[parsed] : d;
  }).join('');
};

const thaiAlpha = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ญ', 'ด', 'ต', 'ถ', 'ท', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ส', 'ห', 'อ', 'ฮ'];

const toThaiAlphabet = (index: number) => {
  if (index < thaiAlpha.length) return `${thaiAlpha[index]}.`;
  return `${index + 1}.`;
};

// ============ Types ============

interface PqsSectionPreviewProps {
  docId: string;
  sectionId: number;
  sectionNumber: number;
  title: string;
  references: ReferenceDoc[];
  sectionGroup?: 100 | 200 | 300;
  mode?: "trainee" | "qualifier" | "viewer" | "edit" | "visitor" | "print";
  printSubView?: PrintSubView;
}

// ============ Main Component ============

const PqsSectionPreview200: React.FC<PqsSectionPreviewProps> = ({
  docId,
  sectionId,
  sectionNumber,
  title,
  references,
  sectionGroup = 100,
  mode = "viewer",
  printSubView: printSubViewProp = 'question-only',
}) => {
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [printSubView, setPrintSubView] = useState<PrintSubView>(printSubViewProp);

  useEffect(() => {
    setPrintSubView(printSubViewProp);
  }, [printSubViewProp]);

  const showAnswerKey = mode !== 'print' ? (mode === 'qualifier') : (printSubView === 'question-with-key');

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!docId || sectionId === undefined) return;
      try {
        setLoading(true);
        const data = await invoke<QuestionDetail[]>('get_document_questions_with_details', { docId });
        // Filter by sectionId (same logic as PqsQuestionSection)
        const filtered = data.filter(
          (q) =>
            q.section_id === sectionId ||
            (q.section_id === 0 && q.sequence >= sectionNumber && q.sequence < sectionNumber + 100),
        );
        setQuestions(filtered);
      } catch (error) {
        console.error('Failed to fetch questions for preview:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [sectionId, docId, sectionNumber]);

  // Build question tree
  const questionTree = useMemo(() => {
    const tree: QuestionDetail[] = [];
    const map = new Map<string, QuestionDetail>();

    questions.forEach((q) => {
      map.set(q.id, { ...q, children: [] });
    });

    questions.forEach((q) => {
      const node = map.get(q.id)!;
      if (q.parent_id && map.has(q.parent_id)) {
        map.get(q.parent_id)!.children!.push(node);
      } else {
        tree.push(node);
      }
    });

    const sortNodes = (nodes: QuestionDetail[]) => {
      nodes.sort((a, b) => a.sequence - b.sequence);
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) sortNodes(n.children);
      });
    };
    sortNodes(tree);
    return tree;
  }, [questions]);

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <div className="text-sm text-slate-400">กำลังโหลด Preview...</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
      {/* A4 Paper */}
      <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-black box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_1.0cm_2.0cm_2.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">

        {/* โ”€โ”€ Section Header โ”€โ”€ */}
        <div className="mb-4">
          <div className="flex mb-4">
            <div className="font-bold text-lg min-w-[8ch]">
              {toThaiNumber(sectionNumber)}
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg mb-2">{title}</h1>

              {/* References Header */}
              <div className="mb-2">
                <span>เอกสารอ้างอิง :</span>
              </div>

              {/* References List */}
              <ol className="list-none space-y-0.5">
                {references.map((ref, index) => (
                  <li key={ref.id} className="flex gap-2">
                    <span className="shrink-0">{toThaiAlphabet(index)}</span>
                    <span>{ref.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* โ”€โ”€ Questions โ”€โ”€ */}
        <div className="space-y-1">
          {questionTree.map((question, index) => (
            <PreviewQuestionNode200
              key={question.id}
              question={question}
              index={index}
              level={0}
              parentPath={toThaiNumber(sectionNumber)}
              sectionNumber={sectionNumber}
              sectionGroup={sectionGroup}
              docId={docId}
              mode={mode}
              showAnswerKey={showAnswerKey}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============ Recursive Question Node ============

interface PreviewQuestionNode200Props {
  question: QuestionDetail;
  index: number;
  level: number;
  parentPath: string;
  sectionNumber: number;
  sectionGroup: 100 | 200 | 300;
  parentSubQuestionList?: Array<{ code: string; text: string; alwaysChecked?: boolean }>;
  docId: string;
  mode: "trainee" | "qualifier" | "viewer" | "edit" | "visitor" | "print";
  showAnswerKey?: boolean;
}

const PreviewQuestionNode200: React.FC<PreviewQuestionNode200Props> = ({
  question,
  index,
  level,
  parentPath,
  sectionNumber,
  sectionGroup,
  parentSubQuestionList,
  docId,
  mode,
  showAnswerKey = false,
}) => {
  const is200 = sectionGroup === 200;

  // Build numbering based on section group
  let displayNumber = '';
  let fullPath = '';

  if (is200) {
    // 200: L0 = เน’เนเน‘.เน‘, L1 = เน’เนเน‘.เน‘.เน‘, L2 = เธ.
    if (level === 0) {
      displayNumber = `${parentPath}.${toThaiNumber(index + 1)}`;
      fullPath = displayNumber;
    } else if (level === 1) {
      displayNumber = `${parentPath}.${toThaiNumber(index + 1)}`;
      fullPath = displayNumber;
    } else {
      displayNumber = toThaiAlphabet(index);
      fullPath = `${parentPath} ${displayNumber}`;
    }
  } else {
    // 100/300: L0 = เน‘เนเน‘.เน‘, L1 = เธ.
    if (level === 0) {
      displayNumber = `${parentPath}.${toThaiNumber(index + 1)}`;
      fullPath = displayNumber;
    } else {
      displayNumber = toThaiAlphabet(index);
      fullPath = `${parentPath} ${displayNumber}`;
    }
  }

  // Parse metadata for answerKey and image
  const meta = useMemo(() => {
    if (!question.metadata) return {};
    try {
      return JSON.parse(question.metadata);
    } catch {
      return {};
    }
  }, [question.metadata]);

  const hasChildren = question.children && question.children.length > 0;
  const [answerKey, setAnswerKey] = useState('');
  const [answerKeys, setAnswerKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    invoke<AnswerKeyRow[]>('get_question_answer_keys', { questionId: question.id })
      .then(rows => {
        const single = rows.find(r => (r.sub_question_code || '') === '');
        const multi = rows
          .filter(r => (r.sub_question_code || '') !== '')
          .sort((a, b) => a.order_index - b.order_index)
          .reduce<Record<string, string>>((acc, row) => {
            acc[row.sub_question_code] = row.answer_key_text || '';
            return acc;
          }, {});
        setAnswerKey(single?.answer_key_text || '');
        setAnswerKeys(multi);
      })
      .catch(() => {
        setAnswerKey('');
        setAnswerKeys({});
      });
  }, [question.id]);

  // Fetch ownSubQuestionList via invoke (same as QuestionTreeNode) for L0 nodes with useSubQuestions
  const [ownSubQuestionList, setOwnSubQuestionList] = useState<Array<{ code: string; text: string; alwaysChecked?: boolean }>>([]);
  useEffect(() => {
    if (!question.metadata) { setOwnSubQuestionList([]); return; }
    try {
      const m = JSON.parse(question.metadata);
      if (!m.useSubQuestions) { setOwnSubQuestionList([]); return; }
      const activeCodes: string[] = Array.isArray(m.activeSubQuestions) ? m.activeSubQuestions : [];
      const selectedBranch: { main: string; sub: string } | undefined = m.selectedBranch;
      if (!selectedBranch?.main) { setOwnSubQuestionList([]); return; }
      const sCode = sectionGroup === 300 ? '3' : '2';
      const lCode = question.sequence?.toString() || '0';
      const padBC = (c: string) => c === 'STD' ? '00' : c.padStart(2, '0');
      const derivedPrefix = `${sCode}${lCode}${padBC(selectedBranch.main)}${padBC(selectedBranch.sub)}`;
      invoke<{ id: number; code: string; text: string; always_checked: boolean }[]>(
        'get_all_sub_questions_for_branch',
        { branchCode: selectedBranch.main }
      ).then(dbSqs => {
        const prefixFiltered = derivedPrefix ? dbSqs.filter(sq => sq.code.startsWith(derivedPrefix)) : dbSqs;
        const filtered = prefixFiltered
          .filter(sq => activeCodes.length === 0 || activeCodes.includes(sq.code) || sq.always_checked)
          .map(sq => ({ code: sq.code, text: sq.text, alwaysChecked: sq.always_checked }));
        setOwnSubQuestionList(filtered);
      }).catch(() => setOwnSubQuestionList([]));
    } catch { setOwnSubQuestionList([]); }
  }, [question.metadata, sectionGroup, question.sequence]);

  // The effective sub-question list to pass to children
  const activeSubQuestionList = ownSubQuestionList.length > 0 ? ownSubQuestionList : parentSubQuestionList ?? [];

  // Compute inline sub-question checkboxes for L1/L2 (shown on question row)
  const inlineSubQItems = useMemo(() => {
    if (!parentSubQuestionList || parentSubQuestionList.length === 0) return null;
    if (!question.metadata) return parentSubQuestionList.map(sq => ({ sq, checked: false }));
    try {
      const m = JSON.parse(question.metadata);
      const selected: string[] = Array.isArray(m.selectedSubQuestions) ? m.selectedSubQuestions : [];
      return parentSubQuestionList.map(sq => ({ sq, checked: selected.includes(sq.code) }));
    } catch { return parentSubQuestionList.map(sq => ({ sq, checked: false })); }
  }, [parentSubQuestionList, question.metadata]);

  const formatAnswerKeyForDisplay = (raw: string): string => {
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
  };

  const is200L2 = is200 && level === 1;
  const contentStartOffsetClass = (level === 0 || is200L2) ? 'ml-[9ch]' : 'ml-[2ch]';

  const childLayout: 'list' | 'grid' = meta.childLayout === 'grid' ? 'grid' : 'list';

  // Build reference text like "(เธ.35, เธ.12)"
  const refText = question.references && question.references.length > 0
    ? `(${question.references.map(r => `${r.thai_letter || '?'}.${r.location_text || '-'}`).join(', ')})`
    : '';

  return (
    <div className="flex flex-col">
      {/* Question Row */}
      <div className="flex items-baseline">
        <span
          className={`${(level === 0 || is200L2) ? 'min-w-[9ch]' : 'min-w-[2ch] mr-1'} ${question.is_header ? 'font-bold' : 'font-normal'} shrink-0`}
        >
          {displayNumber}
        </span>

        <div className="flex-1">
          {/* Row 1: Content + Refs + Inline SubQ Checkboxes */}
          <div className={`flex items-center gap-2 min-w-0 ${inlineSubQItems ? "pr-2" : ""}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={level === 0 ? 'font-bold' : ''}>
                  {question.content}
                </span>
                {/* Exempted text */}
                {question.question_type === 'exempted' && (
                    <span className="ml-2 font-normal">
                    {question.display_text || "(ไม่ต้องอธิบาย)"}
                  </span>
                )}
                {refText && (
                  <span className="ml-2 text-sm text-slate-500 dark:text-slate-400 font-normal">
                    {refText}
                  </span>
                )}
              </div>
            </div>
            {/* Inline SubQ checkboxes — show checked only */}
            {inlineSubQItems && inlineSubQItems.some(i => i.checked) && (
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                {inlineSubQItems.filter(i => i.checked).map(({ sq }) => {
                  const realIndex = parentSubQuestionList ? parentSubQuestionList.findIndex(p => p.code === sq.code) : 0;
                  return (
                    <Tooltip key={sq.code} content={sq.text} position="left">
                      <span className="inline-flex items-center gap-0.5 whitespace-nowrap cursor-help">
                        <span className="text-black dark:text-white">{toThaiAlphabet(realIndex)}</span>
                        <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded border border-black dark:border-white text-black dark:text-white text-[9px] font-bold shrink-0">
                          ✓
                        </span>
                      </span>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description (if any, L0 only) */}
      {level === 0 && question.description && (
        <div className={`mt-1 ${level === 0 ? 'ml-[9ch]' : 'ml-[2ch]'} whitespace-pre-line indent-6`}>
          {question.description}
        </div>
      )}

      {/* SubQuestionList display — ownSubQuestionList fetched via invoke for L0 with useSubQuestions */}
      {is200 && level === 0 && ownSubQuestionList.length > 0 && (
        <div className="mt-1.5 ml-[9ch] space-y-0.5">
          {ownSubQuestionList.map((sq, sqIdx) => (
            <div key={sq.code} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="text-black dark:text-white min-w-[2.5ch] shrink-0">{toThaiAlphabet(sqIdx)}</span>
              <span>{sq.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Answer Key Display — show only when showAnswerKey=true */}

      {/* Single Answer Key */}
      {
        showAnswerKey && answerKey && Object.keys(answerKeys).length === 0 && 
        question.question_type !== 'exempted' && !question.is_group_header && (
          <div className={`mt-1 ${contentStartOffsetClass} flex flex-col gap-1`}>
            {mode !== 'print' && (mode === 'trainee' || mode === 'qualifier') && (
              <TraineeAnswerBox
                mode={mode}
                questionId={question.id}
                documentId={docId}
                readOnly={mode !== "trainee"}
              />
            )}
            <div className="flex items-start gap-2 text-sm font-normal text-slate-900 dark:text-slate-100 bg-white dark:bg-github-bg-tertiary px-2 py-1 rounded-md border border-gray-300 dark:border-github-border-primary mb-1">
              <span className="text-slate-900 dark:text-slate-100 shrink-0 font-semibold">เฉลย:</span>
              <div className="answer-key-markdown min-w-0 flex-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {formatAnswerKeyForDisplay(answerKey).replace(/\n/g, "  \n")}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )
      }

      {/* Multi Answer Keys (per sub-question code) */}
      {
        showAnswerKey && Object.keys(answerKeys).length > 0 && 
        question.question_type !== 'exempted' && !question.is_group_header && (() => {
          // Use effective parentSubQuestionList for ordering and labelling
          const effectiveSqList = parentSubQuestionList && parentSubQuestionList.length > 0 ? parentSubQuestionList : [];
          const ordered: string[] = effectiveSqList.length > 0
            ? effectiveSqList.map(s => s.code).filter(c => c in answerKeys)
            : Array.isArray(meta.selectedSubQuestions)
              ? (meta.selectedSubQuestions as string[]).filter(c => c in answerKeys)
              : Object.keys(answerKeys);
          if (ordered.length === 0) return null;
          return (
            <div className={`mt-1 ${contentStartOffsetClass} space-y-1`}>
              {ordered.map(code => {
                const text = answerKeys[code];
                const sqIdx = effectiveSqList.findIndex(s => s.code === code);
                const label = sqIdx >= 0 ? toThaiAlphabet(sqIdx) : code;
                return (
                  <div key={code} className="flex flex-col gap-1">
                    {mode !== 'print' && (mode === 'trainee' || mode === 'qualifier') && (
                      <TraineeAnswerBox mode={mode} questionId={question.id} documentId={docId} subQuestionCode={code} readOnly={mode !== "trainee"} />
                    )}
                    <div className="text-sm font-normal text-slate-900 dark:text-slate-100 bg-white dark:bg-github-bg-tertiary px-2 py-1 rounded-md border border-gray-300 dark:border-github-border-primary">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 font-semibold">เฉลย: <span className="text-black dark:text-white">{label}</span></span>
                        <div className="answer-key-markdown min-w-0 flex-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {formatAnswerKeyForDisplay(text).replace(/\n/g, "  \n")}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      }

      {/* Fallback Answer Box — non-print mode only, L2+ questions only */}
      {
        !showAnswerKey && mode !== 'print' && (mode === 'trainee' || mode === 'qualifier') &&
        question.question_type !== 'exempted' && !question.is_group_header &&
        level !== 0 &&
        (!answerKey && Object.keys(answerKeys).length === 0 && (!question.children || question.children.length === 0)) && (
          <div className={`mt-2 ${contentStartOffsetClass}`}>
            <TraineeAnswerBox mode={mode} questionId={question.id} documentId={docId} readOnly={mode !== "trainee"} />
          </div>
        )
      }

      {/* Children (sub-questions) */}
      {
        hasChildren && (
          <div
            className={
              childLayout === 'grid'
                ? `grid grid-cols-2 gap-x-8 gap-y-1 ${level === 0
                  ? (is200 ? 'ml-0' : 'ml-[9ch]')
                  : (is200 && level === 1 ? 'ml-[9ch]' : 'ml-4')
                }`
                : `space-y-1 ${level === 0
                  ? (is200 ? 'ml-0' : 'ml-[9ch]')
                  : (is200 && level === 1 ? 'ml-[9ch]' : 'ml-4')
                }`
            }
          >
            {question.children!.map((child, childIdx) => (
              <div key={child.id} className="break-inside-avoid">
                <PreviewQuestionNode200
                  question={child}
                  index={childIdx}
                  level={level + 1}
                  parentPath={fullPath}
                  sectionNumber={sectionNumber}
                  sectionGroup={sectionGroup}
                  parentSubQuestionList={activeSubQuestionList.length > 0 ? activeSubQuestionList : parentSubQuestionList}
                  docId={docId}
                  mode={mode}
                  showAnswerKey={showAnswerKey}
                />
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
};

export default PqsSectionPreview200;
