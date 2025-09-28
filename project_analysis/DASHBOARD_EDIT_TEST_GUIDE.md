# 🧪 คู่มือทดสอบการ Edit ที่ Dashboard

## ✅ **การแก้ไขที่เสร็จแล้ว**

### **1. UserService Functions**
- ✅ แก้ไข `updateUser` function ให้รับ object parameters
- ✅ แก้ไข `createUser` function ให้รับ object parameters  
- ✅ แก้ไข `updateUserPassword` function ให้ทำงานถูกต้อง

### **2. TauriService Functions**
- ✅ แก้ไข `updateUser` function ให้มี `password_hash` parameter
- ✅ เพิ่ม debug logs ใน `safeInvoke` function

## 🎯 **Fields ที่สามารถ Edit ได้**

### **User Information:**
- ✅ **Full Name** - แก้ไขได้
- ✅ **Username** - แก้ไขได้ (Case-sensitive)
- ✅ **Email** - แก้ไขได้
- ✅ **Rank** - แก้ไขได้ (Dropdown)
- ✅ **Role** - แก้ไขได้ (admin/editor/visitor)

### **Password Management:**
- ✅ **View Password** - Admin สามารถดูรหัสผ่านได้
- ✅ **Edit Password** - Admin สามารถแก้ไขรหัสผ่านได้
- ✅ **Show/Hide Password** - Toggle การแสดงรหัสผ่าน

### **Avatar Management:**
- ✅ **Upload Avatar** - อัปโหลดรูป Avatar
- ✅ **Remove Avatar** - ลบรูป Avatar
- ✅ **Preview Avatar** - ดูตัวอย่างรูปก่อนบันทึก

## 🧪 **ขั้นตอนการทดสอบ**

### **1. เข้าสู่ระบบ**
1. ไปที่หน้า Sign In
2. กรอกข้อมูล:
   - **Username**: `thaweesak`
   - **Password**: `Thaweesak&21`
3. กดปุ่ม "เข้าสู่ระบบ"

### **2. ไปที่ Dashboard**
1. หลังจากเข้าสู่ระบบสำเร็จ จะไปที่ Dashboard อัตโนมัติ
2. หรือคลิกที่ "Dashboard" ใน SlideBar

### **3. ทดสอบการ Edit User**

#### **A. Edit Basic Information:**
1. ในส่วน "User Management Form" จะเห็น user list
2. คลิกปุ่ม **"Edit"** ของ user ที่ต้องการแก้ไข
3. แก้ไขข้อมูลในฟอร์ม:
   - **Full Name**: `Thaweesak Updated`
   - **Username**: `thaweesak_updated`
   - **Email**: `thaweesak.updated@gmail.com`
   - **Rank**: เลือกยศใหม่
   - **Role**: เลือก role ใหม่
4. กดปุ่ม **"Update User"**

#### **B. Edit Password (Admin Only):**
1. ใน user list จะเห็นส่วน Password
2. คลิกไอคอน **"Eye"** เพื่อดูรหัสผ่าน
3. คลิกไอคอน **"Edit"** เพื่อแก้ไขรหัสผ่าน
4. กรอกรหัสผ่านใหม่
5. กดปุ่ม **"Save"**

#### **C. Edit Avatar:**
1. คลิกปุ่ม **"เปลี่ยน"** ใต้รูป Avatar
2. เลือกไฟล์รูปภาพ (.png, .jpg, .webp)
3. รอให้ประมวลผลเสร็จ
4. Avatar จะอัปเดตอัตโนมัติ

### **4. ทดสอบการ Create User**
1. กรอกข้อมูลในฟอร์ม:
   - **Full Name**: `Test User`
   - **Username**: `testuser`
   - **Email**: `test@example.com`
   - **Rank**: เลือกยศ
   - **Role**: เลือก role
2. กดปุ่ม **"Create User"**

### **5. ทดสอบการ Delete User**
1. คลิกปุ่ม **"Delete"** ของ user ที่ต้องการลบ
2. ยืนยันการลบ
3. User จะถูกลบออกจากระบบ

## 🔍 **การตรวจสอบผลลัพธ์**

### **1. Console Logs**
ดู console logs เพื่อตรวจสอบ:
```
🔍 SafeInvoke Debug: {
  command: "update_user",
  args: {
    id: 1,
    username: "thaweesak_updated",
    email: "thaweesak.updated@gmail.com",
    password_hash: "Thaweesak&21",
    full_name: "Thaweesak Updated",
    rank: "ร.ท.",
    role: "admin"
  }
}

🔍 SafeInvoke Result: {
  id: 1,
  username: "thaweesak_updated",
  email: "thaweesak.updated@gmail.com",
  ...
}
```

### **2. Database Verification**
ใช้ Auth Test Page เพื่อตรวจสอบ:
1. ไปที่ **"Auth Test"** ใน SlideBar
2. กดปุ่ม **"Test Database & Auth"**
3. ดูข้อมูล user ที่อัปเดตแล้ว

### **3. UI Verification**
- ข้อมูลใน user list ควรอัปเดตทันที
- Avatar ควรเปลี่ยนทันที
- Password ควรอัปเดตทันที

## ⚠️ **ข้อจำกัด**

### **1. Username Case Sensitivity**
- Username เป็น case-sensitive
- ต้องใช้ `thaweesak` (ตัวเล็ก) เท่านั้น

### **2. Admin Protection**
- ไม่สามารถลบ admin user ได้
- ไม่สามารถลบบัญชีของตัวเองได้

### **3. Password Security**
- Password จะถูกเก็บเป็น plain text (สำหรับการทดสอบ)
- ใน production ควรใช้ hashing

## 🎉 **ผลลัพธ์ที่คาดหวัง**

### **✅ การ Edit สำเร็จ:**
- ข้อมูล user อัปเดตใน database
- UI แสดงข้อมูลใหม่ทันที
- Console logs แสดงการเรียก Tauri commands
- Auth Test Page แสดงข้อมูลใหม่

### **❌ การ Edit ล้มเหลว:**
- แสดง error message
- ข้อมูลไม่เปลี่ยนแปลง
- Console logs แสดง error

---

**ตอนนี้การ Edit ที่ Dashboard ควรทำงานได้แล้วครับ! 🚀**

ลองทดสอบการ Edit ข้อมูล user และดูผลลัพธ์ใน console logs และ database ครับ
