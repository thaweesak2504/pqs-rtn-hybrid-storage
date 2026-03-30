# Content Database Refactoring Progress

> เอกสารนี้บันทึกความคืบหน้าการแยกไฟล์ `content_database.rs` (God File) ออกเป็นโมดูลย่อย
> อ้างอิงแผนหลักจาก `docs/content-database-splitting-plan.md`

## สถานะรวม

| รายการ | ค่า |
|--------|-----|
| ขนาดเดิมก่อน Refactoring | **8,329** บรรทัด |
| ขนาดปัจจุบัน (หลัง Phase 4) | **5,143** บรรทัด |
| บรรทัดที่สกัดออกแล้ว | **~3,200** บรรทัด (38.3%) |
| โมดูลใหม่ที่สร้างแล้ว | **7** ไฟล์ |
| Test Cases ทั้งหมด | **55** เคส (ผ่านทุกเคสตลอด) |
| Git Branch | `content-database-splitting` |

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

## 🔲 Phase 5: แยก Questions CRUD (questions.rs)

### เป้าหมาย
สร้างไฟล์ `questions.rs` เพื่อย้ายฟังก์ชันจัดการคำถามออกจากไฟล์หลัก

### ฟังก์ชันที่ต้องย้าย
```
get_document_questions()              L302   -- ดึงคำถามทั้งหมดของเอกสาร
get_document_questions_with_details() L410   -- ดึงคำถามพร้อมรายละเอียด
create_question()                     L625   -- สร้างคำถามใหม่
update_question()                     L698   -- อัปเดตคำถาม
sync_question_sub_question_links()    L736   -- ซิงค์ SubQ Links
delete_question()                     L768   -- ลบคำถาม (recursive)
reorder_questions()                   L840   -- จัดเรียงลำดับคำถาม
get_document_with_hierarchy()         L858   -- ดึงโครงสร้างเอกสารแบบ tree
check_has_children()                  L2993  -- ตรวจว่ามี children หรือไม่
get_required_count_children()         L3007  -- ดึง required_count children
sync_required_count_children()        L3047  -- ซิงค์ required_count
```

### ความยุ่งยาก
- `create_question` เรียก `generate_uuid()` (ย้ายไปแล้ว ใช้ `super::*` ได้)
- `delete_question` ลบ cascading ลูกหลานแบบ recursive + ลบ answer keys, user answers
- `get_document_questions_with_details` มี query ซับซ้อนยาวกว่า 200 บรรทัด

---

## 🔲 Phase 6: แยก Sections CRUD (sections.rs)

### เป้าหมาย
สร้างไฟล์ `sections.rs` เพื่อย้ายฟังก์ชันจัดการหมวดหมู่

### ฟังก์ชันที่ต้องย้าย
```
create_section()                L924   -- สร้างหมวดใหม่
create_section_with_conn()      L929   -- [inner] สร้างหมวดพร้อม Connection
seed_section_300_template()     L1026  -- Seed Template สำหรับกลุ่ม 300
seed_section_200_template()     L1207  -- Seed Template สำหรับกลุ่ม 200
seed_document_template()        L259   -- Seed Template หลัก (100/200/300)
update_section()                L1268  -- อัปเดตหมวด
update_section_with_conn()      L1273  -- [inner] อัปเดตหมวดพร้อม Connection
get_sections_by_document()      L1302  -- ดึงรายการหมวดของเอกสาร
cleanup_orphaned_section_refs() L1343  -- ลบ section refs กำพร้า
delete_section()                L1475  -- ลบหมวด
delete_section_with_conn()      L1480  -- [inner] ลบหมวดพร้อม Connection
update_section_order()          L1573  -- เปลี่ยนลำดับหมวด
get_section_by_id()             L1586  -- ดึงหมวดตาม ID
get_thai_letter()               L1621  -- แปลง order เป็นอักษรไทย (ก. ข. ค.)
```

### ความยุ่งยาก
- `seed_section_300_template` ยาว ~180 บรรทัด เรียก `generate_uuid()` และทำ batch insert
- `cleanup_orphaned_section_refs` ยาว ~130 บรรทัด มี recursive CTE query
- `delete_section_with_conn` ลบ cascading questions + answer keys + user answers

---

## 🔲 Phase 7: แยก Scoring & Progress (scoring.rs)

