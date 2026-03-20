# Changing Career Branch Protection

เอกสารชุดนี้อธิบายถึงข้อกำหนด สถานะปัจจุบัน และแผนการพัฒนาการป้องกันการเปลี่ยน **สาขาอาชีพหลัก/ย่อย (Major/Minor Career Branch)** เพื่อรักษาความถูกต้องของข้อมูลในเอกสาร PQS

---

## 1. สิ่งที่ระบบทำได้อยู่แล้ว (Existing Exempted Logic — DO NOT MODIFY)

> **หลักการสำคัญ:** Logic ของ Exempted ที่มีอยู่ในระบบ **ทำงานได้ดีอยู่แล้ว** ให้เรียกใช้ ไม่ใช่แก้ไข

### 1.1 Seed Templates สร้าง questions เป็น exempted by default

**`seed_section_200_template`** (L2354-2378):

- 2xx.1-2xx.6 L1 ทั้ง 6 ข้อ → `question_type='exempted'`, `display_text='(ไม่ต้องอธิบาย)'`

**`seed_section_300_template`** (L2311-2351):

- 3xx.2-3xx.6 L1 → `question_type='exempted'`, `display_text='(ไม่ต้องปฏิบัติ)'`
- 3xx.1.1-3xx.1.3 → `question_type='exempted'`, `display_text='(ไม่ต้องปฏิบัติ)'`

### 1.2 `update_question_score` — ฟังก์ชันแม่บทของ Exempted (L4043-4147)

เมื่อ `question_type == "exempted"` ฟังก์ชันนี้ทำงาน 3 ขั้นตอน:

```
1. DELETE children    → DELETE FROM Questions WHERE parent_id = ?1
2. Reset question     → UPDATE Questions SET score=0, is_scored=0, question_type='exempted',
                         display_text=?, group_score=0, is_group_header=0, description=NULL
3. Recalculate chain  → parent group_score → grandparent group_score → section total_score
```

**นี่คือ single source of truth สำหรับการทำ question ให้เป็น exempted** — ใช้ pattern เดียวกันทั้ง frontend และ backend

### 1.3 Frontend เรียก `update_question_score` ผ่าน invoke

| ตำแหน่ง                  | display_text                                   | เงื่อนไข                              |
| ------------------------ | ---------------------------------------------- | ------------------------------------- |
| `QuestionFormCard` L349  | `'(ไม่ต้องปฏิบัติ)'`                           | 3xx.1.1-3xx.1.3 prerequisite children |
| `QuestionFormCard` L379  | `'(ไม่ต้องปฏิบัติ)'`                           | 3xx.1.3/1.4/1.5 section selectors     |
| `QuestionFormCard` L1269 | `formScoreDisplayText \|\| '(ไม่ต้องปฏิบัติ)'` | 300 series editing                    |
| `QuestionFormCard` L1286 | `'(ไม่ต้องอธิบาย)'`                            | 200 series L1                         |

เมื่อ exempted → frontend clear SubQ metadata, ซ่อน sub-question editor, reset `useSubQuestions=false`

### 1.4 Guard ปัจจุบัน (update_document_branch_with_conn — L735-760)

```rust
fn update_document_branch_with_conn(conn, doc_id, branch_main, branch_sub) {
    let has_activity = has_document_evaluation_activity(conn, doc_id)?;  // ดู UserAnswers ทั้งเอกสาร
    if has_activity && current != (branch_main, branch_sub) {
        return Err("Cannot change document branch after evaluation has started");
    }
    // ... update
}
```

**ปัญหา:** `has_document_evaluation_activity` ตรวจ `UserAnswers` ทั้งเอกสาร → ถ้าตอบ Section 100 ไปแล้ว จะ block การเปลี่ยน branch ทั้งหมด ซึ่ง **กว้างเกินไป**

### 1.5 EditMetadataModal ปัจจุบัน (L120-158)

- `handleSubmit` → `update_document` → `update_document_branch`
- **ไม่มี conflict detection** ก่อน save
- **ไม่มี confirmation dialog**
- ไม่จำ originalMain/originalSub ไว้เปรียบเทียบ

---

## 2. ช่องว่างที่ต้อง Implement (GAP Analysis)

