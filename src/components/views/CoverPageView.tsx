import React from 'react';
import navyLogo from '../../assets/images/navy_logo.webp';

interface CoverPageViewProps {
  id: string;
  name: string;
  hierarchy: string[];
}

const CoverPageView: React.FC<CoverPageViewProps> = ({ id, name, hierarchy }) => {
  // Helper to convert to Thai numerals
  const toThaiNumber = (num: string | number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => {
      const parsed = parseInt(d);
      return isNaN(parsed) ? d : thaiDigits[parsed];
    }).join('');
  };

  // Determine units to display.
  // Hierarchy is [Leaf, Parent, ..., Root].
  // User wants to display L4, L3, L2 (Leaf side).
  // So we take the first 3 elements.

  const displayUnits = hierarchy.slice(0, 3);

  return (
    <div className="flex justify-center bg-gray-100 dark:bg-github-bg-primary min-w-fit font-['TH_Sarabun_New',sans-serif] transition-colors duration-300">
      {/* A4 Paper Container */}
      <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-github-text-primary box-border mx-auto w-[210mm] min-h-[297mm] relative overflow-hidden transition-colors duration-300">

        {/* Page Content padding matching CSS: 2.5cm 2.0cm 2.0cm 3.0cm */}
        <div className="p-[2.5cm_2.0cm_2.0cm_3.0cm] h-full flex flex-col items-center">

          {/* Logo Section */}
          <div className="flex justify-center items-center my-[60px]">
            <img
              src={navyLogo}
              alt="ตราสัญลักษณ์"
              className="w-[100px] h-auto object-contain"
            />
          </div>

          {/* Header Texts */}
          <div className="flex flex-col items-center text-[28px] font-medium gap-[5px] leading-tight text-center">
            <div>มกพ. {toThaiNumber(id)}</div>
            <div>มาตรฐานกําลังพลกองทัพเรือ</div>
            <div className="my-[20px]">สําหรับ</div>
          </div>

          {/* Subject Texts (Document Name) */}
          <div className="flex flex-col items-center text-[26px] font-medium gap-[5px] mt-[10px] leading-tight text-center max-w-[80%]">
            <div>{name}</div>
          </div>

          {/* Department Texts (Unit) */}
          <div className="flex flex-col items-center text-[28px] font-medium gap-[5px] mt-[28px] leading-tight text-center">
            {displayUnits.map((unit, index) => (
              <div key={index}>{unit}</div>
            ))}
          </div>

          {/* Book Type (Bottom) */}
          <div className="flex flex-col items-center text-[28px] font-medium mt-[100px] text-center">
            คำถาม - คำตอบ
          </div>

        </div>
      </div>
    </div>
  );
};

export default CoverPageView;
