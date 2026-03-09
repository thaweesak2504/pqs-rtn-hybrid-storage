# Refactoring Plan — PQS RTN Hybrid Storage

> Created: 2026-03-09 | Status: Planning | Branch: `answerkey-json-migration`

---

## 1. Large Files Audit (>500 lines)

### 1.1 Rust Backend

| File                  | Lines     | Public Functions     | ความเร่งด่วน | หมายเหตุ                                            |
| --------------------- | --------- | -------------------- | ------------ | --------------------------------------------------- |
| `content_database.rs` | **5,427** | 90                   | **สูง**      | ใหญ่ที่สุดในโปรเจค — เป็น "God File" ควรแยกเร่งด่วน |
| `main.rs`             | 1,545     | 135 (tauri commands) | ปานกลาง      | ส่วนใหญ่เป็น thin wrappers → ยอมรับได้              |
| `database.rs`         | 773       | ~10                  | ต่ำ          | User/Auth DB — ขนาดพอเหมาะ                          |
| `database_export.rs`  | 578       | ~8                   | ต่ำ          | Export logic — self-contained                       |

#### `content_database.rs` — แผนแยกไฟล์ (แนะนำ)

90 public functions แบ่งเป็น 9 domain groups:

| ไฟล์ใหม่                   | Domain                                | Functions                                       | Lines โดยประมาณ |
| -------------------------- | ------------------------------------- | ----------------------------------------------- | --------------- |
| `content_db_init.rs`       | Init + Migration + Schema             | 3 fns (init, seed, get_path) + all CREATE TABLE | ~600            |
| `content_db_documents.rs`  | Documents + Sections                  | 19 fns (CRUD, seed_template, hierarchy)         | ~1,200          |
| `content_db_questions.rs`  | Questions + Images                    | 9 fns (CRUD, reorder, image upload)             | ~600            |
| `content_db_references.rs` | References + Section Refs             | 19 fns (CRUD, section_ref children)             | ~700            |
| `content_db_occupation.rs` | Occupation Branches + SubQuestions    | 14 fns (branches, sub-branches, sub-questions)  | ~400            |
| `content_db_scoring.rs`    | Scoring + Section Links               | 8 fns (scores, group calc, section links)       | ~400            |
| `content_db_assessment.rs` | Assessment + Answer Keys              | 11 fns (trainee, qualifier, progress)           | ~700            |
| `content_db_required.rs`   | Required Count + Helpers              | 3 fns (check_has_children, required_count)      | ~200            |
| `content_database.rs`      | Shared: connection, types, re-exports | Structs, enums, get_connection                  | ~600            |

**ข้อดี:** แต่ละไฟล์ < 1,200 lines, แยกตาม domain ชัดเจน, `mod.rs` pattern ใช้ re-export  
**ข้อเสีย:** ต้องย้าย struct definitions, แก้ `use crate::` paths, อาจมี circular dependency ถ้าแยกไม่ดี  
**ความเสี่ยง:** ปานกลาง — functions เป็น standalone, ไม่แชร์ state (ใช้แค่ `get_content_connection()`)

---

### 1.2 Frontend (React/TypeScript)

| File                         | Lines     | ความเร่งด่วน | หมายเหตุ                                         |
| ---------------------------- | --------- | ------------ | ------------------------------------------------ |
| `QuestionTreeNode.tsx`       | **3,181** | **สูง**      | มี 4 components ใน 1 ไฟล์ — ดูรายละเอียดด้านล่าง |
| `lcpData.ts`                 | 1,220     | ไม่ต้องทำ    | Static data/constants — ไม่ใช่ logic             |
| `PqsReferenceSection.tsx`    | 987       | ปานกลาง      | Reference management UI — อาจแยก sub-components  |
| `DatabaseManagementPage.tsx` | 793       | ต่ำ          | Admin page — self-contained                      |
| `AddReferenceModal.tsx`      | 775       | ต่ำ          | Modal — complex but self-contained               |
| `aiCommandFilter.ts`         | 765       | ไม่ต้องทำ    | Filter logic — pure functions ไม่ใช่ UI          |
| `PqsQuestionSection.tsx`     | 743       | ต่ำ          | Question list container — ขนาดพอเหมาะ            |
| `rcpData.ts`                 | 679       | ไม่ต้องทำ    | Static data                                      |
| `UserCRUDForm.tsx`           | 666       | ต่ำ          | Form — complex but manageable                    |
| `ActiveDocumentPage.tsx`     | 661       | ต่ำ          | Page container — acceptable size                 |
| `commandMonitor.ts`          | 660       | ไม่ต้องทำ    | Utility — pure logic                             |
| `QuestionDisplayCard.tsx`    | 660       | ต่ำ          | Display component — borderline                   |
| `commandProtectionTest.ts`   | 609       | ไม่ต้องทำ    | Test utility                                     |
| `MiniAudioPlayer.tsx`        | 586       | ต่ำ          | Self-contained media component                   |
| `PqsSectionPreview200.tsx`   | 555       | ต่ำ          | Preview — read-only UI                           |
| `elxData.ts`                 | 552       | ไม่ต้องทำ    | Static data                                      |
| `201RadarWeapon.tsx`         | 539       | ไม่ต้องทำ    | Example/demo page                                |
| `TraineeAnswerBox.tsx`       | 524       | ต่ำ          | Self-contained                                   |
| `AddQuestionModal.tsx`       | 523       | ต่ำ          | Modal — self-contained                           |

