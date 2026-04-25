import { invoke } from '@tauri-apps/api/tauri';
import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { QuestionDetail } from '../../types/content';
import { ReferenceDoc } from './PqsReferenceSection';
import { logger } from '../../utils/logger';

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

const PqsSectionPreview100: React.FC<PqsSectionPreviewProps> = ({
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

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!docId || sectionId === undefined) return;
      try {
        setLoading(true);
        const data = await invoke<QuestionDetail[]>('get_document_questions_with_details', { docId });
        const filtered = data.filter(
          (q) =>
            q.section_id === sectionId ||
            (q.section_id === 0 && q.sequence >= sectionNumber && q.sequence < sectionNumber + 100),
        );
        setQuestions(filtered);
      } catch (error) {
        logger.error('Failed to fetch questions for preview:', error);
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
    questions.forEach((q) => { map.set(q.id, { ...q, children: [] }); });
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
      nodes.forEach((n) => { if (n.children && n.children.length > 0) sortNodes(n.children); });
    };
    sortNodes(tree);
    return tree;
  }, [questions]);

  const showAnswerKey = mode === 'print' ? printSubView === 'question-with-key' : (mode === 'qualifier');

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <div className="text-sm text-slate-400">กำลังโหลด Preview...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-github-bg-primary min-h-full transition-colors duration-300">

      {/* ——— Toolbar (Print mode only) ——— */}
      {/* REMOVED: Toolbar now controlled by Print Layout dropdown button
      {mode === 'print' && (
        <div className="flex items-center justify-between gap-3 px-6 py-3 bg-github-bg-secondary border-b border-github-border-primary print:hidden sticky top-0 z-10">
          <div className="flex items-center gap-1 bg-github-bg-tertiary rounded-lg p-1">
            <button onClick={() => setPrintSubView('question-only')} className={`...`}>
              <FileText className="w-4 h-4" />
              เล่มคำถาม (Trainee)
            </button>
            <button onClick={() => setPrintSubView('question-with-key')} className={`...`}>
              <BookOpen className="w-4 h-4" />
              เล่มเฉลย (Qualifier)
            </button>
          </div>
          <button onClick={() => window.print()} className={`...`}>
            <Printer className="w-4 h-4" />
            พิมพ์
          </button>
        </div>
      )}
      */}

      {/* ——— A4 Paper ——— */}
      <div className="flex justify-center p-8 min-w-fit">
        <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-black box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_1.0cm_2.0cm_2.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">

          {/* ——— Section Header ——— */}
          <div className="mb-4">
            <div className="flex mb-4">
              <div className="font-bold text-lg min-w-[8ch]">
                {toThaiNumber(sectionNumber)}
              </div>
              <div className="flex-1">
                <h1 className="font-bold text-lg mb-2">{title}</h1>
                <div className="mb-2">
                  <span>เอกสารอ้างอิง :</span>
                </div>
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

          {/* ——— Questions ——— */}
          <div className="space-y-1">
            {questionTree.map((question, index) => (
              <PreviewQuestionNode
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
    </div>
  );
};

// ============ Recursive Question Node ============

interface PreviewQuestionNodeProps {
  question: QuestionDetail;
  index: number;
  level: number;
  parentPath: string;
  sectionNumber: number;
  sectionGroup?: 100 | 200 | 300;
  docId: string;
  mode?: "trainee" | "qualifier" | "viewer" | "edit" | "visitor" | "print";
  showAnswerKey?: boolean;
}

const PreviewQuestionNode: React.FC<PreviewQuestionNodeProps> = ({
  question,
  index,
  level,
  parentPath,
  sectionNumber,
  sectionGroup,
  docId,
  mode = "viewer",
  showAnswerKey = false,
}) => {
  // Build numbering: 100/300: L0 = ๑๐๑.๑, L1 = ก.
  let displayNumber = '';
  let fullPath = '';

  if (level === 0) {
    displayNumber = `${parentPath}.${toThaiNumber(index + 1)}`;
    fullPath = displayNumber;
  } else {
    displayNumber = toThaiAlphabet(index);
    fullPath = `${parentPath} ${displayNumber}`;
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

  useEffect(() => {
    invoke<AnswerKeyRow[]>('get_question_answer_keys', { questionId: question.id })
      .then(rows => {
        const single = rows.find(r => (r.sub_question_code || '') === '');
        setAnswerKey(single?.answer_key_text || '');
      })
      .catch(() => setAnswerKey(''));
  }, [question.id]);

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
  };

  const contentStartOffsetClass = level === 0 ? 'ml-[9ch]' : 'ml-[2ch]';

  const childLayout: 'list' | 'grid' = meta.childLayout === 'grid' ? 'grid' : 'list';

  // Build reference text like "(ก.35, ข.12)"
  const refText = question.references && question.references.length > 0
    ? `(${question.references.map(r => `${r.thai_letter || '?'}.${r.location_text || '-'}`).join(', ')})`
    : '';

  return (
    <div className="flex flex-col">
      {/* Question Row */}
      <div className="flex items-baseline">
        <span
          className={`${level === 0 ? 'min-w-[9ch]' : 'min-w-[2ch] mr-1'} ${question.is_header ? 'font-bold' : 'font-normal'} shrink-0`}
        >
          {displayNumber}
        </span>

        <div className="flex-1">
          <span className={question.is_header ? 'font-bold' : ''}>
            {question.content}
          </span>
          {refText && (
            <span className="ml-1">{refText}</span>
          )}
        </div>
      </div>

      {/* Description (if any, L0 only) */}
      {level === 0 && question.description && (
        <div className={`mt-1 ${level === 0 ? 'ml-[9ch]' : 'ml-[2ch]'} whitespace-pre-line indent-6`}>
          {question.description}
        </div>
      )}

      {/* Answer Key Box — shown only when showAnswerKey=true, TraineeAnswerBox removed from print */}
      {showAnswerKey && answerKey && (
        <div className={`mt-2 ${contentStartOffsetClass}`}>
          <div className="flex items-start gap-2 text-sm font-normal text-slate-900 dark:text-slate-100 bg-white dark:bg-github-bg-tertiary px-2 py-1.5 rounded-md border border-gray-300 dark:border-github-border-primary mb-2">
            <span className="text-slate-900 dark:text-slate-100 shrink-0">เฉลย:</span>
            <div className="answer-key-markdown min-w-0 flex-1">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {formatAnswerKeyForDisplay(answerKey).replace(/\n/g, "  \n")}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Children (sub-questions) */}
      {hasChildren && (
        <div
          className={
            childLayout === 'grid'
              ? `grid grid-cols-2 gap-x-8 gap-y-1 ${level === 0 ? 'ml-[9ch]' : 'ml-4'}`
              : `space-y-1 ${level === 0 ? 'ml-[9ch]' : 'ml-4'}`
          }
        >
          {question.children!.map((child, childIdx) => (
            <div key={child.id} className="break-inside-avoid">
              <PreviewQuestionNode
                question={child}
                index={childIdx}
                level={level + 1}
                parentPath={fullPath}
                sectionNumber={sectionNumber}
                sectionGroup={sectionGroup}
                docId={docId}
                mode={mode}
                showAnswerKey={showAnswerKey}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PqsSectionPreview100;
