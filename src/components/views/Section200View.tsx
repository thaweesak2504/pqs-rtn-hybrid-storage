import { BookOpen } from 'lucide-react';
import Container from '../ui/Container';

interface Section200ViewProps {
  isPreviewMode?: boolean;
}

const Section200View: React.FC<Section200ViewProps> = ({ isPreviewMode = false }) => {
  const toThaiNumber = (num: number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => thaiDigits[parseInt(d)] || d).join('');
  };

  const toThaiAlphabet = (index: number) => {
    const thaiAlphabets = [
      'ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ',
      'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท',
      'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม',
      'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ',
    ];
    return thaiAlphabets[index] || '';
  };

  const sections = [
    {
      title: "โครงสร้างพื้นฐาน",
      content: `ในหัวข้อนี้จะแบ่งอุปกรณ์ออกเป็นส่วนย่อยๆ และอธิบายหน้าที่ เพื่อเป็นการเรียนรู้และเข้าใจการทำงานของระบบ เนื้อหาข้อระบบจะกล่าวถึงความต้องการ ในการปฏิบัติหน้าที่ โดยเลือกเฉพาะอุปกรณ์ที่ตรงกับการปฏิบัติหน้าที่ในแต่ละตำแหน่ง ระบบที่ไม่มีความซับซ้อนจะอธิบายเพียงเล็กน้อย โดยจะเน้นระบบที่มีความสำคัญ หรือมีความซับซ้อนมากกว่า`
    },
    {
      title: "ส่วนประกอบและชิ้นส่วนในส่วนประกอบ",
      content: `เป็นระบบที่แยกออกจากกัน เพื่อที่จะแบ่งการเรียนรู้ออกเป็น ๒ ระดับ คือแบ่งออกเป็นส่วนประกอบและชิ้นส่วนในส่วนประกอบ จะไม่มีรายการชิ้นส่วนทั้งหมดดังเช่นมีในหนังสือคู่มือทางเทคนิค จะมีเฉพาะรายการที่จำเป็นต้องรู้และเข้าใจในการปฏิบัติหน้าที่ โดยปกติแต่ละระบบจะมีรูปภาพแสดงให้เห็น ซึงจะแยกแสดงเป็นภาพส่วนประกอบและภาพชิ้นส่วนในส่วนประกอบ เช่น เครื่องกำเนิดไฟฟ้าและสวิตช์เกียร์ จะมีรายการชิ้นส่วนอยู่ในส่วนประกอบของระบบไฟฟ้าเรือ และรายละเอียดอื่นๆ ของแต่ละระบบ ในส่วนหัวข้อถัดไปจะเป็นการเรียนรู้ลึกลงไปในรายละเอียด`
    },
    {
      title: "รูปแบบ",
      content: `แต่ละระบบจะมีรูปแบบการจัดระบบ ดังนี้`,
      subItems: [
        "มีรายชื่อเอกสารอ้างอิงเพื่อใช้ในการเรียนรู้ และมีคำถามให้ผู้รับการทดสอบอธิบายหน้าที่ของแต่ละระบบ",
        "มีการสอบถามโดยทั่วไป ถึงความสัมพันธ์ของส่วนประกอบ และชิ้นส่วนในส่วนประกอบของระบบว่าคืออะไร อยู่ที่ไหนฯ",
        "มีการกล่าวถึงการทำงานของส่วนประกอบ และชิ้นส่วนในส่วนประกอบว่าทำหน้าที่อย่างไร",
        "มีรายละเอียดของค่าการทำงานที่สามารถนำมาตรวจสอบได้ในทันทีทันใด",
        "มีการศึกษาเรียนรู้ถึงความสัมพันธ์ระหว่างระบบ ที่กำลังศึกษากับระบบอื่น หรือพื้นที่ใกล้เคียง",
        "มีการอธิบายถึงอุปกรณ์ที่ให้ความปลอดภัยแก่ระบบ และมีข้อระมัดระวังอันตรายสำหรับบุคคลและอุปกรณ์"
      ]
    },
    {
      title: "วิธีปฏิบัติ",
      content: `ผู้รับการทดสอบจะต้องผ่านการทดสอบตามรายการในหัวข้อการปฏิบัติหน้าที่ (หัวข้อ ๓๐๐) สำหรับการปฏิบัติหน้าที่ในแต่ละตำแหน่ง เมื่อผู้รับการทดสอบเข้าใจในระบบใดระบบหนึ่งหรือมากกว่าอย่างดีแล้ว ให้ติดต่อกับผู้ทดสอบ เพื่อที่ผู้ทดสอบจะสัมภาษณ์ในแต่ละระบบ ถ้าผู้ทดสอบมีความพอใจว่าผู้รับการทดสอบมีความรู้เกี่ยวกับระบบเพียงพอ ผู้ทดสอบจะลงนามรับรอง ผู้รับการทดสอบที่พร้อมจะทำการทดสอบ จะต้องทดสอบปากเปล่า และสอบข้อเขียน เพื่อที่จะแสดงว่าเป็นผู้ที่มีความรู้ ความเข้าใจในระบบที่เกี่ยวกับการปฏิบัติหน้าที่`
    }
  ];

  // Preview Mode - A4 Paper Format
  if (isPreviewMode) {
    return (
      <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
        <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-github-text-primary box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_2.0cm_2.0cm_3.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
          <div className="mb-8">
            <h1 className='font-bold text-center text-lg'>
              แนะระบบ (หัวข้อ ๒๐๐)
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

                  {/* Nested List for Section 3 (index 2) */}
                  {section.subItems && (
                    <ol className="list-none mt-2 space-y-1 ml-8">
                      {section.subItems.map((item, subIndex) => (
                        <li key={subIndex} className="flex items-baseline gap-[1ch]">
                          <span className="min-w-fit">{toThaiAlphabet(subIndex)}.</span>
                          <div className="flex-1 text-justify">
                            {item}
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
    <Container size="medium" padding="large" className="py-6 space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">แนะระบบ</h1>
            <p className="text-orange-100 text-sm mt-1">Section 200 Introduction - ข้อมูลเบื้องต้นสำหรับหัวข้อ ๒๐๐</p>
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
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
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

              {/* Sub Items (Thai Alphabet) */}
              {section.subItems && (
                <ol className="list-none mt-4 ml-12 space-y-2">
                  {section.subItems.map((item, subIndex) => (
                    <li key={subIndex} className="flex items-baseline gap-2">
                      <span className="min-w-fit font-medium text-orange-600 dark:text-orange-400">
                        {toThaiAlphabet(subIndex)}.
                      </span>
                      <div className="flex-1 text-justify text-github-text-secondary">
                        {item}
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
      <div className="bg-github-bg-secondary dark:bg-gray-800 border border-github-border-primary dark:border-gray-700 rounded-lg p-4 text-sm text-github-text-secondary dark:text-gray-400">
        <p className="flex items-center">
          <span className="mr-2">💡</span>
          <span>เนื้อหาในหัวข้อ ๒๐๐ เป็นข้อมูลมาตรฐานที่ใช้กับทุกเอกสาร PQS</span>
        </p>
      </div>
    </Container>
  );
};

export default Section200View;
