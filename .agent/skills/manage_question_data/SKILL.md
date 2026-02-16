---
description: คำแนะนำสำหรับการจัดการไฟล์ข้อมูลคำถาม (Data Management)
---

# Skill: Manage Question Data

Skill นี้ใช้สำหรับจัดการไฟล์ข้อมูล (Data Files) ที่เก็บโครงสร้างคำถามและคำตอบ (เช่น `lcpData.ts`)

## 1. โครงสร้างข้อมูลมาตรฐาน (Data Structure)

เราใช้ `interface UINode` เป็นหลัก ข้อมูลต้องเป็น Array ของ Object ที่มีโครงสร้างดังนี้:

```typescript
export const [VARIABLE_NAME]: UINode[] = [
  {
    id: '202.1',           // Unique ID (สำคัญมาก)
    type: NodeType.SECTION, // หรือ QUESTION
    q: 'ข้อความคำถาม',
    description: 'คำอธิบายเพิ่มเติม (ถ้ามี)',
    
    // กรณีเป็นคำถามที่มี Choice ย่อยแบบ Dynamic
    selectedSubQuestions: [
      'คำถามย่อย 1',
      'คำถามย่อย 2'
    ],
    
    // กรณีมีคำตอบ Checkbox
    answerCheckboxes: [
       { checked: true, text: 'คำตอบที่ถูก' },
       { checked: false, text: 'ตัวลวง' }
    ],

    children: [] // Recursive children
  }
];
```

## 2. กฎเหล็ก (Rules & Validation)

### A. Unique IDs
- `id` ต้องไม่ซ้ำกันในทั้งโปรเจกต์ (Best Practice) หรืออย่างน้อยที่สุดในไฟล์เดียวกัน
- format: `[Section].[Item].[SubItem]` (เช่น `202.1.1`)

### B. Selected Sub-Questions Logic
หากใช้ `selectedSubQuestions`:
- ระบบจะ render เป็น `ก.`, `ข.`, `ค.` โดยอัตโนมัติใน UI
- **ไม่ต้อง** ใส่ ก., ข. นำหน้าใน Text array

### C. Types
- ต้อง import `UINode`, `NodeType`, `DocumentMeta` จาก `./types` เสมอ
- ตรวจสอบ `NodeType` ให้ถูกประเภท (`SECTION` ใช้สำหรับหัวข้อใหญ่, `QUESTION` ใช้สำหรับข้อคำถามที่มีคำตอบ)

## 3. ขั้นตอนการเพิ่มข้อมูลใหม่
1. **ค้นหาตำแหน่ง**: ระบุตำแหน่งที่ต้องการแทรกใน Array
2. **สร้าง ID**: ดู ID ของข้อก่อนหน้า แล้ว +1 (เช่น `202.1` -> `202.2`)
3. **ตรวจสอบ Type**: เลือก `NodeType` ให้ถูกต้อง
4. **เพิ่มข้อมูล**: ใส่ `q` (คำถาม) และ `answerCheckboxes` (ถ้ามี)
