# 📋 PQS RTN Hybrid Storage — Project Review & Improvement Plan

> **สร้างเมื่อ:** 2026-04-20 | **อัปเดตล่าสุด:** 2026-04-21
> **Branch ทำงาน:** `project-review-actions` (แตกจาก `career-branches-management`)
> **ผู้ตรวจสอบ:** Cascade AI | **ขอบเขต:** Full comprehensive review (Backend + Frontend + DB + Tests + Security)

---

## 🏁 ความคืบหน้าล่าสุด (Progress Tracker)

| Phase                                              | สถานะ          | Commits                              | หมายเหตุ                                                                                                                                   |
| -------------------------------------------------- | -------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Phase 6** — DB Consolidation Cleanup             | ✅ **DONE**    | (รอบก่อน)                            | path helper รวมเป็นตัวเดียว, rename `database.rs` → `auth.rs`, legacy `database.db` auto-archive on startup                                |
| **Phase 1** — Security Hardening                   | ✅ **DONE**    | `f831655` (backend) + `992a056` (UI) | default admin + forced password change, FE hashing ลบออก, `change_password` API, `ForceChangePasswordModal`                                |
| **Phase 2** — Migration Framework                  | ✅ **DONE**    | `b7b1c18` + `3c23192`                | versioned migration runner + `schema_migrations` table + baseline detection; migration 001 replaces ad-hoc `ensure_user_schema_migrations` |
| **Phase 2B** — ย้าย `CREATE TABLE` เข้า migrations | ⏭️ Deferred    | —                                    | optional follow-up; ปัจจุบัน `CREATE TABLE IF NOT EXISTS` ทำงานอยู่แล้ว                                                                    |
| **Phase 2C** — Connection Pooling                  | ✅ **DONE**    | (นี้)                                | r2d2 pool + per-connection PRAGMA customizer; `get_content_connection` → pooled `DbConn`; รองรับ WAL/FK/busy_timeout อัตโนมัติ             |
| Phase 3 — Backup/Export Consolidation              | ⏳ **NEXT UP** | —                                    | ลดแบคอัพ 5 modules (~75 KB) → 1                                                                                                            |
| Phase 4 — Dead Code Cleanup                        | ⏳ pending     | —                                    | —                                                                                                                                          |
| Phase 5 — Large File Refactoring                   | ⏳ pending     | —                                    | `main.rs`, `QuestionFormCard.tsx`, `tests.rs`                                                                                              |
| Phase 7-10                                         | ⏳ pending     | —                                    | Types/DX, Performance, Tests expansion, Encryption                                                                                         |

**Tests (ปัจจุบัน):** 🟢 **98 Rust + 175 FE** ผ่านหมด (จากเดิม 76 Rust + 158 FE) — +4 tests จาก Phase 2C pool

**📌 กลับมาทำงานต่อไปนี้:** เริ่มที่ **Phase 3 — Backup/Export Consolidation** (ลดแบคอัพ 5 โมดูล ~75 KB → 1). Phase 1, 2A, 2C, 6 เสร็จครบ, บน branch `project-review-actions`.

**วิธี resume งาน:**

```bash
# ตรวจสอบว่า tests ผ่าน
(cd src-tauri && cargo test)    # คาดว่า 98 passed
npx vitest run                   # คาดว่า 175 passed

# ดูว่าอยู่ที่ branch ถูกต้อง
git branch --show-current        # ควรเป็น project-review-actions
git log --oneline -5             # ควรเห็น commit ล่าสุด
```

---

## 🎯 สรุปภาพรวม (Executive Summary)

### โปรเจคทำอะไร

แอปพลิเคชัน Desktop (Tauri + React) สำหรับจัดการเอกสาร **PQS (Personnel Qualification Standards)** ของกองทัพเรือ รองรับ:

- การสร้าง/แก้ไขเอกสาร PQS หลายระดับ (100, 200, 300 series)
- ระบบคะแนนและความก้าวหน้าของผู้เข้ารับการประเมิน
- การจัดการสาขาอาชีพ (career branches) และ sub-branches
- Hybrid storage: DB metadata + filesystem สำหรับรูปภาพ/media

### Tech Stack

| Layer    | เทคโนโลยี                                     |
| -------- | --------------------------------------------- |
| Frontend | React 18 + TypeScript 5 + Vite 4 + Tailwind 3 |
| Desktop  | Tauri 1.5                                     |
| Backend  | Rust + rusqlite (SQLite)                      |
| Testing  | Vitest (FE) + `cargo test` (BE)               |

### จุดแข็ง

- โครงสร้างโมดูลชัดเจน (หลัง refactoring `content_database.rs`)
- มี test coverage ที่โตขึ้น — **98 Rust + 175 FE tests** (+18 Rust, +17 FE หลัง Phase 1-2)
- bcrypt password hashing (ย้าย hashing ไปฝั่ง backend เต็มตัวแล้ว — Phase 1)
- แยก Hybrid storage (filesystem + DB metadata) ดี
- **Versioned migration framework** พร้อมใช้ (Phase 2) — schema evolution tracked ใน `schema_migrations`
- **Default admin + forced password change** — กระจาย desktop app ได้ปลอดภัย (Phase 1)
- มีเอกสาร planning เยอะ (backend-improvement-plan, refactoring-plan, etc.)

