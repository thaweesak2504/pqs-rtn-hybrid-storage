# 📋 PQS RTN Hybrid Storage — Project Review & Improvement Plan

> **สร้างเมื่อ:** 2026-04-20 | **Branch ปัจจุบัน:** `career-branches-management`
> **ผู้ตรวจสอบ:** Cascade AI | **ขอบเขต:** Full comprehensive review (Backend + Frontend + DB + Tests + Security)

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
- มี test coverage พื้นฐานดี (76 Rust + 158 FE tests)
- bcrypt password hashing
- แยก Hybrid storage (filesystem + DB metadata) ดี
- มีเอกสาร planning เยอะ (backend-improvement-plan, refactoring-plan, etc.)

### จุดที่ต้องปรับปรุงเร่งด่วน

1. 🔴 **Security gap** — `update_user` tauri command รับ `password_hash` จาก frontend โดยตรง
2. 🔴 **Backup module redundancy** — 4 modules ทับซ้อน (~75 KB รวม)
3. 🟠 **Migration framework ขาดหาย** — ใช้ `execute_best_effort` 50+ จุดใน `schema.rs` (ad-hoc DDL/backfill)
4. 🟠 **Giant files** — `QuestionFormCard.tsx` 138 KB, `tests.rs` 82 KB, `main.rs` 49 KB (150 commands)
5. 🟠 **Connection pooling ขาดหาย** — เปิด connection ใหม่ทุกครั้ง
6. 🟡 **Type safety** — `any` 80 ครั้งใน 36 ไฟล์, `console.log` 308 ครั้งใน 71 ไฟล์
7. 🟡 **Dead code** — ~400 บรรทัด (identified แล้วแต่ยังไม่ลบ)
8. ✅ ~~**2 SQLite files**~~ — **เสร็จแล้ว** (consolidated → `content.db` เดียว) แต่เหลือ cleanup debt (ดู Phase 6)

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
| Connection pooling  | 🔴    | ยังไม่มี (เปิดใหม่ทุก function call)                   |
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

| ประเด็น                 | สถานะ | รายละเอียด                                                                              |
| ----------------------- | ----- | --------------------------------------------------------------------------------------- |
| DB consolidation        | ✅    | **เสร็จแล้ว** — รวมเป็น `content.db` เดียว (users, officers, documents, questions, ...) |
| Path helper duplication | 🟠    | `get_database_path()` ซ้ำกัน **6 ไฟล์** — ควรรวมเป็นตัวเดียว                            |
| `database.rs` rename    | 🟡    | ชื่อ `database.rs` กำกวม (จริงๆ คือ user/auth repo) — ควร rename                        |
| Schema migration        | 🔴    | ~50 `execute_best_effort` + ad-hoc DDL ใน `schema.rs` (47 KB)                           |
| Migration tracking      | 🔴    | ไม่มีตาราง `schema_version`                                                             |
| Backfills               | 🟠    | รันทุก startup (เคยทำให้เกิด loop แล้ว)                                                 |
| Indexes                 | 🟡    | มีบ้าง แต่ยังไม่ครบ (`parent_id`, `section_id` บาง query)                               |
| FK constraints          | 🟢    | ใช้ `ON DELETE CASCADE` สม่ำเสมอ                                                        |
| Encryption              | 🔴    | ไฟล์ `.db` เป็น plain text                                                              |

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

| ประเด็น                 | สถานะ | รายละเอียด                                               |
| ----------------------- | ----- | -------------------------------------------------------- |
| Password hashing        | 🟢    | bcrypt (DEFAULT_COST)                                    |
| `update_user` API       | 🔴    | **รับ `password_hash: String` จาก frontend** — เสี่ยงสูง |
| `hash_password` exposed | 🟠    | เปิดให้ frontend hash ได้ — ผิดหลัก security             |
| Hardcoded admin pw      | 🔴    | `"Admin&21"` ใน `database.rs:350`                        |
| DB encryption           | 🔴    | ยังไม่มี (plan SQLCipher)                                |
| Input validation        | 🟡    | ระดับ Tauri command บางจุดไม่ validate                   |
| SQL injection           | 🟢    | ส่วนใหญ่ใช้ `params![]` ถูกต้อง                          |

