# System Specifications & Business Rules

## 1. Document ID Generation (หลักการกำหนดรหัสเอกสาร)

ระบบใช้ **RtnUnit Code** (รหัสหน่วยงาน) เป็นแกนหลักในการสร้างรหัสประจำเอกสาร (Document ID) จำนวน **11 หลัก** (ปรับปรุงใหม่)

### Structure (โครงสร้างรหัส)

รูปแบบ: `UUUUU` + `TT` + `L` + `SSS` (รวม 11 หลัก)

| ส่วนประกอบ | ชื่อ (Name) | ความยาว | คำอธิบาย (Description) | ตัวอย่าง (Example) |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Unit Code** | 5 Digits | รหัสหน่วยงาน 5 หลักแรก (ตัด 2 หลักท้ายออก) | `22724` (จาก 2272400) |
| **2** | **Type** | 2 Digits | ประเภทเอกสาร <br> 10 = ทั่วไป (General) <br> 20 = เฉพาะ (Specific) | `10` |
| **3** | **Level** | 1 Digit | ระดับผู้ใช้งาน <br> 0 = สัญญาบัตร <br> 1 = ประทวน <br> 2 = ไม่กำหนด (Default) | `1` |
| **4** | **Sequence** | 3 Digits | ลำดับเอกสารที่สร้างของหน่วยนั้นๆ (Run Number 001-999) | `009` |

**หมายเหตุ**: ตัดส่วน **Format** (หลักที่ 12) ออก โดยให้แสดงผลตามบริบทการใช้งาน (หน้าปก/Desktop App) แทน

### Example (ตัวอย่างการใช้งาน)

**กรณีศึกษา**: กองโรงงานไฟฟ้าอาวุธ (2272400) สร้างเอกสารลำดับที่ 9 ประเภททั่วไป สำหรับนายทหารประทวน:
*   ID = `22724` + `10` + `1` + `009` = **`22724101009`**
*   Thai Nums: **`๒๒๗๒๔๑๐๑๐๐๙`**

## 2. PQS Creation Form Elements

ฟอร์มสร้างเอกสารใหม่ ประกอบด้วย:
1.  **Organization (L1)**: เลือกเหล่าทัพ (Default: กองทัพเรือ)
2.  **Unit Selection (Cascading)**:
    *   L2 (หน่วยขึ้นตรง) -> L3 (กอง) -> L4 (แผนก - Optional)
    *   *Result*: ใช้รหัสหน่วยสุดท้ายที่เลือก มาตัดเป็น **Unit Code 5 หลัก**
3.  **Document Info**:
    *   **Orgin Title**: ชื่อเอกสาร
    *   **Applied to**: วัตถุประสงค์ (ใช้สำหรับ/อ้างอิง)
    *   **Type**: ทั่วไป (10) / เฉพาะ (20)
    *   **Level**: สัญญาบัตร / ประทวน / ไม่กำหนด

## 4. Data Integrity & Management Rules (กฎการจัดการข้อมูล)

### 4.1 Conflict Resolution (กรณีนำเข้าเอกสารซ้ำ)
เนื่องจาก ID เป็น Primary Key (ห้ามซ้ำ):
1.  **Check ID**: ระบบตรวจสอบว่า ID นี้มีในเครื่องแล้วหรือไม่
    *   **ไม่พบ**: นำเข้าได้ทันที
    *   **พบซ้ำ (Duplicate Collision)**:
        *   *Option A*: **Overwrite** (ทับข้อมูลเดิม - กรณีอัปเดตเวอร์ชัน)
        *   *Option B*: **Generate New ID** (สร้างใหม่ - ระบบจะรัน Sequence ใหม่ให้ทันที เช่น จาก `009` เป็น `010` เพื่อไม่ให้ซ้ำ)

### 4.2 ID Updates (การแก้ไขรหัส)
การแก้ไขส่วนประกอบของ ID (เช่น เปลี่ยนกลุ่มเป้าหมาย หรือ ลำดับ) จะทำให้ **ID เปลี่ยนไป**:
*   **Database Level**: ใช้ `ON UPDATE CASCADE` เพื่อให้ทุกตารางที่อ้างอิง ID นี้ (เช่น Questions, Images) อัปเดตตามอัตโนมัติ
*   **Business Level**:
    *   **Status = Draft**: แก้ไขได้อิสระ
    *   **Status = Published**: ระบบจะ **Lock ID** ห้ามแก้ไข เพื่อป้องกันความสับสนกับเอกสารที่แจกจ่ายไปแล้ว (หากจำเป็นต้องแก้ ต้อง Re-version)

## 5. Hybrid Collaborative Workflow (การทำงานร่วมกันแบบทีม)

รองรับการทำงานแบบทีม (3-5 users) ในสภาพแวดล้อมที่อาจไม่มี Internet/LAN เชื่อมต่อกันตลอดเวลา (Offline-First Design)