### จุดที่ต้องปรับปรุงเร่งด่วน

1. ✅ ~~🔴 **Security gap** — `update_user` tauri command รับ `password_hash` จาก frontend~~ — **Fixed in Phase 1** (commit `f831655`)
2. 🔴 **Backup module redundancy** — 4 modules ทับซ้อน (~75 KB รวม) → Phase 3 (เดิม) / ตอนนี้ลำดับอาจเลื่อน
3. ✅ ~~🟠 **Migration framework ขาดหาย**~~ — **Fixed in Phase 2** (commit `b7b1c18`)
4. 🟠 **Giant files** — `QuestionFormCard.tsx` 138 KB, `tests.rs` 82 KB, `main.rs` 49 KB (150 commands) → Phase 5
5. 🟠 **Connection pooling ขาดหาย** — เปิด connection ใหม่ทุกครั้ง → **Phase 2C (DONE)**
6. 🟡 **Type safety** — `any` 80 ครั้งใน 36 ไฟล์, `console.log` 308 ครั้งใน 71 ไฟล์ → Phase 4/7
7. 🟡 **Dead code** — ~400 บรรทัด (identified แล้วแต่ยังไม่ลบ) → Phase 4
8. ✅ ~~**2 SQLite files**~~ — **เสร็จแล้ว** (consolidated → `content.db` เดียว; Phase 6 cleanup debt ก็เสร็จแล้วเช่นกัน)

---

## 📊 ผลการวิเคราะห์รายมิติ

### 1. Rust Backend (`src-tauri/src/`)

| ประเด็น             | สถานะ | รายละเอียด                                             |
| ------------------- | ----- | ------------------------------------------------------ |
| File size           | 🟠    | `main.rs` 49 KB / 150 tauri commands, `tests.rs` 82 KB |
| `unwrap()/expect()` | 🟡    | 386 รวม (252 ในเทส = รับได้), ใน production: ~130      |
| Error handling      | 🟢    | ใช้ `Result<T, String>` สม่ำเสมอ                       |
| `format!` + SQL     | 🟡    | 58 จุดใน 16 ไฟล์ — ต้องตรวจว่าไม่มี injection          |
| Transactions        | 🟡    | ใช้บ้าง แต่ไม่สม่ำเสมอในจุดที่ต้อง atomic              |
| Connection pooling  | �     | **ใช้ r2d2 pool** (Phase 2C)                           |
| Dead code           | 🟠    | 5 backup modules ทับซ้อน (75 KB)                       |

**Backup module overlap:**
| ไฟล์ | KB | หน้าที่ | ซ้ำกับ |
|---|---|---|---|
| `backup_manager.rs` | 3 | wrapper/dispatcher | - |
| `database_backup.rs` | 17 | backup Main DB | `hybrid_backup.rs`, `universal_sqlite_backup.rs` |
| `hybrid_backup.rs` | 20 | zip (DB + media) | ทับ 2 ไฟล์ข้างบน |
| `universal_sqlite_backup.rs` | 13 | standard `.db` dump | `database_backup.rs` |
| `database_export.rs` | 27 | SQL/CSV/JSON export | บางส่วนทับ `database_backup` |

---

### 2. Database (`content_database/`, `database.rs`)

| ประเด็น                 | สถานะ | รายละเอียด                                                                                                                                                              |
| ----------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB consolidation        | ✅    | **เสร็จแล้ว** — รวมเป็น `content.db` เดียว (users, officers, documents, questions, ...)                                                                                 |
| Path helper duplication | ✅    | **เสร็จแล้ว** (Phase 6) — `get_content_database_path()` ตัวเดียวใน `content_database::connection`                                                                       |
| `database.rs` rename    | ✅    | **เสร็จแล้ว** (Phase 6) — rename เป็น `auth.rs`                                                                                                                         |
| Schema migration        | ✅    | **เสร็จแล้ว** (Phase 2) — versioned framework ใน `migrations.rs` (`b7b1c18`). ส่วน `execute_best_effort` ที่เหลือ ค่อยๆ ย้ายเป็น migrations ได้ตามความจำเป็น (Phase 2b) |
| Migration tracking      | ✅    | **เสร็จแล้ว** (Phase 2) — ตาราง `schema_migrations(version, name, applied_at, duration_ms, baselined)`                                                                  |
| Backfills               | 🟠    | ยังคงรันทุก startup (ควรย้ายไปเป็น migrations ที่ tracked — ตอน Phase 2b)                                                                                               |
| Indexes                 | 🟡    | มีบ้าง แต่ยังไม่ครบ (`parent_id`, `section_id` บาง query) → Phase 8                                                                                                     |
| FK constraints          | 🟢    | ใช้ `ON DELETE CASCADE` สม่ำเสมอ                                                                                                                                        |
| Encryption              | 🔴    | ไฟล์ `.db` เป็น plain text → Phase 10                                                                                                                                   |

