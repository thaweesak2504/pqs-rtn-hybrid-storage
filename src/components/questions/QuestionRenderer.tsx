import React from 'react';
import { QuestionDetail } from '../../types/content';
import { Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/shell';
import remarkGfm from 'remark-gfm';

interface QuestionRendererProps {
  question: QuestionDetail;
  level: number;
  onAnswerChange?: (questionId: string, value: string) => void;
  onEdit?: (question: QuestionDetail, parentPrefix: string) => void;
  onDelete?: (question: QuestionDetail) => void;
  onAddSubQuestion?: (question: QuestionDetail, parentPrefix: string) => void;
  readOnly?: boolean;
  parentPrefix?: string; // e.g. "101" or "101.1"
  visibleMaxDepth?: number; // Maximum nesting level to show "Add Sub-Question" button
  forceExpand?: boolean; // Control for Toggle All
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  level,
  onAnswerChange,
  onEdit,
  onDelete,
  onAddSubQuestion,
  readOnly = false,
  parentPrefix = '',
  visibleMaxDepth,
  forceExpand
}) => {
  const toThaiNumber = (num: string | number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => {
      const parsed = parseInt(d);
      return !isNaN(parsed) && parsed >= 0 && parsed <= 9 ? thaiDigits[parsed] : d;
    }).join('');
  };

  const isHeader = question.is_header;

  // Thai alphabet for L2 numbering (ก. ข. ค. ...)
  const toThaiAlphabet = (n: number) => {
    const alpha = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'];
    return alpha[n - 1] || `${n}`;
  };

  // Format prefix based on level:
  // L0/L1: parentPrefix.sequence (e.g. ๑๐๑.๑)
  // L2+: Thai alphabet (e.g. ก. ข. ค.)
  const currentPrefix = level >= 2
    ? `${toThaiAlphabet(question.sequence)}.`   // L2: ก. ข. ค.
    : parentPrefix
      ? `${parentPrefix}.${toThaiNumber(question.sequence)}`  // L1: ๑๐๑.๑
      : `${toThaiNumber(question.sequence)}`;                 // Fallback

  // State for expanded answer (if collapsible)
  // Logic: Text answers are always shown? Checkboxes might be hidden? 
  // In Moc, "Show Answer" toggles the answer box.
  // We'll trust forceExpand or local state.
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    if (forceExpand !== undefined) {
      setIsExpanded(forceExpand);
    }
  }, [forceExpand]);

  const [isEditingContent, setIsEditingContent] = React.useState(false);
  // Initial value should be cleaned content
  const prefixRegex = /^[\d\.]+\s+/;
  const initialCleanContent = question.content.replace(prefixRegex, '');
  const [contentVal, setContentVal] = React.useState(initialCleanContent);

  React.useEffect(() => {
    setContentVal(question.content.replace(prefixRegex, ''));
  }, [question.content]);

  const handleContentSave = async () => {
    if (contentVal.trim() === '' || contentVal === initialCleanContent) {
      setIsEditingContent(false);
      setContentVal(initialCleanContent);
      return; // No change
    }

    try {
      // Save WITHOUT prefix (new standard) or maybe with prefix if legacy?
      // User says "Inline Edit", we should follow the pattern of "Store Raw".
      // But verify if we need to preserve metadata?
      // We pass existing metadata.
      await invoke('update_question', {
        args: {
          id: question.id,
          content: contentVal.trim(), // Save pure content
          metadata: question.metadata // Preserve existing metadata
        }
      });
      setIsEditingContent(false);
      // Parent should refresh? 
      // We rely on parent fetching. But for immediate feedback we might need local state update?
      // Since props update when parent refetches, we just wait.
    } catch (error) {
      console.error("Failed to update question:", error);
      alert("Failed to save.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditingContent(false);
      setContentVal(initialCleanContent);
    }
    // Don't save on Enter for textarea, allow newlines.
    // Maybe Ctrl+Enter to save?
    if (e.key === 'Enter' && e.ctrlKey) {
      handleContentSave();
    }
  };

  // Calculate indentation based on level (tailwind classes)
  // Level 0: Main (1. System Description)
  // Level 1: Sub (1.1)
  // Level 2: Sub-sub (1.1.1)
  const indentClass = level > 0 ? `ml-${Math.min(level * 4, 12)}` : '';

  const renderContentWithCitations = () => {
    let content = question.content;

    // STRIP existing hardcoded prefix (e.g. "101.1 Content" -> "Content")
    const prefixRegex = /^[\d\.]+\s+/;
    const cleanContent = content.replace(prefixRegex, '');

    const citations = question.references || [];

    return (
      <div className="grid grid-cols-[max-content_1fr] gap-x-[3.5ch] items-start w-full">
        {/* Prefix Column */}
        <span className="font-bold whitespace-nowrap pt-0.5 min-w-fit text-black dark:text-github-text-primary">
          {!isHeader ? currentPrefix : ''}
        </span>

        {/* Content Column */}
        <div className="text-black dark:text-github-text-primary flex-1 min-w-0">
          {isEditingContent && !readOnly ? (
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                value={contentVal}
                onChange={(e) => setContentVal(e.target.value)}
                onBlur={handleContentSave}
                onKeyDown={handleKeyDown}
                className="w-full p-2 border border-blue-500 rounded bg-white dark:bg-github-bg-tertiary text-github-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px]"
              />
              <div className="flex gap-2 text-xs text-gray-400">
                <span>Press Ctrl+Enter to save, Esc to cancel</span>
              </div>
            </div>
          ) : (
            <div
              onClick={(e) => {
                if (!readOnly) {
                  e.stopPropagation();
                  setIsEditingContent(true);
                }
              }}
              className={`group/content relative rounded -ml-1 pl-1 ${!readOnly ? 'cursor-text hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
              title={!readOnly ? "Click to edit" : ""}
            >
              {/* Markdown Content (Inline Style) */}
              <span className="prose prose-sm dark:prose-invert max-w-none inline prose-p:inline prose-p:my-0 font-th-sarabun text-lg text-black dark:text-github-text-primary">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ node, ...props }) => <span {...props} />,
                    div: ({ node, ...props }) => <span {...props} />
                  }}
                >
                  {cleanContent}
                </ReactMarkdown>
              </span>

              {/* Citation (Inline) */}
              {citations.length > 0 && (
                <span className="text-gray-500 text-sm ml-2 font-semibold whitespace-nowrap">
                  (
                  {citations.map((ref, idx) => (
                    <React.Fragment key={ref.id}>
                      <span
                        className={`${ref.reference.file_path ? 'hover:text-blue-600 hover:underline cursor-pointer' : 'cursor-default opacity-40'} transition-colors`}
                        title={ref.reference.title + (ref.reference.file_path ? `\nOpen: ${ref.reference.file_path}` : '')}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (ref.reference.file_path) {
                            try {
                              await open(ref.reference.file_path);
                            } catch (err) {
                              console.error("Failed to open citation:", err);
                            }
                          }
                        }}
                      >
                        {ref.thai_letter}. {ref.location_text || ''}
                      </span>
                      {idx < citations.length - 1 ? ', ' : ''}
                    </React.Fragment>
                  ))}
                  )
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`mb-4 ${indentClass} group`}>
      <div className="flex items-start gap-2">
        {/* Question Text */}
        <div className={`flex-1 text-github-text-primary ${isHeader ? 'font-bold text-lg' : 'text-base'}`}>
          {renderContentWithCitations()}
        </div>

        {/* Actions Buttons */}
        {!readOnly && (
          <div className="flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(question, parentPrefix); }}
                className="p-1 text-gray-400 hover:text-blue-500"
                title="Edit Question"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}

            {onAddSubQuestion && (visibleMaxDepth === undefined || level < visibleMaxDepth) && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddSubQuestion(question, currentPrefix); }}
                className="p-1 text-gray-400 hover:text-green-500 ml-1"
                title="Add Sub-Question"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(question); }}
                className="p-1 text-gray-400 hover:text-red-500 ml-1"
                title="Delete Question"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Answer Input Area (if not header and has answer type) */}
      {!isHeader && question.answer_type && question.answer_type !== 'none' && (
        <div className="mt-2 ml-4">
          {(() => {
            // 1. Try to parse metadata for Checklist Style (Section 100) or Answer Key
            let checkboxes = null;
            let answerKey = null;
            try {
              if (question.metadata) {
                const meta = JSON.parse(question.metadata);
                if (meta.answerCheckboxes && Array.isArray(meta.answerCheckboxes)) {
                  checkboxes = meta.answerCheckboxes;
                }
                if (meta.answerKey) {
                  answerKey = meta.answerKey;
                }
              }
            } catch (e) { /* ignore json error */ }

            // 2. Render Checkboxes (Moc Answer Box Style)
            if (checkboxes) {
              return (
                <div className={`mt-2 ml-[3.5ch] transition-all duration-300 ${isExpanded ? 'block' : 'hidden'}`}>
                  <div className="border border-[#333] dark:border-github-border-primary rounded-[4px] bg-[#f9f9f9] dark:bg-github-bg-secondary p-[5px] leading-[1.6] font-th-sarabun text-lg">
                    <div className="space-y-1">
                      {checkboxes.map((cb: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          {/* Only show checkbox if specifically needed? Moc had hidden checkbox inside, mostly text. 
                                    But database has checkbox. Let's keep it minimal. */}
                          {/* <input type="checkbox" checked={cb.checked} readOnly className="mt-1.5 w-3 h-3 accent-green-600" /> */}
                          <span className={`text-black dark:text-github-text-primary ${cb.checked ? 'font-bold' : ''}`}>
                            {cb.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // 3. Fallback to Text Input (Section 200)
            if (question.answer_type === 'text') {
              return (
                <div className="space-y-2">
                  <textarea
                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-github-bg-tertiary text-github-text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                    rows={3}
                    placeholder="ตอบคำถาม..."
                    disabled={readOnly}
                    onChange={(e) => onAnswerChange?.(question.id, e.target.value)}
                  />
                  {/* Display Answer Key if exists (Visible to admins/creators or toggled) */}
                  {/* For now, visible if exists and not readOnly (Edit Mode usually implies creator) */}
                  {/* Or simply show it with a label */}
                  {answerKey && !readOnly && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <span className="text-xs font-bold text-green-700 dark:text-green-400 block mb-1">เฉลย (Answer Key):</span>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            ol: ({ node, ...props }) => <ol className="list-thai pl-6 space-y-1" {...props} />,
                            table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border border-gray-300 dark:border-gray-700" {...props} /></div>,
                            thead: ({ node, ...props }) => <thead className="bg-gray-50 dark:bg-gray-800" {...props} />,
                            tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900" {...props} />,
                            tr: ({ node, ...props }) => <tr {...props} />,
                            th: ({ node, ...props }) => <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100" {...props} />,
                            td: ({ node, ...props }) => <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300" {...props} />
                          }}
                        >
                          {/* Ensure newline before content for safe parsing */}
                          {`\n\n${answerKey}`}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Recursive Children */}
      {question.children && question.children.length > 0 && (
        <div className="mt-2">
          {question.children.map(child => (
            <QuestionRenderer
              key={child.id}
              question={child}
              level={level + 1}
              onAnswerChange={onAnswerChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubQuestion={onAddSubQuestion}
              readOnly={readOnly}
              parentPrefix={currentPrefix}
              visibleMaxDepth={visibleMaxDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionRenderer;
