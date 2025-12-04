import React, { useState } from 'react';

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

  interface SubQuestion {
    q: string;
    a: string;
  }

  interface TableRow {
    distance: string;
    time: string;
  }

  interface Question {
    q: string;
    a?: string;
    subList?: string[];
    subQuestions?: SubQuestion[];
    table?: TableRow[];
  }

  const questions: Question[] = [
    {
      q: "ตำแหน่ง AIR READY เทียบกับตำแหน่งเก็บแท่นยิง (คู่มือติดตั้งระบบของหน่วย)",
      a: "ขึ้นอยู่กับตำแหน่งที่ติดตั้งของแต่ละหน่วย"
    },
    {
      q: "อธิบายอุปกรณ์เครื่องช่วยที่มีความจำเป็นต่อระบบ CIWS ดังต่อไปนี้ (คู่มือติดตั้งระบบของหน่วย)",
      subQuestions: [
        {
          q: "ไฟฟ้ากำลังที่ใช้จากเรือ",
          a: "ขึ้นอยู่กับตำแหน่งที่ติดตั้งของแต่ละหน่วย"
        },
        {
          q: "เข็มทิศเรือ (CQO)",
          a: "ขึ้นอยู่กับตำแหน่งที่ติดตั้งของแต่ละหน่วย"
        },
        {
          q: "ระบบน้ำทะเล/น้ำชิล ที่ใช้ในการระบายความร้อนระบบ",
          a: "ขึ้นอยู่กับตำแหน่งที่ติดตั้งของแต่ละหน่วย"
        }
      ]
    },
    {
      q: "คำอธิบายทิศทางการหมุน และอัตราเร็วในการยิงของปืน 20 mm. (ก., ค.)",
      a: "ทิศทางทวนเข็มนาฬิกา (มองจากด้านท้ายปืน) อัตราเร็วในการยิง ๓,๐๐๐ นัดต่อนาที (อ้างอิง ๑,๓)"
    },
    {
      q: "ความสามารถในการบรรจุ จำนวนลูกปืนทั้งหมดในถังบรรจุและสายลำเลียง (ก., ค.)",
      a: "Block 0 - ๙๘๐ นัด (อ้างอิง ๑); Block 1 - ๑,๕๕๐ นัด (อ้างอิง ๓)"
    },
    {
      q: "อธิบายวัสดุที่ใช้ทําชิ้นส่วนประกอบต่างๆ ของลูกปืน ประกอบด้วย Penetrator, Pusher, Sabot และ Windscreen (ก., ค.)",
      a: "วัสดุที่ใช้ ดังต่อไปนี้",
      subList: [
        "๒๐ มม. Powder Casing",
        "Penetrator ทำจาก Depleted Uranium",
        "Pusher ทำจากอลูมิเนียมและโพลีคาร์บอเนต",
        "Sabot ทำจากไนลอน",
        "Windscreen ทำจากพลาสติก (อ้างอิง ๑,๓)"
      ]
    },
    {
      q: "อธิบายจุดประสงค์ของการทดสอบการทํางานเบื้องต้น (PSOTS) ดังต่อไปนี้ (ข., ค.)",
      subQuestions: [
        {
          q: "PSOT 11",
          a: "ตรวจสอบการควบคุมปืนที่ตู้ Local Control Panel (LCP)"
        },
        {
          q: "PSOT 12",
          a: "ตรวจสอบการควบคุมปืนที่ตู้ Remote Control Panel (RCP)"
        },
        {
          q: "PSOT 13",
          a: "ตรวจสอบการทำงานของวงจรตัดไฟยิง"
        },
        {
          q: "PSOT 14",
          a: "ตรวจสอบชุดขับกำลังด้วยระบบไฮโดรลิกและระบบย่อยของการควบคุมปืน"
        }
      ]
    },
    {
      q: "จุดประสงค์ของการห้ามแพร่คลื่นเข้าตัวเรือ คืออะไร (ก., ค.)",
      a: "ป้องกันการแพร่คลื่นเรดาร์เข้าสู่โครงสร้างตัวเรือ ซึ่งอาจมีผลต่อระบบที่ติดตั้งอยู่"
    },
    {
      q: "ข้อจํากัดในการแพร่เคลื่อนที่เป็นอันตรายต่อบุคคลในขณะอยู่ในโหมด Search/track (ข., ค.)",
      a: "ขณะสายอากาศทำงานในโหมด Search ผลจะอยู่ภายในระยะ ๖ ฟุตรอบสายอากาศและมุมจากแนวนอนถึง ±๕ องศา (สำหรับ Block 1: Horizontal 1 ถึง ๗๒ องศา) ขณะสายอากาศในโหมด Track มุมจะอยู่ที่ ±๒.๖ องศาจากเส้นเล็งกลางของสายอากาศ เวลาเป็นอันตรายจะแปรผันตามระยะจากสายอากาศดังนี้ (อ้างอิง ๒,๓)",
      table: [
        { distance: "20", time: "1.3" },
        { distance: "40", time: "2" },
        { distance: "60", time: "3.1" },
        { distance: "80", time: "5" },
        { distance: "> 90", time: "ไม่เป็นอันตราย" }
      ]
    },
    {
      q: "เวลาสูงสุดในการเดินระบบไฮโดรลิกในระหว่างมีการบรรจุลูกปืนคือเท่าใด (ข., ค.)",
      a: "ห้ามเดินระบบไฮโดรลิกติดต่อกันนานเกิน ๗ นาที (อ้างอิง ๒,๓)"
    },
    {
      q: "วัตถุประสงค์ของบัตรจ่ายงาน MRC-D1 คืออะไร (ข., ค.)",
      a: "ทดสอบระบบย่อยหลักของระบบ CIWS ทั้งหมดประจำวัน (อ้างอิง ๒,๓)"
    },
    {
      q: "ผลจากการระเบิดของนิวเคลียร์ดังต่อไปนี้มีผลกระทบต่อระบบอย่างไร (ง., จ.)",
      subQuestions: [
        {
          q: "Electro Magnetic Pulse (EMP)",
          a: "จะทำความเสียหายอย่างรุนแรงต่อวงจรภายในระบบ CIWS"
        },
        {
          q: "Transient Radiation Effects Electronics (TREE)",
          a: "จะมีผลกระทบต่ออุปกรณ์อิเล็กทรอนิกส์ โดยทำความเสียหายต่อวงจรดิจิทัลต่างๆ เช่น ทรานซิสเตอร์ หน่วยความจำของคอมพิวเตอร์ และอุปกรณ์เชื่อมต่อภายนอก"
        }
      ]
    }
  ];

  return (
    <div className="flex justify-center bg-gray-100 p-8 min-w-fit">
      <div className="bg-white shadow-lg text-black box-border mx-auto w-[49.6rem] min-h-[70.15rem] p-[4.725rem_2.36rem_4.725rem_5.9rem] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base">
        <div className="mb-4">
          <div className="flex mb-4">
            <div className="font-bold text-lg min-w-[7ch]">๑๐๔</div>
            <div className="flex-1">
              <h1 className="font-bold text-lg mb-2">ความรู้พื้นฐานระบบอาวุธป้องกันตนเองระยะประชิด Phalanx Mk.15</h1>

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
          {questions.map((item, index) => {
            const questionNumber = `๑๐๔.${toThaiNumber(index + 1)}`;
            return (
              <li key={index} className="flex flex-col">
                <div className="flex items-baseline">
                  <span className="min-w-[8ch]">{questionNumber}</span>
                  <span>{item.q}</span>
                </div>

                {showAnswers && (
                  <div className="mt-2 ml-[8ch]">
                    {item.a && (
                      <div className="p-3 border border-gray-300 rounded bg-gray-50 mb-2">
                        <div className={item.subList ? "mb-2" : ""}>
                          <span>{questionNumber} : </span>
                          {item.a}
                        </div>
                        {item.subList && (
                          <ol className="list-none space-y-1 ml-4">
                            {item.subList.map((subItem, subIndex) => (
                              <li key={subIndex} className="flex gap-2">
                                <span>{thaiAlpha[subIndex]}.</span>
                                <span>{subItem}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                        {item.table && (
                          <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 px-4 py-2 text-center">ระยะจากสายอากาศ (ฟุต)</th>
                                  <th className="border border-gray-300 px-4 py-2 text-center">เวลาที่ไม่เป็นอันตราย (นาที)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.table.map((row, rowIndex) => (
                                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-gray-300 px-4 py-2 text-center">{row.distance}</td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">{row.time}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {item.subQuestions && (
                      <ol className="list-none space-y-2">
                        {item.subQuestions.map((subQ, subIndex) => (
                          <li key={subIndex}>
                            <div className="flex items-baseline mb-1">
                              <span className="min-w-[3ch]">{thaiAlpha[subIndex]}.</span>
                              <span>{subQ.q}</span>
                            </div>
                            <div className="p-3 border border-gray-300 rounded bg-gray-50">
                              <span>{questionNumber} {thaiAlpha[subIndex]}. : </span>
                              {subQ.a}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default CiwsBasic104;
