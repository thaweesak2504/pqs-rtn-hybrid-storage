# Section 300 Qualification Workflow Baseline

**Status:** Living Draft — ปรับปรุงต่อเนื่องเมื่อ Product Owner และทีมเข้าใจ Domain ตรงกันมากขึ้น
**Created:** 2026-08-12
**Scope:** หลักการคุณสมบัติ ความสัมพันธ์กับ Section 100/200, Trainee/Qualifier/Admin workflow, progress/scoring และ navigation ของ Section 300

**Next entry prepared (2026-08-22):** หลังปิด Introduction Batch I2.2 ให้กลับมาเริ่ม Slice A ด้วย read-only audit ของ persistent ordering, Simulation `refSectionId` remapping และ linked-progress/recalculation contract จากหลักฐาน `22730203001-SIM-013` ก่อนแก้ Code; Version/Issued Copy decisions ที่กว้างกว่านี้เก็บใน `VERSIONING_AND_DISTRIBUTION_HANDOFF.md`

**Current gate (2026-11-24):** A1 ผ่าน Manual Gate; A2 ได้รับผล UI ตามหัวข้อ 14 และ Product Owner อนุญาต checkpoint Commit/Push; ถัดไป A3 เริ่ม read-only audit ตามหัวข้อ 15; ยังไม่ซ่อม Simulation เก่า

| Batch | งาน | สถานะ |
| --- | --- | --- |
| A1 — หัวข้อ 13 | Simulation reference isolation | ผ่าน Automated + Manual Gate (`SIM-019` / `SIM-020`) |
| A2 — หัวข้อ 14 | Persistent reference ordering | Automated passed + UI results received; checkpoint approved |
| A3 — หัวข้อ 15 | Shared/recursive progress, reversal, refresh และ integrity ที่ยังค้าง | เตรียม read-only audit; ยังไม่เริ่มแก้ Code |

เอกสารนี้เป็น Baseline สำหรับอภิปรายและวางแผน ไม่ใช่ข้ออนุญาตให้แก้ Schema, ข้อมูลจริง หรือ Sample/Source Document โดยอัตโนมัติ เมื่อข้อความในเอกสารนี้ต่างจาก Tested Rust/SQLite policy ให้ถือ Tested Rust/SQLite policy เป็นพฤติกรรมปัจจุบัน และบันทึกช่องว่างไว้ก่อนแก้ไข

## 1. ขอบเขตข้อมูลที่ใช้พัฒนา

- `22724201001` เป็น Sample/Source Document ฉบับสมบูรณ์ถาวร ใช้ศึกษาและพิสูจน์ Workflow โดยไม่แก้ไขระหว่างการทดลอง Section 300 รอบนี้
- `22730203001` เป็นเอกสารขนาดเล็กสำหรับสร้างตัวอย่างและทดสอบพฤติกรรม
- Application Template/Skeleton, Sample/Source Document และ Trainee Test Copy เป็นคนละ Artifact
- Simulation เป็น Developer capability สำหรับตรวจ Creator, Trainee และ Qualifier views ไม่ใช่ข้อมูลส่วนหนึ่งของ Template
- ห้ามแก้ `content.db`, ลบเอกสาร หรือเปลี่ยนข้อมูล Sample เพียงเพื่อให้ Test ผ่าน

## 2. สถานะของข้อความในเอกสาร

- **ยืนยันแล้ว:** Product Owner ระบุเป็นหลักการของระบบ
- **ตรวจพบจาก Code/Data:** พฤติกรรมปัจจุบันที่ตรวจจาก Implementation หรือฐานข้อมูลแบบ Read-only
- **ข้อเสนอ:** แนวทางออกแบบที่ยังต้องพิสูจน์และอนุมัติ
- **ค้างยืนยัน:** ประเด็นที่ยังมีข้อมูลไม่ครบหรืออาจเปลี่ยนผลการออกแบบ

## 3. Mental Model ของ Section 300

### 3.1 ยืนยันแล้ว — Section 300 เป็น Qualification Roadmap

- Trainee ต้องเริ่มดู Section 300 เพื่อทราบว่าตำแหน่งนั้นต้องมีคุณสมบัติอะไรและต้องทำงานใดบ้าง
- ลำดับการสร้างเอกสารของ Creator อาจเริ่มจาก Section 100/200 ก่อน เพราะ Section 300 นำ Section เหล่านั้นมาเป็น Requirement
- Section 300 ไม่ใช่ชุดคำถามแบบ Section 100/200 ทุกข้อ
- `30x.1` คือคุณสมบัติก่อนหรือระหว่างการทดสอบ
- `30x.2–30x.7` เป็นการทบทวนความรู้ ฝึกปฏิบัติ และการประเมินโดย Qualifier โดยไม่มี Trainee text-answer workflow แบบ Section 100/200
- เมื่อ Requirement ผ่าน ระบบสะสมคะแนนของตำแหน่งจนผ่านครบตามที่กำหนด

### 3.2 ยืนยันแล้ว — Position และ Requirement เป็นกราฟ ไม่ใช่ลิสต์เส้นตรง