---

### 3. Frontend (`src/`)

| ประเด็น          | สถานะ | รายละเอียด                                                                                                                       |
| ---------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| Large components | 🔴    | `QuestionFormCard.tsx` **138 KB** ≈ 3,200 lines                                                                                  |
| Component count  | 🟢    | แยกโฟลเดอร์ชัดเจน (editor_v2, modals, pages, ui)                                                                                 |
| Hooks            | 🟡    | 28 hooks — มี avatar hook 3 ตัว: `useAvatar`, `useAvatarDatabase`, `useAvatarSync`, `useHybridAvatar`, `useHybridHighRankAvatar` |
| Contexts         | 🟡    | 14 context files — pattern duplication (`AuthContext.tsx` + `authContextObject.ts`)                                              |
| Services         | 🟡    | 3 avatar services ทับซ้อน (`avatarService`, `avatarDatabaseService`, `hybridAvatarService`)                                      |
| `console.log`    | 🟡    | 308 ครั้งใน 71 ไฟล์ (ควรใช้ `utils/logger.ts`)                                                                                   |
| `any` types      | 🟡    | 80 ครั้งใน 36 ไฟล์                                                                                                               |
| TODO/FIXME       | 🟢    | 8 รายการ (น้อย)                                                                                                                  |

---

### 4. Security

| ประเด็น                 | สถานะ | รายละเอียด                                                                                                                    |
| ----------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| Password hashing        | 🟢    | bcrypt (DEFAULT_COST) — hashing ทำอยู่ backend เท่านั้น                                                                       |
| `update_user` API       | ✅    | **แก้แล้ว** (Phase 1) — รับ `password: Option<String>` (plaintext) แล้ว hash backend                                          |
| `hash_password` exposed | ✅    | **ลบแล้ว** (Phase 1) — frontend ใช้ `change_password` API แทน                                                                 |
| Hardcoded admin pw      | ✅    | **แก้แล้ว** (Phase 1) — default admin ใช้ trivial credentials + `must_change_password=1` (บังคับเปลี่ยนรหัสทุกครั้งที่ login) |
| Forced password change  | ✅    | **ใหม่** (Phase 1) — `ForceChangePasswordModal` block UI จนกว่าเปลี่ยนรหัสใหม่                                                |
| DB encryption           | 🔴    | ยังไม่มี (plan SQLCipher) → Phase 10                                                                                          |
| Input validation        | 🟡    | ระดับ Tauri command บางจุดไม่ validate (password strength ทำแล้ว Phase 1)                                                     |
| SQL injection           | 🟢    | ส่วนใหญ่ใช้ `params![]` ถูกต้อง                                                                                               |

---

### 5. Testing

| ประเด็น             | สถานะ | รายละเอียด                                                                        |
| ------------------- | ----- | --------------------------------------------------------------------------------- |
| Rust tests          | 🟡    | **98 tests** (+18 หลัง Phase 1-2); ส่วน `tests.rs` 82 KB ยังคงต้องแยก (Phase 5.3) |
| Frontend tests      | 🟢    | **175 tests** (+17 หลัง Phase 1 UI), 17 integration tests                         |
| Tauri commands test | 🔴    | `main.rs` 150 commands แทบไม่มีเทสต์                                              |
| E2E testing         | 🔴    | ไม่มี Playwright/WebdriverIO                                                      |
| Test helpers        | 🟡    | `test_helpers.rs` 27 KB — schema สร้างซ้ำกับ `schema.rs`                          |

---

### 6. Documentation

| ประเด็น           | สถานะ | รายละเอียด                                                                                   |
| ----------------- | ----- | -------------------------------------------------------------------------------------------- |
| เอกสาร planning   | 🟢    | มีหลายเอกสาร (`docs/*.md` + top-level)                                                       |
| ความซ้ำซ้อน       | 🟡    | บาง plan ซ้ำกัน (e.g., `database_consolidation_plan.md` vs `backend-improvement-plan.md` §3) |
| Code docs (`///`) | 🟡    | Rust มี doc comments บางส่วน ยังไม่ครบ                                                       |
| JSDoc (TS)        | 🟠    | น้อยมาก                                                                                      |

---

## 🗺️ แผนปรับปรุงแบ่งเป็น Phases

**หลักการจัดลำดับ:**

1. **Security** ก่อน (ป้องกันช่องโหว่ที่อาจถูกใช้โจมตี)
2. **Technical debt** ที่บล็อกการพัฒนา (migrations, connection pooling)
3. **Cleanup** (dead code, redundancy) — เพื่อลด surface area
4. **Refactoring** (large files) — เพื่อความสามารถดูแลต่อได้
5. **Optimization & polish** — performance, UX, docs

---

### ✅ Phase 1: Security Hardening (DONE — 2026-04-21)

**Commits:** `f831655` (backend) + `992a056` (UI)

**เป้าหมายที่ทำได้:** กระจาย desktop app ได้โดยมี default admin ที่ใช้งานได้ทันที + บังคับเปลี่ยนรหัสก่อนเข้าใช้จริง — ปิดช่องโหว่ hardcoded credential โดยสมบูรณ์

