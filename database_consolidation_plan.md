# Refactoring Plan: Database Consolidation & Image Storage Analysis

## 📋 สถานะปัจจุบัน — สิ่งที่ค้นพบจากการวิจัย

### 1. ระบบ Database ปัจจุบัน (2 ไฟล์ SQLite แยกกัน)

| Database | ไฟล์ | ตำแหน่ง | หน้าที่ |
|----------|------|---------|---------|
| **Main DB** (`database.db`) | [database.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/database.rs) | `AppData/pqs-rtn-hybrid-storage/database.db` | จัดการ Users, Authentication, High-Ranking Officers |
| **Content DB** (`content.db`) | [content_database/](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/content_database.rs) | `AppData/pqs-rtn-hybrid-storage/content.db` | จัดการ Documents, Questions, Sections, References, Branches, Scoring, Answers |

#### Main DB — `database.db` (ขนาดเล็ก, ข้อมูลน้อย)
| ตาราง | จำนวน Columns | หน้าที่ |
|-------|---------------|---------|
| `users` | 14 | ข้อมูลผู้ใช้ + avatar metadata (path, mime, size) |
| `high_ranking_officers` | 10 | ข้อมูลนายทหารระดับสูง + avatar metadata |

#### Content DB — `content.db` (ขนาดใหญ่, ข้อมูลเยอะ)
| ตาราง | หน้าที่ |
|-------|---------|
| `OwnerUnits` | หน่วยเจ้าของ PQS |
| `Documents` | เอกสาร PQS |
| `Sections` | ส่วนของเอกสาร (100, 200, 300 series) |
| `Questions` | คำถามในแต่ละ Section |
| `QuestionChoices` | ตัวเลือกคำตอบ |
| `QuestionReferences` | การอ้างอิงคำถาม |
| `QuestionSectionLinks` | ลิงก์ระหว่าง Question กับ Section |
| `QuestionSubQuestionLinks` | ลิงก์ Sub-questions |
| `QuestionAnswerKeys` | เฉลยคำตอบ |
| `UserAnswers` | คำตอบของผู้ใช้ |
| `UserProgress` | ความก้าวหน้าของผู้ใช้ |
| `DocumentReferences` | เอกสารอ้างอิง |
| `SectionReferences` | ลิงก์ Section-Reference |
| `OccupationBranches` | สาขาอาชีพหลัก |
| `OccupationSubBranches` | สาขาอาชีพย่อย |
| `OccupationSubQuestions` | Sub-questions ตามสาขา |
| `OccupationSlotCompletion` | สถานะการเสร็จสิ้น |

---

### 2. ระบบ Image/Media Storage ปัจจุบัน (File-based, ไม่เก็บใน DB)

> [!IMPORTANT]
> รูปภาพ **ไม่ได้เก็บอยู่ใน Database** แต่เก็บเป็น **ไฟล์แยกบน Filesystem** — ใน DB เก็บแค่ metadata (path, mime, size) เท่านั้น

มี **3 ประเภท** ของ media ที่จัดเก็บแยกกัน:

| ประเภท | ตำแหน่งไฟล์ | DB ที่เก็บ Metadata | จัดการโดย |
|--------|------------|-------------------|----------|
| **User Avatars** | `AppData/.../media/avatars/` | `database.db` → `users.avatar_path` | [hybrid_avatar.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/hybrid_avatar.rs) + [file_manager.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/file_manager.rs) |
| **Officer Avatars** | `AppData/.../media/high_ranks/` | `database.db` → `high_ranking_officers.avatar_path` | [hybrid_high_rank_avatar.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/hybrid_high_rank_avatar.rs) + [file_manager.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/file_manager.rs) |
| **Question Images** | `data/{doc_id}/question-images/` | `content.db` → `Questions.metadata` (JSON) | [media.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/content_database/media.rs) |

