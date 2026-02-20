import { invoke } from '@tauri-apps/api/tauri';
import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { QuestionDetail } from '../../types/content';
import { ReferenceDoc } from './PqsReferenceSection';

// ============ Helpers ============

const toThaiNumber = (num: number | string) => {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().split('').map(d => {
    const parsed = parseInt(d);
    return !isNaN(parsed) && parsed >= 0 && parsed <= 9 ? thaiDigits[parsed] : d;
  }).join('');
};

const thaiAlpha = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'];

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
}

interface SubQuestionItem {
  code: string;
  text: string;
  alwaysChecked?: boolean;
}

// ============ Main Component ============

const PqsSectionPreview: React.FC<PqsSectionPreviewProps> = ({
  docId,
  sectionId,
  sectionNumber,
  title,
  references,
  sectionGroup = 100,
}) => {
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!docId || sectionId === undefined) return;
      try {
        setLoading(true);
        const data = await invoke<QuestionDetail[]>('get_document_questions_with_details', { docId });
        // Filter by sectionId (same logic as PqsQuestionSection)
        const sectionIdNum = Number(sectionId);
        const filtered = data.filter(
          (q) =>
            Number(q.section_id) === sectionIdNum ||
            (Number(q.section_id) === 0 && q.sequence >= sectionNumber && q.sequence < sectionNumber + 100)
        );
        setQuestions(filtered);
      } catch (err) {
        console.error('Failed to fetch questions for preview:', err);
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

        {/* ── Section Header ── */}
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

        {/* ── Questions ── */}
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
            />
          ))}
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
  sectionGroup: 100 | 200 | 300;
  parentSubQuestionList?: SubQuestionItem[];
}