| #   | Task                                                                                    | สถานะ | ไฟล์หลัก                                      |
| --- | --------------------------------------------------------------------------------------- | ----- | --------------------------------------------- |
| 1.1 | ลบ `hash_password` tauri command + ไม่ส่ง `password_hash` จาก FE                        | ✅    | `src/services/tauriService.ts`, `main.rs`     |
| 1.2 | `update_user` รับ `password: Option<String>` (plaintext) แล้ว hash ใน backend           | ✅    | `auth.rs::update_user`, `main.rs`             |
| 1.3 | เปลี่ยน hardcoded admin — ใช้ documented trivial credentials + `must_change_password=1` | ✅    | `auth.rs` (DEFAULT*ADMIN*\*), `schema.rs`     |
| 1.4 | `validate_password_strength` (>=8 chars, weak list, ห้าม = username, ห้าม = current)    | ✅    | `auth.rs`                                     |
| 1.5 | `change_password` API ใหม่ + Tauri command                                              | ✅    | `auth.rs`, `main.rs`                          |
| 1.6 | `must_change_password` flag ใน User struct + schema + AuthContext                       | ✅    | หลายไฟล์                                      |
| 1.7 | `ForceChangePasswordModal` โมดัล non-dismissible block UI จนกว่าเปลี่ยนรหัส             | ✅    | `src/components/ForceChangePasswordModal.tsx` |
| 1.8 | ลบ password hash ออกจาก frontend state + DatabaseViewerPage UI                          | ✅    | `AuthContext.tsx`, `DatabaseViewerPage.tsx`   |

**Deliverables (done):**

- [x] 9 Rust tests (password strength, default admin canary, schema field)
- [x] 15 FE integration tests (`ForceChangePasswordModal.integration.test.tsx`) — gating/validation/success/error mapping
- [x] Non-dismissible modal (no close btn, no Escape, no backdrop-close)
- [x] ทดสอบทั้ง fresh install และ upgrade flow

**Task ยังไม่ทำ (ยกโยกไป phase อื่น):**

- ⏭️ Audit `format!` + SQL 58 จุด → **Phase 4/7** (SQL injection review เป็น cleanup task)
- ⏭️ Rate limiting สำหรับ `authenticate_user` → **Phase 10** (production hardening)

---

### ✅ Phase 2: Migration Framework (DONE — 2026-04-21)

**Commits:** `b7b1c18` (framework + migration 001) + `3c23192` (lint cleanup)

**เป้าหมายที่ทำได้:** แทน ad-hoc `ensure_user_schema_migrations` ด้วยระบบ versioned migration ที่ tracked ใน `schema_migrations` table, พร้อม transactional safety + baseline detection สำหรับ legacy DB

| #   | Task                                                                                              | สถานะ | ไฟล์หลัก                                          |
| --- | ------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------- |
| 2.1 | Migration framework (Migration struct, runner, transactional)                                     | ✅    | `src-tauri/src/migrations.rs` (ใหม่, ~470 บรรทัด) |
| 2.2 | `schema_migrations(version, name, applied_at, duration_ms, baselined)`                            | ✅    | `migrations.rs::ensure_migrations_table`          |
| 2.3 | Migration 001: `add_must_change_password_to_users` + `baseline_check`                             | ✅    | `migrations.rs::all_migrations`                   |
| 2.4 | เรียก runner หลัง CREATE TABLE IF NOT EXISTS ใน `initialize_content_database`                     | ✅    | `content_database/schema.rs`                      |
| 2.5 | ลบ `ensure_user_schema_migrations` และ tests เดิม (ถูกแทนโดย framework tests)                     | ✅    | `auth.rs`                                         |
| 2.6 | 9 เทสต์ใหม่สำหรับ framework (idempotent / ordering / rollback / duplicate guard / baseline 3 แบบ) | ✅    | `migrations.rs::tests`                            |

**Deliverables (done):**

- [x] Runner API: `run_pending_migrations(&mut Connection, &[Migration]) -> RunReport { applied, skipped, baselined }`
- [x] Public introspection API: `list_applied` + `AppliedMigration` struct (เตรียมไว้ให้ admin UI ในอนาคตดึงไปใช้)
- [x] Rollback safety: failing migration → ไม่บันทึก + ไม่ทิ้งอะไรฝัง
- [x] Strict version ordering + duplicate-version guard
- [x] Baseline detection: legacy DB (ที่ได้ patch จาก ad-hoc helper เก่า) ถูก mark applied โดยไม่ re-run
- [x] อัพเดต doc comments อธิบายวิธีเขียน migration ใหม่

**วิธีเขียน migration ใหม่ (อุธิบายไว้ใน `migrations.rs` เอง):**

1. เลือก version ถัดไป (2, 3, ...) — **ห้ามแก้ migration ที่ ship ไปแล้ว**
2. เขียน `up` function
3. ส่งเข้า `all_migrations()`
4. Ship — runner ทำงานเองตอน startup ถัดไป

