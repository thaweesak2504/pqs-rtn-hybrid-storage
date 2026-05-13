# 🔧 Phase 5 Redo — Incremental Refactoring Plan

> **วันที่สร้าง:** 2026-05-01 | **สถานะ:** Planning
> **Branch:** `project-review-actions`
> **บทเรียนจากครั้งก่อน:** ครั้งก่อนทำ 3 ไฟล์ใหญ่ (QFC + main.rs + tests.rs) ใน commit เดียว → regression หลายจุดใน 200 Section → Revert ทั้งหมด (commit `7967e0f`)

---

## 📊 สถานะปัจจุบันของไฟล์เป้าหมาย

| # | ไฟล์ | KB | Lines | ความเสี่ยง | หมายเหตุ |
|---|------|-----|-------|-----------|---------|
| 1 | `QuestionFormCard.tsx` | 138.7 | 2,608 | 🔴 สูงมาก | Logic ซับซ้อน, Section 100/200/300 ต่างกันมาก |
| 2 | `tests.rs` | 82.7 | 2,161 | 🟢 ต่ำ | Test-only, ไม่กระทบ Production |
| 3 | `main.rs` | 49.6 | 1,543 | 🟡 กลาง | 147 tauri commands, ย้ายเป็นกลุ่มได้ |
| 4 | `CareerBranchManagerModal.tsx` | 49.2 | 981 | 🟡 กลาง | Modal เดี่ยว, ไม่เกี่ยวกับ 200 Section |
| 5 | `schema.rs` | 48.4 | 1,266 | 🟢 ต่ำ | CREATE TABLE statements, ย้ายไม่คุ้ม |
| 6 | `PqsReferenceSection.tsx` | 45.7 | 1,015 | 🟡 กลาง | Reference editor, แยก hook ออกได้ |
| 7 | `AddReferenceModal.tsx` | 34.1 | 779 | 🟢 ต่ำ | Modal เดี่ยว |
| 8 | `QuestionDisplayCard.tsx` | 31.2 | 663 | 🟢 ต่ำ | Read-only display |
| 9 | `DatabaseManagementPage.tsx` | 30.8 | 799 | 🟢 ต่ำ | Admin page |

---

## 📐 การวัดขนาดจริงของ QuestionFormCard.tsx (2,608 lines)

### โครงสร้างปัจจุบัน

| ส่วน | Lines | ช่วงบรรทัด | รายละเอียด |
|------|-------|-----------|-----------|
| Imports | 35 | L1-35 | External libraries + internal modules |
| Types + Constants | 68 | L36-103 | `QuestionFormCardProps`, `SubQuestionItem`, `AnswerKeyRow`, `EMPTY_REFS`, etc. |
| Component Logic | 1,294 | L105-1398 | State 50+ ตัว, useEffect 20+ ตัว, handlers 15+ ตัว |
| JSX Return Block | 1,209 | L1399-2607 | UI rendering ทั้งหมด |
| Export | 2 | L2608-2609 | `export default` |

### JSX Blocks ที่แยกออกได้ (วัดจริง)

| Block | Lines | ช่วงบรรทัด | จะเป็น Component |
|-------|-------|-----------|-----------------|
| Exempted/Toggle | 115 | L1506-1620 | `ExemptedToggleSection.tsx` |
| Description | 52 | L1623-1674 | (รวมใน main) |
| SubQ Editor | 205 | L1676-1880 | `SubQuestionEditorSection.tsx` |
| SubQ Binding | 61 | L1882-1942 | `SubQuestionBindingSection.tsx` |
| Ref Toggle | 56 | L1943-1998 | (รวมกับ References) |
| References | 180 | L1999-2178 | `ReferenceSection.tsx` |
| Answer Key | 48 | L2197-2244 | `AnswerKeySection.tsx` |
| Scoring | 117 | L2245-2361 | `ScoringSection.tsx` |
| Section Picker | 165 | L2391-2555 | `SectionPickerSection.tsx` |
| **รวม JSX** | **999** | | |

