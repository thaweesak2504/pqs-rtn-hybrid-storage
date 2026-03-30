# content_database.rs — Splitting Plan

> Created: 2026-03-16 | Status: Planning | File: `src-tauri/src/content_database.rs`

---

## 1. ทำไมถึงใหญ่ขนาดนี้?

### สถิติปัจจุบัน

| Metric                 | Value                                                 |
| ---------------------- | ----------------------------------------------------- |
| **Total Lines**        | **7,079**                                             |
| Public Functions       | 92                                                    |
| Private Functions      | 28                                                    |
| **Total Functions**    | **120**                                               |
| Structs/Enums          | 49                                                    |
| Test Lines (mod tests) | ~1,236 (L5848-7078, 17.5%)                            |
| Largest Function       | `initialize_question_tables` (481 lines — schema DDL) |

### สาเหตุที่ใหญ่

1. **"God File" Pattern** — ทุก operation ที่เกี่ยวข้องกับ `content.db` ถูกรวมอยู่ในไฟล์เดียว ไม่มีการแบ่ง module
2. **Domain Mixing** — 13 domain ที่แตกต่างกันอยู่ด้วยกัน (documents, sections, questions, references, occupation, scoring, assessment, etc.)
3. **Inline Structs** — struct definitions 49 ตัวอยู่กระจายทั่วไฟล์ แทนที่จะรวมไว้ที่เดียว
4. **Massive Schema Init** — `initialize_question_tables()` เป็น function เดียว 481 lines ที่สร้าง tables + triggers + migrations ทั้งหมด
5. **Tests อยู่ในไฟล์เดียวกัน** — `mod tests` 1,236 lines อยู่ท้ายไฟล์
6. **Organic Growth** — features เพิ่มต่อเนื่อง (occupation branches, section refs, required count, answer keys, scoring chain) โดยไม่มีการ refactor

### ใครใช้ไฟล์นี้?

| Consumer              | References | หมายเหตุ                                      |
| --------------------- | ---------- | --------------------------------------------- |
| `main.rs`             | 141        | Thin wrappers → `#[tauri::command]` functions |
| `migration_helper.rs` | 1          | ใช้แค่ `get_content_connection`               |

**ข้อสังเกต:** `main.rs` import 126 items (38 structs + 88 functions) จาก `content_database` — ทุกอย่างผ่าน `crate::content_database::xxx`

---

## 2. การแบ่ง Domain (Line Distribution)

```
L1-190      (190 lines,  2.7%)  Imports + Occupation Branch Guards
L191-399    (209 lines,  3.0%)  Init: path, connection, initialize_content_database
L400-800    (401 lines,  5.7%)  Documents: CRUD, search, branch, stats
L801-1540   (740 lines, 10.5%)  Questions: Schema DDL + Migrations
L1541-2115  (575 lines,  8.1%)  Questions: CRUD (get, create, update, delete)
L2116-2183  ( 68 lines,  1.0%)  Documents: get_document_with_hierarchy
L2184-2720  (537 lines,  7.6%)  Sections: Types + CRUD + Templates + Ordering
L2721-3570  (850 lines, 12.0%)  References: Types + CRUD + Section/Question Refs
L3571-3815  (245 lines,  3.5%)  Occupation: Branches + SubBranches + SubQuestions
L3816-4033  (218 lines,  3.1%)  Scoring: User Progress + Section Scores
L4034-4153  (120 lines,  1.7%)  Questions: update_question_score (complex)
L4154-4497  (344 lines,  4.9%)  Section Links: CRUD + Recalculate
L4498-4877  (380 lines,  5.4%)  Section Ref Children: CRUD + Migrate + Chain
L4878-5021  (144 lines,  2.0%)  Required Count: check + get + sync
L5022-5640  (619 lines,  8.7%)  Assessment: Trainee + Qualifier + Progress Compute
L5641-5842  (202 lines,  2.9%)  Answer Keys: get + update + replace
L5848-7078  (1236 lines, 17.5%) Tests (mod tests)
```

