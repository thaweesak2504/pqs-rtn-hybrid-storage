# Introduction Workflow Baseline

**Status:** Introduction Workflow Batches 1–3 Complete and Manually Verified
**Created:** 2026-08-13
**Decision confirmed:** 2026-08-17
**Batch 1B manual UI passed:** 2026-08-17
**Batch 2A manual UI passed:** 2026-08-17
**Batch 2B manual UI/accessibility passed:** 2026-08-17
**Batch 3 code/database audit completed:** 2026-08-17
**Batch 3 persistence policy approved/implemented:** 2026-08-17
**Batch 3 manual migration/UI verification passed:** 2026-08-17
**Branch:** `editor-workflow-v2`

## Scope

Introduction ในเอกสารปัจจุบันมี 4 หน้าแยกกัน:

1. `Introduction` — กล่าวนำของเอกสาร
2. `100 Introduction` — แนะนำความรู้พื้นฐาน
3. `200 Introduction` — แนะระบบ
4. `300 Introduction` — แนะนำการปฏิบัติหน้าที่

งานนี้ต้องรักษาความหมายของ Application Template/Skeleton, Sample/Source Document และ Trainee Test Copy ให้แยกจากกัน รวมทั้งคง role/view simulation ใน `ActiveDocumentPage` จนกว่าจะมีคำสั่งให้เชื่อมกับผู้ใช้จริง

## สิ่งที่ตรวจพบจาก Code

### 1. แหล่งเนื้อหาที่แสดงจริง

- `IntroductionView.tsx`, `Section100View.tsx`, `Section200View.tsx` และ `Section300View.tsx` ประกาศข้อความ Introduction แบบ hard-code ใน React
- General Introduction มีเนื้อหาเฉพาะเอกสารเพียงค่า `Documents.applied_to` ซึ่งถูกแทรกในข้อ 2 `การประยุกต์ใช้`
- ค่า `applied_to` สร้างและแก้ผ่าน Document/Create Metadata workflow และบันทึกใน SQLite
- Section 100/200/300 Introduction ไม่อ่านข้อมูลเฉพาะเอกสาร และ Footer ระบุว่าเป็นข้อมูลมาตรฐานที่ใช้กับทุกเอกสาร PQS

### 2. Role และ Editor lifecycle

- ทั้ง 4 View รับเพียง `isPreviewMode`; ไม่ได้รับ `viewMode`
- Creator, Trainee, Qualifier และ Visitor จึงเห็นเนื้อหาเดียวกัน และไม่มี inline edit lifecycle
- Creator แก้ `applied_to` ได้ทาง `Edit Metadata` ที่ Header เท่านั้น ไม่ได้เริ่มจากหน้า Introduction
- `Edit Metadata` แก้หลาย field ในครั้งเดียว จึงเป็นทางเข้าที่กว้างกว่างานแก้ข้อความ `การประยุกต์ใช้`
- Print Layout มี renderer แยกในแต่ละ View แต่ใช้ข้อมูลชุดเดียวกับหน้าปกติ

### 3. ข้อมูล Introduction ที่ seed ใน SQLite

- `seed_document_template` สร้าง Question แบบ header ใน virtual `section_id` 100, 200 และ 300
- View Introduction ปัจจุบันไม่อ่าน Question records เหล่านี้
- Simulation cloning ยังคัดลอก records ดังกล่าวเพื่อรักษา legacy virtual section IDs
- Code ปัจจุบันจึงมีสองสิ่งที่ชื่อคล้ายกัน: ข้อความ Introduction ที่แสดงจริงใน React และ legacy seeded Question headers ใน SQLite
- ห้ามนำ records เหล่านี้มาเป็นเนื้อหาที่แก้ไขได้ หรือเปลี่ยน schema/seed จนกว่าจะตรวจ usage และกำหนด migration/compatibility policy ชัดเจน

### 4. Test coverage

- ยังไม่มี focused component/integration tests สำหรับ Introduction ทั้ง 4 View
- `ActiveDocumentPage` tests ครอบคลุม navigation บางส่วน แต่ยังไม่พิสูจน์ role visibility, content authority, focus return หรือ Print parity ของ Introduction

## ข้อเสนอ UX และ Content Authority

### Recommended baseline

- ข้อความมาตรฐานของ General Introduction ข้อ 1 และ 3–7 เป็น **System Content**: แสดงทุกเอกสารและแก้ไม่ได้ใน Document Editor
- `การประยุกต์ใช้` ใน General Introduction ข้อ 2 เป็น **Document Content**: Creator แก้ได้; Trainee/Qualifier/Visitor อ่านอย่างเดียว
- Section 100/200/300 Introduction ทั้งหมดเป็น **System Content**: อ่านอย่างเดียวทุกบทบาท
- Creator ควรมีคำสั่ง `แก้ไขการประยุกต์ใช้` ที่ตำแหน่งข้อ 2 โดยตรง ไม่ต้องเปิด Metadata form ที่มี field อื่นร่วมด้วย
- การแก้ต้องใช้ native command semantics, visible focus, dirty-state text, Save/Cancel/Escape/Ctrl+S และ focus restoration ตาม contract ที่พิสูจน์ใน Phase 4
- Save ต้องเขียนค่า `Documents.applied_to` ผ่าน backend ที่มีขอบเขตชัดเจน; UI guard ไม่ใช่ authority สำหรับข้อมูลถาวร
- การบันทึกสำเร็จ Validation และข้อผิดพลาดต้องมี screen-reader announcement และเชื่อมข้อความผิดพลาดกับ field
- Print Layout และทุก read-only role ต้องสะท้อนค่าที่บันทึกล่าสุด โดยไม่แสดงคำสั่งแก้ไข