### ผลลัพธ์ที่คาดหวัง (หลัง Phase 5C-5F)

| รายการ | Lines |
|--------|-------|
| ก่อน (ปัจจุบัน) | **2,608** |
| − Types + Constants (5C) | -68 |
| − Theme Colors (5D) | -29 |
| − Scroll Hooks (5E) | -25 |
| − JSX Sub-components (5F) | -999 |
| + Imports + Component Calls (overhead) | +60 |
| **หลัง (ถ้าทำ 5C-5F, ไม่ทำ 5G)** | **~1,547** |

> **สรุป:** จาก 2,608 → ~1,550 lines (ลด ~41%) โดยไม่ต้องแตะ logic ที่ซับซ้อน

---

## 🎯 หลักการสำคัญ

1. **ทำจากง่าย → ยาก, เสี่ยงน้อย → สูง**
2. **1 commit = 1 ไฟล์ = 1 การเปลี่ยนแปลง** (ไม่รวมหลายไฟล์ใน commit เดียว)
3. **ทุก commit ต้องผ่าน Auto Test ก่อน push**
4. **ไม่ใช้ script พิเศษ (.cjs etc.)** — ทำ manual โดยตรง
5. **ลดขนาดเท่าที่ทำได้โดยไม่กระทบ** — ไม่ต้องบังคับให้ทุกไฟล์ < 1,500 lines
6. **Manual Test ทุก phase** — โดยเฉพาะ Section 200 ที่มีปัญหาก่อนหน้า

---

## 📝 แผนดำเนินการ

### Phase 5A: `tests.rs` — แยก test modules (เสี่ยงต่ำสุด)

> **ทำไมก่อน:** test-only code ไม่กระทบ production เลย, ถ้าพัง = test fail ชัดเจน

**วิธี:** แยก `tests.rs` (2,161 lines) → หลาย sub-modules ใน `tests/` directory

**ขั้นตอน:**
1. สร้างโฟลเดอร์ `src-tauri/src/content_database/tests/`
2. สร้าง `tests/mod.rs` → `mod` declarations
3. ย้าย test functions ทีละกลุ่ม (sections → questions → scoring → branches → cleanup)
4. แต่ละกลุ่มเป็น 1 commit

**Auto Test:**
```bash
cd src-tauri && cargo test        # ต้อง 98 tests ผ่านทุกตัว
cd src-tauri && cargo build       # compile สำเร็จ
```

**Manual Test:** ไม่จำเป็น (test-only code)

---

### Phase 5B: `main.rs` — แยก tauri commands (เสี่ยงกลาง)

> **ทำไมถัดมา:** เป็น Rust backend, compile-time type check แข็งแกร่ง, ถ้า function signature ผิด = compile error ทันที

**วิธี:** ย้าย `#[tauri::command]` functions ออกเป็นไฟล์ตามกลุ่ม, เหลือ `fn main()` + handler registration ใน `main.rs`

**ขั้นตอน (ทำทีละกลุ่ม, 1 commit ต่อกลุ่ม):**

| Commit | กลุ่ม | Functions | Lines (ประมาณ) |
|--------|-------|-----------|----------------|
| 5B.1 | `commands/zoom.rs` | `zoom_in`, `zoom_out`, `zoom_reset` | ~50 |
| 5B.2 | `commands/users.rs` | `get_all_users`, `get_user_by_id`, `create_user`, `update_user`, `change_password`, `delete_user`, `authenticate_user`, `migrate_passwords` | ~120 |
| 5B.3 | `commands/officers.rs` | `get_all_high_ranking_officers`, `update_high_ranking_officer`, `delete_high_ranking_officer`, `add_high_ranking_officer` | ~80 |
| 5B.4 | `commands/avatars.rs` | avatar-related commands | ~160 |
| 5B.5 | `commands/backup.rs` | backup/restore commands | ~100 |
| 5B.6 | `commands/export.rs` | export commands | ~30 |
| 5B.7 | `commands/system.rs` | `get_app_data_dir`, `get_database_path`, `get_system_info`, etc. | ~70 |