---

## 3. แผนแยกไฟล์ (Proposed Module Structure)

### สรุปไฟล์ใหม่ที่จะเกิดขึ้น

| ไฟล์ใหม่            | บรรทัดโดยประมาณ | Functions | Structs | หมายเหตุ                     |
| ------------------- | --------------- | --------- | ------- | ---------------------------- |
| `mod.rs`            | ~80             | 0         | 0       | Re-exports only              |
| `connection.rs`     | ~80             | 3         | 0       | DB path + connection + utils |
| `schema.rs`         | ~750            | 5         | 0       | DDL + migrations + seed      |
| `types.rs`          | ~450            | 0         | 49      | All struct/enum definitions  |
| `documents.rs`      | ~400            | 14        | 0       | Document CRUD + hierarchy    |
| `sections.rs`       | ~540            | 12        | 0       | Section CRUD + templates     |
| `questions.rs`      | ~580            | 9         | 0       | Question CRUD + score update |
| `references.rs`     | ~620            | 18        | 0       | References + images          |
| `occupation.rs`     | ~380            | 19        | 0       | Branches + guards            |
| `scoring.rs`        | ~500            | 8         | 0       | Progress + group scores      |
| `section_links.rs`  | ~290            | 10        | 0       | Question-section links       |
| `section_refs.rs`   | ~350            | 9         | 0       | Section ref children         |
| `required_count.rs` | ~150            | 4         | 0       | Required count sync          |
| `assessment.rs`     | ~400            | 13        | 0       | Trainee + qualifier          |
| **รวม 14 ไฟล์**     | **~5,570**      | **120**   | **49**  | **(ไม่รวม tests)**           |

**หมายเหตุ:** แต่ละไฟล์จะมี `#[cfg(test)] mod tests` ของตัวเอง รวม ~1,200 lines tests กระจายไปตาม domain

### เป้าหมาย: เปลี่ยนจาก single file → directory module

```
src-tauri/src/
├── content_database/          ← NEW directory module
│   ├── mod.rs                 ← Re-exports ทุกอย่าง (backward compat)
│   ├── connection.rs          ← DB path, connection, constants
│   ├── schema.rs              ← Schema DDL, migrations, seed
│   ├── types.rs               ← All 49 structs + enums
│   ├── documents.rs           ← Document CRUD, search, hierarchy, stats
│   ├── sections.rs            ← Section CRUD, templates, ordering
│   ├── questions.rs           ← Question CRUD, reorder, score update
│   ├── references.rs          ← Reference CRUD, section/question refs, images
│   ├── occupation.rs          ← Branches, sub-branches, sub-questions, guards
│   ├── scoring.rs             ← Progress, group scores, section scores, chain
│   ├── section_links.rs       ← Question-section links, recalculate
│   ├── section_refs.rs        ← Section ref children, migrate, back-refs
│   ├── required_count.rs      ← Required count children, sync
│   ├── assessment.rs          ← Trainee answers, qualifier, compute progress
│   └── answer_keys.rs         ← Answer keys CRUD
├── content_database.rs        ← DELETE (replaced by directory module)
```

### ขนาดไฟล์โดยประมาณ

