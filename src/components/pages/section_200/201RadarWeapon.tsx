import React, { useState } from 'react';

const RadarWeapon201: React.FC = () => {
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
    "NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.1 Pt.1,2",
    "NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.2",
    "SW221-JO-MMO-010 thru 110, CIWS Mk.15 Mods 11-14"
  ];

  interface CheckboxItem {
    checked: boolean;
    label?: string;
    text?: string;
  }

  interface Question {
    q: string;
    id?: string;
    checkboxes?: boolean[];
    a?: string;
    answerCheckboxes?: CheckboxItem[];
    subQuestions?: Question[];
    subList?: string[];
    isHeader?: boolean; // For "หน้าที่", "ส่วนประกอบ..." headers
    description?: string; // For additional text below header
    descriptionList?: string[]; // For sub-questions list in description
    optionsHeader?: boolean; // To show ก. ข. ค. ง. header
  }

  const questions: Question[] = [
    {
      q: "หน้าที่",
      isHeader: true,
      subQuestions: [
        {
          q: "ระบบนี้ทำหน้าที่อะไร",
          answerCheckboxes: [
            { checked: true, text: "ชี้เป้าเพื่อที่จะทำการยิงและทำการยิง" }
          ]
        }
      ]
    },
    {
      q: "ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ",
      isHeader: true,
      description: "อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคำถามที่กำหนด",
      descriptionList: [
        "มีหน้าที่อะไร",
        "ตำแหน่งที่ติดตั้งอยู่ที่ไหน",
        "อุปกรณ์นี้ใช้ป้องกันในลักษณะใด",
        "ในแต่ละตำแหน่งทำหน้าที่อะไร"
      ],
      subQuestions: [
        {
          q: "ส่วนประกอบขับเคลื่อนทางหัน \"Train Drive Platform Assembly\"",
          checkboxes: [true, true, false, false],
          optionsHeader: true,
          answerCheckboxes: [
            { checked: true, label: "ก.", text: "ควบคุมตำแหน่งปืนทางหัน" },
            { checked: true, label: "ข.", text: "อยู่บนตู้ Barbette Assembly" }
          ],
          subQuestions: [
            {
              q: "สวิตช์โยกตำแหน่งเก็บทางหัน \"Mount Train Stow\"",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "ควบคุมการเคลื่อนตัวเข้าออกของ Stow Pin ทางหัน (Gearlock) และมีไฟแสดง เมื่อ Switch ตัวนี้ทำงานในตำแหน่ง Engage และ Retract." }
              ]
            },
            {
              q: "สวิตช์โยกแท่นฐานปลอดภัย \"Mount Safety\"",
              checkboxes: [true, false, false, true],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "ห้ามหันและกระดกปืน" },
                { checked: true, label: "ง.", text: "ในแต่ละตำแหน่งทำหน้าที่ดังนี้" }
              ],
              subList: [
                "OPERATE เป็นตำแหน่งใช้งานปกติของระบบ",
                "SAFE ห้ามหัน/กระดกและตัดวงจรไฟยิง",
                "RELOAD เหมือนกับตำแหน่ง SAFE และทำให้ระบบ Hydraulic ทำงานขณะทำการ Loading และ Downloading ลูกปืน"
              ]
            },
            {
              q: "ขับเคลื่อนทางหันแบบแมนนวล \"Mount Train Manual Drive\"",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "เป็นที่หันปืนโดยใช้พวงหมุนขนาด 0.5 นิ้ว และปรับแต่ง Stow Pin ให้อยู่ในตำแหน่ง Engage พอดี" }
              ]
            },
            {
              q: "ขับเคลื่อนสลักเก็บตำแหน่งทางหัน \"Train Stow Pin Manual Drive\"",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "เพื่อที่จะหมุน TRAIN Stow Pin ให้อยู่ในตำแหน่ง Retract หรือ Engage ด้วยมือ" }
              ]
            }
          ]
        },
        {
          q: "ส่วนประกอบขับเคลื่อนทางกระดก \"Elevation Drive Assembly\"",
          checkboxes: [true, true, false, false],
          optionsHeader: true,
          answerCheckboxes: [
            { checked: true, label: "ก.", text: "ควบคุมตำแหน่งปืนทางกระดก" },
            { checked: true, label: "ข.", text: "อยู่บน Train Platform Assembly" }
          ],
          subQuestions: [
            {
              q: "ขับเคลื่อนสลักเก็บตำแหน่งทางกระดก \"Elevation Stow Pin Manual Drive\"",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "เพื่อที่จะหมุนให้ Elevation Stow Pin อยู่ในตำแหน่ง Stow Engage หรือ Retract ด้วยมือ" }
              ]
            },
            {
              q: "สวิตช์โยกตำแหน่งเก็บทางกระดก \"Elevation Stow Pin\"",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "ควบคุม Elevation Stow Pin ให้อยู่ในตำแหน่ง Stow หรือ Retract" }
              ]
            },
            {
              q: "คันมือหมุนทางกระดก \"Elevation Manual Hand Crank\"",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "เป็นเครื่องมือใช้สำหรับปลดเบรคและหมุนกระดกปืน ขึ้น-ลง" }
              ]
            }
          ]
        },
        {
          q: "ปืน 20 mm.",
          checkboxes: [true, true, false, false],
          optionsHeader: true,
          answerCheckboxes: [
            { checked: true, label: "ก.", text: "ทำหน้าที่ยิงทำลายเป้า" },
            { checked: true, label: "ข.", text: "ติดตั้งอยู่บน Elevation Yoke Structure" }
          ],
          subQuestions: [
            {
              q: "ไฮดรอลิกส์ขับเคลื่อนปืน \"Gun Hydraulic Drive\"",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "ขับเคลื่อนปืนและระบบการลำเลียงด้วยระบบไฮโดรลิกในขณะ Uploading/Downloading, Firing" }
              ]
            },
            {
              q: "ขอเกียวลำกล้องเกลี้ยง \"Clearing Sector Hold Back Tool\"",
              checkboxes: [true, false, true, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "เมื่อติดตั้งจะรักษาลูกเลื่อน (Breech Bolt) ให้อยู่ในทางเดิน Clearing Cam Path" },
                { checked: true, label: "ค.", text: "ป้องกันไม่ให้ลูกปืนเข้าไปในรังเพลิง" }
              ]
            }
          ]
        },
        {
          q: "ระบบลำเลียงและบรรจุ \"Ammunition Handling/Conveyor System\"",
          checkboxes: [true, true, false, false],
          optionsHeader: true,
          answerCheckboxes: [
            { checked: true, label: "ก.", text: "รับ - ส่ง ลูกปืนจาก DRUM ถึงตัวปืน และจากตัวปืนถึง DRUM" },
            { checked: true, label: "ข.", text: "ใต้ตัวปืน ๒๐ มม" }
          ],
          subQuestions: [
            {
              q: "Feed Chute",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "มีหน้าที่ใช้เป็นทางลำเลียงลูกปืน" }
              ]
            },
            {
              q: "Element Chuting",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "มีหน้าที่ส่ง Element ระหว่าง DRUM และปืน" }
              ]
            },
            {
              q: "Entrance Unit",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "ส่งลูกปืนจาก Chuting เข้าสู่ Drum" }
              ]
            },
            {
              q: "Exit Unit",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "มีหน้าที่ส่งลูกปืนจาก Drum ไปยัง Feed Chute" }
              ]
            },
            {
              q: "Exit Unit Drive Socket",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "เป็นที่ใส่พวงหมุน (Handcrank) เพื่อทำการ Cycle ลูกปืนด้วยมือ" }
              ]
            },
            {
              q: "Loading Gate",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "เป็นส่วนประกอบของ Exit Unit เมื่อเปิดโดยการยกขึ้นลูกปืนจะสามารถผ่านได้ ขณะ Upload และ Download" }
              ]
            },
            {
              q: "Ammunition Drum",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "มีหน้าที่เป็นที่เก็บขณะ Loading และส่งผ่านลูกปืน" }
              ]
            },
            {
              q: "Drum Timing Pin",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "มีหน้าที่ใช้งานสำหรับตั้ง Timing ของ Drum" }
              ]
            },
            {
              q: "Hydraulic/Pneumatic Control Actuator",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "เป็นคันโยกเพื่อควบคุมการหมุนของตัวปืนและส่วนลำเลียงลูกปืนโดยระบบ ไฮโดรลิก" }
              ]
            }
          ]
        },
        {
          q: "ส่วนประกอบตัวบรรจุลูกปืน \"Ammunition Loader Assembly\"",
          checkboxes: [true, true, false, false],
          optionsHeader: true,
          answerCheckboxes: [
            { checked: true, label: "ก.", text: "มีหน้าที่ใช้งานสำหรับการ Upload และ Download ลูกปืนเท่านั้น" },
            { checked: true, label: "ข.", text: "ติดตั้งบน Exit Unit" }
          ],
          subQuestions: [
            {
              q: "Loader Timing Pin",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "มีหน้าที่ตั้ง Timing ของ Loader" }
              ]
            },
            {
              q: "Link Chute",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "ใช้ขณะ Download เพื่อนำลูกปืนที่ยิงแล้วออกจากระบบ" }
              ]
            },
            {
              q: "Loader Gears (Rs and LS)",
              checkboxes: [true, false, false, false],
              answerCheckboxes: [
                { checked: true, label: "ก.", text: "หน้าที่ทำให้ Gear Timing ในขณะ Upload และ Download เป็นไปอย่างถูกต้อง" }
              ]
            }
          ]
        }
      ]
    },
    {
      q: "หลักการทำงาน",
      isHeader: true,
      subQuestions: [
        {
          q: "ส่วนประกอบต่างๆ ทำงานร่วมกันในระบบอย่างไร",
          answerCheckboxes: [
            { checked: true, text: "มีเพื่อชี้ตำแหน่งเป้าหมายและบรรจุลูกปืน" }
          ]
        },
        {
          q: "เมื่อระบบขัดข้องหรือทำงานผิดปกติ มีอะไรเป็นสิ่งบอกเหตุ",
          answerCheckboxes: [
            { checked: true, text: "ไม่สามารถทำการยิงได้" }
          ]
        }
      ]
    },
    {
      q: "ค่าทำงานปกติ ค่าสูงสุด ต่ำสุด ของการทำงาน (ไม่ต้องอธิบาย)",
      isHeader: true
    },
    {
      q: "การเชื่อมต่อระบบ",
      isHeader: true,
      subQuestions: [
        {
          q: "ถ้าขาดสิ่งดังต่อไปนี้จะมีผลกระทบต่อระบบอย่างไร",
          subQuestions: [
            {
              q: "ขาดการควบคุมจาก LCP และ/หรือ RCP",
              answerCheckboxes: [
                { checked: true, text: "จะไม่ตอบสนองต่อสัญญาณคำสั่งต่าง ๆ" }
              ]
            },
            {
              q: "ไม่มีไฟฟ้าเรือจ่ายให้กับระบบ",
              answerCheckboxes: [
                { checked: true, text: "ไม่สามารถทำการยิงได้" }
              ]
            }
          ]
        }
      ]
    },
    {
      q: "ข้อระมัดระวังอันตราย",
      isHeader: true,
      subQuestions: [
        {
          q: "มีข้อระมัดระวังอันตรายอะไรบ้าง ในการปฏิ บัติงาน ดังต่อไปนี้",
          subQuestions: [
            {
              q: "ขณะกระดกปืน โดยวิธีใช้คันมือหมุน",
              answerCheckboxes: [
                { checked: true, text: "ต้องแน่ใจว่าได้จับพวงหมุนให้แน่น ขณะใส่พวงหมุนเพื่อหมุนปืน" }
              ]
            },
            {
              q: "ขณะบรรจุและถอนบรรจุลูกปืน",
              answerCheckboxes: [
                { checked: true, text: "มีข้อระมัดระวังอันตราย ดังนี้" }
              ],
              subList: [
                "ต้องแน่ใจว่าโหมดการทำงานของเครื่องอยู่ที่ Standby และงดแพร่คลื่นเรดาร์ทุกชนิด",
                "สำหรับลูกปืนที่ใช้งานไม่ได้ควรทิ้งทะเล",
                "ประกาศแจ้งให้ทราบทั่วกันถึงอันตรายที่เกิดจากการแพร่คลื่นต่อระบบอาวุธ (Hero) ก่อนการขนย้ายลูกปืน",
                "บริเวณรอบๆ แท่นปืน ห้ามเข้านอกบริเวณก่อน 30 นาที หลังจากยิงเสร็จ",
                "ต้องสวมถุงมืออย่างหนาขณะทำงาน",
                "หลีกเลี่ยงการสัมผัส Primer และ Primer สัมผัสกับวัตถุที่เป็นโลหะ",
                "พื้นที่ปฏิบัติงานต้องเรียบร้อย",
                "ต้องระมัดระวังมือและเสื้อผ้าที่จะโดนเกี่ยวขณะทำงาน",
                "ต้องไม่เดินระบบไฮโดรลิกนานติดต่อเกิน ๗ นาที",
                "ต้องติดตั้ง Sector Holdback Tool ให้ถูกต้อง",
                "ต้องถอด Mount Safety Connector ที่ Lcp ออก",
                "ตรวจสอบ Guide Bolt ก่อนทำการ Upload และ Download"
              ]
            }
          ]
        }
      ]
    }
  ];

  const renderCheckboxes = (checkboxes: boolean[]) => (
    <div className="flex gap-3 ml-4">
      {checkboxes.map((isChecked, idx) => (
        <label key={idx} className="flex items-center">
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
    <div className="flex justify-end gap-2.5 mb-2">
      <span>ก.</span>
      <span>ข.</span>
      <span>ค.</span>
      <span>ง.</span>
    </div>
  );

  const renderQuestion = (item: Question, index: number, level: number, parentPath: string) => {
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
      <li key={index} className="flex flex-col mb-4">
        {item.optionsHeader && renderOptionsHeader()}

        <div className="flex items-baseline">
          <span className={`${level === 2 ? 'min-w-[2.5ch] mr-1' : 'min-w-[8ch]'} ${item.isHeader || level === 0 ? 'font-bold' : 'font-normal'}`}>
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

        {showAnswers && (item.answerCheckboxes || item.a || item.subList) && (
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

              {item.answerCheckboxes && item.answerCheckboxes.map((ans, ansIdx) => (
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

              {item.a && <div>{item.a}</div>}

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

        {item.subQuestions && (
          <ol className={`list-none space-y-2 mt-2 ${level === 0 ? '' : (level === 1 ? 'ml-[8ch]' : 'ml-4')}`}>
            {item.subQuestions.map((subQ, subIndex) =>
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
            <div className="font-bold text-lg min-w-[7ch]">๒๐๑</div>
            <div className="flex-1">
              <h1 className="font-bold text-lg mb-2">ระบบเรดาร์ควบคุมการยิง Radar Weapon Assembly System</h1>

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
