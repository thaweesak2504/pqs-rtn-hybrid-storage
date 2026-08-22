import { BookOpen } from 'lucide-react';
import { SECTION_200_INTRODUCTION_SECTIONS } from '../../content/introductionContent';
import Container from '../ui/Container';

interface Section200ViewProps {
  isPreviewMode?: boolean;
}

const Section200View: React.FC<Section200ViewProps> = ({ isPreviewMode = false }) => {
  const toThaiNumber = (num: number) => {
    return num.toString();
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

  const sections = SECTION_200_INTRODUCTION_SECTIONS;

  // Preview Mode - A4 Paper Format
  if (isPreviewMode) {
    return (
      <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
        <div className="bg-white dark:bg-github-bg-secondary text-black dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_2.0cm_2.0cm_3.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
          <div className="mb-8">
            <h1 className='font-bold text-center text-lg'>
              แนะระบบ (หัวข้อ 200)
            </h1>
          </div>

          <ol className="list-none space-y-4">
            {sections.map((section, index) => (
              <li
                key={section.id}
                data-introduction-section-id={section.id}
                className="flex items-baseline gap-[2ch]"
              >
                <span className="font-bold min-w-fit">{toThaiNumber(index + 1)}.</span>
                <div className="flex-1">
                  <h2 className="font-bold">{section.title}</h2>
                  <p className="text-justify indent-8 font-normal mt-1 whitespace-pre-line">
                    {section.content.replace(/\s+/g, ' ').trim()}
                  </p>

                  {/* Nested List for Section 3 (index 2) */}
                  {section.subItems && (
                    <ol className="list-none mt-2 space-y-1 ml-8">
                      {section.subItems.map((item, subIndex) => (
                        <li key={item.id} className="flex items-baseline gap-[1ch]">
                          <span className="min-w-fit font-normal">{toThaiAlphabet(subIndex)}.</span>
                          <p className="flex-1 text-justify">
                            {item.content}
                          </p>
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
            <p className="text-orange-100 text-sm mt-1">Section 200 Introduction - ข้อมูลเบื้องต้นสำหรับหัวข้อ 200</p>
          </div>
        </div>
      </div>

      {/* Content Cards */}
      <ol className="list-none space-y-4">
        {sections.map((section, index) => (
          <li
            key={section.id}
            data-introduction-section-id={section.id}
            className="rounded-lg shadow-md border bg-white dark:bg-github-bg-secondary border-github-border-primary"
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
              <p className="text-justify leading-relaxed ml-12 text-github-text-secondary">
                {section.content}
              </p>

              {/* Sub Items (Thai Alphabet) */}
              {section.subItems && (
                <ol className="list-none mt-4 ml-12 space-y-2">
                  {section.subItems.map((item, subIndex) => (
                    <li key={item.id} className="flex items-baseline gap-2">
                      <span className="min-w-fit font-medium text-orange-600 dark:text-orange-400">
                        {toThaiAlphabet(subIndex)}.
                      </span>
                      <p className="flex-1 text-justify text-github-text-secondary">
                        {item.content}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* Footer Note */}
      <div className="bg-github-bg-secondary dark:bg-gray-800 border border-github-border-primary dark:border-gray-700 rounded-lg p-4 text-sm text-github-text-secondary dark:text-gray-400">
        <div className="flex items-center justify-center p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg text-sm">
          <span>เนื้อหาในหัวข้อ 200 เป็นข้อมูลมาตรฐานที่ใช้กับทุกเอกสาร PQS</span>
        </div>
      </div>
    </Container>
  );
};

export default Section200View;