| #   | สิ่งที่ยังขาด                                                                  | ผลกระทบ                       |
| --- | ------------------------------------------------------------------------------ | ----------------------------- |
| 1   | ไม่มี function ตรวจ SubQ links เฉพาะหัวข้อเป้าหมาย (2xx.2, 2xx.4, 3xx.2-3xx.5) | ตรวจสอบผิดเป้า                |
| 2   | Guard เดิม block ด้วย UserAnswers ทั้งเอกสาร (กว้างเกินไป)                     | User ติดค้างถ้าเคยตอบ Sec 100 |
| 3   | ไม่มี reset function สำหรับล้างข้อมูลเฉพาะหัวข้อแล้วเปลี่ยน branch             | Reset ไม่ได้                  |
| 4   | EditMetadataModal ไม่มี conflict detection + confirmation                      | เปลี่ยนโดยไม่ตั้งใจ           |

---

## 3. ข้อกำหนด (Strict Requirements)

- **Single Branch Policy**: เอกสารหนึ่งฉบับมีสาขาอาชีพหลัก/ย่อยได้เพียงแบบเดียว
- **Constraint Area** (L1 questions ที่ได้รับผลกระทบ):

  | Target | `section_group` | L1 `sequence` | ชื่อหัวข้อ                           |
  | ------ | --------------- | ------------- | ------------------------------------ |
  | 2xx.2  | 200             | 2             | ส่วนประกอบและชิ้นส่วน                |
  | 2xx.4  | 200             | 4             | การทำงานตามปกติ                      |
  | 3xx.2  | 300             | 2             | การทดสอบปฏิบัติงานปกติ               |
  | 3xx.3  | 300             | 3             | การทดสอบการปฏิบัติงานกรณีพิเศษ       |
  | 3xx.4  | 300             | 4             | การทดสอบการปฏิบัติงานกรณีเหตุขัดข้อง |
  | 3xx.5  | 300             | 5             | การทดสอบการปฏิบัติงานกรณีเหตุฉุกเฉิน |

- **ข้อมูลที่ได้รับผลกระทบ** (ลบหรือ reset):
  - `Questions` (children ของ L1 target) → **ลบ** (เหมือน `update_question_score` exempted path)
  - `Questions` (L1 target เอง) → **reset to exempted** (เหมือน pattern เดิม)
  - `QuestionSubQuestionLinks` → **ลบ** (ทั้ง L1 target + children)
  - `QuestionAnswerKeys` → **ลบ** (ทั้ง L1 target + children)
  - `UserAnswers` → **ลบ** (ทั้ง L1 target + children)
  - `Questions.metadata` → **ล้าง** SubQ fields (useSubQuestions, selectedBranch, activeSubQuestions)

---

## 4. Target Workflow

```
[เปิด EditMetadataModal]
  └─> โหลด branch ปัจจุบัน → จำ originalMain / originalSub

[เปลี่ยน selectedMain / selectedSub]
  └─> เปรียบเทียบกับ original
       ├─ ไม่เปลี่ยน → ปกติ
       └─ เปลี่ยน → invoke check_career_branch_usage
                     ├─ count = 0 → ไม่มี conflict → save ได้เลย
                     └─ count > 0 → แสดง Warning Banner

[กด Save]
  ├─ ไม่มี conflict → update_document + update_document_branch → onSuccess
  └─ มี conflict
       ├─ ยังไม่ยืนยัน → แสดง confirmation dialog
       │    ├─ ยกเลิก → ไม่บันทึก
       │    └─ ยืนยัน → set userConfirmedReset = true
       └─ ยืนยันแล้ว → update_document + reset_and_update_career_branch → onSuccess
```

---

## 5. Implementation Plan (3 Phases)

---

### Phase 1 — Backend: Detection + Reset + Guard Fix

**เป้าหมาย**: สร้าง backend ทั้งหมดให้สมบูรณ์ พร้อมทดสอบ `cargo test` ได้ทันที

#### 5.1.1 สร้าง `check_career_branch_usage`

**ไฟล์**: `content_database.rs`

```rust
#[derive(serde::Serialize)]
pub struct CareerBranchUsageReport {
    pub has_conflict: bool,
    pub affected_question_count: i64,
    pub affected_section_groups: Vec<i32>,
}

pub fn check_career_branch_usage(doc_id: String) -> Result<CareerBranchUsageReport, String>
```

**SQL ภายใน:**

```sql
SELECT COUNT(*) AS cnt, GROUP_CONCAT(DISTINCT s.section_group)
FROM QuestionSubQuestionLinks qsl
JOIN Questions q ON q.id = qsl.question_id
JOIN Sections s ON s.id = q.section_id
WHERE q.document_id = ?1
  AND q.parent_id IS NULL
  AND (
    (s.section_group = 200 AND q.sequence IN (2, 4))
    OR (s.section_group = 300 AND q.sequence IN (2, 3, 4, 5))
  )
```