### ⏭️ Phase 2B: ย้าย `CREATE TABLE` ที่เหลือเข้า migrations (Deferred)

ยังไม่ทำเพราะปัจจุบัน `CREATE TABLE IF NOT EXISTS` ใน `schema.rs` ยังทำงานได้ดี. การย้ายเข้า migrations มี churn สูงมาก โดยประโยชน์คือ schema ทั้งหมด traceable ผ่าน migration history. แนะนำ — ทำหลังจาก Phase 2C / Phase 5 เสร็จแล้ว

### ✅ Phase 2C: Connection Pooling (DONE — 2026-04-21)

**เป้าหมาย:** เปลี่ยนจาก `get_connection_safe()` ที่เปิด connection ใหม่ทุกครั้ง → r2d2 pool + Tauri State

| #    | Task                                                                                                 | ไฟล์                              | Effort |
| ---- | ---------------------------------------------------------------------------------------------------- | --------------------------------- | ------ |
| 2C.1 | เพิ่ม `r2d2` + `r2d2_sqlite` เข้า Cargo.toml                                                         | `src-tauri/Cargo.toml`            | S      |
| 2C.2 | สร้าง pool ใน `content_database::connection` (PRAGMA `journal_mode=WAL`, `foreign_keys=ON`, timeout) | `content_database/connection.rs`  | M      |
| 2C.3 | แชร์ pool ผ่าน Tauri managed State (`app.manage(DbPool)`)                                            | `main.rs`                         | M      |
| 2C.4 | ปรับ commands ที่ hot path → รับ `State<DbPool>` แทน `get_content_connection()`                      | `main.rs` + ไฟล์ที่ใช้ connection | L      |
| 2C.5 | เทสต์: pool คืน connection, ไม่รั่วไหล, concurrent access ไม่ติดล็อค                                 | ใหม่                              | M      |
| 2C.6 | Benchmark: วัด latency ก่อน/หลัง (คาดว่าลด 50-80% สำหรับ ops ติดกัน)                                 | -                                 | S      |

**Deliverables:**

- [x] Pool configuration ที่ปรับได้ผ่าน env / const
- [x] Tauri State pattern ใช้เป็น canonical
- [x] Regression tests ผ่าน (98 Rust + 175 FE ไม่ลด)
- [x] Benchmark before/after

**Acceptance criteria:**

- Hot-path commands (authenticate, load document tree, list questions) ใช้ `State<DbPool>`
- ไม่มี connection leak (เทสต์โดย assert จำนวน `state.idle_connections()`)
- PRAGMA `journal_mode=WAL` + `foreign_keys=ON` ตั้งใน `on_acquire` hook (ทุก connection ในพูลได้รับ PRAGMA เหมือนกัน)

---

### ✅ Phase 3: Backup/Export Consolidation (DONE)

**Commits:** `326a59d` (A+C strategy)

**เป้าหมาย:** ลบความซ้ำซ้อน 75 KB → ประหยัดพื้นที่ และแยก Backup กับ Export ให้ชัดเจน

| #   | Task                                                                       | ไฟล์                                           | Effort |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------- | ------ |
| 3.1 | Map การใช้งานจริงของแต่ละ backup module (ดู `main.rs`)                     | -                                              | S      |
| 3.2 | Merge → 1 module `backup.rs` (รวมทุก format)                               | backup, hybrid_backup, universal_sqlite_backup | L      |
| 3.3 | แยก `export.rs` (SQL/CSV/JSON) ให้ชัด                                      | `database_export.rs`                           | M      |
| 3.4 | ลบ `database_backup.rs`, `backup_manager.rs`, `universal_sqlite_backup.rs` | -                                              | S      |
| 3.5 | อัพเดต FE calls + tests                                                    | `src/services/`, tests                         | M      |

**Deliverables:**

- [x] ลบ `database_backup.rs` และ `backup_manager.rs` สำเร็จ
- [x] ย้ายทุกอย่างการควบคุมฐาน Backup มาไว้ที่ `universal_sqlite_backup.rs` ครอบคลุม JSON ของเก่า
- [x] แยกบทบาท Backup กับ Export ออกจากกัน (ไม่ Generate SQL ซ้ำซ้อน)
- [x] อัพเดตคำอธิบายปุ่ม Backup หน้า UI ให้สื่อความหมายตรงไปตรงมา

---

### 🟡 Phase 4: Dead Code Cleanup (1 week)

**เป้าหมาย:** ทำตาม `docs/dead-code-cleanup-plan.md` ให้จบ

| #   | Task                                                                  | Effort |
| --- | --------------------------------------------------------------------- | ------ |
| 4.1 | ลบ `database_logger.rs` (223 lines, disabled)                         | S      |
| 4.2 | ลบ Legacy Avatar struct + functions ใน `database.rs` (~150 lines)     | S      |
| 4.3 | ลบ Disabled/commented commands ใน `main.rs` (~20 lines)               | S      |
| 4.4 | `cargo clippy --fix` + resolve `dead_code`, `unused_imports` warnings | M      |
| 4.5 | FE: แทนที่ `console.log` (308 ครั้ง) ด้วย `utils/logger.ts`           | M      |
| 4.6 | FE: รวม 3 avatar services + 5 avatar hooks → 1 service + 2 hooks      | L      |
| 4.7 | FE: รวม context pattern (remove `*ContextObject.ts` duplication)      | M      |

