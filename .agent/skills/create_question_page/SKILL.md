---
description: คำแนะนำสำหรับการสร้าง Component หน้าคำถามใหม่ (Question Page)
---

# Skill: Create Question Page

Skill นี้ใช้สำหรับสร้าง React Component หน้าคำถามใหม่ โดยยึดตามต้นแบบ `202Lcp.tsx` เพื่อให้ UX/UI เป็นไปในทิศทางเดียวกัน

## 1. เช็คลิสต์ก่อนเริ่ม (Prerequisites)
- [ ] ทราบหมายเลข Section (เช่น 203)
- [ ] ทราบชื่อย่อภาษาอังกฤษ (เช่น Rcp, Radar)
- [ ] ไฟล์ข้อมูล `*Data.ts` ถูกสร้างหรือวางแผนไว้แล้ว (ถ้ายัง ให้ใช้ Skill: **Manage Question Data** ก่อน)

## 2. ขั้นตอนการสร้างไฟล์ Component (Step-by-Step)

### A. โครงสร้างไฟล์ (File Structure)
ไฟล์ควรตั้งอยู่ที่ `src/example/section_[NUM]/[NUM][Name].tsx`
ตัวอย่าง: `src/example/section_200/203Rcp.tsx`

### B. Template Code
ให้ใช้ Code ด้านล่างเป็นโครงร่างหลัก **ห้ามเปลี่ยน Logic การแสดงผลหลัก** เปลี่ยนเฉพาะส่วนการ import และ config

```tsx
import React, { useState } from 'react';
import { UINode } from './types'; // ตรวจสอบ path ให้ถูกต้อง
import { documentMeta, [DATA_VARIABLE_NAME] } from './[DATA_FILENAME]'; // e.g. lcpQuestions from ./lcpData

const [COMPONENT_NAME]: React.FC = () => {
  const [showAnswers, setShowAnswers] = useState(false);
  // เปลี่ยนตัวแปร data ตรงนี้
  const questions = [DATA_VARIABLE_NAME]; 
  const references = documentMeta.references;

  const toggleAllAnswers = () => {
    setShowAnswers(!showAnswers);
  };

  // ... (คัดลอก Helper Function: toThaiNumber, renderCheckboxes, renderOptionsHeader จาก 202Lcp.tsx มาทั้งหมด)
  
  // ... (คัดลอก renderQuestion logic จาก 202Lcp.tsx โดยระวังเรื่อง level handling)

  return (
    <div className="p-4 mx-auto max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {documentMeta.section_number} {documentMeta.title}
        </h1>
        <div className="flex gap-2 items-center">
             <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                เอกสารอ้างอิง:
                {references && references.length > 0 && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400 text-xs">
                        {references.join(', ')}
                    </span>
                 )}
            </span>
             <button
                onClick={toggleAllAnswers}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
             >
            {showAnswers ? 'ซ่อนคำตอบ' : 'แสดงคำตอบ'}
          </button>
        </div>
      </div>

      {/* Questions List */}
       <ul className="space-y-4">
        {questions.map((q, index) => renderQuestion(q, index, 0, documentMeta.section_number))}
      </ul>
    </div>
  );
};

export default [COMPONENT_NAME];
```

## 3. สิ่งที่ต้องระวัง (Crucial Details)
1. **Thai Numerals**: ต้องมีฟังก์ชันแปลงเลขไทย (`toThaiNumber`) เสมอ
2. **Indentation**: สังเกตการใช้ `min-w-[Xch]` ใน `renderQuestion` เพื่อจัดเรียงเลขข้อให้ตรงกัน
3. **Recursive Rendering**: `renderQuestion` ต้องเรียกตัวเองแบบ Recursive สำหรับ `item.children` (ถ้ามี)