### Visual restraint

- รักษารูปแบบ Card/สีประจำ Introduction เดิมก่อน
- เอา hover treatment ที่สื่อว่า Card กดได้ออกจาก System Content
- แสดงคำสั่งแก้ไขเฉพาะ Document Content เพื่อให้ command ownership ชัดเจน
- ไม่ใช้ Tiptap หาก `applied_to` ยังเป็นข้อความบรรทัดธรรมดา; ใช้ input/textarea ที่เหมาะกับข้อมูลและลด editor lifecycle ที่ไม่จำเป็น

## สิ่งที่จะลงมือแก้

### Introduction Batch 1A — Persistent content authority

- [x] Product Owner ยืนยันว่าแก้ได้เฉพาะ General Introduction ข้อ 2 `การประยุกต์ใช้`
- [x] เพิ่ม persistent command ที่แก้เฉพาะ `Documents.applied_to`
- [x] บังคับ Source Document only และปฏิเสธ Simulation ที่ Rust/SQLite boundary รวมถึงปิดช่องทางผ่าน generic Metadata update
- [x] เพิ่ม Rust policy tests สำหรับ successful narrow update, Simulation rejection และ blank validation
- [x] เพิ่ม typed TypeScript IPC contract/service โดยยังไม่เชื่อม UI

### Introduction Batch 1B — Focused Applied-To editor

- [x] เพิ่ม focused tests เพื่อยืนยัน System Content กับ Document Content และ role visibility
- [x] ส่ง `viewMode`/Creator capability เข้า General Introduction โดยไม่เปลี่ยน role simulation
- [x] เพิ่มคำสั่ง `แก้ไขการประยุกต์ใช้` เฉพาะ Creator source-document view
- [x] เพิ่ม form lifecycle สำหรับ Save, clean Cancel, dirty Cancel/Discard, Escape, Ctrl/Cmd+physical KeyS และ focus restoration
- [x] เพิ่ม accessible label/description, linked validation และ live announcement
- [x] เชื่อม persistent command ที่มีขอบเขตเฉพาะ `applied_to` ซึ่งผ่าน Rust/SQLite policy tests จาก Batch 1A
- [x] ยืนยันด้วย automated tests ว่า Simulation, Trainee, Qualifier, Visitor และ Print เป็น read-only

### Introduction Batch 2 — Standard-content rendering and accessibility

- [x] แยก typed standard-content definitions ออกจาก JSX โดยไม่เปลี่ยนถ้อยคำหรือความหมาย
- [x] ใช้ semantic heading/list structure สม่ำเสมอทั้ง normal view และ Print Layout
- [x] เอา pointer/hover affordance ออกจาก Card ที่กดไม่ได้
- [x] เพิ่ม tests สำหรับ General/100/200/300 content order, nested list และ Print parity

### Introduction Batch 3 — Legacy virtual records audit

- [x] ระบุ consumer ทั้งหมดของ virtual Question `section_id` 100/200/300
- [x] พิสูจน์ผลต่อ new-document creation, simulation clone, export/backup และ existing documents
- [x] เสนอ retain/deprecate/migrate policy แยกจาก UX batch ใน `INTRODUCTION_LEGACY_VIRTUAL_RECORDS_AUDIT.md`
- [x] Product Owner อนุมัติ Option C: clean Skeleton, versioned exact-row migration และ dependency preflight/abort
- [x] หยุด seed virtual Introduction Questions; เอกสารใหม่มีเฉพาะ Section 101 ก่อน Creator เพิ่ม Section/Question จริง
- [x] บังคับ Simulation clone ให้ Question ทุกข้อต้อง map ไป Section จริง
- [x] เพิ่ม Migration v3 และ Rust regression tests โดยไม่เปิดแอปหรือแก้ `content.db` โดยตรง
- [x] ผ่าน Full TypeScript, ESLint, frontend test/build และ Rust test/fmt/clippy verification
- [x] ผ่าน Manual Gate หลังสำรอง Hybrid Backup: existing Source/Simulation, Introduction ทุกหน้า, clean Skeleton และ Simulation clone ถูกต้อง

## Manual Gate ที่เสนอสำหรับ Batch 1

1. เปิด Source Document ใน Creator/Edit view แล้วไป `Introduction`.
2. ยืนยันว่ามีคำสั่ง `แก้ไขการประยุกต์ใช้` เฉพาะข้อ 2 และ focus เข้าสู่ field เมื่อเปิด.
3. ทดสอบ Save, clean Cancel, dirty Cancel แล้วเลือกแก้ต่อ/ละทิ้ง, Escape และ Ctrl+S ขณะ Keyboard layout เป็นไทย.
4. หลังทุก close path ยืนยันว่า focus กลับไปยังคำสั่งต้นทาง และ Save/Validation มี announcement.
5. สลับ Trainee, Qualifier, Visitor และ Print Layout: ต้องเห็นค่าที่บันทึกล่าสุด แต่ไม่มีคำสั่งหรือ field แก้ไข.
6. เปิด Simulation copy: Introduction ต้องเป็น read-only และการกลับ Source Document ต้องไม่เปลี่ยนหรือลบ Simulation.

## Product Decision — Confirmed

Product Owner ยืนยันเมื่อ 2026-08-17 ว่า Content Authority ใช้กติกานี้:

- แก้ได้เฉพาะ General Introduction ข้อ 2 `การประยุกต์ใช้` ต่อเอกสาร
- General Introduction ข้ออื่น และ Section 100/200/300 Introduction เป็นข้อความมาตรฐานที่ล็อกไว้