**Deliverables:**

- [ ] ลดโค้ด ~1,200+ lines
- [ ] Clippy clean (0 warnings)
- [ ] Logger ใช้แทน console.log ทั้งหมด

---

### 🟡 Phase 5: Large File Refactoring (2-3 weeks)

**เป้าหมาย:** ไม่มีไฟล์เกิน 1,500 lines

| #   | Target File                                   | Plan                                                                              |
| --- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| 5.1 | `QuestionFormCard.tsx` (138 KB, ~3,200 lines) | แยกเป็น: Form logic, Validation, Sub-question UI, Reference UI, Image upload      |
| 5.2 | `main.rs` (49 KB, 150 commands)               | แยกเป็น `commands/{users,documents,sections,questions,scoring,backup,avatars}.rs` |
| 5.3 | `tests.rs` (82 KB)                            | แยกตาม module: `tests/{sections,questions,scoring,branches,cleanup}.rs`           |
| 5.4 | `schema.rs` (47 KB)                           | หลัง Phase 2 จะเล็กลงมาก (move to migrations/)                                    |
| 5.5 | `CareerBranchManagerModal.tsx` (49 KB)        | แยก sub-components                                                                |
| 5.6 | `PqsReferenceSection.tsx` (45 KB)             | แยก hook + presentation                                                           |
| 5.7 | `AddReferenceModal.tsx` (34 KB)               | แยก form + list                                                                   |

**Deliverables:**

- [ ] ทุกไฟล์ < 1,500 lines
- [ ] Tests ทั้งหมดยังผ่าน (no regression)

---

### ✅ Phase 6: Database Consolidation Cleanup (เดิม 2 weeks → 2-3 days)

**สถานะ:** ✅ **Consolidation เสร็จแล้ว** (รวม 2 DB → `content.db` เดียว) — เหลือแค่ **cleanup debt**

**สิ่งที่เสร็จแล้ว:**

- ✅ `users`, `high_ranking_officers` ย้ายเข้า `content.db` แล้ว (`@/d:/pqs-rtn-hybrid-storage/src-tauri/src/content_database/schema.rs:211-245`)
- ✅ ทุก `get_database_path()` ชี้ไปที่ `content.db`
- ✅ `initialize_content_database()` สร้างทุกตารางรวม (`@/d:/pqs-rtn-hybrid-storage/src-tauri/src/main.rs:1524`)
- ✅ Backup restore รองรับทั้ง old format (`database.db`) และ new (`content.db`)

**เหลือต้องทำ (technical debt จาก consolidation):**

| #   | Task                                                                                            | ไฟล์                                                                                                                                 | Effort |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 6.1 | รวม `get_database_path()` ซ้ำซ้อน 6 จุด → ใช้ `connection::get_content_database_path()` เดียว   | `database.rs`, `database_backup.rs`, `database_export.rs`, `hybrid_backup.rs`, `universal_sqlite_backup.rs`, `bin/database-check.rs` | S      |
| 6.2 | Rename `database.rs` → `content_database/users.rs` (หรือ `auth.rs`) เพื่อสะท้อนหน้าที่จริง      | `database.rs` + imports                                                                                                              | M      |
| 6.3 | ลบ comment "Consolidated: all tables now live in content.db" 6 จุด                              | หลายไฟล์                                                                                                                             | S      |
| 6.4 | ตรวจว่า user เก่ามี `database.db` หลงเหลือใน AppData — เพิ่ม cleanup script (optional)          | `main.rs` setup                                                                                                                      | S      |
| 6.5 | ลบ fallback รองรับ `database.db` ใน `hybrid_backup.rs:287-291` (หลัง release ใหม่ 1-2 versions) | `hybrid_backup.rs`                                                                                                                   | S      |
| 6.6 | อัปเดต `database_consolidation_plan.md` → mark as completed + archive ไป `docs/archive/`        | docs                                                                                                                                 | S      |

**Deliverables:**

- [ ] 1 path helper (source of truth = `content_database::connection`)
- [ ] `database.rs` rename/relocate
- [ ] Historical comments ล้างออก
- [ ] Plan doc archived

**⚠️ Note:** Task 6.1-6.3, 6.6 ทำได้ทันที ไม่ต้องรอ Phase อื่น

---

### 🟢 Phase 7: Type Safety & Developer Experience (1-2 weeks)

