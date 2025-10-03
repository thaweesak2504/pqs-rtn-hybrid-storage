# 🚀 วิธีการรันโปรเจค PQS RTN Hybrid Storage

## ⚠️ สำคัญมาก: ตำแหน่ง Working Directory

### ✅ ถูกต้อง: ต้องอยู่ที่ ROOT ของโปรเจค
```
D:\pqs-rtn-hybrid-storage\
```

### ❌ ผิด: อย่าไปอยู่ใน src-tauri
```
D:\pqs-rtn-hybrid-storage\src-tauri\  ❌ อย่ามาอยู่ที่นี่
```

---

## 📁 โครงสร้างโปรเจค

```
D:\pqs-rtn-hybrid-storage/          👈 **อยู่ที่นี่ตลอด**
│
├── package.json                     Frontend dependencies & scripts
├── vite.config.ts                   Vite configuration
├── tsconfig.json                    TypeScript configuration
│
├── src/                             Frontend (React + TypeScript)
│   ├── main.tsx                     React entry point
│   ├── App.tsx
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── utils/
│
├── src-tauri/                       Backend (Rust)
│   ├── Cargo.toml                   Rust dependencies
│   ├── tauri.conf.json              Tauri configuration
│   ├── src/
│   │   ├── main.rs                  Rust entry point
│   │   ├── database.rs              Database operations
│   │   ├── hybrid_avatar.rs         Avatar management
│   │   └── file_manager.rs          File operations
│   └── target/                      Rust build output (auto-generated)
│
├── dist/                            Production build output
├── node_modules/                    Node dependencies (auto-generated)
└── project_analysis/                Documentation
```

---

## 🎯 คำสั่งที่ใช้บ่อย

### 1. 🏃 รันโปรเจคในโหมด Development

**ก่อนรัน: ตรวจสอบว่าอยู่ที่ root**
```powershell
pwd
# ต้องแสดง: D:\pqs-rtn-hybrid-storage
```

**รันโปรเจค:**
```powershell
npm run tauri dev
```

**สิ่งที่เกิดขึ้น:**
- ✅ Build frontend (Vite + React)
- ✅ Build backend (Rust)
- ✅ เปิดแอปพลิเคชันอัตโนมัติ
- ✅ Hot reload เมื่อแก้ไขโค้ด

---

### 2. 🏗️ Build สำหรับ Production

```powershell
npm run tauri build
```

**ผลลัพธ์:**
- สร้างไฟล์ `.exe` ใน `src-tauri/target/release/`
- สร้าง installer ใน `src-tauri/target/release/bundle/`

---

### 3. 🔨 Build เฉพาะส่วน Frontend

```powershell
npm run build
```

---

### 4. 🦀 Build เฉพาะส่วน Backend (Rust)

**จาก Root (แนะนำ):**
```powershell
cargo build --manifest-path src-tauri/Cargo.toml
```

**หรือ cd เข้าไปชั่วคราว:**
```powershell
cd src-tauri
cargo build
cd ..  # ⚠️ อย่าลืมกลับมา!
```

---

### 5. 🧪 ทดสอบ Build

```powershell
npm run build
```

**ตรวจสอบ errors:**
- ดู terminal output
- ตรวจสอบ TypeScript errors
- ตรวจสอบ Rust compilation

---

## 🚫 ข้อผิดพลาดที่พบบ่อย

### ❌ Error: "Cannot find module 'package.json'"

**สาเหตุ:** อยู่ใน `src-tauri` แทนที่จะอยู่ที่ root

**แก้ไข:**
```powershell
cd ..
pwd  # ตรวจสอบว่าอยู่ที่ D:\pqs-rtn-hybrid-storage
npm run tauri dev
```

---

### ❌ Error: "cargo: command not found"

**สาเหตุ:** Rust ไม่ได้ติดตั้งหรือไม่อยู่ใน PATH

**แก้ไข:**
```powershell
# ติดตั้ง Rust
winget install Rustlang.Rust.MSVC
```

---

### ❌ Error: "npm: command not found"

**สาเหตุ:** Node.js ไม่ได้ติดตั้ง

