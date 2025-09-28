# 🔧 คู่มือ Debug การเข้าสู่ระบบ

## 🚨 **ปัญหาที่พบ**
- เข้าสู่ระบบไม่ได้
- ต้องการตรวจสอบ authentication flow

## 🛠️ **เครื่องมือ Debug ที่สร้างขึ้น**

### **1. Auth Test Page (ภายใน Desktop App)**
- **URL**: `http://localhost:1420/auth-test` (ต้องเปิดใน Desktop App เท่านั้น)
- **ฟังก์ชัน**: ทดสอบ authentication flow ทั้งหมด
- **การใช้งาน**: 
  - กดปุ่ม "Test Database & Auth" - ทดสอบ database และ authentication
  - กดปุ่ม "Test Sign In Service" - ทดสอบ Sign In service

### **2. Debug Command**
- **Command**: `debug_get_all_users`
- **ฟังก์ชัน**: แสดงข้อมูล users ทั้งหมดใน console
- **การใช้งาน**: เรียกผ่าน Tauri invoke

## 🔍 **ขั้นตอนการ Debug**

### **ขั้นตอนที่ 1: เปิด Auth Test Page**
1. เปิดแอป PQS RTN (Desktop App)
2. ไปที่ URL: `http://localhost:1420/auth-test`
3. กดปุ่ม "Test Database & Auth" เพื่อทดสอบ database
4. กดปุ่ม "Test Sign In Service" เพื่อทดสอบ Sign In
5. ดูผลลัพธ์ในหน้า

### **ขั้นตอนที่ 2: ตรวจสอบ Console**
1. เปิด Developer Tools (F12)
2. ไปที่ tab "Console"
3. ดู debug messages จาก Rust backend

### **ขั้นตอนที่ 3: ตรวจสอบ Database**
1. เปิด SQLite Browser
2. เปิดไฟล์: `C:\Users\Thaweesak\AppData\Roaming\pqs-rtn\app.db`
3. ตรวจสอบตาราง `users`

## 📊 **ข้อมูลที่ควรเห็น**

### **ใน Auth Test Page:**
```
🔍 Testing Tauri availability...
✅ Tauri is available
📊 Testing database connection...
✅ Database connected. Found 1 users
👤 User 1: thaweesak (davide@gmail.com) - Role: admin
🔐 Testing authentication...
✅ Authentication successful!
👤 User: thaweesak (Thaweesak)
📧 Email: davide@gmail.com
🎖️ Rank: ร.ต.
🔑 Role: admin
✅ Active: Yes
```

### **ใน Console:**
```
🔍 Debug: Getting all users...
✅ Found 1 users: [User { id: Some(1), username: "thaweesak", ... }]
```

### **ใน Database:**
```sql
SELECT * FROM users;
-- ควรเห็น 1 record: thaweesak, davide@gmail.com, Thaweesak&21, admin
```

## 🐛 **ปัญหาที่อาจพบ**

### **1. "Tauri is NOT available"**
- **สาเหตุ**: เปิดใน browser แทน Tauri app
- **แก้ไข**: เปิดผ่าน Tauri app เท่านั้น

### **2. "Database connection failed"**
- **สาเหตุ**: Database ไม่ได้ initialize
- **แก้ไข**: รีสตาร์ทแอป

### **3. "No users found"**
- **สาเหตุ**: Admin user ไม่ได้ถูกสร้าง
- **แก้ไข**: ตรวจสอบ `initialize_database` function

### **4. "Auth result: null"**
- **สาเหตุ**: Username/password ไม่ตรง
- **แก้ไข**: ตรวจสอบข้อมูลใน database

## 🔧 **การแก้ไขปัญหา**

### **ถ้าไม่มี users ใน database:**
1. รีสตาร์ทแอป
2. ตรวจสอบ console ว่า "Database initialized successfully"
3. ใช้ Auth Test Page ตรวจสอบ

### **ถ้า authentication ล้มเหลว:**
1. ตรวจสอบ password ใน database
2. ตรวจสอบ `is_active` field
3. ตรวจสอบ schema ตรงกันหรือไม่

### **ถ้า Tauri commands ไม่ทำงาน:**
1. ตรวจสอบ `main.rs` มี command ครบหรือไม่
2. ตรวจสอบ `invoke_handler` register commands
3. รีสตาร์ทแอป

## 📝 **ข้อมูลทดสอบ**

### **Admin User:**
- **Username**: `thaweesak`
- **Email**: `davide@gmail.com`
- **Password**: `Thaweesak&21`
- **Role**: `admin`

### **Test Commands:**
```javascript
// ใน browser console
const { invoke } = window.__TAURI__.tauri;

// Test get all users
const users = await invoke('debug_get_all_users');
console.log('Users:', users);

// Test authentication
const auth = await invoke('authenticate_user', {
  username_or_email: 'thaweesak',
  password_hash: 'Thaweesak&21'
});
console.log('Auth:', auth);
```

---

**พร้อม Debug แล้ว! 🚀**

ใช้ Auth Test Page เพื่อตรวจสอบปัญหาและแก้ไขให้เข้าสู่ระบบได้