| ไฟล์                | Functions | Structs | Lines โดยประมาณ | หมายเหตุ                                                                                  |
| ------------------- | --------- | ------- | --------------- | ----------------------------------------------------------------------------------------- |
| `mod.rs`            | 0         | 0       | ~80             | `pub mod` + `pub use` re-exports only                                                     |
| `connection.rs`     | 3         | 0       | ~80             | `get_content_database_path`, `get_portable_data_dir`, `get_content_connection`            |
| `schema.rs`         | 5         | 0       | ~750            | `initialize_content_database`, `initialize_question_tables`, `seed_*`, migrations         |
| `types.rs`          | 0         | 49      | ~450            | All struct/enum definitions consolidated                                                  |
| `documents.rs`      | 14        | 0       | ~400            | Document CRUD + search + hierarchy + stats                                                |
| `sections.rs`       | 12        | 0       | ~540            | Section CRUD + templates + ordering + section_total_score                                 |
| `questions.rs`      | 9         | 0       | ~580            | Question CRUD + reorder + update_question_score                                           |
| `references.rs`     | 14+4      | 0       | ~620            | Reference CRUD + section/question refs + images (bundle, upload, delete, resolve, base64) |
| `occupation.rs`     | 19        | 0       | ~380            | Branches + sub-branches + sub-questions + guards + constants                              |
| `scoring.rs`        | 8         | 0       | ~500            | Progress + group scores + chain recalculate + compute_section_progress                    |
| `section_links.rs`  | 10        | 0       | ~290            | Question-section links + recalculate                                                      |
| `section_refs.rs`   | 9         | 0       | ~350            | Section ref children + migrate + back-refs                                                |
| `required_count.rs` | 4         | 0       | ~150            | check_has_children + required count + sync                                                |
| `assessment.rs`     | 13        | 0       | ~400            | Trainee answers + qualifier + answer keys + sub-Q usage                                   |
| **Total**           | **120**   | **49**  | **~5,570**      | (excl. tests)                                                                             |

**Tests:** แต่ละ module จะมี `#[cfg(test)] mod tests` ของตัวเอง หรือเก็บไว้ใน `tests/` directory

---

## 4. Phases ดำเนินการ

### Phase 0: สร้าง Baseline (ก่อนเริ่มทุกอย่าง)

**ระยะเวลา:** 10 นาที | **ความเสี่ยง:** ไม่มี

1. `cargo build` ต้องผ่าน ✅
2. `cargo test` ต้องผ่าน ✅
3. `git commit` snapshot ปัจจุบัน → rollback point
4. Record จำนวน test ที่ pass: `cargo test 2>&1 | Select-String "test result"`

---

### Phase 1: แยก Types (Structs/Enums)

**ระยะเวลา:** 30-45 นาที | **ความเสี่ยง:** ต่ำ

**ทำอะไร:**

- สร้าง directory `src-tauri/src/content_database/`
- สร้าง `types.rs` รวม 49 structs + enums ทั้งหมด
- สร้าง `mod.rs` ที่ `pub mod types; pub use types::*;`
- เปลี่ยน `main.rs` จาก `mod content_database;` → `mod content_database;` (Rust จะเลือก directory module อัตโนมัติ)
- ย้ายเฉพาะ struct/enum definitions → `types.rs`
- `content_database.rs` เดิม → ย้ายทุก function ไป `mod.rs` ชั่วคราว

**Verify:**

```
cargo build   → PASS
cargo test    → PASS (same count)
```

**ทำไมเริ่มที่นี่:** Structs ไม่มี logic, ไม่มี side effects → เสี่ยงน้อยที่สุด แต่ลด lines ได้ ~450 lines ทันที

---

### Phase 2: แยก Connection + Schema

**ระยะเวลา:** 30-45 นาที | **ความเสี่ยง:** ต่ำ

**ทำอะไร:**

- สร้าง `connection.rs`: ย้าย `get_content_database_path`, `get_portable_data_dir`, `get_content_connection`
- สร้าง `schema.rs`: ย้าย `initialize_content_database`, `initialize_question_tables`, migrations (`migrate_selected_sub_questions_to_table`, `migrate_answer_keys_to_table`, `scrub_legacy_answer_keys_from_metadata`)
- เพิ่ม `use crate::content_database::connection::get_content_connection;` ใน modules ที่ต้องใช้

**Dependencies:**

```
connection.rs ← ไม่มี dependency ภายใน (standalone)
schema.rs     ← depends on connection.rs (get_content_connection)
```

**Verify:**