- Position 301, 302 และ 303 เป็นอิสระ ไม่บังคับทำเรียงเลข
- Position ระดับเดียวกันอาจเริ่ม A ก่อน B, B ก่อน A หรือทำพร้อมกันได้
- Requirement ที่ Trainee ทำผ่านแล้วต้องใช้ซ้ำกับทุก Position ที่อ้างถึง โดยไม่ทำซ้ำ
- Position ขั้นสูงสามารถอ้าง Position ก่อนหน้า เช่น 304 อ้าง 301, 302 และ 303
- Section 101 Precautions เป็นข้อบังคับร่วมเสมอ
- `30x.1.1–30x.1.5` ที่ระบุ `(ไม่ต้องปฏิบัติ)` ต้องไม่สร้างกิจกรรมให้ Trainee หรือ Qualifier

กราฟมีความหมายดังนี้:

```text
Trainee result ของ Section 101/201/...  ──> Requirement ที่หลาย Position ใช้ร่วมกัน

301 ─┐
302 ─┼──> 304
303 ─┘
```

Position ไม่ได้ส่งคะแนนให้กันโดยตรง เว้นแต่ Position หนึ่งถูกกำหนดเป็น Requirement ของอีก Position หนึ่ง ทั้งหมดอ่านผลสำเร็จของ Trainee จาก Requirement ต้นทางเดียวกัน

## 4. ตัวอย่างที่ยืนยันจาก `22724201001`

| Position | Section 100 Requirements | Section 200/300 Requirements |
| --- | --- | --- |
| 301 | 101, 102, 103, 104 | 201 |
| 302 | 101, 102, 103, 104 | 201, 202, 204, 205, 206 |
| 303 | 101, 102, 103, 104 | 201, 203 |
| 304 | 304.1.4 และ 304.1.5 ไม่ต้องปฏิบัติ | 301, 302, 303 ผ่าน 304.1.3 |

### 4.1 Shared Requirement: Section 201

**ยืนยันแล้ว:** Section 201 ถูกเพิ่มใหม่ให้ 302 และ 303 หลังจากมี Requirement อื่นอยู่แล้ว เพื่อทดลองการใช้ผลร่วมกัน

Expected behavior เมื่อ Trainee ผ่าน Section 201 หนึ่งครั้ง:

- 301.1.5 ได้คะแนน Requirement 5 คะแนน
- 302.1.5 ได้ 5 จาก 25 คะแนนของกลุ่ม
- 303.1.5 ได้ 5 จาก 10 คะแนนของกลุ่ม
- ทั้งสาม Position แสดงความก้าวหน้าของ Section 201 ชุดเดียวกัน
- หากผลผ่าน Section 201 ถูกยกเลิก ทั้งสาม Position ต้องคำนวณผลลดลงตามกัน
- ความก้าวหน้าบางส่วนอาจแสดงให้เห็นในทุก Position แต่คะแนน Requirement ควรได้เมื่อ Section 201 ผ่านครบเท่านั้น

## 5. กฎลำดับการแสดง Requirement

### 5.1 ยืนยันแล้ว — Expected Rule

Section references ภายใต้ Parent เดียวกันต้องแสดงเรียงจาก `section_number` น้อยไปมาก ไม่ใช่เรียงตามเวลาที่เพิ่ม เช่น:

```text
201, 202, 204, 205, 206
```

ถ้าเพิ่ม 201 หลัง 202/204/205/206 รายการ 201 ต้องกลับไปอยู่ตำแหน่งแรกเมื่อ Save, ปิดฟอร์ม, Reload หรือเปิดเอกสารใหม่

### 5.2 ตรวจพบจาก Code — Baseline Defect ก่อน A2

- `add_section_ref_child` บันทึก Section reference ใหม่ด้วย `sequence = MAX(sequence) + 1`
- `batch_add_section_ref_children` เพิ่มต่อท้ายตาม input order
- `get_section_ref_children_inner` และ Question tree อ่านกลับด้วย `ORDER BY sequence`
- Frontend Sort state ชั่วคราวตาม `ref_section_number` หลังเพิ่มทีละรายการ แต่ไม่ได้ปรับ `sequence` ที่บันทึกใน SQLite
- ผลคือรายการดูเรียงถูกได้ชั่วคราวในฟอร์ม แต่กลับไปอยู่ท้ายสุดหลัง Refresh/Reload ตามที่พบกับ Section 201

### 5.3 ข้อเสนอการแก้

- Rust/SQLite ต้องเป็น Authority ของลำดับ ไม่พึ่ง Frontend sort อย่างเดียว
- หลัง Add, Batch Add หรือ Remove ให้ normalize `sequence` ของ `section_ref` siblings ตาม `Sections.section_number` ของ target จริง (ไม่เชื่อ metadata cache หรือเลขจาก UI)
- การแก้ต้องไม่เปลี่ยนคะแนน เนื้อหา Parent/Child หรือการเชื่อม Section ID
- Existing data ควรแก้ได้ด้วยการ resequence แบบไม่ลบและสร้าง Requirement ใหม่

Regression cases ที่ต้องมี:

1. เพิ่ม 202, 204, 205, 206 แล้วเพิ่ม 201; อ่านกลับต้องเป็น 201, 202, 204, 205, 206
2. ปิดฟอร์มและเปิดใหม่ยังคงลำดับเดิม
3. Batch input ที่ไม่เรียงต้องถูก normalize
4. ลบแล้วเพิ่ม Section เดิมใหม่ต้องกลับเข้าตำแหน่งตามเลข
5. คะแนนของแต่ละ Requirement และ Parent group total ต้องไม่เปลี่ยนจากการเรียงลำดับ
6. Section 300 references เช่น 301, 302, 303 ต้องใช้กฎเดียวกัน

