# Data Ownership and Portability Baseline

**Status:** Architecture baseline — ใช้เป็น Entry Gate ก่อน Editor Workflow Phase 5
**Created:** 2026-08-13
**Branch:** `editor-workflow-v2`

## Purpose

เอกสารนี้กำหนดเป้าหมายปลายทางของข้อมูล PQS ก่อนพัฒนา Workflow ต่อ เพื่อไม่ให้ UI, Rust, SQLite, Managed Files, Simulation และระบบ Export/Import เติบโตไปคนละทิศทาง

Baseline นี้แยกให้ชัดระหว่าง:

1. สิ่งที่ตรวจพบจาก Code ปัจจุบัน
2. หลักการ Product/Data ที่ต้องรักษาตั้งแต่ตอนนี้
3. งานขั้นต่ำที่ต้องปิดก่อนเริ่ม Phase 5
4. งานสถาปัตยกรรมที่ต้องออกแบบหรือสร้างภายหลัง

Baseline นี้ยังไม่ใช่คำสั่งให้สร้าง Schema, Revision engine, Encryption หรือ Export/Import ใน Phase 5

## Canonical Artifacts

ห้ามใช้คำว่า Template รวมความหมายของสิ่งต่อไปนี้:

### Application Template/Skeleton

- เป็น Format เปล่าที่ระบบใช้เริ่มสร้างเอกสารใหม่
- มีโครงสร้างนำทาง, Section บังคับ, หัวข้อมาตรฐาน และ Section 101
- ไม่มี Question ที่ Creator เขียน, Answer Key, Trainee Answer, Assessment, Progress หรือ Trainee Attachment
- ไม่ใช่ Package ที่แจกให้ Trainee

### Sample/Source Document

- เป็นเอกสารที่ Creator สร้างเนื้อหาเสร็จแล้ว
- เอกสาร `22724201001` เป็น Permanent Sample/Source Document ของโปรเจกต์
- เป็นเจ้าของ Question, Answer Key, Question Image, การเชื่อม Reference และโครงสร้างเนื้อหา
- ในอนาคตต้องเผยแพร่เป็น Revision ที่ระบุได้ ก่อนนำไปออก Trainee Test Copy จริง

### Source Revision

- เป็น Snapshot แบบคงที่ของ Source Document ณ เวลาที่เผยแพร่หรือออกสำเนา
- Issued Copy ต้องอ้าง Source Revision ที่แน่นอน ไม่ตามการแก้ Source Document รุ่นใหม่โดยอัตโนมัติ
- Answer Key ที่ใช้ประเมินต้องมาจาก Revision เดียวกับเนื้อหาที่ Trainee ได้รับ

### Trainee Test Copy / Issued Copy

- เป็นสำเนาอิสระที่ออกให้ Trainee หนึ่งราย
- เป็นเจ้าของ Answer, Progress, Assessment Events และ Trainee Attachments ของตนเอง
- ต้องไม่เปลี่ยน Source Document หรือ Issued Copy อื่น
- รหัส `<source-id>-SIM-<sequence>` ปัจจุบันเป็น Development Simulation ไม่ใช่ Production issuance model

### Evaluation Material

- เป็นข้อมูลแบบ Read-only ที่ Qualifier ใช้ประเมิน Issued Copy
- มี Answer Keys, Rubrics และข้อมูลผู้ตรวจที่ตรงกับ Source Revision
- ไม่จำเป็นต้องนำ Source Document ทั้งเล่มเข้าปลายทางในรูปแบบแก้ไขได้
- ต้องไม่ถูกเปิดเผยแก่ Trainee ผ่าน UI, SQLite row ที่อ่านได้ หรือไฟล์ Package ที่ไม่ได้เข้ารหัส

### Shared Reference

- `DocumentReferences` เป็น Global Master แม้ชื่อ Table จะสื่อคล้ายเป็นของเอกสาร
- เอกสารใช้ Reference ผ่าน `SectionReferences` และ `QuestionReferences`
- ไฟล์ที่นำกลับมาใช้ซ้ำควรมี Physical Ownership กลาง ไม่ผูกชะตากับโฟลเดอร์ Source Document ใดเอกสารหนึ่ง

## Current Code Baseline

### SQLite Authority

`content.db` เป็นฐานข้อมูลรวมและเป็น authority ของ:

- Documents, Sections, Questions และ Choices
- Answer Keys และความสัมพันธ์ของ Subquestions/Sections
- Reference master และ Reference links
- User Answers, Qualifier feedback/status และ Progress
- Simulation lineage และ counters

ไม่ควรแยกเป็น SQLite หนึ่งไฟล์ต่อเอกสาร เพราะข้อมูลผู้ใช้, Reference master, ความสัมพันธ์ข้ามเอกสาร และ Transaction boundary ต้องทำงานในระบบเดียวกัน

