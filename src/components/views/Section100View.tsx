import { BookOpen } from 'lucide-react';
import { SECTION_100_INTRODUCTION_SECTIONS } from '../../content/introductionContent';
import { convertThaiToArabic, formatNumberByMode } from '../../utils/thaiNumbering';
import Container from '../ui/Container';

interface Section100ViewProps {
  isPreviewMode?: boolean;
}

const Section100View: React.FC<Section100ViewProps> = ({ isPreviewMode = false }) => {
  const digitMode = 'arabic';
  const formatDigit = (num: number | string) => formatNumberByMode(num, digitMode);
  const normalizeInlineDigits = (content: string) => convertThaiToArabic(content);

  const sections = SECTION_100_INTRODUCTION_SECTIONS;

  // Preview Mode - A4 Paper Format
  if (isPreviewMode) {
    return (
      <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
        <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-github-text-primary box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_2.0cm_2.0cm_3.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
          <div className="mb-8">
            <h1 className='font-bold text-center text-lg'>
              แนะนำความรู้พื้นฐาน (หัวข้อ 100)
            </h1>
          </div>

          <ol className="list-none space-y-4">
            {sections.map((section, index) => (
              <li
                key={section.id}
                data-introduction-section-id={section.id}
                className="flex items-baseline gap-[2ch]"
              >
                <span className="font-bold min-w-fit">{formatDigit(index + 1)}.</span>
                <div className="flex-1">
                  <h2 className="font-bold">{section.title}</h2>
                  <p className="text-justify indent-8 font-normal mt-1 whitespace-pre-line text-github-text-primary dark:text-github-text-primary">
                    {normalizeInlineDigits(section.content.replace(/\s+/g, ' ').trim())}
                  </p>
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
              <p className="text-justify leading-relaxed ml-12 text-github-text-secondary">
                {normalizeInlineDigits(section.content)}
              </p>
            </div>
          </li>
        ))}
      </ol>

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