### 5.1 Strategy: Distributed & Merge (กระจายงานแล้วรวมไฟล์)
*   **Concept**: ผู้ใช้งานแต่ละคนทำงานบนเครื่องของตัวเอง (Local DB) อย่างอิสระ
*   **Workflow**:
    1.  **Assign**: หัวหน้าทีมแบ่งงานตาม "หน่วยงาน" (เช่น นาย A ทำหน่วย ก., นาย B ทำหน่วย ข.)
    2.  **Work**: ต่างคนต่างสร้าง/แก้ไขเอกสารในเครื่องตัวเอง
    3.  **Export**: ผู้ทำส่งออก Typed Package ที่มี manifest, logical records, managed files และ checksum ตามชนิดข้อมูล
    4.  **Merge**: นำไฟล์มา Import ที่เครื่องหลัก (Master)
    5.  **Conflict Handling**:
        *   หาก ID และ Revision/Hash ตรงกัน -> Import แบบ idempotent/reuse
        *   หาก ID ซ้ำแต่ Revision/Hash ต่างกัน -> แจ้ง Conflict และใช้ explicit version/update policy; ห้าม silent overwrite
        *   หาก ID ไม่ซ้ำ (สร้างคนละหน่วย) -> **Insert New** ได้ทันที

### 5.2 Technical Implementation (แผนในอนาคต)
*   **Package Types**: Source Document, Trainee Working, Evaluator, Trainee Return และ Reference Package มี payload/authorization ต่างกัน
*   **Export Format**: Versioned manifest + typed logical data + managed files + per-file checksum; ไม่ใช้ SQL script เป็น public interchange contract
*   **Import Logic**: แตกไฟล์ลง staging, ปฏิเสธ unsafe paths, ตรวจ version/checksum/dependencies ก่อนเขียน และ Transactional Merge เฉพาะ entity เป้าหมาย; ถ้าล้มเหลวต้องไม่เปลี่ยนเอกสารอื่น
*   **Answer Key Rule**: Trainee Working Package ต้องไม่มี Answer Key; ปลายทางที่ไม่มี Source Document ใช้ Evaluator Package แบบ Read-only ที่ผูกกับ Source Revision เดียวกัน
*   **Backup Separation**: Full Hybrid Backup/Restore เป็นการกู้คืนทั้งระบบและห้ามนำมาใช้แทน Package รายเอกสาร
*   **Architecture Baseline**: รายละเอียด ownership, live storage, manifest และงานที่เลื่อนไปทำภายหลังอยู่ที่ `docs/plans/DATA_OWNERSHIP_AND_PORTABILITY_BASELINE.md`

---

## 6. Section Management (การจัดการหน้าเนื้อหาใน Section)

### 6.1 Overview
แต่ละเอกสาร PQS จะประกอบด้วย 3 Sections หลัก:
- **100 Fundamentals** - ความรู้พื้นฐาน
- **200 Systems** - ระบบ
- **300 Watch Stations** - การปฏิบัติหน้าที่

แต่ละ Section สามารถสร้างหน้าเนื้อหาย่อย (Sub-sections) ได้โดยใช้ปุ่ม **"+ Add Sub section"**

### 6.2 Section Numbering Rules (กฎการกำหนดเลขหมาย)

#### 6.2.1 Section 100 Fundamentals (ความรู้พื้นฐาน)
- **Range**: 101 - 199
- **Special Case - Section 101**:
  - ชื่อเรื่อง (บังคับ): `"ข้อควรระมัดระวังอันตรายพื้นฐาน"`
  - ชื่อเมนู (บังคับ): `"101 Precautions"`
  - **ไม่สามารถแก้ไข** (System-defined)
- **User-defined Sections** (102-199):
  - ผู้ใช้สามารถสร้างข้อใดก่อนก็ได้ (ไม่จำเป็นต้องเรียงลำดับ)
  - รองรับการทำงานแบบทีม (แบ่งงานกันทำ)

#### 6.2.2 Section 200 Systems (ระบบ)
- **Range**: 201 - 299
- สร้างเนื้อหาได้อิสระ ไม่มีข้อบังคับ

#### 6.2.3 Section 300 Watch Stations (การปฏิบัติหน้าที่)
- **Range**: 301 - 399
- สร้างเนื้อหาได้อิสระ ไม่มีข้อบังคับ

### 6.3 Input Fields (ข้อมูลที่ต้องกรอกเมื่อสร้าง Section ใหม่)

เมื่อกดปุ่ม **"+ Add Sub section"** ระบบจะขอข้อมูลดังนี้:

| Field | Type | Required | Description | Example | Validation |
|-------|------|----------|-------------|---------|------------|
| **Section Number** | Integer | ✅ Yes | เลขหัวข้อที่ต้องการสร้าง | `102`, `205`, `305` | • ต้องอยู่ในช่วงที่กำหนด (101-199, 201-299, 301-399)<br>• **ห้ามซ้ำ** ภายในเอกสารเดียวกัน<br>• Section 101 ห้ามสร้างซ้ำ (Reserved) |
| **Section Title (TH)** | Text | ✅ Yes | ชื่อเรื่อง (ภาษาไทย) | `"ระบบไฟฟ้า"` | • Max 200 chars<br>• แก้ไขได้ (ยกเว้น Section 101) |
| **Menu Label (EN)** | Text | ✅ Yes | ชื่อแสดงบนเมนู (ภาษาอังกฤษ) | `"Electrical System"` | • Max **30 chars** (เพื่อไม่ให้ล้น Sidebar)<br>• ห้ามซ้ำภายในเอกสารเดียวกัน<br>• แนะนำให้สั้นกระชับ |
| **Display Order** | Integer | Auto | ลำดับการแสดงใน Sidebar | `1`, `2`, `3` | • Auto-generate ตามลำดับการสร้าง<br>• สามารถ Drag-drop เรียงใหม่ได้ |