**แก้ไข:**
```powershell
# ติดตั้ง Node.js
winget install OpenJS.NodeJS.LTS
```

---

## 📋 Checklist ก่อนรันโปรเจค

- [ ] ✅ อยู่ที่ root directory: `D:\pqs-rtn-hybrid-storage`
- [ ] ✅ ติดตั้ง Node.js แล้ว: `node --version`
- [ ] ✅ ติดตั้ง Rust แล้ว: `cargo --version`
- [ ] ✅ ติดตั้ง dependencies แล้ว: `npm install`
- [ ] ✅ ไม่มี process เก่าค้างอยู่: ปิด terminal เก่าทั้งหมด

---

## 🔍 วิธีตรวจสอบว่าอยู่ที่ไหน

### Windows PowerShell:
```powershell
pwd
```

**ผลลัพธ์ที่ถูกต้อง:**
```
Path
----
D:\pqs-rtn-hybrid-storage
```

**ผลลัพธ์ที่ผิด (ต้องแก้):**
```
Path
----
D:\pqs-rtn-hybrid-storage\src-tauri  ❌ ผิด! ใช้ cd .. กลับไป
```

---

## 🎓 เคล็ดลับ

### 1. สร้าง PowerShell Profile สำหรับ shortcut

```powershell
# เพิ่มใน PowerShell profile
function goto-pqs {
    Set-Location D:\pqs-rtn-hybrid-storage
    Write-Host "✅ Navigated to PQS RTN project root" -ForegroundColor Green
}

# ใช้งาน
goto-pqs
npm run tauri dev
```

### 2. ใช้ VS Code Integrated Terminal

1. เปิด VS Code ที่ root folder
2. Terminal จะเปิดที่ root อัตโนมัติ
3. กด `` Ctrl+` `` เพื่อเปิด/ปิด terminal

### 3. สร้าง Batch File สำหรับรันง่าย

**สร้างไฟล์: `run-dev.bat`**
```batch
@echo off
cd /d D:\pqs-rtn-hybrid-storage
echo ✅ At project root
npm run tauri dev
```

**ใช้งาน:**
- Double-click `run-dev.bat`

---

## 📚 คำสั่งที่เกี่ยวข้อง

### ตรวจสอบ dependencies
```powershell
# Node packages
npm list --depth=0

# Rust crates
cargo tree --manifest-path src-tauri/Cargo.toml
```

### ล้าง cache และ build ใหม่
```powershell
# ล้าง Node modules
Remove-Item -Recurse -Force node_modules
npm install

# ล้าง Rust build
Remove-Item -Recurse -Force src-tauri/target
cargo build --manifest-path src-tauri/Cargo.toml

# ล้าง dist
Remove-Item -Recurse -Force dist
```

### Git operations
```powershell
# ต้องทำที่ root เสมอ
git status
git add .
git commit -m "Your message"
git push
```

---

## 🆘 ติดปัญหา?

### 1. ตรวจสอบ Terminal Output
- อ่าน error messages อย่างละเอียด
- มักจะบอกว่าปัญหาอยู่ที่ไหน

### 2. ตรวจสอบ Working Directory
```powershell
pwd
```

### 3. Restart Terminal
- ปิด terminal ทั้งหมด
- เปิดใหม่ที่ root
- ลองรันอีกครั้ง

### 4. Rebuild ทั้งหมด
```powershell
# ที่ root
npm run build
cargo build --manifest-path src-tauri/Cargo.toml
npm run tauri dev
```

---

## ✅ Quick Start (สำหรับทุกครั้งที่เปิดโปรเจค)

```powershell
# 1. ไปที่ root
cd D:\pqs-rtn-hybrid-storage

# 2. ตรวจสอบตำแหน่ง
pwd

# 3. รันโปรเจค
npm run tauri dev
```

---

**📌 จำไว้:** **อยู่ที่ ROOT เสมอ** (`D:\pqs-rtn-hybrid-storage`) **อย่าไป** `cd src-tauri` นานเกินไป!

**🎉 Happy Coding!**