---

## 2. QuestionTreeNode.tsx — แผนแยกไฟล์ (รายละเอียด)

### โครงสร้างปัจจุบัน (3,181 lines)

```
Lines 1-34      Imports
Lines 36-93     Utility functions (toThaiNumber, buildPrefix, etc.)
Lines 95-145    Types (SubQuestionItem, ViewMode, QuestionTreeNodeProps)
Lines 146-562   QuestionTreeNode component (416 lines)
Lines 564-3118  QuestionFormCard component (2,554 lines) ← MONSTER
Lines 3120-3176 AsyncImagePreview component (56 lines)
Line  3179      Named exports
```

### External consumers (2 files):

- `PqsQuestionSection.tsx` → imports: `QuestionTreeNode` (default), `QuestionFormCard`, `buildPrefix`
- `QuestionMetadataDisplay.tsx` → imports: `AsyncImagePreview`

### Phase 1: แยก "ปลอดภัย" (ความเสี่ยงต่ำ)

| ไฟล์ใหม่                | เนื้อหา                                                                                                                                                     | Lines |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `questionTreeUtils.ts`  | `DEFAULT_L1_DESC_BY_SEQ`, `toThaiNumber`, `toThaiAlphabet`, `convertThaiToArabic`, `buildPrefix`, `buildPrefix200_300`, types `SubQuestionItem`, `ViewMode` | ~110  |
| `AsyncImagePreview.tsx` | `AsyncImagePreview` component                                                                                                                               | ~60   |

### Phase 2: แยก QuestionFormCard (ความเสี่ยงปานกลาง)

| ไฟล์ใหม่               | เนื้อหา                                                       | Lines  |
| ---------------------- | ------------------------------------------------------------- | ------ |
| `QuestionFormCard.tsx` | QuestionFormCard component ทั้งหมด + `AnswerKeyRow` interface | ~2,560 |

**ผลลัพธ์ Phase 1+2:**

- `QuestionTreeNode.tsx` → ~420 lines ✅
- `QuestionFormCard.tsx` → ~2,560 lines (ยังใหญ่แต่ self-contained)
- `questionTreeUtils.ts` → ~110 lines
- `AsyncImagePreview.tsx` → ~60 lines

### Phase 3: แยกส่วนย่อยของ QuestionFormCard (ความเสี่ยงสูง — ต้องมี test ก่อน)

| ไฟล์ใหม่                   | ส่วน JSX                                      | Lines | ปัญหา                                          |
| -------------------------- | --------------------------------------------- | ----- | ---------------------------------------------- |
| `SubQuestionEditor.tsx`    | Branch selector + item list + active selector | ~600  | แชร์ state 15+ ตัว                             |
| `SectionPickerPanel.tsx`   | Section checkbox list + section_ref children  | ~280  | แชร์ formScoreType, existingId                 |
| `ReferenceLinkSection.tsx` | Reference selector + linked refs              | ~270  | แชร์ errors, linkedRefs                        |
| `ScoreEditor.tsx`          | Scoring + Required count                      | ~220  | แชร์ formScoreIsScored, effectiveIsGroupHeader |

**ข้อควรระวัง Phase 3:** QuestionFormCard มี ~30 useState ที่หลายส่วนอ้างข้ามกัน (เช่น `formScoreType` เปลี่ยน → clear `useSubQuestions`) → ต้องใช้ Context/useReducer เพื่อลด prop drilling

---

## 3. Automated Testing — Feasibility Analysis

### 3.1 สถานะปัจจุบัน

| หัวข้อ                       | สถานะ                                                               |
| ---------------------------- | ------------------------------------------------------------------- |
| Testing framework            | **ไม่มี** — ไม่มี vitest, jest, playwright, cypress ใน dependencies |
| Existing tests               | **ไม่มี** — มีแค่ `commandProtectionTest.ts` (manual test utility)  |
| CI/CD                        | **ไม่มี**                                                           |
| Test scripts in package.json | **ไม่มี**                                                           |

### 3.2 Testing Layers ที่เป็นไปได้

#### Layer 1: Rust Unit Tests (ง่ายที่สุด — แนะนำเริ่มก่อน)

**เป็นไปได้:** ✅ ใช่ — Rust มี built-in test framework

```rust
// ตัวอย่าง: content_database.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_document_id() {
        let id = generate_document_id("Test Doc", "UNIT001");
        assert!(id.starts_with("PQS-"));
    }
}
```

**สิ่งที่ test ได้ทันที:**

- Pure functions (generate_document_id, utility functions)
- Database CRUD (ใช้ in-memory SQLite `:memory:`)
- Scoring calculations (calculate_group_score, calculate_section_total_score)
- Backup/Export logic

**เครื่องมือ:** `cargo test` (built-in, ไม่ต้องติดตั้งเพิ่ม)  
**ระดับความยาก:** ต่ำ  
**คุ้มค่า:** สูงมาก — ป้องกัน regression ใน business logic

#### Layer 2: Frontend Unit Tests (React Components)

**เป็นไปได้:** ✅ ใช่

**เครื่องมือที่ต้องเพิ่ม:**

