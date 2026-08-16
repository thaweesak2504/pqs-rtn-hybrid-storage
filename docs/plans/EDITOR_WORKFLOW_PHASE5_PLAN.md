# Editor Workflow Phase 5 — Destructive Operations and Feedback

**Status:** Phase 5 complete — automated checkpoint และ Manual regression ผ่านครบแล้ว
**Created:** 2026-08-13
**Branch:** `editor-workflow-v2`

## Phase 5 Entry Gate

Data ownership และ portability contract ถูกกำหนดไว้ใน `DATA_OWNERSHIP_AND_PORTABILITY_BASELINE.md` ก่อนเริ่มงาน destructive operations แล้ว

สิ่งที่ Phase 5 ต้องนำมาใช้ทันที:

- SQLite rows เป็น authority ของสิ่งที่จะลบ; การมีหรือไม่มี folder ไม่ใช่ state
- Source Questions, Answer Keys, Question Images และ Shared References ไม่อยู่ในขอบเขต Clear Answers/Delete One Answer
- Trainee Attachments เป็น asset ของ active Issued/Simulation Copy เท่านั้น
- Backend result ต้องแยก database deletion จาก filesystem cleanup และรายงาน partial cleanup อย่างซื่อตรง
- Phase 5 ห้ามเพิ่ม Source Revision, production Issued Copy schema, Asset registry หรือ Export/Import engine; งานเหล่านี้ถูกแยกเป็น deferred architecture work

**Entry Gate Status:** ผ่านด้าน Architecture/Documentation — พร้อมเริ่ม Batch 5.1 หลังตรวจ Documentation diff รอบนี้

## Phase Goal

ทำให้การลบคำตอบหนึ่งข้อและการล้างงาน Trainee ทั้งรอบจำลองมีขอบเขต ผลกระทบ ผลลัพธ์ และ failure recovery ที่ชัดเจน โดย Rust/SQLite เป็น authority และ UI ไม่เดาผลจาก state ฝั่ง React

## สิ่งที่ตรวจพบจาก Code

### Clear Answers ของรอบจำลอง

- เมนู `ล้างคำตอบของรอบจำลอง` มีเฉพาะ Simulation และ backend `clear_simulation_document_answers` ตรวจซ้ำว่า Document เป็น Simulation จริง
- Batch 5.1A นำ generic `clear_document_trainee_answers` ออกจาก Tauri IPC registration แล้ว จึงไม่มี command ภายนอกที่ข้าม Simulation guard ไปสั่งล้าง Source Document ได้
- `clear_document_trainee_answers_with_conn` ลบ `UserAnswers` และ `UserProgress` เฉพาะ `document_id` ภายใน SQLite transaction แล้วจึงลบ directory `trainee-attachments` ของเอกสารนั้น
- Batch 5.1A เปลี่ยน Backend ให้คืน `ClearAnswersResult` ซึ่งแยก authoritative SQLite counts จาก managed-filesystem cleanup result พร้อม assessed-row count, attachment references, invalid metadata และ logical-path-only failures
- ถ้าลบ attachment directory ไม่สำเร็จ Backend ยังคงผล SQLite ที่ commit แล้ว แต่คืน `cleanupComplete: false` และ failure details แทนการซ่อนผลไว้ใน log อย่างเดียว
- Batch 5.2 ย้าย Clear Answers ไป `WorkflowModal` แล้ว พร้อม exact Simulation ID confirmation, active/source identity, delete/preserve scope, async ownership และการคืน Focus ไป `View As`
- Success/partial result ใช้ `ClearAnswersResult` จาก Rust แสดง answer/assessment/progress/file counts; command failure คง context และค่าที่ยืนยันไว้สำหรับ Retry พร้อม Copy Details

### Delete One Answer

