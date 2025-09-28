# 🧪 การทดสอบ Admin Login

## ข้อมูลการทดสอบ
- **Username**: `thaweesak`
- **Password**: `Thaweesak&21`
- **Email**: `davide@gmail.com`
- **Role**: `admin`

## ขั้นตอนการทดสอบ

### 1. ตรวจสอบการเริ่มต้น App
- [ ] App เริ่มต้นได้ปกติ
- [ ] Database ถูก initialize อัตโนมัติ
- [ ] ไม่มี error ใน terminal

### 2. ทดสอบการ Sign In
- [ ] เปิดหน้า Sign In
- [ ] กรอก Username: `thaweesak`
- [ ] กรอก Password: `Thaweesak&21`
- [ ] กดปุ่ม Sign In
- [ ] เข้าสู่ระบบได้สำเร็จ
- [ ] ถูก redirect ไปหน้า Dashboard

### 3. ทดสอบการแก้ไข User
- [ ] ไปหน้า User Management
- [ ] แก้ไข Username ของ user อื่น
- [ ] แก้ไข Password ของ user อื่น
- [ ] บันทึกการเปลี่ยนแปลง
- [ ] ตรวจสอบว่าข้อมูลถูกอัปเดตใน database

### 4. ทดสอบการ Restart
- [ ] ปิด app
- [ ] เปิด app ใหม่
- [ ] ตรวจสอบว่า database ยังคงข้อมูลเดิม
- [ ] ทดสอบ Sign In อีกครั้ง

## ผลลัพธ์ที่คาดหวัง
- ✅ Admin สามารถ Sign In ได้
- ✅ การแก้ไข Username/Password ทำงานได้
- ✅ Database ไม่มีปัญหาเมื่อ Restart
- ✅ ไม่มี warning ใน Terminal