```json
{
  "devDependencies": {
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "jsdom": "^24.x"
  }
}
```

**สิ่งที่ test ได้:**

- Utility functions (`toThaiNumber`, `buildPrefix`, `convertThaiToArabic`)
- Component rendering (QuestionDisplayCard, AsyncImagePreview)
- Form validation logic (QuestionFormCard handleSave validation)
- State management logic

**ข้อจำกัด:** ต้อง mock `@tauri-apps/api` เพราะ `invoke()` ใช้ไม่ได้นอก Tauri runtime

```typescript
// ตัวอย่าง mock
vi.mock("@tauri-apps/api/tauri", () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path) => `asset://${path}`),
}));
```

**ระดับความยาก:** ปานกลาง  
**คุ้มค่า:** สูง — โดยเฉพาะสำหรับ utility functions และ form validation

#### Layer 3: Integration / E2E Tests (Desktop App)

**เป็นไปได้:** ✅ ใช่ แต่ซับซ้อน

**ตัวเลือก:**

| เครื่องมือ                    | วิธีการ                                  | ความยาก | หมายเหตุ                                          |
| ----------------------------- | ---------------------------------------- | ------- | ------------------------------------------------- |
| **Tauri Driver** (WebDriver)  | ควบคุม Tauri app ผ่าน WebDriver protocol | สูง     | Official Tauri testing tool, ต้อง setup WebDriver |
| **Playwright**                | เปิด Tauri app → connect via CDP         | สูง     | ต้อง custom launcher, อาจไม่เสถียร                |
| **Cypress Component Testing** | Test React components แยกจาก Tauri       | ปานกลาง | ไม่ test Rust backend                             |

**Tauri Driver ตัวอย่าง:**

```toml
# Cargo.toml
[dev-dependencies]
tauri-driver = "0.1"
```

```rust
// tests/e2e.rs
use tauri_driver::build;

#[test]
fn test_app_launches() {
    // Launch app, interact via WebDriver
}
```

**ระดับความยาก:** สูง  
**คุ้มค่า:** สูง แต่ต้องลงทุนเวลามาก — แนะนำทำทีหลังสุด

### 3.3 แผนที่แนะนำ (Incremental)

```
Phase A: Rust Unit Tests          ← เริ่มที่นี่ (1-2 วัน setup)
  ├── cargo test infrastructure
  ├── In-memory SQLite test helpers
  ├── Test scoring calculations
  └── Test CRUD operations

Phase B: Frontend Unit Tests      ← ทำหลัง Phase A (1 วัน setup)
  ├── vitest + @testing-library/react
  ├── Mock @tauri-apps/api
  ├── Test utility functions
  └── Test form validation

Phase C: Component Tests          ← ทำหลังแยกไฟล์ (Phase 1-2 ของ refactoring)
  ├── Test individual components
  ├── Test state management
  └── Snapshot tests

Phase D: E2E Tests                ← ทำเมื่อ feature stable
  ├── Tauri Driver setup
  ├── Basic smoke tests
  └── Critical path tests
```

### 3.4 สรุป Feasibility

| Layer               | เป็นไปได้? | ระดับความยาก | คุ้มค่า | แนะนำ           |
| ------------------- | ---------- | ------------ | ------- | --------------- |
| Rust Unit Tests     | ✅         | ต่ำ          | สูงมาก  | **ทำเลย**       |
| Frontend Unit Tests | ✅         | ปานกลาง      | สูง     | **ทำเร็ว**      |
| Component Tests     | ✅         | ปานกลาง      | ปานกลาง | ทำหลัง refactor |
| E2E Tests           | ✅         | สูง          | สูง     | ทำเมื่อ stable  |

---

## 4. Priority Roadmap

| ลำดับ | งาน                                                           | ความเสี่ยง | ประมาณเวลา  |
| ----- | ------------------------------------------------------------- | ---------- | ----------- |
| 1     | Phase A: Rust unit test infrastructure                        | ต่ำ        | 1-2 วัน     |
| 2     | Phase 1: แยก `questionTreeUtils.ts` + `AsyncImagePreview.tsx` | ต่ำ        | 30 นาที     |
| 3     | Phase 2: แยก `QuestionFormCard.tsx`                           | ปานกลาง    | 1-2 ชั่วโมง |
| 4     | Phase B: Frontend unit test infrastructure                    | ต่ำ        | 1 วัน       |
| 5     | แยก `content_database.rs` เป็น modules                        | ปานกลาง    | 3-4 ชั่วโมง |
| 6     | Phase 3: แยก sub-components ของ QuestionFormCard              | สูง        | 1 วัน       |
| 7     | Phase C+D: Component + E2E tests                              | สูง        | 2-3 วัน     |

---

## 5. Testing Infrastructure Development Plan

> **Branch:** `testing-infrastructure-feature`  
> **Created:** 2026-03-09  
> **Objective:** สร้างระบบทดสอบอัตโนมัติที่ครอบคลุมทั้ง Backend (Rust) และ Frontend (React/TypeScript)

### 5.1 Overview & Goals

#### 🎯 วัตถุประสงค์หลัก

1. **Prevent Regressions** — ป้องกันการเพิ่ม bugs เมื่อแก้ code หรือเพิ่ม features
2. **Enable Refactoring** — สามารถ refactor ไฟล์ใหญ่ได้อย่างมั่นใจ
3. **Documentation** — Tests เป็น living documentation ของระบบ
4. **Speed Up Development** — ลดเวลา manual testing
5. **CI/CD Ready** — เตรียมพร้อมสำหรับ Continuous Integration

#### 📊 Success Metrics

| Metric                     | Target   | Current |
| -------------------------- | -------- | ------- |
| **Rust Code Coverage**     | 60%+     | 0%      |
| **Frontend Code Coverage** | 50%+     | 0%      |
| **Critical Path Coverage** | 90%+     | 0%      |
| **Test Execution Time**    | < 30s    | N/A     |
| **CI/CD Integration**      | ✅ Green | ❌ None |

---

### 5.2 Phase A: Rust Unit Testing Infrastructure

**Duration:** 2-3 days  
**Priority:** 🔴 Critical  
**Risk:** 🟢 Low

#### Step A1: Setup Test Infrastructure (Day 1 Morning)

**Status:** ✅ Complete (2026-03-09, commit `c5f529f`)

**วัตถุประสงค์:** สร้าง foundation สำหรับ Rust tests

**การดำเนินการ:**

```toml
# src-tauri/Cargo.toml
[dev-dependencies]
tempfile = "3.8"        # สำหรับ temporary test files
serial_test = "3.0"     # สำหรับ tests ที่ต้องรัน sequential
mockall = "0.12"        # Mock framework (optional)
```

**สร้างไฟล์ test helper:**

```rust
// src-tauri/src/test_helpers.rs
#[cfg(test)]
pub mod test_helpers {
    use rusqlite::Connection;

