# PQS RTN Hybrid Storage

PQS RTN Desktop Application with Hybrid Storage System - แก้ไขปัญหา BLOB storage และ async issues

## 🎯 **วัตถุประสงค์:**

### **ปัญหาที่แก้ไข:**
- ❌ **BLOB Storage Issues** - ฐานข้อมูลใหญ่, ช้า, ใช้ RAM มาก
- ❌ **Async Problems** - Race conditions, Memory leaks, UI blocking
- ❌ **Export/Import Issues** - JSON/CSV ไม่เหมาะกับ BLOB

### **โซลูชัน:**
- ✅ **Hybrid Storage System** - BLOB + File-based storage
- ✅ **File-based Media** - รูปภาพเก็บในไฟล์ระบบ
- ✅ **ZIP Export/Import** - ส่งออก/นำเข้าทั้งฐานข้อมูลและไฟล์สื่อ
- ✅ **Backward Compatibility** - ระบบเดิมยังใช้งานได้

## 🏗️ **Architecture:**

### **Phase 1: Current System (BLOB)**
```
Database (SQLite)
├── users table
├── avatars (BLOB) ← ปัญหาตรงนี้
└── other data
```

### **Phase 2: Hybrid System**
```
Database (SQLite)          File System
├── users table            ├── media/
├── media_files table      │   ├── avatars/
├── documents table        │   ├── documents/
└── metadata only          │   └── exports/
```

## 🚀 **Features:**

### **✅ Current Features (จากโปรเจคเดิม):**
- User Management
- Authentication
- Database Operations
- Export/Import (JSON, CSV, SQL)

### **🆕 New Features (Hybrid Storage):**
- File-based Media Storage
- ZIP Export/Import
- Document Management (อนาคต)
- Performance Optimization

## 📁 **Project Structure:**

```
pqs-rtn-hybrid-storage/
├── src-tauri/src/
│   ├── database.rs              # ระบบเดิม (BLOB)
│   ├── hybrid_storage.rs        # ระบบผสม
│   ├── file_storage.rs          # File-based storage
│   ├── media_manager.rs         # จัดการไฟล์สื่อ
│   ├── migration.rs             # Migration tools
│   └── export_import.rs         # Enhanced export/import
├── src/components/
│   ├── pages/
│   │   ├── UserManagementPage.tsx    # หน้าจัดการผู้ใช้
│   │   ├── HybridStoragePage.tsx     # หน้าจัดการ Hybrid Storage
│   │   └── MigrationPage.tsx         # หน้า Migration
│   └── components/
│       ├── MediaUploader.tsx         # อัปโหลดไฟล์สื่อ
│       └── HybridExporter.tsx       # ส่งออก Hybrid
├── media/                        # ไฟล์สื่อ
│   ├── avatars/                  # รูปโปรไฟล์
│   ├── documents/               # เอกสาร
│   └── exports/                  # ไฟล์ส่งออก
└── exports/                      # ไฟล์ส่งออก
```

## 🛠️ **Development:**

### **Installation:**
```bash
# Install dependencies
npm install

# Install Rust dependencies
cd src-tauri
cargo build
```

### **Development:**
```bash
# Start development server
npm run tauri

# หรือใช้คำสั่งอื่นๆ
npm run start
npm run app
npm run desktop
```

### **Build:**
```bash
# Build for production
npm run tauri:build
```

## 📊 **Performance Comparison:**

| Aspect | BLOB Storage | Hybrid Storage |
|--------|-------------|---------------|
| **Database Size** | ใหญ่ขึ้นเรื่อยๆ | คงที่ |
| **Memory Usage** | สูง | ต่ำ |
| **Query Speed** | ช้า | เร็ว |
| **Export/Import** | ช้า | เร็ว |
| **Backup** | ช้า | เร็ว |
| **Concurrency** | ปัญหา | ดี |

## 🔄 **Migration Strategy:**

### **Step 1: Create Hybrid System**
- สร้าง FileStorageManager
- สร้าง database schema ใหม่
- สร้าง migration tools

### **Step 2: Parallel Systems**
- ระบบเดิมยังใช้งานได้
- ระบบใหม่สำหรับข้อมูลใหม่
- Auto-detect ระบบไหน

### **Step 3: Gradual Migration**
- Migrate ทีละส่วน
- Validate data integrity
- Rollback capability

## 🎯 **Roadmap:**

### **Week 1-2: Foundation**
- [x] Create new repository
- [x] Copy existing code
- [x] Update project configuration
- [ ] Create FileStorageManager
- [ ] Create MediaManager

### **Week 3-4: Hybrid System**
- [ ] Create hybrid database schema
- [ ] Create migration tools
- [ ] Create export/import system
- [ ] Create UI components

### **Week 5-6: Testing & Migration**
- [ ] Test hybrid system
- [ ] Create migration interface
- [ ] Performance testing
- [ ] Documentation

## 🛡️ **Safety Measures:**

- **Backward Compatibility** - ระบบเดิมยังใช้งานได้
- **Rollback Capability** - สามารถ rollback ได้
- **Data Validation** - ตรวจสอบความถูกต้อง
- **Parallel Testing** - ทดสอบทั้งสองระบบ

## 📝 **Notes:**

- โปรเจคนี้สร้างจาก `pqs-rtn-tauri` เพื่อความปลอดภัย
- ระบบเดิมยังใช้งานได้ปกติ
- ระบบใหม่จะทำงานควบคู่กัน
- Migration จะทำทีละส่วนเพื่อความปลอดภัย

## 🤝 **Contributing:**

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 **License:**

MIT License - ดู LICENSE file สำหรับรายละเอียด