#### ทำไมเก็บรูปแยก Filesystem? (เดิมเคยเก็บเป็น BLOB ใน DB)
- โปรเจกต์เคยมี `avatars` table ที่เก็บรูปเป็น BLOB binary ใน SQLite (**ถูกลบไปแล้ว**)
- ย้ายมาเป็น **File-based** storage เพราะ:
  - ✅ SQLite ไม่เหมาะกับ BLOB ขนาดใหญ่ (ทำให้ DB ขนาดใหญ่, backup ช้า)
  - ✅ File-based อ่าน/เขียนเร็วกว่า, ใช้ memory น้อยกว่า
  - ✅ รองรับ Streaming upload/download (8KB chunks)
  - ✅ Portable ง่ายกว่า (copy ไฟล์ + DB metadata ไปด้วยกัน)

---

## 🔍 วิเคราะห์ข้อดี/ข้อเสียของการรวม DB

### Option A: รวมเป็น DB เดียว (`content.db` รับ tables ทั้งหมด)

#### ✅ ข้อดี
1. **ง่ายต่อการจัดการ** — เปิด connection เดียว, ลดความซับซ้อนของ code
2. **Backup/Restore ง่ายกว่า** — backup ไฟล์เดียว (ปัจจุบัน `hybrid_backup.rs` backup แค่ `database.db` + `media/`, **ไม่ได้ backup `content.db`!** 🔴)
3. **Foreign Key integrity** — `UserAnswers.user_id` ปัจจุบันไม่มี FK ข้าม DB ได้ (เพราะอยู่คนละ DB)
4. **ลด code duplication** — ปัจจุบันมี `get_connection()` กับ `get_content_connection()` แยกกัน, PRAGMA config ซ้ำกัน
5. **Transaction across domains** — ทำ transaction ข้าม users + content ได้

#### ❌ ข้อเสีย / ความเสี่ยง
1. **Breaking change สำหรับ users ที่มีข้อมูลอยู่แล้ว** — ต้องมี migration plan
2. **Effort สูง** — ต้องแก้ไขหลายไฟล์ (~15-20 files)
3. **Backup system ต้อง update** — `hybrid_backup.rs`, `database_backup.rs`, `database_export.rs` ทั้งหมด
4. **Risk ของ regression** — อาจเกิด bug ในขณะ refactor

> [!WARNING]
> **พบปัญหาสำคัญ**: ระบบ Backup ปัจจุบัน (`hybrid_backup.rs`) backup เฉพาะ `database.db` + `media/` **แต่ไม่ได้ backup `content.db`!** นี่คือ bug ที่ต้องแก้ไขไม่ว่าจะรวม DB หรือไม่

### Option B: คงไว้ 2 DB แต่แก้ Backup Bug

#### ✅ ข้อดี
1. **Risk ต่ำ** — ไม่ต้อง migrate ข้อมูล
2. **Separation of Concerns** — User management แยกจาก Content management
3. **เร็ว** — แค่เพิ่ม `content.db` เข้า backup process

#### ❌ ข้อเสีย
1. **ยังคงมีความซับซ้อนจาก 2 connections**
2. **ไม่สามารถ FK ข้าม DB ได้**
3. **Code duplication ยังอยู่**

---

## 🎯 คำแนะนำ: Option A — รวมเป็น DB เดียว

เหตุผลหลัก:
1. **Main DB มีแค่ 2 tables** (`users` + `high_ranking_officers`) — ย้ายง่ายมาก
2. **Bug ใน backup system** — การรวม DB จะแก้ปัญหานี้ถาวร
3. **Long-term maintainability** — ลดความซับซ้อนของ codebase อย่างมาก

## User Review Required

> [!IMPORTANT]
> **ต้องตัดสินใจ**: ต้องการดำเนินการ Option A (รวม DB) หรือ Option B (คง 2 DB, แก้ backup)? 
> 
> ถ้าเลือก Option A จะมีขั้นตอนดังนี้

> [!CAUTION]
> **ผลกระทบต่อ Existing Data**: Users ที่มีข้อมูลอยู่แล้วจะต้อง run migration script เพื่อย้าย `users` + `high_ranking_officers` จาก `database.db` → `content.db` — ต้องมี migration wizard ในแอป

---

## 📐 Proposed Changes (Option A: Consolidation)

### Phase 1: เตรียม Migration Infrastructure