    /// สร้าง in-memory database สำหรับ testing
    pub fn create_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        // Initialize schema
        conn
    }

    /// สร้าง temporary database file
    pub fn create_temp_db() -> (tempfile::TempDir, std::path::PathBuf) {
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("test.db");
        (temp_dir, db_path)
    }
}
```

**Automation:**

```powershell
# scripts/setup-rust-tests.ps1
Write-Host "Installing Rust test dependencies..."
Set-Location src-tauri
cargo add --dev tempfile serial_test
cargo test --no-run  # Pre-compile tests
```

**Expected Output:**

- ✅ Test dependencies installed
- ✅ Test helper module created
- ✅ `cargo test` compiles successfully

**Actual Output (Done):**

- ✅ `src-tauri/Cargo.toml` เพิ่ม `tempfile`, `serial_test`, `mockall`
- ✅ สร้าง `src-tauri/src/test_helpers.rs` พร้อม helper + tests
- ✅ สร้าง `scripts/setup-rust-tests.ps1` และรันผ่าน
- ✅ `cargo test --no-run` compile ผ่าน

---

#### Step A2: Test Pure Functions (Day 1 Afternoon)

**Status:** ✅ Complete (2026-03-09, commit `18940f0`)

**วัตถุประสงค์:** ทดสอบ utility functions และ business logic

**Target Files:**

- `content_database.rs` — `generate_document_id()`, `generate_section_id()`
- Scoring calculations
- Data transformations

**ตัวอย่าง Test:**

```rust
// src-tauri/src/content_database.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_document_id_format() {
        let id = generate_document_id("ระบบเรดาร์", "RAD001");
        assert!(id.starts_with("PQS-"));
        assert!(id.contains("RAD001"));
    }

    #[test]
    fn test_generate_document_id_unique() {
        let id1 = generate_document_id("Test", "T001");
        let id2 = generate_document_id("Test", "T001");
        assert_ne!(id1, id2, "IDs should be unique");
    }

    #[test]
    fn test_calculate_group_score_basic() {
        // Test scoring logic
        let result = calculate_group_score(/* params */);
        assert_eq!(result, expected_value);
    }
}
```

**Automation:**

```powershell
# scripts/run-rust-tests.ps1
param(
    [string]$Filter = "",
    [switch]$Coverage
)

Set-Location src-tauri

if ($Coverage) {
    # Install tarpaulin for coverage
    cargo install cargo-tarpaulin
    cargo tarpaulin --out Html --output-dir ../coverage/rust
} else {
    if ($Filter) {
    cargo test $Filter -- --nocapture
    } else {
    cargo test -- --nocapture
    }
}
```

**Expected Output:**

- ✅ 10+ pure function tests passing
- ✅ Test coverage report generated
- ✅ All edge cases covered

**Actual Output (Done):**

- ✅ เพิ่ม tests ใน `src-tauri/src/content_database.rs` (pure + DB helper behavior)
- ✅ Test ทั้งระบบผ่าน `19 passed; 0 failed`
- ✅ `to_thai_digit()` และ `generate_uuid()` ถูก test แล้ว

---

#### Step A3: Test Database CRUD Operations (Day 2 Morning)

**Status:** ✅ Complete (2026-03-09)

**วัตถุประสงค์:** ทดสอบการทำงานกับฐานข้อมูล

**Target Operations:**

- Document CRUD
- Section CRUD
- Question CRUD
- Reference management

**ตัวอย่าง Test:**

```rust
#[cfg(test)]
mod db_tests {
    use super::*;
    use crate::test_helpers::create_test_db;

