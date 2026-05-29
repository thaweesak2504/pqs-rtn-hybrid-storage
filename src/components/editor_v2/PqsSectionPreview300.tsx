import { invoke } from '@tauri-apps/api/tauri';
import React, { useEffect, useMemo, useState } from 'react';
import { QuestionDetail } from '../../types/content';
import Tooltip from '../ui/Tooltip';
import { logger } from '../../utils/logger';

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

interface PqsSectionPreview300Props {
  docId: string;
  sectionId: number;
  sectionNumber: number;
  title: string;
  subTitle?: string;
}

// ============ Main Component ============

const PqsSectionPreview300: React.FC<PqsSectionPreview300Props> = ({
  docId,
  sectionId,
  sectionNumber,
  title,
  subTitle,
}) => {
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [docBranchMain, setDocBranchMain] = useState('');
  const [docBranchSub, setDocBranchSub] = useState('');

  useEffect(() => {
    if (!docId) return;
    invoke<{main?: string, sub?: string}>('get_document_branch', { docId })
      .then(data => { setDocBranchMain(data.main || ''); setDocBranchSub(data.sub || ''); })
      .catch(() => {});
  }, [docId]);

  const docBranch = useMemo(() => {
    return (docBranchMain && docBranchSub) ? { main: docBranchMain, sub: docBranchSub } : undefined;
  }, [docBranchMain, docBranchSub]);

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
    questions.forEach((q) => map.set(q.id, { ...q, children: [] }));
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

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <div className="text-sm text-slate-400">กำลังโหลด Preview...</div>
      </div>
    );
  }

  const titlePrefix = 'การปฏิบัติหน้าที่ในตำแหน่ง ';

  return (
    <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
      {/* A4 Paper */}
      <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-black box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_1.0cm_2.0cm_2.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">

        {/* ── Section Header ── */}
        <div className="mb-4">
          <div className="flex mb-4">
            <div className="font-bold text-lg min-w-[8ch]">
              {toThaiNumber(sectionNumber)}
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg mb-1">
                {titlePrefix}{title}
              </h1>
              {subTitle && (
                <div className="text-base text-slate-600 dark:text-slate-400">{subTitle}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Questions ── */}
        <div className="space-y-1">
          {questionTree.map((question, index) => (
            <PreviewQuestionNode300
              key={question.id}
              question={question}
              index={index}
              level={0}
              parentPath={toThaiNumber(sectionNumber)}
              sectionNumber={sectionNumber}
              docBranch={docBranch}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============ Recursive Question Node ============

interface PreviewQuestionNode300Props {
  question: QuestionDetail;
  index: number;
  level: number;
  parentPath: string;
  sectionNumber: number;
  parentSubQuestionList?: Array<{ code: string; text: string; alwaysChecked?: boolean }>;
  docBranch?: { main: string; sub: string };
}

const PreviewQuestionNode300: React.FC<PreviewQuestionNode300Props> = ({
  question,
  index,
  level,
  parentPath,
  sectionNumber,
  parentSubQuestionList,
  docBranch,
}) => {
  const meta = useMemo(() => {
    if (!question.metadata) return {};
    try { return JSON.parse(question.metadata); } catch { return {}; }
  }, [question.metadata]);

  // Numbering: L0 = ๓xx.๑, L1 = ๓xx.๑.๑, L2 = ก.
  let displayNumber = '';
  let fullPath = '';
  if (meta.refSectionNumber) {
    displayNumber = toThaiNumber(meta.refSectionNumber);
    fullPath = `${parentPath} ${displayNumber}`;
  } else if (level === 0) {
    displayNumber = `${parentPath}.${toThaiNumber(index + 1)}`;
    fullPath = displayNumber;
  } else if (level === 1) {
    displayNumber = `${parentPath}.${toThaiNumber(index + 1)}`;
    fullPath = displayNumber;
  } else {
    displayNumber = toThaiAlphabet(index);
    fullPath = `${parentPath} ${displayNumber}`;
  }

  const hasChildren = question.children && question.children.length > 0;

  // Fetch ownSubQuestionList via invoke for L0 nodes with useSubQuestions
  const [ownSubQuestionList, setOwnSubQuestionList] = useState<Array<{ code: string; text: string; alwaysChecked?: boolean }>>([]);
  useEffect(() => {
    if (!question.metadata) { setOwnSubQuestionList([]); return; }
    try {
      const m = JSON.parse(question.metadata);
      if (!m.useSubQuestions) { setOwnSubQuestionList([]); return; }
      const activeCodes: string[] = Array.isArray(m.activeSubQuestions) ? m.activeSubQuestions : [];
      const selectedBranch: { main: string; sub: string } | undefined = m.selectedBranch || docBranch;
      if (!selectedBranch?.main) { setOwnSubQuestionList([]); return; }
      const lCode = question.sequence?.toString() || '0';
      const padBC = (c: string) => c === 'STD' ? '00' : c.padStart(2, '0');
      const derivedPrefix = `3${lCode}${padBC(selectedBranch.main)}${padBC(selectedBranch.sub)}`;
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
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.metadata, question.sequence]);

  // Effective sub-question list to pass to children
  const activeSubQuestionList = ownSubQuestionList.length > 0 ? ownSubQuestionList : parentSubQuestionList ?? [];

  // Inline sub-question checkboxes (checked-only) for L1/L2 nodes
  const inlineSubQItems = useMemo(() => {
    if (!parentSubQuestionList || parentSubQuestionList.length === 0) return null;
    if (!question.metadata) return null;
    try {
      const m = JSON.parse(question.metadata);
      const selected: string[] = Array.isArray(m.selectedSubQuestions) ? m.selectedSubQuestions : [];
      const checked = parentSubQuestionList.filter(sq => selected.includes(sq.code));
      return checked.length > 0 ? checked : null;
    } catch { return null; }
  }, [parentSubQuestionList, question.metadata]);

  const childLayout: 'list' | 'grid' = meta.childLayout === 'grid' ? 'grid' : 'list';
  const contentOffsetClass = level === 0 ? 'ml-0' : 'ml-[9ch]';
  const isExamChildPrintNode = level === 1 && parentPath.endsWith(`.${toThaiNumber(7)}`);

  return (
    <div className="flex flex-col">
      {/* Question Row */}
      <div className="flex items-baseline">
        <span className={`${level <= 1 ? 'min-w-[9ch]' : meta.refSectionNumber ? 'min-w-[4ch] mr-2' : 'min-w-[2ch] mr-1'} ${!isExamChildPrintNode && question.is_header ? 'font-bold' : 'font-normal'} shrink-0`}>
          {displayNumber}
        </span>

        <div className="flex-1">
          <div className={`flex items-center gap-2 min-w-0`}>
            <div className="flex-1 min-w-0">
              <span className={level === 0 || (level === 1 && parentPath.endsWith(`.${toThaiNumber(1)}`)) ? 'font-bold' : ''}>
                {question.content}
              </span>
              {/* Exempted text */}
              {question.question_type === 'exempted' && (
                <span className="ml-2 font-normal">
                  {question.display_text || "(ไม่ต้องปฏิบัติ)"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SubQ checkboxes on new line, indented to align with question text - show only for children nodes (level >= 2) */}
      {inlineSubQItems && level >= 2 && (
        <div className="ml-[3ch] flex items-center gap-1.5 flex-wrap">
          {inlineSubQItems.map((sq) => {
            const realIndex = parentSubQuestionList!.findIndex(p => p.code === sq.code);
            const sqItem = parentSubQuestionList!.find(p => p.code === sq.code);
            return (
              <Tooltip key={sq.code} content={sqItem?.text || sq.code} position="left">
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

      {/* Description (L0 only) */}
      {level === 0 && question.description && (
        <div className={`mt-1 ml-[9ch] whitespace-pre-line indent-6`}>
          {question.description}
        </div>
      )}

      {/* Description for 3xx.7.1 and 3xx.7.2 in print layout */}
      {isExamChildPrintNode && question.description && (
        <div className={`mt-1 ml-[9ch] whitespace-pre-line indent-6`}>
          {question.description}
        </div>
      )}

      {/* SubQuestionList (L0 with useSubQuestions, fetched via invoke) */}
      {level === 0 && ownSubQuestionList.length > 0 && (
        <div className="mt-1.5 ml-[9ch] space-y-0.5">
          {ownSubQuestionList.map((sq, sqIdx) => (
            <div key={sq.code} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="text-black dark:text-white min-w-[2.5ch] shrink-0">{toThaiAlphabet(sqIdx)}</span>
              <span>{sq.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Children */}
      {hasChildren && (
        <div className={`mt-0.5 ${contentOffsetClass} ${childLayout === 'grid' ? 'grid grid-cols-2 gap-x-4' : 'flex flex-col gap-0.5'}`}>
          {question.children!.map((child, childIdx) => (
            <div key={child.id} className="break-inside-avoid">
              <PreviewQuestionNode300
                question={child}
                index={childIdx}
                level={level + 1}
                parentPath={fullPath}
                sectionNumber={sectionNumber}
                parentSubQuestionList={activeSubQuestionList.length > 0 ? activeSubQuestionList : parentSubQuestionList}
                docBranch={docBranch}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PqsSectionPreview300;
