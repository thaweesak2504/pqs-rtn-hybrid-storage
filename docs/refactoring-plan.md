# Refactoring Plan — PQS RTN Hybrid Storage

> Created: 2026-03-09 | Status: Planning | Branch: `answerkey-json-migration`

---

## 1. Large Files Audit (>500 lines)

### 1.1 Rust Backend

| File | Lines | Public Functions | ความเร่งด่วน | หมายเหตุ |
|------|-------|-----------------|-------------|----------|
| `content_database.rs` | **5,427** | 90 | **สูง** | ใหญ่ที่สุดในโปรเจค — เป็น "God File" ควรแยกเร่งด่วน |
| `main.rs` | 1,545 | 135 (tauri commands) | ปานกลาง | ส่วนใหญ่เป็น thin wrappers → ยอมรับได้ |
| `database.rs` | 773 | ~10 | ต่ำ | User/Auth DB — ขนาดพอเหมาะ |
| `database_export.rs` | 578 | ~8 | ต่ำ | Export logic — self-contained |

#### `content_database.rs` — แผนแยกไฟล์ (แนะนำ)

90 public functions แบ่งเป็น 9 domain groups:

| ไฟล์ใหม่ | Domain | Functions | Lines โดยประมาณ |
|----------|--------|-----------|----------------|
| `content_db_init.rs` | Init + Migration + Schema | 3 fns (init, seed, get_path) + all CREATE TABLE | ~600 |
| `content_db_documents.rs` | Documents + Sections | 19 fns (CRUD, seed_template, hierarchy) | ~1,200 |
| `content_db_questions.rs` | Questions + Images | 9 fns (CRUD, reorder, image upload) | ~600 |
| `content_db_references.rs` | References + Section Refs | 19 fns (CRUD, section_ref children) | ~700 |
| `content_db_occupation.rs` | Occupation Branches + SubQuestions | 14 fns (branches, sub-branches, sub-questions) | ~400 |
| `content_db_scoring.rs` | Scoring + Section Links | 8 fns (scores, group calc, section links) | ~400 |
| `content_db_assessment.rs` | Assessment + Answer Keys | 11 fns (trainee, qualifier, progress) | ~700 |
| `content_db_required.rs` | Required Count + Helpers | 3 fns (check_has_children, required_count) | ~200 |
| `content_database.rs` | Shared: connection, types, re-exports | Structs, enums, get_connection | ~600 |

**ข้อดี:** แต่ละไฟล์ < 1,200 lines, แยกตาม domain ชัดเจน, `mod.rs` pattern ใช้ re-export  
**ข้อเสีย:** ต้องย้าย struct definitions, แก้ `use crate::` paths, อาจมี circular dependency ถ้าแยกไม่ดี  
**ความเสี่ยง:** ปานกลาง — functions เป็น standalone, ไม่แชร์ state (ใช้แค่ `get_content_connection()`)

---

### 1.2 Frontend (React/TypeScript)

| File | Lines | ความเร่งด่วน | หมายเหตุ |
|------|-------|-------------|----------|
| `QuestionTreeNode.tsx` | **3,181** | **สูง** | มี 4 components ใน 1 ไฟล์ — ดูรายละเอียดด้านล่าง |
| `lcpData.ts` | 1,220 | ไม่ต้องทำ | Static data/constants — ไม่ใช่ logic |
| `PqsReferenceSection.tsx` | 987 | ปานกลาง | Reference management UI — อาจแยก sub-components |
| `DatabaseManagementPage.tsx` | 793 | ต่ำ | Admin page — self-contained |
| `AddReferenceModal.tsx` | 775 | ต่ำ | Modal — complex but self-contained |
| `aiCommandFilter.ts` | 765 | ไม่ต้องทำ | Filter logic — pure functions ไม่ใช่ UI |
| `PqsQuestionSection.tsx` | 743 | ต่ำ | Question list container — ขนาดพอเหมาะ |
| `rcpData.ts` | 679 | ไม่ต้องทำ | Static data |
| `UserCRUDForm.tsx` | 666 | ต่ำ | Form — complex but manageable |
| `ActiveDocumentPage.tsx` | 661 | ต่ำ | Page container — acceptable size |
| `commandMonitor.ts` | 660 | ไม่ต้องทำ | Utility — pure logic |
| `QuestionDisplayCard.tsx` | 660 | ต่ำ | Display component — borderline |
| `commandProtectionTest.ts` | 609 | ไม่ต้องทำ | Test utility |
| `MiniAudioPlayer.tsx` | 586 | ต่ำ | Self-contained media component |
| `PqsSectionPreview200.tsx` | 555 | ต่ำ | Preview — read-only UI |
| `elxData.ts` | 552 | ไม่ต้องทำ | Static data |
| `201RadarWeapon.tsx` | 539 | ไม่ต้องทำ | Example/demo page |
| `TraineeAnswerBox.tsx` | 524 | ต่ำ | Self-contained |
| `AddQuestionModal.tsx` | 523 | ต่ำ | Modal — self-contained |

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