| #   | Task                                                               | Effort |
| --- | ------------------------------------------------------------------ | ------ |
| 7.1 | แก้ `any` 80 จุด → proper types หรือ `unknown` + guards            | L      |
| 7.2 | เปิด `strict: true`, `noUncheckedIndexedAccess` ใน `tsconfig.json` | M      |
| 7.3 | สร้าง shared types จาก Rust structs → TS (ใช้ `ts-rs` หรือ manual) | L      |
| 7.4 | เพิ่ม JSDoc สำหรับ public APIs ที่สำคัญ                            | M      |
| 7.5 | ESLint rules เข้มขึ้น (`no-console`, `no-explicit-any`)            | S      |
| 7.6 | Rust: เพิ่ม `#![deny(missing_docs)]` สำหรับ public API             | M      |

**Deliverables:**

- [ ] 0 `any` types (ยกเว้น test/external)
- [ ] 0 `console.log` ใน production code
- [ ] Types shared FE ↔ BE

---

### 🟢 Phase 8: Performance & Optimization (1-2 weeks)

| #   | Task                                                                              | Effort |
| --- | --------------------------------------------------------------------------------- | ------ |
| 8.1 | หา N+1 query patterns (เช่น `get_document_with_hierarchy`) → ใช้ JOIN/CTE         | M      |
| 8.2 | เพิ่ม indexes ที่ขาด (`parent_id`, `section_id`, composite indexes)               | S      |
| 8.3 | FE: `React.memo` + `useMemo` สำหรับ expensive components (QuestionTree, sections) | M      |
| 8.4 | Bundle analysis + code splitting (lazy load pages)                                | M      |
| 8.5 | Measure & document startup time, reduce `cleanup_orphaned_section_refs` frequency | S      |
| 8.6 | SQLite PRAGMA tuning (`journal_mode=WAL`, `synchronous=NORMAL`)                   | S      |

**Deliverables:**

- [ ] Benchmark report (before/after)
- [ ] Bundle size report
- [ ] Startup time < X seconds

---

### 🟢 Phase 9: Testing Expansion (2-3 weeks)

| #   | Task                                                         | Effort |
| --- | ------------------------------------------------------------ | ------ |
| 9.1 | แยก `tests.rs` (ตาม Phase 5.3)                               | M      |
| 9.2 | เพิ่ม Rust integration tests สำหรับ tauri commands           | L      |
| 9.3 | Setup Playwright E2E สำหรับ critical user flows              | L      |
| 9.4 | Test coverage report + gap analysis                          | M      |
| 9.5 | Property-based testing สำหรับ scoring logic (ใช้ `proptest`) | M      |

**Deliverables:**

- [ ] Coverage ≥ 70% (Rust), ≥ 60% (FE)
- [ ] 5-10 E2E tests สำหรับ happy paths
- [ ] CI workflow รัน tests อัตโนมัติ

---

### 🟢 Phase 10: Encryption & Production Readiness (1-2 weeks)

| #    | Task                                         | Effort |
| ---- | -------------------------------------------- | ------ |
| 10.1 | SQLCipher integration (`rusqlite` feature)   | L      |
| 10.2 | Key management: OS Keychain + hardware-bound | L      |
| 10.3 | Data integrity checksums สำหรับ scoring data | M      |
| 10.4 | Auto-backup policy (daily, rotating)         | M      |
| 10.5 | Error reporting (Sentry หรือ local logs)     | M      |
| 10.6 | CI/CD: GitHub Actions (build, test, release) | M      |

**Deliverables:**

- [ ] DB file เข้ารหัส
- [ ] Tamper detection สำหรับคะแนน
- [ ] Release pipeline อัตโนมัติ

---

## 📅 Timeline สรุป

| Phase                                 | ระยะเวลา  | Priority    | สถานะ          | Dependencies         |
| ------------------------------------- | --------- | ----------- | -------------- | -------------------- |
| 1. Security Hardening                 | 1-2 weeks | 🔴 Critical | ✅ **DONE**    | -                    |
| 2A. Migration Framework               | 2-3 weeks | 🟠 High     | ✅ **DONE**    | -                    |
| 2B. ย้าย CREATE TABLE เข้า migrations | 1 week    | 🟡 Medium   | ⏭️ Deferred    | Phase 2A             |
| 2C. Connection Pooling                | 1-2 weeks | 🟠 High     | ⏳ **NEXT UP** | Phase 2A             |
| 3. Backup/Export Consolidation        | 1-2 weeks | 🟠 High     | ⏳ pending     | -                    |
| 4. Dead Code Cleanup                  | 1 week    | 🟡 Medium   | ⏳ pending     | Phase 3 (บาง module) |
| 5. Large File Refactoring             | 2-3 weeks | 🟡 Medium   | ⏳ pending     | Phase 2A (schema)    |
| 6. DB Consolidation Cleanup (debt)    | 2-3 days  | ✅ **DONE** | —              | —                    |
| 7. Type Safety & DX                   | 1-2 weeks | 🟢 Low      | ⏳ pending     | -                    |
| 8. Performance                        | 1-2 weeks | 🟢 Low      | ⏳ pending     | Phase 2C             |
| 9. Testing Expansion                  | 2-3 weeks | 🟢 Low      | ⏳ pending     | Phase 5.3            |
| 10. Encryption & Prod                 | 1-2 weeks | 🟢 Low      | ⏳ pending     | Phase 2A             |