#### [MODIFY] [schema.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/content_database/schema.rs)
- เพิ่ม `users` table และ `high_ranking_officers` table ใน `initialize_content_database()`
- เพิ่ม migration function สำหรับย้ายข้อมูลจาก `database.db` → `content.db`

#### [MODIFY] [connection.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/content_database/connection.rs)
- ปรับ `get_content_connection()` ให้รวม PRAGMA config จาก `get_connection()` ที่ดีกว่า
- เพิ่ม `get_connection_safe()` variant สำหรับ content DB

---

### Phase 2: ย้าย User/Auth Operations

#### [MODIFY] [database.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/database.rs)
- เปลี่ยน `get_connection()`, `get_connection_safe()`, `get_connection_readonly()` ให้ชี้ไป `content.db`
- **หรือ** redirect ไปใช้ `get_content_connection()` แทน
- ย้าย `initialize_database()` logic เข้า `initialize_content_database()`

#### [MODIFY] [hybrid_avatar.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/hybrid_avatar.rs)
- เปลี่ยน `use crate::database::get_connection_safe` → ใช้ unified connection

#### [MODIFY] [hybrid_high_rank_avatar.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/hybrid_high_rank_avatar.rs)
- เปลี่ยน `use crate::database::get_connection_safe` → ใช้ unified connection

---

### Phase 3: ปรับ Backup System

#### [MODIFY] [hybrid_backup.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/hybrid_backup.rs)
- แก้ `create_hybrid_backup()` — เปลี่ยนจาก backup `database.db` เป็น `content.db`
- แก้ `import_backup()` — restore `content.db` แทน `database.db`
- **ไม่ว่าจะเลือก Option ไหน backup bug นี้ต้องแก้**

#### [MODIFY] [database_backup.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/database_backup.rs)
- ปรับเส้นทางไฟล์ให้ชี้ไป unified DB

#### [MODIFY] [database_export.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/database_export.rs)
- รวม export logic ให้ครอบคลุมทุก table

---

### Phase 4: Cleanup

#### [MODIFY] [main.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/main.rs)
- ปรับ setup flow: ลบ `database::initialize_database()` ที่ซ้ำซ้อน
- รวม initialization เหลือที่เดียว

#### [DELETE] old `database.db` file (after successful migration)
- เพิ่ม cleanup routine ลบไฟล์เก่า

---

## 📊 สรุปสถานะ Image Storage

| คำถาม | คำตอบ |
|--------|-------|
| **ปัจจุบันเก็บรูปด้วยอะไร?** | **File-based** — เก็บเป็นไฟล์ `.jpg/.png/.webp` บน disk |
| **เคยเก็บด้วย DB ไหม?** | เคย — มี `avatars` table (BLOB) แต่ถูกลบและ migrate ไป file-based แล้ว |
| **DB เก็บอะไรเกี่ยวกับรูป?** | เก็บแค่ **metadata**: `avatar_path`, `avatar_mime`, `avatar_size`, `avatar_updated_at` |
| **ต้องเปลี่ยนวิธีเก็บรูปไหม?** | ❌ **ไม่ต้อง** — File-based เป็นวิธีที่ถูกต้องอยู่แล้วสำหรับ desktop app |

---

## Open Questions

> [!IMPORTANT]
> 1. **ต้องการดำเนินการรวม DB (Option A) หรือแก้แค่ Backup Bug (Option B)?**
> 2. **มี users ที่ใช้ระบบจริงอยู่แล้วที่ต้องคำนึงถึงการ migrate ข้อมูลไหม?**
> 3. **ต้องการ backward compatibility กับ backup ไฟล์เก่า (format `database.db`) ไหม?**

## Verification Plan

### Automated Tests
- Run `cargo test` ทุก test case ที่มีอยู่ (~84KB tests in content_database/tests.rs)
- ตรวจสอบว่า migration script ทำงานถูกต้อง
- ทดสอบ backup/restore flow หลัง refactor

### Manual Verification
- ทดสอบ login/logout flow
- ทดสอบ avatar upload/delete
- ทดสอบ content CRUD operations
- ทดสอบ backup → restore cycle
