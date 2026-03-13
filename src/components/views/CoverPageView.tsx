import { Building2, Calendar, FileText, Hash } from 'lucide-react';
import React from 'react';
import navyLogo from '../../assets/images/navy_logo.webp';
import Container from '../ui/Container';

interface CoverPageViewProps {
  id: string;
  name: string;
  hierarchy: string[];
  isPreviewMode?: boolean;
}

const CoverPageView: React.FC<CoverPageViewProps> = ({ id, name, hierarchy, isPreviewMode = false }) => {
  const toThaiNumber = (num: string | number) => {
    return num.toString();
  };

  // Preview Mode - A4 Paper Format (Official RTN - matching ExampleCover.tsx)
  if (isPreviewMode) {
    const displayUnits = hierarchy.slice(0, 3);

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
              <div>{toThaiNumber(id)}</div>
              <div>มาตรฐานกำลังพลกองทัพเรือ</div>
              <div className="my-[20px]">สำหรับ</div>
            </div>

            {/* Subject Texts (Document Name) */}
            <div className="flex flex-col items-center text-[26px] font-medium gap-[5px] mt-[10px] leading-tight text-center">
              <div>{name}</div>
            </div>

            {/* Department Texts (Unit Hierarchy) */}
            <div className="flex flex-col items-center text-[28px] font-medium gap-[5px] mt-[28px] leading-tight text-center">
              {displayUnits.map((unit, idx) => (
                <div key={idx}>{unit}</div>
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
  }

  // Edit Mode - Modern Beautiful UI
  const displayUnits = hierarchy.slice(0, 3);

  return (
    <Container size="medium" padding="large" className="py-6 space-y-6">
      {/* Hero Card - Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl shadow-2xl">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-800 dark:via-blue-900 dark:to-indigo-950"></div>

        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        {/* Content */}
        <div className="relative p-12 text-white">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src={navyLogo}
              alt="ตราสัญลักษณ์กรมสรรพาวุธทหารเรือ"
              className="w-32 h-32 object-contain drop-shadow-lg"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-10">
            <p className="text-blue-100 text-sm font-medium mb-2 tracking-wide uppercase">
              Royal Thai Navy
            </p>
            <h1 className="text-4xl font-bold mb-2">
              กองทัพเรือ
            </h1>
            <h2 className="text-2xl font-semibold text-blue-100">
              มาตรฐานกำลังพล
            </h2>
            <div className="mt-4 h-1 w-24 bg-white/40 mx-auto rounded-full"></div>
          </div>

          {/* Document Name */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 shadow-xl">
            <p className="text-blue-100 text-sm font-medium mb-3 text-center">
              เรื่อง
            </p>
            <p className="text-2xl font-bold text-center leading-relaxed">
              {name}
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document ID Card */}
        <div className="bg-white dark:bg-github-bg-secondary border border-github-border-primary rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Hash className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-github-text-secondary mb-2">
                เอกสารหมายเลข
              </h3>
              <p className="text-2xl font-bold font-mono text-github-text-primary tracking-wide">
                {toThaiNumber(id)}
              </p>
              <p className="text-xs text-github-text-tertiary mt-1">
                Document ID (Thai Format)
              </p>
            </div>
          </div>
        </div>

        {/* Document Type Card */}
        <div className="bg-white dark:bg-github-bg-secondary border border-github-border-primary rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-github-text-secondary mb-2">
                ประเภทเอกสาร
              </h3>
              <p className="text-2xl font-bold text-github-text-primary">
                PQS Standard
              </p>
              <p className="text-xs text-github-text-tertiary mt-1">
                Personnel Qualification Standard
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Hierarchy Card */}
      <div className="bg-white dark:bg-github-bg-secondary border border-github-border-primary rounded-lg shadow-md p-6">
        <div className="flex items-start space-x-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-github-text-primary mb-1">
              หน่วยงาน
            </h3>
            <p className="text-sm text-github-text-secondary">
              Unit Hierarchy (Top 3 Levels)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 ml-16">
          {displayUnits.map((unit, idx) => (
            <div
              key={idx}
              className="group relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
              <div className="relative px-4 py-2 bg-white dark:bg-github-bg-tertiary border border-github-border-primary rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    L{hierarchy.length - idx}
                  </span>
                  <span className="text-sm font-medium text-github-text-primary">
                    {unit}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-950 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-github-text-primary mb-1">
              Cover Page - หน้าปกเอกสาร
            </p>
            <p className="text-xs text-github-text-secondary">
              This is the official cover page for the PQS document. Use Preview Mode to see the print-ready A4 format.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default CoverPageView;