### เป้าหมาย
สร้างไฟล์ `scoring.rs` เพื่อย้ายฟังก์ชันคำนวณคะแนนและความคืบหน้า

### ฟังก์ชันที่ต้องย้าย
```
calculate_section_total_score()         L2053  -- คำนวณคะแนนรวมหมวด
calculate_group_score()                 L2085  -- คำนวณคะแนนกลุ่ม
batch_recalculate_section_group_scores()L2115  -- Batch recalculate
update_question_score()                 L2184  -- อัปเดตคะแนนคำถาม (ซับซ้อนมาก)
recalculate_group_score_chain()         L2581  -- Chain recalculate ขึ้นไปถึง root
upsert_user_progress()                  L1975  -- Insert/Update user progress
get_user_progress()                     L2019  -- ดึง user progress
compute_section_progress()              L3251  -- คำนวณความคืบหน้าหมวด
compute_section_progress_inner()        L3261  -- [inner] ตัวคำนวณหลัก (~300 บรรทัด)
recalculate_section_progress()          L3569  -- Recalc progress (เรียกจาก frontend)
get_section_progress()                  L3609  -- ดึง progress สำหรับ UI
get_section_dev_metrics()               L3633  -- ดึงข้อมูล Developer Metrics
extract_ref_section_id()                L3244  -- ดึง section_id จาก metadata
```

### ความยุ่งยาก
- **`update_question_score()`** คือฟังก์ชันที่ซับซ้อนที่สุด (~125 บรรทัด) — จัดการ scoring ทุกรูปแบบ (normal, exempted, group_header, with section_links)
- **`compute_section_progress_inner()`** ยาว ~300 บรรทัด — คำนวณเปอร์เซ็นต์ความคืบหน้า, ผ่าน/ไม่ผ่าน, pending, needs improvement
- เรียกข้ามกันเยอะ: `update_question_score` → `recalculate_group_score_chain` → `calculate_group_score`

---

## 🔲 Phase 8: แยก Section Links & Ref Children (section_links.rs)

### เป้าหมาย
สร้างไฟล์ `section_links.rs` เพื่อย้ายฟังก์ชันจัดการ Section Links และ Section Ref Children

### ฟังก์ชันที่ต้องย้าย
```
add_question_section_link()       L2309  -- เพิ่ม link คำถาม↔หมวด
batch_add_question_section_links()L2349  -- Batch เพิ่ม links
remove_question_section_link()    L2385  -- ลบ link
remove_all_question_section_links()L2396 -- ลบ links ทั้งหมดของคำถาม
get_question_section_links()      L2407  -- ดึง links
get_question_section_links_inner()L2412  -- [inner]
get_question_section_link_by_id() L2447  -- ดึง link ตาม ID
update_section_link_score()       L2476  -- อัปเดตคะแนน link
recalculate_section_link_scores() L2490  -- Recalculate scores
get_section_ref_children()        L2670  -- ดึง Section Ref Children
get_back_referencing_section_ids()L2677  -- ดึง back-references
get_section_ref_children_inner()  L2700  -- [inner]
add_section_ref_child()           L2756  -- เพิ่ม ref child
batch_add_section_ref_children()  L2843  -- Batch เพิ่ม
remove_section_ref_child()        L2908  -- ลบ ref child
remove_all_section_ref_children() L2933  -- ลบทั้งหมด
update_section_ref_score()        L2948  -- อัปเดตคะแนน ref
thai_number()                     L2977  -- แปลงเลข → เลขไทย (ย่อ)
```

---

## 🔲 Phase 9: แยก User Answers & Answer Keys (answers.rs)

### เป้าหมาย
สร้างไฟล์ `answers.rs` เพื่อย้ายฟังก์ชันจัดการคำตอบผู้เข้ารับการฝึกและเฉลย

### ฟังก์ชันที่ต้องย้าย
```
get_trainee_answers()               L3138  -- ดึงคำตอบผู้เข้ารับการฝึก
ensure_answer_key_placeholder()     L3175  -- สร้าง placeholder answer key
save_trainee_answer()               L3199  -- บันทึกคำตอบ
save_qualifier_assessment()         L3221  -- บันทึกผลการประเมิน
clear_all_trainee_answers()         L3728  -- ล้างคำตอบทั้งหมด
get_question_answer_keys()          L3752  -- ดึงเฉลยคำถาม
update_answer_key()                 L3783  -- อัปเดตเฉลย
update_answer_key_with_conn()       L3792  -- [inner]
replace_question_answer_keys()      L3841  -- แทนที่เฉลยทั้งหมด
replace_question_answer_keys_with_conn() L3849 -- [inner]
```

