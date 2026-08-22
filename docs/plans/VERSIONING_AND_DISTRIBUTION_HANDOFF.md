# Versioning, Distribution and Compatibility Handoff

**Status:** Consolidated architecture handoff — เก็บสะสมข้อกำหนดก่อนเปิด Implementation Phase
**Created:** 2026-08-22
**Branch at handoff:** `editor-workflow-v2`

เอกสารนี้รวบรวมประเด็น Version ที่พบระหว่าง Editor, Introduction, Section 300, Backup และ Portability เพื่อป้องกันการออกแบบแยกส่วนแล้วต้องย้อนแก้หลายครั้ง เอกสารนี้ยังไม่อนุญาตให้เพิ่ม Schema, Revision engine, Package importer/exporter หรือระบบ Update โดยอัตโนมัติ

## 1. ขอบเขตคำว่า Version

Git source control และ Product/Data versioning เป็นคนละเรื่อง:

- **Git Commit/Branch/Tag** ระบุประวัติ Source Code และเอกสารพัฒนา
- **Application Release Version** ระบุ Software ที่ติดตั้ง
- **Schema Migration Version** ระบุวิวัฒนาการโครงสร้าง SQLite
- **System Content Release** ระบุข้อความมาตรฐานที่มากับ Application
- **Source Document Revision** ระบุฉบับเนื้อหาเอกสารที่ Publish/Issue
- **Issued Copy Snapshot** ระบุฉบับที่ Trainee ได้รับจริง
- **Answer/Assessment Revision** ระบุประวัติการส่ง แก้ไข และประเมิน
- **Reference Revision** ระบุไฟล์อ้างอิง Code เดิมที่เนื้อหาอาจเปลี่ยน
- **Backup Manifest Version** ระบุรูปแบบ Full-system Backup
- **Portable Package Format Version** ระบุสัญญาแลกเปลี่ยน Source/Trainee/Evaluator/Return/Reference Package

ห้ามใช้เลข Version ตัวเดียวแทนทุก Domain เพราะแต่ละ Domain เปลี่ยนและตรวจ Compatibility คนละเหตุการณ์

## 2. Current Code/Data Inventory

| Version domain | Current authority/implementation | Current gap |
| --- | --- | --- |
| Application release | `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` แสดง `0.1.0` | ยังไม่มี release checklist ที่พิสูจน์การ sync, tag, rollout และ rollback |
| SQLite schema | `schema_migrations`; ปัจจุบันมี versioned migrations ถึง Migration 3 | Compatibility ระหว่าง Application release กับ supported schema range ยังไม่ถูกประกาศเป็น contract กลาง |
| System Introduction | Typed definitions ใน Code และ Live Update ตาม Application release | ตั้งใจไม่มี per-document snapshot; ต้องอ้าง Application release ที่บรรจุ approved wording |
| Source Document revision | `Documents` มี lifecycle metadata แต่ยังไม่มี immutable published revision identity | ยังตัดสินใจไม่ได้ว่า Revision เกิดตอน Publish, Issue หรือทั้งสองเหตุการณ์ |
| Simulation/Issued lineage | `DocumentSimulationInstances` ผูก Simulation กับ Source และ Trainee จำลอง | ยังไม่มี `source_revision_id`, production ownership, revoke/supersede หรือ immutable snapshot contract |
| Answer/Assessment history | `UserAnswers` เก็บ latest answer/status/feedback | ยังไม่มี submission/feedback event history สำหรับ `needs_improvement` |
| Reference revision | Stable reference metadata/path มีอยู่ | ยังไม่มี content hash, revision identity และ Code เดิม + Hash ต่างกัน conflict policy ในระบบจริง |
| Full Hybrid Backup | `BackupManifest.version = "1.0"`, SQLite snapshot checksum และ archive validation | ต้อง audit supported-version enforcement และ Application/Schema compatibility; Backup ยังคงเป็น full-system restore เท่านั้น |
| Portable Package | มี architecture baseline แต่ยังไม่มี public package engine | ยังไม่มี manifest implementation, signing, merge identity หรือ compatibility enforcement |

## 3. Confirmed Boundaries

- Application Template/Skeleton, permanent Sample/Source `22724201001` และ Trainee Test Copy เป็นคนละ Artifact
- System Introduction เป็น Live System Content; General ข้อ 2 `applied_to` เป็น Document Content
- Full Hybrid Backup/Restore ห้ามใช้แทน Portable Package รายเอกสาร
- Trainee-readable Package ห้ามมี Answer Key; ปลายทางใช้ Evaluator Package แยกซึ่งต้องตรง Source Revision
- Package import ในอนาคตต้อง staging, validate version/checksum/dependency และ transactional merge เฉพาะเป้าหมาย ห้ามแทนที่ `content.db`
- Reference Code เดิม + Hash ต่างกันต้อง explicit conflict/version decision ห้าม silent overwrite
- Release Seed ต้องเก็บ Skeleton rules และ Sample `22724201001` แต่ไม่มี Simulation, mock work, answers, assessments, progress, attachments หรือ sessions
- Rust/SQLite เป็น authority ของ persistent revision, compatibility และ conflict rules; UI เป็นเพียง workflow/feedback layer