---

### 5. Testing

| ประเด็น             | สถานะ | รายละเอียด                                               |
| ------------------- | ----- | -------------------------------------------------------- |
| Rust tests          | 🟡    | 76 tests ใน `tests.rs` ไฟล์เดียว (82 KB)                 |
| Frontend tests      | 🟢    | 158 tests, 16 integration tests                          |
| Tauri commands test | 🔴    | `main.rs` 150 commands แทบไม่มีเทสต์                     |
| E2E testing         | 🔴    | ไม่มี Playwright/WebdriverIO                             |
| Test helpers        | 🟡    | `test_helpers.rs` 27 KB — schema สร้างซ้ำกับ `schema.rs` |

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

### 🔴 Phase 1: Security Hardening (Critical — 1-2 weeks)

**เป้าหมาย:** ปิดช่องโหว่ระดับวิกฤตก่อน release ถัดไป

| #   | Task                                                                          | ไฟล์                                  | Effort |
| --- | ----------------------------------------------------------------------------- | ------------------------------------- | ------ |
| 1.1 | ลบ `hash_password` tauri command + ไม่ส่ง `password_hash` จาก FE              | `main.rs:74-86`, `main.rs:189-192`    | S      |
| 1.2 | `update_user` รับ `password: Option<String>` (plaintext) แล้ว hash ใน backend | `main.rs`, `database.rs::update_user` | M      |
| 1.3 | ลบ hardcoded admin password — ใช้ random generated + แสดงครั้งเดียวตอน init   | `database.rs:350`                     | M      |
| 1.4 | เพิ่ม password strength validation ที่ backend                                | `database.rs`, `main.rs`              | S      |
| 1.5 | Audit `format!` + SQL 58 จุด — convert เป็น `params![]` ที่เหลือ              | หลายไฟล์                              | M      |
| 1.6 | Add rate limiting สำหรับ `authenticate_user`                                  | `database.rs`, `main.rs`              | M      |

**Deliverables:**

- [ ] Security audit report (ระบุสิ่งที่ถูก fix + ที่เหลือ)
- [ ] Tests: `test_update_user_rejects_password_hash_param`, `test_admin_password_not_hardcoded`
- [ ] CHANGELOG: breaking change (FE ต้องอัพเดต API)

---

### 🟠 Phase 2: Migration Framework + Connection Pooling (2-3 weeks)

**เป้าหมาย:** แก้ root cause ของปัญหา startup loop และ DB lock

| #   | Task                                                           | ไฟล์                              | Effort |
| --- | -------------------------------------------------------------- | --------------------------------- | ------ |
| 2.1 | นำ `refinery` หรือ `sqlx-migrate` เข้ามา                       | `Cargo.toml`, ใหม่: `migrations/` | L      |
| 2.2 | เพิ่มตาราง `schema_version` + API `current_version()`          | schema.rs                         | S      |
| 2.3 | ย้าย 50 `execute_best_effort` → เป็นไฟล์ migration `.sql` แยก  | `schema.rs`                       | L      |
| 2.4 | ย้าย data backfills → ทำครั้งเดียว (tracked) ไม่ใช่ทุก startup | `schema.rs`                       | M      |
| 2.5 | ใช้ `r2d2_sqlite` + Tauri State สำหรับ connection pool         | `connection.rs`, `main.rs`        | L      |
| 2.6 | Refactor functions ที่ยังไม่มี `_with_conn` variant            | หลายไฟล์                          | M      |

**Deliverables:**

- [ ] โฟลเดอร์ `src-tauri/migrations/V1__init.sql`, `V2__*.sql`, ...
- [ ] ระบบตรวจสอบ migration หายจากเครื่อง user
- [ ] Tests: migration up/down, rollback safety
- [ ] Benchmark: DB operations เร็วขึ้น X%

---

### 🟠 Phase 3: Backup/Export Consolidation (1-2 weeks)

**เป้าหมาย:** ลบความซ้ำซ้อน 75 KB → เหลือ module เดียว

