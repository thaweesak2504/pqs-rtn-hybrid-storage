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
    3.  **Export**: ผู้ทำกดส่งออกไฟล์ `pqs_package.zip` (ประกอบด้วย SQL script และรูปภาพ)
    4.  **Merge**: นำไฟล์มา Import ที่เครื่องหลัก (Master)
    5.  **Conflict Handling**:
        *   หาก ID ซ้ำ (คือเอกสารเดียวกัน) -> ถามเพื่อ **Update/Overwrite**
        *   หาก ID ไม่ซ้ำ (สร้างคนละหน่วย) -> **Insert New** ได้ทันที

### 5.2 Technical Implementation (แผนในอนาคต)
*   **Export Format**: JSON/SQL + Images Zip
*   **Import Logic**: Transactional Import (ถ้าล้มเหลว Rollback ทั้งหมด) เพื่อความปลอดภัยของข้อมูล

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