```
cargo build   → PASS
cargo test    → PASS (same count)
```

---

### Phase 3: แยก Domain Modules (Low-Coupling Group)

**ระยะเวลา:** 1-2 ชั่วโมง | **ความเสี่ยง:** ปานกลาง

แยก modules ที่มี coupling ต่ำ (ใช้แค่ `get_content_connection()` + types):

**3a. `occupation.rs`** — self-contained, minimal dependencies

- ย้าย 19 functions + constants (`STANDARD_BRANCH_NAME`, etc.)
- ย้าย private helpers: `next_available_main_branch_code`, `next_available_sub_branch_code`, `ensure_standard_occupation_branch_exists`, `install_standard_occupation_branch_guards`, `is_protected_main_branch`, `is_protected_sub_branch`

**3b. `required_count.rs`** — small, self-contained

- ย้าย 4 functions: `check_has_children`, `get_required_count_children`, `get_required_count_children_inner`, `sync_required_count_children`

**3c. `answer_keys.rs`** — small, self-contained

- ย้าย functions: `get_question_answer_keys`, `update_answer_key`, `update_answer_key_with_conn`, `replace_question_answer_keys`, `replace_question_answer_keys_with_conn`
- dependency: `ensure_section_300_policy_allows_question_action` → ต้อง pub(crate) จาก questions module

**Verify ทุก sub-phase:**

```
cargo build   → PASS
cargo test    → PASS (same count)
```

---

### Phase 4: แยก Domain Modules (Medium-Coupling Group)

**ระยะเวลา:** 2-3 ชั่วโมง | **ความเสี่ยง:** ปานกลาง

**4a. `documents.rs`**

- 14 functions (CRUD + search + hierarchy + stats + branch)
- Dependencies: `get_content_connection`, `connection.rs`
- Private helpers: `seed_owner_units`, `has_document_evaluation_activity`, `update_document_branch_with_conn`

**4b. `sections.rs`**

- 12 functions + private helpers
- Dependencies: `get_content_connection`, Thai digit helpers, `generate_uuid`
- Private helpers: `create_section_with_conn`, `update_section_with_conn`, `delete_section_with_conn`, `get_section_by_id`, `seed_section_300_template`, `seed_section_200_template`, `to_thai_digit`
- **Cross-dependency:** `calculate_section_total_score`, `batch_recalculate_section_group_scores` (อาจอยู่ใน scoring.rs แทน)

**4c. `references.rs`**

- 14 reference functions + 4 image functions
- Dependencies: `get_content_connection`, `get_portable_data_dir`, `get_reference_by_id`, `get_thai_letter`, `bundle_reference_file`
- **Note:** Images อาจแยกเป็น `images.rs` ถ้าต้องการ แต่มีแค่ 4 functions (~111 lines) → รวมกับ references ง่ายกว่า

**Verify ทุก sub-phase:**

```
cargo build   → PASS
cargo test    → PASS (same count)
```

---

### Phase 5: แยก Domain Modules (High-Coupling Group)

**ระยะเวลา:** 2-3 ชั่วโมง | **ความเสี่ยง:** สูง

**5a. `questions.rs`**

- 9 functions: CRUD + reorder + update_question_score
- Dependencies: `generate_uuid`, `get_content_connection`, `recalculate_group_score_chain` (from scoring)
- Private: `get_question_section_group`, `ensure_section_300_policy_allows_question_action`, `sync_question_sub_question_links`
- **Cross-dependency สำคัญ:** `update_question_score` เรียก `recalculate_group_score_chain` → ต้อง import จาก scoring module

**5b. `scoring.rs`**

- 8 functions: progress, group calc, section scores, chain recalculate
- Dependencies: `get_content_connection`
- Private: `compute_section_progress`, `compute_section_progress_inner` (270 lines!), `recalculate_group_score_chain`
- **Cross-dependency สำคัญ:** scoring ใช้ข้อมูล questions/sections → ต้อง query DB โดยตรง (ไม่ต้อง import function)

