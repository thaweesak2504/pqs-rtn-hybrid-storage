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

## 🧪 **Testing Infrastructure:**

### **Phase B & C1: Frontend Testing (✅ Complete)**

- **Unit Tests**: 14 tests (utility functions, component helpers)
- **Component Tests**: 8 tests (Button, Modal, UI interactions)
- **Integration Tests**: 25 tests (zoom, avatar, desktop, Tauri services)
- **Total Coverage**: **47 passing tests** across 8 test files
- **Coverage Metrics**: 64.72% lines, 62.5% functions (exceeds 50% threshold)

**Run Tests:**

```bash
npm run test:run          # Run all tests
npm run test:integration # Run integration tests only
npm run test:coverage   # Generate coverage report
npm run test:ui         # Interactive test UI
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

### **Testing:**

#### **Rust Tests**

```powershell
# Run all Rust tests
cd src-tauri
cargo test

# Or use the automation script
.\scripts\run-rust-tests.ps1

# Run tests with coverage
.\scripts\run-rust-tests.ps1 -Coverage

# Run specific module tests
.\scripts\run-rust-tests.ps1 -Filter "database_export::tests"
```

**Test Status:**

- ✅ **37 Unit Tests** (100% pass rate)
- ✅ **14.46% Line Coverage** (baseline established)
- ✅ **GitHub Actions CI/CD** (automated testing)
- 📊 **Coverage Report**: `coverage/rust/html/index.html`

**Coverage by Module:**

- `test_helpers.rs`: 98.72% (test utilities)

#### **Frontend Tests (Vitest)**

```powershell
# Run all frontend tests
npm run test:run

# Run integration tests only
npm run test:integration

# Run in watch mode
npm test

# Run coverage report
npm run test:coverage

# Or use automation script
.\scripts\run-frontend-tests.ps1
```

**Frontend Test Status:**

- ✅ **33 Frontend Tests** (Unit + Integration)
- ✅ **Vitest + Testing Library** configured
- ✅ **GitHub Actions frontend workflow** configured
- 📊 **Coverage Report**: `coverage/frontend/index.html`

**Frontend Coverage Snapshot:**

- `src/components/ui/Button.tsx`: 98.18%
- `src/components/ui/Modal.tsx`: 100%
- `src/utils/resolveAvatarSource.ts`: 100%
- `src/utils/commandSanitizer.ts`: 87.71%

## 📊 **Performance Comparison:**

| Aspect            | BLOB Storage    | Hybrid Storage |
| ----------------- | --------------- | -------------- |
| **Database Size** | ใหญ่ขึ้นเรื่อยๆ | คงที่          |
| **Memory Usage**  | สูง             | ต่ำ            |
| **Query Speed**   | ช้า             | เร็ว           |
| **Export/Import** | ช้า             | เร็ว           |
| **Backup**        | ช้า             | เร็ว           |
| **Concurrency**   | ปัญหา           | ดี             |

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