---

## 🔲 Phase 10: แยก Images & Media (media.rs)

### เป้าหมาย
สร้างไฟล์ `media.rs` เพื่อย้ายฟังก์ชันจัดการรูปภาพและไฟล์แนบ

### ฟังก์ชันที่ต้องย้าย
```
upload_question_image()          L1721  -- อัปโหลดรูปภาพคำถาม (บันทึก Filesystem)
delete_question_image()          L1787  -- ลบรูปภาพ
resolve_image_path()             L1808  -- แปลง relative path → absolute
get_question_image_base64()      L1830  -- ดึงรูปเป็น Base64
bundle_reference_file()          L1629  -- แพ็ก Reference file
get_reference_by_id()            L1696  -- ดึง Reference ตาม ID
```

---

## 🔲 Phase 11: แยก Migrations (migrations.rs)

### เป้าหมาย
สร้างไฟล์ `migrations.rs` เพื่อย้ายฟังก์ชัน one-time data migration

### ฟังก์ชันที่ต้องย้าย
```
migrate_selected_sub_questions_to_table()  L79   -- ย้าย SubQ จาก JSON → table
migrate_answer_keys_to_table()             L120  -- ย้าย AnswerKeys จาก JSON → table
scrub_legacy_answer_keys_from_metadata()   L218  -- ลบ answer keys จาก metadata
```

---

## 🔲 Phase 12: แยก Internal Helpers & Policy (helpers.rs)

### เป้าหมาย
สร้างไฟล์ `helpers.rs` เพื่อย้ายฟังก์ชันตัวช่วยภายในที่เหลืออยู่

### ฟังก์ชันที่ต้องย้าย
```
get_question_section_group()                      L1865  -- ดึง section_group ของคำถาม
ensure_section_300_policy_allows_question_action() L1886  -- ตรวจ Policy สำหรับกลุ่ม 300
add_question_reference_with_conn()                 L1897  -- เพิ่ม Reference ภายใน (internal)
```

---

## 🔲 Phase สุดท้าย: ย้าย Tests

### เป้าหมาย
ย้าย `mod tests` (~1,300 บรรทัด) ที่อยู่ท้ายไฟล์ `content_database.rs` ไปกระจายตามโมดูลที่เกี่ยวข้อง หรือสร้างเป็น `tests.rs` แยกเป็นไฟล์ test โดยเฉพาะ

### หมายเหตุ
- Test Cases ส่วนใหญ่ใช้ `init_content_schema` จาก `test_helpers` ซึ่งสร้างฐานข้อมูลชั่วคราวในหน่วยความจำ
- การย้าย Tests ควรทำเป็นขั้นตอนสุดท้ายหลังจากฟังก์ชันทุกตัวถูกย้ายเรียบร้อยแล้ว
- พิจารณาว่าอาจเก็บ Tests รวมไว้ใน `tests.rs` เดียวเพื่อลดความซับซ้อนของการ import

---

## คำแนะนำสำหรับการดำเนินการต่อ

1. **ลำดับที่แนะนำ**: Phase 5 → 6 → 10 → 11 → 9 → 8 → 7 → 12 → Tests
   - เริ่มจาก Questions และ Sections ก่อนเพราะเป็นกลุ่มใหญ่ที่ชัดเจน
   - Scoring (Phase 7) ควรทำหลังสุดเพราะมี cross-dependency สูงสุด

2. **Pattern ที่ใช้ตลอด**: ย้ายฟังก์ชัน → เพิ่ม `pub mod X; pub use X::*;` → `cargo check` → `cargo test`

3. **ข้อควรระวังหลัก**:
   - ฟังก์ชันที่เป็น `fn` (private) ต้องเปลี่ยนเป็น `pub fn` ถ้ามีโมดูลอื่นเรียกใช้
   - `include_str!` paths ต้องปรับตาม directory depth ใหม่
   - ฟังก์ชันที่มี `#[cfg(test)]` ต้องระวังเรื่อง conditional compilation

4. **หลักการสำคัญ**: ทุก Phase ต้องจบด้วยการทดสอบ `cargo test` ผ่าน 100% ก่อนจะ Git Commit