**Auto Test (ทุก commit):**
```bash
cd src-tauri && cargo build       # compile สำเร็จ
cd src-tauri && cargo test        # 98 tests ผ่าน
npx tsc --noEmit                  # Frontend ไม่กระทบ
```

**Manual Test:**
- เปิดแอป → Login ได้ปกติ
- ทดสอบ Backup/Restore (ถ้า commit นั้นย้าย backup commands)
- ทดสอบ Zoom In/Out (ถ้า commit นั้นย้าย zoom commands)

---

### Phase 5C: `QuestionFormCard.tsx` — แยก types + constants (เสี่ยงต่ำ)

> **เริ่มจากส่วนที่เสี่ยงน้อยที่สุดก่อน:** Types, interfaces, constants ไม่มี logic

| Commit | สิ่งที่แยก | รายละเอียด | Lines |
|--------|-----------|-----------|-------|
| 5C.1 | `questionFormCard/types.ts` | `QuestionFormCardProps`, `SubQuestionItem`, `AnswerKeyRow`, + DB types ทั้งหมด | ~80 |
| 5C.2 | `questionFormCard/constants.ts` | `EMPTY_REFS`, `REFERENCE_PAGE_*`, `DEFAULT_L1_DESC_BY_SEQ` | ~30 |

**Auto Test (ทุก commit):**
```bash
npx tsc --noEmit                  # 0 errors
npx vitest run                    # 175 tests ผ่าน
```

**Manual Test (หลัง 5C.2 เสร็จ):**

| # | ทดสอบ | Section | คาดหวัง |
|---|-------|---------|---------|
| 1 | เปิดแอป → เลือก Document → เข้า Section 100 | 100 | หน้าโหลดปกติ |
| 2 | กด "สร้างข้อใหม่" → กรอกข้อมูล → บันทึก | 100 | บันทึกสำเร็จ |
| 3 | กด Edit ข้อที่สร้าง → แก้ไข → บันทึก | 100 | บันทึกสำเร็จ |
| 4 | เข้า Section 200 → กด Edit ข้อ 2xx.1 | 200 | ชื่อคำถาม **disabled** (แก้ไขไม่ได้) |
| 5 | กด Edit ข้อ 2xx.2 | 200 | Description **แสดงอยู่** |
| 6 | กด Edit ข้อ 2xx.4 | 200 | Description **แสดงอยู่** |
| 7 | เข้า Section 300 → กด Edit ข้อ 3xx.1 | 300 | ข้อมูลครบ, ไม่มี error |

---

### Phase 5D: `QuestionFormCard.tsx` — แยก theme colors (เสี่ยงต่ำ)

| Commit | สิ่งที่แยก | รายละเอียด | Lines |
|--------|-----------|-----------|-------|
| 5D.1 | `questionFormCard/themeColors.ts` | `sqClr` theme objects (orange 200, purple 300), `getThemeColors()` function | ~29 |

**Auto Test:** เหมือน 5C

**Manual Test:**
- Section 200 → Sub-question editor → สี orange ปกติ
- Section 300 → Sub-question editor → สี purple ปกติ

---

### Phase 5E: `QuestionFormCard.tsx` — แยก scroll visibility hook (เสี่ยงต่ำ)

| Commit | สิ่งที่แยก | รายละเอียด | Lines |
|--------|-----------|-----------|-------|
| 5E.1 | `questionFormCard/useScrollVisibility.ts` | `useLayoutEffect` สำหรับ scroll-into-view logic | ~25 |

**Auto Test:** เหมือน 5C

**Manual Test:**
- สร้างข้อใหม่ → form card ต้อง scroll เข้ามาในมุมมองอัตโนมัติ
- กด toggle description/reference → form ต้องขยายแล้วยังมองเห็น

---

### Phase 5F: `QuestionFormCard.tsx` — แยก sub-components ของ JSX (เสี่ยงกลาง-สูง)

> ⚠️ **จุดที่เสี่ยง:** ต้องส่ง props ให้ครบถ้วน, ทุก state/handler ต้องถูก wire ถูกต้อง

