# 🔍 คู่มือ Debug การเข้าสู่ระบบด้วย Username

## 🐛 **ปัญหาที่พบ**
- เข้าสู่ระบบด้วย **email** (`davide@gmail.com`) ได้ ✅
- เข้าสู่ระบบด้วย **username** (`thaweesak`) ไม่ได้ ❌

## 🧪 **การทดสอบ**

### **ใช้ Auth Test Page:**
1. เปิด SlideBar และเลือก "Auth Test"
2. กดปุ่ม **"Test Database & Auth"** เพื่อทดสอบ:
   - Authentication with username: `thaweesak`
   - Authentication with email: `davide@gmail.com`
3. กดปุ่ม **"Test Sign In Service"** เพื่อทดสอบ:
   - Sign In with username: `thaweesak`
   - Sign In with email: `davide@gmail.com`

## 📊 **ผลลัพธ์ที่คาดหวัง**

### **ถ้าทำงานถูกต้อง:**
```
🔐 Testing authentication with username...
✅ Authentication with username successful!
👤 User: thaweesak (Thaweesak)
📧 Email: davide@gmail.com
🎖️ Rank: ร.ต.
🔑 Role: admin
✅ Active: Yes

🔐 Testing authentication with email...
✅ Authentication with email successful!
👤 User: thaweesak (Thaweesak)
📧 Email: davide@gmail.com
🎖️ Rank: ร.ต.
🔑 Role: admin
✅ Active: Yes
```

### **ถ้ามีปัญหา:**
```
🔐 Testing authentication with username...
❌ Authentication with username failed

🔐 Testing authentication with email...
✅ Authentication with email successful!
```

## 🔍 **การตรวจสอบ**

### **1. ตรวจสอบ Database**
```sql
SELECT username, email FROM users WHERE username = 'thaweesak';
-- ควรได้: thaweesak, davide@gmail.com
```

### **2. ตรวจสอบ SQL Query**
```sql
SELECT * FROM users 
WHERE (email = 'thaweesak' OR username = 'thaweesak') 
AND password_hash = 'Thaweesak&21' 
AND is_active = 1;
-- ควรได้ 1 record
```

### **3. ตรวจสอบ Console Logs**
- ดู debug messages จาก Rust backend
- ตรวจสอบ error messages

## 🐛 **สาเหตุที่เป็นไปได้**

### **1. Username Case Sensitivity**
- Database อาจเก็บ username เป็น `Thaweesak` (ตัวใหญ่)
- แต่เราพิมพ์ `thaweesak` (ตัวเล็ก)

### **2. Username มี Space หรือ Special Characters**
- Username อาจมี space หรือ characters พิเศษ
- ต้องตรวจสอบใน database

### **3. SQL Query Issue**
- Query อาจมีปัญหาในการเปรียบเทียบ username
- ต้องตรวจสอบ SQL syntax

## 🔧 **การแก้ไข**

### **ถ้าเป็น Case Sensitivity:**
```sql
-- ใช้ LOWER() function
SELECT * FROM users 
WHERE (LOWER(email) = LOWER('thaweesak') OR LOWER(username) = LOWER('thaweesak')) 
AND password_hash = 'Thaweesak&21' 
AND is_active = 1;
```

### **ถ้าเป็น Space Issue:**
```sql
-- ใช้ TRIM() function
SELECT * FROM users 
WHERE (TRIM(email) = TRIM('thaweesak') OR TRIM(username) = TRIM('thaweesak')) 
AND password_hash = 'Thaweesak&21' 
AND is_active = 1;
```

## 📝 **ข้อมูลทดสอบ**

### **Admin User:**
- **Username**: `thaweesak`
- **Email**: `davide@gmail.com`
- **Password**: `Thaweesak&21`
- **Role**: `admin`

---

**ใช้ Auth Test Page เพื่อทดสอบและดูผลลัพธ์! 🚀**
