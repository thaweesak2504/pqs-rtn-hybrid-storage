import React, { useState } from 'react';
import { UINode, CheckboxItem } from './types';
import { documentMeta, lcpQuestions } from './lcpData';

const Lcp202: React.FC = () => {
  const [showAnswers, setShowAnswers] = useState(false);
  const questions = lcpQuestions;
  const references = documentMeta.references;

  const toggleAllAnswers = () => {
    setShowAnswers(!showAnswers);
  };

  const toThaiNumber = (num: number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => thaiDigits[parseInt(d)] || d).join('');
  };

  const thaiAlpha = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'];

  const renderCheckboxes = (checkboxes: boolean[]) => (
    <div className="flex gap-2 ml-4">
      {checkboxes.map((isChecked, idx) => (
        <label key={idx} className="flex items-center mt-3">
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="w-[0.7em] h-[0.7em] text-blue-600 rounded focus:ring-blue-500"
          />
        </label>
      ))}
    </div>
  );

  const renderOptionsHeader = (count: number = 8) => (
    <div className="flex justify-end gap-1.5">
      {thaiAlpha.slice(0, count).map((char, index) => (
        <span key={index}>{char}.</span>
      ))}
    </div>
  );

  const renderQuestion = (item: UINode, index: number, level: number, parentPath: string) => {
    let currentNumber = "";
    let displayNumber = "";
    let fullPath = "";

    if (level === 0) {
      // Level 0: ๒๐๒.๑ (No dot at end)
      currentNumber = `${parentPath}.${toThaiNumber(index + 1)}`;
      displayNumber = currentNumber;
      fullPath = currentNumber;
    } else if (level === 1) {
      // Level 1: ๒๐๒.๑.๑ (No dot at end)
      currentNumber = `${parentPath}.${toThaiNumber(index + 1)}`;
      displayNumber = currentNumber;
      fullPath = currentNumber;
    } else if (level === 2) {
      // Level 2: ก. (With dot)
      currentNumber = `${thaiAlpha[index]}.`;
      displayNumber = currentNumber;
      fullPath = `${parentPath} ${currentNumber}`; // Space separator for answer box
    } else {
      // Fallback for deeper levels if any
      currentNumber = `${toThaiNumber(index + 1)}.`;
      displayNumber = currentNumber;
      fullPath = `${parentPath} ${currentNumber}`;
    }

    return (
      <li key={item.id} className="flex flex-col">
        {item.optionsHeader && renderOptionsHeader(item.optionsCount)}

        <div className="flex items-baseline">
          {/* subquestion level 2 */}
          <span className={`${level === 2 ? 'min-w-[2ch] mr-1' : 'min-w-[9ch]'} ${item.isHeader || level === 0 ? 'font-bold' : 'font-normal'}`}>
            {displayNumber}
          </span>

          <div className="flex-1">
            <div className="flex justify-between items-start">
              <span className={item.isHeader || level === 0 ? "font-bold" : ""}>{item.q}</span>
              {item.checkboxes && renderCheckboxes(item.checkboxes)}
            </div>

            {item.description && (
              // เอา ml-1 ออก
              <div className="mt-2 indent-6 whitespace-pre-line">
                {item.description}
              </div>
            )}

            {item.selectedSubQuestions && (
              // เอา ml-[1ch] ออก
              <ol className="list-none mt-1">
                {item.selectedSubQuestions.map((desc, descIdx) => (
                  // ใช้ gap-1
                  <li key={descIdx} className="flex gap-1">
                    <span className="min-w-[2ch]">{thaiAlpha[descIdx]}.</span>
                    <span>{desc}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {showAnswers && (item.answerCheckboxes || item.subList) && (
          /* 
            Answer Box Alignment Logic:
            - Level 0 & 1: The list item is at 0px (or close to it). We need ml-[9ch] to push the box 
              to the right so it aligns with the text (skipping the numbering "202.1").
            - Level 2: The list item itself is already indented by 9ch (due to the parent <ol> margin). 
              So we use ml-0 to make the box start at that same 9ch indentation point, aligning it 
              with the Level 0/1 answer boxes.
          */
          <div className={`mt-2 ${level === 2 ? 'ml-0' : 'ml-[9ch]'}`}>
            <div className="p-3 border border-gray-300 dark:border-github-border-primary rounded bg-gray-50 dark:bg-github-bg-tertiary mb-2">
              <div className="mb-2 font-normal">{fullPath} : {item.q}</div>

              {item.answerCheckboxes && item.answerCheckboxes.map((ans: CheckboxItem, ansIdx: number) => (
                <div key={ansIdx} className="flex flex-col mb-1">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={ans.checked}
                      readOnly
                      className="w-[0.7em] h-[0.7em] mt-2.5 accent-green-600"
                    />
                    {ans.label && <span className="font-normal">{ans.label}</span>}
                    <span>{ans.text}</span>
                  </div>
                  {ans.table && (
                    <div className="ml-8 mt-2 overflow-x-auto">
                      <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-600">
                        <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-100 dark:bg-gray-700">
                          <tr>
                            {ans.table.headers.map((header, hIdx) => (
                              <th key={hIdx} className="px-6 py-3 border-b dark:border-gray-600 text-center font-bold">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ans.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-6 py-3 border-b dark:border-gray-600 text-center">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {item.subList && (
                <ul className="list-none ml-4 mt-2 space-y-1">
                  {item.subList.map((sub, subIdx) => (
                    <li key={subIdx} className="flex gap-2 items-baseline">
                      <span className="min-w-[2ch] text-right">{toThaiNumber(subIdx + 1)}.</span>
                      <span>{sub}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {/* ปรับการตั้งค่าให้เหมาะสมกับ level 2 ก. ข. ค. ง. ได้เอา  space-y-2 mt-2 ออกแล้ว */}
        {item.children && item.children.length > 0 && (
          <ol className={`list-none ${level === 0 ? '' : (level === 1 ? 'ml-[9ch]' : 'ml-4')}`}>
            {item.children.map((subQ, subIndex) =>
              renderQuestion(subQ, subIndex, level + 1, fullPath)
            )}
          </ol>
        )}
      </li>
    );
  };

  return (
    <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
      <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-black box-border mx-auto w-[49.6rem] min-h-[70.15rem] p-[4.725rem_2.36rem_4.725rem_5.9rem] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
        <div className="mb-4">
          <div className="flex mb-4">
            {/* ของหัวข้อใหญ่ ใช้ min-w-[8ch] ถึงจะตรง แทนที่จะเป็น min-w-[9ch] */}
            <div className="font-bold text-lg min-w-[8ch]">{documentMeta.section_number}</div>
            <div className="flex-1">
              <h1 className="font-bold text-lg mb-2">{documentMeta.title}</h1>

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
          {questions.map((item, index) => renderQuestion(item, index, 0, "๒๐๒"))}
        </ol>
      </div>
    </div>
  );
};

export default Lcp202;
