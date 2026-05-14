import React, { useState } from "react";
import { UINode } from "../section_200/types";
import { abbreviationData, documentMeta } from "./abbreviationData";

const Abbreviation103: React.FC = () => {
  const [showAnswers, setShowAnswers] = useState(false);
  const questions = abbreviationData;
  const references = documentMeta.references;

  const toggleAllAnswers = () => {
    setShowAnswers(!showAnswers);
  };

  const toThaiNumber = (num: number) => {
    const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
    return num
      .toString()
      .split("")
      .map((d) => thaiDigits[parseInt(d)] || d)
      .join("");
  };

  const thaiAlpha = [
    "ก",
    "ข",
    "ค",
    "ง",
    "จ",
    "ฉ",
    "ช",
    "ซ",
    "ฌ",
    "ญ",
    "ฎ",
    "ฏ",
    "ฐ",
    "ฑ",
    "ฒ",
    "ณ",
    "ด",
    "ต",
    "ถ",
    "ท",
    "ธ",
    "น",
    "บ",
    "ป",
    "ผ",
    "ฝ",
    "พ",
    "ฟ",
    "ภ",
    "ม",
    "ย",
    "ร",
    "ล",
    "ว",
    "ศ",
    "ษ",
    "ส",
    "ห",
    "ฬ",
    "อ",
    "ฮ",
  ];

  const renderQuestion = (
    item: UINode,
    index: number,
    level: number = 1,
    parentPath: string = "",
  ) => {
    let currentPath = "";
    let questionLabel = "";

    if (level === 1) {
      currentPath = `๑๐๓.${toThaiNumber(index + 1)}`;
      questionLabel = currentPath;
    } else {
      // Level 2 (e.g. abbreviations) - usually just Thai alpha
      currentPath = parentPath; // Just inherit for now or build up
      questionLabel = `${thaiAlpha[index]}.`;
    }

    const renderChildren = () => {
      if (!item.children || item.children.length === 0) return null;

      const isGrid = item.childLayout === "grid";
      const containerClass = isGrid
        ? "grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-4 ml-[8ch]"
        : "list-none space-y-2 mt-2"; // Standard list behavior

      return (
        <div className={containerClass}>
          {item.children.map((child, childIdx) => {
            if (isGrid) {
              // Custom rendering for grid items (abbreviations)
              return (
                <div key={childIdx} className="flex flex-col">
                  <div className="flex items-baseline">
                    <span className="min-w-[3ch]">{thaiAlpha[childIdx]}.</span>
                    <span>{child.q}</span>
                  </div>
                  {showAnswers && child.answerCheckboxes && (
                    <div className="mt-1 ml-[3ch] p-2 border border-gray-300 dark:border-github-border-primary rounded bg-gray-50 dark:bg-github-bg-tertiary">
                      <span className="font-normal">
                        {currentPath} {thaiAlpha[childIdx]}. :{" "}
                      </span>
                      {child.answerCheckboxes[0]?.text}
                    </div>
                  )}
                </div>
              );
            } else {
              // Recursive standard rendering
              return renderQuestion(child, childIdx, level + 1, currentPath);
            }
          })}
        </div>
      );
    };

    return (
      <li key={item.id || index} className="flex flex-col mb-4">
        {/* Main Question Display */}
        {level === 1 && (
          <div className="flex items-baseline">
            <span
              className={`${level === 1 ? "min-w-[8ch]" : "min-w-[4ch]"} ${level > 1 ? "ml-[4ch]" : ""}`}
            >
              {questionLabel}
            </span>
            <span className="flex-1">{item.q}</span>
          </div>
        )}

        {/* Answers for Level 1 (if any, though rare for abbreviation parent) */}
        {showAnswers && level === 1 && item.answerCheckboxes && (
          <div className={`mt-2 ${level === 1 ? "ml-[8ch]" : "ml-[8ch]"}`}>
            {/* Similar answer rendering as other sections if needed */}
          </div>
        )}

        {/* Children (The abbreviations) */}
        {renderChildren()}
      </li>
    );
  };

  return (
    <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
      <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-black box-border mx-auto w-[49.6rem] min-h-[70.15rem] p-[4.725rem_2.36rem_4.725rem_5.9rem] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
        <div className="mb-4">
          <div className="flex mb-4">
            <div className="font-bold text-lg min-w-[7ch]">๑๐๓</div>
            <div className="flex-1">
              <h1 className="font-bold text-lg mb-2">{documentMeta.title}</h1>

              <div className="flex justify-between items-center mb-2">
                <div>เอกสารอ้างอิง :</div>
                <button
                  onClick={toggleAllAnswers}
                  className="px-3 py-1 border border-gray-400 dark:border-github-border-primary bg-gray-200 dark:bg-github-bg-muted hover:bg-gray-300 dark:hover:bg-github-bg-hover text-black dark:text-github-text-primary rounded text-sm transition-colors whitespace-nowrap ml-4"
                >
                  {showAnswers ? "ซ่อนคำตอบ" : "แสดงคำตอบ"}
                </button>
              </div>

              <ol className="list-none space-y-1">
                {references.map((ref, index) => (
                  <li key={index} className="flex gap-2">
                    <span>{thaiAlpha[index]}.</span>
                    <span>{ref}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <ol className="list-none space-y-1">
          {questions.map((item, index) => renderQuestion(item, index))}
        </ol>
      </div>
    </div>
  );
};

export default Abbreviation103;