| ไฟล์ใหม่ | เนื้อหา | Lines |
|----------|--------|-------|
| `questionTreeUtils.ts` | `DEFAULT_L1_DESC_BY_SEQ`, `toThaiNumber`, `toThaiAlphabet`, `convertThaiToArabic`, `buildPrefix`, `buildPrefix200_300`, types `SubQuestionItem`, `ViewMode` | ~110 |
| `AsyncImagePreview.tsx` | `AsyncImagePreview` component | ~60 |

### Phase 2: แยก QuestionFormCard (ความเสี่ยงปานกลาง)

| ไฟล์ใหม่ | เนื้อหา | Lines |
|----------|--------|-------|
| `QuestionFormCard.tsx` | QuestionFormCard component ทั้งหมด + `AnswerKeyRow` interface | ~2,560 |

**ผลลัพธ์ Phase 1+2:**
- `QuestionTreeNode.tsx` → ~420 lines ✅
- `QuestionFormCard.tsx` → ~2,560 lines (ยังใหญ่แต่ self-contained)
- `questionTreeUtils.ts` → ~110 lines
- `AsyncImagePreview.tsx` → ~60 lines

### Phase 3: แยกส่วนย่อยของ QuestionFormCard (ความเสี่ยงสูง — ต้องมี test ก่อน)

| ไฟล์ใหม่ | ส่วน JSX | Lines | ปัญหา |
|----------|---------|-------|-------|
| `SubQuestionEditor.tsx` | Branch selector + item list + active selector | ~600 | แชร์ state 15+ ตัว |
| `SectionPickerPanel.tsx` | Section checkbox list + section_ref children | ~280 | แชร์ formScoreType, existingId |
| `ReferenceLinkSection.tsx` | Reference selector + linked refs | ~270 | แชร์ errors, linkedRefs |
| `ScoreEditor.tsx` | Scoring + Required count | ~220 | แชร์ formScoreIsScored, effectiveIsGroupHeader |

**ข้อควรระวัง Phase 3:** QuestionFormCard มี ~30 useState ที่หลายส่วนอ้างข้ามกัน (เช่น `formScoreType` เปลี่ยน → clear `useSubQuestions`) → ต้องใช้ Context/useReducer เพื่อลด prop drilling

---

## 3. Automated Testing — Feasibility Analysis

### 3.1 สถานะปัจจุบัน

| หัวข้อ | สถานะ |
|--------|-------|
| Testing framework | **ไม่มี** — ไม่มี vitest, jest, playwright, cypress ใน dependencies |
| Existing tests | **ไม่มี** — มีแค่ `commandProtectionTest.ts` (manual test utility) |
| CI/CD | **ไม่มี** |
| Test scripts in package.json | **ไม่มี** |

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
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path) => `asset://${path}`),
}));
```

**ระดับความยาก:** ปานกลาง  
**คุ้มค่า:** สูง — โดยเฉพาะสำหรับ utility functions และ form validation

#### Layer 3: Integration / E2E Tests (Desktop App)

**เป็นไปได้:** ✅ ใช่ แต่ซับซ้อน

**ตัวเลือก:**

| เครื่องมือ | วิธีการ | ความยาก | หมายเหตุ |
|-----------|--------|---------|----------|
| **Tauri Driver** (WebDriver) | ควบคุม Tauri app ผ่าน WebDriver protocol | สูง | Official Tauri testing tool, ต้อง setup WebDriver |
| **Playwright** | เปิด Tauri app → connect via CDP | สูง | ต้อง custom launcher, อาจไม่เสถียร |
| **Cypress Component Testing** | Test React components แยกจาก Tauri | ปานกลาง | ไม่ test Rust backend |

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

| Layer | เป็นไปได้? | ระดับความยาก | คุ้มค่า | แนะนำ |
|-------|----------|-------------|--------|-------|
| Rust Unit Tests | ✅ | ต่ำ | สูงมาก | **ทำเลย** |
| Frontend Unit Tests | ✅ | ปานกลาง | สูง | **ทำเร็ว** |
| Component Tests | ✅ | ปานกลาง | ปานกลาง | ทำหลัง refactor |
| E2E Tests | ✅ | สูง | สูง | ทำเมื่อ stable |

---

## 4. Priority Roadmap

| ลำดับ | งาน | ความเสี่ยง | ประมาณเวลา |
|-------|-----|-----------|-----------|
| 1 | Phase A: Rust unit test infrastructure | ต่ำ | 1-2 วัน |
| 2 | Phase 1: แยก `questionTreeUtils.ts` + `AsyncImagePreview.tsx` | ต่ำ | 30 นาที |
| 3 | Phase 2: แยก `QuestionFormCard.tsx` | ปานกลาง | 1-2 ชั่วโมง |
| 4 | Phase B: Frontend unit test infrastructure | ต่ำ | 1 วัน |
| 5 | แยก `content_database.rs` เป็น modules | ปานกลาง | 3-4 ชั่วโมง |
| 6 | Phase 3: แยก sub-components ของ QuestionFormCard | สูง | 1 วัน |
| 7 | Phase C+D: Component + E2E tests | สูง | 2-3 วัน |