**5c. `section_links.rs`**

- 10 functions
- Dependencies: `get_content_connection`
- Private: `get_question_section_links_inner`, `get_question_section_link_by_id`

**5d. `section_refs.rs`**

- 9 functions
- Dependencies: `get_content_connection`, `generate_uuid`
- Private: `get_section_ref_children_inner`
- **Cross-dependency:** `cleanup_orphaned_section_refs` (117 lines — complex, called from `delete_section_with_conn`)

**5e. `assessment.rs`**

- 13 functions: trainee, qualifier, progress, sub-Q usage, answer keys (if not in answer_keys.rs)
- Dependencies: `get_content_connection`, `generate_uuid`
- Private: `ensure_answer_key_placeholder`, `extract_ref_section_id`, `compute_section_progress_inner` (อาจอยู่ใน scoring.rs)

**Verify ทุก sub-phase:**

```
cargo build   → PASS
cargo test    → PASS (same count)
```

---

### Phase 6: ย้าย Tests

**ระยะเวลา:** 1-2 ชั่วโมง | **ความเสี่ยง:** ต่ำ

**ทำอะไร:**

- ย้าย tests จาก `mod tests` ท้ายไฟล์เดิม → `#[cfg(test)] mod tests` ของแต่ละ module
- จัดกลุ่ม tests ตาม domain:
  - Template seeding tests → `schema.rs` หรือ `sections.rs`
  - Score calculation tests → `scoring.rs`
  - Cascade chain tests → `scoring.rs`
  - Pure function tests → `connection.rs` หรือ module ที่เกี่ยวข้อง
  - Database function tests → `documents.rs`
  - Policy hardening tests → `questions.rs` + `answer_keys.rs` + `sections.rs`
  - Branch protection tests → `occupation.rs`

**Verify:**

```
cargo test    → PASS (same count, same test names)
```

---

### Phase 7: ทำความสะอาด mod.rs

**ระยะเวลา:** 30 นาที | **ความเสี่ยง:** ต่ำ

**ทำอะไร:**

- `mod.rs` ควรเหลือแค่ `pub mod` + `pub use` re-exports
- ตรวจสอบว่า `main.rs` ยังใช้ `crate::content_database::xxx` ได้เหมือนเดิม (backward compatible)
- ลบ dead code / unused imports

**ผลลัพธ์สุดท้าย `mod.rs`:**

```rust
pub mod connection;
pub mod schema;
pub mod types;
pub mod documents;
pub mod sections;
pub mod questions;
pub mod references;
pub mod occupation;
pub mod scoring;
pub mod section_links;
pub mod section_refs;
pub mod required_count;
pub mod assessment;
pub mod answer_keys;

// Re-export everything for backward compatibility
pub use connection::*;
pub use schema::*;
pub use types::*;
pub use documents::*;
pub use sections::*;
pub use questions::*;
pub use references::*;
pub use occupation::*;
pub use scoring::*;
pub use section_links::*;
pub use section_refs::*;
pub use required_count::*;
pub use assessment::*;
pub use answer_keys::*;
```

---

## 5. Cross-Dependency Map

```
connection.rs ──────────────────────────── (ทุก module ใช้ get_content_connection)
     │
     ├── schema.rs
     │
     ├── types.rs ──────────────────────── (ทุก module ใช้ structs)
     │
     ├── documents.rs
     │
     ├── sections.rs ───┐
     │                   │  cleanup_orphaned_section_refs
     ├── section_refs.rs ┘
     │
     ├── questions.rs ──┐
     │                   │  recalculate_group_score_chain
     ├── scoring.rs ────┘
     │                   │  ensure_section_300_policy
     ├── answer_keys.rs ┘
     │
     ├── references.rs
     │
     ├── occupation.rs (standalone)
     │
     ├── section_links.rs
     │
     ├── required_count.rs
     │
     └── assessment.rs
```