    #[test]
    fn test_create_document() {
        let conn = create_test_db();

        let doc_id = create_document(
            &conn,
            "Test Document",
            "TEST001",
            "creator123",
            None
        ).unwrap();

        assert!(doc_id.starts_with("PQS-"));

        // Verify it was saved
        let doc = get_document(&conn, &doc_id).unwrap();
        assert_eq!(doc.title, "Test Document");
    }

    #[test]
    fn test_document_cascade_delete() {
        let conn = create_test_db();
        let doc_id = create_document(/* ... */).unwrap();
        let section_id = create_section(/* ... */).unwrap();

        delete_document(&conn, &doc_id).unwrap();

        // Verify cascade deletion
        let sections = get_sections(&conn, &doc_id).unwrap();
        assert_eq!(sections.len(), 0);
    }

    #[serial_test::serial]  // Run sequentially if using file DB
    #[test]
    fn test_concurrent_writes() {
        // Test data integrity under concurrent operations
    }
}
```

**Automation:**

```powershell
# Run only database tests
.\scripts\run-rust-tests.ps1 -Filter "db_tests"
```

**Expected Output:**

- ✅ 20+ CRUD tests passing
- ✅ Transaction rollback tested
- ✅ Foreign key constraints verified
- ✅ Cascade operations tested

**Actual Output (Done):**

- ✅ เพิ่ม CRUD tests สำหรับ `documents`, `sections`, `questions`, `references` ใน `src-tauri/src/test_helpers.rs`
- ✅ เพิ่ม test สำหรับ transaction rollback (unique violation + rollback)
- ✅ เพิ่ม test สำหรับ cascade delete จาก `documents` ไป child tables
- ✅ Full Rust suite ผ่านทั้งหมดหลังเพิ่ม A3

---

#### Step A4: Test Backup & Export Logic (Day 2 Afternoon)

**Status:** ✅ Complete (2026-03-09)

**วัตถุประสงค์:** ทดสอบ critical data operations

**Target Files:**

- `hybrid_backup.rs`
- `database_export.rs`
- File backup operations

**ตัวอย่าง Test:**

```rust
#[cfg(test)]
mod backup_tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_backup_content_to_zip() {
        let (_temp, db_path) = create_temp_db();
        // Create test data

        let zip_path = backup_content_to_zip(
            db_path.to_str().unwrap(),
            "test-backup"
        ).unwrap();

        assert!(fs::metadata(&zip_path).is_ok());

        // Verify ZIP contains expected files
        let file = fs::File::open(&zip_path).unwrap();
        let mut archive = zip::ZipArchive::new(file).unwrap();
        assert!(archive.by_name("content.db").is_ok());
    }

    #[test]
    fn test_restore_from_backup() {
        // Create backup
        let backup_path = /* ... */;

        // Restore to new location
        let restored_db = restore_content_from_zip(&backup_path).unwrap();

        // Verify data integrity
        let conn = Connection::open(restored_db).unwrap();
        let docs = get_all_documents(&conn).unwrap();
        assert_eq!(docs.len(), expected_count);
    }
}
```

**Automation:**

```powershell
# Test backup operations only
.\scripts\run-rust-tests.ps1 -Filter "hybrid_backup::tests"

# Test export operations only
.\scripts\run-rust-tests.ps1 -Filter "database_export::tests"

# Test universal backup helpers
.\scripts\run-rust-tests.ps1 -Filter "universal_sqlite_backup::tests"
```

**Expected Output:**

- ✅ Backup creation tested
- ✅ Restore verified
- ✅ Data integrity confirmed
- ✅ Error handling tested

**Actual Output (Done):**

- ✅ เพิ่ม tests ใน `src-tauri/src/hybrid_backup.rs`:
  - `test_read_backup_manifest_success`
  - `test_read_backup_manifest_missing_manifest_returns_error`
  - `test_copy_dir_recursive_copies_nested_files`
- ✅ เพิ่ม tests ใน `src-tauri/src/database_export.rs`:
  - SQL/CSV export formatting assertions
  - `export_table` data extraction
  - JSON/SQL import path verification
- ✅ เพิ่ม tests ใน `src-tauri/src/universal_sqlite_backup.rs`:
  - `get_table_list`, `get_table_schema`, `get_table_data`
  - SQL literal escaping (`O''Brien`) checks
- ✅ Module test results: `5 + 4 + 3 = 12` tests passed
- ✅ Full Rust suite: `37 passed; 0 failed`

---

#### Step A5: Test Report & CI Integration (Day 3)

**Status:** ✅ Complete (2026-03-09)

**วัตถุประสงค์:** สร้าง automated test reports และเตรียม CI/CD

**การดำเนินการ:**

1. **Generate Coverage Report:**

```powershell
# scripts/test-coverage-rust.ps1
Write-Host "Generating Rust test coverage..."

Set-Location src-tauri

# Install tarpaulin if not exists
if (-not (Get-Command cargo-tarpaulin -ErrorAction SilentlyContinue)) {
    cargo install cargo-tarpaulin
}

# Generate HTML coverage report
cargo tarpaulin `
    --out Html `
    --output-dir ../coverage/rust `
    --exclude-files "main.rs" `
    --ignore-tests

# Generate JSON for CI
cargo tarpaulin `
    --out Json `
    --output-dir ../coverage/rust

Write-Host "Coverage report: coverage/rust/index.html"
```

2. **Create GitHub Actions Workflow:**

```yaml
# .github/workflows/rust-tests.yml
name: Rust Tests

