import React from 'react';
import { BookOpen } from 'lucide-react';

interface NestedItem {
  title: string;
  content?: string;
}

interface SubItem {
  content: string;
  nestedItems?: NestedItem[];
}

interface Section {
  title: string;
  content: string;
  subItems?: SubItem[];
}

interface Section300ViewProps {
  isPreviewMode?: boolean;
}

const Section300View: React.FC<Section300ViewProps> = ({ isPreviewMode = false }) => {
  const toThaiNumber = (num: number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => thaiDigits[parseInt(d)] || d).join('');
  };

  const toThaiAlphabet = (index: number) => {
    const thaiAlphabets = [
      'ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ',
      'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท',
      'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม',
      'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'
    ];
    return thaiAlphabets[index] || '';
  };

  const sections: Section[] = [
    {
      title: "กล่าวนำ",
      content: `ในหัวข้อการปฏิบัติหน้าที่ (หัวข้อ ๓๐๐) จะเป็นการแสดงให้ผู้รับการทดสอบเห็นว่า ผู้รับการทดสอบมีความรู้พื้นฐาน และรู้การทำงานของระบบ ในหัวข้อนี้จะยอมให้ผู้รับการทดสอบฝึกฝนการปฏิบัติงาน ทั้งในสถานการณ์ปกติ กรณีเหตุขัดข้อง และกรณีเหตุการณ์ฉุกเฉิน ก่อนที่ผู้รับการทดสอบจะถูกกำหนดให้ทดสอบปฏิบัติประจำตำแหน่ง ผู้รับการทดสอบต้องสอบผ่านหัวข้อความรู้พื้นฐาน และหัวข้อระบบ ที่ตรงกันกับการปฏิบัติหน้าที่ในตำแหน่งนั้นๆ และมีคุณสมบัติก่อนการทดสอบครบถ้วนตามที่กำหนด เมื่อผู้รับการทดสอบผ่านการทดสอบการปฏิบัติประจำตำแหน่ง อาจต้องสอบความรู้ข้อเขียนหรือสอบปากเปล่าด้วยก็ได้ ทั้งนี้ขึ้นอยู่กับการพิจารณาของ หน.หน่วย จะเห็นสมควร`
    },
    {
      title: "รูปแบบ",
      content: `การปฏิบัติหน้าที่ ในหัวข้อนี้ประกอบด้วย`,
      subItems: [
        {
          content: "การทดสอบขั้นสุดท้าย ซึ่งจะใช้เพื่อลงนามรับรอง และบันทึกไว้เป็นหลักฐานว่า ได้ผ่านขั้นตอนสุดท้ายเรียบร้อยแล้ว"
        },
        {
          content: "การทดสอบทั้งหมดจะถูกบันทึกว่า ได้สอบผ่านในแต่ละหัวข้อที่กำหนดหรือจำเป็นอะไรบ้างในแต่ละการปฏิบัติหน้าที่ ซึ่งแยกออกได้ ดังนี้",
          nestedItems: [
            {
              title: "คุณสมบัติก่อนการทดสอบ",
              content: `สิ่งที่ต้องปฏิบัติก่อนคือต้องได้รับการรับรองว่า ผู้รับการทดสอบมีคุณสมบัติเพียงพอในการทดสอบความรู้ในตำแหน่งที่ต้องปฏิบัติหน้าที่ สิ่งที่ต้องปฏิบัติก่อนอาจรวมถึง การเรียนรู้จากโรงเรียนในหลักสูตรต่างๆ ผ่านการทดสอบการปฏิบัติหน้าที่มาแล้วจากเอกสาร PQS เล่มอื่น หรือการทดสอบการปฏิบัติหน้าที่อื่นๆ จากเอกสาร PQS นี้ ก่อนที่ผู้ทดสอบจะลงนามรับรองในส่วนที่ต้องปฏิบัติก่อน ผู้ทดสอบต้องตรวจสอบจากบันทึกการปฏิบัติครั้งสุดท้าย สำหรับ "วันที่" เป็นวันที่ที่ผ่านการทดสอบจริงไม่ใช้วันที่ลงนาม ไม่มีคะแนนหรือเปอร์เซ็นต์ในส่วนของ สิ่งที่ต้องปฏิบัติก่อน`
            },
            {
              title: "ความรู้พื้นฐาน",
              content: `ในส่วนนี้เป็นความรู้พื้นฐานที่ได้จาก (หัวข้อ ๑๐๐) และยังรวมถึงความรู้พื้นฐานที่ผู้รับการทดสอบได้รับจากการปฏิบัติหน้าที่ตำแหน่งอื่นๆ ตามปกติแล้วผู้รับการทดสอบจะต้องผ่านการทดสอบความรู้พื้นฐาน และมีการลงนามรับรองก่อนที่จะทำการทดสอบการปฏิบัติหน้าที่ อย่างไรก็ตาม ผู้ทดสอบสามารถอนุญาตให้ผู้รับการทดสอบ เลือกการทดสอบการปฏิบัติหน้าที่ที่ต้องการได้ หลังจากที่ได้ผ่านการทดสอบความรู้พื้นฐานแล้ว เพื่อความเหมาะสมของการปฏิบัติหน้าที่ของผู้รับการทดสอบ`
            },
            {
              title: "ระบบ",
              content: `ในส่วนนี้เป็นระบบจาก (หัวข้อ ๒๐๐) ซึ่งใช้สำหรับการปฏิบัติหน้าที่ และยังรวมถึงระบบที่ต้องปฏิบัติก่อนปฏิบัติหน้าที่ ก่อนที่จะเริ่มกำหนดการปฏิบัติหน้าที่ (หัวข้อ ๓๐๐) ผู้รับการทดสอบต้องผ่านการทดสอบความรู้เกี่ยวกับระบบที่เหมาะสมกับการปฏิบัติหน้าที่ที่ทำการทดสอบ รายชื่อระบบทั้งหมดที่จะต้องผ่านการทดสอบมีอยู่ในรายการทดสอบขั้นสุดท้าย`
            }
          ]
        },
        {
          content: "การปฏิบัติหน้าที่ การปฏิบัติหน้าที่ในตำแหน่ง ในส่วนนี้เป็นส่วนของการลงมือปฏิบัติจริงในการทดสอบความรู้ ความสามารถของผู้รับการทดสอบ ซึ่งแบ่งออกเป็นหัวข้อ ดังนี้",
          nestedItems: [
            { title: "การทดสอบการปฏิบัติงาน" },
            { title: "การทดสอบการปฏิบัติในโอกาสพิเศษ" },
            { title: "กรณีเหตุขัดข้อง" },
            { title: "กรณีเหตุฉุกเฉิน" },
            { title: "การทดสอบการปฏิบัติประจำตำแหน่ง" }
          ]
        },
        {
          content: "การทดสอบขั้นสุดท้าย ซึ่งใช้รับรองเป็นเบื้องต้นสำหรับการยอมรับ และบันทึกผลการทดสอบขั้นสุดท้ายสำหรับการปฏิบัติหน้าที่"
        }
      ]
    },
    {
      title: "ขั้นตอนการทำงาน",
      content: `มาตรฐานการทดสอบกำลังพล โดยเจตนาแล้วไม่ได้ทำขึ้นเพื่อเป็นขั้นตอนที่แน่นอนในการปฏิบัติงานให้สำเร็จ หรือควบคุมการทำงาน หรือเข้าใจในข้อขัดข้องอย่างถูกต้อง จะเป็นเพียงเฉพาะบอกถึงแหล่งที่มาของหนังสือคู่มือทางเทคนิค หรือหนังสือแนวทางการปฏิบัติต่างๆ ซึ่งเตรียมไว้สำหรับการติดตั้งอุปกรณ์พิเศษ หรือชิ้นส่วนของอุปกรณ์ ระดับของความถูกต้องของผู้รับการทดสอบบ้างครั้งอาจมีความแตกต่างกัน คือ โรงเรียนกับโรงเรียน เรือกับเรือ กองเรือกับกองเรือ พื้นฐานหลักขึ้นอยู่กับความต้องการของแต่ภารกิจ ดังนั้นความรู้ ความชำนาญบางครั้งแสดงให้เห็นได้เฉพาะจากการอธิบายการปฏิบัติงานที่ระดับหนึ่งของความสามารถ ซึ่งพอเพียงต่อความพอใจของ หน.หน่วยฯ`
    },
    {
      title: "วิธีปฏิบัติ",
      content: `หลังจากที่สอบผ่านความรู้พื้นฐาน และการปฏิบัติงานแต่ละระบบแล้ว ผู้รับการทดสอบต้องปฏิบัติงานภายใต้การดูแลอย่างใกล้ชิด ในแต่ละตำแหน่งของการทดสอบความรู้ ถ้าผู้รับการทดสอบสามารถปฏิบัติงาน และสามารถอธิบายขั้นตอนต่างๆ ได้เป็นที่พอใจ ผู้ทดสอบจะลงนามรับรองในแต่ละการปฏิบัติงานนั้น หลังจากที่ได้ลงนามหมดทุกตำแหน่งของการปฏิบัติงานแล้ว ผู้ทดสอบจะตรวจสอบการทดสอบขั้นสุดท้าย และลงนามพร้อมลงวันที่ที่ผ่านการทดสอบในหน้าของการทดสอบขั้นสุดท้าย`
    }
  ];

  // Preview Mode - A4 Paper Format
  if (isPreviewMode) {
    return (
      <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
        <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-github-text-primary box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_2.0cm_2.0cm_3.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
          <div className="mb-8">
            <h1 className='font-bold text-center text-lg'>
              แนะนำการปฏิบัติหน้าที่ (หัวข้อ ๓๐๐)
            </h1>
          </div>

          <ol className="list-none space-y-4">
            {sections.map((section, index) => (
              <li key={index} className="flex items-baseline gap-[2ch]">
                <span className="font-bold min-w-fit">{toThaiNumber(index + 1)}.</span>
                <div className="flex-1">
                  <span className="font-bold">{section.title}</span>
                  <div className="text-justify indent-8 font-normal mt-1 whitespace-pre-line text-github-text-primary dark:text-github-text-primary">
                    {section.content.replace(/\s+/g, ' ').trim()}
                  </div>

                  {/* Level 2 List (Thai Alphabetic) */}
                  {section.subItems && (
                    <ol className="list-none mt-2 space-y-2 ml-8">
                      {section.subItems.map((item, subIndex) => (
                        <li key={subIndex} className="flex items-baseline gap-[1ch]">
                          <span className="min-w-fit">{toThaiAlphabet(subIndex)}.</span>
                          <div className="flex-1 text-justify">
                            {item.content}

                            {/* Level 3 List (Thai Numerals) */}
                            {item.nestedItems && (
                              <ol className="list-none mt-2 space-y-1 ml-0">
                                {item.nestedItems.map((nested, nestedIndex) => (
                                  <li key={nestedIndex} className="flex items-baseline gap-[1ch]">
                                    <span className="min-w-fit">{toThaiNumber(nestedIndex + 1)}.</span>
                                    <div className="flex-1 text-justify">
                                      {nested.title && <span className="font-normal">{nested.title}</span>}
                                      {nested.content && (
                                        <div className="text-justify font-normal whitespace-pre-line text-github-text-primary dark:text-github-text-primary">
                                          {nested.content.replace(/\s+/g, ' ').trim()}
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  // Edit Mode - Modern Card UI
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">แนะนำการปฏิบัติหน้าที่</h1>
            <p className="text-purple-100 text-sm mt-1">Section 300 Introduction - ข้อมูลเบื้องต้นสำหรับหัวข้อ ๓๐๐</p>
          </div>
        </div>
      </div>

      {/* Content Cards */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div
            key={index}
            className="rounded-lg shadow-md border bg-white dark:bg-github-bg-secondary border-github-border-primary transition-all duration-200 hover:shadow-lg"
          >
            <div className="p-6">
              {/* Section Header */}
              <div className="flex items-start space-x-4 mb-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                  {toThaiNumber(index + 1)}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-github-text-primary">
                    {section.title}
                  </h2>
                </div>
              </div>

              {/* Section Content */}
              <div className="text-justify leading-relaxed ml-12 text-github-text-secondary">
                {section.content}
              </div>

              {/* Sub Items (Level 2 - Thai Alphabet) */}
              {section.subItems && (
                <ol className="list-none mt-4 ml-12 space-y-3">
                  {section.subItems.map((item, subIndex) => (
                    <li key={subIndex} className="flex items-baseline gap-2">
                      <span className="min-w-fit font-medium text-purple-600 dark:text-purple-400">
                        {toThaiAlphabet(subIndex)}.
                      </span>
                      <div className="flex-1">
                        <div className="text-justify text-github-text-secondary">
                          {item.content}
                        </div>

                        {/* Nested Items (Level 3 - Thai Numbers) */}
                        {item.nestedItems && (
                          <ol className="list-none mt-2 ml-4 space-y-1.5">
                            {item.nestedItems.map((nested, nestedIndex) => (
                              <li key={nestedIndex} className="flex items-baseline gap-2">
                                <span className="min-w-fit text-sm text-purple-500 dark:text-purple-400">
                                  {toThaiNumber(nestedIndex + 1)}.
                                </span>
                                <div className="flex-1">
                                  {nested.title && (
                                    <span className="font-medium text-github-text-primary">
                                      {nested.title}
                                    </span>
                                  )}
                                  {nested.content && (
                                    <div className="text-justify text-sm text-github-text-secondary mt-1">
                                      {nested.content}
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
        <p className="flex items-center">
          <span className="mr-2">💡</span>
          <span>เนื้อหาในหัวข้อ ๓๐๐ เป็นข้อมูลมาตรฐานที่ใช้กับทุกเอกสาร PQS</span>
        </p>
      </div>
    </div>
  );
};

export default Section300View;
