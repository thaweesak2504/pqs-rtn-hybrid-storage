---
description: skill หลักสำหรับโปรเจกต์ PQS RTN Hybrid Storage รวบรวมคำสั่งและแนวทางปฏิบัติที่สำคัญ
---

# Project Skills: PQS RTN Hybrid Storage

ยินดีต้อนรับสู่คลัง Skill ของโปรเจกต์ นี่คือชุดคำสั่งที่สรุป Best Practices ของโปรเจกต์ไว้
เมื่อได้รับงานที่เกี่ยวข้องกับหัวข้อเหล่านี้ ให้ **เปิดอ่าน Skill ไฟล์นั้นๆ ก่อนเสมอ** เพื่อให้งานเป็นไปตามมาตรฐานเดียวกัน

## สารบัญ Skill

### 1. การสร้างและจัดการหน้าคำถาม (Question Pages)
- **[Create Question Page](create_question_page/SKILL.md)**
  - ใช้เมื่อ: ต้องการสร้างหน้าจอคำถามใหม่ (เช่น `203Rcp.tsx`)
  - สิ่งที่ได้: ไฟล์ Component `.tsx` ที่มีโครงสร้างถูกต้องตาม Template มาตรฐาน (`202Lcp.tsx`)

### 2. การจัดการข้อมูล (Data Management)
- **[Manage Question Data](manage_question_data/SKILL.md)**
  - ใช้เมื่อ: ต้องการเพิ่ม แก้ไข หรือลบข้อมูลคำถามในไฟล์ `*Data.ts`
  - สิ่งที่ได้: ข้อมูลที่มีโครงสร้างถูกต้อง, `id` ไม่ซ้ำ, และ Logic `selectedSubQuestions` ที่แม่นยำ

### 3. มาตรฐาน UI และ Theme (UI Standards)
- **[UI Standards](ui_standards/SKILL.md)**
  - ใช้เมื่อ: เขียน CSS/Tailwind, จัดการ Layout, หรือทำ Dark Mode
  - สิ่งที่ได้: UI ที่สวยงาม ทันสมัย และตรงตาม Design System ของโปรเจกต์

### 4. การจัดการเอกสาร (Documentation)
- **[Normalize Docs](normalize_docs/SKILL.md)**
  - ใช้เมื่อ: จัดการไฟล์ CSV หรือ Markdown ที่ตารางข้อมูลไม่สมบูรณ์
  - สิ่งที่ได้: ไฟล์ข้อมูลที่ Clean และพร้อมสำหรับการประมวลผลต่อ