on:
  push:
    branches: [testing-infrastructure-feature, master]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true

      - name: Cache cargo
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/bin/
            ~/.cargo/registry/
            src-tauri/target/
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      - name: Run tests
        working-directory: src-tauri
        run: cargo test --lib

      - name: Generate coverage
        run: |
          cargo install cargo-tarpaulin
          cargo tarpaulin --out Xml --output-dir coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: coverage/cobertura.xml
          flags: rust
```

**Automation Script:**

```powershell
# scripts/run-all-rust-tests.ps1
Write-Host "Running all Rust tests with coverage..." -ForegroundColor Cyan

# Run tests
.\scripts\run-rust-tests.ps1

# Generate coverage
.\scripts\test-coverage-rust.ps1

# Display results
Write-Host "`n✅ Test Summary:" -ForegroundColor Green
Set-Location src-tauri
cargo test --lib -- --list | Measure-Object -Line
Write-Host "Coverage report: coverage/rust/index.html" -ForegroundColor Yellow
```

**Expected Output:**

- ✅ All tests passing (target: 30+ tests)
- ✅ Coverage > 50% for critical modules
- ✅ HTML coverage report generated
- ✅ CI workflow configured

**Actual Output (Done):**

- ✅ Installed `cargo-llvm-cov` (better Windows support than tarpaulin)
- ✅ Generated coverage report: `coverage/rust/html/index.html`
  - **Overall**: 14.46% line coverage, 37 tests passing
  - **test_helpers.rs**: 98.72% coverage (excellent)
  - **database_export.rs**: 54.03% coverage
  - **universal_sqlite_backup.rs**: 38.52% coverage
  - **hybrid_backup.rs**: 23.11% coverage
- ✅ Created `.github/workflows/rust-tests.yml` with 3 jobs:
  - Test suite with coverage + Codecov upload
  - Clippy lints
  - Rustfmt checks
- ✅ Created comprehensive completion report: `project_analysis/PHASE_A_COMPLETION_REPORT.md`
- ✅ **Phase A complete**: 37/37 tests passing, 100% pass rate

---

### 5.3 Phase B: Frontend Unit Testing Infrastructure

**Duration:** 2 days  
**Priority:** 🔴 High  
**Risk:** 🟡 Medium

#### Step B1: Setup Vitest & Testing Library (Day 1 Morning)

**วัตถุประสงค์:** ติดตั้งและ configure frontend testing tools

**การดำเนินการ:**

1. **Install Dependencies:**

```json
// package.json additions
{
  "devDependencies": {
    "vitest": "^1.3.1",
    "@testing-library/react": "^14.2.1",
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^24.0.0",
    "@vitest/coverage-v8": "^1.3.1",
    "@vitest/ui": "^1.3.1"
  },
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run"
  }
}
```

2. **Create Vitest Config:**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "**/types",
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 45,
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

3. **Create Test Setup File:**

```typescript
// src/test/setup.ts
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Tauri API
vi.mock("@tauri-apps/api/tauri", () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path: string) => `asset://${path}`),
}));

vi.mock("@tauri-apps/api/dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
  ask: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("@tauri-apps/api/fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  readBinaryFile: vi.fn(),
  writeBinaryFile: vi.fn(),
}));

// Mock window object additions
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Suppress console.error in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Not implemented: HTMLFormElement.prototype.submit")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
```

**Automation:**

```powershell
# scripts/setup-frontend-tests.ps1
Write-Host "Setting up frontend testing infrastructure..." -ForegroundColor Cyan

# Install dependencies
npm install --save-dev `
    vitest `
    @testing-library/react `
    @testing-library/jest-dom `
    @testing-library/user-event `
    jsdom `
    @vitest/coverage-v8 `
    @vitest/ui

# Create test directories
New-Item -ItemType Directory -Force -Path "src/test"
New-Item -ItemType Directory -Force -Path "src/test/__tests__"
New-Item -ItemType Directory -Force -Path "src/test/mocks"
New-Item -ItemType Directory -Force -Path "coverage/frontend"

Write-Host "✅ Frontend testing setup complete!" -ForegroundColor Green
Write-Host "Run tests with: npm test" -ForegroundColor Yellow
```

**Expected Output:**

- ✅ All packages installed
- ✅ Vitest configured
- ✅ Test directories created
- ✅ `npm test` runs successfully (0 tests)

---

#### Step B2: Test Utility Functions (Day 1 Afternoon)

**วัตถุประสงค์:** ทดสอบ pure functions และ helpers

**Target Files:**

- `questionTreeUtils.ts` (หลังแยกไฟล์)
- Form validators
- Data transformations

**ตัวอย่าง Tests:**

