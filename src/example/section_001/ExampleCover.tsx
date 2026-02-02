import React from 'react';
import navyLogo from '../../assets/images/navy_logo.webp';

const ExampleCover: React.FC = () => {
  return (
    <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit font-['TH_Sarabun_New',sans-serif] transition-colors duration-300">
      {/* A4 Paper Container */}
      <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-github-text-primary box-border mx-auto w-[210mm] min-h-[297mm] relative overflow-hidden transition-colors duration-300">

        {/* Page Content padding matching CSS: 2.5cm 2.0cm 2.0cm 3.0cm */}
        <div className="p-[2.5cm_2.0cm_2.0cm_3.0cm] h-full flex flex-col items-center">

          {/* Logo Section */}
          <div className="flex justify-center items-center my-[60px]">
            <img
              src={navyLogo}
              alt="ตราสัญลักษณ์กรมสรรพาวุธทหารเรือ"
              className="w-[100px] h-auto object-contain"
            />
          </div>

          {/* Header Texts */}
          <div className="flex flex-col items-center text-[28px] font-medium gap-[5px] leading-tight text-center">
            <div>มกพ. ๒๗๐๒๐๔๐๐๔</div>
            <div>มาตรฐานกําลังพลกองทัพเรือ</div>
            <div className="my-[20px]">สําหรับ</div>
          </div>

          {/* Subject Texts */}
          <div className="flex flex-col items-center text-[26px] font-medium gap-[5px] mt-[10px] leading-tight text-center">
            <div>พนักงานควบคุมระบบอาวุธป้องกันตนเองระยะประชิด</div>
            <div>PHALANX MK15 MODS 1-4, 6 & 11-14</div>
          </div>

          {/* Department Texts */}
          <div className="flex flex-col items-center text-[28px] font-medium gap-[5px] mt-[28px] leading-tight text-center">
            <div>กองโรงงานไฟฟ้าอาวุธ ศูนย์ซ่อมสร้างสรรพาวุธ</div>
            <div>กรมสรรพาวุธทหารเรือ</div>
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

export default ExampleCover;
