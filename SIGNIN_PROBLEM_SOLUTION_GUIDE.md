# 🔐 คู่มือแก้ไขปัญหา Sign In - PQS RTN Desktop App

## 📋 **สรุปปัญหา**

**ปัญหา:** หลังจากทำ Password Hashing (No plain text) แล้วเกิดปัญหา Sign In ไม่ได้ และมีปัญหาเรื่อง snake_case ที่ Rust ต้องการ

**สาเหตุหลัก:**
1. **Parameter Naming Mismatch** - Frontend ส่ง `camelCase` แต่ Rust ต้องการ `snake_case`
2. **Password Hashing Mismatch** - Database เก็บ bcrypt hash แต่ authentication ใช้ direct string comparison
3. **Rust Binary Cache** - ใช้ compiled binary เก่าที่ยังคาดหวัง parameter แบบเก่า

---

## 🔍 **การวิเคราะห์ปัญหาแบบละเอียด**

### **1. Parameter Naming Issue**

**ปัญหา:**
```typescript
// Frontend ส่ง camelCase
{
  usernameOrEmail: 'davide.twt@gmail.com',
  passwordHash: 'Thaweesak&21'
}

// แต่ Rust ต้องการ snake_case
fn authenticate_user(username_or_email: String, password_hash: String)
```

**Error Message:**
```
Tauri invoke error: invalid args `usernameOrEmail` for command `authenticate_user`: 
command authenticate_user missing required key usernameOrEmail
```

### **2. Password Hashing Mismatch**

**ปัญหา:**
```rust
// Database เก็บ bcrypt hash
password_hash: "$2b$12$llBnWYG3wjq6Mn1SFIc9YuIZXKgGApemnZ2NBRK1P5QbZixCrGW9a"

// แต่ authentication ใช้ direct comparison
WHERE password_hash = ? AND is_active = 1
// ส่ง plain text "Thaweesak&21" ไปเทียบกับ bcrypt hash
```

### **3. Rust Binary Cache**

**ปัญหา:** แม้จะแก้โค้ดแล้ว แต่ Tauri ยังใช้ compiled binary เก่าที่คาดหวัง parameter แบบเก่า

---

## ✅ **วิธีแก้ไขปัญหา**

### **ขั้นตอนที่ 1: เข้าใจ Tauri Parameter Conversion**

**การค้นพบสำคัญ:** Tauri มีการแปลง parameter names อัตโนมัติ
- **Frontend (JavaScript):** ต้องใช้ `camelCase`
- **Tauri:** แปลงเป็น `snake_case` อัตโนมัติ
- **Rust Backend:** รับ `snake_case`

### **ขั้นตอนที่ 2: แก้ไข Frontend Parameter Names**

**ไฟล์:** `src/services/tauriService.ts`

```typescript
// ❌ ผิด - ใช้ snake_case ใน frontend
return await safeInvoke('authenticate_user', { 
  username_or_email: username_or_email, 
  password_hash: password_hash 
});

// ✅ ถูก - ใช้ camelCase ใน frontend
return await safeInvoke('authenticate_user', { 
  usernameOrEmail: username_or_email, 
  password: password 
});
```

### **ขั้นตอนที่ 3: เพิ่ม Bcrypt Dependency**

**ไฟล์:** `src-tauri/Cargo.toml`

```toml
[dependencies]
bcrypt = "0.15"  # เพิ่มบรรทัดนี้
```

### **ขั้นตอนที่ 4: แก้ไข Authentication Function**

**ไฟล์:** `src-tauri/src/database.rs`

```rust
// ❌ ผิด - ใช้ direct string comparison
pub fn authenticate_user(username_or_email: &str, password_hash: &str) -> Result<Option<User>, String> {
    let mut stmt = conn.prepare("SELECT ... WHERE password_hash = ? AND is_active = 1")?;
    let user = stmt.query_row(params![username_or_email, username_or_email, password_hash], |row| {
        // ...
    });
    // ...
}

// ✅ ถูก - ใช้ bcrypt verification
pub fn authenticate_user(username_or_email: &str, password: &str) -> Result<Option<User>, String> {
    let mut stmt = conn.prepare("SELECT ... WHERE is_active = 1")?;
    let user = stmt.query_row(params![username_or_email, username_or_email], |row| {
        // ...
    });
    
    match user {
        Ok(user) => {
            // ใช้ bcrypt verify แทน direct comparison
            if bcrypt::verify(password, &user.password_hash).map_err(|e| format!("Password verification failed: {}", e))? {
                Ok(Some(user))
            } else {
                Ok(None) // Password ไม่ตรง
            }
        },
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to query user: {}", e)),
    }
}
```

### **ขั้นตอนที่ 5: แก้ไข Function Signature**

**ไฟล์:** `src-tauri/src/main.rs`