## 6. Progress และ Scoring Contract ที่ Section 300 พึ่งพา

ก่อนทำ Section 300 UX เต็มรูปแบบ ต้องพิสูจน์ Contract ต่อไปนี้ด้วย Rust tests:

- นิยาม `is_passed` ของ Section 100/200/300
- Shared Section reference ใช้ผลของ Trainee/Document เดียวกัน
- Section reference ให้คะแนนแบบ binary เมื่อ Requirement ผ่านครบ
- การเปลี่ยน `passed` กลับเป็น `pending` หรือ `needs_improvement` กระจายผลไปทุก Position ที่พึ่งพา
- Exempted items ไม่รวมกิจกรรมและคะแนน
- Recursive Position reference เช่น 304 -> 301/302/303 คำนวณถูกต้อง
- Circular references ถูกป้องกันก่อนบันทึก ไม่ใช่เพียงหยุด recursion ตอนอ่าน
- ทุกผลแยกระหว่าง Source Document, Simulation และ Trainee Test Copy
- การบันทึกผลประเมินและการคำนวณ `UserProgress` ต้องไม่ทิ้งสถานะถาวรที่ขัดกัน

## 7. Workflow Types ภายใน Section 300

### 7.1 Evidence Qualification — `30x.1.1–30x.1.2`

- Trainee ส่งเอกสารหรือไฟล์หลักฐาน
- Qualifier ตรวจและเลือกผ่าน/ปรับปรุง
- ใช้หลัก Save, Cancel, Discard, attachment ownership, Focus return และ assessment announcement ที่ผ่านการพิสูจน์จาก Trainee/Qualifier workflow
- ต้องทดสอบ Section 300 โดยเฉพาะ แม้จะ reuse component จาก Section 100/200

### 7.2 Linked Requirement — `30x.1.3–30x.1.5`

- แสดง Requirement และ Progress จาก Section ต้นทาง
- Trainee ไม่กรอกคำตอบซ้ำในรายการเชื่อม
- Qualifier ไม่ประเมิน Requirement ซ้ำจากการ์ด Section 300
- เมื่อ Section ต้นทางเปลี่ยน ผลต้อง Refresh และคำนวณใหม่ทุก Position ที่พึ่งพา
- ควรมีทางนำทางไปยัง Section ต้นทางโดยไม่ทำให้ Section 300 Roadmap หายจากบริบท

### 7.3 Performance/Knowledge Qualification — `30x.2–30x.7`

- ไม่มี Trainee text-answer workflow แบบ Section 100/200
- Qualifier บันทึกรายงานและประเมินผ่าน/ต้องปรับปรุงตามกฎที่จะยืนยัน
- `OralAssessmentBox` ปัจจุบันเป็น implementation แยกจาก Qualifier workflow ที่ผ่าน Phase 4 จึงยังไม่ถือว่าผ่าน Focus, Keyboard, Modal, Button และ Accessibility Full Pass

## 8. Eligibility, Authorization และ Navigation ต้องแยกกัน

### 8.1 Eligibility — ผลคุณสมบัติที่ระบบคำนวณ

- คำนวณจาก Section references, evidence assessments, performance assessments และ exempted policy
- Position 301–303 อาจ Eligible หรือ In Progress พร้อมกัน
- Admin ไม่ควรแก้คะแนนเพื่อบังคับลำดับ

### 8.2 Authorization — สิทธิที่ Admin อนุมัติให้เริ่ม

**ยืนยันเป็น Future Requirement:** Admin ต้องควบคุมและอนุมัติว่า Trainee เริ่ม Position ใดก่อนหลัง หรืออนุมัติหลาย Position พร้อมกัน

- Authorization เป็นข้อมูลคนละชนิดกับ Eligibility
- การอนุมัติ 302 ก่อน 301 ต้องไม่แก้ dependency graph
- Shared Requirement ที่ผ่านแล้วต้องยังใช้ได้ ไม่ว่าลำดับอนุมัติจะเป็นอย่างไร

### 8.3 Trainee Request

**ยืนยันเป็น Future Requirement:** Trainee Dashboard ต้องสามารถร้องขอเริ่ม Position ได้

Suggested lifecycle ที่ยังค้างอนุมัติ:

```text
available -> requested -> approved -> in_progress -> completed
                    \-> rejected/deferred
```

### 8.4 Navigation/Menu

- Section 300 Roadmap ต้องเข้าถึงได้ก่อน เพื่อให้ Trainee เห็นภาพรวม
- การเปิด/ล็อกเมนูงาน 100/200/300 ต้องอาศัยทั้ง Eligibility และ Authorization
- Creator ควรยังเห็นโครงสร้างทั้งหมดเพื่อสร้างและตรวจเอกสาร
- กฎของ Trainee และ Qualifier menu visibility ยังต้องระบุให้ครบก่อนออกแบบ Schema/UI

## 9. ตรวจพบจาก Code — ช่องว่างปัจจุบัน