- `TraineeAnswerBox` ใช้ `WorkflowModal` แล้ว จึงมี focus trap, action loading, duplicate-action guard และ inline action error จาก Phase 4
- Batch 5.3A ใช้ Modal เฉพาะงานลบที่ระบุ Question/Subquestion, การมีข้อความ, จำนวนไฟล์แนบ, Assessment status และผลต่อ Progress ก่อนยืนยัน
- UI เรียก `delete_trainee_answer` ด้วย identity `user_id + document_id + question_id + sub_question_code`
- Batch 5.1B เปลี่ยน Backend ให้ลบ exact composite identity ใน SQLite transaction และ commit ก่อนเริ่ม managed-file cleanup; SQLite failure จึงไม่ลบไฟล์ของคำตอบที่ยังอยู่
- Backend คืน `DeleteAnswerResult` แยก database deletion, atomic progress recalculation และ managed-filesystem cleanup พร้อมบอก matched row, assessment/text presence, attachment path count, retained shared files, missing files และ partial failures
- Attachment cleanup ยอมรับเฉพาะ logical path `data/<document-id>/trainee-attachments/...` ที่เป็นของ Document เป้าหมาย และรักษาไฟล์ที่ยังมี Database reference อื่นใช้อยู่
- Progress recalculation หลังการลบใช้ transaction แยกของตนเอง; ถ้าล้มเหลว ผลลบคำตอบที่ commit แล้วจะยังถูกรายงานตรงไปตรงมาเป็น `progress.complete: false`
- Batch 5.3A คง answer context เมื่อ command ล้มเหลว พร้อม Retry/Copy Details และตรวจ payload จาก IPC ก่อนนำไปแสดง
- คำสั่งลบถูกปิดเมื่อคำตอบหรือไฟล์แนบใน Editor มี Draft ที่ยังไม่บันทึก ผู้ใช้ต้องบันทึกหรือยกเลิก Draft ก่อน เพื่อไม่ให้ไฟล์ใหม่ที่ยังไม่ผูกกับ authoritative answer row ค้างอยู่

### Test coverage

- Rust tests พิสูจน์ว่า Clear Answers ไม่ลบ `UserAnswers`, `UserProgress` และ attachment directory ของเอกสารอื่น รวมทั้งรักษา Documents, Questions, Answer Keys, Question References, Reference master, Question Images และ Shared Reference files
- Rust test พิสูจน์ว่า Source Document ถูกปฏิเสธโดย simulation-only authority path และ Simulation เป้าหมายยังล้างได้
- Rust test พิสูจน์ unavailable managed-data directory เป็น partial filesystem result โดย SQLite result ยังคงรายงานตรงตาม Transaction
- Rust tests พิสูจน์ single-answer exact identity แยก User/Question/Subquestion/Document, รักษา Questions และ Answer Keys, ไม่ลบไฟล์ข้าม Document, รักษา shared attachment ที่ยังถูกอ้าง, รักษาทั้ง answer row/file เมื่อ SQLite ปฏิเสธการลบ และคืน partial result ตรงจริงเมื่อ Progress ล้มเหลวหลัง answer commit
- Frontend tests พิสูจน์ typed confirmation, focus return, duplicate/loading guard, command identity, complete/partial result summary และ failure Retry/Copy Details แล้ว; Manual UI Gate ของ Clear Answers, Delete One Answer และ Section 300 prerequisite ผ่านด้วย disposable Simulation แล้ว

## ข้อเสนอ UX

- Typed confirmation ใช้เฉพาะ document-level Clear Answers เพราะ blast radius ใหญ่; ให้พิมพ์ Document ID ตรงกันก่อนเปิดคำสั่งล้าง
- Delete One Answer ไม่ต้องพิมพ์ยืนยัน แต่ต้องแสดง identity และผลกระทบครบ พร้อมปุ่ม danger ที่สื่อเฉพาะเจาะจง
- Modal ทุกตัวต้องปิด X/backdrop/Escape ไม่ได้ระหว่าง destructive request
- Error ต้องคง Modal และ context เดิมไว้ มี `ลองใหม่`, `กลับไปตรวจสอบ` และ `คัดลอกรายละเอียด`
- Result summary ต้องมาจาก Backend DTO ไม่คำนวณจาก UI cache
- ถ้ามี filesystem cleanup ที่ไม่สมบูรณ์ ต้องรายงานแยกจาก database result และไม่กล่าวว่า “สำเร็จทั้งหมด”

## สิ่งที่จะลงมือแก้

### Batch 5.1 — Rust destructive result contracts and isolation

- [x] Batch 5.1A: เพิ่ม typed result DTO สำหรับ Clear Answers พร้อม TypeScript mirror โดยยังไม่เปลี่ยน UI
- [x] Batch 5.1B: เพิ่ม typed result DTO สำหรับ Delete One Answer พร้อม TypeScript mirror/caller contract โดยยังไม่เปลี่ยน UI
- [x] Batch 5.1A: นับ affected answers, assessed rows, progress rows และ attachment paths จาก authoritative SQLite rows ก่อนเปลี่ยนข้อมูล โดยไม่ใช้ folder existence เป็น state
- [x] Batch 5.1A: คืน Clear Answers database deletion result และ filesystem cleanup result แยกกันอย่างชัดเจน
- [x] Batch 5.1B: คืน Delete One Answer database/progress/filesystem result แยกกันอย่างชัดเจน
- [x] ปรับ single-answer delete ordering/transaction boundary เป็น database commit → atomic progress recalculation → owned managed-file cleanup โดยไม่เพิ่ม schema
- [x] Batch 5.1A: เพิ่ม Rust tests สำหรับ document isolation, Simulation authority, canonical Questions/Answer Keys/References/Question Images preservation และ partial attachment cleanup result
- [x] Batch 5.1B: เพิ่ม Rust tests สำหรับ single-answer exact composite identity, user/document/subquestion isolation, shared/foreign files และ database-first failure safety
- [x] Batch 5.1A: อัปเดต TypeScript DTO mirror/caller contract ที่จำเป็น โดยยังไม่เปลี่ยน UI

