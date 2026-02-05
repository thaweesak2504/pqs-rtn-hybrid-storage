
import React from 'react';
import { QuestionDetail } from '../../types/content';

interface QuestionRendererProps {
  question: QuestionDetail;
  level: number;
  onAnswerChange?: (questionId: string, value: string) => void;
  readOnly?: boolean;
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  level,
  onAnswerChange,
  readOnly = false
}) => {
  const isHeader = question.is_header;

  // Calculate indentation based on level (tailwind classes)
  // Level 0: Main (1. System Description)
  // Level 1: Sub (1.1)
  // Level 2: Sub-sub (1.1.1)
  const indentClass = level > 0 ? `ml-${Math.min(level * 4, 12)}` : '';

  // Render content with citations
  // Example: "Explain CB (ข. 35, ค. 102)"
  const renderContentWithCitations = () => {
    let content = question.content;
    const citations = question.references || [];

    if (citations.length === 0) return <span>{content}</span>;

    // Formatting citations: (ก. 12, ข. 34)
    const citationText = citations
      .map(ref => `${ref.thai_letter}. ${ref.location_text || ''}`)
      .join(', ');

    return (
      <span>
        {content}
        <span className="text-gray-500 text-sm ml-2 font-semibold">
          ({citationText})
        </span>
      </span>
    );
  };

  return (
    <div className={`mb-4 ${indentClass}`}>
      <div className="flex items-start gap-2">
        {/* Question Text */}
        <div className={`flex-1 text-github-text-primary ${isHeader ? 'font-bold text-lg' : 'text-base'}`}>
          {renderContentWithCitations()}
        </div>
      </div>

      {/* Answer Input Area (if not header and has answer type) */}
      {!isHeader && question.answer_type && question.answer_type !== 'none' && (
        <div className="mt-2 ml-4">
          {question.answer_type === 'text' && (
            <textarea
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-github-bg-tertiary text-github-text-primary focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              rows={3}
              placeholder="ตอบคำถาม..."
              disabled={readOnly}
              onChange={(e) => onAnswerChange?.(question.id, e.target.value)}
            />
          )}
          {/* Add support for other types like 'choice' here later */}
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
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionRenderer;