| #   | Task                                                                       | ไฟล์                                           | Effort |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------- | ------ |
| 3.1 | Map การใช้งานจริงของแต่ละ backup module (ดู `main.rs`)                     | -                                              | S      |
| 3.2 | Merge → 1 module `backup.rs` (รวมทุก format)                               | backup, hybrid_backup, universal_sqlite_backup | L      |
| 3.3 | แยก `export.rs` (SQL/CSV/JSON) ให้ชัด                                      | `database_export.rs`                           | M      |
| 3.4 | ลบ `database_backup.rs`, `backup_manager.rs`, `universal_sqlite_backup.rs` | -                                              | S      |
| 3.5 | อัพเดต FE calls + tests                                                    | `src/services/`, tests                         | M      |

**Deliverables:**

- [ ] Backup module เดียว, เลือก format ผ่าน enum
- [ ] ลดโค้ด ~40 KB
- [ ] Tests ครอบคลุม create/restore/verify/delete

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

| Phase                                   | ระยะเวลา  | Priority       | Dependencies         |
| --------------------------------------- | --------- | -------------- | -------------------- |
| 1. Security Hardening                   | 1-2 weeks | 🔴 Critical    | -                    |
| 2. Migration + Pooling                  | 2-3 weeks | 🟠 High        | -                    |
| 3. Backup Consolidation                 | 1-2 weeks | 🟠 High        | -                    |
| 4. Dead Code Cleanup                    | 1 week    | 🟡 Medium      | Phase 3 (บาง module) |
| 5. Large File Refactoring               | 2-3 weeks | 🟡 Medium      | Phase 2 (schema.rs)  |
| 6. DB Consolidation Cleanup (debt only) | 2-3 days  | ✅ Mostly done | Phase 2              |
| 7. Type Safety & DX                     | 1-2 weeks | 🟢 Low         | -                    |
| 8. Performance                          | 1-2 weeks | 🟢 Low         | Phase 2              |
| 9. Testing Expansion                    | 2-3 weeks | 🟢 Low         | Phase 5.3            |
| 10. Encryption & Prod                   | 1-2 weeks | 🟢 Low         | Phase 2              |

**Total estimate:** 14-22 weeks (3-5 months) หากทำ sequential, **8-12 weeks** หากทำ parallel บางส่วน

### แนะนำลำดับทำงาน (realistic)

```
Week 1-2:   Phase 1 (Security)         🔴 ต้องทำก่อน release ถัดไป
Week 3-5:   Phase 2 (Migration+Pool)   🟠 root cause ของหลายปัญหา
Week 6-7:   Phase 3 (Backup merge)     🟠 parallel กับ Phase 4 ได้
Week 7-8:   Phase 4 (Dead code)        🟡
Week 9-11:  Phase 5 (Large files)     🟡
Week 12:    Phase 6 (DB cleanup debt) ✅ consolidation done, แค่ cleanup 2-3 วัน
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
3. **ลบ `hash_password` tauri command** — 15 นาที + test
4. **`cargo clippy --fix`** เพื่อแก้ auto-fixable warnings — 30 นาที
5. **Consolidate README + HOW_TO files** ที่ top-level (5 ไฟล์) → 1-2 ไฟล์ — 1 ชั่วโมง
6. **เพิ่ม `.github/workflows/test.yml`** รันเทสต์อัตโนมัติบน PR — 1 ชั่วโมง
7. **Archive planning .md ที่ทำเสร็จแล้ว** (`300-template-plan.md`, `career_branch_management_plan.md`, `HOW_TO_TEST_PHASE1_1.md`) → โฟลเดอร์ `docs/archive/` — 15 นาที

---

## 📌 ภาคผนวก: ตัวชี้วัด (Metrics)

### Before (baseline)

- Rust code: ~15 modules, ~350 KB source
- Frontend code: ~350 TS/TSX files
- Rust tests: 76
- FE tests: 158
- Largest file: `QuestionFormCard.tsx` 138 KB
- `any` types: 80
- `console.log`: 308
- Backup modules: 5 (ทับซ้อน)

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