const PreviewQuestionNode: React.FC<PreviewQuestionNodeProps> = ({
  question,
  index,
  level,
  parentPath,
  sectionNumber,
  sectionGroup,
  parentSubQuestionList,
}) => {
  const is200 = sectionGroup === 200;

  // Build numbering based on section group
  let displayNumber = '';
  let fullPath = '';

  if (is200) {
    // 200: L0 = ๒๐๑.๑, L1 = ๒๐๑.๑.๑, L2 = ก.
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
    // 100/300: L0 = ๑๐๑.๑, L1 = ก.
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

  const answerKey = meta.answerKey || '';
  const answerKeys = (meta.answerKeys && typeof meta.answerKeys === "object") ? meta.answerKeys as Record<string, string> : null;
  const hasChildren = question.children && question.children.length > 0;

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

  // Compute inline sub-question checkboxes for L2/L3 (200Template only)
  const inlineSubQItems = useMemo(() => {
    if (!is200) return null;
    if (level === 0) return null; // ไม่แสดงใน L1
    
    // สำหรับ L2, เช็คว่าตัวเองมีการใช้ subQuestionList ไหม ถ้ามีให้แสดงของตัวเอง ถ้าไม่มีให้รับจาก parent (แต่จริง ๆ L2 ของ 200 ส่วนใหญ่ไม่มี subQ ของตัวเอง, มันรับจาก L1 มา)
    // ตรงนี้เราต้องระวังว่า เราจะแสดง inline checkboxes เฉพาะเมื่อ parentSubQuestionList มีของ และ node นี้ "ถูกคาดหวัง" ให้ตอบ
    // หรือดูจาก meta.selectedSubQuestions ว่ามีการเลือกไว้ไหม
    if (!parentSubQuestionList || parentSubQuestionList.length === 0) return null;
    
    // ถ้าเป็น L2 (เช่น 201.2) ปกติมันคือหัวข้อหมวดหมู่ อาจจะไม่มีการเลือกคำถามย่อยโดยตรง
    // เราจะแสดง inline checkboxes ต่อเมื่อมันมีการเลือกคำถามย่อย (selectedSubQuestions > 0)
    // หรือถ้าเป็น L3 (ก. ข. ค.) มักจะมีการเลือกคำถามย่อย
    
    try {
      const selected: string[] = Array.isArray(meta.selectedSubQuestions) ? meta.selectedSubQuestions : [];
      // ถ้าไม่มีการเลือกอะไรเลย ไม่ต้องแสดง checkbox ให้รก (เฉพาะกรณีที่ไม่อยากบังคับให้เห็นว่างๆ)
      // แต่ User อยากให้แสดงเฉพาะที่ "มีอยู่จริง" (parentSubQuestionList)
      
      // กรองเอาเฉพาะอันที่มีใน parentSubQuestionList
      return parentSubQuestionList.map(sq => ({ sq, checked: selected.includes(sq.code) }));
    } catch { return null; }
  }, [is200, level, parentSubQuestionList, meta]);

  const is200L1 = is200 && level === 0;
  const is200L2 = is200 && level === 1;
  const is200L3 = is200 && level >= 2;
  const contentStartOffsetClass = (level === 0 || is200L2) ? 'ml-[9ch]' : 'ml-[2ch]';

  const childLayout: 'list' | 'grid' = meta.childLayout === 'grid' ? 'grid' : 'list';

  // Build reference text like "(ก.35, ข.12)"
  const refText = question.references && question.references.length > 0
    ? `(${question.references.map(r => `${r.thai_letter || '?'}.${r.location_text || '-'}`).join(', ')})`
    : '';

  return (
    <div className="flex flex-col">
      {/* Question Row */}
      <div className={`flex flex-col sm:flex-row sm:items-baseline ${is200L3 ? "text-black dark:text-gray-300" : ""}`}>
        <div className="flex items-baseline flex-1 min-w-0 pr-2">
          <span
            className={`${(level === 0 || is200L2) ? 'min-w-[9ch]' : 'min-w-[2ch] mr-1'} ${question.is_header || is200L3 ? 'font-bold' : 'font-normal'} shrink-0`}
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

        {/* Inline SubQ checkboxes — ชิดขวา */}
        {inlineSubQItems && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-start sm:justify-end mt-1 sm:mt-0 ml-[2ch] sm:ml-0">
            {inlineSubQItems.map(({ sq, checked }, idx) => (
              <span key={sq.code} className="inline-flex items-center gap-0.5 text-xs whitespace-nowrap">
                <span className="font-bold">{toThaiAlphabet(idx + 1)}.</span>
                <span className={`w-4 h-4 inline-flex items-center justify-center rounded border text-[10px] font-bold shrink-0
                  ${checked
                    ? "border-black dark:border-white text-black dark:text-white"
                    : "border-gray-400 dark:border-gray-500 text-transparent"
                  }`}>
                  {checked ? "✓" : ""}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Description (if any, L0 only) */}
      {level === 0 && question.description && (
        <div className={`mt-1 ${level === 0 ? 'ml-[9ch]' : 'ml-[2ch]'} whitespace-pre-line indent-6`}>
          {question.description}
        </div>
      )}

      {/* SubQuestionList display for 2xx.2 / 2xx.4 L1 (เหมือนใน PqsQuestionSection) */}
      {is200 && level === 0 && meta.useSubQuestions && (() => {
        try {
          const list: SubQuestionItem[] = Array.isArray(meta.subQuestionList) ? meta.subQuestionList : [];
          const activeCodes: string[] = Array.isArray(meta.activeSubQuestions) ? meta.activeSubQuestions : [];
          if (activeCodes.length === 0) return null;
          
          const display = list.filter(sq => activeCodes.includes(sq.code));
          if (display.length === 0) return null;
          
          return (
            <div className={`mt-1.5 space-y-0.5 ${contentStartOffsetClass}`}>
              {display.map((sq, idx) => (
                <div key={sq.code} className="flex items-center gap-1.5 text-sm text-black dark:text-gray-300">
                  <span className="font-bold min-w-[1.5ch]">{toThaiAlphabet(idx + 1)}.</span>
                  <span>{sq.text}</span>
                  {sq.alwaysChecked && <span className="text-[8px] text-gray-500">✓</span>}
                </div>
              ))}
            </div>
          );
        } catch { return null; }
      })()}

      {/* Answer Key Box — always shown, no repeated question, no checkboxes */}
      {answerKeys && Object.keys(answerKeys).length > 0 ? (
        <div className={`mt-2 ${contentStartOffsetClass} space-y-1.5`}>
          {((): [string, string][] => {
            const keys = answerKeys;
            const ordered: string[] = parentSubQuestionList
              ? parentSubQuestionList.map(s => s.code).filter(c => c in keys)
              : Array.isArray(meta.selectedSubQuestions)
                ? (meta.selectedSubQuestions as string[]).filter(c => c in keys)
                : Object.keys(keys);
            return ordered.map(c => [c, keys[c]]);
          })().map(([code, text]) => {
            const sqIdx = parentSubQuestionList ? parentSubQuestionList.findIndex(s => s.code === code) : -1;
            const label = sqIdx >= 0 ? toThaiAlphabet(sqIdx + 1) : code;
            return (
              <div key={code} className="flex items-start gap-2 text-sm font-normal text-black dark:text-gray-100 bg-white dark:bg-black px-2 py-1.5 rounded-md border border-gray-400 dark:border-gray-600">
                <span className="text-black dark:text-gray-100 shrink-0">เฉลย: <strong>{label}.</strong></span>
                <div className="answer-key-markdown min-w-0 flex-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {formatAnswerKeyForDisplay(text).replace(/\n/g, "  \n")}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>
      ) : answerKey ? (
        <div className={`mt-2 ${contentStartOffsetClass}`}>
          <div className="flex items-start gap-2 text-sm font-normal text-black dark:text-gray-100 bg-white dark:bg-black px-2 py-1.5 rounded-md border border-gray-400 dark:border-gray-600 mb-2">
            <span className="text-black dark:text-gray-100 shrink-0">เฉลย:</span>
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
      ) : null}

      {/* Children (sub-questions) */}
      {hasChildren && (
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
          {question.children!.map((child, childIdx) => {
            // Pass parentSubQuestionList to children if available
            // สำหรับ 200 L1 ที่มี useSubQuestions ให้ส่ง subQuestionList ต่อไปให้ลูกๆ
            // แต่ต้องกรองเอาเฉพาะอันที่ active (ที่มีอยู่จริง) เท่านั้น
            let ownSubQuestionList: SubQuestionItem[] | undefined = undefined;
            if (is200L1 && meta.useSubQuestions && Array.isArray(meta.subQuestionList)) {
               const activeCodes: string[] = Array.isArray(meta.activeSubQuestions) ? meta.activeSubQuestions : [];
               ownSubQuestionList = meta.subQuestionList.filter((sq: SubQuestionItem) => activeCodes.includes(sq.code));
            }
            const inheritedSubQuestionList = ownSubQuestionList || parentSubQuestionList;

            // For L1 (2xx.x.x), only render children (sub-questions) that are selected
            let shouldRender = true;
            if (is200L1 && meta.useSubQuestions && Array.isArray(meta.activeSubQuestions)) {
              // Try to get code from child metadata
              let childCode = "";
              try {
                if (child.metadata) {
                  const cm = JSON.parse(child.metadata);
                  childCode = cm.code || "";
                }
              } catch { }
              
              if (childCode) {
                // If it's a managed sub-question, check if it's active
                shouldRender = meta.activeSubQuestions.includes(childCode);
              }
              // If it doesn't have a code, it might be a normal child, so we still show it (shouldRender remains true)
            }
            if (!shouldRender) return null;

            return (
            <div key={child.id} className="break-inside-avoid">
              <PreviewQuestionNode
                question={child}
                index={childIdx}
                level={level + 1}
                parentPath={fullPath}
                sectionNumber={sectionNumber}
                sectionGroup={sectionGroup}
                parentSubQuestionList={inheritedSubQuestionList}
              />
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PqsSectionPreview;