### Managed Files

- Development ใช้ AppData `pqs-rtn-hybrid-storage/data/`
- Release ใช้ `data/` ข้าง executable
- การสร้าง Document สร้าง SQLite records และ Section 101 แต่ไม่สร้าง per-document folders
- `question-images` และ `trainee-attachments` ถูกสร้างเมื่อมีการเขียนไฟล์ครั้งแรก
- Reference file สามารถอยู่ใต้ `data/<document-id>/references/` หรือ `data/COMMON/references/`

การสร้างโฟลเดอร์แบบ Lazy เป็น Baseline ที่ต้องรักษา โฟลเดอร์ว่างไม่ใช่หลักฐานว่าเอกสารหรือข้อมูลชนิดนั้นมีอยู่

### Current Simulation Limitation

Simulation clone ปัจจุบันคัดลอกโครงสร้าง SQLite, Answer Keys และความสัมพันธ์เพื่อพิสูจน์ Creator/Trainee/Qualifier Workflow ภายใน Installation เดียวกัน แต่ยังไม่ใช่ Portable Issued Copy เพราะ:

- Question Image metadata อาจยังอ้างไฟล์ของ Source Document เดิม
- Reference ใช้ Global Master และไฟล์ร่วมกับ Installation เดิม
- ไม่มี immutable Source Revision
- ไม่มี real-user assignment/authorization
- Answer Keys ยังอยู่ในข้อมูล Simulation เพื่อ Developer inspection

ดังนั้นห้าม Zip โฟลเดอร์ Simulation หรือ Export แถวฐานข้อมูลของ Simulation ตรง ๆ แล้วเรียกว่า Trainee Portable Package

### Current File-Ownership Gaps

- Question Images และ Trainee Attachments ยังถูกอ้างด้วย path ที่ฝังใน metadata/JSON แทน Asset registry ที่ระบุ ownership ชัดเจน
- Global Reference file อาจอยู่ใต้โฟลเดอร์ของ Document; Delete Document จึงต้องย้ายไฟล์ที่ยังใช้งานไป `COMMON`
- Full Hybrid Backup มีไว้กู้คืนทั้งระบบและแทนที่ state ปลายทาง ไม่ใช่ per-document portability
- ยังไม่มี per-document manifest, per-file checksum, revision conflict policy หรือ transactional merge package

## Live Storage Policy

โครงสร้างที่ใช้ได้โดยไม่ต้องย้ายไฟล์เดิมครั้งใหญ่ทันที:

```text
content.db

data/
├─ COMMON/
│  └─ references/
│     └─ <category>/...
│
├─ <source-document-id>/
│  └─ question-images/...
│
└─ <issued-copy-id>/
   └─ trainee-attachments/...
```

กติกา:

- SQLite บอกว่า Entity และ Asset ใดมีอยู่; ห้ามใช้การมีอยู่ของโฟลเดอร์เป็น authority
- ไม่สร้างโฟลเดอร์ของข้อมูลที่ยังไม่มี
- Source Document ไม่เป็นเจ้าของ Trainee Attachments
- Issued Copy ไม่เป็นเจ้าของ Creator Question Images หรือ Shared References
- Global reusable Reference files ใหม่ควรอยู่ใต้ `COMMON/references`
- การย้าย path เดิมไป `COMMON` ต้องเป็นงาน migration ที่วางแผนและทดสอบแยก ไม่ทำพร้อม Phase 5
- File write ในอนาคตควร stage, validate/hash, atomic rename และบันทึก link ด้วย Transaction/compensation ที่รายงานผลได้
- File delete ต้องคืนผล Database และ Filesystem แยกกัน ห้ามรายงานว่า “สำเร็จทั้งหมด” เมื่อ cleanup บางไฟล์ล้มเหลว

## Ownership Matrix

| Data | Authority / Owner | Portable to Trainee | Available to Qualifier | Clear Answers may delete |
|---|---|---:|---:|---:|
| Application Skeleton rules | System | No | No | No |
| Source Questions/Choices | Source Revision | Yes, assigned snapshot | Yes | No |
| Answer Keys/Rubrics | Source Revision / Evaluation Material | No | Yes, authorized only | No |
| Question Images | Source Revision | Yes, when required | Yes | No |
| Shared References | Global Reference Master | By access policy | By access policy | No |
| Trainee Answers | Issued Copy | Yes | Yes | Yes, active copy only |
| Qualifier status/feedback | Issued Copy assessment history | Policy dependent | Yes | Yes only where current Clear Answers contract includes its answer rows |
| Progress | Issued Copy | Yes | Yes | Yes, active copy only |
| Trainee Attachments | Issued Copy | Yes | Yes | Yes, active copy only |
| Simulation metadata | Developer capability | No production export | Developer only | No |