### 6.4 Business Rules (กฎการทำงาน)

#### 6.4.1 Uniqueness Constraints (ข้อกำหนดความไม่ซ้ำ)
- **Section Number**: ห้ามซ้ำภายในเอกสารเดียวกัน (Per Document)
  - ✅ OK: เอกสาร A มี section 102, เอกสาร B มี section 102 (คนละเอกสาร)
  - ❌ ERROR: เอกสาร A มี section 102 สองหน้า (เอกสารเดียวกัน)
- **Menu Label**: ห้ามซ้ำภายใน Section เดียวกัน
  - ✅ OK: Section 100 มี "Power", Section 200 มี "Power"
  - ❌ ERROR: Section 100 มี "Power" สองรายการ

#### 6.4.2 Creation Order (ลำดับการสร้าง)
- ไม่บังคับให้สร้างเรียงตามเลขหัวข้อ
- ตัวอย่าง: สร้าง 105 -> 102 -> 108 -> 103 ได้
- Display Order จะแสดงตามลำดับที่สร้าง (แต่สามารถ Drag-drop เรียงใหม่ได้)

#### 6.4.3 Deletion Rules (กฎการลบ)
- **Section 101**: ห้ามลบ (System-protected)
- **User-defined Sections**: ลบได้ แต่ต้องยืนยันก่อน
  - หากมีคำถาม/เนื้อหาอยู่ภายใน ต้องแจ้งเตือนและลบ Cascade

### 6.5 UI/UX Guidelines

#### 6.5.1 Add Section Modal (หน้าต่างเพิ่ม Section)
```
┌─────────────────────────────────────────┐
│  ✨ Add New Section                     │
├─────────────────────────────────────────┤
│  Section: [100 Fundamentals ▼]          │
│                                          │
│  Section Number: [___]                   │
│  (Range: 101-199, except 101)            │
│                                          │
│  Section Title (Thai):                   │
│  [_________________________________]     │
│                                          │
│  Menu Label (English):                   │
│  [___________________] (Max 30 chars)    │
│                                          │
│  [Cancel]  [Create Section]              │
└─────────────────────────────────────────┘
```

#### 6.5.2 Sidebar Display
```
100 Fundamentals
  ├─ 100 Introduction
  ├─ 101 Precautions (System)
  ├─ 102 Power System
  └─ + Add Sub section

200 Systems
  ├─ 200 Introduction
  ├─ 201 Radar Weapon
  └─ + Add Sub section
```

### 6.6 Database Schema Considerations