#### 5.1.2 สร้าง `reset_and_update_career_branch`

**ไฟล์**: `content_database.rs`

```rust
#[derive(serde::Serialize)]
pub struct CareerBranchResetReport {
    pub subq_links_deleted: usize,
    pub answer_keys_deleted: usize,
    pub user_answers_deleted: usize,
    pub questions_reset: usize,
}

pub fn reset_and_update_career_branch(
    doc_id: String,
    new_main: Option<String>,
    new_sub: Option<String>,
) -> Result<CareerBranchResetReport, String>
```

**Logic (single transaction) — เรียกใช้ pattern เดียวกับ `update_question_score` exempted path:**

```
BEGIN TRANSACTION;

-- Step 1: หา target L1 question IDs
SELECT q.id, s.section_group FROM Questions q
JOIN Sections s ON s.id = q.section_id
WHERE q.document_id = ?1 AND q.parent_id IS NULL
AND ((s.section_group=200 AND q.sequence IN (2,4))
  OR (s.section_group=300 AND q.sequence IN (2,3,4,5)));

-- Step 2: หา ALL affected IDs (L1 + ลูกทุกชั้น) สำหรับลบ relational data
-- ใช้ recursive: target L1 IDs + children + grandchildren

-- Step 3: ลบ relational data ของ ALL affected IDs
DELETE FROM QuestionSubQuestionLinks WHERE question_id IN (<all_ids>);
DELETE FROM QuestionAnswerKeys WHERE question_id IN (<all_ids>);
DELETE FROM UserAnswers WHERE question_id IN (<all_ids>);

-- Step 4: ลบ children (เหมือน update_question_score exempted path)
DELETE FROM Questions WHERE parent_id IN (<target_l1_ids>);

-- Step 5: Reset L1 targets (เหมือน update_question_score exempted path ทุกประการ)
UPDATE Questions SET
    score = 0, is_scored = 0,
    question_type = 'exempted',
    display_text = CASE ... END,  -- '(ไม่ต้องอธิบาย)' / '(ไม่ต้องปฏิบัติ)'
    group_score = 0, is_group_header = 0, description = NULL
WHERE id IN (<target_l1_ids>);

-- Step 5b: ล้าง metadata SubQ fields (set to '{}')
UPDATE Questions SET metadata = '{}'
WHERE id IN (<target_l1_ids>) AND metadata IS NOT NULL;

-- Step 6: Recalculate section total_score (เหมือน pattern ใน update_question_score)
UPDATE Sections SET total_score = (SELECT COALESCE(SUM(...), 0) FROM Questions ...)
WHERE id IN (SELECT DISTINCT section_id FROM Questions WHERE id IN (<target_l1_ids>));

-- Step 7: อัพเดต branch
UPDATE Documents SET occupation_branch_main = ?, occupation_branch_sub = ? WHERE id = ?;

COMMIT;
```

> **สำคัญ:** Step 4-5 ใช้ SQL pattern **เดียวกัน** กับ `update_question_score` เมื่อ `question_type == "exempted"` — ไม่ได้ประดิษฐ์ logic ใหม่

#### 5.1.3 แก้ไข Guard เดิม

**ลบ** `has_document_evaluation_activity` guard ออกจาก `update_document_branch_with_conn`:

```rust
// BEFORE (กว้างเกินไป):
let has_activity = has_document_evaluation_activity(conn, doc_id)?;
if has_activity && current != new { return Err("...") }

// AFTER (ลบออก — frontend จะใช้ check + reset flow แทน):
// ไม่มี guard — ถ้ามี conflict, frontend ต้องเรียก reset_and_update_career_branch
```

#### 5.1.4 ลงทะเบียน Tauri Commands

**ไฟล์**: `main.rs`

```rust
#[tauri::command]
fn check_career_branch_usage(doc_id: String) -> Result<CareerBranchUsageReport, String> { ... }

#[tauri::command]
fn reset_and_update_career_branch(doc_id: String, new_main: Option<String>, new_sub: Option<String>) -> Result<CareerBranchResetReport, String> { ... }
```

#### 5.1.5 Tests (Rust)

**เตรียม test schema**: เพิ่ม `QuestionSubQuestionLinks` + `UserAnswers` ใน `init_content_schema` ของ `test_helpers.rs`