1. Simulation Clone เคยคัดลอก `Questions.metadata.refSectionId` เดิม — Slice A1 แก้สำหรับรอบใหม่และผ่าน Manual Gate ตามหัวข้อ 13 แล้ว; Existing Simulation ยังต้องตรวจแยก ไม่ได้ซ่อมอัตโนมัติ
2. ยังไม่มี Rust regression test สำหรับ Shared Requirement หนึ่งตัวที่ fan-out ไปหลาย Position เช่น Section 201 -> 301/302/303
3. Linked progress fetch ใน `QuestionDisplayCard` ยังไม่ผูกกับ refresh trigger ที่เกิดหลัง assessment change จึงอาจแสดงค่าค้างจนเปลี่ยนหน้า/Reload
4. `save_qualifier_assessment` คำนวณ progress ใหม่ทุก Section หลัง Save แต่หาก recalculation ล้มเหลวจะ Log warning และยังคืนผลว่า Save สำเร็จ
5. Section menu ปัจจุบันยังไม่มี Admin authorization/request/unlock model
6. การป้องกัน reference cycle ตอนเขียนครอบคลุม self/direct back-reference แต่ยังต้องพิสูจน์วงจรยาว
7. `OralAssessmentBox` ยังใช้ lifecycle และ command controls คนละชุดจาก Qualifier UX ที่ผ่าน Phase 4
8. Persisted `section_ref.sequence` เคยสะท้อนลำดับที่เพิ่ม — A2 แก้ใน write paths ของ parent ที่เพิ่ม/ลบรายการแล้ว รอ Manual Gate; ยังไม่มี bulk resequence ข้อมูลเก่า

## 10. ลำดับงานที่เสนอ

### ก่อนเริ่มแก้ Section 300

1. เก็บ Domain information จาก Product Owner ให้ครบใน Baseline นี้
2. จบ Phase 4 Batch 4.4 และ Manual Gate
3. รัน Phase 4 checkpoint verification และ Commit เมื่อได้รับอนุญาต

### Section 300 Slice A — Integrity Foundation

- แก้ Simulation `refSectionId` remapping
- แก้ persistent Section reference ordering
- เพิ่ม Rust tests สำหรับ shared, recursive, downgrade, isolation และ cycle behavior
- ทำ progress save/recalculation contract ให้ชัดเจน

### Section 300 Slice B — Existing Workflow Reuse

- Evidence upload/assessment Full Pass สำหรับ `30x.1.1–30x.1.2`
- Linked Requirement refresh/navigation สำหรับ `30x.1.3–30x.1.5`
- Performance assessment Full Pass สำหรับ `30x.2–30x.7`

### Section 300 Slice C — Roadmap UX

- Position summary และ Requirement status
- Shared-progress explanation
- Available/blocked/in-progress/completed semantics ที่ไม่สื่อด้วยสีอย่างเดียว
- Keyboard, focus และ screen-reader announcements

### Deferred Product Slice — Admin/Dashboard

- Trainee request
- Admin approve/reject/defer และอนุมัติหลาย Position พร้อมกัน
- Real-user ownership และ role mapping
- Menu gating จาก Eligibility + Authorization

## 11. ค้างยืนยัน

- กฎ Menu 1 เปิด Menu 2 และกรณีที่ต้องเรียงลำดับจริง
- Position ใดเป็น Level เดียวกันนอกเหนือจาก 301/302/303 ในแต่ละเอกสาร
- Admin สามารถ Override prerequisite ได้หรือไม่ และต้อง Audit อย่างไร
- `needs_improvement` สำหรับ `30x.2–30x.7` ต้องมี Feedback บังคับและมี reversal workflow แบบใด
- Qualification score เป็นเพียงการแสดงผลหรือมี threshold/weight อื่นนอกเหนือจากผ่านครบ 100%
- เมื่อ Requirement ต้นทางถูกแก้ไขหลัง Trainee ผ่านแล้ว ต้อง Freeze ตาม issued revision หรือ Re-evaluate ตาม Source revision

## 12. Manual Visual Baseline — Trainee `22724201001-SIM-006`

**หลักฐาน:** ภาพ Trainee view ของ Position 301, 302, 303 และ 304 เมื่อวันที่ 2026-08-12 โดยทุก Position ยังแสดงคะแนนสะสมและ Progress 0%

### 12.1 สิ่งที่ภาพยืนยัน

- Trainee มองเห็น Section 300 เป็น Roadmap ของแต่ละ Position พร้อมระยะเวลา คะแนนรวม คะแนนสะสม และความก้าวหน้า
- 301–303 แสดง Shared Requirements 101–104 ซ้ำในแต่ละ Position และใช้สีของกลุ่ม Section 100
- 301, 302 และ 303 แสดง Section 200 Requirements ด้วยสีของกลุ่ม Section 200
- 304.1.3 แสดง Position Requirements 301, 302 และ 303 ด้วยสีของกลุ่ม Section 300
- แต่ละ Requirement แสดงคะแนนที่จะได้รับเมื่อ Requirement ผ่าน
- `(ไม่ต้องปฏิบัติ)` แสดงเป็นสถานะของรายการ โดยไม่มี Answer/Assessment command ในภาพ
- Section 201 ที่เพิ่มภายหลังอยู่ท้ายรายการของ 302.1.5 และ 303.1.5 ยืนยัน persistent ordering defect ในหัวข้อ 5
- 304 แสดง 301, 302 และ 303 เรียงถูก เพราะถูกเพิ่มมาตามลำดับเดิม

