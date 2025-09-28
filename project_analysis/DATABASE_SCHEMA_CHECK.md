# 🔍 คู่มือตรวจสอบ Database Schema

## 📊 **Database Schema ที่ถูกต้อง**

### **Users Table:**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,           -- ← มี field นี้อยู่
    rank TEXT,
    role TEXT NOT NULL DEFAULT 'visitor',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    avatar_path TEXT,
    avatar_updated_at DATETIME,
    avatar_mime TEXT,
    avatar_size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### **Avatars Table:**
```sql
CREATE TABLE avatars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    avatar_data BLOB NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
)
```

## 🛠️ **วิธีตรวจสอบ Database Schema**

### **1. ใช้ SQLite Browser**
1. เปิด SQLite Browser
2. เปิดไฟล์: `%APPDATA%\com.pqs-rtn-tauri.dev\data\pqs_rtn.db`
3. ไปที่ tab **"Database Structure"**
4. คลิกที่ table **"users"**
5. ดู columns ที่มี

### **2. ใช้ SQLite Command Line**
```bash
# เปิด SQLite CLI
sqlite3 "%APPDATA%\com.pqs-rtn-tauri.dev\data\pqs_rtn.db"

# ดู schema ของ users table
.schema users

# ดูข้อมูลใน users table
SELECT * FROM users;

# ดู columns ของ users table
PRAGMA table_info(users);
```

### **3. ใช้ Auth Test Page**
1. ไปที่ **Auth Test** ใน SlideBar
2. กดปุ่ม **"Test Database & Auth"**
3. ดูผลลัพธ์ใน console

## 🔍 **ข้อมูลทดสอบที่ควรเห็น**

### **User Record:**
```
id: 1
username: "thaweesak"
email: "davide@gmail.com"
password_hash: "Thaweesak&21"
full_name: "Thaweesak"        -- ← ควรมี field นี้
rank: "ร.ต."
role: "admin"
is_active: 1
avatar_path: null
avatar_updated_at: null
avatar_mime: null
avatar_size: null
created_at: "2025-09-13 08:18:56"
updated_at: "2025-09-13 08:18:56"
```

## 🐛 **ปัญหาที่อาจเกิดขึ้น**

### **1. SQLite Viewer แสดงชื่อ Field ผิด**
- บาง tool แสดง `full_name` เป็น `Full Name`
- บาง tool แสดง `full_name` เป็น `full_name`
- **แก้ไข**: ใช้ SQL query `PRAGMA table_info(users);`

### **2. Database ไม่มี full_name Field**
- เกิดจาก migration ไม่ทำงาน
- **แก้ไข**: ลบ database และสร้างใหม่

### **3. Data ไม่ตรงกับ Schema**
- เกิดจาก migration ไม่สมบูรณ์
- **แก้ไข**: ตรวจสอบ migration logic

## ✅ **การยืนยัน Schema**

### **Console Logs ที่ถูกต้อง:**
```
🔍 SafeInvoke Result: {
  id: 1,
  username: "thaweesak",
  email: "davide@gmail.com",
  password_hash: "Thaweesak&21",
  full_name: "Thaweesak",        -- ← ต้องมี field นี้
  rank: "ร.ต.",
  role: "admin",
  is_active: true,
  ...
}
```

---

**Database Schema ถูกต้องแล้ว! Sign In ทำงานได้แล้วครับ! 🎉**