| Test                                        | ทดสอบ                                   | Expected                                                      |
| ------------------------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| `test_check_career_usage_empty_doc`         | เอกสารไม่มี SubQ links                  | `has_conflict=false, count=0`                                 |
| `test_check_career_usage_in_target_section` | SubQ link ใน 200 seq=2                  | `has_conflict=true, count>=1`                                 |
| `test_check_career_usage_ignores_sec100`    | SubQ link ใน 100 เท่านั้น               | `has_conflict=false`                                          |
| `test_check_career_usage_300_seq_2_to_5`    | SubQ links ใน 300 seq=2,3,4,5           | `count` ครบ                                                   |
| `test_reset_deletes_children`               | L1 มี children → reset                  | children ถูกลบ (เหมือน exempted)                              |
| `test_reset_clears_subq_links`              | มี SubQ links → reset                   | links ใน target หายไป                                         |
| `test_reset_clears_answer_keys`             | มี AnswerKeys → reset                   | keys หายไป                                                    |
| `test_reset_clears_user_answers`            | มี UserAnswers → reset                  | answers หายไป                                                 |
| `test_reset_sets_exempted_200`              | 200 target → reset                      | `question_type='exempted'`, `display_text='(ไม่ต้องอธิบาย)'`  |
| `test_reset_sets_exempted_300`              | 300 target → reset                      | `question_type='exempted'`, `display_text='(ไม่ต้องปฏิบัติ)'` |
| `test_reset_updates_branch`                 | reset → check branch                    | branch เปลี่ยน                                                |
| `test_reset_preserves_nontarget`            | SubQ link ใน 2xx.1                      | ไม่ถูกลบ                                                      |
| `test_old_guard_removed`                    | UserAnswers ใน Sec 100 → เปลี่ยน branch | ไม่ error                                                     |

**คำสั่งทดสอบ:**

```bash
cargo test career --manifest-path src-tauri/Cargo.toml
cargo test reset_and_update --manifest-path src-tauri/Cargo.toml
```

---

### Phase 2 — Frontend: Conflict Detection + Confirmation UI

**เป้าหมาย**: แก้ไข `EditMetadataModal.tsx` ให้ตรวจ conflict ก่อน Save + แสดง confirmation

#### 5.2.1 แก้ไข EditMetadataModal.tsx

**State ใหม่:**

```typescript
const [originalMain, setOriginalMain] = useState<string>("");
const [originalSub, setOriginalSub] = useState<string>("");
const [conflictReport, setConflictReport] = useState<{
  has_conflict: boolean;
  affected_question_count: number;
} | null>(null);
const [showConfirmDialog, setShowConfirmDialog] = useState(false);
```

**เพิ่มใน useEffect (modal open):** จำ `originalMain` / `originalSub` ไว้ตอนโหลด

**เพิ่ม conflict check:** เมื่อ dropdown เปลี่ยน → เรียก `check_career_branch_usage` ถ้า branch ต่างจาก original

**แก้ `handleSubmit`:**

```typescript
const branchChanged =
  selectedMain !== originalMain || selectedSub !== originalSub;

if (branchChanged && conflictReport?.has_conflict) {
  if (!showConfirmDialog) {
    setShowConfirmDialog(true); // แสดง dialog ก่อน
    return;
  }
  // ถ้ามาถึงนี่ = user confirmed → reset + update branch
  await invoke("reset_and_update_career_branch", {
    docId,
    newMain: selectedMain || null,
    newSub: effectiveSub || null,
  });
} else {
  // ไม่มี conflict หรือ branch ไม่เปลี่ยน → flow ปกติ
  await invoke("update_document_branch", { docId, branchMain, branchSub });
}
```

**UI เพิ่ม:**

1. **Warning Banner** (สีเหลือง) เมื่อ `conflictReport?.has_conflict && branchChanged`:
   > ⚠️ พบข้อมูล SubQ ที่ผูกกับสาขาเดิม X ข้อ การเปลี่ยนสาขาจะลบข้อมูลและรีเซ็ตกลับเป็น exempted
2. **Confirmation Dialog** เมื่อ `showConfirmDialog`:
   > ปุ่ม "ยืนยัน เปลี่ยนสาขาและล้างข้อมูล" + "ยกเลิก"

#### 5.2.2 Tests (Vitest)

**ไฟล์**: `src/test/integration/EditMetadataModal.integration.test.tsx` (เพิ่ม test cases)