### 12.2 สิ่งที่ภาพยังพิสูจน์ไม่ได้

- ทุก Requirement ยังเป็น 0% จึงยังไม่พิสูจน์ว่า Shared Result ของ 101/201 กระจายไปหลาย Position ถูกต้อง
- ยังไม่พิสูจน์ downgrade/reversal propagation
- ยังไม่พิสูจน์ว่า `refSectionId` ภายใน Simulation ถูก remap ถูกต้อง; Code inspection ยังคงระบุช่องว่างตามหัวข้อ 9
- ภาพไม่รวม Sidebar จึงยังประเมิน navigation locking/unlocking ไม่ได้

### 12.3 UX/Terminology Findings ที่ต้องตัดสินใจก่อน Implementation

1. **สถานะ 0%:** ทุก Position และทุก Requirement แสดง `กำลังดำเนินการ` แม้ยังไม่มีความก้าวหน้า ควรแยกอย่างน้อย `ยังไม่เริ่ม`, `กำลังดำเนินการ` และ `แล้วเสร็จ`
2. **Authorization state:** เมื่อเพิ่ม Admin approval แล้ว `ยังไม่เริ่ม` ต้องไม่ปะปนกับ `ยังไม่ได้รับอนุมัติ`, `ร้องขอแล้ว` หรือ `ถูกล็อกโดยคุณสมบัติ`
3. **Trainee edit affordance:** Info banner ยังแสดง `คลิกเพื่อแก้ไข` ใน Trainee view ซึ่งสื่อว่าข้อมูลระยะเวลา/คะแนนแก้ไขได้ ควรซ่อนหรือแทนด้วยข้อมูลสถานะที่เหมาะกับ Trainee
4. **Section heading:** `รายการคำถาม / Question Items` ไม่ครอบคลุมความหมายของ Qualification Roadmap เพราะหลายรายการเป็น Requirement หรือการปฏิบัติ ไม่ใช่คำถาม ต้องเลือกคำที่ใช้เฉพาะ Section 300
5. **Simulation identity:** Badge `DRAFT • <source-id>-SIM-xxx` อาจทำให้ Trainee Test Copy/Simulation ถูกเข้าใจเป็น Source Draft ต้องปรับ terminology ภายหลังโดยไม่เปลี่ยน Developer simulation capability

Suggested state vocabulary สำหรับนำไปอภิปราย ไม่ใช่กฎที่อนุมัติแล้ว:

```text
ถูกล็อก / ร้องขอแล้ว / รออนุมัติ / พร้อมเริ่ม / กำลังดำเนินการ / แล้วเสร็จ
```

สถานะเหล่านี้ต้องมาจาก Eligibility + Authorization + Progress ไม่ควรอนุมานจากเปอร์เซ็นต์เพียงค่าเดียว

### 12.4 Manual Regression Evidence — Linked Section 201 Progress

**หลักฐาน:** การทดสอบ `22730203001-SIM-013` เมื่อวันที่ 2026-08-14 หลังประเมิน Section 201 จำนวน 2 คำตอบเป็น `ผ่าน` 1 และ `ปรับปรุง` 1

- Section 201 ต้นทางแสดง Progress `8%`
- Requirement ที่อ้าง Section 201 ภายใน Section 300 ยังแสดง Progress `0%`
- ตัวเลข `UserProgress` ที่ Clear Answers รายงานเป็นจำนวนแถวความก้าวหน้าราย Section ที่ลบ ไม่ใช่หลักฐานว่า Linked Requirement ใน Section 300 ได้รับค่าแล้ว
- Product Owner ระบุว่าการส่ง Progress จาก Section ต้นทางไปแสดงใน Section 300 เคยทำงานได้ จึงต้องถืออาการปัจจุบันเป็น regression candidate จนกว่าจะพิสูจน์สาเหตุ
- ยังไม่แก้ใน Phase 5 ณ จุดนี้; เมื่อกลับมาทำ Section 300 ต้องทดสอบทั้งหลัง Save ทันทีและหลัง Reload เพื่อแยกระหว่าง stale refresh กับความสัมพันธ์ `refSectionId` ที่ไม่ถูก remap ใน Simulation
- Regression test ที่ต้องเพิ่ม: Section 201 มี partial progress, linked Requirement ใน Section 300 อ่านเปอร์เซ็นต์เดียวกันภายใน Simulation เดียวกัน และเปลี่ยนตามทั้ง upgrade/downgrade โดยไม่กระทบ Source หรือ Simulation อื่น

## 13. Slice A1 — Simulation Section Reference Isolation (2026-11-09)

**Status:** Automated + Manual Gate passed. No commit/push authorized for this batch.

### ตรวจพบจาก Code

- Clone เดิม map Section เจ้าของ Question และ relational links แต่คัดลอก JSON `refSectionId` เดิม
- UI อ่าน linked progress ด้วย `documentId` ของ Simulation คู่กับ Section ID จาก metadata จึงอาจอ่านคนละขอบเขต; เป็นสาเหตุที่เป็นไปได้ของ 8%/0% แต่ยังไม่ได้ตรวจ live DB ของ SIM-013
- เปอร์เซ็นต์บน banner และ linked card ต่างใช้ผลผ่าน/คะแนนที่ได้ ไม่ใช่แค่จำนวนที่ตอบ

