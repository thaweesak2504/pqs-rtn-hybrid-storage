import { invoke } from "@tauri-apps/api/tauri";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Edit, MessageSquarePlus, MoreVertical, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { QuestionDetail } from "../../types/content";
import DropdownMenu, { DropdownMenuItem } from "../ui/DropdownMenu";
import { UserAnswer } from "./PqsQuestionSection";
import QuestionMetadataDisplay from "./QuestionMetadataDisplay";

// ============ Types ============

interface SubQuestionItem {
  code: string;
  text: string;
  alwaysChecked?: boolean;
}

type ViewMode = 'edit' | 'qualifier' | 'trainee' | 'visitor' | 'print';

interface QuestionDisplayCardProps {
  question: QuestionDetail;
  prefix: string;
  level: number;
  sectionGroup?: 100 | 200 | 300;
  readOnly: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  canAddSub: boolean;
  canInsertSibling?: boolean;
  isFirst: boolean;
  isLast: boolean;
  isDefaultL1?: boolean;
  isDefault300L2?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSub: () => void;
  onInsertAfter: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  viewMode?: ViewMode;
  onImageClick?: (src: string) => void;
  parentLayout?: "list" | "grid";
  parentSubQuestionList?: SubQuestionItem[];
  traineeAnswer?: UserAnswer;
  answerMap?: Map<string, UserAnswer>;
  documentId: string;
  onRefresh?: () => void;
}

// ============ Helpers ============
const toThaiNumber = (num?: number | string | null): string => {
  if (num === null || num === undefined) return '';
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().replace(/\d/g, (match) => thaiDigits[match as any]);
};

const toThaiAlphabet = (n: number) => {
  const alpha = [
    "ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ", "ฎ", "ฏ", "ฐ", "ฑ", "ฒ", "ณ",
    "ด", "ต", "ถ", "ท", "ธ", "น", "บ", "ป", "ผ", "ฝ", "พ", "ฟ", "ภ", "ม", "ย", "ร",
    "ล", "ว", "ศ", "ษ", "ส", "ห", "ฬ", "อ", "ฮ",
  ];
  return n > 0 && n <= alpha.length ? alpha[n - 1] : n.toString();
};