| Test                                             | ทดสอบ                                            | Expected                                  |
| ------------------------------------------------ | ------------------------------------------------ | ----------------------------------------- |
| `no warning when branch unchanged`               | เปลี่ยน field อื่น ไม่เปลี่ยน branch             | ไม่มี warning                             |
| `warning appears on branch change with conflict` | mock `check_career_branch_usage` return conflict | warning banner ปรากฏ                      |
| `save with conflict shows confirmation`          | กด Save กับ pending conflict                     | confirmation dialog ปรากฏ                 |
| `cancel confirmation keeps original branch`      | กด "ยกเลิก"                                      | branch กลับเป็น original                  |
| `confirm calls reset_and_update`                 | กด "ยืนยัน"                                      | `reset_and_update_career_branch` ถูกเรียก |
| `no conflict saves via normal path`              | branch เปลี่ยน, count=0                          | เรียก `update_document_branch` ปกติ       |

**คำสั่งทดสอบ:**

```bash
npx vitest run src/test/integration/EditMetadataModal.integration.test.tsx
```

---

### Phase 3 — Smoke Test + Regression Verification

**เป้าหมาย**: ทดสอบ manual flow + ยืนยัน regression ไม่เกิด

#### 5.3.1 Manual Smoke Tests

| #   | สถานการณ์                             | ขั้นตอน                                                         | Expected                                                  |
| --- | ------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | เปลี่ยน branch (ไม่มี conflict)       | เปิด EditMetadata → เปลี่ยน branch → Save                       | เปลี่ยนสำเร็จ ไม่มี warning                               |
| 2   | เปลี่ยน branch (มี conflict) → ยืนยัน | เพิ่ม SubQ ใน 2xx.2 → เปลี่ยน branch → เห็น warning → กด ยืนยัน | Branch เปลี่ยน, 2xx.2 กลับเป็น exempted "(ไม่ต้องอธิบาย)" |
| 3   | เปลี่ยน branch (มี conflict) → ยกเลิก | เพิ่ม SubQ ใน 3xx.3 → เปลี่ยน branch → เห็น warning → กด ยกเลิก | Branch ไม่เปลี่ยน, ข้อมูลคงเดิม                           |
| 4   | ตอบ Section 100 แล้วเปลี่ยน branch    | ตอบคำถาม Sec 100 → เปลี่ยน branch                               | ไม่ถูก block (แก้ bug guard เดิม)                         |
| 5   | Exempted L1 ทำงานปกติหลัง reset       | หลัง reset → เปิด 2xx.2 → ตั้งค่าเป็น normal → ใช้งาน SubQ      | SubQ editor ทำงานปกติ                                     |

#### 5.3.2 Rust Regression Tests

เพิ่มใน `content_database.rs` mod tests:

| Test                                     | สถานการณ์                                                 |
| ---------------------------------------- | --------------------------------------------------------- |
| `test_full_flow_check_then_reset`        | check → has_conflict → reset → check again → no conflict  |
| `test_branch_change_with_sec100_answers` | มี UserAnswers ใน Sec 100 → `update_document_branch` ผ่าน |
| `test_standard_branch_still_protected`   | พยายามเปลี่ยนชื่อ `ต้นแบบมาตรฐาน` → trigger block         |

**คำสั่งทดสอบ:**

```bash
# Run ทุก tests ที่เกี่ยวกับ career branch
cargo test career --manifest-path src-tauri/Cargo.toml

# Run ทั้งหมด
cargo test content_database::tests --manifest-path src-tauri/Cargo.toml

# Frontend
npx vitest run src/test/integration/EditMetadataModal.integration.test.tsx
```

---

## 6. ไฟล์ที่ต้องแก้ไข (Summary)

| ไฟล์                                                          | Action    | รายละเอียด                                                                         |
| ------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| `src-tauri/src/content_database.rs`                           | **แก้ไข** | เพิ่ม `check_career_branch_usage`, `reset_and_update_career_branch`, ลบ guard เดิม |
| `src-tauri/src/main.rs`                                       | **แก้ไข** | ลงทะเบียน 2 Tauri commands ใหม่                                                    |
| `src-tauri/src/test_helpers.rs`                               | **แก้ไข** | เพิ่ม `QuestionSubQuestionLinks` + `UserAnswers` ใน `init_content_schema`          |
| `src/components/modals/EditMetadataModal.tsx`                 | **แก้ไข** | เพิ่ม conflict detection + confirmation UI                                         |
| `src/test/integration/EditMetadataModal.integration.test.tsx` | **แก้ไข** | เพิ่ม test cases สำหรับ conflict flow                                              |

---

## 7. ข้อควรระวัง (Pitfalls)