### สิ่งที่ลงมือแก้ใน A1

- แยก connection-based clone helper ให้ทดสอบ transaction จริงด้วย SQLite ในหน่วยความจำ โดย public command ใช้ connection pool เดิม
- Remap `section_ref.refSectionId` ผ่าน map ของ Source Sections ไปยังสำเนาใหม่ ครอบคลุม 100/200/300, shared requirements และ position dependencies; รักษา metadata อื่น, numbering, parent hierarchy, sequence และคะแนน
- ปฏิเสธ metadata ผิด/ไม่มี target/ชี้นอก Source และ relational link ที่ map ไม่ได้ แทนการข้ามเงียบ ๆ; rollback สำเนาและ counter ทั้งชุด
- ไม่มี Schema migration, ไม่มีการแก้ `content.db` หรือไฟล์แนบจริง, ไม่มี auto-repair รอบเก่า
- เพิ่ม integration tests สำหรับสองสำเนา, การอ่าน progress แยกจาก Source, การคงข้อมูลเดิมทุกแถว (ยกเว้น counter), invalid metadata 13 แบบ และ cross-document relational link

### ข้อเสนอ UX / ขอบเขตที่ยังไม่ทำ

- A1 ไม่เปลี่ยน UI, persistent ordering, refresh trigger หรือ scoring contract
- A2 ทำ ordering; linked refresh/shared scoring/reversal จะพิสูจน์ในชุดต่อไป
- Existing Simulation repair ต้องวิเคราะห์และได้รับอนุมัติแยก ไม่ลบหรือสร้างทับคำตอบเดิม

### Manual Gate — ใช้เอกสารทดลอง `22730203001`

1. ปิด/เปิด Desktop App ที่รัน Rust รุ่นแก้แล้ว (Frontend reload อย่างเดียวไม่พอ) จดรหัสและข้อมูลสำคัญของรอบเก่าก่อนเริ่ม; ไม่ต้องล้างหรือลบรอบใด
2. จาก Source สร้าง Simulation ใหม่ A แล้วจดรหัสจริง เปิดตรวจ Questions/Answer Keys และ Section 300 references ของ 101/201: ต้องมีโครงสร้าง/เนื้อหาเดิม แต่ไม่มีคำตอบ/ผลประเมินที่คัดลอกจากรอบอื่น
3. ใน A เลือก Section 201 ที่ Section 300 อ้างถึง ตอบหนึ่งข้อและให้ Qualifier ประเมินผ่าน จดเปอร์เซ็นต์ banner ของ 201 แล้วไปเปิด Section 300: linked 201 ต้องแสดงเปอร์เซ็นต์เดียวกัน หากยังค้างให้เปลี่ยนหน้าแล้วกลับมา หรือปิด/เปิดรอบ A และรายงานทั้งก่อน/หลัง; คะแนน Requirement ยังไม่ได้เต็มจน Section ต้นทางผ่านครบ
4. กลับ Source แล้วสร้างรอบใหม่ B: Questions/Answer Keys/references ต้องอยู่ครบ แต่คำตอบ/ผลประเมิน/Progress ของ A ต้องไม่มาใน B; linked 201 ใน B ต้องเป็น 0% เมื่อยังไม่ได้ทำ
5. เปิด A อีกครั้ง: คำตอบ/ผลผ่าน/เปอร์เซ็นต์ต้องยังอยู่ แล้วตรวจ Source และรอบเก่าที่จดไว้: เนื้อหาและงานเดิมต้องไม่เปลี่ยน ไม่ใช้รอบเก่าเป็นเกณฑ์ว่า remap ใหม่ทำงานหรือไม่

ไม่ต้องเปิด DevTools หรือแก้ฐานข้อมูลเพื่อทดสอบ หาก Source ยังไม่มี linked 201 ให้แจ้งก่อนเปลี่ยน fixture และไม่แก้ permanent sample `22724201001` สำหรับ gate นี้

### Verification

- Automated (2026-11-09): `npx tsc --noEmit`, `npx eslint src --max-warnings=0`, `npm run test:run` (320 tests / 42 files), `npm run build`, `cargo test --all-targets --all-features` (133 tests รวม A1 ใหม่ 4 tests), `cargo fmt --all -- --check` และ `cargo clippy --all-targets --all-features -- -D warnings` ผ่านทั้งหมด
- Non-failing output: Frontend tests มี intentional error cases, jsdom scrollBy/React warnings; Vite build มี mixed static/dynamic import และ large-chunk warnings. ไม่ปรับ toolchain ใน A1
- `git diff --check` ผ่าน; มี Git line-ending notice สำหรับ `docs/system_specifications.md` เท่านั้น
- Manual UI passed (reported by Product Owner, recorded 2026-11-24): A = `22730203001-SIM-019`, Section 201 ผ่าน 1 ข้อ = 8%, linked 201 ใน 301 = 8%, Requirement ยังไม่ได้คะแนนเต็ม, Source ไม่เปลี่ยน; B = `22730203001-SIM-020` ไม่มีคำตอบ/ผลผ่านจาก A และ linked 201 = 0%; กลับมา A แล้วยังคง 8% ทั้งสองตำแหน่ง

## 14. Slice A2 — Persistent Section Reference Ordering (2026-11-24)

**Status:** Implemented; all automated checks passed; Product Owner reported UI results and authorized checkpoint Commit/Push (2026-11-24).