### Cross-Module Function Calls (ต้องจัดการ)

| Caller Module    | Calls                                                | In Module                                 | วิธีแก้                    |
| ---------------- | ---------------------------------------------------- | ----------------------------------------- | -------------------------- |
| `questions.rs`   | `recalculate_group_score_chain()`                    | `scoring.rs`                              | `pub(crate)` import        |
| `answer_keys.rs` | `ensure_section_300_policy_allows_question_action()` | `questions.rs`                            | `pub(crate)` import        |
| `sections.rs`    | `cleanup_orphaned_section_refs()`                    | `section_refs.rs`                         | `pub(crate)` import        |
| `sections.rs`    | `batch_recalculate_section_group_scores()`           | `scoring.rs`                              | `pub(crate)` import        |
| `questions.rs`   | `sync_question_sub_question_links()`                 | `occupation.rs` หรือเก็บใน `questions.rs` | Internal หรือ `pub(crate)` |
| `assessment.rs`  | `compute_section_progress_inner()`                   | `scoring.rs` หรือเก็บใน `assessment.rs`   | ต้องตัดสินใจ               |

**วิธีจัดการ:** ใช้ `pub(crate)` visibility — function ที่ถูกเรียกข้าม module จะเป็น `pub(crate) fn xxx()` แทน `fn xxx()` (private) แต่ไม่ต้อง `pub fn` (external)

---

## 6. แผนทดสอบ

### สำหรับทุก Phase

```
1. cargo build                           → ต้อง PASS (no compile errors)
2. cargo test                            → ต้อง PASS (same test count)
3. cargo test 2>&1 | Select-String "FAIL" → ต้องว่าง
4. เปิด app → สร้าง document ใหม่         → ต้องทำงานปกติ
5. เปิด app → แก้ไข question              → ต้องทำงานปกติ
6. git diff --stat                       → ตรวจสอบว่าเปลี่ยนเฉพาะ content_database files
```

### Smoke Tests หลังจบทุก Phase

| Test Case                          | ทดสอบอะไร                                          |
| ---------------------------------- | -------------------------------------------------- |
| สร้าง Document                     | documents.rs + sections.rs + schema.rs             |
| เพิ่ม Section 100/200/300          | sections.rs + seed templates                       |
| เพิ่ม Question L0/L1/L2            | questions.rs + scoring.rs                          |
| เพิ่ม Reference + Link to Question | references.rs                                      |
| Upload Image                       | references.rs (images)                             |
| เลือก Occupation Branch            | occupation.rs                                      |
| แก้ไข Score                        | scoring.rs + questions.rs                          |
| บันทึก Answer Key                  | answer_keys.rs                                     |
| Trainee ตอบคำถาม                   | assessment.rs                                      |
| ลบ Section (cascade)               | sections.rs + section_refs.rs                      |
| Backup + Restore                   | hybrid_backup.rs (ไม่เกี่ยว แต่ยืนยันว่า DB ยังดี) |

---

## 7. ข้อดี vs ข้อเสีย

### ข้อดี

| #   | ข้อดี               | ผลกระทบ                                                                      |
| --- | ------------------- | ---------------------------------------------------------------------------- |
| 1   | **IDE Performance** | Rust Analyzer ทำงานเร็วขึ้นมาก — ไฟล์ 7K lines ทำให้ analysis ช้า            |
| 2   | **Readability**     | หา function ง่ายขึ้น — เปิดไฟล์ 500 lines ดีกว่า scroll 7,000 lines          |
| 3   | **Compile Time**    | Incremental compilation เร็วขึ้น — แก้ scoring.rs ไม่ต้อง recompile ทั้งไฟล์ |
| 4   | **Git Conflicts**   | ลดโอกาส merge conflict — แก้ references ไม่กระทบ scoring                     |
| 5   | **Code Review**     | PR ที่แก้ "occupation" ไม่ต้อง review 7,000 lines                            |
| 6   | **Testing**         | แยก test ตาม domain → run เฉพาะที่เกี่ยวข้อง                                 |
| 7   | **Onboarding**      | Developer ใหม่เข้าใจ structure ได้เร็วกว่า                                   |
| 8   | **Future Web API**  | ถ้าทำ Express.js API Server จะ map 1:1 กับ Rust modules                      |