1. **อย่าแก้ `update_question_score`** — ใช้ SQL pattern เดียวกันใน `reset_and_update_career_branch` แต่ไม่ต้อง import/call ตรง (เพราะต้องทำใน transaction เดียว)
2. **`QuestionSubQuestionLinks`** ไม่มีใน `init_content_schema` → ต้องเพิ่มก่อน run tests
3. **`UserAnswers`** table ไม่ได้สร้างใน test schema → ดูตัวอย่างจาก test เดิม `content_database.rs:6775`
4. **`section_id` ใน `Questions`** ต้องไม่เป็น NULL สำหรับ L1 → JOIN กับ Sections ปลอดภัย (seed templates ทุกตัว set section_id)
5. **ลบ `has_document_evaluation_activity` guard** — ห้ามใช้ร่วมกับ logic ใหม่ (เดิม block กว้างเกินไป)
6. **Metadata cleanup** — ต้อง clear fields `useSubQuestions`, `selectedBranch`, `activeSubQuestions` จาก JSON metadata ด้วย ไม่ใช่แค่ลบ relational data

---

## 8. สถานะการพัฒนา (Implementation Status)

### ✅ เสร็จสมบูรณ์ (Completed)

**Backend Implementation:**

- ✅ `check_career_branch_usage()` — ตรวจสอบ conflict จาก metadata JSON `activeSubQuestions`
- ✅ `reset_and_update_career_branch()` — รีเซ็ตคำถามเป็น exempted และอัปเดต branch แบบ atomic
- ✅ ลบ `has_document_evaluation_activity()` guard เดิมที่ block กว้างเกินไป
- ✅ ลงทะเบียน Tauri commands: `check_career_branch_usage`, `reset_and_update_career_branch`

**Frontend Implementation:**

- ✅ Conflict detection state และ UI ใน `EditMetadataModal`
- ✅ Warning banners แสดงข้อมูล conflict (จำนวนข้อ, section groups ที่กระทบ)
- ✅ Confirmation dialog พร้อมรายละเอียดข้อมูลที่จะถูกลบ
- ✅ Silent UI refresh ด้วย `refreshKey` pattern (ไม่ render ทั้งหน้า)
- ✅ Branch revert เมื่อผู้ใช้กดยกเลิก

**Testing:**

- ✅ Manual testing scenarios 1-3 ผ่านทั้งหมด
- ✅ Integration tests 5 test cases ครอบคลุม conflict flow
- ✅ TypeScript และ Rust compilation ผ่านไม่มี warning

**Git Commits:**

- `96ab411` — feat: implement career branch protection with conflict detection and reset
- `9c44c1f` — test: add integration tests for career branch protection (5 new tests)

**Branch:** `career-branch-metadata-protection`

### 📋 Manual Testing Results

| Scenario                                | สถานะ   | หมายเหตุ                                                |
| --------------------------------------- | ------- | ------------------------------------------------------- |
| 1. เปลี่ยนสาขาโดยไม่มี SubQ usage       | ✅ ผ่าน | แสดง "ไม่พบข้อมูลที่ขัดแย้ง" และบันทึกได้ทันที          |
| 2. เปลี่ยนสาขาโดยมี SubQ usage → ยืนยัน | ✅ ผ่าน | แสดง warning → confirmation → รีเซ็ตเป็น exempted ทันที |
| 3. เปลี่ยนสาขาโดยมี SubQ usage → ยกเลิก | ✅ ผ่าน | branch กลับค่าเดิม, ไม่มีการเปลี่ยนแปลงใดๆ              |

---

## 9. หมายเหตุสำหรับอนาคต (Future Enhancements)

### 🔄 Cleaning Unused Career Branch Data

หลังจากใช้งานระบบไปแล้วระยะหนึ่ง อาจพิจารณาเพิ่มฟีเจอร์ทำความสะอาดข้อมูลสาขาอาชีพที่ไม่ได้ใช้งาน:

**วัตถุประสงค์:**

- ลบข้อมูล SubQ, answer keys, และ user answers ที่เกี่ยวข้องกับสาขาอาชีพที่ไม่ได้ใช้งานอีกต่อไป
- ป้องกันข้อมูลเก่าสะสมในฐานข้อมูล
- รักษาความสะอาดและประสิทธิภาพของระบบ

**เงื่อนไขในการทำความสะอาด:**

1. เอกสารต้องเปลี่ยนสาขาอาชีพไปแล้ว (branch_main/branch_sub ไม่ตรงกับข้อมูลเก่า)
2. ข้อมูลเก่าต้องไม่ถูกอ้างอิงโดยสาขาปัจจุบัน
3. ควรมี confirmation จากผู้ใช้ก่อนลบข้อมูล

**ขอบเขตการทำความสะอาด:**

