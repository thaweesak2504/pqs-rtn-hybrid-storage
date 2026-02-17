import { BookOpen } from 'lucide-react';
import React from 'react';
import Container from '../ui/Container';

interface IntroductionViewProps {
  appliedTo: string;
  isPreviewMode?: boolean;
}

const IntroductionView: React.FC<IntroductionViewProps> = ({ appliedTo, isPreviewMode = false }) => {
  const toThaiNumber = (num: number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => thaiDigits[parseInt(d)] || d).join('');
  };

  const sections = [
    {
      title: "มาตรฐานกำลังพล",
      content: `มาตรฐานกำลังพล ใช้สำหรับทดสอบกำลังพลทั้งนายทหารสัญญาบัตรและนายทหารประทวนที่จะต้องเข้าปฏิบัติหน้าที่ใดๆ เพื่อที่จะมั่นใจได้ว่าผู้ปฏิบัติมีความรู้ ความชำนาญอย่างพอเพียงที่สามารถปฏิบัติหน้าที่ต่างๆ ได้อย่างถูกต้องและปลอดภัย มาตรฐานนี้จึงประกอบด้วย คำถามและคำสั่งการปฏิบัติเรียงลำดับกันอย่างเป็นระเบียบ จาก ความรู้พื้นฐาน ระบบ การปฏิบัติหน้าที่ ที่อำนวยประโยชน์ให้ผู้เข้ารับการทดสอบสามารถเข้าใจลำดับขั้นในการศึกษาและการปฏิบัติ พร้อมทั้งผู้ทดสอบสามารถ คัดเลือก ปรับปรุงแก้ไข ให้การทดสอบครอบคลุมประเด็นสำคัญๆ ตรงตามสภาวะหรือสถานการณ์ที่ผู้เข้ารับการทดสอบต้องปฏิบัติหน้าที่จริง`,
      isHighlight: false
    },
    {
      title: "การประยุกต์ใช้",
      content: `มาตรฐานกำลังพล เล่มนี้ ใช้กับ ${appliedTo}`,
      isHighlight: true
    },
    {
      title: "การปรับปรุงแก้ไข",
      content: `แนวทางในการปรับปรุงแก้ไขเอกสารนี้ คือผู้ทดสอบที่ได้รับการแต่งตั้งในแต่ละอุปกรณ์จำนวน ๑ คนหรือมากกว่า ทำการพิจารณาทบทวนในแต่ละหัวข้อ แล้วทำการยกเลิกส่วนต่างๆ ของระบบหรืออุปกรณ์ที่ไม่ได้ติดตั้งของหน่วยฯ จากนั้นให้เพิ่มเติม คำถามต่างๆ ในความรู้พื้นฐาน ระบบ และการปฏิบัติหน้าที่ ซึ่งเกี่ยวข้องกับระบบที่ติดตั้งของหน่วยฯ แต่ไม่มีอยู่ในเอกสารนี้ ท้ายสุดเอกสารนี้จะผ่านการตรวจสอบโดยหัวหน้าแผนก แล้วเสนอความต้องการในการปรับปรุงแก้ไขให้กับ หน.หน่วยฯ เพื่อเสนอปรับปรุงแก้ไขต่อไป`,
      isHighlight: false
    },
    {
      title: "ผู้ทดสอบ",
      content: `หน.หน่วยฯ เป็นผู้แต่งตั้งผู้ทดสอบให้เป็นผู้ลงนามรับรองการผ่านการทดสอบ โดยผู้ทดสอบควรมียศจ่าเอก หรือสูงกว่า และจะต้องผ่านการทดสอบในหัวข้อที่จะทำการทดสอบที่ได้รับการลงนามรับรองเรียบร้อยแล้ว รายชื่อของผู้ทดสอบสามารถดูได้จากแผงประกาศรายชื่อผู้ทดสอบของหน่วยฯ`,
      isHighlight: false
    },
    {
      title: "เนื้อเรื่อง",
      content: `มาตรฐานกำลังพล แบ่งออกเป็น ๓ หัวข้อ คือ หัวข้อ ๑๐๐ (ความรู้พื้นฐาน) ประกอบด้วยความรู้พื้นฐาน และรายการหนังสืออ้างอิง ที่จำเป็นสำหรับการปฏิบัติหน้าที่แต่ละตำแหน่ง เพื่อให้ผู้รับการทดสอบมีความรู้ ความเข้าใจในข้อระมัดระวังอันตรายทั่วไปและความรู้พื้นฐานของระบบ หัวข้อ ๒๐๐ (ระบบ) เป็นหัวข้อที่ให้ผู้รับการทดสอบมีความรู้ความเข้าใจใน หน้าที่และหลักการทำงาน ส่วนประกอบและชิ้นส่วนประกอบของระบบ พร้อมทั้งมีความรู้ความเข้าใจในการเชื่อมต่อระบบ ค่าการทำงานปกติ สูงสุด ต่ำสุดของการทำงาน และข้อระมัดระวังอันตรายเฉพาะของระบบต่างๆ ที่เป็นส่วนประกอบในการปฏิบัติหน้าที่ หัวข้อ ๓๐๐ (การปฏิบัติหน้าที่) เป็นหัวข้อที่เน้นการทดสอบทางปฏิบัติ โดยที่ผู้รับการทดสอบต้องสามารถปฏิบัติได้ตามที่กำหนดตามลำดับ ทั้งในสถานการณ์ปฏิบัติงานปกติ กรณีพิเศษ กรณีเหตุขัด กรณีเหตุฉุกเฉิน จนกระทั้งให้ผู้รับการทดสอบเข้าปฏิบัติประจำตำแหน่งจริง และอาจมีการสอบความรู้ ข้อเขียน หรือสอบปากเปล่า เป็นลำดับสุดท้ายด้วย`,
      isHighlight: false
    },
    {
      title: "เอกสารอ้างอิง",
      content: `เอกสารอ้างอิงที่ใช้ ต้องเป็นเอกสารเล่มล่าสุดที่ใช้ในการปฏิบัติงาน และสามารถเบิกยืมหรือ ทราบแหล่งค้นคว้าได้โดยง่าย`,
      isHighlight: false
    },
    {
      title: "ผู้รับการทดสอบ",
      content: `ผู้ควบคุมการทดสอบ จะเป็นผู้กำหนดหัวข้อ "การปฏิบัติหน้าที่" ที่จะต้องผ่านการทดสอบ ก่อนที่จะทำการทดสอบให้เปิดไปที่หัวข้อ ๓๐๐ เพื่อตรวจดูหัวข้อการปฏิบัติหน้าที่ที่เกี่ยวข้องกับผู้รับการทดสอบ ซึ่งจะทำให้ทราบว่าจะต้องทำอะไรก่อนที่จะเริ่มการปฏิบัติหน้าที่ในแต่ละตำแหน่ง เช่น ผู้รับการทดสอบอาจจะต้องผ่านการทดสอบมาตรฐานกำลังพลเล่มอื่นมาก่อน ต้องผ่านการอบรมหลักสูตรจากโรงเรียน ต้องผ่านลำดับการปฏิบัติหน้าที่อื่นๆ ที่มีอยู่ในมาตรฐานกำลังพลเล่มนี้ ความรู้พื้นฐานและระบบใดที่ผู้รับการทดสอบจะต้องผ่านการทดสอบ ถ้ามีคำถามเพิ่มเติมหรือไม่สามารถหาเอกสารอ้างอิงได้ ให้ติดต่อกับผู้ควบคุมการทดสอบหรือผู้ทดสอบ`,
      isHighlight: false
    }
  ];

  // Preview Mode - A4 Paper Format (like print)
  if (isPreviewMode) {
    return (
      <div className="flex justify-center bg-github-bg-primary min-w-fit transition-colors duration-300">
        <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-github-text-primary box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_2.0cm_2.0cm_3.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
          <div className="mb-8">
            <h1 className='font-bold text-center text-lg'>
              กล่าวนำ
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">กล่าวนำ</h1>
            <p className="text-blue-100 text-sm mt-1">Introduction - ข้อมูลพื้นฐานเกี่ยวกับมาตรฐานกำลังพล</p>
          </div>
        </div>
      </div>

      {/* Content Cards */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div
            key={index}
            className={`rounded-lg shadow-md border transition-all duration-200 hover:shadow-lg ${section.isHighlight
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700'
                : 'bg-white dark:bg-github-bg-secondary border-github-border-primary'
              }`}
          >
            <div className="p-6">
              {/* Section Header */}
              <div className="flex items-start space-x-4 mb-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${section.isHighlight
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                  {toThaiNumber(index + 1)}
                </div>
                <div className="flex-1">
                  <h2 className={`text-lg font-bold ${section.isHighlight
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-github-text-primary'
                    }`}>
                    {section.title}
                  </h2>
                  {section.isHighlight && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      User Content
                    </span>
                  )}
                </div>
              </div>

              {/* Section Content */}
              <div className={`text-justify leading-relaxed ml-12 ${section.isHighlight
                  ? 'text-blue-900 dark:text-blue-100 font-medium'
                  : 'text-github-text-secondary'
                }`}>
                {section.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="bg-github-bg-secondary dark:bg-gray-800 border border-github-border-primary dark:border-gray-700 rounded-lg p-4 text-sm text-github-text-secondary dark:text-gray-400">
        <p className="flex items-center">
          <span className="mr-2">💡</span>
          <span>ข้อมูลที่แสดงด้านบนจะถูกนำไปใช้ในการสร้างเอกสาร PDF มาตรฐาน RTN</span>
        </p>
      </div>
    </Container>
  );
};

export default IntroductionView;