**Manual UI Gate:** ไม่มีใน Batch 5.1A/5.1B เพราะหน้าจอยังไม่เปลี่ยน ใช้ Rust policy tests และ TypeScript contract checks เป็นหลัก

### Batch 5.2 — Clear Answers typed confirmation and result feedback

- [x] เพิ่ม optional typed-confirmation contract ให้ `WorkflowModal` พร้อม accessible instruction/error
- [x] ย้าย Clear Answers จาก `ConfirmModal` ไป `WorkflowModal`
- [x] แสดง Active Simulation ID, Document title, Source ID, scope ที่จะลบ และรายการที่ไม่ถูกลบ
- [x] เปิด danger action เมื่อพิมพ์ Simulation Document ID ตรงกันทุกตัวอักษรเท่านั้น
- [x] ป้องกัน submit ซ้ำและการปิด Modal ระหว่าง request
- [x] แสดง authoritative result counts และแยกสถานะ complete/partial attachment cleanup
- [x] เพิ่ม Retry/Copy Details สำหรับ failure โดยคง Modal context และค่าที่ยืนยันไว้

**Manual UI Gate:** ผ่านเมื่อ 2026-08-14 ด้วย disposable `22730203001-SIM-013`: exact-ID mismatch/match, Tab/Shift+Tab, Escape ก่อน request, loading/result behavior, Focus return, Source/Simulation isolation และ preservation scope ทำงานตามที่กำหนด ผลจริงลบคำตอบ 2 แถว, assessed rows 2 แถว, Progress ราย Section 3 แถว และ managed files 2 ไฟล์ ส่วน failure Retry/Copy Details และ partial cleanup พิสูจน์ด้วย automated tests เพราะไม่ควรสร้างความเสียหายใน App จริงเพื่อทดสอบ failure

### Batch 5.3 — Delete One Answer impact and recovery

- [x] Batch 5.3A: แสดง Question/Subquestion label, text/attachment presence, attachment count, assessment status และผลว่าระบบจะคำนวณ Progress ราย Section ใหม่
- [x] Batch 5.3A: ใช้ Backend result DTO หลังลบ แยก Database/Progress/Filesystem complete-partial outcome และประกาศผลด้วย live region
- [x] Batch 5.3A: คง answer context เมื่อ request ล้มเหลว พร้อม Retry/Copy Details
- [x] Batch 5.3A: คืน focus ไป `ตอบคำถาม` หลังสำเร็จ และปุ่ม `ล้างคำตอบ` หลังยกเลิกหรือกลับจาก failure context
- [x] Batch 5.3A: เพิ่ม automated tests สำหรับ Section 100 main answer, dirty-draft guard และ Section 200 composite identity/subquestion isolation
- [x] Batch 5.3B: ตรวจยืนยันว่า Section 300 prerequisite ใช้ answer row แบบ attachment-only และใช้ Backend exact-identity/database-first path เดียวกับ Section 100/200 โดยไม่เพิ่มกฎข้อมูลซ้ำ
- [x] Batch 5.3B: ใช้คำสั่งเฉพาะบริบท `แนบ/แก้ไข/ล้าง/ลบเอกสารหลักฐาน` และคืน Focus ไปคำสั่งเอกสารหลักฐานหลังปิดผลลบ โดยไม่เปลี่ยนข้อความของ Section 100/200
- [x] Batch 5.3B: เพิ่ม automated test สำหรับ `301.1.1` ที่มีไฟล์หลักฐาน ไม่มี answer text และมีผลประเมิน พร้อมตรวจ exact identity/result summary
- [x] Batch 5.3B Manual UI Gate: ทดสอบไฟล์จริงใน disposable Simulation โดยไม่รวม linked-progress regression ของ Section 300 เข้ามาใน batch นี้

**Manual UI Gate 5.3B:** ผ่านเมื่อ 2026-08-16 โดยผู้ใช้ยืนยันว่า save/reload, cancel/Escape, exact-item deletion, authoritative result summary, file cleanup, Focus return หลังปิดผลลบ และ visual Focus ของปุ่ม `แนบไฟล์` ทำงานถูกต้องใน disposable Simulation; linked-progress regression ของ Section 300 ยังคงแยกไว้นอก batch นี้

