import React, { useState } from 'react';
import { UINode, CheckboxItem } from './types';
import { documentMeta, radarQuestions } from './radarData';

const RadarWeapon201: React.FC = () => {
  const [showAnswers, setShowAnswers] = useState(false);
  const questions = radarQuestions;
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

  const renderOptionsHeader = () => (
    <div className="flex justify-end gap-1.5">
      <span>คำถาม:</span>
      <span>ก.</span>
      <span>ข.</span>
      <span>ค.</span>
      <span>ง.</span>
    </div>
  );

  const renderQuestion = (item: UINode, index: number, level: number, parentPath: string) => {
    let currentNumber = "";
    let displayNumber = "";
    let fullPath = "";

    if (level === 0) {
      // Level 0: ๒๐๑.๑ (No dot at end)
      currentNumber = `${parentPath}.${toThaiNumber(index + 1)}`;
      displayNumber = currentNumber;
      fullPath = currentNumber;
    } else if (level === 1) {
      // Level 1: ๒๐๑.๑.๑ (No dot at end)
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
        {item.optionsHeader && renderOptionsHeader()}

        <div className="flex items-baseline">
          {/* subquestion level 2 */}
          <span className={`${level === 2 ? 'min-w-[2ch] mr-1' : 'min-w-[8ch]'} ${item.isHeader || level === 0 ? 'font-bold' : 'font-normal'}`}>
            {displayNumber}
          </span>

          <div className="flex-1">
            <div className="flex justify-between items-start">
              <span className={item.isHeader || level === 0 ? "font-bold" : ""}>{item.q}</span>
              {item.checkboxes && renderCheckboxes(item.checkboxes)}
            </div>

            {item.description && (
              <div className="mt-2 ml-1 indent-6 text-gray-700 whitespace-pre-line">
                {item.description}
              </div>
            )}

            {item.descriptionList && (
              <ol className="list-none mt-1 ml-[1ch]">
                {item.descriptionList.map((desc, descIdx) => (
                  <li key={descIdx} className="flex gap-2">
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
            - Level 0 & 1: The list item is at 0px (or close to it). We need ml-[8ch] to push the box 
              to the right so it aligns with the text (skipping the numbering "201.1").
            - Level 2: The list item itself is already indented by 8ch (due to the parent <ol> margin). 
              So we use ml-0 to make the box start at that same 8ch indentation point, aligning it 
              with the Level 0/1 answer boxes.
          */
          <div className={`mt-2 ${level === 2 ? 'ml-0' : 'ml-[8ch]'}`}>
            <div className="p-3 border border-gray-300 rounded bg-gray-50 mb-2">
              <div className="mb-2 font-normal">{fullPath} : {item.q}</div>

              {item.answerCheckboxes && item.answerCheckboxes.map((ans: CheckboxItem, ansIdx: number) => (
                <div key={ansIdx} className="flex items-start gap-2 mb-1">
                  <input
                    type="checkbox"
                    checked={ans.checked}
                    readOnly
                    className="w-[0.7em] h-[0.7em] mt-2.5"
                  />
                  {ans.label && <span className="font-normal">{ans.label}</span>}
                  <span>{ans.text}</span>
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
          <ol className={`list-none ${level === 0 ? '' : (level === 1 ? 'ml-[8ch]' : 'ml-4')}`}>
            {item.children.map((subQ, subIndex) =>
              renderQuestion(subQ, subIndex, level + 1, fullPath)
            )}
          </ol>
        )}
      </li>
    );
  };

  return (
    <div className="flex justify-center bg-gray-100 p-8 min-w-fit">
      <div className="bg-white shadow-lg text-black box-border mx-auto w-[49.6rem] min-h-[70.15rem] p-[4.725rem_2.36rem_4.725rem_5.9rem] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base">
        <div className="mb-4">
          <div className="flex mb-4">
            <div className="font-bold text-lg min-w-[7ch]">{documentMeta.section_number}</div>
            <div className="flex-1">
              <h1 className="font-bold text-lg mb-2">{documentMeta.title}</h1>

              <div className="flex justify-between items-center mb-2">
                <div>เอกสารอ้างอิง :</div>
                <button
                  onClick={toggleAllAnswers}
                  className="px-3 py-1 border border-gray-400 bg-gray-200 hover:bg-gray-300 rounded text-sm transition-colors whitespace-nowrap ml-4"
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
          {questions.map((item, index) => renderQuestion(item, index, 0, "๒๐๑"))}
        </ol>
      </div>
    </div>
  );
};

export default RadarWeapon201;