**Suggested Table: `sections`**
```sql
CREATE TABLE sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL,
  section_group INTEGER NOT NULL, -- 100, 200, 300
  section_number INTEGER NOT NULL,
  title_th TEXT NOT NULL,
  menu_label TEXT NOT NULL,
  display_order INTEGER,
  is_system_defined BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(document_id, section_number),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

**Index:**
```sql
CREATE INDEX idx_sections_document ON sections(document_id);
CREATE INDEX idx_sections_number ON sections(document_id, section_number);
```

## 7. Development Status & Pending Work

### 7.1 Clear Answers (Under Testing)

- `Clear Answers` ต้องลบเฉพาะ `UserAnswers`, `UserProgress` และไฟล์ใน `trainee-attachments/` ของเอกสารเล่มที่กำลังเปิดอยู่เท่านั้น
- ข้อมูลคำตอบและไฟล์แนบของเอกสารเล่มอื่นต้องไม่ได้รับผลกระทบ
- Tauri IPC ต้องเปิดเฉพาะคำสั่ง Clear Answers ที่ Rust ตรวจยืนยันว่าเป้าหมายเป็น Simulation; generic document-clear helper ห้าม register เป็นคำสั่งภายนอกที่ข้าม guard ได้
- Backend ต้องนับผลจาก authoritative SQLite rows และคืน Database result แยกจาก managed-filesystem cleanup result; ถ้า SQLite commit สำเร็จแต่ไฟล์ลบไม่ครบต้องคืน partial result พร้อม logical path โดยไม่กล่าวว่าสำเร็จทั้งหมดและไม่เปิดเผย absolute host path
- Questions, Answer Keys, Question Images, References, Source Document และ Simulation อื่นต้องคงอยู่หลัง Clear Answers
- Clear Answers UI ต้องแสดง Active Simulation ID, Source ID, ข้อมูลที่จะลบ/เก็บไว้ และเปิดคำสั่ง danger หลังผู้ใช้พิมพ์ Simulation ID ตรงกันทุกตัวอักษรเท่านั้น; ระหว่าง request ต้องป้องกันการกดซ้ำ, Escape, backdrop และปุ่มปิด
- หลัง Clear Answers ต้องแสดง authoritative answer/assessment/progress/file counts จาก Rust; command failure ต้องคง Modal context เพื่อ Retry/Copy Details ส่วน SQLite commit ที่สำเร็จแต่ไฟล์ล้างไม่ครบต้องแสดงเป็น partial outcome ไม่ใช่ success ทั้งหมด
- `Delete One Answer` ต้องระบุเป้าหมายด้วย composite identity `user_id + document_id + question_id + sub_question_code` และลบได้ไม่เกินหนึ่ง `UserAnswers` row โดยไม่เปลี่ยน Question หรือ Answer Key
- การลบคำตอบรายข้อต้อง commit SQLite ก่อนลบไฟล์; หาก SQLite ปฏิเสธการลบ ต้องรักษาทั้ง answer row และไฟล์ไว้ ส่วน Progress recalculation และ filesystem cleanup หลัง commit ต้องคืนผลแยกจาก Database result เพื่อรายงาน partial outcome ได้ตรงจริง
- ไฟล์ที่ลบจากคำตอบรายข้อต้องอยู่ใต้ logical path `data/<document-id>/trainee-attachments/` ของ Document เดียวกันเท่านั้น; ไฟล์ข้าม Document และไฟล์ที่ยังมี Database reference อื่นใช้อยู่ต้องไม่ถูกลบ
- ก่อนยืนยัน Delete One Answer UI ต้องแสดง Question/Subquestion identity, การมีข้อความ, จำนวนไฟล์แนบ, Assessment status และผลต่อ Section Progress; ขณะมี Answer Draft ที่ยังไม่บันทึกต้องห้ามลบจนกว่าจะบันทึกหรือยกเลิก Draft และหลังคำสั่งต้องแสดง Database/Progress/Filesystem result จาก Backend โดยแยก partial outcome พร้อม Retry/Copy Details เมื่อเกิด failure
- สำหรับ Section 300 prerequisite ที่ใช้ไฟล์หลักฐานโดยไม่มีข้อความคำตอบ UI ต้องเรียกคำสั่งตามบริบทเป็น `แนบ/แก้ไข/ล้าง/ลบเอกสารหลักฐาน`; การลบยังใช้ exact UserAnswers identity และ database-first cleanup contract เดียวกัน พร้อมคืน Focus ไปคำสั่ง `แนบเอกสารหลักฐาน` หลังสำเร็จ
- Workflow นี้ยังอยู่ระหว่างการทดสอบร่วมกับโหมดจำลอง Trainee และ Qualifier ก่อนเชื่อมกับผู้ใช้ที่ Login จริง

### 7.2 Product Model and Simulation Copies (Under Testing)

- **Application Template/Skeleton** คือ Format เปล่าสำหรับสร้างเอกสารใหม่ ระบบเตรียม Section/หัวข้อบังคับ/ช่องโครงสร้างและ Navigation ให้ แต่ต้องไม่มี Question, Answer Key, Trainee Answer, Assessment, Progress หรือไฟล์แนบของผู้ทดสอบ
- **Sample/Source Document** คือเอกสารตัวอย่างที่สร้างเสร็จแล้วหมายเลข `22724201001` มี Question, Answer Key, References และโครงสร้างจริง ใช้เป็นตัวอย่างถาวรของโปรเจกต์และเป็นสนามพัฒนา Workflow
- **Trainee Test Copy** คือสำเนาอิสระที่ออกจาก Source Document ให้ Trainee รายหนึ่ง ปัจจุบันใช้รหัสจำลอง `<source-id>-SIM-<sequence>` และต้องเป็นเจ้าของคำตอบ การประเมิน Progress และไฟล์แนบของตนเอง
- Badge `TEMPLATE` บนเอกสารต้นฉบับใน UI ปัจจุบันเป็นคำเรียกชั่วคราวระหว่างการทดสอบ ไม่ได้หมายความว่า Sample/Source Document เป็น Application Template/Skeleton
- ผู้พัฒนาต้องตรวจ Creator, Trainee และ Qualifier Workflow ได้ครบจาก Sample Document เดียวกัน แต่ทั้งสามมุมมองเป็นความสามารถของ Developer/Simulation Workspace ไม่ใช่ข้อมูลสามส่วนที่ฝังอยู่ใน Skeleton
- Clean Release Seed ต้องมี System/Master Configuration, กติกา Skeleton และ Sample Document `22724201001` เพียงหนึ่งฉบับ โดยไม่มี SIM, Mock `T-001`/`Q-001`, คำตอบ, การประเมิน, Progress, Trainee Attachments, Session หรือข้อมูลทดสอบอื่นหลงเหลือ
- ข้อกำหนด “มีเอกสารตัวอย่างหนึ่งฉบับ” หมายถึงสถานะเริ่มต้นของ Clean Release Seed; หลังผู้ใช้สร้างหรือ Import เอกสารจริง `content.db` ย่อมมีเอกสารเพิ่มได้ตามปกติ

- Source Document ใช้เลขเอกสารหลักของหน่วยตามปกติ เช่น `22724201001`
- สำเนารอบจำลองของ Source Document ใช้รหัสแยก เช่น `22724201001-SIM-001` และไม่ใช้เลขรันของเอกสารหน่วย
- รหัส `SIM` ถูกจัดสรรต่อ Source Document และไม่ใช้ซ้ำแม้ลบรอบจำลองแล้ว เพื่อให้ Admin ติดตามประวัติได้ในอนาคต
- เลขท้าย `SIM-004` หมายถึงลำดับที่เคยจัดสรร ไม่ได้หมายความว่ายังมีสำเนาอยู่ 4 ฉบับ; จำนวนที่ยังอยู่จริงต้องอ่านจาก `DocumentSimulationInstances` ที่ยังเชื่อมกับ `Documents`
- หน้า Source Document ต้องแสดงจำนวนรอบจำลองที่ยังอยู่จริง และเปิด Modal รายการเพื่อดูรหัสรอบ, Trainee ID, เวลาสร้าง/กิจกรรมล่าสุด, จำนวนคำตอบ, การประเมิน, ผลผ่าน/ปรับปรุง, ไฟล์แนบ และ Progress
- Modal รายการรองรับการรีเฟรช เปิดรอบเดิมกลับไปดู เปิดโฟลเดอร์ไฟล์แนบ และลบรอบที่เลือกหลังยืนยัน โดยการลบต้องไม่กระทบ Template หรือรอบอื่น
- คำตอบ การประเมิน และ Progress เก็บใน `content.db`; ไฟล์แนบเก็บแยกที่ logical path `data/<simulation-document-id>/trainee-attachments/` ภายใต้ managed data directory ของแอป
- เมื่อเข้า Qualifier view ชุดประเมินทุกข้อต้องเริ่มแบบปิด โดยแสดงคำสั่งเดียวตามสถานะ (`เปิดการประเมิน`, `แก้ไขการประเมิน` หรือ `แก้ไขคำแนะนำ`) และเปิด inline assessment เฉพาะข้อที่ผู้ใช้สั่งเท่านั้น; การ Refresh ข้อมูลต้องไม่เปิดชุดประเมินเอง
- Qualifier ต้องมีคำสั่งประเมินที่ชัดเจนสำหรับ `ผ่าน`, `ปรับปรุง` และการย้อนผลประเมิน: การยกเลิก `ปรับปรุง` ต้องยืนยันก่อนเปลี่ยนสถานะกลับเป็น `รอประเมิน`, ล้างเฉพาะ Qualifier feedback และคำนวณ Progress ใหม่ โดยไม่ลบคำตอบหรือไฟล์แนบของ Trainee; การปิด inline assessment โดยไม่บันทึกต้องละทิ้งเฉพาะตัวเลือก/ข้อความ Draft ใน UI
- การกดคำสั่ง UI ปัจจุบัน `กลับ Template` หมายถึงกลับไปยัง Source Document และเป็นเพียง Navigation; ต้องไม่ลบรอบจำลอง ส่วนการเริ่มรอบใหม่ต้องจัดสรรเลขถัดไปโดยไม่เขียนทับรอบเดิม
- ผู้ดูแลระบบจะเห็นผู้เข้าทดสอบของรอบจำลองได้ในชั้นข้อมูล; นโยบายการเปิดเผยตัวตนให้ Qualifier เพื่อป้องกัน Bias เป็นงานในอนาคต
- Full Hybrid Backup/Restore เป็นงานสำรองทั้งระบบและอาจแทนที่ข้อมูลเครื่องปลายทาง จึงห้ามนำมาใช้แทน Trainee Portable Export/Import; Portable Package ต้องย้ายเฉพาะ Test Copy และความก้าวหน้าของ Trainee โดยไม่เขียนทับ `content.db` หรือเอกสารอื่นของหน่วยปลายทาง
- Production Issued Copy ต้องผูกกับ immutable Source Revision; การแก้ Source Document ภายหลังต้องไม่เปลี่ยนเนื้อหาหรือ Answer Key ที่ใช้ประเมินสำเนาที่ออกไปแล้ว
- Trainee Working Package ต้องไม่มี Answer Key/Rubric ที่ Trainee อ่านได้ ส่วนปลายทางที่ไม่มี Source Document ต้องได้รับ Evaluator Package แบบ Read-only แยกต่างหากและจับคู่ด้วย Source Document ID, Source Revision ID, Issued Copy ID และ stable question identity
- รุ่นแรกต้องแจก Trainee Working Package และ Evaluator Package แยกช่องทาง; sealed evaluator payload ใน Package เดียวกันเป็นงานในอนาคตที่ต้องมี encryption, real-user authorization, key management และ audit policy ก่อน

### 7.3 Creator Question Save

- การสร้างหรือแก้ไข Question ตาม workflow ปกติ ต้องบันทึก Question, การเชื่อม Subquestion, Question References และ Answer Keys ภายใน SQLite transaction เดียวกัน
- หากส่วนใดล้มเหลว ต้อง rollback ทั้งชุดและคง Draft ในฟอร์มไว้ให้ Creator แก้ไขหรือลองบันทึกใหม่
- ระหว่างบันทึกต้องป้องกันการส่งคำสั่งซ้ำ และเอกสาร Simulation ต้องไม่สามารถเรียก Creator-save command ได้
- Creator เปิดฟอร์ม Question/Create/Insert ได้ครั้งละหนึ่งฟอร์มทั่วทั้งเอกสาร เมื่อขอเปิดฟอร์มอื่น ฟอร์มเดิมที่ไม่มีการเปลี่ยนแปลงจะปิดและสลับทันที
- หากฟอร์มเดิมมี Draft ระบบต้องแสดง Modal เดียวที่ระบุรหัส Question และให้เลือก `แก้ไขต่อ`, `ละทิ้งการแก้ไข`, หรือ `บันทึกแล้วไปข้อใหม่`; การสลับข้อจะเกิดหลังการละทิ้งหรือ Transaction บันทึกสำเร็จเท่านั้น
- Modal ต้องแจกแจงส่วนที่แก้ไขจริง เช่น Question, Description, Sub-questions, References, Answer Key และ Attachments; เมื่อกลับมาแก้ไข ฟอร์มใช้สถานะสีเหลืองอำพันสำหรับ “แก้ไขแล้ว/ยังไม่บันทึก” ส่วนกรอบแดงสงวนไว้สำหรับ Validation error เท่านั้น
- Validation หรือ Transaction ที่ล้มเหลวจากคำสั่ง `บันทึกแล้วไปข้อใหม่` ต้องแสดงข้อผิดพลาดภายใน Modal เดิม คง Draft และคงฟอร์มเดิมไว้ โดยไม่เปิด Modal ซ้อน
- Reference selector เป็นส่วนหนึ่งของ Question Draft เดียวกัน การเลือก ยกเลิก หรือแก้เลขหน้าต้องถูกนำไปใช้เมื่อบันทึก Question แม้ Creator ไม่ได้กดปุ่มปิดตัวเลือก; ปุ่มภายใน selector มีหน้าที่ตรวจข้อมูลและปิดตัวเลือก ไม่ใช่การบันทึกข้อมูลอีกชั้นหนึ่ง
- Question Form รองรับ Escape สำหรับออกจากฟอร์มตาม Draft Guard และ Ctrl/Cmd+S สำหรับบันทึก โดยตรวจ physical `KeyS` เพื่อให้ทำงานได้ทั้งแป้นพิมพ์ภาษาไทยและอังกฤษ
- Answer Key Editor ต้องส่งค่าว่างมาตรฐานเมื่อ Tiptap ไม่มีเนื้อหาจริง (รวม `<p></p>`/`<p><br></p>`), การแก้ไขหรือล้าง Answer Key ต้องทำให้ Creator Draft เป็น dirty และ Required/Error indicator ต้องแสดงที่กล่อง Answer Key โดยตรง
- Question Attachment เป็นส่วนหนึ่งของ Creator Draft: การเอาไฟล์ที่บันทึกแล้วออกต้องยังไม่ลบไฟล์จริงจนกว่า Question save จะสำเร็จ; การละทิ้ง Draft ต้องรักษาไฟล์เดิมและลบเฉพาะไฟล์ใหม่ที่อัปโหลดในรอบนั้น
- Tiptap selection style ต้องคงสีข้อความที่ Creator เลือกไว้ให้มองเห็นทันทีหลังใช้คำสั่งสี โดยยังแสดงพื้นหลัง Selection เพื่อบอกช่วงข้อความที่เลือก
- การ Paste rich text ลง Tiptap ต้องเก็บเฉพาะโครงสร้างที่รองรับ เช่น ย่อหน้า รายการ และตาราง แต่ล้างรูปแบบการนำเสนอจากต้นทาง เช่น สี ตัวหนา ตัวเอียง ฟอนต์ ขนาด และพื้นหลัง เพื่อให้ข้อความรับรูปแบบของ Editor ปลายทาง; ผู้ใช้ยังใช้ Toolbar ใส่รูปแบบโดยตั้งใจภายหลังได้ และนโยบายนี้ห้ามย้อนแก้ข้อมูลที่บันทึกไว้เดิมอัตโนมัติ

### 7.4 Section 200 Mapping Integrity

- รหัสใน `selectedSubQuestions` ต้องไม่ซ้ำ ต้องมีอยู่จริง และต้องอยู่ใน `activeSubQuestions` ของ Parent Question; Rust/SQLite เป็นผู้บังคับกติกาสุดท้าย
- ก่อนนำรหัส Section 200 ที่บันทึกแล้วออก ระบบต้องวิเคราะห์ Answer Key, Trainee Answer, ผลประเมิน, ไฟล์แนบ และ Progress ของรหัสนั้น โดยยังไม่เปลี่ยนข้อมูล
- ถ้ารหัสที่นำออกไม่มีข้อมูลพึ่งพา ให้บันทึกได้โดยไม่แสดงคำเตือนที่ไม่จำเป็น
- ถ้ามีเฉพาะ Answer Key ให้แสดง Mapping Impact Modal ด้วยลำดับ/ข้อความคำถามย่อยที่ Creator มองเห็น เช่น `ข. ตำแหน่งที่ติดตั้งอยู่ที่ไหน` โดยไม่ใช้รหัสระบบเป็นข้อความหลัก และบันทึกได้หลัง Creator ยืนยันอย่างชัดเจน
- ปุ่ม `กลับไปตรวจสอบ` ใน Mapping Impact Modal ต้องคง Draft ปัจจุบันไว้ รวมถึงสถานะคำถามย่อยที่เพิ่งเอาออก; Modal ต้องอธิบายว่าการเปลี่ยนแปลงยังไม่ถูกบันทึก การเลือกคำถามย่อยกลับจะคืน Answer Key ที่เก็บอยู่ใน Draft และปุ่มยืนยันใช้คำตรงไปตรงมาเป็น `นำออกและบันทึก`
- ถ้ามี Trainee Answer หรือผลการปฏิบัติอยู่แล้ว ให้ Block การเปลี่ยน Mapping ทั้งใน UI และ backend; ห้ามลบข้อมูลแบบ cascade และห้ามมีปุ่มยืนยันการลบถาวร
- การแก้ข้อความ Answer Key ของรหัสเดิมต้องใช้ UPSERT และรักษา Trainee Answer ที่อ้างอิงรหัสเดิมไว้ ห้ามใช้การลบ Answer Key ทั้งชุดแล้วสร้างใหม่
- ลำดับ `selectedSubQuestions`, Answer Keys และ Answer Boxes ใช้ลำดับ canonical จาก Parent Subquestion List เดียวกัน
- ทุก Section 200 assessment view ต้อง hydrate คำตอบด้วย composite key `question_id + sub_question_code`; Template ยังไม่แสดง Trainee Answer หรือ Qualifier feedback
- นโยบายปัจจุบันใช้ **Block removal** เมื่อมีงาน Trainee เป็นมาตรการปลอดภัย การ Archive/Recovery แบบมีประวัติเป็นงานในอนาคตและต้องมี schema รองรับก่อนเปิดใช้

### 7.5 Introduction Content Authority

- General Introduction ข้อ 2 `การประยุกต์ใช้` เป็น Document Content เพียงรายการเดียวที่ Creator แก้ไขได้ต่อเอกสาร โดยบันทึกใน `Documents.applied_to`
- General Introduction ข้อ 1 และ 3–7 รวมทั้ง Section 100/200/300 Introduction ทั้งหมดเป็น System Content ที่ล็อกไว้ใน Document Editor
- การแก้ `การประยุกต์ใช้` จากหน้า Introduction ต้องใช้ Tauri command ที่เปลี่ยนเฉพาะ `Documents.applied_to`; ห้ามใช้คำสั่งแก้ Metadata หลาย field เป็น persistent boundary ของ workflow นี้
- Rust ต้องตรวจค่าว่าง ตรวจว่า Document มีอยู่ และปฏิเสธ Document ที่เป็น `DocumentSimulationInstances.simulation_document_id`; UI role/view guard เป็นเพียงการป้องกันเพิ่มเติม
- Simulation เก็บค่า `applied_to` ที่คัดลอกจาก Source Document ณ เวลาสร้างรอบเพื่อรักษา issued snapshot; Trainee, Qualifier, Visitor และ Print Layout อ่านค่าจาก Document ที่กำลังเปิด แต่ไม่มีสิทธิ์แก้ไขจาก Introduction workflow
- Legacy virtual Question records ที่ใช้ `section_id` 100/200/300 ไม่ใช่แหล่งเนื้อหา Introduction ที่แสดงจริง; audit วันที่ 17 สิงหาคม 2569 ยืนยันว่า records เหล่านี้ถูก seed และ clone โดยไม่มี UI consumer และทำให้ `Questions.section_id` ใช้ namespace ซ้ำกับ Primary Key ของ `Sections`
- Product Owner อนุมัติ Option C เมื่อ 17 สิงหาคม 2569: เอกสารใหม่ต้องเริ่มจาก Application Skeleton ที่ persist เฉพาะ Section 101 ซึ่งบังคับ ชื่อคงที่ และลบไม่ได้; ห้าม seed Introduction เป็น Question placeholder
- Migration version 3 ลบเฉพาะ record ที่ตรง legacy signature และไม่มี `Sections.id` จริงของ Document เดียวกัน ก่อนลบต้อง preflight ว่าไม่มี child, Answer Key, Choice, Reference, Question/Subquestion link, Question/Section link หรือ User Answer; หากพบ dependency ต้อง abort และ rollback ทั้ง migration ห้าม cascade เงียบ ๆ
- Simulation clone ต้อง map Question ทุกข้อไปยัง Section จริงที่ถูก clone เท่านั้น ห้าม preserve virtual `section_id` 100/200/300
- System Introduction ใช้นโยบาย Live Update: General ข้อ 1 และ 3–7 รวมทั้ง Section 100/200/300 Introduction แสดงข้อความมาตรฐานล่าสุดจาก Application แก่ Source, Simulation/Trainee, Qualifier, Visitor และ Print Layout พร้อมกัน โดยไม่เก็บ per-document snapshot/version
- Live Update ต้องไม่เขียนทับ General ข้อ 2 `การประยุกต์ใช้` ซึ่งยังเป็น `Documents.applied_to`
- System Introduction ต้องผ่านการประชุม/รับรองเนื้อหาก่อน แล้วให้ Developer แก้ typed definitions ใน Code, รันการตรวจสอบ และออก Application Version ใหม่เพื่อกระจายข้อความเดียวกันทุกแหล่ง ห้ามเพิ่ม Global Admin editor หรือ local publish command ที่ทำให้แต่ละแหล่งแก้มาตรฐานแยกกัน เว้นแต่ Product Owner เปิดทบทวนนโยบายนี้ใหม่อย่างชัดเจน

### 7.2 Print Layout & A4 Pagination (Pending)

- Print Layout ปัจจุบันใช้สำหรับดูเอกสารแบบหน้าต่อเนื่อง โดยแยก `Question only` สำหรับ Trainee และ `Question with answer key` สำหรับ Qualifier
- Print Layout ต้องแสดงตัวอักษรแบบ monochrome พร้อมพิมพ์ในทุกส่วน รวมถึง Introduction, Question, Answer Key และ rich text ที่มีสีจาก Tiptap; สีสำหรับสถานะ/Section identity/ข้อความที่ผู้เขียนกำหนดคงแสดงได้เฉพาะ normal Creator/Trainee/Qualifier/Visitor views และต้องไม่หลุดเข้า Print Layout
- ตำแหน่งหน้าเอกสารอ้างอิงของคำถาม Section 100/200 ต้องอยู่ใน text flow ต่อท้ายข้อความคำถาม ไม่แยกเป็นคอลัมน์ที่บีบข้อความหรือไปติดกับตัวเลือกคำถามย่อย
- เลข Section และเลขลำดับคำถามอัตโนมัติใน Print Layout ใช้เลขอารบิกเหมือน Editor และมุมมองงาน (`101.1`, `201.2.1`, `301.1`); อักษรลำดับไทย เช่น `ก.`, `ข.` ยังคงใช้ตามโครงเอกสาร
- การสั่งพิมพ์จริงแบบแบ่งหน้า A4 ยังเป็นงานค้าง เพราะ page break และการตัดบรรทัดของเนื้อหาที่มีความยาวไม่คงที่ยังไม่ถูกต้อง
- ห้ามถือว่า Continuous Print Layout ปัจจุบันเป็นผลลัพธ์ PDF/A4 ขั้นสุดท้ายจนกว่างาน pagination จะแล้วเสร็จ

### 7.3 Authentication & Backup Hardening

- Public User DTO ที่ส่งผ่าน Tauri IPC ต้องไม่มี `password_hash` หรือข้อมูล credential ภายใน
- การ Login ต้องได้รับ opaque session token ที่ backend สุ่มให้ โดย SQLite เก็บเฉพาะ SHA-256 hash ของ token; `localStorage` เก็บ raw token ได้ แต่ห้ามใช้ role ที่เก็บฝั่ง frontend เป็นหลักฐานสิทธิ์
- การ Restore session ต้องส่ง token ให้ backend ตรวจสอบ แล้วอ่าน user, active status และ role ล่าสุดจาก SQLite; session ใช้งานข้ามการปิดและเปิด Desktop ได้ และหมดอายุเมื่อไม่มีการใช้งานเกิน 30 วัน
- ระหว่าง Startup ต้องคงสถานะ Auth Loading จนการตรวจ session กับ backend เสร็จสมบูรณ์ รวมถึงเมื่อ React Strict Mode เรียก startup effect ซ้ำ; ห้ามเผยสถานะ signed-out ชั่วคราวจน Route Guard ส่งผู้ใช้ไปหน้า Sign In โดยไม่จำเป็น
- ระหว่าง Auth Loading ให้ใช้ waiting motion ที่หน่วงการแสดงเล็กน้อยและไม่แสดงข้อความชั่วคราวให้ผู้ใช้ต้องรีบอ่าน โดยคงคำอธิบายสถานะสำหรับ screen reader และรองรับ reduced motion
- หาก session ได้รับการยืนยันแล้ว แต่ URL เริ่มต้นหรือ URL ที่ค้างอยู่เป็น `/signin`, `/registration` หรือ `/register` ระบบต้อง redirect ไป `/welcome`; หน้าสำหรับ Guest ต้องไม่แสดงพร้อม Header/Avatar ของผู้ใช้ที่ Login อยู่
- การส่งแบบฟอร์ม Sign-in ต้องใช้ loading state ภายในฟอร์มและห้ามเปลี่ยน Auth startup loading จน Route Guard ถอดหน้า Sign-in ออก; เมื่อ credentials ไม่ถูกต้องต้องคงค่าที่กรอก แสดงข้อความรวมที่ไม่เปิดเผยว่าบัญชีมีอยู่หรือไม่ และย้าย focus กลับช่องรหัสผ่าน ส่วนความผิดพลาดของระบบต้องแยกข้อความจาก credentials ไม่ถูกต้อง
- ระบบต้องจำข้อความ Username/Email ที่ผู้ใช้กรอกและ Sign-in สำเร็จล่าสุดแยกจาก session เพื่อเติมในช่อง Username แบบเดิมและเริ่ม focus ที่ช่อง Password; ห้ามจำ Password ห้ามนำ Username จากความพยายามที่ Sign-in ไม่สำเร็จมาแทน และห้าม Restore session หรือ Logout เขียนทับค่าดังกล่าวด้วย canonical username จาก backend
- Desktop WebView2 ต้องปิด General Autofill และ Password Autosave พร้อมล้างเฉพาะประวัติ autofill/password ที่ WebView เคยบันทึก เพื่อไม่ให้ค่าที่พิมพ์ผิดปรากฏเป็น “Saved info”; การตั้งค่านี้ห้ามล้าง localStorage, auth session, theme, SQLite หรือข้อมูลเอกสาร
- เมื่อเปลี่ยนรหัสผ่าน ระบบต้องคง session ปัจจุบันไว้เพื่อใช้งานต่อ แต่เพิกถอน session อื่นของผู้ใช้เดียวกัน; Logout, session หมดอายุ, บัญชีถูกปิดใช้งานหรือถูกลบต้องทำให้ token ใช้งานต่อไม่ได้
- Private routes ต้องตรวจ authentication และหน้า Dashboard Management ต้องจำกัดสิทธิ์ Admin โดยไม่กระทบ Role/View Simulation ภายในเอกสาร
- คำสั่งจัดการผู้ใช้ผ่าน Tauri ต้องตรวจ session ที่ backend และตรวจ Admin/self ตามประเภทคำสั่ง ไม่พึ่ง route guard เพียงอย่างเดียว
- Hybrid Backup ต้องสร้าง SQLite snapshot ที่สอดคล้องกับ WAL, บันทึก checksum ของฐานข้อมูล และปฏิเสธ ZIP entry ที่ออกนอก staging directory
- การ Restore ฐานข้อมูลต้องผ่าน SQLite integrity/checksum validation ก่อนเขียนเข้า live database

