---
description: หลักการพัฒนาโปรเจกต์ PQS RTN Hybrid Storage (Project Principles)
---

# PQS RTN Hybrid Storage — Project Principles

โปรเจกต์นี้คือระบบจัดการ PQS (Personal Qualification Standard) ของกองทัพเรือ
พัฒนาด้วย **React + TypeScript + Vite + Tauri** รองรับ Dark/Light Mode

---

## หลักการหลัก (Core Principles)

### 1. Example Files คือแนวทาง ไม่ใช่ข้อบังคับ
- ไฟล์ใน `src/example/` เป็นตัวอย่างประกอบ เพื่อให้เข้าใจ Pattern ของโปรเจกต์
- **ไม่จำเป็นต้อง copy ทุกบรรทัด** — ปรับตามความเหมาะสมของเนื้อหาแต่ละ Section ได้
- ถ้ามีสองตัวอย่างที่ต่างกัน ให้ใช้ตัวที่ใหม่กว่า (ไฟล์ขนาดใหญ่กว่า = feature ครบกว่า)

### 2. ความสม่ำเสมอเหนือความสมบูรณ์แบบ
- ให้ผลลัพธ์ทำงานได้และดูสอดคล้องกัน มากกว่าเน้น pixel-perfect

### 3. Dark Mode ต้องผ่านเสมอ
- ทุก Component ที่สร้างหรือแก้ไขต้องทดสอบทั้ง Light และ Dark Mode
- ใช้ CSS variables `github-bg-*` ที่กำหนดไว้ใน `src/index.css` — ไม่ hardcode สี

### 4. Thai Language First
- ตัวเลขในเอกสาร PQS ใช้เลขไทย (๑, ๒, ๓...) และอักษรไทย (ก, ข, ค...)
- Font หลัก: `TH Sarabun New` ในส่วนที่เป็นเอกสาร

---

## โครงสร้าง Section

| Section | สี | เนื้อหา |
|---|---|---|
| **001** | — | Introduction |
| **100** | 🟢 Green | ความรู้พื้นฐาน |
| **200** | 🟠 Orange | ระบบและอุปกรณ์ (มี Answer Key) |
| **300** | 🟣 Purple | การปฏิบัติ (ไม่มี Answer Key, มีระบบ Pass/Fail) |

---

## กฎที่ห้ามทำ (Hard Rules)

- **ห้ามใช้ `window.confirm()` หรือ `alert()`** — ใช้ Custom Modal แทน
- **ห้าม hardcode สี** บน outer container — ใช้ CSS variables
- **ห้ามสร้าง ID ซ้ำ** ใน Data files (`*Data.ts`) ของ section เดียวกัน

---

## Workflow

- `/cleanup-terminals` — ล้าง background terminal processes ที่ค้างอยู่

---

## Automated Actions (กฎการทำงานอัตโนมัติ)

### 1. การทดสอบหลังแก้ไข Code (Post-Edit Testing)
- ทุกครั้งที่มีการแก้ไข Code (แก้ไขไฟล์ .tsx, .ts, .rs) ให้เลือกทำ Tests ที่เกี่ยวข้อง หรือทั้งหมดทันที
- **คำสั่งสำหรับ Frontend:** `npm run test:run`
- **คำสั่งสำหรับ Backend (Rust):** `powershell -ExecutionPolicy Bypass -File scripts/run-rust-tests.ps1`
- **สำคัญ:** หาก Tests ไม่ผ่าน ให้พยายามแก้ไของค์ประกอบที่ทำให้ Test ไม่ผ่านก่อนแจ้ง User

### 2. การ Commit และ Push (Commit and Push)
- เมื่อ Tests ทั้งหมดผ่านแล้ว ให้สอบถาม User เพื่อขออนุญาต Commit และ Push
- **รูปแบบการสอบถาม:** "Tests ผ่านทั้งหมดแล้ว ต้องการให้ Commit และ Push การแก้ไขนี้เลยหรือไม่?"
- **ห้าม** Commit หรือ Push โดยไม่ได้รับอนุญาตจาก User เป็นรายครั้ง
- **Commit Message:** ให้สรุปสิ่งที่ทำสั้นๆ เป็นภาษาอังกฤษ (Conventional Commits format)