**แนวทาง:** แยก JSX blocks ที่เป็นอิสระออกเป็น sub-components ทีละชิ้น

| Commit | Component | Lines (วัดจริง) | ระดับเสี่ยง |
|--------|-----------|----------------|------------|
| 5F.1 | `AnswerKeySection.tsx` (Answer key editor UI) | 48 | 🟢 ต่ำ |
| 5F.2 | `SubQuestionBindingSection.tsx` (Child SubQ selector) | 61 | 🟡 กลาง |
| 5F.3 | `ExemptedToggleSection.tsx` (Exempted/Normal toggle UI) | 115 | 🟡 กลาง |
| 5F.4 | `ScoringSection.tsx` (Score/Required Count UI) | 117 | 🟡 กลาง |
| 5F.5 | `SectionPickerSection.tsx` (Section selector for 3xx.1.3-5) | 165 | 🟡 กลาง |
| 5F.6 | `ReferenceSection.tsx` (Reference linking UI) | 236 | 🟡 กลาง |
| 5F.7 | `SubQuestionEditorSection.tsx` (Branch/SubQ selector) | 205 | 🔴 สูง |

**Auto Test (ทุก commit):**
```bash
npx tsc --noEmit                  # 0 errors
npx vitest run                    # 175 tests ผ่าน
```

**Manual Test (ทุก commit — ใช้ checklist เดียวกัน):**

| # | ทดสอบ | ดูอะไร |
|---|-------|-------|
| 1 | Section 100: สร้างข้อใหม่ + Edit | ข้อมูลครบ, บันทึกได้ |
| 2 | Section 200: Edit ข้อ 2xx.1 | ชื่อ disabled |
| 3 | Section 200: Edit ข้อ 2xx.2 | Description + SubQuestionList (prefix **22XXXX**) |
| 4 | Section 200: Edit ข้อ 2xx.4 | Description + SubQuestionList (prefix **24XXXX**, ต่างจาก 2xx.2) |
| 5 | Section 200: ลอง Exempted toggle | Toggle ทำงานปกติ |
| 6 | Section 300: Edit ข้อ 3xx.1 | ข้อมูลครบ, Description ถูกต้อง |
| 7 | Section 300: Edit ข้อ L2 (3xx.2.x) | Scoring + Required Count ทำงาน |
| 8 | Reference linking (Section 100/200) | เพิ่ม/ลบ reference ได้ |
| 9 | Answer Key editor | กรอกเฉลยได้ |
| 10 | Image upload/remove | อัปโหลด/ลบรูปได้ |

---

### Phase 5G: `QuestionFormCard.tsx` — พิจารณาแยก logic hook (เสี่ยงสูง, Optional)

> ⚠️ **ทำเป็นอันสุดท้าย** เพราะเป็นส่วนที่ซับซ้อนที่สุด
> ❌ **อาจตัดสินใจไม่ทำ** ถ้า risk > benefit

**หากตัดสินใจทำ:**

| Commit | Hook | รายละเอียด | ระดับเสี่ยง |
|--------|------|-----------|------------|
| 5G.1 | `useQuestionForm.ts` | state declarations + derived state + effects + handlers | 🔴 สูงมาก |

**⚠️ สิ่งที่ต้องระวังเป็นพิเศษ (Root cause ของ Regression ครั้งก่อน):**

| # | เงื่อนไข | รายละเอียด | ถ้าผิดจะเกิดอะไร |
|---|---------|-----------|----------------|
| 1 | `sectionOccupationBranches` | ใช้แยก fetch mode ของ 2xx.2 vs 2xx.4 | SubQ ใช้ข้อมูลเดียวกัน |
| 2 | `autoCodePrefix` | prefix `22XXXX` (2xx.2) vs `24XXXX` (2xx.4) | SubQ filter ผิด |
| 3 | `isDefaultL1` → `disabled` | ล็อค textarea สำหรับ 2xx.1-2xx.8 | ชื่อคำถามแก้ไขได้ |
| 4 | `isDefaultDescL1_200` → `showDescription` | แสดง Description สำหรับ 2xx.2, 2xx.4 | Description หายไป |
| 5 | `baseShowSubQuestionEditor` | เงื่อนไข show SubQ editor | SubQ editor ไม่แสดง |

