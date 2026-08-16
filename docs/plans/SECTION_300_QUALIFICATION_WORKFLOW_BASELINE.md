# Section 300 Qualification Workflow Baseline

**Status:** Living Draft — ปรับปรุงต่อเนื่องเมื่อ Product Owner และทีมเข้าใจ Domain ตรงกันมากขึ้น
**Created:** 2026-08-12
**Scope:** หลักการคุณสมบัติ ความสัมพันธ์กับ Section 100/200, Trainee/Qualifier/Admin workflow, progress/scoring และ navigation ของ Section 300

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

### 5.2 ตรวจพบจาก Code — Current Defect

- `add_section_ref_child` บันทึก Section reference ใหม่ด้วย `sequence = MAX(sequence) + 1`
- `batch_add_section_ref_children` เพิ่มต่อท้ายตาม input order
- `get_section_ref_children_inner` และ Question tree อ่านกลับด้วย `ORDER BY sequence`
- Frontend Sort state ชั่วคราวตาม `ref_section_number` หลังเพิ่มทีละรายการ แต่ไม่ได้ปรับ `sequence` ที่บันทึกใน SQLite
- ผลคือรายการดูเรียงถูกได้ชั่วคราวในฟอร์ม แต่กลับไปอยู่ท้ายสุดหลัง Refresh/Reload ตามที่พบกับ Section 201

### 5.3 ข้อเสนอการแก้

- Rust/SQLite ต้องเป็น Authority ของลำดับ ไม่พึ่ง Frontend sort อย่างเดียว
- หลัง Add, Batch Add หรือ Remove ให้ normalize `sequence` ของ `section_ref` siblings ตาม `refSectionNumber`
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

1. Simulation Clone สร้าง Section IDs ใหม่ แต่ยังคัดลอก `Questions.metadata.refSectionId` เดิมโดยไม่ remap ไปยัง Section ใน Simulation
2. ยังไม่มี Rust regression test สำหรับ Shared Requirement หนึ่งตัวที่ fan-out ไปหลาย Position เช่น Section 201 -> 301/302/303
3. Linked progress fetch ใน `QuestionDisplayCard` ยังไม่ผูกกับ refresh trigger ที่เกิดหลัง assessment change จึงอาจแสดงค่าค้างจนเปลี่ยนหน้า/Reload
4. `save_qualifier_assessment` คำนวณ progress ใหม่ทุก Section หลัง Save แต่หาก recalculation ล้มเหลวจะ Log warning และยังคืนผลว่า Save สำเร็จ
5. Section menu ปัจจุบันยังไม่มี Admin authorization/request/unlock model
6. การป้องกัน reference cycle ตอนเขียนครอบคลุม self/direct back-reference แต่ยังต้องพิสูจน์วงจรยาว
7. `OralAssessmentBox` ยังใช้ lifecycle และ command controls คนละชุดจาก Qualifier UX ที่ผ่าน Phase 4
8. Persisted `section_ref.sequence` ยังสะท้อนลำดับที่เพิ่ม ไม่ใช่ลำดับเลข Section

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
