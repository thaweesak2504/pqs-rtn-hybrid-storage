# วิเคราะห์ 3xx.1.4 & 3xx.1.5 Section Selector

> วันที่วิเคราะห์: 23 ก.พ. 2569

---

## 1. แหล่งข้อมูลต้นทาง: Sections Table

### Schema

```sql
CREATE TABLE Sections (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id   VARCHAR(11) NOT NULL,
    section_group INTEGER NOT NULL,        -- 100, 200, 300
    section_number INTEGER NOT NULL,       -- 101-199, 201-299, 301-399
    title_th      TEXT NOT NULL,           -- ← ชื่อหัวข้อ (แหล่งความจริง)
    menu_label    TEXT NOT NULL,
    display_order INTEGER,
    is_system_defined BOOLEAN DEFAULT 0,
    ...
    UNIQUE(document_id, section_number)
);
```

### วิธีดึงข้อมูล

```
invoke('get_sections_by_document', { documentId })
→ SELECT * FROM Sections WHERE document_id = ?1 ORDER BY section_group, section_number
```

Frontend filter เพิ่ม: `sections.filter(s => s.section_group === 100)` หรือ `=== 200`

### ข้อสำคัญ

- `Sections.title_th` คือ **แหล่งความจริงเดียว (Single Source of Truth)** ของชื่อหัวข้อ
- เมื่อผู้ใช้แก้ไขชื่อ Section 101 ที่หน้า Section 100 → `update_section()` จะอัปเดต `title_th` ใน Sections table
- **ไม่มี event/callback** แจ้ง component อื่นว่า title เปลี่ยน → component ที่อื่นต้อง refetch เอง

---

## 2. วิธีเก็บข้อมูลปัจจุบัน (ที่มีปัญหา)

### สถาปัตยกรรมปัจจุบัน

```
3xx.1.4 (Question, parent_id = 3xx.1)
  └── child Question (parent_id = 3xx.1.4)
       content = "คัดลอก" จาก Sections.title_th ตอนสร้าง
       metadata = { refSectionId: 5, sectionNumber: 101 }
       is_scored = true, score = 0
```

### Flow การทำงาน

```
[ผู้ใช้ check Section 101 ใน picker]
    ↓
invoke('create_question', {
    parent_id: "3xx.1.4-id",
    content: "ข้อควรระมัดระวังอันตรายพื้นฐาน",  ← COPY จาก Sections.title_th
    metadata: '{"refSectionId":5,"sectionNumber":101}',
    is_scored: true, score: 0
})
    ↓
สร้าง row ใหม่ใน Questions table
    ↓
onRefresh() → fetchQuestions() → re-render ทั้ง tree
```

### ปัญหาที่เกิดขึ้น

| #   | ปัญหา                                                     | สาเหตุรากเหง้า                                                                                                                                                 |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Title ไม่ sync** เมื่อเปลี่ยนชื่อ Section 101 ที่ต้นทาง | `Questions.content` เป็น **สำเนา** (copy) ไม่ใช่ลิงก์ (link) ไม่มีกลไก live update                                                                             |
| 2   | **UI กระพริบ / picker ไม่เปิด**                           | `useEffect` ที่ sync titles มี `childSectionRefs` ในทั้ง dependency array และ setState → **infinite loop**                                                     |
| 3   | **Multi-select ไม่ทำงาน**                                 | onClick handler มี Ctrl/Shift logic ซับซ้อนที่ conflict กับ onChange → checkbox ไม่ toggle                                                                     |
| 4   | **onRefresh() ทำลาย picker state**                        | เมื่อ create/delete child → onRefresh() → fetchQuestions() → re-render ทั้ง tree → QuestionFormCard อาจถูก unmount/remount → สูญเสีย `showSectionPicker` state |
| 5   | **ข้อมูลซ้ำซ้อน**                                         | title_th อยู่ทั้งใน Sections table และ Questions.content → ต้อง sync ตลอด                                                                                      |

---

## 3. ต้นแบบที่ทำงานดี: เอกสารอ้างอิง (Reference Documents)

### สถาปัตยกรรม

```
DocumentReferences (master table)     ← แหล่งความจริง (code, title, category)
    ↓ link by ID
SectionReferences (link table)        ← เชื่อม ref กับ section + display_order
    ↓ link by ID
QuestionReferences (link table)       ← เชื่อม ref กับ question + location_text
```

### ทำไมถึงทำงานได้ดี

| คุณสมบัติ        | Reference Documents         | Section Selector (ปัจจุบัน)     |
| ---------------- | --------------------------- | ------------------------------- |
| **เก็บข้อมูล**   | Link (FK → master)          | Copy (คัดลอก content)           |
| **Title update** | อัตโนมัติ (JOIN ดึง live)   | ต้อง sync ด้วย useEffect        |
| **CRUD**         | INSERT/DELETE ใน link table | CREATE/DELETE ทั้ง Question row |
| **ความซับซ้อน**  | ต่ำ (1 table, simple FK)    | สูง (Questions + metadata JSON) |
| **Score**        | ไม่มี (ref ไม่มีคะแนน)      | มี (ต้องเก็บ per-link)          |

### วิธี Display ของ Reference

```sql
SELECT qr.id, dr.code, dr.title, qr.location_text
FROM QuestionReferences qr
JOIN DocumentReferences dr ON qr.reference_id = dr.id
WHERE qr.question_id = ?1
```

