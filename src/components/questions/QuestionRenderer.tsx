import React from 'react';
import { QuestionDetail } from '../../types/content';
import { Plus } from 'lucide-react';

interface QuestionRendererProps {
  question: QuestionDetail;
  level: number;
  onAnswerChange?: (questionId: string, value: string) => void;
  onEdit?: (question: QuestionDetail) => void;
  onDelete?: (question: QuestionDetail) => void;
  onAddSubQuestion?: (question: QuestionDetail, parentPrefix: string) => void;
  readOnly?: boolean;
  parentPrefix?: string; // e.g. "101" or "101.1"
  visibleMaxDepth?: number; // Maximum nesting level to show "Add Sub-Question" button
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
  visibleMaxDepth
}) => {
  const toThaiNumber = (num: string | number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => {
      const parsed = parseInt(d);
      return !isNaN(parsed) && parsed >= 0 && parsed <= 9 ? thaiDigits[parsed] : d;
    }).join('');
  };

  const isHeader = question.is_header;

  // Calculate current prefix
  // If parentPrefix is empty, we assume it's implicit or not needed?
  // Actually, for L1 (Level 0), parentPrefix should be valid (e.g. "101")
  // Format: parentPrefix.sequence (e.g. 101.1)
  const currentPrefix = parentPrefix
    ? `${parentPrefix}.${toThaiNumber(question.sequence)}`
    : `${toThaiNumber(question.sequence)}`; // Fallback

  // Calculate indentation based on level (tailwind classes)
  // Level 0: Main (1. System Description)
  // Level 1: Sub (1.1)
  // Level 2: Sub-sub (1.1.1)
  const indentClass = level > 0 ? `ml-${Math.min(level * 4, 12)}` : '';

  // Render content with citations AND dynamic prefix
  const renderContentWithCitations = () => {
    let content = question.content;

    // STRIP existing hardcoded prefix (e.g. "101.1 Content" -> "Content")
    // Regex: Start with digits/dots/space
    // Be careful not to strip "100. " if it's the only text?
    // Matches: "101.1 ", "1. ", "101.1.1 "
    const prefixRegex = /^[\d\.]+\s+/;
    const cleanContent = content.replace(prefixRegex, '');

    const citations = question.references || [];

    // Display: "101.1 Clean Content"
    // Use non-breaking space or span for prefix?
    const displayText = (
      <span>
        <span className="font-bold mr-2">{!isHeader ? currentPrefix : ''}</span>
        {cleanContent}
      </span>
    );

    if (citations.length === 0) return displayText;

    // Formatting citations: (ก. 12, ข. 34)
    const citationText = citations
      .map(ref => `${ref.thai_letter}. ${ref.location_text || ''}`)
      .join(', ');

    return (
      <span>
        {displayText}
        <span className="text-gray-500 text-sm ml-2 font-semibold">
          ({citationText})
        </span>
      </span>
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
                onClick={(e) => { e.stopPropagation(); onEdit(question); }}
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

            // 2. Render Checkboxes if present
            if (checkboxes) {
              return (
                <div className="space-y-2">
                  {checkboxes.map((cb: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-github-bg-tertiary border border-gray-200 dark:border-gray-700 rounded-md">
                      <input type="checkbox" checked={cb.checked} readOnly className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                      <span className="text-github-text-primary text-sm">{cb.text}</span>
                    </div>
                  ))}
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
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{answerKey}</p>
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
