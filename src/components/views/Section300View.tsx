import { BookOpen } from 'lucide-react';
import { SECTION_300_INTRODUCTION_SECTIONS } from '../../content/introductionContent';
import Container from '../ui/Container';

interface Section300ViewProps {
  isPreviewMode?: boolean;
}

const Section300View: React.FC<Section300ViewProps> = ({ isPreviewMode = false }) => {
  const toThaiNumber = (num: number) => {
    return num.toString();
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

  const sections = SECTION_300_INTRODUCTION_SECTIONS;

  // Preview Mode - A4 Paper Format
  if (isPreviewMode) {
    return (
      <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
        <div className="bg-white dark:bg-github-bg-secondary text-black dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_2.0cm_2.0cm_3.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
          <div className="mb-8">
            <h1 className='font-bold text-center text-lg'>
              แนะนำการปฏิบัติหน้าที่ (หัวข้อ 300)
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

                  {/* Level 2 List (Thai Alphabetic) */}
                  {section.subItems && (
                    <ol className="list-none mt-2 space-y-2 ml-8">
                      {section.subItems.map((item, subIndex) => (
                        <li key={item.id} className="flex items-baseline gap-[1ch]">
                          <span className="min-w-fit">{toThaiAlphabet(subIndex)}.</span>
                          <div className="flex-1">
                            <p className="text-justify">{item.content}</p>

                            {/* Level 3 List (Thai Numerals) */}
                            {item.nestedItems && (
                              <ol className="list-none mt-2 space-y-1 ml-0">
                                {item.nestedItems.map((nested, nestedIndex) => (
                                  <li key={nested.id} className="flex items-baseline gap-[1ch]">
                                    <span className="min-w-fit">{toThaiNumber(nestedIndex + 1)}.</span>
                                    <div className="flex-1 text-justify">
                                      {nested.title && <h3 className="font-normal">{nested.title}</h3>}
                                      {nested.content && (
                                        <p className="text-justify font-normal whitespace-pre-line">
                                          {nested.content.replace(/\s+/g, ' ').trim()}
                                        </p>
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
    <Container size="medium" padding="large" className="py-6 space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">แนะนำการปฏิบัติหน้าที่</h1>
            <p className="text-purple-100 text-sm mt-1">Section 300 Introduction - ข้อมูลเบื้องต้นสำหรับหัวข้อ 300</p>
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
              <p className="text-justify leading-relaxed ml-12 text-github-text-secondary">
                {section.content}
              </p>

              {/* Sub Items (Level 2 - Thai Alphabet) */}
              {section.subItems && (
                <ol className="list-none mt-4 ml-12 space-y-3">
                  {section.subItems.map((item, subIndex) => (
                    <li key={item.id} className="flex items-baseline gap-2">
                      <span className="min-w-fit font-medium text-purple-600 dark:text-purple-400">
                        {toThaiAlphabet(subIndex)}.
                      </span>
                      <div className="flex-1">
                        <p className="text-justify text-github-text-secondary">
                          {item.content}
                        </p>

                        {/* Nested Items (Level 3 - Thai Numbers) */}
                        {item.nestedItems && (
                          <ol className="list-none mt-2 ml-4 space-y-1.5">
                            {item.nestedItems.map((nested, nestedIndex) => (
                              <li key={nested.id} className="flex items-baseline gap-2">
                                <span className="min-w-fit text-sm text-purple-500 dark:text-purple-400">
                                  {toThaiNumber(nestedIndex + 1)}.
                                </span>
                                <div className="flex-1">
                                  {nested.title && (
                                    <h3 className="font-medium text-github-text-primary">
                                      {nested.title}
                                    </h3>
                                  )}
                                  {nested.content && (
                                    <p className="text-justify text-sm text-github-text-secondary mt-1">
                                      {nested.content}
                                    </p>
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

      {/* Footer Note */}
      <div className="bg-github-bg-secondary dark:bg-gray-800 border border-github-border-primary dark:border-gray-700 rounded-lg p-4 text-sm text-github-text-secondary dark:text-gray-400">
        <div className="flex items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm">
          <span>เนื้อหาในหัวข้อ 300 เป็นข้อมูลมาตรฐานที่ใช้กับทุกเอกสาร PQS</span>
        </div>
      </div>
    </Container>
  );
};

export default Section300View;