// ============ Component ============
const QuestionDisplayCard: React.FC<QuestionDisplayCardProps> = ({
  question,
  prefix,
  level,
  sectionGroup = 100,
  readOnly,
  isExpanded,
  hasChildren,
  canAddSub,
  canInsertSibling = true,
  isFirst,
  isLast,
  isDefaultL1 = false,
  isDefault300L2 = false,
  onToggle,
  onEdit,
  onDelete,
  onAddSub,
  onInsertAfter,
  onMoveUp,
  onMoveDown,
  onImageClick,
  parentLayout = "list",
  parentSubQuestionList,
  viewMode = 'edit',
  traineeAnswer,
  answerMap,
  documentId,
  onRefresh,
}) => {
  const is200 = sectionGroup === 200;
  const is300 = sectionGroup === 300;
  const is200or300 = is200 || is300;
  const isL1 = level === 0;

  // Special question type detection for Section 300
  const questionSequence = question.sequence ? parseInt(question.sequence.toString()) : null;
  const isSection100or200Selector = is300 && questionSequence && !isL1 && (questionSequence === 4 || questionSequence === 5) && prefix.includes('.๑.');

  // Section-ref L3 children are now rendered via the question tree (QuestionTreeNode),
  // so no special inline fetch/display is needed here.
  const isSectionRefChild = is300 && (() => {
    if (!question.metadata) return false;
    try { const m = JSON.parse(question.metadata); return !!m.refSectionId; } catch { return false; }
  })();

  // Fetch sub-questions from DB for display in L1 header (2xx.2 / 2xx.4 / 3xx.2 / 3xx.4)
  const [displaySubQList, setDisplaySubQList] = useState<SubQuestionItem[]>([]);
  const [displayActiveCodes, setDisplayActiveCodes] = useState<string[]>([]);
  useEffect(() => {
    if (!is200or300 || !isL1 || !question.metadata) { setDisplaySubQList([]); setDisplayActiveCodes([]); return; }
    try {
      const meta = JSON.parse(question.metadata);
      if (!meta.useSubQuestions) { setDisplaySubQList([]); setDisplayActiveCodes([]); return; }
      const activeCodes: string[] = Array.isArray(meta.activeSubQuestions) ? meta.activeSubQuestions : [];
      const selectedBranch: { main: string; sub: string } | undefined = meta.selectedBranch;
      if (!selectedBranch?.main) { setDisplaySubQList([]); setDisplayActiveCodes(activeCodes); return; }
      // Build prefix from question.sequence + selectedBranch (S + L + X + Y)
      // This is the reliable way — activeCodes[0] may be from a different prefix
      const sCode = is300 ? "3" : "2";
      const lCode = question.sequence?.toString() || "0";
      const derivedPrefix = `${sCode}${lCode}${selectedBranch.main}${selectedBranch.sub}`;
      invoke<{ id: number; code: string; text: string; always_checked: boolean }[]>(
        'get_all_sub_questions_for_branch',
        { branchCode: selectedBranch.main }
      ).then((dbSqs: any[]) => {
        const filtered = derivedPrefix
          ? dbSqs.filter(sq => sq.code.startsWith(derivedPrefix))
          : dbSqs;
        const items = filtered.map(sq => ({ code: sq.code, text: sq.text, alwaysChecked: sq.always_checked }));
        setDisplaySubQList(items);
        // For 300Template: merge always_checked codes into displayActiveCodes so Auto items always show
        if (is300) {
          const alwaysCodes = items.filter(sq => sq.alwaysChecked).map(sq => sq.code);
          setDisplayActiveCodes(Array.from(new Set([...activeCodes, ...alwaysCodes])));
        } else {
          setDisplayActiveCodes(activeCodes);
        }
      }).catch(() => { setDisplaySubQList([]); setDisplayActiveCodes(activeCodes); });
    } catch { setDisplaySubQList([]); setDisplayActiveCodes([]); }
  }, [is200or300, is300, isL1, question.metadata, question.sequence]);

  // SubQ usage count per code for L1 header — fetched from backend relational table
  interface SubQuestionUsageResponse { usage_map: Record<string, number>; total_children: number; }
  const [subQUsedData, setSubQUsedData] = useState<SubQuestionUsageResponse>({ usage_map: {}, total_children: 0 });
  useEffect(() => {
    if (!is200or300 || !isL1 || !displaySubQList.length) { setSubQUsedData({ usage_map: {}, total_children: 0 }); return; }
    invoke<SubQuestionUsageResponse>('get_sub_question_usage_counts', { parentId: question.id })
      .then(data => setSubQUsedData(data))
      .catch(() => setSubQUsedData({ usage_map: {}, total_children: 0 }));
  }, [is200or300, isL1, displaySubQList.length, question.id]);

  const showDescriptionImage = is200or300 ? (level === 0 || level === 1) : isL1;

  // Compute inline sub-question checkboxes for L2/L3
  const inlineSubQItems = useMemo(() => {
    if (!parentSubQuestionList || parentSubQuestionList.length === 0) return null;
    if (!question.metadata) return parentSubQuestionList.map(sq => ({ sq, checked: false }));
    try {
      const meta = JSON.parse(question.metadata);
      const selected: string[] = Array.isArray(meta.selectedSubQuestions) ? meta.selectedSubQuestions : [];
      return parentSubQuestionList.map(sq => ({ sq, checked: selected.includes(sq.code) }));
    } catch { return parentSubQuestionList.map(sq => ({ sq, checked: false })); }
  }, [parentSubQuestionList, question.metadata]); // 200: show for L0 & L1, others: L0 only

  return (
    <div
      className={`
      group relative flex items-start gap-3 px-4 py-3 transition-all duration-150
      ${isL1
          ? "bg-white dark:bg-slate-800"
          : parentLayout === "grid"
            ? "bg-slate-50/80 dark:bg-slate-800/80 m-1 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm"
            : level === 1 && is200or300
              ? "bg-slate-50/50 dark:bg-slate-800/50 ml-12" // L2: standard indent
              : "bg-slate-50/50 dark:bg-slate-800/50 ml-20" // L3: deeper indent
        }
      ${!isLast && parentLayout !== "grid" ? "border-b border-gray-100 dark:border-slate-700/50" : ""}
      hover:bg-blue-50/50 dark:hover:bg-blue-950/20
    `}
    >
      {/* L2 connector dot */}
      {level === 1 && is200or300 && parentLayout !== "grid" && (
        <div className="absolute left-[-18px] top-[24px] -translate-y-1/2 flex items-center">
          <div className="w-[32px] h-px bg-blue-200 dark:bg-blue-800" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-blue-700 shrink-0" />
        </div>
      )}

      {/* L3 connector dot only */}
      {!(isL1 || (level === 1 && is200or300)) && parentLayout !== "grid" && (
        <div className="absolute left-[-18px] top-[24px] -translate-y-1/2 flex items-center">
          <div className="w-[32px] h-px bg-blue-200 dark:bg-blue-800" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-blue-700 shrink-0" />
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 mt-0.5 flex items-center justify-center rounded transition-all shrink-0
          ${!isL1 ? "ml-2" : ""}
          ${hasChildren
            ? "text-slate-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            : "invisible"
          }`}
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Prefix Badge */}
      <span
        className={`
        shrink-0 inline-flex items-center justify-center
        ${isL1
            ? "rounded-md min-w-[36px] px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-700/70 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
            : level === 1 && is200or300
              ? "min-w-[24px] text-sm font-bold text-blue-600 dark:text-blue-400" // L2: Bold blue
              : "min-w-[24px] text-sm font-normal " + (is300 ? "text-purple-600 dark:text-purple-400" : "text-orange-600 dark:text-orange-400") // L3: Normal color
          }
      `}
      >
        {prefix}
      </span>

      {/* Content */}
      <div
        className={`flex-1 flex flex-col min-w-0 select-text
        ${isL1
            ? "text-sm text-slate-900 dark:text-slate-100" // L1: Stronger emphasis
            : level === 1 && is200or300
              ? "text-sm font-medium text-slate-800 dark:text-slate-200" // L2: Medium weight, slightly darker
              : "text-sm font-normal text-slate-600 dark:text-slate-400" // L3: Normal weight, slightly lighter
          }
      `}
      >
        {/* Row 1: Content + Refs + Inline SubQ Checkboxes */}
        <div className="flex items-start gap-2 min-w-0 pr-2">
          <div className="flex-1 min-w-0">
            <span className={isL1 ? "font-semibold" : ""}>{question.content}</span>
            {question.references && question.references.length > 0 && (
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400 font-normal">
                (
                {question.references
                  .map((ref) => `${ref.thai_letter || "?"}.${ref.location_text || "-"}`)
                  .join(", ")}
                )
              </span>
            )}
            {/* Exempted badge */}
            {question.question_type === 'exempted' && (
              <span className="ml-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                {question.display_text || "(ไม่ต้องปฏิบัติ)"}
              </span>
            )}
          </div>
          {/* Score badges — aligned right, purple theme for 300 */}
          {is300 && (
            <div className="flex items-center gap-2 shrink-0">
              {/* Group header (L1/L2 with children): show group_score */}
              {question.is_group_header && (question.group_score != null && question.group_score > 0) && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${!question.parent_id
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
                  : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  }`}>
                  {!question.parent_id ? (
                    <><span className="mr-2">รวม:</span>{toThaiNumber(question.group_score)} คะแนน</>
                  ) : (
                    <>{toThaiNumber(question.group_score)} คะแนน</>
                  )}
                </span>
              )}
              {/* Individual scored item (L2/L3): show score (emerald) */}
              {!question.is_group_header && question.is_scored && (question.score != null && question.score > 0) && (
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {toThaiNumber(question.score)} คะแนน
                </span>
              )}
            </div>
          )}
          {/* Inline SubQ checkboxes — ชิดขวา (ซ่อนเมื่อ L2 เป็น group_header มี L3 จำนวนครั้ง) */}
          {inlineSubQItems && !question.is_group_header && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {inlineSubQItems.map(({ sq, checked }, idx) => (
                <span key={sq.code} className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  <span className={`text-sm font-normal ${is300 ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}>{toThaiAlphabet(idx + 1)}.</span>
                  <span className={`w-3.5 h-3.5 inline-flex items-center justify-center rounded border text-[9px] font-bold shrink-0
                    ${checked
                      ? is300 ? "border-purple-400 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400" : "border-amber-400 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                    }`}
                  >
                    {checked && "✔"}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {showDescriptionImage && question.description && question.description !== 'undefined' && question.description !== 'null' && question.question_type !== 'exempted' && !(isSection100or200Selector && question.question_type === 'exempted') && (
          <div className="mt-1 text-sm font-normal text-slate-700 dark:text-slate-400 whitespace-pre-wrap">
            {question.description}
          </div> // Description: Match L2 style
        )}
        {/* Section-ref L3 children for 3xx.1.4/1.5 are rendered via QuestionTreeNode as normal children */}
        {isSection100or200Selector && question.question_type !== 'exempted' && !(question.children && question.children.length > 0) && (
          <div className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded inline-block">
            ⚠ ยังไม่ได้เลือก Section
          </div>
        )}
        {/* SubQuestionList display for 2xx.2 / 2xx.4 / 3xx.2 / 3xx.4 L1 — DB-backed */}
        {is200or300 && isL1 && displaySubQList.length > 0 && (() => {
          if (displayActiveCodes.length === 0) {
            return (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400">
                <span>⚠</span><span>ยังไม่ได้เลือกคำถามย่อยที่ใช้งาน</span>
              </div>
            );
          }
          const display = displaySubQList.filter(sq => displayActiveCodes.includes(sq.code) || sq.alwaysChecked);
          if (display.length === 0) {
            return (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400">
                <span>⚠</span><span>ยังไม่ได้เลือกคำถามย่อยที่ใช้งาน</span>
              </div>
            );
          }
          return (
            <div className="mt-1.5 space-y-1.5">
              {display.map((sq, idx) => (
                <div key={sq.code} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-300">
                  <span className={`font-bold min-w-[1.5ch] ${is300 ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}>{toThaiAlphabet(idx + 1)}.</span>
                  <span className="flex-1">{sq.text}</span>
                  {sq.alwaysChecked && <span className="text-[8px] text-emerald-500">✓</span>}
                  {/* Usage badge from relational table */}
                  {!sq.alwaysChecked && (() => {
                    const count = subQUsedData.usage_map[sq.code] || 0;
                    const total = subQUsedData.total_children;
                    if (count === 0) {
                      return <span className="text-[10px] px-2 py-[1px] rounded-full bg-orange-100 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 font-bold whitespace-nowrap">Unused (0/{total})</span>;
                    }
                    return <span className="text-[10px] px-2 py-[1px] rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 font-bold whitespace-nowrap">Used: {count}/{total}</span>;
                  })()}
                </div>
              ))}
            </div>
          );
        })()}
        {/* Trainee Answer Box & Answer Keys managed inside QuestionMetadataDisplay */}

        {question.metadata && (
          <div onClick={(e) => e.stopPropagation()}>
            <QuestionMetadataDisplay
              metadata={question.metadata}
              questionId={question.id}
              documentId={documentId}
              onImageClick={onImageClick}
              parentSubQuestionList={parentSubQuestionList}
              readOnly={readOnly}
              showAnswerBox={(!is300 && !question.is_group_header && question.question_type !== 'exempted') && (viewMode !== 'visitor')}
              showAnswerKey={viewMode === 'edit' || viewMode === 'qualifier' || viewMode === 'print'}
              mode={viewMode === 'qualifier' ? 'qualifier' : viewMode === 'trainee' ? 'trainee' : 'viewer'}
              traineeAnswer={traineeAnswer}
              answerMap={answerMap}
              onRefresh={onRefresh}
            />
          </div>
        )}
      </div>


      {/* Actions */}
      {!readOnly && viewMode === 'edit' && (
        <div className="pl-2 border-l border-slate-200 dark:border-slate-700 shrink-0">
          <DropdownMenu
            trigger={
              <button className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            }
            items={
              isDefault300L2
                ? ([
                  ...(canAddSub && question.question_type !== 'exempted'
                    ? [{
                      label: "เพิ่มคำถามย่อย (Add Sub-Question)",
                      icon: <MessageSquarePlus />,
                      onClick: onAddSub,
                    }]
                    : []),
                  {
                    label: "แก้ไข (Edit)",
                    icon: <Edit />,
                    onClick: onEdit,
                  },
                ] as DropdownMenuItem[])
                : isDefaultL1
                  ? ([
                    ...(canAddSub && question.question_type !== 'exempted'
                      ? [{
                        label: "เพิ่มคำถามย่อย (Add Sub-Question)",
                        icon: <MessageSquarePlus />,
                        onClick: onAddSub,
                      }]
                      : []),
                    {
                      label: "แก้ไข (Edit)",
                      icon: <Edit />,
                      onClick: onEdit,
                    },
                  ] as DropdownMenuItem[])
                  : (question.question_type === 'required_instance' || isSectionRefChild)
                    ? ([
                      {
                        label: "แก้ไข (Edit)",
                        icon: <Edit />,
                        onClick: onEdit,
                      },
                    ] as DropdownMenuItem[])
                    : ([
                      ...(canInsertSibling ? [
                        {
                          label: "แทรกคำถามต่อท้าย (Insert After)",
                          icon: <Plus />,
                          onClick: onInsertAfter,
                        },
                        { label: "separator", onClick: () => { }, separator: true },
                      ] : []),
                      {
                        label: "เลื่อนขึ้น (Move Up)",
                        icon: <ArrowUp />,
                        onClick: onMoveUp,
                        disabled: isFirst,
                      },
                      {
                        label: "เลื่อนลง (Move Down)",
                        icon: <ArrowDown />,
                        onClick: onMoveDown,
                        disabled: isLast,
                      },
                      { label: "separator", onClick: () => { }, separator: true },
                      ...(canAddSub
                        ? [
                          {
                            label: "เพิ่มคำถามย่อย (Add Sub-Question)",
                            icon: <MessageSquarePlus />,
                            onClick: onAddSub,
                          },
                        ]
                        : []),
                      {
                        label: "แก้ไข (Edit)",
                        icon: <Edit />,
                        onClick: onEdit,
                      },
                      {
                        label: "ลบ (Delete)",
                        icon: <Trash2 />,
                        onClick: onDelete,
                        danger: true,
                      },
                    ] as DropdownMenuItem[])
            }
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(QuestionDisplayCard);
