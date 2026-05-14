import React, { useState } from 'react';
import { ciwsBasicData } from './ciwsBasicData';
import { UINode, CheckboxItem } from '../section_200/types';

const CiwsBasic104: React.FC = () => {
  const [showAnswers, setShowAnswers] = useState(false);

  const toggleAllAnswers = () => {
    setShowAnswers(!showAnswers);
  };

  const toThaiNumber = (num: number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => thaiDigits[parseInt(d)] || d).join('');
  };

  const thaiAlpha = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'];

  const references = [
    "NAVSEA OP4154 Close In Weapon system Mk.15 Mode 1-6 (Phalanx) Vol.1 Pt.1",
    "NAVSEA OP4154 Close In Weapon system Mk.15 Mode 1-6 (Phalanx) Vol.2",
    "SW221-JO-MMO-010 thru 110, Close In Weapon System Mk.15 Mods 11-14",
    "NAVY Nuclear Notes-Electromagnetic Pulse, Vol.4",
    "NAVY Nuclear Notes-Transient Radiation Effects on Electronics, Vol.5"
  ];

  const renderQuestion = (item: UINode, index: number, level: number = 1, parentPath: string = "") => {
    let currentPath = "";
    if (level === 1) {
      currentPath = `๑๐๔.${toThaiNumber(index + 1)}`;
    } else {
      currentPath = parentPath ? `${parentPath}` : `${index + 1}`;
    }

    // Determine the display label for the question number
    let questionLabel = "";
    if (level === 1) {
      questionLabel = currentPath;
    } else if (level === 2) {
      questionLabel = `${thaiAlpha[index]}.`;
    }

    const fullPathForAnswer = level === 1 ? currentPath : `${parentPath} ${questionLabel}`;

    return (
      <li key={item.id || index} className="flex flex-col mb-4">
        <div className="flex items-baseline">
          <span className={`${level === 1 ? "min-w-[8ch]" : "min-w-[4ch]"} ${level > 1 ? "ml-[4ch]" : ""}`}>{questionLabel}</span>
          <span className="flex-1">{item.q}</span>
        </div>

        {showAnswers && (
          <div className={`mt-2 ${level === 1 ? 'ml-[8ch]' : 'ml-[8ch]'}`}>
            {/* Render Main Answer Checkboxes */}
            {item.answerCheckboxes && item.answerCheckboxes.length > 0 && (
              <div className="p-3 border border-gray-300 dark:border-github-border-primary rounded bg-gray-50 dark:bg-github-bg-tertiary mb-2">
                <div className="font-normal mb-2">{fullPathForAnswer} : {item.q}</div>

                {item.answerCheckboxes.map((ans: CheckboxItem, ansIdx: number) => (
                  <div key={ansIdx} className="mb-2">
                    <div className="flex items-start gap-2 mb-1">
                      <input
                        type="checkbox"
                        checked={ans.checked}
                        readOnly
                        className="w-[0.7em] h-[0.7em] mt-2.5 accent-green-600 shrink-0"
                      />
                      {ans.label && <span className="font-normal">{ans.label}</span>}
                      <span>{ans.text}</span>
                    </div>

                    {/* Render nested subList within the answer if any */}
                    {ans.subList && (
                      <ul className="list-none ml-4 mt-2 space-y-1">
                        {ans.subList.map((sub, subIdx) => (
                          <li key={subIdx} className="flex gap-2 items-baseline">
                            <span className="min-w-[2ch] text-right">{sub.match(/^[0-9]+/) ? "" : `${toThaiNumber(subIdx + 1)}.`}</span>
                            <span>{sub}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Render Table if present */}
                    {ans.table && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                              {ans.table.headers.map((header, hIdx) => (
                                <th key={hIdx} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-black dark:text-white font-normal">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ans.table.rows.map((row, rIdx) => (
                              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-black dark:text-gray-200">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Render Children (Sub-questions) */}
            {item.children && item.children.length > 0 && (
              <ol className="list-none space-y-2 mt-2">
                {item.children.map((child, childIdx) =>
                  renderQuestion(child, childIdx, level + 1, currentPath)
                )}
              </ol>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
      <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-black box-border mx-auto w-[49.6rem] min-h-[70.15rem] p-[4.725rem_2.36rem_4.725rem_5.9rem] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
        <div className="mb-4">
          <div className="flex mb-4">
            <div className="font-bold text-lg min-w-[7ch]">๑๐๔</div>
            <div className="flex-1">
              <h1 className="font-bold text-lg mb-2">ความรู้พื้นฐานระบบอาวุธป้องกันตนเองระยะประชิด Phalanx Mk.15</h1>

              <div className="flex justify-between items-center mb-2">
                <div>เอกสารอ้างอิง :</div>
                <button
                  onClick={toggleAllAnswers}
                  className="px-3 py-1 border border-gray-400 dark:border-github-border-primary bg-gray-200 dark:bg-github-bg-muted hover:bg-gray-300 dark:hover:bg-github-bg-hover text-black dark:text-github-text-primary rounded text-sm transition-colors whitespace-nowrap ml-4"
                >
                  {showAnswers ? 'ซ่อนคำตอบ' : 'แสดงคำตอบ'}
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
          {ciwsBasicData.map((item, index) => renderQuestion(item, index))}
        </ol>
      </div>
    </div>
  );
};

export default CiwsBasic104;
