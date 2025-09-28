# 🔍 คู่มือ Debug Sign In Page

## 🤔 **สถานการณ์ปัจจุบัน**
- ✅ **Auth Test Page**: ทั้ง username และ email ทำงานได้
- ❌ **Sign In Page จริง**: เข้าด้วย username ไม่ได้ แต่ email ได้

## 🛠️ **Debug ที่เพิ่มขึ้น**

### **1. Sign In Page Debug**
- เพิ่ม console.log ใน `handleSignIn` function
- แสดงข้อมูล credentials ที่ส่งไป
- แสดงผลลัพธ์การเข้าสู่ระบบ

### **2. AuthContext Debug**
- เพิ่ม console.log ใน `signIn` function
- แสดงข้อมูล credentials ที่รับมา
- แสดงผลลัพธ์จาก Tauri service

## 🧪 **ขั้นตอนการทดสอบ**

### **1. เปิด Developer Tools**
1. เปิดแอป PQS RTN
2. กด **F12** เพื่อเปิด Developer Tools
3. ไปที่ tab **"Console"**

### **2. ทดสอบ Sign In ด้วย Username**
1. ไปที่หน้า Sign In
2. กรอกข้อมูล:
   - **Username/Email**: `thaweesak`
   - **Password**: `Thaweesak&21`
3. กดปุ่ม "เข้าสู่ระบบ"
4. ดู console logs

### **3. ทดสอบ Sign In ด้วย Email**
1. กรอกข้อมูล:
   - **Username/Email**: `davide@gmail.com`
   - **Password**: `Thaweesak&21`
2. กดปุ่ม "เข้าสู่ระบบ"
3. ดู console logs

## 📊 **Console Logs ที่ควรเห็น**

### **เมื่อใช้ Username:**
```
🔍 Sign In Debug: {
  username_or_email: "thaweesak",
  password: "Thaweesak&21",
  isEmail: false
}

🔍 AuthContext Debug: {
  username_or_email: "thaweesak",
  password: "Thaweesak&21"
}

🔍 TauriUser Result: {
  id: 1,
  username: "thaweesak",
  email: "davide@gmail.com",
  ...
}

🔍 Sign In Result: {
  success: true,
  user: {...},
  token: "..."
}
```

### **เมื่อใช้ Email:**
```
🔍 Sign In Debug: {
  username_or_email: "davide@gmail.com",
  password: "Thaweesak&21",
  isEmail: true
}

🔍 AuthContext Debug: {
  username_or_email: "davide@gmail.com",
  password: "Thaweesak&21"
}

🔍 TauriUser Result: {
  id: 1,
  username: "thaweesak",
  email: "davide@gmail.com",
  ...
}

🔍 Sign In Result: {
  success: true,
  user: {...},
  token: "..."
}
```

## 🐛 **การวิเคราะห์ปัญหา**

### **ถ้า Username ล้มเหลว:**
1. ดู `🔍 TauriUser Result` - ถ้าเป็น `null` แสดงว่า Tauri service ล้มเหลว
2. ดู `🔍 Sign In Result` - ถ้า `success: false` แสดงว่า AuthContext ล้มเหลว
3. ดู error messages ใน console

### **ถ้า Email สำเร็จ:**
1. เปรียบเทียบ logs ระหว่าง username และ email
2. ดูว่ามีความแตกต่างอะไรบ้าง
3. ตรวจสอบ parameter names

## 🔧 **การแก้ไข**

### **ถ้า TauriUser Result เป็น null:**
- ปัญหาอยู่ที่ Tauri service
- ตรวจสอบ parameter names ใน `tauriService.ts`

### **ถ้า Sign In Result เป็น false:**
- ปัญหาอยู่ที่ AuthContext
- ตรวจสอบการแปลง TauriUser เป็น User

### **ถ้าไม่มี error แต่ไม่ redirect:**
- ปัญหาอยู่ที่ navigation logic
- ตรวจสอบ role-based redirect

## 📝 **ข้อมูลทดสอบ**

### **Admin User:**
- **Username**: `thaweesak`
- **Email**: `davide@gmail.com`
- **Password**: `Thaweesak&21`
- **Role**: `admin`

---

**ใช้ Console Logs เพื่อหาสาเหตุของปัญหา! 🚀**