### ตรวจพบจาก Code

- Single/Batch Add ใช้ MAX(sequence)+1; document tree และ picker อ่าน sequence ที่บันทึก
- Frontend เคยเรียง ref_section_number เฉพาะ state หลังเพิ่มหนึ่งรายการ แต่ไม่ได้โหลด sequence ใหม่ของ siblings
- Add/Batch/Remove เดิมไม่มี transaction ครอบคลุมทั้งข้อมูลลูกและ recalculation
- Duplicate/direct back-reference checks เดิมใช้ LIKE กับ ID จึงอาจสับสน 12 กับ 123

### สิ่งที่ลงมือแก้

- Rust normalize เฉพาะ `section_ref` ใต้ parent ที่ถูกเพิ่ม/ลบ เรียงตามหมายเลข target จริงจาก Sections ภายในเอกสารเดียวกัน; ไม่เปลี่ยน ID, metadata, เนื้อหา หรือคะแนนของรายการที่คงอยู่
- กลุ่มที่มีเฉพาะ references ใช้ sequence 1..N; หากมี non-reference sibling ให้สงวน sequence ของรายการนั้นไว้ ไม่แก้รายการชนิดอื่น
- Add, Batch Add, Remove และ Remove All รวม mutation/ordering/score recalculation ใน transaction; เมื่อผิดพลาด rollback ทั้งชุด
- Validate ownership ของ parent/target ก่อนเขียน และใช้ exact JSON target ID สำหรับ duplicate/direct back-reference checks; การป้องกัน cycle ยาวยังไม่อยู่ใน A2
- Metadata ของรายการใหม่ใช้หมายเลข Section จาก DB; metadata เดิมไม่ถูก rewrite เพียงเพื่อจัดลำดับ
- UI โหลดรายการที่ Rust จัดลำดับแล้วกลับมาหลังเพิ่ม/ลบหนึ่งรายการ ส่วน Batch ใช้รายการตอบกลับจาก Rust
- ไม่เพิ่ม migration, ไม่ normalize ทั้งฐานตอน startup/read, ไม่เรียกแก้ฐานข้อมูลจริงด้วย script

### ข้อเสนอ UX / ขอบเขตที่ยังไม่ทำ

- ไม่มี redesign หน้าฟอร์ม และไม่เปลี่ยน scoring/progress semantics
- รายการเก่าที่ไม่ได้เพิ่ม/ลบใน parent นั้นอาจยังเป็นลำดับเดิม; bulk repair ต้องแยกพิจารณา
- Selector เดิมบันทึกการติ๊ก/เอาติ๊กออกทันที ไม่ใช่ Draft ที่ปุ่ม Cancel ย้อนกลับให้; A2 ไม่เปลี่ยน contract นี้ ต้องตรวจแยกเมื่อทำ Section 300 Creator lifecycle
- เอาติ๊กออกคือการลบ Requirement จริง เพิ่มกลับจะเป็น ID ใหม่และคะแนนเริ่ม 0 ตามเดิม; การจัดลำดับอย่างเดียวไม่ลบ/สร้างรายการเดิมใหม่

### Manual Gate — Creator ใน Source ทดลอง `22730203001` เท่านั้น

ก่อนทดสอบ: เริ่ม Dev App ใหม่ให้ Rust compile รุ่น A2, ไม่ใช้ permanent sample `22724201001`, ไม่ลบ Simulation A/B และไม่ Clear Answers จด/ถ่ายภาพรายการและคะแนนเดิมก่อนเปลี่ยน selector

1. เปิด Edit ของ `301.1.5 ผ่านการทดสอบระบบ` ให้มี 202 อยู่ก่อน แล้วติ๊กเพิ่ม 201 ทีหลัง ถ้า 201 อยู่แล้ว ให้จดคะแนนและเอาติ๊กเฉพาะ 201 ออกก่อน (ไม่ลบ Section 201 จาก sidebar)
   - Expected: รายการที่เลือกเรียง 201,202; คะแนน 202 ไม่เปลี่ยน; 201 ที่เพิ่งเพิ่มเริ่ม 0 ให้คืนคะแนนเดิม/ค่าทดสอบที่ต้องการ แล้วออกจากช่องคะแนนเพื่อให้บันทึก
2. บันทึก/ปิดฟอร์ม แล้วเปิดใหม่ รวมทั้งเปลี่ยนหน้าและเปิดเอกสารใหม่
   - Expected: 201 ยังอยู่ก่อน 202 ทั้งในฟอร์มและหน้าดูผล; คะแนนรายข้อและผลรวมเท่ากับหลังขั้นตอน 1
3. เอาติ๊กเฉพาะ 202 ออก แล้วเพิ่มกลับ และคืนคะแนนของ 202
   - Expected: 201 ยังอยู่เดิมพร้อมคะแนนเดิม; 202 กลับตำแหน่งหลัง 201; ผลรวมลด/เพิ่มตามรายการที่มีจริง ไม่ใช่เพราะการ sort
4. ทดสอบ `เลือกทั้งหมด` โดยเหลือ 202 ถูกเลือกอยู่และ 201 ยังไม่เลือก แล้วกดเลือกทั้งหมด (จดและคืนคะแนนของรายการที่เอาออก)
   - Expected: ไม่มีรายการซ้ำ, 201 มาอยู่ก่อน 202, คะแนนของ 202 ที่ไม่ได้ลบคงเดิม; ปิด/เปิดแล้วลำดับยังถูก
