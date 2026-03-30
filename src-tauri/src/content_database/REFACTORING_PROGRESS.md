# Content Database Refactoring Progress

> เอกสารนี้บันทึกความคืบหน้าการแยกไฟล์ `content_database.rs` (God File) ออกเป็นโมดูลย่อย
> อ้างอิงแผนหลักจาก `docs/content-database-splitting-plan.md`

## สถานะรวม

| รายการ                          | ค่า                          |
| ------------------------------- | ---------------------------- |
| ขนาดเดิมก่อน Refactoring        | **8,329** บรรทัด             |
| ขนาดปัจจุบัน (หลัง Phase Final) | **109** บรรทัด               |
| บรรทัดที่สกัดออกแล้ว            | **~8,220** บรรทัด (98.7%)    |
| โมดูลใหม่ที่สร้างแล้ว           | **16** ไฟล์                  |
| Test Cases ทั้งหมด              | **55** เคส (ผ่านทุกเคสตลอด)  |
| Git Branch                      | `content-database-splitting` |
| **สถานะ**                       | **✅ เสร็จสมบูรณ์ 100%**     |

---

## ✅ Phase 1: แยก Data Structures (types.rs)

**Commit:** `refactor(content_db): phase 1 - extract structs and enums to types module`

### ไฟล์ที่สร้าง

- `types.rs` (~475 บรรทัด)

### สิ่งที่ย้าย

- `pub struct` และ `pub enum` ทั้งหมด 49 โครงสร้างรวมถึง `#[derive(...)]` macros ที่ติดอยู่
- ตัวอย่าง: `Document`, `Section`, `Question`, `QuestionDetail`, `OwnerUnit`, `UserProgress`, `ComputedSectionProgress`, `AnswerKey`, `OccupationBranch`, `OccupationSubBranch` ฯลฯ

### หมายเหตุ

- ต้องแก้ `ComputedSectionProgress` จาก `struct` เป็น `pub struct` (ฟิลด์ทุกตัวต้อง `pub` ด้วย)
- ใช้ `pub mod types; pub use types::*;` ใน `content_database.rs` เพื่อ re-export ให้ backward compatible

---

## ✅ Phase 2: แยก Core Database (connection.rs + schema.rs)

**Commit:** `refactor(content_db): phase 2 - extract connection and schema logic to dedicated modules`

### ไฟล์ที่สร้าง

- `connection.rs` (~60 บรรทัด)
- `schema.rs` (~1,023 บรรทัด)

### สิ่งที่ย้ายไป connection.rs

- `get_content_database_path()` — หาที่อยู่ไฟล์ `.db`
- `get_portable_data_dir()` — หาที่อยู่โฟลเดอร์ data แยก Dev/Release
- `get_content_connection()` — เปิด SQLite Connection + PRAGMA settings

### สิ่งที่ย้ายไป schema.rs

- `initialize_content_database()` — DDL สร้างตาราง OwnerUnits, Documents, Sections + indexes
- `initialize_question_tables()` — DDL สร้างตาราง Questions, Choices, References, UserAnswers, QuestionAnswerKeys ฯลฯ
- `seed_owner_units()` — ฝังข้อมูลหน่วยเรือจาก SQL
- `ensure_standard_occupation_branch_exists()` — สร้าง "ต้นแบบมาตรฐาน" อัตโนมัติ
- `install_standard_occupation_branch_guards()` — Triggers ป้องกันการลบ/แก้ไข
- `is_protected_main_branch()` / `is_protected_sub_branch()` — ตรวจสอบสิทธิ์
- `next_available_main_branch_code()` / `next_available_sub_branch_code()`
- `migrate_section_links_to_ref_children()` — Migration one-time
- ค่าคงที่ `STANDARD_BRANCH_NAME`, `STANDARD_BRANCH_PREFERRED_CODE`, `STANDARD_SUB_BRANCH_PREFERRED_CODE`

### หมายเหตุ

- ฟังก์ชันที่ย้ายต้อง `pub fn` เพื่อให้โมดูลอื่นเข้าถึงผ่าน `pub use schema::*;`
- `include_str!("../sql/OwnerUnits.sql")` ต้องเปลี่ยนเป็น `"../../sql/OwnerUnits.sql"` (ซ้อนลึกอีกชั้น)
- `init_branch_protection_schema` ตกลงใส่ `#[cfg(test)]` เพราะมันเรียกใช้ `test_helpers`

---

## ✅ Phase 3: แยก Utilities & References (utils.rs + references.rs)

