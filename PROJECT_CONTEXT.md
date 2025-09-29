# PQS RTN Hybrid Storage - Project Context

## 🎯 **Project Overview**

### **Current Status:**
- **Original Project:** `D:\pqs-rtn-tauri` (Working system with BLOB storage) - **REFERENCE ONLY**
- **New Project:** `D:\pqs-rtn-hybrid-storage` (Hybrid storage system)
- **GitHub Repository:** `https://github.com/thaweesak2504/pqs-rtn-hybrid-storage.git`

### **Problem Solved:**
- ❌ **BLOB Storage Issues** - Database size, memory usage, async problems
- ❌ **Export/Import Issues** - JSON/CSV not suitable for BLOB
- ❌ **Performance Issues** - Slow queries, memory leaks

### **Solution Implemented:**
- ✅ **Hybrid Storage System** - BLOB + File-based storage
- ✅ **Separate Databases** - No conflicts between systems
- ✅ **Data Migration** - Copy from original to new system
- ✅ **Backward Compatibility** - Original system still works

---

## 🏗️ **Architecture**

### **Database Separation:**
```
Original System (pqs-rtn-tauri) - **REFERENCE ONLY**:
├── Database: C:\Users\Thaweesak\AppData\Roaming\pqs-rtn-tauri\database.db
├── Storage: BLOB in database
└── Status: ✅ Working (167KB)

New System (pqs-rtn-hybrid-storage):
├── Database: C:\Users\Thaweesak\AppData\Roaming\pqs-rtn-hybrid-storage\database.db
├── Storage: File-based + BLOB hybrid
└── Status: ✅ Working (167KB - copied from original)
```

### **File Structure:**
```
pqs-rtn-hybrid-storage/
├── src-tauri/           # Tauri backend
├── src/                 # React frontend
├── media/               # File-based media storage
│   ├── avatars/         # User avatars
│   ├── documents/       # Document media
│   └── exports/         # Export files
├── exports/             # Export directory
└── README.md            # Project documentation
```

---

## 🎯 **Current Objectives**

### **Phase 1: Foundation (Completed)**
- [x] Create new repository
- [x] Copy existing code
- [x] Separate database paths
- [x] Test functionality
- [x] Copy data from original system

### **Phase 2: Hybrid Storage Implementation (Next)**
- [ ] Create FileStorageManager
- [ ] Create MediaManager
- [ ] Create hybrid database schema
- [ ] Create migration tools
- [ ] Create UI components

### **Phase 3: Document Management (Future)**
- [ ] Create document editor
- [ ] Create media uploader
- [ ] Create export/import system
- [ ] Create performance monitoring

---

## 🔧 **Technical Details**

### **Database Configuration:**
```rust
// Original system - REFERENCE ONLY
let db_dir = app_data.join("pqs-rtn-tauri");

// New system
let db_dir = app_data.join("pqs-rtn-hybrid-storage");
```

### **Package Configuration:**
```json
{
  "name": "pqs-rtn-hybrid-storage",
  "description": "PQS RTN Desktop Application with Hybrid Storage System"
}
```

### **Tauri Configuration:**
```json
{
  "package": {
    "productName": "PQS RTN Hybrid Storage"
  },
  "bundle": {
    "identifier": "com.thaweesak.pqs-rtn-hybrid-storage"
  }
}
```

---

## 🚀 **Development Commands**

### **Start Development:**
```bash
cd D:\pqs-rtn-hybrid-storage
npm run tauri
# or
npm run start
# or
npm run app
```

### **Build Production:**
```bash
npm run tauri:build
```

### **Git Operations:**
```bash
git add .
git commit -m "Your message"
git push origin master
```

---

## 📊 **Performance Comparison**

| Aspect | BLOB Storage | Hybrid Storage |
|--------|-------------|---------------|
| **Database Size** | Grows continuously | Stays constant |
| **Memory Usage** | High | Low |
| **Query Speed** | Slow | Fast |
| **Export/Import** | Slow | Fast |
| **Backup** | Slow | Fast |
| **Concurrency** | Issues | Good |

---

## 🛡️ **Safety Measures**

### **Database Isolation:**
- ✅ **Separate paths** - No conflicts
- ✅ **Independent systems** - Can run both
- ✅ **Data backup** - Original preserved
- ✅ **Rollback capability** - Can revert

### **Development Safety:**
- ✅ **Non-destructive** - Original system untouched
- ✅ **Parallel development** - Both systems work
- ✅ **Data migration** - Copy, not move
- ✅ **Testing environment** - Safe to experiment

---

## 🎯 **Next Steps**

### **Immediate Tasks:**
1. **Create FileStorageManager** - File system management
2. **Create MediaManager** - Media file handling
3. **Create hybrid database schema** - New tables
4. **Create migration tools** - BLOB to file migration
5. **Create UI components** - Hybrid storage interface

### **Future Features:**
1. **Document Management** - Word-like documents
2. **Media Optimization** - Image compression, thumbnails
3. **Performance Monitoring** - System metrics
4. **Advanced Export/Import** - ZIP with media files

---

## 📝 **Notes**

### **Context for AI Assistant:**
- This project is a **hybrid storage system** for PQS RTN Desktop Application
- **Original system** uses BLOB storage (has issues)
- **New system** uses file-based + BLOB hybrid storage
- **Both systems** work independently
- **Data has been copied** from original to new system
- **Next step** is to implement hybrid storage features

### **Key Files:**
- `src-tauri/src/database.rs` - Database operations
- `src-tauri/src/main.rs` - Tauri commands
- `src/components/` - React components
- `media/` - File-based media storage

### **Important Paths:**
- **Original DB:** `C:\Users\Thaweesak\AppData\Roaming\pqs-rtn-tauri\database.db` - **REFERENCE ONLY**
- **New DB:** `C:\Users\Thaweesak\AppData\Roaming\pqs-rtn-hybrid-storage\database.db`
- **Media Storage:** `D:\pqs-rtn-hybrid-storage\media\`

---

## 🤝 **Collaboration**

### **For AI Assistant:**
- **Context:** This is a hybrid storage system project
- **Goal:** Implement file-based media storage
- **Status:** Foundation completed, ready for hybrid features
- **Safety:** Original system preserved, new system isolated
- **Next:** Create FileStorageManager and MediaManager

### **For Developer:**
- **Repository:** `https://github.com/thaweesak2504/pqs-rtn-hybrid-storage.git`
- **Working Directory:** `D:\pqs-rtn-hybrid-storage`
- **Development:** `npm run tauri`
- **Build:** `npm run tauri:build`

---

**Last Updated:** September 28, 2025
**Status:** Foundation Complete, Ready for Hybrid Storage Implementation