5. หากในเล่มทดลองมี 101/102 ให้ทดสอบเพิ่ม 102 ก่อน 101 ใน `301.1.4`; ถ้ามีตำแหน่งที่อ้าง 301/302 อยู่แล้ว สามารถทดสอบเพิ่ม 302 ก่อน 301 ได้โดยไม่สร้างวงจร
   - Expected: ใช้กฎเลขน้อยก่อนเลขมากเหมือนกัน; ไม่ต้องสร้างตำแหน่งใหม่เพียงเพื่อ gate นี้ (Rust tests ครอบคลุมทั้งสามกลุ่ม)
6. เปิดรอบ A `SIM-019` และ B `SIM-020` ที่ผ่าน A1
   - Expected: A ยังมีคำตอบ/ผลผ่านและ 8% ที่ 201 กับ linked 201 ใน 301; B ยัง 0%; การแก้ Source ไม่เปลี่ยนโครงสร้าง/Requirement ของสำเนาที่ออกไปแล้ว

ไม่ต้องเปิด DevTools หากพบลำดับหรือคะแนนไม่ตรง ให้แจ้ง parent ที่แก้ รายการก่อน/หลัง และผลหลังเปิดใหม่ โดยหยุดทดสอบชุดถัดไป

### Verification

- Rust full suite: 141 passed (A2 ใหม่ 8 tests) รวม persistence หลังเปิด SQLite fixture ใหม่, ทุกกลุ่ม 100/200/300, exact duplicate, ownership, legacy ordering, metadata preservation, non-reference sibling และ rollback
- Frontend focused selector suite: 4 passed
- Frontend full suite: 324 passed (43 files); TypeScript, ESLint, Build, Rust fmt check และ Clippy ผ่านทั้งหมด
- Non-blocking output: frontend tests มี React act/scrollBy warnings และ expected mocked failure logs; Build มี dynamic/static import และ chunk-size warnings
- Git diff whitespace check: passed
- Manual UI (reported 2026-11-24): ทดสอบที่ `302.1.5` แทน `301.1.5` เพราะมี 202 อยู่แล้ว; เพิ่ม 201 ทีหลังได้ 201 → 202 และคะแนนใหม่ 0 ถูกต้อง; ผู้ใช้ยืนยันขั้นตอน 3–5 ถูกต้อง
- ขั้นตอน 2 (เปิดใหม่) และ 6 (รอบ A/B หลังแก้ Source) ไม่ได้รายงานผลแยกในรอบ A2 จึงไม่อ้างว่าผ่านจาก UI; persistence/isolated copies มี automated coverage และ A1 มี manual isolation evidence แล้ว ให้รวม regression นี้ใน gate ถัดไป
- IDE Problems เดิมหายหลัง Restart Rust Analyzer; rerun `cargo check --all-targets --all-features` และ Clippy ผ่าน ไม่มีการแก้ Code เพิ่ม
- ยืนยันหลักการ: แก้รายการ Source ไม่ live-update โครงสร้างของ SIM ที่ออกแล้ว; สำเนาใหม่รับโครงสร้าง Source ณ เวลาสร้าง ต่างจาก Introduction ส่วนกลางที่อัปเดตตามโปรแกรม

## 15. Slice A3 — Shared Progress / Reversal / Refresh Audit (Prepared 2026-11-24)

**Status:** Prepared only. เริ่มตรวจ Code แบบ read-only ก่อนเสนอชุดแก้และ Manual Gate; ไม่ถือ checkpoint A1–A2 ว่าปิด Section 300 ทั้งหมด

1. Trace Rust calculation และ UI refresh เมื่อ 201 เดียวกันถูกอ้างโดยหลายตำแหน่งใน SIM เดียว: partial progress ต้องตรงกัน แต่ไม่ถือว่าผ่าน Requirement เต็มก่อนครบเกณฑ์
2. ตรวจ transition ผ่านครบ → ยกเลิกผ่าน/ปรับปรุง/ลบคำตอบ และผลคะแนน/สถานะของทุกตำแหน่งที่อ้าง รวม dependency ต่อเนื่องเช่น 304 อ้าง 301–303
3. แยก persisted calculation กับ stale UI: เปรียบเทียบหลัง mutation, เปลี่ยนหน้า และเปิด App ใหม่; ตรวจ isolation ระหว่าง Source, SIM-A และ SIM-B
4. ตรวจ integrity gaps (exact reference reads, missing target, long cycles) และแยก defect ที่ต้องแก้ตอนนี้ออกจาก policy ที่ต้องขอข้อสรุปก่อน
5. จัดทำตาราง Code evidence / Expected domain rule / Proposed change และแบ่ง batch ย่อยก่อนลงมือ; ไม่แก้ Schema, live DB หรือ repair SIM เก่าโดยอัตโนมัติ

Manual Gate ถัดไปต้องรวม persistence และ isolation ที่ไม่ได้รายงานแยกใน A2; ใช้ Source ทดลอง `22730203001` และ SIM ที่ตกลงก่อนทดสอบ ไม่แตะ permanent sample `22724201001` และไม่ล้างงานเดิมเพื่อเตรียม fixture