**ถ้าตัดสินใจไม่ทำ:** QFC จะเหลือ ~1,550 lines (logic + main JSX) ซึ่งอยู่ในเกณฑ์ที่ยอมรับได้

---

## 📅 ลำดับและ Timeline

```
Phase 5A: tests.rs                    🟢 เสี่ยงต่ำ    (~1 วัน)
Phase 5B: main.rs commands            🟡 เสี่ยงกลาง   (~2-3 วัน)
Phase 5C: QFC types + constants       🟢 เสี่ยงต่ำ    (~1 ชม.)
Phase 5D: QFC theme colors            🟢 เสี่ยงต่ำ    (~30 นาที)
Phase 5E: QFC scroll visibility       🟢 เสี่ยงต่ำ    (~30 นาที)
Phase 5F: QFC sub-components (7 ชิ้น) 🟡-🔴 กลาง-สูง  (~2-3 วัน)
Phase 5G: QFC logic hook (optional)   🔴 เสี่ยงสูง    (~1 วัน หรือ SKIP)
```

**รวมประมาณ:** 5-8 วัน (ไม่นับวันหยุด)

---

## ✅ Definition of Done (ทุก commit)

```
[ ] cargo build         — compile สำเร็จ (Rust)
[ ] cargo test          — 98 tests ผ่าน (Rust)
[ ] npx tsc --noEmit    — 0 errors (TypeScript)
[ ] npx vitest run      — 175 tests ผ่าน (Frontend)
[ ] Manual Test         — ตาม checklist ของแต่ละ Phase (ถ้ามี)
[ ] Commit + Push       — ทันทีที่ผ่าน test
```

---

## 🚫 สิ่งที่จะไม่ทำ

1. ~~ใช้ script (.cjs) สร้างไฟล์อัตโนมัติ~~ → ทำ manual ทีละบรรทัด
2. ~~รวมหลายไฟล์ใน commit เดียว~~ → 1 commit = 1 การเปลี่ยนแปลง
3. ~~บังคับทุกไฟล์ < 1,500 lines~~ → ลดเท่าที่ปลอดภัย ถ้ายังใหญ่แต่ทำงานได้ = ยอมรับ
4. ~~แยก `schema.rs`~~ → มีแต่ CREATE TABLE, ย้ายไม่คุ้ม risk

---

## 📈 ความคืบหน้า (Progress Tracker)

