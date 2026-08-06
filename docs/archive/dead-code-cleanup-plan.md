# รายงานการสำรวจและแผนการทำความสะอาดโค้ด (Dead Code Cleanup)

จากการตรวจสอบเบื้องต้นในโครงการนี้ พบโค้ดที่ไม่ได้ใช้งาน (Dead Code) และโค้ดที่ถูกยกเลิกการใช้งานแล้ว (Deprecated) หลายส่วน ซึ่งเกิดจากการเปลี่ยนสถาปัตยกรรมจากระบบจัดเก็บข้อมูลแบบ BLOB ในฐานข้อมูลดั้งเดิม มาเป็นระบบ Hybrid Storage (ฐานข้อมูล + ไฟล์ใน Filesystem)

## ข้อมูลสรุปของการสำรวจ

| ส่วนงาน | ไฟล์ | ปริมาณโค้ด (ประมาณ) | รายละเอียด |
| :--- | :--- | :--- | :--- |
| **Database Logger** | `database_logger.rs` | 223 บรรทัด | ถูกปิดใช้งานถาวร (DISABLED) ทั้งจาก `main.rs` และ `database.rs` |
| **Legacy Avatar System** | `database.rs` | ~150 บรรทัด | ฟังก์ชันจัดการรูปโปรไฟล์แบบ BLOB เดิมที่ถูกแทนที่ด้วย `hybrid_avatar.rs` |
| **Disabled Commands** | `main.rs` | ~20 บรรทัด | คำสั่ง Tauri ที่ถูก Comment ทิ้งไว้ |
| **Total** | | **~400+ บรรทัด** | |

## 1. การวิเคราะห์ผลกระทบ (Impact Analysis)

### ผลกระทบต่อการทำงาน (Functional Impact)
- **ไม่มีผลกระทบ**: เนื่องจากโค้ดส่วนใหญ่ถูกระบุไว้อย่างชัดเจนว่า `DEPRECATED` หรือถูกเปลี่ยนเป็นฟังก์ชันว่าง (No-op) เรียบร้อยแล้ว ระบบปัจจุบันใน Branch `content-database-splitting` ไม่ได้เรียกใช้โค้ดเหล่านี้ในการทำงานจริง

### ข้อดีของการกำจัดออก (Benefits)
- **ลด "เสียงรบกวน" ใน Codebase**: ช่วยให้ผู้พัฒนารุ่นหลังไม่สับสนระหว่างระบบเก่า (BLOB) และระบบใหม่ (Hybrid)
- **ประหยัดทรัพยากรการซ่อมบำรุง**: ไม่ต้องเสียเวลาแก้ Lint หรือ Warnings ในส่วนที่ไม่ได้ใช้งาน
- **ความปลอดภัย**: ลดโอกาสที่มีโค้ดเก่าถูกเรียกใช้โดยไม่ตั้งใจ (Unintended execution)

---

## 2. แผนการดำเนินการ (Proposed Changes)

### [Component] Rust Backend (src-tauri)

#### [DELETE] [database_logger.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/database_logger.rs)
- ลบไฟล์ระบบ Logger เก่าทิ้งทั้งหมด เนื่องจากปัจจุบันใช้ `logger.rs` หรือระบบ Standard Print แทนแล้ว

#### [MODIFY] [database.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/database.rs)
- ลบโครงสร้าง `Avatar` (Lines 31-40)
- ลบฟังก์ชัน `validate_avatar_data`, `cleanup_orphaned_avatars`, `get_all_avatars`, `get_avatar_by_user_id`, `save_avatar`, `delete_avatar` และ `HighRankingAvatar` ที่หมดอายุการใช้งานแล้ว
- ทำความสะอาด Comment ที่อ้างอิงถึงระบบเก่า

#### [MODIFY] [main.rs](file:///d:/pqs-rtn-hybrid-storage/src-tauri/src/main.rs)
- ลบฟังก์ชันที่ถูก Comment ทิ้ง (`get_database_logs`, `clear_database_logs`)
- ลบการประกาศ `mod database_logger;`

---

## 3. ขั้นตอนการตรวจสอบ (Verification Plan)

### Automated Tests
1. รัน `cargo check` เพื่อตรวจสอบว่าไม่มีโมดูลอื่นแอบเรียกใช้งาน
2. รัน `cargo test` เพื่อยืนยันว่าฟังก์ชันที่เหลือยังทำงานถูกต้อง

### Manual Verification
- รันแอปพลิเคชันและทดสอบการจัดการเอกสาร PQS เพื่อให้มั่นใจว่าการลบโค้ดส่วนกลาง (Shared Database logic) ไม่กระทบต่อระบบใหม่