```rust
// ❌ ผิด
fn authenticate_user(username_or_email: String, password_hash: String) -> Result<Option<User>, String>

// ✅ ถูก
fn authenticate_user(username_or_email: String, password: String) -> Result<Option<User>, String>
```

### **ขั้นตอนที่ 6: ล้าง Rust Binary Cache**

```bash
# หยุด PQS RTN process
taskkill /F /IM "PQS RTN.exe"

# ล้าง compiled artifacts
cd src-tauri
cargo clean

# กลับไป root directory
cd ..

# เริ่ม dev server ใหม่
npm run tauri:dev
```

---

## 🎯 **ผลลัพธ์หลังแก้ไข**

### **Authentication Flow ที่ถูกต้อง:**

```
1. Frontend: {usernameOrEmail: 'davide.twt@gmail.com', password: 'Thaweesak&21'}
2. Tauri: แปลงเป็น {username_or_email: 'davide.twt@gmail.com', password: 'Thaweesak&21'}
3. Rust: รับ parameters ใน snake_case
4. Database: ค้นหา user โดย username_or_email
5. Bcrypt: verify('Thaweesak&21', '$2b$12$...') = true
6. Success: Return user data
```

### **Console Logs ที่ควรเห็น:**

```
🔍 tauriService.authenticateUser - Sending params: {usernameOrEmail: "davide.twt@gmail.com", password: "Thaweesak&21"}
🔍 safeInvoke - Command: authenticate_user
🔍 safeInvoke - Args: {usernameOrEmail: "davide.twt@gmail.com", password: "Thaweesak&21"}
✅ Authentication successful (ไม่มี error อีกต่อไป)
```

---

## ❓ **คำถาม-คำตอบ (Q&A)**

### **Q1: ทำไมต้องใช้ camelCase ใน frontend แต่ snake_case ใน Rust?**

**A:** นี่เป็นพฤติกรรมของ Tauri framework
- **JavaScript convention:** ใช้ `camelCase`
- **Rust convention:** ใช้ `snake_case`
- **Tauri:** แปลงอัตโนมัติระหว่างสองภาษานี้

### **Q2: ทำไมต้องใช้ bcrypt::verify แทน direct string comparison?**

**A:** เพราะความปลอดภัย
- **Database:** เก็บ bcrypt hash (`$2b$12$...`)
- **Frontend:** ส่ง plain text password
- **bcrypt::verify:** เปรียบเทียบ plain text กับ hash อย่างปลอดภัย

### **Q3: ทำไมต้องทำ cargo clean?**

**A:** เพื่อลบ compiled binary เก่า
- **ปัญหา:** Rust ใช้ binary เก่าที่ยังคาดหวัง parameter แบบเก่า
- **วิธีแก้:** ล้าง cache และ compile ใหม่

### **Q4: จะรู้ได้ยังไงว่าแก้ถูกแล้ว?**

**A:** ดูจาก console logs
- **ก่อนแก้:** `invalid args usernameOrEmail for command authenticate_user`
- **หลังแก้:** ไม่มี error และ Sign In สำเร็จ

### **Q5: ถ้ายังมีปัญหา usernameOrEmail error อยู่?**

**A:** ลองขั้นตอนเหล่านี้:
1. ตรวจสอบว่าใช้ `camelCase` ใน frontend
2. ตรวจสอบว่า Rust function รับ `snake_case`
3. ทำ `cargo clean` และ restart
4. ตรวจสอบว่า commit changes แล้ว

### **Q6: Password ที่ใช้ทดสอบคืออะไร?**

**A:** 
- **Email:** `davide.twt@gmail.com`
- **Password:** `Thaweesak&21`
- **Role:** `admin`

### **Q7: จะเพิ่ม user ใหม่ได้ยังไง?**

**A:** ใช้ Registration form หรือ Auth Test page
- ระบบจะ hash password อัตโนมัติด้วย bcrypt
- ใช้ `camelCase` parameters เช่นกัน

---

## 🚀 **สรุป**

**ปัญหาหลัก:** Parameter naming mismatch และ password hashing mismatch

**วิธีแก้:**
1. ใช้ `camelCase` ใน frontend, `snake_case` ใน Rust
2. ใช้ `bcrypt::verify()` แทน direct string comparison
3. ล้าง Rust binary cache ด้วย `cargo clean`

**ผลลัพธ์:** Sign In ทำงานได้อย่างถูกต้องและปลอดภัย! 🎉

---

## 📝 **ไฟล์ที่แก้ไข**

1. `src/services/tauriService.ts` - แก้ parameter names เป็น camelCase
2. `src-tauri/Cargo.toml` - เพิ่ม bcrypt dependency
3. `src-tauri/src/database.rs` - ใช้ bcrypt verification
4. `src-tauri/src/main.rs` - แก้ function signature

**Commit Messages:**
- `Fix parameter naming mismatch: Use snake_case for Tauri commands`
- `CRITICAL FIX: Implement proper bcrypt password verification`
- `FIX: Use camelCase parameters for Tauri commands`