| Phase | สถานะ | Commit | วันที่ | หมายเหตุ |
|-------|--------|--------|-------|---------|
| 5A | ✅ เสร็จสิ้น | da8e4ab..a955064 | 2026-05-01 | แยกเป็น 8 submodules |
| 5B.1 | ✅ เสร็จสิ้น | 2ba814d | 2026-05-01 | zoom → commands/zoom.rs |
| 5B.2 | ✅ เสร็จสิ้น | ee374d2 | 2026-05-01 | users → commands/users.rs |
| 5B.3 | ✅ เสร็จสิ้น | 0fb58e5 | 2026-05-01 | officers → commands/officers.rs |
| 5B.4 | ✅ เสร็จสิ้น | 63a8ed9 | 2026-05-01 | avatars → commands/avatars.rs |
| 5B.5+6 | ✅ เสร็จสิ้น | d69652d | 2026-05-01 | backup+export → commands/backup.rs |
| 5B.7 | ✅ เสร็จสิ้น | ade2eb7 | 2026-05-01 | system+content → commands/system.rs + content.rs, main.rs 1544→267 lines |
| 5C.1 | ✅ เสร็จสิ้น | d9fc496 | 2026-05-02 | types.ts |
| 5C.2 | ✅ เสร็จสิ้น | d9fc496 | 2026-05-02 | constants.ts |
| 5D.1 | ✅ เสร็จสิ้น | 0563cc4 | 2026-05-02 | themeColors.ts |
| 5E.1 | ✅ เสร็จสิ้น | e1c1a4b | 2026-05-02 | useScrollVisibility.ts |
> *หมายเหตุ (Phase 5E): ปัจจุบันระบบ Scroll Visibility ทำงานเมื่อเปิดฟอร์มเพื่อไม่ให้ถูก Footer/Taskbar บัง แต่มีข้อจำกัดคือ "ระหว่างพิมพ์ หากฟอร์มมีการขยายตัว (เช่น กล่อง Question/Answer ยืดขยาย) ระบบจะยังไม่ Awareness เพื่อเลื่อนตาม" (พิจารณาปรับปรุงในอนาคต)*
| 5F.1 | ✅ เสร็จสิ้น | bff5cbe | 2026-05-02 | AnswerKeyEditor.tsx |
| 5F.2 | ✅ เสร็จสิ้น | cf7b7fe | 2026-05-02 | ReferenceEditor.tsx |
| 5F.3 | ✅ เสร็จสิ้น | c8dd8bc | 2026-05-02 | SubQuestionEditor.tsx |
| 5F.4 | ✅ เสร็จสิ้น | e2fa9f3 | 2026-05-02 | QuestionMetadataEditor.tsx |
| 5F.5 | ✅ เสร็จสิ้น | (รวมใน 5F.4) | 2026-05-02 | (SectionPickerEditor) |
| 5F.6 | ✅ เสร็จสิ้น | (รวมใน 5F.2) | 2026-05-02 | (ReferenceEditor) |
| 5F.7 | ✅ เสร็จสิ้น | (รวมใน 5F.3) | 2026-05-02 | (SubQuestionListEditor) |
| 5G.1 | ✅ เสร็จสิ้น | 652e77d..041b73e | 2026-05-12~13 | Trainee Attachment Hardening (ดูรายละเอียดใน `PHASE5G_TRAINEE_ATTACHMENTS_PLAN.md`) |

---

### Phase 5G (Trainee Attachments Improvements) — Summary of Completed Work

> **สถานะ:** ✅ DONE (2026-05-08 ~ 2026-05-13)
> **Commits:** `13bedde`..`041b73e` (8+ commits)

**ขอบเขต:** ระบบแนบไฟล์สำหรับ Trainee + Qualifier UX Redesign

| # | หมวด | รายละเอียด |
|---|------|-----------|
| 1 | **AttachmentPanel** | Component แนบไฟล์อเนกประสงค์ (รูป/PDF/วิดีโอ/เสียง) พร้อม Thumbnail + In-app player |
| 2 | **Prerequisite (3xx.1.1/1.2)** | ซ่อน Text Editor ให้เหลือแนบไฟล์อย่างเดียว (Images + PDF) |
| 3 | **SHA-256 Duplicate Detection** | ตรวจสอบไฟล์ซ้ำด้วย Hash ก่อนอัปโหลด (ทั้ง Question attachments และ Trainee attachments เดิม) |
| 4 | **Hierarchical Filename Prefix** | ไฟล์แนบมี Prefix ระบุตำแหน่งข้อแบบ Multi-level (e.g., `301.1.1.ก`) |
| 5 | **Qualifier UX (TraineeAnswerBox)** | เพิ่มปุ่ม "ยกเลิกผ่าน" สำหรับ Section 100/200 + Prerequisite 300 |
| 6 | **Qualifier UX (OralAssessmentBox)** | เพิ่มปุ่ม "ยกเลิกผ่าน" สำหรับ Section 300 ข้อธรรมดา + ล้าง Comment เมื่อ Undo |
| 7 | **File Cleanup** | ลบไฟล์จาก Filesystem เมื่อลบ attachment หรือ Clear Answers (DB) |
| 8 | **Validation** | ป้องกัน fake-save, ต้องมีข้อเสนอแนะก่อนบันทึก "ปรับปรุง", ปุ่ม disabled เมื่อไม่มีการเปลี่ยนแปลง |