- `QuestionSubQuestionLinks` — ลบ links ที่ไม่ตรงกับสาขาปัจจุบัน
- `AnswerKeys` — ลบ answer keys ของ SubQ ที่ถูกลบ
- `UserAnswers` — ลบคำตอบของผู้ใช้สำหรับ SubQ ที่ถูกลบ
- `Questions.metadata` — ทำความสะอาด JSON fields: `activeSubQuestions`, `selectedSubQuestions`

**การพัฒนาที่แนะนำ:**

1. สร้างฟังก์ชัน `analyze_unused_career_data(doc_id)` — วิเคราะห์ข้อมูลที่จะถูกลบ
2. สร้างฟังก์ชัน `cleanup_unused_career_data(doc_id, dry_run)` — ทำความสะอาดจริง
3. เพิ่ม UI ใน Document Settings สำหรับ trigger cleanup
4. เพิ่ม logging/audit trail สำหรับการลบข้อมูล
5. พิจารณา soft delete แทน hard delete (เก็บ backup ไว้ระยะหนึ่ง)

**ข้อควรระวัง:**

- ⚠️ **อย่ารีบพัฒนาฟีเจอร์นี้ทันที** — ควรใช้งานระบบไปก่อนอย่างน้อย 1-2 เดือน
- ⚠️ ต้องมี backup ข้อมูลก่อนทำ cleanup ทุกครั้ง
- ⚠️ ต้องทดสอบอย่างละเอียดก่อนใช้งานจริง (อาจทำให้ข้อมูลสูญหายถ้าผิดพลาด)
- ⚠️ พิจารณาให้ผู้ใช้ export ข้อมูลเก่าก่อนลบ

**Timeline แนะนำ:**

- ✅ **ตอนนี้:** ใช้งาน career branch protection และสังเกตพฤติกรรมผู้ใช้
- 📅 **1-2 เดือนข้างหน้า:** ประเมินความจำเป็นของ cleanup feature
- 📅 **3-6 เดือนข้างหน้า:** พัฒนา cleanup feature ถ้าจำเป็น (พร้อม comprehensive testing)

---

## 10. การลบสาขาอาชีพที่ไม่ได้ใช้งาน (Delete Unused Career Branches)

### ✅ Implementation Complete — 20 มีนาคม 2026

**วัตถุประสงค์:**

- เพิ่มความสามารถในการลบสาขาอาชีพหลัก/ย่อยที่ไม่ได้ใช้งานในเอกสารใดๆ
- ป้องกันการลบสาขาที่กำลังถูกใช้งาน (assigned to documents)
- ป้องกันการลบ "ต้นแบบมาตรฐาน" (STANDARD_BRANCH_NAME)

### 🏗️ Architecture

**Backend (content_database.rs):**

```rust
#[derive(serde::Serialize)]
pub struct BranchUsageReport {
    pub is_used: bool,
    pub document_count: i64,
    pub document_names: Vec<String>,
}

// ตรวจสอบ main branch
pub fn check_branch_usage_global(branch_code: String) -> Result<BranchUsageReport, String> {
    // SELECT id, name FROM Documents WHERE occupation_branch_main = ?1
}

// ตรวจสอบ sub-branch
pub fn check_sub_branch_usage_global(branch_code: String, sub_code: String) -> Result<BranchUsageReport, String> {
    // SELECT id, name FROM Documents WHERE occupation_branch_main = ?1 AND occupation_branch_sub = ?2
}
```

**แนวทาง:** ตรวจสอบที่ `Documents` table โดยตรง — **เหมือนกับ career branch protection** (ไม่ parse metadata JSON)

**Frontend (EditMetadataModal.tsx):**

Dialog มี 4 สถานะ:

1. 🔍 **Checking** — "กำลังตรวจสอบการใช้งาน..."
2. ❌ **Blocked** — "ไม่สามารถลบได้ — กำลังถูกใช้งานใน X เอกสาร" + รายชื่อเอกสาร (ปุ่ม "ปิด" เท่านั้น)
3. ✅ **Allowed** — "ไม่พบเอกสารที่ใช้สาขานี้ — ปลอดภัยที่จะลบ" (ปุ่ม "ยกเลิก" + "ยืนยัน ลบ")
4. ❌ **Error** — "ไม่สามารถตรวจสอบการใช้งานได้"

### 🔐 Protection Rules

