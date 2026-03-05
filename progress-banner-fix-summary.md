# การแก้ไขปัญหาการแสดงผลความก้าวหน้า (ScoreProgressBanner)

## รายงานความคืบหน้า - 5 มี.ค. 2026 (อัปเดตล่าสุด 18:05)

### 🎯 ปัญหาที่พบ

- **ScoreProgressBanner ไม่แสดงความก้าวหน้า** หลังจาก Qualifier ประเมินผล
- Banner แสดง "ยังไม่มีข้อมูลคะแนนในส่วนนี้" แม้มีข้อมูลจริงในฐานข้อมูล

### 🔍 การวิเคราะห์ Root Cause

#### 1. ปัญหาหลัก (ฝั่ง Rust Backend)

**ไฟล์**: `src-tauri/src/content_database.rs`  
**ฟังก์ชัน**: `get_section_progress`

```sql
-- Query ที่มีปัญหา
SELECT COUNT(*) FROM Questions
WHERE section_id = ?1
  AND question_type != 'exempted'
  AND is_group_header = 0
  AND id NOT IN (SELECT DISTINCT parent_id FROM Questions
                 WHERE parent_id IS NOT NULL AND section_id = ?1)  -- BUG: ใช้ ?1 ซ้ำ
```

**สาเหตุ**: `rusqlite` ใช้ positional parameters (`?1, ?2, ?3`)  
เมื่อ query ใช้ `?1` ซ้ำ 2 ครั้ง แต่ `params![section_id, section_id]` ส่ง 2 params  
ทำให้ subquery ไม่ได้ค่าที่ถูกต้อง → `total_questions = 0`

**แก้ไข**: เปลี่ยน subquery ให้ใช้ `?2`

```sql
AND id NOT IN (... AND section_id = ?2)  -- แก้ไขแล้ว
```

#### 2. ปัญหาฝั่ง Frontend (React)

**ไฟล์**: `src/components/editor_v2/ScoreProgressBanner.tsx`

| Bug                         | สาเหตุ                                     | แก้ไข                                              |
| --------------------------- | ------------------------------------------ | -------------------------------------------------- |
| Banner ติด loading skeleton | `sectionId=0` แต่ไม่ set `loading(false)`  | เพิ่ม `setLoading(false)` ใน early return          |
| Banner แสดง "ไม่มีข้อมูล"   | `max_score=0` บล็อก banner แม้มี questions | เปลี่ยนเป็น `max_score=0 && total_questions=0`     |
| TypeScript error            | Interface ขาด fields                       | เพิ่ม `total_questions?`, `passed_questions?`      |
| ไม่รองรับ count-based mode  | แสดงแค่ score                              | เพิ่ม `isCountMode` logic และแสดง "ข้อที่ผ่าน X/Y" |

### ✅ สถานะปัญหาที่แก้ไขแล้ว

#### Section 100 (Fundamentals)

- ✅ **แสดงผลถูกต้องแล้ว**
- ✅ Banner แสดง "ข้อที่ผ่าน ๑/๒๗ ข้อ (4%)"
- ✅ Refresh หลัง assessment ทำงานถูกต้อง
- ✅ รองรับ count-based scoring (max_score=0)

#### Section 200 (Systems) - **แก้ไขแล้ว รอทดสอบ**

- ✅ **`total_questions` นับถูกต้องแล้ว** — parse JSON metadata นับ sub-codes
- ✅ **`passed_questions` นับถูกต้องแล้ว** — ใช้ `COUNT(*)` แทน `COUNT(DISTINCT question_id)`
- 🔄 รอ Rust recompile แล้วทดสอบ

**ปัญหาที่พบและแก้ไข**:

- Section 200 คำถามแต่ละข้อมี `answerKeys` object ใน metadata เช่น `{22111: "...", 22112: "..."}`
- แต่ละ key = 1 Answer Key box = 1 `TraineeAnswerBox`
- Rust เดิมนับ `COUNT(*) questions` = 28 แต่ Box จริงมี 40
- แก้ไข: parse metadata JSON แล้วนับ keys ใน `answerKeys`
- แก้ไข: `passed_questions` ใช้ `COUNT(*)` เพราะ UserAnswers เก็บแยก `sub_question_code`

#### Section 300 (Watch Stations) - **ซ่อน Banner แล้ว**

- ✅ **ลบ Banner ออกจาก `Pqs300SectionEditor` แล้ว**
- ℹ️ **เหตุผล**: `showAnswerBox = false` เสมอสำหรับ Section 300 (`is300=true`) ดังนั้นไม่มี `TraineeAnswerBox` เลย — ไม่ควรแสดง Banner
- ℹ️ Section 300 ใช้ `required_instance` questions ที่มี `requireAnswerKey` ใน metadata (ไม่ใช่ `answerKey`/`answerKeys`) — Rust รองรับแล้วแต่ไม่มี Banner แสดง

### � ไฟล์ที่แก้ไขทั้งหมด

#### Backend (Rust) — `src-tauri/src/content_database.rs`

| การแก้ไข                                     | รายละเอียด                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `?1` → `?2` ใน subquery                      | แก้ rusqlite parameter binding bug ทำให้ `total_questions=0`                                    |
| `COUNT(*)` แทน `COUNT(DISTINCT question_id)` | `passed_questions` และ `pending_with_answer` นับ sub-code pairs ถูกต้อง                         |
| Parse JSON metadata                          | `total_questions` นับ Answer Key boxes จาก `answerKeys` keys / `answerKey` / `requireAnswerKey` |

#### Frontend (React)

| ไฟล์                                                                     | การแก้ไข                                                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `ScoreProgressBanner.tsx`                                                | แก้ 3 bugs: sectionId=0 loading, max_score=0 condition, count-based mode display |
| `Pqs300SectionEditor.tsx`                                                | ลบ Banner ออก — Section 300 ไม่มี TraineeAnswerBox (is300=true)                  |
| `PqsQuestionSection.tsx`, `TraineeAnswerBox.tsx`, `PqsSectionEditor.tsx` | ลบ debug logs                                                                    |

### 🧪 วิธีการทดสอบ

1. เปิด document → Qualifier mode
2. Section 100: Banner แสดง "ข้อที่ผ่าน X/Y ข้อ"
3. Section 200: Banner แสดงตามจำนวน Answer Key boxes (ทุก sub-code)
4. Section 300: ไม่มี Banner (by design)
5. กด "ผ่าน" → Banner refresh ทันที

### 🎯 สถานะสุดท้าย

| Section | Banner               | การนับ                     | หมายเหตุ              |
| ------- | -------------------- | -------------------------- | --------------------- |
| **100** | ✅ แสดงถูกต้อง       | `answerKey` × 1 ต่อคำถาม   | ทดสอบแล้ว             |
| **200** | ✅ แก้ไขแล้ว รอทดสอบ | `answerKeys` keys ต่อคำถาม | Rust recompile แล้ว   |
| **300** | ✅ ลบออก (by design) | ไม่มี TraineeAnswerBox     | `showAnswerBox=false` |

---

**สถานะปัจจุบัน**: Section 100 ✅ | Section 200 ✅ (รอทดสอบ) | Section 300 ✅ (ไม่มี Banner)
