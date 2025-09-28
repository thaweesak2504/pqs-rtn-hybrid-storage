# 🧪 คู่มือทดสอบการลงทะเบียน

## ✅ **การแก้ไขที่เสร็จแล้ว**

### **1. AuthService Functions**
- ✅ แก้ไข `createUserAccount` function ให้รับ object parameters
- ✅ เพิ่ม return type ที่มี `success`, `user`, และ `error`
- ✅ เพิ่ม error handling ที่ดีขึ้น

### **2. Registration Form**
- ✅ ใช้ `createUserAccount` ถูกต้อง
- ✅ Auto-login หลังลงทะเบียนสำเร็จ
- ✅ Redirect ตาม user role

## 🎯 **Fields ที่ต้องกรอก**

### **Required Fields:**
- ✅ **Username** - ต้องกรอก (Case-sensitive)
- ✅ **Email** - ต้องกรอก (ต้องเป็น email format)
- ✅ **Password** - ต้องกรอก (ต้องผ่าน validation)
- ✅ **Confirm Password** - ต้องกรอก (ต้องตรงกับ Password)
- ✅ **Full Name** - ต้องกรอก

### **Optional Fields:**
- ✅ **Rank** - ไม่บังคับ (Dropdown)

## 🧪 **ขั้นตอนการทดสอบ**

### **1. ไปที่หน้า Registration**
1. เปิด SlideBar
2. เลือก **"Registration"** (ถ้าไม่ได้เข้าสู่ระบบ)
3. หรือไปที่ `/registration` โดยตรง

### **2. ทดสอบการลงทะเบียน User คนที่ 1**

#### **ข้อมูลทดสอบ:**
```
Username: testuser1
Email: testuser1@example.com
Password: TestPass123!
Confirm Password: TestPass123!
Full Name: Test User One
Rank: จ.ต.
```

#### **ขั้นตอน:**
1. กรอกข้อมูลทั้งหมด
2. ตรวจสอบ Password Validation (ต้องผ่านทุกข้อ)
3. กดปุ่ม **"ลงทะเบียน"**
4. รอให้ลงทะเบียนสำเร็จ
5. ควรเข้าสู่ระบบอัตโนมัติและไปที่ `/visitor`

### **3. ทดสอบการลงทะเบียน User คนที่ 2**

#### **ข้อมูลทดสอบ:**
```
Username: testuser2
Email: testuser2@example.com
Password: MyPassword456!
Confirm Password: MyPassword456!
Full Name: Test User Two
Rank: ร.ท.
```

#### **ขั้นตอน:**
1. ออกจากระบบก่อน (Sign Out)
2. ไปที่หน้า Registration
3. กรอกข้อมูลทั้งหมด
4. กดปุ่ม **"ลงทะเบียน"**
5. รอให้ลงทะเบียนสำเร็จ

### **4. ตรวจสอบผลลัพธ์**

#### **A. Console Logs:**
```
🔍 SafeInvoke Debug: {
  command: "create_user",
  args: {
    username: "testuser1",
    email: "testuser1@example.com",
    passwordHash: "TestPass123!",
    fullName: "Test User One",
    rank: "จ.ต.",
    role: "visitor"
  }
}

🔍 SafeInvoke Result: {
  id: 2,
  username: "testuser1",
  email: "testuser1@example.com",
  full_name: "Test User One",
  rank: "จ.ต.",
  role: "visitor",
  ...
}
```

#### **B. Database Verification:**
1. ไปที่ **"Auth Test"** ใน SlideBar
2. กดปุ่ม **"Test Database & Auth""
3. ดูจำนวน users ที่เพิ่มขึ้น
4. ตรวจสอบข้อมูล user ใหม่

#### **C. Sign In Test:**
1. ออกจากระบบ
2. ไปที่หน้า Sign In
3. ลองเข้าสู่ระบบด้วย username ใหม่
4. ลองเข้าสู่ระบบด้วย email ใหม่

## 🔍 **การตรวจสอบ Password Validation**

### **Password Requirements:**
- ✅ **ความยาว**: อย่างน้อย 8 ตัวอักษร
- ✅ **ตัวพิมพ์ใหญ่**: ต้องมี A-Z
- ✅ **ตัวพิมพ์เล็ก**: ต้องมี a-z
- ✅ **ตัวเลข**: ต้องมี 0-9
- ✅ **อักขระพิเศษ**: ต้องมี !@#$%^&*(),.?":{}|<>

### **ตัวอย่าง Password ที่ผ่าน:**
- `TestPass123!`
- `MyPassword456!`
- `SecurePass789@`

### **ตัวอย่าง Password ที่ไม่ผ่าน:**
- `password` (ไม่มีตัวพิมพ์ใหญ่, ตัวเลข, อักขระพิเศษ)
- `PASSWORD` (ไม่มีตัวพิมพ์เล็ก, ตัวเลข, อักขระพิเศษ)
- `Pass123` (ไม่มีอักขระพิเศษ)
- `Test!` (สั้นเกินไป)

## ⚠️ **ข้อจำกัด**

### **1. Username Case Sensitivity**
- Username เป็น case-sensitive
- `testuser1` ≠ `TestUser1` ≠ `TESTUSER1`

### **2. Email Uniqueness**
- Email ต้องไม่ซ้ำกับที่มีอยู่
- ระบบจะตรวจสอบ uniqueness

### **3. Username Uniqueness**
- Username ต้องไม่ซ้ำกับที่มีอยู่
- ระบบจะตรวจสอบ uniqueness

## 🎉 **ผลลัพธ์ที่คาดหวัง**

### **✅ การลงทะเบียนสำเร็จ:**
- แสดงข้อความ "ลงทะเบียนสำเร็จ! กำลังเข้าสู่ระบบ..."
- เข้าสู่ระบบอัตโนมัติ
- Redirect ไปที่ `/visitor`
- ข้อมูล user ถูกบันทึกใน database
- Console logs แสดงการเรียก Tauri commands

### **❌ การลงทะเบียนล้มเหลว:**
- แสดง error message
- ไม่เข้าสู่ระบบ
- ข้อมูลไม่ถูกบันทึก
- Console logs แสดง error

## 🔧 **การแก้ไขปัญหา**

### **1. Username ซ้ำ:**
```
Error: Username already exists
```
**แก้ไข**: เปลี่ยน username เป็นชื่อใหม่

### **2. Email ซ้ำ:**
```
Error: Email already exists
```
**แก้ไข**: เปลี่ยน email เป็น email ใหม่

### **3. Password ไม่ผ่าน Validation:**
```
Error: Password does not meet requirements
```
**แก้ไข**: เปลี่ยน password ให้ผ่านทุกข้อกำหนด

---

**ตอนนี้การลงทะเบียนควรทำงานได้แล้วครับ! 🚀**

ลองทดสอบการลงทะเบียน user ใหม่ 2 คน และดูผลลัพธ์ใน console logs และ database ครับ