**คืบหน้า:** 3 phases เสร็จแล้ว (1, 2A, 6) + 1 phase deferred (2B). **Remaining estimate:** ประมาณ 10-16 weeks sequential / **6-9 weeks** ถ้าทำ parallel บางส่วน

### แนะนำลำดับทำงานต่อไป (realistic, จาก now)

```
✅ Week 1-2:   Phase 1 (Security)         DONE (commit f831655 + 992a056)
✅ Week 3:     Phase 2A (Migration FW)    DONE (commit b7b1c18 + 3c23192)
✅ Week 3:     Phase 6 (DB cleanup debt)  DONE (รอบก่อน Phase 1)
⏳ Week 4-5:   Phase 2C (Conn Pooling)   🟠 ต่อไปทันที
   Week 6-7:   Phase 3 (Backup merge)     🟠 parallel กับ Phase 4 ได้
   Week 7-8:   Phase 4 (Dead code)        🟡
   Week 9-11:  Phase 5 (Large files)     🟡
   Week 12-13: Phase 2B (CREATE TABLE)    🟡 optional, มีค่าเมื่อ schema นิ่งแล้ว
   Week 14-15: Phase 7 (Types/DX)         🟢
   Week 16-17: Phase 8 (Performance)     🟢
   Week 18-20: Phase 9 (Tests)            🟢
   Week 21-22: Phase 10 (Encryption)     🟢
```

---

## 🎯 Quick Wins (ทำได้เร็วภายใน 1-3 วัน)

ถ้าอยากเห็นผลไวๆ ก่อนเข้า phase ยาว:

1. **ลบ `database_logger.rs`** (223 lines, disabled) — 30 นาที
2. **Replace `console.log` → `logger.ts`** ใน services/ (ประมาณ 10 ไฟล์) — 2 ชั่วโมง
3. ~~**ลบ `hash_password` tauri command**~~ — ✅ **เสร็จแล้ว** (Phase 1)
4. **`cargo clippy --fix`** เพื่อแก้ auto-fixable warnings — 30 นาที
5. **Consolidate README + HOW_TO files** ที่ top-level (5 ไฟล์) → 1-2 ไฟล์ — 1 ชั่วโมง
6. **เพิ่ม `.github/workflows/test.yml`** รันเทสต์อัตโนมัติบน PR — 1 ชั่วโมง
7. **Archive planning .md ที่ทำเสร็จแล้ว** (`300-template-plan.md`, `career_branch_management_plan.md`, `HOW_TO_TEST_PHASE1_1.md`) → โฟลเดอร์ `docs/archive/` — 15 นาที

---

## 📌 ภาคผนวก: ตัวชี้วัด (Metrics)

### Before (baseline, 2026-04-20)

- Rust code: ~15 modules, ~350 KB source
- Frontend code: ~350 TS/TSX files
- Rust tests: 76
- FE tests: 158
- Largest file: `QuestionFormCard.tsx` 138 KB
- `any` types: 80
- `console.log`: 308
- Backup modules: 5 (ทับซ้อน)
- Migration system: ❌ (ad-hoc `execute_best_effort` + `ensure_user_schema_migrations`)
- Default admin: ❌ hardcoded `"Admin&21"` ใน source
- Password hashing: 🟡 ทำใน frontend ได้ (`hash_password` command)

### Current (2026-04-21, หลัง Phase 1 + 2A + 6)

- Rust tests: **94** (+18)
- FE tests: **175** (+17)
- Migration system: ✅ versioned (`migrations.rs` + `schema_migrations` table)
- Default admin: ✅ documented trivial + forced password change
- Password hashing: ✅ backend only (`change_password` API; FE hashing removed)
- Path helper: ✅ ตัวเดียว (`get_content_database_path`)
- `database.rs` rename: ✅ → `auth.rs`
- Legacy `database.db`: ✅ auto-archived on startup

### Target (หลัง Phase 1-5)

- Rust code: ลดลง ~15% (dead code + backup merge)
- Largest file: < 50 KB
- `any` types: < 20
- `console.log`: 0 (ใน production code)
- Backup modules: 1
- Migration system: มีและ tracked
- Connection pool: มี
- DB encryption: option available

---

## 🔗 เอกสารอ้างอิง

- `docs/backend-improvement-plan.md` — แผน backend เดิม (ซิ้งก์กับ Phase 2, 10)
- `docs/dead-code-cleanup-plan.md` — (ซิ้งก์กับ Phase 4)
- `docs/refactoring-plan.md` — (ซิ้งก์กับ Phase 5)
- `docs/REFACTORING_PROGRESS.md` — Phase 0 (เสร็จแล้ว)
- `database_consolidation_plan.md` — ✅ consolidation done (ดู Phase 6 สำหรับ cleanup debt)
- `docs/TEST_SUITE_AUDIT.md` — (ซิ้งก์กับ Phase 9)
- `docs/changing-career-branch-protection.md` — Implementation reference

---

**หมายเหตุ:** แผนนี้เป็น _living document_ — ควรอัปเดตเมื่อมี finding ใหม่หรือ priority เปลี่ยน
