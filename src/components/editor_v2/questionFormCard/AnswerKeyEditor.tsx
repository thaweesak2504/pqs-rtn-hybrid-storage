import React from "react";
import TiptapEditor from "../TiptapEditor";

// ============ Component ============

interface AnswerKeyEditorProps {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}

const AnswerKeyEditor: React.FC<AnswerKeyEditorProps> = ({
  value,
  onChange,
  hasError = false,
}) => {
  return (
    <div
      className={`answer-key-editor ${
        hasError ? "ring-2 ring-red-500/50" : ""
      }`}
    >
      <TiptapEditor
        initialContent={value}
        onChange={onChange}
        placeholder="เฉลยคำตอบ (Answer Key)..."
        variant="emerald"
        minHeight="90px"
        autoFocus={false}
      />
    </div>
  );
};

export default AnswerKeyEditor;