→ **ไม่ต้อง sync อะไรเลย** เพราะ title มาจาก JOIN กับ master table

---

## 4. แนวทางแก้ไขที่เสนอ

### Option A: สร้าง Link Table ใหม่ (แนะนำ)

สร้าง `QuestionSectionLinks` table แบบเดียวกับ `QuestionReferences`:

```sql
CREATE TABLE IF NOT EXISTS QuestionSectionLinks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id   TEXT NOT NULL,          -- ID ของ 3xx.1.4 หรือ 3xx.1.5
    section_id    INTEGER NOT NULL,       -- FK → Sections.id (เช่น Section 101)
    score         INTEGER DEFAULT 0,      -- คะแนนของ link นี้
    display_order INTEGER NOT NULL,
    FOREIGN KEY (question_id) REFERENCES Questions(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES Sections(id) ON DELETE CASCADE,
    UNIQUE(question_id, section_id)
);
```

**วิธี Display:**

```sql
SELECT qsl.id, qsl.score, qsl.display_order,
       s.section_number, s.title_th
FROM QuestionSectionLinks qsl
JOIN Sections s ON qsl.section_id = s.id
WHERE qsl.question_id = ?1
ORDER BY s.section_number
```

→ **title_th มาจาก Sections table โดยตรง** → ไม่ต้อง sync

**วิธี CRUD:**

```
เลือก Section 101:
  invoke('add_question_section_link', { questionId, sectionId, score: 0 })

ยกเลิก Section 101:
  invoke('remove_question_section_link', { id })

เลือกทั้งหมด:
  invoke('add_question_section_links_batch', { questionId, sectionIds })

ยกเลิกทั้งหมด:
  invoke('remove_question_section_links_by_question', { questionId })
```

**วิธี Score:**

```
แก้คะแนน:
  invoke('update_question_section_link_score', { id, score })

คำนวณรวม:
  SELECT SUM(score) FROM QuestionSectionLinks WHERE question_id = ?1
  → อัปเดตไปที่ 3xx.1.4 group_score → sum ขึ้น 3xx.1 → total
```

#### ข้อดี

- ✅ **ไม่ต้อง sync title** → JOIN ดึง live จาก Sections
- ✅ **ไม่มี infinite loop** → ไม่ต้อง useEffect sync
- ✅ **CRUD ง่าย** → INSERT/DELETE ใน link table เดียว
- ✅ **Multi-select ง่าย** → batch INSERT
- ✅ **ตามแบบ Reference Documents** → pattern เดียวกัน ดูแลง่าย
- ✅ **Score per-link** → รองรับคะแนนแต่ละ section
- ✅ **Cascade delete** → ลบ Section 101 → auto ลบ link
- ✅ **onRefresh ไม่ทำลาย state** → picker ไม่ต้องอยู่ใน QuestionFormCard

#### ข้อเสีย

- ต้องสร้าง table ใหม่ + migration
- ต้องสร้าง Rust backend commands ใหม่ 5-6 ตัว
- ต้องสร้าง frontend component ใหม่ (แต่สามารถเอา pattern จาก Reference ได้)
- ต้องลบ child Questions เก่าที่สร้างไว้แล้ว (data migration)

---

### Option B: แก้ไข approach ปัจจุบัน (ไม่แนะนำ)

แก้ bugs ทีละตัว:

1. แก้ infinite loop ด้วย `useRef` + comparison
2. แก้ multi-select ด้วย simplification
3. แก้ title sync ด้วย polling interval

#### ข้อเสีย

- ⚠️ ยังคงเป็น "copy" ไม่ใช่ "link" → ต้อง sync ตลอด
- ⚠️ ซับซ้อน: สร้าง/ลบ Question records เต็มรูปแบบ
- ⚠️ onRefresh ยังอาจทำลาย state
- ⚠️ ไม่สอดคล้องกับ pattern ที่มีอยู่ (References)

---

## 5. เปรียบเทียบ Data Flow

### ปัจจุบัน (Copy-based)

```
Sections.title_th ──[copy]──→ Questions.content
                                    ↑
                              ต้อง sync ด้วย
                              useEffect (buggy)
```

### แนวทางใหม่ (Link-based)

```
Sections.title_th ←──[JOIN]── QuestionSectionLinks.section_id
                                    ↑
                              ไม่ต้อง sync
                              (always live)
```

---

## 6. แผนงาน (ถ้าเลือก Option A)

| ลำดับ | งาน                                                             | ประมาณ    |
| ----- | --------------------------------------------------------------- | --------- |
| 1     | สร้าง `QuestionSectionLinks` table + migration                  | Backend   |
| 2     | สร้าง Rust commands (CRUD + batch + score)                      | Backend   |
| 3     | สร้าง Tauri command bindings ใน `main.rs`                       | Backend   |
| 4     | สร้าง `get_question_section_links` query (JOIN Sections)        | Backend   |
| 5     | ลบ code เก่าใน `QuestionFormCard` (section picker + sync logic) | Frontend  |
| 6     | สร้าง Section Picker component ใหม่ (แบบ Reference picker)      | Frontend  |
| 7     | แสดง linked sections ใน display mode (ใช้ข้อมูลจาก JOIN)        | Frontend  |
| 8     | เพิ่ม score editor สำหรับแต่ละ link                             | Frontend  |
| 9     | Data migration: ลบ child Questions เก่า + สร้าง links ใหม่      | Migration |
| 10    | ทดสอบ scoring chain                                             | Testing   |