**Commit:** `refactor(content_db): phase 3 - extract utils and references modules`

### ไฟล์ที่สร้าง

- `utils.rs` (~65 บรรทัด รวม tests)
- `references.rs` (~544 บรรทัด)

### สิ่งที่ย้ายไป utils.rs

- `generate_uuid()` — สร้าง ID ใช้ timestamp + random
- `to_thai_digit()` — แปลงตัวเลขอารบิกเป็นเลขไทย
- **Unit Tests ที่ย้ายมาด้วย**: `test_generate_uuid_length`, `test_generate_uuid_format`, `test_generate_uuid_uniqueness`, `test_to_thai_digit_single_digits`, `test_to_thai_digit_multiple_digits`, `test_to_thai_digit_negative`, `test_to_thai_digit_zero`, `test_to_thai_digit_large_numbers`

### สิ่งที่ย้ายไป references.rs

- `create_reference()` — สร้างเอกสารอ้างอิง (ทร.)
- `get_references()` — ดึงรายการเอกสารอ้างอิง
- `delete_reference()` / `delete_all_references()`
- `add_section_reference()` / `remove_section_reference()` / `get_section_references()`
- `update_reference()`
- `add_question_reference()` / `remove_question_reference()` / `update_question_reference_location()`

---

## ✅ Phase 4: แยก Documents & Branches (documents.rs + branches.rs)

**Commit:** `refactor(content_db): phase 4 - extract documents and branches modules`

### ไฟล์ที่สร้าง

- `documents.rs` (~700 บรรทัด)
- `branches.rs` (~341 บรรทัด)

### สิ่งที่ย้ายไป documents.rs

- `generate_document_id()` — สร้างรหัสเอกสาร (UUUUU+TT+L+SSS)
- `create_document()` — สร้างเอกสาร PQS ใหม่ + seed template + auto-create Section 101
- `seed_content_database_from_file()` — ฝังข้อมูลจากไฟล์ SQL
- `get_owner_units()` — ดึงรายชื่อหน่วยเรือ
- `search_documents()` — ค้นหาเอกสาร (filter by unit/type/name/status)
- `delete_document()` — ลบเอกสาร (มี Protected IDs guard)
- `update_document()` — อัปเดตข้อมูลเอกสาร
- `get_document_branch()` / `update_document_branch()` / `update_document_branch_with_conn()`
- `check_branch_usage_global()` / `check_sub_branch_usage_global()`
- `check_career_branch_usage()` — ตรวจการใช้งาน SubQ ก่อนเปลี่ยนสายวิทยาการ
- `reset_and_update_career_branch()` — รีเซ็ตคำถามและเปลี่ยนสายวิทยาการ (Transaction)
- `get_document_stats()` — สถิติสำหรับ Dashboard
- ค่าคงที่ `PROTECTED_DOCUMENT_IDS`

### สิ่งที่ย้ายไป branches.rs

- `get_occupation_branches()` / `create_occupation_branch()` / `update_occupation_branch()` / `delete_occupation_branch()`
- `get_occupation_sub_branches()` / `create_occupation_sub_branch()` / `update_occupation_sub_branch()` / `delete_occupation_sub_branch()`
- `get_occupation_sub_questions()` / `get_all_sub_questions_for_branch()` / `create_occupation_sub_question()` / `update_occupation_sub_question()` / `delete_occupation_sub_question()`
- `get_sub_question_usage_counts()`

### หมายเหตุ

- `update_document_branch_with_conn` ต้องเป็น `pub fn` เพราะ `mod tests` ใน `content_database.rs` เรียกใช้โดยตรง

---

## ✅ Phase 5: แยก Questions CRUD (questions.rs)

**สถานะ:** ✅ เสร็จสมบูรณ์

### ไฟล์ที่สร้าง

- `questions.rs` (~850 บรรทัด)

### ฟังก์ชันที่ย้ายแล้ว

- `get_document_questions()` — ดึงคำถามทั้งหมดของเอกสาร
- `get_document_questions_with_details()` — ดึงคำถามพร้อมรายละเอียด (query ซับซ้อน ~200 บรรทัด)
- `create_question()` — สร้างคำถามใหม่
- `update_question()` — อัปเดตคำถาม
- `sync_question_sub_question_links()` — ซิงค์ SubQ Links
- `delete_question()` — ลบคำถาม (recursive cascading)
- `reorder_questions()` — จัดเรียงลำดับคำถาม
- `get_document_with_hierarchy()` — ดึงโครงสร้างเอกสารแบบ tree
- `check_has_children()` — ตรวจว่ามี children หรือไม่
- `get_required_count_children()` — ดึง required_count children
- `sync_required_count_children()` — ซิงค์ required_count