## Portability Package Contracts

Full Hybrid Backup/Restore ต้องคงเป็นคนละระบบกับ Package ต่อไปนี้

### Source Document Package

Purpose: ย้ายหรือเผยแพร่ Source Document หนึ่ง Revision โดยไม่แทนที่ `content.db` ปลายทาง

Include:

- Source Document metadata และ Source Revision identity
- Sections, Questions, Choices, Answer Keys และ structural links
- Question Images
- Reference metadata/links และไฟล์เฉพาะที่ Revision ใช้งาน
- Package manifest และ per-file checksums

Exclude:

- Trainee Answers, Progress และ Attachments
- Qualifier assessments/feedback
- Simulation instances และ mock identities
- Sessions และ User credentials

### Trainee Working Package

Purpose: ให้ Trainee นำ Issued Copy ไปปฏิบัติงาน Offline แม้เครื่องปลายทางไม่เคยมี Source Document

Include:

- Issued Copy ID, Trainee assignment และ issue metadata
- Source Document ID และ immutable Source Revision ID
- Assigned Questions/Choices และไฟล์ที่จำเป็น
- References ที่ Trainee มีสิทธิ์เข้าถึง
- พื้นที่ข้อมูลสำหรับ Answers, Progress และ Attachments

Exclude:

- Answer Keys และ Rubrics
- Qualifier-only References
- Source authoring state และ Creator Drafts

### Evaluator Package

Purpose: ให้ Qualifier ปลายทางประเมิน Issued Copy ได้โดยไม่ต้องมี Source Document อยู่ก่อน

Include:

- Source Document ID และ Source Revision ID เดียวกับ Trainee Working Package
- Stable Question mapping
- Answer Keys, Rubrics และ Qualifier-only References ที่จำเป็น
- Package integrity/signature metadata
- Scope ของ Issued Copies หรือหน่วยงานที่อนุญาตให้ตรวจ

Import เป็น Read-only Evaluation Material ไม่ใช่ Editable Source Document

Evaluator Package ต้องถูกแจกจ่ายผ่านช่องทางควบคุม แยกจาก Trainee Working Package ในรุ่นแรก

### Trainee Return Package

Purpose: ส่งงานที่ Trainee ทำกลับเพื่อ Merge และประเมิน

Include:

- Issued Copy ID และ Source Revision identity
- Answers, Progress, Attachments และ audit timestamps ที่อนุญาต
- Integrity metadata ของ content snapshot ที่ใช้ทำงาน

Import ต้อง Merge เฉพาะ Issued Copy เป้าหมาย ไม่แทนที่ฐานข้อมูลหรือเอกสารอื่น

### Reference Package

Purpose: กระจายคลัง Reference อย่างอิสระหรือใช้ประกอบ Source/Evaluator Package

Include:

- Stable reference code, title, type, category และ classification
- File/URL metadata, MIME, size และ SHA-256
- Version/revision เมื่อ Reference เดียวกันมีการเปลี่ยนเนื้อหา

Conflict policy:

- Code เดิม + Hash เดิม: reuse
- Code เดิม + Hash ต่างกัน: explicit conflict/version decision
- ห้าม silent overwrite

## Answer Key Offline Rule

Answer Key ต้องเดินทางไปถึง Qualifier ปลายทาง แต่ต้องไม่อยู่ในข้อมูลที่ Trainee อ่านได้

Baseline รุ่นแรก:

1. Issuer สร้าง Trainee Working Package และ Evaluator Package จาก Source Revision เดียวกัน
2. Trainee ได้รับเฉพาะ Working Package
3. Qualifier/หน่วยปลายทางได้รับ Evaluator Package ผ่านช่องทางควบคุม
4. Trainee Return Package จับคู่กับ Evaluation Material ด้วย `source_document_id`, `source_revision_id`, `issued_copy_id` และ stable question identity
5. Revision หรือ checksum ไม่ตรงกันต้อง block การประเมินและแสดง Conflict ห้ามเลือก Answer Key ล่าสุดแทนโดยอัตโนมัติ

Target ในอนาคตอาจบรรจุ `sealed-evaluator-content` ที่เข้ารหัสไว้ใน Package เดียวกันและเปิดได้ด้วยกุญแจ/Certificate ของ Qualifier แต่ต้องไม่เริ่มก่อนมี real-user authorization, key management, revocation และ audit policy ที่ชัดเจน รหัสผ่าน ZIP หรือ UI role guard อย่างเดียวไม่เพียงพอ

## Package Manifest Minimum