```typescript
// src/test/__tests__/questionTreeUtils.test.ts
import { describe, it, expect } from "vitest";
import {
  toThaiNumber,
  toThaiAlphabet,
  convertThaiToArabic,
  buildPrefix,
  buildPrefix200_300,
} from "@/utils/questionTreeUtils";

describe("questionTreeUtils", () => {
  describe("toThaiNumber", () => {
    it("should convert numbers to Thai numerals", () => {
      expect(toThaiNumber(1)).toBe("๑");
      expect(toThaiNumber(123)).toBe("๑๒๓");
      expect(toThaiNumber(0)).toBe("๐");
    });

    it("should handle negative numbers", () => {
      expect(toThaiNumber(-5)).toBe("-๕");
    });
  });

  describe("toThaiAlphabet", () => {
    it("should convert to Thai alphabet", () => {
      expect(toThaiAlphabet(0)).toBe("ก");
      expect(toThaiAlphabet(1)).toBe("ข");
      expect(toThaiAlphabet(25)).toBe("ฮ");
    });

    it("should handle out of range", () => {
      expect(toThaiAlphabet(-1)).toBe("");
      expect(toThaiAlphabet(50)).toBe("");
    });
  });

  describe("buildPrefix", () => {
    it("should build correct prefix for level 0", () => {
      const result = buildPrefix(0, 5, 0, 0);
      expect(result).toBe("๕. ");
    });

    it("should build correct prefix for nested levels", () => {
      const result = buildPrefix(1, 3, 2, 0);
      expect(result).toBe("๓.๒ ");
    });
  });

  describe("convertThaiToArabic", () => {
    it("should convert Thai numerals to Arabic", () => {
      expect(convertThaiToArabic("๑๒๓")).toBe(123);
      expect(convertThaiToArabic("๐")).toBe(0);
    });

    it("should handle mixed content", () => {
      expect(convertThaiToArabic("ข้อ ๕")).toBe(5);
    });

    it("should return -1 for invalid input", () => {
      expect(convertThaiToArabic("invalid")).toBe(-1);
    });
  });
});
```

**Automation:**

```powershell
# scripts/run-frontend-tests.ps1
param(
    [string]$Filter = "",
    [switch]$Coverage,
    [switch]$UI,
    [switch]$Watch
)

if ($UI) {
    npm run test:ui
} elseif ($Coverage) {
    npm run test:coverage
    Write-Host "`nCoverage report: coverage/frontend/index.html" -ForegroundColor Yellow
} elseif ($Watch) {
    npm test -- $Filter
} else {
    npm run test:run -- $Filter
}
```

**Expected Output:**

- ✅ 15+ utility function tests passing
- ✅ 100% coverage for pure functions
- ✅ Edge cases handled

---

#### Step B3: Test React Components (Day 2)

**วัตถุประสงค์:** ทดสอบ component rendering และ interactions

**Target Components:**

- `AsyncImagePreview`
- `QuestionDisplayCard`
- Form components

**ตัวอย่าง Component Test:**

```typescript
// src/test/__tests__/AsyncImagePreview.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AsyncImagePreview } from '@/components/AsyncImagePreview';
import { invoke } from '@tauri-apps/api/tauri';

vi.mock('@tauri-apps/api/tauri');

describe('AsyncImagePreview', () => {
  it('should show loading state initially', () => {
    render(<AsyncImagePreview questionId="Q001" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should load and display image', async () => {
    vi.mocked(invoke).mockResolvedValueOnce('data:image/png;base64,ABC123');

    render(<AsyncImagePreview questionId="Q001" />);

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'data:image/png;base64,ABC123');
    });
  });

  it('should show error on load failure', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('Failed'));

    render(<AsyncImagePreview questionId="Q001" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should handle missing questionId', () => {
    render(<AsyncImagePreview questionId="" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
```

**Form Validation Test:**

```typescript
// src/test/__tests__/QuestionFormCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionFormCard } from '@/components/QuestionFormCard';

describe('QuestionFormCard - Validation', () => {
  it('should show error when description is empty', async () => {
    const handleSave = vi.fn();
    render(<QuestionFormCard onSave={handleSave} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('should validate sequence number range', async () => {
    render(<QuestionFormCard />);

    const seqInput = screen.getByLabelText(/sequence/i);
    await userEvent.clear(seqInput);
    await userEvent.type(seqInput, '-1');

    expect(screen.getByText(/must be positive/i)).toBeInTheDocument();
  });

  it('should submit valid form', async () => {
    const handleSave = vi.fn().mockResolvedValue({ success: true });
    render(<QuestionFormCard onSave={handleSave} />);

    await userEvent.type(screen.getByLabelText(/description/i), 'Test question');
    await userEvent.type(screen.getByLabelText(/sequence/i), '1');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Test question',
          sequence: 1
        })
      );
    });
  });
});
```

**Expected Output:**

- ✅ 20+ component tests passing
- ✅ User interactions tested
- ✅ Error states covered
- ✅ Accessibility validated

---

### 5.4 Phase C: Integration Testing

**Duration:** 2 days  
**Priority:** 🟡 Medium  
**Risk:** 🟡 Medium

#### Step C1: API Integration Tests

**วัตถุประสงค์:** ทดสอบการเชื่อมต่อระหว่าง Frontend-Backend

**ตัวอย่าง:**

```typescript
// src/test/__tests__/integration/documentApi.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { invoke } from "@tauri-apps/api/tauri";
import * as documentService from "@/services/documentService";

vi.mock("@tauri-apps/api/tauri");