### ข้อเสีย

| #   | ข้อเสีย                   | Mitigation                                                                                          |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | **Time Investment**       | ~6-10 ชั่วโมงรวม → ทำเป็น Phase ได้                                                                 |
| 2   | **Cross-module coupling** | 6 cross-module calls → ใช้ `pub(crate)` + clear dependency map                                      |
| 3   | **Regression Risk**       | ทุก Phase ต้อง `cargo test` ผ่าน → rollback ได้ทุกจุด                                               |
| 4   | **Import Complexity**     | `mod.rs` re-exports ทุกอย่าง → `main.rs` ไม่ต้องเปลี่ยน                                             |
| 5   | **Shared Helpers**        | `generate_uuid`, `to_thai_digit`, `thai_number` → ย้ายไป `connection.rs` หรือสร้าง `utils.rs` เล็กๆ |
| 6   | **Test Migration**        | ย้าย 1,236 lines of tests → ต้อง verify count เท่าเดิม                                              |

---

## 8. Timeline Summary

| Phase | งาน                                                             | เวลา      | ความเสี่ยง | Cumulative |
| ----- | --------------------------------------------------------------- | --------- | ---------- | ---------- |
| **0** | Baseline (build + test + commit)                                | 10 min    | —          | 10 min     |
| **1** | แยก Types (49 structs)                                          | 30-45 min | ต่ำ        | ~1 hr      |
| **2** | แยก Connection + Schema                                         | 30-45 min | ต่ำ        | ~1.5 hr    |
| **3** | แยก Low-Coupling (occupation, required, answer_keys)            | 1-2 hr    | ปานกลาง    | ~3.5 hr    |
| **4** | แยก Medium-Coupling (documents, sections, references)           | 2-3 hr    | ปานกลาง    | ~6.5 hr    |
| **5** | แยก High-Coupling (questions, scoring, links, refs, assessment) | 2-3 hr    | สูง        | ~9.5 hr    |
| **6** | ย้าย Tests                                                      | 1-2 hr    | ต่ำ        | ~11 hr     |
| **7** | Cleanup mod.rs                                                  | 30 min    | ต่ำ        | ~11.5 hr   |

**แนะนำ:** ทำ Phase 0-2 ก่อน → commit → ค่อยทำ Phase 3-5 ทีละ module → commit ทุก module

---

## 9. ตัวอย่าง `connection.rs` (Phase 2)

```rust
use std::path::PathBuf;
use rusqlite::Connection;
use tauri::api::path::app_data_dir;
use tauri::Config;

pub fn get_content_database_path() -> Result<PathBuf, String> {
    let app_data = app_data_dir(&Config::default())
        .ok_or("Failed to get app data directory")?;
    let db_dir = app_data.join("pqs-rtn-hybrid-storage");
    std::fs::create_dir_all(&db_dir)
        .map_err(|e| format!("Failed to create database directory: {}", e))?;
    Ok(db_dir.join("content.db"))
}

pub fn get_portable_data_dir() -> Result<PathBuf, String> {
    // ... existing code ...
}

pub fn get_content_connection() -> Result<Connection, String> {
    let db_path = get_content_database_path()?;
    Connection::open(&db_path)
        .map_err(|e| format!("Failed to open content database: {}", e))
}

// Shared utility functions
pub(crate) fn generate_uuid() -> String {
    // ... existing code ...
}

pub(crate) fn to_thai_digit(n: i32) -> String {
    // ... existing code ...
}

pub(crate) fn thai_number(n: i32) -> String {
    // ... existing code ...
}

pub(crate) fn get_thai_letter(idx: usize) -> String {
    // ... existing code ...
}
```