### หมายเหตุ

- ใช้ `use super::*;` เพื่อเข้าถึง `generate_uuid()` และ types อื่นๆ
- `delete_question` ลบ cascading: answer keys, user answers, section links

---

## ✅ Phase 6: แยก Sections CRUD (sections.rs)

**สถานะ:** ✅ เสร็จสมบูรณ์

### ผลลัพธ์สุดท้าย

**ไฟล์หลัก `content_database.rs`:**

- **ก่อน:** 8,329 บรรทัด (God File)
- **หลัง:** 109 บรรทัด (module declarations + thin wrappers)
- **ลดลง:** 98.7%

**โครงสร้างโมดูลใหม่:**

```
content_database/
├── types.rs              (~475 บรรทัด)  - Data structures
├── connection.rs         (~60 บรรทัด)   - Database connection
├── schema.rs             (~1,023 บรรทัด) - Schema & initialization
├── references.rs         (~544 บรรทัด)  - Document references
├── utils.rs              (~65 บรรทัด)   - Utilities
├── branches.rs           (~341 บรรทัด)  - Occupation branches
├── documents.rs          (~700 บรรทัด)  - Document CRUD
├── questions.rs          (~850 บรรทัด)  - Questions CRUD
├── sections.rs           (~780 บรรทัด)  - Sections CRUD + templates
├── scoring.rs            (~920 บรรทัด)  - Scoring & progress
├── section_links.rs      (~680 บรรทัด)  - Section links & ref children
├── answers.rs            (~270 บรรทัด)  - User answers & answer keys
├── media.rs              (~230 บรรทัด)  - Images & media files
├── migrations.rs         (~190 บรรทัด)  - Data migrations
├── helpers.rs            (~85 บรรทัด)   - Cross-module helpers
└── tests.rs              (~1,240 บรรทัด) - Integration tests
```

### การทดสอบ

- ✅ **55 test cases** ผ่านทั้งหมด
- ✅ `cargo check` — compile สำเร็จ (warnings เดิมจาก unused imports)
- ✅ `cargo test` — ทุก test ผ่าน 100%
- ✅ `npm start` (tauri dev) — แอปพลิเคชันทำงานปกติ

### Pattern ที่ใช้ตลอด

1. สร้างไฟล์โมดูลใหม่ใน `content_database/`
2. ย้ายฟังก์ชันที่เกี่ยวข้อง (เปลี่ยน `fn` → `pub fn` ถ้าจำเป็น)
3. เพิ่ม `use super::*;` สำหรับ imports
4. เพิ่ม `pub mod X;` และ `pub use X::*;` ใน `content_database.rs`
5. สร้าง thin wrappers สำหรับ `#[tauri::command]` ถ้าจำเป็น
6. รัน `cargo check` และ `cargo test`
7. Commit เมื่อ tests ผ่านทั้งหมด

### ข้อควรระวังที่พบ

- ฟังก์ชัน `#[tauri::command]` ต้องอยู่ใน `content_database.rs` เท่านั้น → ใช้ thin wrappers
- `include_str!` paths ต้องปรับ relative path (เพิ่ม `../`)
- Selective re-export: บางฟังก์ชันไม่ควร re-export ทั้งหมด (ใช้ `pub use module::{specific_fn}`)
- Test module ต้องใช้ `#[cfg(test)] mod tests;` แทน inline `mod tests { ... }`

### ประโยชน์ที่ได้รับ

1. **Maintainability** — แต่ละโมดูลมีหน้าที่ชัดเจน ง่ายต่อการหาและแก้ไข
2. **Readability** — ไฟล์เล็กลง อ่านเข้าใจง่ายขึ้น
3. **Testability** — Tests แยกออกมาชัดเจน
4. **Scalability** — เพิ่มฟีเจอร์ใหม่ได้ง่ายโดยไม่กระทบโมดูลอื่น
5. **Collaboration** — หลายคนทำงานพร้อมกันได้โดยไม่ conflict

---

## ✅ Refactoring เสร็จสมบูรณ์ 100%

**วันที่เสร็จ:** 30 มีนาคม 2026  
**Git Branch:** `content-database-splitting`  
**สถานะ:** พร้อม merge เข้า main branch
