# 🔐 ข้อมูลสำหรับทดสอบ Sign In

## 📊 **ข้อมูล User ที่มีอยู่ใน Database**

### **Admin User (Default)**
- **Username**: `thaweesak`
- **Email**: `davide@gmail.com`
- **Full Name**: `Thaweesak`
- **Rank**: `ร.ต.`
- **Password**: `Thaweesak&21`
- **Role**: `admin`

## 🧪 **ข้อมูลทดสอบ Sign In**

### **ทดสอบที่ 1: เข้าสู่ระบบด้วย Username**
- **Username/Email**: `thaweesak`
- **Password**: `Thaweesak&21`
- **Expected Result**: ✅ เข้าสู่ระบบสำเร็จ → Redirect ไป `/dashboard`

### **ทดสอบที่ 2: เข้าสู่ระบบด้วย Email**
- **Username/Email**: `davide@gmail.com`
- **Password**: `Thaweesak&21`
- **Expected Result**: ✅ เข้าสู่ระบบสำเร็จ → Redirect ไป `/dashboard`

### **ทดสอบที่ 3: รหัสผ่านผิด**
- **Username/Email**: `thaweesak`
- **Password**: `wrongpassword`
- **Expected Result**: ❌ "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"

### **ทดสอบที่ 4: Username ไม่มีอยู่**
- **Username/Email**: `nonexistent`
- **Password**: `anypassword`
- **Expected Result**: ❌ "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"

## 🔍 **ตรวจสอบ Database Schema**

### **ตาราง users ควรมี fields:**
```sql
- id (INTEGER PRIMARY KEY)
- username (TEXT UNIQUE NOT NULL)
- email (TEXT UNIQUE NOT NULL)
- password_hash (TEXT NOT NULL)
- full_name (TEXT NOT NULL)
- rank (TEXT)
- role (TEXT NOT NULL DEFAULT 'visitor')
- is_active (BOOLEAN NOT NULL DEFAULT 1)
- avatar_path (TEXT)
- avatar_updated_at (DATETIME)
- avatar_mime (TEXT)
- avatar_size (INTEGER)
- created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
- updated_at (DATETIME DEFAULT CURRENT_TIMESTAMP)
```

## 🚀 **ขั้นตอนการทดสอบ**

### **1. เปิดแอป PQS RTN**
- รอให้แอปเปิดเสร็จ
- ตรวจสอบว่าแสดงหน้า Sign In

### **2. ทดสอบ Sign In**
1. **กรอกข้อมูล** ตามข้อมูลทดสอบด้านบน
2. **กดปุ่ม "เข้าสู่ระบบ"**
3. **ตรวจสอบผลลัพธ์**:
   - ✅ **สำเร็จ**: ควร redirect ไป `/dashboard`
   - ❌ **ผิดพลาด**: ควรแสดง error message

### **3. ตรวจสอบ User Context**
- ตรวจสอบว่า user data ถูกโหลดใน AuthContext
- ตรวจสอบ localStorage มี `pqs_user` และ `pqs_token`

## 🐛 **ปัญหาที่อาจพบ**

### **1. "Not running in Tauri environment"**
- **สาเหตุ**: เปิดใน browser แทน Tauri app
- **แก้ไข**: เปิดผ่าน Tauri app เท่านั้น

### **2. "Database connection failed"**
- **สาเหตุ**: Database ไม่ได้ initialize
- **แก้ไข**: รีสตาร์ทแอป

### **3. "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"**
- **สาเหตุ**: ข้อมูลไม่ตรงกับ database
- **แก้ไข**: ใช้ข้อมูลทดสอบที่ถูกต้อง

### **4. Schema mismatch error**
- **สาเหตุ**: Database schema ไม่ตรงกับ code
- **แก้ไข**: ลบไฟล์ database และให้แอปสร้างใหม่

## 📝 **หมายเหตุ**

- **Password**: ตอนนี้ยังเก็บ plain text (ควร hash ใน production)
- **Auto-login**: หลังลงทะเบียนสำเร็จจะ auto-login
- **Role-based Redirect**: 
  - `admin` → `/dashboard`
  - `editor` → `/editor`
  - `visitor` → `/visitor`

---

**พร้อมทดสอบ Sign In แล้ว! 🎉**