---

## 10. Decision Log

| คำถาม                                        | คำตอบ                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| Images แยกเป็น module?                       | ❌ รวมกับ `references.rs` (แค่ 4 functions, 111 lines)                            |
| Answer keys อยู่ใน assessment?               | ❌ แยกเป็น `answer_keys.rs` — domain ต่างกัน (editor vs trainee)                  |
| `compute_section_progress_inner` อยู่ที่ไหน? | → `scoring.rs` (เป็น scoring logic)                                               |
| `cleanup_orphaned_section_refs` อยู่ที่ไหน?  | → `section_refs.rs` (เป็น section_ref logic, ถูกเรียกจาก sections via pub(crate)) |
| ต้องแก้ `main.rs` มั้ย?                      | ❌ ไม่ต้อง — `mod.rs` re-exports ทุกอย่างด้วย `pub use *`                         |

---

## 11. 2026-03-30 Update: Post-Analysis Recommendations

จากการตรวจสอบล่าสุด (30 มี.ค. 26) ไฟล์ `content_database.rs` ได้เติบโตขึ้นเป็น **8,329 บรรทัด** ซึ่งทำให้การทำ Refactoring มีความจำเป็นเร่งด่วนมากขึ้น โดยมีข้อแนะนำเพิ่มเติมดังนี้:

### 11.1 ปรับปรุงการจัดการ Connection (Phase 2 Enhancement)
แทนที่จะเปิด Connection ใหม่ในทุกฟังก์ชัน (`get_content_connection`) แนะนำให้ปรับปรุงใน `connection.rs`:
- **Tauri State Integration**: ใช้ระบบ `.manage(DbConnection)` ของ Tauri เพื่อเก็บ Connection เดียวที่เปิดค้างไว้ (Persistent Connection)
- **Dependency Injection**: ปรับปรุงฟังก์ชัน CRUD ให้รับ `&Connection` เป็นอาร์กิวเมนต์ เพื่อให้สามารถควบคุม Workflow และ Transaction ได้ดีขึ้นจากภายนอก

### 11.2 การจัดการโครงสร้างใหม่ของ Scoring Logic (Phase 5 Refinement)
เนื่องจากระบบ Scoring มีความซับซ้อนเพิ่มขึ้น (Scoring Chain, recaluclate_group_score) แนะนำให้:
- แยก **Scoring Logic** ออกมาเป็น Pure functions ใน `scoring_logic.rs` (ไม่ยุ่งกับ DB)
- ให้ `scoring.rs` ทำหน้าที่เพียงแค่ดึงข้อมูลจาก DB แล้วส่งต่อให้ Logic ประมวลผล เพื่อลดความซับซ้อนในการทำ Unit Test

### 11.3 กลยุทธ์การย้าย Tests (Phase 6 Enhancement)
ด้วยปริมาณ Test กว่า 1,300 บรรทัด แจ้งเตือนดังนี้:
- **Modular Tests**: ย้าย Test ที่เจาะจงแต่ละ Domain ไปไว้ในโมดูลนั้นๆ
- **Integration Tests**: สำหรับ Test ที่เช็คความสัมพันธ์ข้ามโมดูล (เช่น Cascade Delete) ให้สร้างโฟลเดอร์ `src-tauri/src/content_database/tests/` เพื่อแยกไฟล์ Test ขนาดใหญ่ออกไป

### 11.4 Baseline & Performance Check
ก่อนเริ่ม Refactoring:
- ให้ทำการบันทึก **Compile Time** และ **RAM usage ของ Rust Analyzer** ไว้เป็นสถิติ เพื่อตรวจสอบผลลัพธ์หลังจากการแยกไฟล์ (คาดการณ์ว่าประสิทธิภาพจะดีขึ้นอย่างน้อย 30-50%)

