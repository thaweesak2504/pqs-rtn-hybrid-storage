# 🔧 คู่มือการใช้งาน Auth Test Page

## 🎯 **วิธีการเข้าถึง Auth Test Page**

### **ใน Desktop App:**
1. เปิดแอป PQS RTN
2. คลิกที่ **Hamburger Menu** (☰) ที่มุมซ้ายบน
3. เลือก **"Auth Test"** จากเมนู
4. หน้าจะแสดง Auth Test Page

### **ไอคอน:**
- 🐛 **Bug Icon** - แสดงในเมนู SlideBar

## 🛠️ **ฟีเจอร์ใน Auth Test Page**

### **ปุ่มทดสอบ 2 ปุ่ม:**

#### **1. "Test Database & Auth" (สีน้ำเงิน)**
- ทดสอบการเชื่อมต่อ Tauri
- ทดสอบการเชื่อมต่อ Database
- แสดงจำนวน users ใน database
- แสดงรายละเอียด users
- ทดสอบ authentication โดยตรง

#### **2. "Test Sign In Service" (สีเขียว)**
- ทดสอบ Sign In service
- ทดสอบ AuthContext
- แสดงผลลัพธ์การเข้าสู่ระบบ

## 📊 **ข้อมูลที่แสดง**

### **เมื่อทดสอบสำเร็จ:**
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

### **เมื่อทดสอบ Sign In Service:**
```
🔐 Testing Sign In with AuthContext...
✅ Sign In successful!
👤 User: thaweesak (Thaweesak)
📧 Email: davide@gmail.com
🎖️ Rank: ร.ต.
🔑 Role: admin
✅ Active: Yes
```

## 🐛 **การแก้ไขปัญหา**

### **ถ้าแสดง "Tauri is NOT available":**
- ตรวจสอบว่าเปิดใน Desktop App เท่านั้น
- ไม่สามารถใช้ใน browser ได้

### **ถ้าแสดง "No users found":**
- Database ไม่ได้ initialize
- รีสตาร์ทแอป

### **ถ้าแสดง "Authentication failed":**
- ตรวจสอบข้อมูลใน database
- ตรวจสอบ password

## 🎯 **ข้อมูลทดสอบ**

### **Admin User:**
- **Username**: `thaweesak`
- **Email**: `davide@gmail.com`
- **Password**: `Thaweesak&21`
- **Role**: `admin`

## 📝 **หมายเหตุ**

- **Auth Test Page** ใช้สำหรับ debug เท่านั้น
- ไม่ควรแสดงใน production
- ใช้เพื่อตรวจสอบปัญหา authentication
- แสดงข้อมูลละเอียดของ users และ database

---

**พร้อมใช้งานแล้ว! 🚀**

เปิด SlideBar และเลือก "Auth Test" เพื่อทดสอบการเข้าสู่ระบบ