## 4. Dependency Matrix

```text
Application Release
  ├─ supports Schema Migration range
  ├─ carries approved System Introduction
  ├─ reads Backup Manifest versions
  └─ reads/writes Portable Package Format versions

Source Document Revision
  ├─ freezes Question/Answer Key/Reference identities
  ├─ is captured by Issued Copy Snapshot
  ├─ must match Evaluator Package
  └─ governs Return Package merge/conflict

Issued Copy Snapshot
  ├─ owns Trainee answers/progress/attachments
  ├─ owns assessment history
  └─ must not follow later Source edits silently
```

## 5. Decisions To Collect Before Implementation

### Release and rollback

- Single source of truth และ synchronization rule สำหรับ Application version ทั้งสาม manifest
- Release channel, site rollout, minimum supported version และวิธีตรวจเครื่องที่ยังล้าหลัง
- Hotfix/rollback owner และ policy เมื่อ Release ใหม่รัน irreversible migration แล้ว
- Release note/approval reference สำหรับ System Content

### Source and issued copies

- Source Revision เกิดเมื่อ Publish, Issue หรือทั้งสองเหตุการณ์
- ใครออก, revoke, supersede และ re-issue Revision ได้
- Source edit ใดเป็น patch/minor/major ในความหมายของเอกสาร
- Issued Copy ตรึง Section plan, random selection, Reference และ Answer Key identity เมื่อใด

### Answers and assessments

- เก็บทุก submission หรือเก็บ retention window
- Feedback/reversal ใดเป็น immutable audit event
- ผู้ใดเห็น historical answer/feedback และส่งผ่าน Return Package ส่วนใด

### References and packages

- Reference classification ใด export ได้
- Stable identity, revision และ SHA-256 ownership
- Package compatibility range, upgrade path และ explicit conflict UX
- Signing/encryption/key management หลัง real-user authorization พร้อมเท่านั้น

## 6. Proposed Future Phase Slices

1. **V1 — Version Inventory and Registry:** audit version sources, supported ranges และ release metadata โดยยังไม่เพิ่ม Revision schema
2. **V2 — Source Revision and Issued Snapshot:** Rust/SQLite model, immutable identity, revoke/supersede และ Simulation migration path
3. **V3 — Answer and Assessment History:** submission/feedback events, retention และ visibility
4. **V4 — Reference/Asset Revision:** managed asset identity, hash, deduplication และ classification
5. **V5 — Typed Portable Packages:** manifest contracts, builders/importers, staging, checksum และ transactional merge
6. **V6 — Distribution, Rollback and Release Seed:** rollout, recovery, compatibility UI และ clean packaged-install verification

แต่ละ Slice ต้องมี Product Decision, Rust policy tests, frontend contract tests และ Manual Gate แยกกัน ห้ามเปิดเป็น implementation ก้อนเดียว

## 7. Transferred Work

- Introduction Batch I2.3 Release/Rollback และ I2.4 Compatibility ถูกย้ายมาเก็บใน Handoff นี้ ไม่ขวางการปิด Introduction Batch I2.2
- Phase 3.5 เรื่อง Template revision, Issued Copy, Assessment Plan, answer history และ Portable Package ต้องอ้างเอกสารนี้ร่วมกับ `DATA_OWNERSHIP_AND_PORTABILITY_BASELINE.md`
- Section 300 ยังต้องกำหนดว่า linked Requirement ใช้ live result หรือ frozen issued revision ก่อนสร้าง production Issued Copy

## 8. Next Product Work

งานถัดไปที่เหมาะสมคือกลับไป `SECTION_300_QUALIFICATION_WORKFLOW_BASELINE.md` และเริ่ม **Section 300 Slice A — Integrity Foundation** เพราะกฎ Requirement graph, shared progress และ downgrade propagation จะเป็นข้อมูลสำคัญต่อ Source Revision/Issued Snapshot ในอนาคต

จุดเริ่มต้องเป็นการตรวจ Code/Data แบบ Read-only และแยกสามปัญหา:

1. persistent Section-reference ordering,
2. Simulation `refSectionId` remapping,
3. linked Section progress/recalculation contract จากหลักฐาน `22730203001-SIM-013`.

ยังไม่เพิ่ม Admin authorization, real-user mapping, Version schema หรือ Portable Export ใน Slice A