**Manual UI Gate 5.3A:** ผ่านเมื่อ 2026-08-15 โดยผู้ใช้ยืนยันว่า workflow ทำงานถูกต้องครบใน disposable `22730203001-SIM-013`: dirty-draft guard, impact confirmation, cancel/Escape และ Focus return, authoritative result summary, Section 100 main-answer deletion และ Section 200 subquestion isolation ส่วน failure/retry และ partial outcome พิสูจน์ด้วย automated tests

### Inserted Batch — Rich-text Copy/Paste normalization

- [x] ตรวจพบจากข้อมูลที่บันทึกจริงว่า Clipboard จาก Question Preview นำสีขาวและตัวหนาเข้า Answer Key แล้ว Tiptap แปลงเป็น inline HTML/Markdown ตามรูปแบบต้นทาง
- [x] กำหนดนโยบาย destination-style paste สำหรับ Tiptap กลาง: เก็บย่อหน้า รายการ ตาราง และ numbered hierarchy ที่รองรับ แต่ล้างสี ตัวหนา ตัวเอียง ฟอนต์ ขนาด พื้นหลัง และ attribute จากต้นทาง
- [x] ไม่ย้อนแก้ Answer Key หรือ rich text ที่บันทึกไว้เดิม ผู้ใช้แก้เฉพาะรายการที่ต้องการผ่าน Editor ตามปกติ
- [x] เพิ่ม automated tests สำหรับกรณี Copy Question ไป Answer Key, structural paste, unsafe clipboard content และ shared-editor wiring
- [x] Manual UI Gate: ผ่านเมื่อ 2026-08-16 ใน Section 202.4.1 ข.; Copy Question ไป Answer Key รับสี/น้ำหนักของปลายทาง, โครงสร้างหลายย่อหน้า/รายการยังอยู่, Toolbar ใส่รูปแบบโดยตั้งใจได้ และ Save/Reload รักษาผลถูกต้อง

### Batch 5.4 — Phase audit and checkpoint

- [x] ตรวจ callers ของ `ConfirmModal` โดยไม่ mass-migrate workflow ที่อยู่นอก Phase 5; Clear Answers และ Delete One Answer ใช้ `WorkflowModal` แล้ว ส่วน caller ที่เหลือเป็น validation หรือ workflow อื่น
- [x] ยืนยัน Clear Answers/Delete One Answer scope ใน `docs/system_specifications.md` ตรงกับ Simulation-only Rust guard, exact answer identity และ database-first cleanup contract
- [x] รัน Full Frontend/Rust automated checkpoint: TypeScript, ESLint, Frontend tests 284 tests, Build, Rust tests 119 tests, Rustfmt และ Clippy ผ่านทั้งหมด
- [x] Manual regression รอบสุดท้ายและบันทึก Phase 5 exit gate

**Batch 5.4 Audit Result:** `ConfirmModal` ไม่ได้อยู่ในเส้นทาง Clear Answers หรือ Delete One Answer แล้ว; caller ที่ยังเหลือเป็น validation alert, Section/Simulation deletion หรือ workflow อื่น จึงไม่ทำ mass migration ใน Phase 5 ส่วน Rust simulation guard, exact answer identity, DTO mirror และ `docs/system_specifications.md` ตรงกันโดยไม่ต้องแก้ schema หรือ business rule เพิ่ม

**Phase 5 Exit Gate:** ผ่านเมื่อ 2026-08-16 โดยผู้ใช้ยืนยันครบทั้ง Source Document protection, Simulation-only Clear Answers modal/typed confirmation/focus return และ Delete One Answer exact-target/isolation/reload behavior; Section 300 evidence deletion และ rich-text Copy/Paste มี Manual Gate แยกที่ผ่านแล้ว ทั้งหมดสอดคล้องกับ automated checkpoint 284 Frontend tests และ 119 Rust tests

## Guardrails

- ไม่แก้ข้อมูลจริงใน `content.db`
- ไม่ลบ Source/Sample Document `22724201001`, Simulation หรือเอกสารผู้ใช้
- Clear Answers ลบได้เฉพาะ answers, assessments ที่อยู่ใน answer rows, progress และ trainee attachments ของ active Simulation
- Questions, Answer Keys, References, Question Images/Creator attachments, Source Document และ Simulation อื่นต้องคงอยู่
- File cleanup ที่ล้มเหลวบางส่วนต้องไม่ถูกซ่อนด้วย success message แบบรวม และต้องไม่ย้อนกลับไปลบ Source/shared asset เพื่อทำให้ตัวเลขตรง
- ไม่มี Commit/Push จนกว่าจะได้รับอนุญาต