ทุก Package ต้องมี manifest ที่ครอบคลุมทุกไฟล์ ไม่ใช่ checksum เฉพาะฐานข้อมูล:

```text
package_type
package_format_version
source_document_id
source_revision_id
issued_copy_id (when applicable)
exported_at / exported_by
application_version / schema_version
classification
files[]
  logical_path
  sha256
  size
  mime_type
  required
dependencies[]
signature (future/when required)
```

Import ต้องใช้ staging directory, ปฏิเสธ unsafe paths, ตรวจ schema/version/checksum ก่อนเขียน, Merge ด้วย SQLite transaction และไม่แตะเอกสารอื่นเมื่อเกิด failure

## Phase 5 Entry Gate — Must Do Now

รายการต่อไปนี้ต้องปิดก่อนเริ่ม Batch 5.1 และถือว่าปิดเมื่อ Baseline/Phase Plan/Specification สอดคล้องกัน:

- [x] กำหนด canonical artifact และ ownership terminology
- [x] ยืนยัน Lazy Folder Creation และ SQLite authority
- [x] กำหนดว่า Question Images, Shared References และ Trainee Attachments เป็นคนละ ownership scope
- [x] แยก Full Hybrid Backup ออกจาก per-document portability
- [x] กำหนด Source, Trainee Working, Evaluator, Trainee Return และ Reference package responsibilities
- [x] กำหนด Answer Key offline rule: ไม่อยู่ใน Trainee-readable package และใช้ Evaluator Package แยกในรุ่นแรก
- [x] กำหนดว่า Issued Copy/Assessment ต้องตรึงกับ Source Revision เดียวกัน
- [x] กำหนด Phase 5 result contract ให้รายงาน Database result และ Filesystem cleanup แยกกัน
- [x] ระบุว่าการลบ/ล้างใน Phase 5 ห้ามแตะ Source assets, Answer Keys และ Shared References

สิ่งที่ Phase 5 ทำได้ทันทีโดยไม่รอ Schema ใหม่:

- ใช้ authoritative rows นับ Answer/Assessment/Progress/Attachment impact
- คืน typed deletion result ที่แยก DB deletion กับ file cleanup
- รักษา exact-document/exact-question ownership
- แสดง partial cleanup อย่างซื่อตรงและมี recovery details
- เพิ่ม isolation/preservation tests สำหรับ Source content และเอกสารอื่น

## Deferred Architecture Work — Do Not Mix Into Phase 5

- Source publication and immutable revision schema
- Production Issued Copy ownership and real-user assignment
- Section Assessment Plan และ multi-Qualifier audit
- Normalized Managed Asset registry (`asset_id`, owner scope/id, kind, path, hash, size, MIME)
- Migration ของ Global Reference files เดิมไป `COMMON`
- Source/Evaluator/Trainee/Reference package builders and importers
- Package signing, encryption, certificates, key rotation/revocation
- Classification/export authorization policy
- Conflict-resolution UI และ cross-installation identity policy
- Release-seed cleanup implementation

งานเหล่านี้ต้องอ้าง Baseline นี้และมี Rust/SQLite policy tests ก่อนเปิดใช้จริง

## Open Product Decisions Before Portable Export Implementation

- Source Revision เกิดเมื่อ Publish, Issue หรือทั้งสองเหตุการณ์
- ใครมีสิทธิ์ออก, ยกเลิก และ supersede Source Revision
- Qualifier identity เป็นรายบุคคล หน่วยงาน หรือรองรับทั้งสองแบบ
- Evaluation Material ผูกกับ Issued Copy เฉพาะชุดหรือใช้ซ้ำได้ทั้ง Revision
- Reference classification ใดอนุญาตให้ออกจากหน่วยต้นทาง
- Return Package รองรับการทำงานสลับหลายเครื่องหรืออนุญาต active writer เพียงเครื่องเดียว
- Assessment history และ Qualifier feedback ส่วนใดส่งกลับให้ Trainee เห็น
- Retention/audit policy หลัง Clear Answers, revoke หรือปิด Issued Copy

## Verification Strategy for Future Portability

- Round-trip export/import ใน temporary database/data roots
- Trainee Package ไม่มี Answer Key ทั้งใน payload, manifest และ extracted files
- Source revision mismatch และ tampered checksum ถูก block
- Missing required asset ทำให้ Export/Import ไม่อ้างว่าสำเร็จ
- Malicious ZIP paths ไม่ออกนอก staging directory
- Reference code/hash deduplication และ explicit conflict
- Import ไม่เปลี่ยน Document/Issued Copy อื่น
- Clear Answers และ Delete One Answer ไม่แตะ Source assets หรือ Shared References
- Partial filesystem cleanup คืนผลและ recovery detail ที่ตรวจสอบได้
