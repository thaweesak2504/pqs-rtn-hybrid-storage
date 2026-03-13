import { BookOpen } from 'lucide-react';
import { convertThaiToArabic, formatNumberByMode } from '../../utils/thaiNumbering';
import Container from '../ui/Container';

interface Section100ViewProps {
  isPreviewMode?: boolean;
}

const Section100View: React.FC<Section100ViewProps> = ({ isPreviewMode = false }) => {
  const digitMode = isPreviewMode ? 'thai' : 'arabic';
  const formatDigit = (num: number | string) => formatNumberByMode(num, digitMode);
  const normalizeInlineDigits = (content: string) => (isPreviewMode ? content : convertThaiToArabic(content));

  const sections = [
    {
      title: "คำนำ",
      content: `มาตรฐานกำลังพล เริ่มด้วยหัวข้อ "ความรู้พื้นฐาน" ซึ่งครอบคลุมพื้นฐานความรู้ และส่วนสำคัญที่จำเป็นต้องรู้และเข้าใจก่อนที่จะเข้าศึกษาและปฏิบัติใน หัวข้อ ๒๐๐ และ ๓๐๐ ตามลำดับ โดยปกติผู้รับการทดสอบจะผ่านการฝึกอบรมในหัวข้อ ความรู้พื้นฐานจากโรงเรียน แต่ถ้าผู้การทดสอบยังไม่ได้รับการฝึกอบรมมาก่อน หรือเป็นการทดสอบปฏิบัติเพื่อเป็นการทบทวน เอกสารอ้างอิงจะช่วยให้ผู้รับการทดสอบสามารถศึกษาได้ด้วยตนเอง เอกสารอ้างอิงทั้งหมดที่นำมาใช้ในการเรียนรู้นั้น ต้องได้รับการคัดเลือกด้วยความเหมาะสม เข้าถึงได้ และเข้าใจง่าย`
    },
    {
      title: "ความปลอดภัย",
      content: `ความปลอดภัยต่อบุคคล และอุปกรณ์เป็นสิ่งสำคัญอย่างยิ่ง ดังนั้น หัวข้อแรกของหัวข้อความรู้พื้นฐาน (หัวข้อ ๑๐๐) จะกล่าวถึงข้อระมัดระวังอันตรายพื้นฐานที่จำเป็นในการปฏิบัติ ส่วนหัวข้อระบบ (หัวข้อ ๒๐๐) จะเพิ่มหัวข้อย่อยคือ ข้อระมัดระวังอันตรายเฉพาะระบบ`
    },
    {
      title: "วิธีปฏิบัติ",
      content: `ความรู้พื้นฐานที่ ผู้รับการทดสอบจะต้อง "ผ่านการทดสอบ" มีรายการอยู่ในหัวข้อการปฏิบัติหน้าที่ (หัวข้อ ๓๐๐) ผู้รับการทดสอบจะต้องผ่านการทดสอบความรู้พื้นฐานทั้งหมดตามที่กำหนดก่อนที่จะเริ่มหัวข้อระบบ (หัวข้อ ๒๐๐) และหัวข้อการปฏิบัติหน้าที่ (หัวข้อ ๓๐๐) ความรู้ที่ผู้รับการทดสอบได้รับจากหัวข้อความรู้พื้นฐาน (หัวข้อ ๑๐๐) จะช่วยให้ผู้รับการทดสอบมีความเข้าในระบบและการปฏิบัติหน้าที่ที่เกี่ยวข้องกับระบบนั้นๆ เมื่อผู้รับการทดสอบมั่นใจว่ามีความเข้าใจในความรู้พื้นฐานอย่างดีแล้ว ให้ติดต่อกับผู้ทดสอบ ถ้าผู้รับการทดสอบทำการสอบเป็นครั้งแรก ผู้ทดสอบจะกำหนดให้ผู้รับการทดสอบตอบคำถามจนเป็นที่น่าพอในในทุกๆ หัวข้อของหัวข้อความรู้พื้นฐานก่อนที่ผู้ทดสอบจะลงนามรับรองในหัวข้อความรู้พื้นฐานนั้นๆ ถ้าผู้รับการทดสอบทำการสอบทบทวน หรือเคยผ่านการฝึกอบรมจากโรงเรียน ผู้ทดสอบจะให้ผู้รับการทดสอบตอบคำถามตามหัวข้อที่กำหนด เพื่อที่จะยืนยันว่า ผู้รับการทดสอบมีความรู้ที่จำเป็นเพียงพอสำหรับ การปฏิบัติหน้าที่ในตำแหน่งที่ทำการทดสอบหรือไม่ ถ้าผู้รับการทดสอบต้องการที่จะทำการทดสอบขั้นสุดท้าย ด้วยวิธีการสอบปากเปล่าหรือสอบข้อเขียน ผู้รับการทดสอบอาจสอบถามผู้ทดสอบถึงขัวข้อความรู้พื้นฐานที่ต้องใช้ในการสอบการปฏิบัติหน้าที่ในตำแหน่งที่ต้องการทดสอบ`
    }
  ];

  // Preview Mode - A4 Paper Format
  if (isPreviewMode) {
    return (
      <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
        <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-github-text-primary box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_2.0cm_2.0cm_3.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
          <div className="mb-8">
            <h1 className='font-bold text-center text-lg'>
              แนะนำความรู้พื้นฐาน (หัวข้อ ๑๐๐)
            </h1>
          </div>

          <ol className="list-none space-y-4">
            {sections.map((section, index) => (
              <li key={index} className="flex items-baseline gap-[2ch]">
                <span className="font-bold min-w-fit">{formatDigit(index + 1)}.</span>
                <div className="flex-1">
                  <span className="font-bold">{section.title}</span>
                  <div className="text-justify indent-8 font-normal mt-1 whitespace-pre-line text-github-text-primary dark:text-github-text-primary">
                    {normalizeInlineDigits(section.content.replace(/\s+/g, ' ').trim())}
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
      <div className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">แนะนำความรู้พื้นฐาน</h1>
            <p className="text-green-100 text-sm mt-1">Section 100 Introduction - ข้อมูลเบื้องต้นสำหรับหัวข้อ 100</p>
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
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                  {formatDigit(index + 1)}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-github-text-primary">
                    {section.title}
                  </h2>
                </div>
              </div>

              {/* Section Content */}
              <div className="text-justify leading-relaxed ml-12 text-github-text-secondary">
                {normalizeInlineDigits(section.content)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="bg-github-bg-secondary dark:bg-gray-800 border border-github-border-primary dark:border-gray-700 rounded-lg p-4 text-sm text-github-text-secondary dark:text-gray-400">
        <p className="flex items-center">
          <span className="mr-2">💡</span>
          <span>เนื้อหาในหัวข้อ 100 เป็นข้อมูลมาตรฐานที่ใช้กับทุกเอกสาร PQS</span>
        </p>
      </div>
    </Container>
  );
};

export default Section100View;
