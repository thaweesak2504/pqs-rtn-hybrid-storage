# Career Branch Management Implementation Plan (Revised)

แผนงานนี้สรุปความต้องการและการออกแบบระบบสำหรับการจัดการสาขาอาชีพใหม่ (Career Branch) โดย Admin เพื่อใช้เตรียมความพร้อมก่อนเริ่มงานจริงในเซสชันถัดไป

## 1. แนวคิดและหลักการ (Core Concepts)

- **"ต้นแบบมาตรฐาน" (Standard Template)**:
    - เป็นข้อมูลชุดเริ่มแรกที่ห้ามแก้ไขถาวร (Protect by SQLite Triggers)
    - ใช้เป็นตัวอย่างนำ (Reference) ในการสร้างสาขาใหม่
- **โครงสร้างสาขาใหม่**:
    - ต้องประกอบด้วย **สาขาหลัก (Main Branch)** และ **สาขาย่อย (Sub Branch)** เสมอ
    - สาขาหลัก 1 สาขา สามารถมีได้หลายสาขาย่อย
- **Admin Only**:
    - เฉพาะผู้ใช้ที่มีสิทธิ `admin` เท่านั้นที่สามารถสร้างหรือจัดการสาขาอาชีพได้
    - Editor และ Creator มีสิทธิ์เพียงเลือกใช้ (Select) จากรายการที่ Admin เตรียมไว้ให้เท่านั้น

## 2. ความแตกต่างของ Sub-Question List ตาม Section

| คุณสมบัติ | 200-series (2xx.2, 2xx.4) | 300-series (3xx.2-5) |
| :--- | :--- | :--- |
| **ลักษณะคำถาม** | การ **"อธิบาย"** (ส่วนประกอบ/ค่าทำงาน) | การ **"ทดสอบปฏิบัติ"** |
| **Default ก่อสร้าง** | **ว่างเปล่า** (เริ่มที่ 0 รายการ) | มีข้อ **"ลงมือปฏิบัติ"** เตรียมไว้ให้ |
| **ข้อบังคับ** | ไม่มี (อิสระ 100%) | **ข้อสุดท้ายต้องเป็น "ลงมือปฏิบัติ"** เสมอ |
| **กฎการแก้ไข** | เพิ่ม/ลบ/ย้ายลำดับ ได้ทั้งหมด | ย้ายลำดับได้ ยกเว้นข้อสุดท้าย (Locked) |

---

## 3. รายละเอียดการพัฒนา (Phase 1: Backend)

### 3.1 เพิ่ม Data Structures (`types.rs`)
- เพิ่ม `BatchSubQuestionItem` สำหรับรับข้อมูลหลายรายการพร้อมกัน

### 3.2 เพิ่ม Commands ใน `branches.rs`
- `reorder_occupation_sub_questions(ids: Vec<i64>)`: อัปเดตลำดับ (sequence) ตาม array ของ ID
- `batch_create_occupation_sub_questions(items: Vec<BatchSubQuestionItem>)`: สร้าง sub-questions หลายรายการในครั้งเดียว
- `get_standard_branch_sub_questions()`: ดึงข้อมูล sub-questions ของ "ต้นแบบมาตรฐาน" มาเป็น reference

---

## 4. รายละเอียดการพัฒนา (Phase 2: Frontend Layout)

### 4.1 CareerBranchManagerModal.tsx (หัวใจหลัก)
- **Side-by-Side View**: ฝั่งซ้ายแสดง "ต้นแบบมาตรฐาน" (Read-only) ฝั่งขวาเป็นตัวแก้ไข (Editor)
- **Step-by-Step Flow**:
    1. เลือก/สร้างสาขาหลัก
    2. เลือก/สร้างสาขาย่อย
    3. จัดการรายการคำถามย่อย (6 Tabs: 2xx.2, 2xx.4, 3xx.2, 3xx.3, 3xx.4, 3xx.5)
- **Drag & Drop / Up-Down UI**: ปุ่ม ▲▼ สำหรับเรียงลำดับ (ยกเว้นข้อท้าย 300)

### 4.2 EditMetadataModal.tsx (Gating)
- ตรวจสอบ `userRole` จาก `AuthContext`
- ซ่อนปุ่ม Add/Edit/Delete สาขาสำหรับ Editor/Creator
- เพิ่มปุ่ม "จัดการสาขาอาชีพ" สำหรับ Admin เท่านั้น

---

## 5. แผนการตรวจสอบ (Verification)
- **Backend Tests**: ทดสอบ Reorder logic และ Batch creation ใน `tests.rs`
- **Manual Check**:
    - Admin: สร้างสาขาใหม่ -> จัดการ 200 (ว่าง) และ 300 (มีข้อท้ายล้น) -> บันทึก -> ตรวจสอบในหน้า Editor จริง
    - Editor: เข้าหน้า Metadata -> ตรวจสอบว่าไม่สามารถแก้ไขสาขาได้

---
*หมายเหตุ: แผนงานนี้ถูกจัดเก็บไว้เพื่อเตรียมพร้อมสำหรับการทำงานในเซสชันถัดไป*