1. **ห้ามลบ "ต้นแบบมาตรฐาน"** — ไม่แสดงปุ่ม Delete
2. **ห้ามลบสาขาที่ assigned to documents** — แสดง blocked dialog พร้อมรายชื่อเอกสาร
3. **Cascade delete** — ลบ main branch → sub-branches ลบตามไปด้วย (database foreign key)
4. **Auto-reset selection** — ถ้าลบสาขาที่กำลังเลือกอยู่ → reset เป็น "ต้นแบบมาตรฐาน"

### 🎯 User Flow

```
[คลิกปุ่ม Delete (Trash2 icon)]
  ↓
[Dialog เปิดทันที — สถานะ "กำลังตรวจสอบ..."]
  ↓
[Backend: SELECT FROM Documents WHERE occupation_branch_main = ?]
  ↓
  ├─ มีเอกสารใช้งาน → แสดง Blocked State
  │   • รายชื่อเอกสาร (scrollable list)
  │   • คำแนะนำ: "กรุณาเปลี่ยนสาขาอาชีพในเอกสารเหล่านี้ก่อน"
  │   • ปุ่ม [ปิด] เท่านั้น
  │
  └─ ไม่มีเอกสารใช้งาน → แสดง Allowed State
      • "✅ ไม่พบเอกสารที่ใช้สาขานี้"
      • "⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้"
      • ปุ่ม [ยกเลิก] [ยืนยัน ลบ]
        ↓
      [ยืนยัน] → delete_occupation_branch → รีเฟรช UI
```

### 📋 Manual Testing Results

| Scenario                                 | สถานะ   | หมายเหตุ                                          |
| ---------------------------------------- | ------- | ------------------------------------------------- |
| 1. ลบสาขาที่ไม่มีเอกสารใช้งาน            | ✅ ผ่าน | แสดง "ไม่พบเอกสาร" → ยืนยัน → ลบสำเร็จ            |
| 2. พยายามลบสาขาที่มีเอกสารใช้งาน         | ✅ ผ่าน | แสดง blocked dialog + รายชื่อเอกสาร → ไม่มีปุ่มลบ |
| 3. พยายามลบ "ต้นแบบมาตรฐาน"              | ✅ ผ่าน | ไม่แสดงปุ่ม Delete (protected)                    |
| 4. ลบ main branch → sub-branches cascade | ✅ ผ่าน | Sub-branches หายตามไปด้วย                         |
| 5. ลบสาขาที่กำลังเลือกอยู่               | ✅ ผ่าน | Auto-reset เป็น "ต้นแบบมาตรฐาน"                   |
| 6. Database cleanup หลังลบเอกสารทั้งหมด  | ✅ ผ่าน | ไม่มีข้อมูล orphaned, CASCADE DELETE ทำงานถูกต้อง |

### 🔧 Key Implementation Details

**ความแตกต่างจาก Career Branch Change:**

- **Change:** ตรวจสอบ SubQ usage ใน metadata → แสดง warning → reset to exempted
- **Delete:** ตรวจสอบ document assignment → block deletion (ไม่มี reset option)

**ทำไมไม่ใช้ metadata parsing:**

- Delete ต้องการความแม่นยำสูง — ตรวจสอบว่า branch ถูก **assign** ให้เอกสารหรือไม่
- Documents table เป็น single source of truth สำหรับ branch assignment
- Metadata JSON เก็บ SubQ usage ซึ่งเป็นคนละเรื่องกับ branch assignment

**Self-contained Dialog:**

- ไม่ใช้ `setErrorMsg` (ซึ่งจะไปแสดงที่ top ของ form)
- ทุกข้อความอยู่ใน dialog เท่านั้น
- Dialog state เดียว (`deleteDialog`) จัดการทุกสถานะ

### 📦 Commits

- `a11c03f` — feat: add delete career branch/sub-branch with global usage detection
- `92c94c1` — fix: correct Sub-Question code pattern matching in branch usage detection
- `4014def` — refactor: rewrite delete branch with correct approach matching career branch protection

**Branch:** `career-branch-metadata-protection`

### 🗄️ Database Integrity Verification

**CASCADE DELETE ทำงานถูกต้อง:**

- Documents ลบ → Sections ลบตาม
- Sections ลบ → Questions ลบตาม
- Questions ลบ → QuestionChoices, QuestionAnswerKeys, UserAnswers ลบตาม
- OccupationBranches ลบ → OccupationSubBranches ลบตาม (FK constraint)

**ตรวจสอบแล้ว:** ไม่มีข้อมูล orphaned หลังลบเอกสารทั้งหมดออกจาก App

---

**เอกสารนี้อัปเดตล่าสุด:** 20 มีนาคม 2026  
**สถานะ:** ✅ Implementation Complete — Ready for Production Use