describe("Document API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create document and return ID", async () => {
    const mockDocId = "PQS-TEST-001";
    vi.mocked(invoke).mockResolvedValueOnce(mockDocId);

    const result = await documentService.createDocument({
      title: "Test Doc",
      unit_id: "UNIT001",
    });

    expect(invoke).toHaveBeenCalledWith("create_document", {
      title: "Test Doc",
      unitId: "UNIT001",
    });
    expect(result).toBe(mockDocId);
  });

  it("should handle API errors gracefully", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("Database error"));

    await expect(documentService.createDocument({ title: "" })).rejects.toThrow(
      "Database error",
    );
  });
});
```

**Automation:**

```powershell
# scripts/run-integration-tests.ps1
Write-Host "Running integration tests..." -ForegroundColor Cyan

npm run test:run -- --run src/test/__tests__/integration

Write-Host "✅ Integration tests complete" -ForegroundColor Green
```

---

### 5.5 Phase D: E2E Testing with Tauri Driver

**Duration:** 3 days  
**Priority:** 🟢 Low (Future)  
**Risk:** 🔴 High

#### Step D1: Setup Tauri Driver

**การดำเนินการ:**

```toml
# src-tauri/Cargo.toml
[dev-dependencies]
tauri-driver = "0.1"
serde_json = "1.0"
```

```typescript
// e2e/setup.ts
import { spawn, ChildProcess } from "child_process";
import { Builder, By, until } from "selenium-webdriver";

export class TauriApp {
  private process: ChildProcess | null = null;
  private driver: any;

  async start() {
    // Start Tauri app
    this.process = spawn("cargo", ["tauri", "dev"], {
      cwd: "src-tauri",
    });

    // Wait for app to be ready
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Connect via WebDriver
    this.driver = await new Builder()
      .forBrowser("chrome")
      .usingServer("http://localhost:4444")
      .build();
  }

  async stop() {
    if (this.driver) {
      await this.driver.quit();
    }
    if (this.process) {
      this.process.kill();
    }
  }
}
```

**ตัวอย่าง E2E Test:**

```typescript
// e2e/tests/document-crud.e2e.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TauriApp } from "../setup";

describe("Document CRUD E2E", () => {
  let app: TauriApp;

  beforeAll(async () => {
    app = new TauriApp();
    await app.start();
  }, 30000);

  afterAll(async () => {
    await app.stop();
  });

  it("should create a new document", async () => {
    // Navigate to create page
    // Fill form
    // Submit
    // Verify document appears in list
  });
});
```

**Note:** E2E testing ทำในภายหลังเมื่อ features stable

---

### 5.6 Automation Scripts Summary

**Master Test Runner:**

```powershell
# scripts/test-all.ps1
param(
    [switch]$Coverage,
    [switch]$CI
)

Write-Host "=== PQS RTN Testing Suite ===" -ForegroundColor Cyan

# Rust tests
Write-Host "`n[1/3] Running Rust tests..." -ForegroundColor Yellow
Set-Location src-tauri
if ($Coverage) {
    cargo tarpaulin --out Html --output-dir ../coverage/rust
} else {
    cargo test --lib
}
$rustExit = $LASTEXITCODE

# Frontend tests
Write-Host "`n[2/3] Running Frontend tests..." -ForegroundColor Yellow
Set-Location ..
if ($Coverage) {
    npm run test:coverage
} else {
    npm run test:run
}
$frontendExit = $LASTEXITCODE

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
if ($rustExit -eq 0) {
    Write-Host "✅ Rust tests: PASSED" -ForegroundColor Green
} else {
    Write-Host "❌ Rust tests: FAILED" -ForegroundColor Red
}

if ($frontendExit -eq 0) {
    Write-Host "✅ Frontend tests: PASSED" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend tests: FAILED" -ForegroundColor Red
}

if ($Coverage) {
    Write-Host "`nCoverage reports:"
    Write-Host "  Rust: coverage/rust/index.html"
    Write-Host "  Frontend: coverage/index.html"
}

# Exit with error if any tests failed
if ($rustExit -ne 0 -or $frontendExit -ne 0) {
    exit 1
}
```

**CI/CD Integration:**

```yaml
# .github/workflows/tests.yml
name: Tests

on:
  push:
    branches: [testing-infrastructure-feature]
  pull_request:
    branches: [master]

jobs:
  test-rust:
    name: Rust Tests
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run tests
        working-directory: src-tauri
        run: cargo test --lib
      - name: Coverage
        run: |
          cargo install cargo-tarpaulin
          cargo tarpaulin --out Xml
      - uses: codecov/codecov-action@v3
        with:
          files: coverage/cobertura.xml

  test-frontend:
    name: Frontend Tests
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: coverage/clover.xml
```

---

### 5.7 Success Criteria & Milestones

| Milestone                       | Criteria                    | Target Date |
| ------------------------------- | --------------------------- | ----------- |
| **M1: Rust Infrastructure**     | cargo test works, 10+ tests | Day 3       |
| **M2: Frontend Infrastructure** | vitest works, 15+ tests     | Day 5       |
| **M3: Coverage Threshold**      | Rust 50%+, Frontend 40%+    | Day 7       |
| **M4: CI Integration**          | GitHub Actions green        | Day 8       |
| **M5: Documentation**           | Test writing guide complete | Day 9       |

---

### 5.8 Next Steps

1. **Start Phase A, Step A1** — Setup Rust test infrastructure (2-3 hours)
2. **Create test helper module** — Foundation for all Rust tests (1 hour)
3. **Write first 5 tests** — Prove the concept works (2 hours)
4. **Iterate** — Follow the plan systematically

**Ready to begin?** 🚀
