<!-- markdownlint-disable -->
# 🌐 Web Page Integration Plan — PQS RTN Hybrid Storage

> วิเคราะห์และวางแผนการเชื่อมต่อ Web Page กับ Database เพื่อให้ใช้งานได้เช่นเดียวกับ Desktop App

---

## 📊 1. สถานะปัจจุบัน (Current State Analysis)

### Desktop App ✅ (ทำงานได้สมบูรณ์)
```
[React Frontend] → invoke() → [Tauri/Rust Backend] → [SQLite Database]
                                                        ├── database.db   (Users, Avatars, HighRankingOfficers)
                                                        └── content.db    (Documents, Sections, Questions, References, OwnerUnits, OccupationBranches)
```

| Component | Technology | Status |
|-----------|-----------|--------|
| Frontend | React 18 + TypeScript + TailwindCSS + Vite | ✅ Working |
| Backend | Rust (Tauri 1.8) | ✅ Working |
| Database | SQLite (rusqlite 0.30) | ✅ Working |
| Storage | Hybrid (SQLite + File System) | ✅ Working |
| Auth | bcrypt hashing via Rust | ✅ Working |

### Web Page ❌ (ไม่ทำงาน)
```
[React Frontend] → invoke() → ❌ window.__TAURI__ is undefined
                               → Error: "Not running in Tauri environment"
                               → ไม่สามารถ Login, อ่าน/เขียนข้อมูลได้
```

**สาเหตุหลัก:** Frontend ใช้ `@tauri-apps/api` invoke() เรียก Rust backend โดยตรง — ไม่มี Web API Server

---

## 🔍 2. วิเคราะห์ขอบเขตปัญหา (Problem Scope)

### 2.1 Tauri Commands ที่ต้องสร้าง Web API ทดแทน (~100+ commands)

| กลุ่ม | จำนวน Commands | ตัวอย่าง |
|-------|---------------|---------|
| **User Management** | 10 | `get_all_users`, `authenticate_user`, `create_user`, `hash_password` |
| **Avatar Management** | 8 | `save_hybrid_avatar`, `get_hybrid_avatar_base64`, `delete_hybrid_avatar` |
| **Document CRUD** | 8 | `create_new_document`, `update_document`, `search_documents` |
| **Section CRUD** | 6 | `create_section`, `update_section`, `get_sections_by_document` |
| **Question CRUD** | 8 | `create_question`, `update_question`, `reorder_questions`, `upload_question_image` |
| **Reference Management** | 8 | `create_reference`, `add_section_reference`, `add_question_reference` |
| **Occupation Branches** | 10 | `get_occupation_branches`, `create_occupation_sub_question` |
| **Backup/Export** | 12 | `create_database_backup`, `import_hybrid_backup` |
| **High Rank Officers** | 6 | `get_all_high_ranking_officers`, `save_hybrid_high_rank_avatar` |
| **System/Init** | 8 | `check_system_state_for_initialization`, `initialize_database_if_needed` |
| **Desktop-only** | 6 | `zoom_in/out/reset`, `toggle_devtools`, `open_path`, `show_in_folder` |

### 2.2 Databases ที่ต้องเข้าถึง

**database.db** — User & System Data
- `users` — ข้อมูลผู้ใช้, password hash (bcrypt)
- `avatars` — Avatar binary data (legacy)
- `high_ranking_officers` — ข้อมูลนายทหารชั้นสูง

**content.db** — PQS Content Data
- `OwnerUnits` — หน่วยเจ้าของ (tree structure)
- `Documents` — เอกสาร PQS
- `Sections` — หมวด (100/200/300)
- `Questions` — คำถาม (with metadata JSON, images)
- `QuestionChoices` — ตัวเลือกคำตอบ
- `DocumentReferences` — เอกสารอ้างอิง
- `SectionReferences` — การเชื่อมโยงอ้างอิง-หมวด
- `QuestionReferences` — การเชื่อมโยงอ้างอิง-คำถาม
- `UserAnswers` — คำตอบผู้ใช้
- `OccupationBranches` / `OccupationSubBranches` — สาขาอาชีพ
- `OccupationSubQuestions` — คำถามย่อยตามสาขา

### 2.3 File System Operations
- **Avatar files**: `{app_data}/media/avatars/{user_id}/` 
- **High rank avatar files**: `{app_data}/media/high_rank_avatars/{officer_id}/`
- **Question images**: `{app_data}/data/images/`
- **Reference files**: `{app_data}/data/references/`
- **Backups**: `{app_data}/backups/`

### 2.4 Frontend Service Layer ที่ต้องแก้ไข

| File | ใช้ invoke() | ต้องแก้ |
|------|------------|--------|
| `services/tauriService.ts` | ✅ All user/avatar ops | สร้าง web fallback |
| `services/authService.ts` | ✅ Authentication | สร้าง web fallback |
| `services/database.ts` | ✅ DB init/health | สร้าง web fallback |
| `services/userService.ts` | ✅ User CRUD | สร้าง web fallback |
| `services/desktopService.ts` | ✅ Window/zoom ops | Skip for web |
| `services/hybridAvatarService.ts` | ✅ Avatar file ops | สร้าง web fallback |
| `contexts/AuthContext.tsx` | ✅ Login/session | สร้าง web fallback |
| `contexts/InitializationContext.tsx` | ✅ DB init wizard | สร้าง web fallback |
| `components/editor_v2/*.tsx` | ✅ ~50+ invoke calls | สร้าง web fallback |
| `components/pages/*.tsx` | ✅ Various | สร้าง web fallback |

---

## 🏗️ 3. ทางเลือกสถาปัตยกรรม (Architecture Options)

### Option A: Express.js API Server ⭐ แนะนำ

```
[React Frontend (Vite Build)]
        │
        ├── Tauri Mode: invoke() → Rust Backend → SQLite
        │
        └── Web Mode: fetch() → Express.js API → better-sqlite3 → SQLite (same files)
```

| เกณฑ์ | คะแนน |
|-------|-------|
| ความซับซ้อน | ★★★☆☆ ปานกลาง |
| ระยะเวลาพัฒนา | 2-3 สัปดาห์ |
| ใช้ Database เดียวกัน | ✅ ได้ |
| ไม่ต้อง Refactor Frontend มาก | ✅ ใช่ |
| Deploy ง่าย | ✅ ใช่ (Node.js server) |
| รองรับ Multi-user | ✅ ได้ |

**ข้อดี:**
- ใช้ TypeScript เหมือน frontend — ทีมคุ้นเคย
- `better-sqlite3` อ่าน/เขียน SQLite ได้ตรงๆ
- Deploy เป็น Node.js server ได้ง่าย
- สร้าง Service Abstraction Layer แค่ครั้งเดียว

**ข้อเสีย:**
- ต้องสร้าง API endpoints ~80+ ตัว
- ต้อง replicate business logic (bcrypt, file management)
- Database file locking: SQLite อาจ conflict ถ้า Desktop + Web เขียนพร้อมกัน

---

### Option B: Rust Web Server (Axum/Actix-web)

```
[React Frontend (Vite Build)]
        │
        ├── Tauri Mode: invoke() → Rust Backend → SQLite
        │
        └── Web Mode: fetch() → Rust HTTP Server → SQLite (same modules)
```

| เกณฑ์ | คะแนน |
|-------|-------|
| ความซับซ้อน | ★★★★☆ สูง |
| ระยะเวลาพัฒนา | 3-5 สัปดาห์ |
| Reuse Rust code | ✅ ได้มาก |
| Performance | ✅ สูงมาก |
| Consistency | ✅ ทำงานเหมือนกัน 100% |

**ข้อดี:**
- Reuse database modules จาก Tauri ได้เกือบทั้งหมด
- Business logic ตรงกัน 100% (bcrypt, file management)
- Performance สูงมาก

**ข้อเสีย:**
- ต้องเรียนรู้ Axum/Actix-web framework
- Rust compile time ช้า
- Setup CORS, session management ใน Rust ซับซ้อนกว่า

---

### Option C: SQLite WASM (sql.js) — ❌ ไม่แนะนำ

**ข้อเสีย:**
- Database อยู่ใน browser — ไม่ sync กับ Desktop
- ไม่สามารถ share ข้อมูลระหว่าง users
- File system access ไม่มี
- Security concern: database ใน client-side

### Option D: Cloud Database (Supabase/Firebase) — ❌ ไม่แนะนำ ณ ตอนนี้

**ข้อเสีย:**
- ต้อง refactor ทั้ง Desktop + Web
- ต้องมี internet connection ตลอด
- ข้อมูลทหาร — ความปลอดภัยเป็น concern สำคัญ
- ค่าใช้จ่าย hosting

---

## ✅ 4. แผนดำเนินการ — Option A: Express.js API Server (แนะนำ)

### Phase 1: Foundation — Service Abstraction Layer (3-4 วัน)

**เป้าหมาย:** สร้าง abstraction layer ให้ frontend เรียกใช้งานได้ทั้ง Tauri และ Web API

#### 1.1 สร้าง `src/services/apiService.ts`
```typescript
// Smart service that routes to Tauri invoke() or Web API fetch()
const isDesktop = () => typeof window !== 'undefined' && window.__TAURI__;

export async function apiCall<T>(command: string, args?: Record<string, any>): Promise<T> {
  if (isDesktop()) {
    const { invoke } = await import('@tauri-apps/api/tauri');
    return invoke<T>(command, args);
  } else {
    // Web mode: call Express API
    const response = await fetch(`/api/${command}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify(args || {}),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
}
```

#### 1.2 แก้ไข Service Files ให้ใช้ `apiCall()`
- `tauriService.ts` → ใช้ `apiCall()` แทน `safeInvoke()`
- `authService.ts` → ใช้ `apiCall()` สำหรับ authentication
- `InitializationContext.tsx` → skip wizard ใน web mode (database managed by server)

#### 1.3 แก้ไข Component invoke() calls
- ทุก component ที่เรียก `invoke()` โดยตรง → เปลี่ยนเป็น `apiCall()`
- ~50+ จุดใน `PqsQuestionSection.tsx`, `PqsSectionEditor.tsx`, etc.

---

### Phase 2: Express.js API Server (5-7 วัน)

**เป้าหมาย:** สร้าง web server ที่ expose REST API เทียบเท่า Tauri commands

#### 2.1 Project Setup
```
server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Express app entry
│   ├── config.ts             # Database paths, server config
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication middleware
│   │   └── cors.ts           # CORS configuration
│   ├── routes/
│   │   ├── auth.routes.ts    # Login, register, session
│   │   ├── user.routes.ts    # User CRUD
│   │   ├── document.routes.ts # Document CRUD
│   │   ├── section.routes.ts  # Section CRUD
│   │   ├── question.routes.ts # Question CRUD + images
│   │   ├── reference.routes.ts # Reference management
│   │   ├── branch.routes.ts   # Occupation branches/sub-questions
│   │   ├── avatar.routes.ts   # Avatar upload/download
│   │   ├── backup.routes.ts   # Backup/export operations
│   │   └── officer.routes.ts  # High ranking officers
│   ├── db/
│   │   ├── database.ts       # database.db connection (better-sqlite3)
│   │   ├── content.ts        # content.db connection (better-sqlite3)
│   │   └── queries/          # SQL query modules
│   └── utils/
│       ├── bcrypt.ts         # Password hashing
│       └── file.ts           # File management (avatars, images)
```

#### 2.2 Dependencies
```json
{
  "dependencies": {
    "express": "^4.18",
    "better-sqlite3": "^11.0",
    "bcryptjs": "^2.4",
    "jsonwebtoken": "^9.0",
    "multer": "^1.4",
    "cors": "^2.8",
    "helmet": "^7.0",
    "morgan": "^1.10",
    "dotenv": "^16.0"
  }
}
```

#### 2.3 API Endpoints (Priority Order)

**P0 — Login ต้องทำก่อน:**
| Method | Endpoint | Tauri Command |
|--------|----------|--------------|
| POST | `/api/authenticate_user` | `authenticate_user` |
| GET | `/api/get_all_users` | `get_all_users` |
| POST | `/api/create_user` | `create_user` |
| GET | `/api/get_user_by_id/:id` | `get_user_by_id` |

**P1 — Document Operations:**
| Method | Endpoint | Tauri Command |
|--------|----------|--------------|
| POST | `/api/create_new_document` | `create_new_document` |
| POST | `/api/update_document` | `update_document` |
| POST | `/api/delete_document` | `delete_document` |
| POST | `/api/search_documents` | `search_documents` |
| GET | `/api/get_document_with_hierarchy/:id` | `get_document_with_hierarchy` |
| GET | `/api/get_document_stats` | `get_document_stats` |

**P2 — Section & Question Operations:**
| Method | Endpoint | Tauri Command |
|--------|----------|--------------|
| POST | `/api/create_section` | `create_section` |
| POST | `/api/update_section` | `update_section` |
| GET | `/api/get_sections_by_document/:id` | `get_sections_by_document` |
| POST | `/api/create_question` | `create_question` |
| POST | `/api/update_question` | `update_question` |
| POST | `/api/reorder_questions` | `reorder_questions` |
| POST | `/api/upload_question_image` | `upload_question_image` |

**P3 — Reference & Branch Operations:**
| Method | Endpoint | Tauri Command |
|--------|----------|--------------|
| POST | `/api/create_reference` | `create_reference` |
| GET | `/api/get_references` | `get_references` |
| GET | `/api/get_occupation_branches` | `get_occupation_branches` |
| POST | `/api/create_occupation_sub_question` | `create_occupation_sub_question` |

**P4 — Avatar & File Operations:**
| Method | Endpoint | Tauri Command |
|--------|----------|--------------|
| POST | `/api/save_hybrid_avatar` | `save_hybrid_avatar` |
| GET | `/api/get_hybrid_avatar_base64/:userId` | `get_hybrid_avatar_base64` |
| GET | `/api/get_question_image_base64/:path` | `get_question_image_base64` |

---

### Phase 3: Authentication & Session (2-3 วัน)

#### 3.1 JWT-based Authentication
```typescript
// server: generate JWT token on login
const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

// client: store in localStorage, send with every request
headers: { 'Authorization': `Bearer ${token}` }
```

#### 3.2 AuthContext Web Fallback
- `signIn()` → POST `/api/authenticate_user` → get JWT token
- `checkAuthStatus()` → verify JWT token validity
- `signOut()` → clear localStorage token

#### 3.3 Role-based Access Control
- Admin: full access
- Editor: document CRUD
- Viewer: read-only

---

### Phase 4: File Handling & Images (2-3 วัน)

#### 4.1 Avatar Upload/Download
- Web: `multipart/form-data` → Express `multer` → save to same directory
- Download: serve files via Express static or base64 API

#### 4.2 Question Images
- Upload: `multipart/form-data` → save to `data/images/`
- Display: serve via `/api/get_question_image_base64/:path`

#### 4.3 Reference Files
- Upload: `multipart/form-data` → save to `data/references/`
- Download: serve via Express static routes

---

### Phase 5: Desktop-specific Feature Handling (1-2 วัน)

| Feature | Desktop | Web |
|---------|---------|-----|
| Window Controls (min/max/close) | ✅ Tauri API | ❌ Hide UI |
| Zoom In/Out | ✅ Tauri command | ✅ CSS zoom |
| File Dialogs | ✅ Native dialog | ✅ HTML `<input type="file">` |
| Open External URL | ✅ `shell.open()` | ✅ `window.open()` |
| Show in Folder | ✅ Native | ❌ N/A |
| DB Backup/Restore | ✅ File system | ✅ Download/Upload |
| Initialization Wizard | ✅ Check DB state | ❌ Skip (server manages DB) |

---

### Phase 6: Build & Deployment (2-3 วัน)

#### 6.1 Vite Build Configuration
```typescript
// vite.config.ts — add web build mode
export default defineConfig(({ mode }) => ({
  // ... existing config
  define: {
    __WEB_MODE__: mode === 'web',
  },
  build: {
    outDir: mode === 'web' ? 'dist-web' : 'dist',
  }
}));
```

#### 6.2 Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "dev:web": "vite --mode web",
    "build:web": "vite build --mode web",
    "server": "cd server && npm run dev",
    "server:build": "cd server && npm run build",
    "web": "concurrently \"npm run server\" \"npm run dev:web\""
  }
}
```

#### 6.3 Deployment Options
```
Option 1: Same Machine (Local Network)
├── Express server runs on port 3000
├── Serves built React app (dist-web/)
├── Accesses same SQLite databases
└── Other machines access via LAN IP

Option 2: Dedicated Server
├── Copy database files to server
├── Run Express + React on server
├── Access via domain/IP
└── Note: SQLite concurrent writes limited

Option 3: Docker Container (Future)
├── Dockerfile with Node.js
├── Mount database volume
├── Easy deployment and scaling
```

---

## ⚠️ 5. อุปสรรคและวิธีแก้ไข

### 5.1 SQLite Concurrent Access 🔴 สำคัญมาก
**ปัญหา:** SQLite ไม่รองรับ multiple writers พร้อมกัน — ถ้า Desktop App + Web Server เขียนพร้อมกัน จะเกิด `SQLITE_BUSY`

**วิธีแก้:**
1. **WAL Mode**: เปิด `PRAGMA journal_mode=WAL` — ช่วยให้อ่านพร้อมกันได้ แต่เขียนยังต้องทีละตัว
2. **Busy Timeout**: ตั้ง `PRAGMA busy_timeout=5000` — รอ 5 วินาทีถ้า database locked
3. **ใช้ทีละ mode**: ถ้า Desktop เปิดอยู่ Web ให้เป็น read-only หรือไม่ใช้พร้อมกัน
4. **Future**: ย้ายไป PostgreSQL ถ้าต้องการ multi-user จริงจัง

### 5.2 Business Logic Duplication 🟡 ปานกลาง
**ปัญหา:** Logic ใน Rust (password hashing, file management) ต้อง replicate ใน Node.js

**วิธีแก้:**
- `bcrypt` → ใช้ `bcryptjs` (JavaScript) — compatible กับ Rust bcrypt output
- File management → ใช้ `fs` module ชี้ไปที่ directory เดียวกัน
- Document ID generation → port logic จาก Rust เป็น TypeScript

### 5.3 Database Schema Sync 🟡 ปานกลาง
**ปัญหา:** ถ้า Desktop app update schema ผ่าน Rust migration, Web server ต้อง update ด้วย

**วิธีแก้:**
- ใช้ version number ใน database
- Web server check schema version on startup
- Share migration scripts

### 5.4 Image/File Path Resolution 🟡 ปานกลาง
**ปัญหา:** Desktop ใช้ absolute paths, Web ใช้ URLs

**วิธีแก้:**
- Web server ให้บริการ static files จาก data directory
- สร้าง path resolver middleware
- ใช้ base64 encoding สำหรับ images ขนาดเล็ก

### 5.5 Security 🔴 สำคัญ
**ปัญหา:** Web API เปิด HTTP endpoint — ต้องมี authentication

**วิธีแก้:**
- JWT token authentication ทุก endpoint
- CORS whitelist
- Rate limiting
- HTTPS (production)
- Role-based access control

---

## 📅 6. Timeline ประมาณการ

| Phase | งาน | ระยะเวลา | Dependencies |
|-------|------|---------|-------------|
| **Phase 1** | Service Abstraction Layer | 3-4 วัน | — |
| **Phase 2** | Express.js API Server (P0+P1) | 5-7 วัน | Phase 1 |
| **Phase 3** | Authentication & Session | 2-3 วัน | Phase 2 |
| **Phase 4** | File Handling & Images | 2-3 วัน | Phase 2 |
| **Phase 5** | Desktop-specific Handling | 1-2 วัน | Phase 1 |
| **Phase 6** | Build & Deployment | 2-3 วัน | Phase 2-5 |
| **Testing** | Integration + UAT | 3-4 วัน | All |
| **Total** | | **~18-26 วัน** | |

---

## 🎯 7. Milestone & Deliverables

### Milestone 1: Admin Login on Web ✨
- [ ] Express server running
- [ ] `/api/authenticate_user` endpoint
- [ ] AuthContext web fallback
- [ ] Admin can login via web browser

### Milestone 2: Document Browsing
- [ ] Document list/search API
- [ ] Section/Question read APIs
- [ ] Document viewer on web

### Milestone 3: Full CRUD
- [ ] Document/Section/Question create/update/delete
- [ ] Image upload via web
- [ ] Reference management

### Milestone 4: Feature Parity
- [ ] Avatar management
- [ ] Backup/export download
- [ ] All features work on web

---

## 📁 8. ไฟล์ที่ต้องสร้าง/แก้ไข

### สร้างใหม่
```
server/                          # Express.js API Server (ทั้ง directory)
src/services/apiService.ts       # Service Abstraction Layer
src/services/webAuthService.ts   # Web-specific auth helpers
```

### แก้ไข (สำคัญ)
```
src/services/tauriService.ts     # เปลี่ยนให้ใช้ apiCall()
src/contexts/AuthContext.tsx      # เพิ่ม web fallback
src/contexts/InitializationContext.tsx  # skip wizard for web
src/components/editor_v2/PqsQuestionSection.tsx  # invoke() → apiCall()
src/components/editor_v2/PqsSectionEditor.tsx    # invoke() → apiCall()
src/components/editor_v2/PqsReferenceSection.tsx # invoke() → apiCall()
src/components/pages/EditorPage.tsx              # invoke() → apiCall()
src/components/pages/ActiveDocumentPage.tsx       # invoke() → apiCall()
src/components/pages/DatabaseViewerPage.tsx       # invoke() → apiCall()
src/components/pages/TeamPage.tsx                 # invoke() → apiCall()
src/components/BaseLayout.tsx    # hide Tauri-specific UI
src/components/WindowControls.tsx # hide for web
vite.config.ts                   # add web build mode
package.json                     # add web scripts
```

---

## 💡 9. Quick Start — เริ่มทันที

เริ่มที่สิ่งเล็กที่สุดที่ให้ผลลัพธ์ใหญ่ที่สุด: **ให้ Admin Login ผ่าน Web ได้**

```bash
# Step 1: สร้าง server/ directory + Express setup
# Step 2: สร้าง /api/authenticate_user endpoint
# Step 3: สร้าง apiService.ts abstraction
# Step 4: แก้ AuthContext.tsx ให้ใช้ apiCall()
# Step 5: ทดสอบ login ผ่าน browser → http://localhost:3000
```

เมื่อ Login ได้แล้ว จะเพิ่ม API ทีละกลุ่มตาม Priority (P0 → P1 → P2 → P3 → P4)

---

> **หมายเหตุ:** แผนนี้เน้นที่ Option A (Express.js) เพราะเหมาะสมที่สุดกับ stack ปัจจุบัน (TypeScript/JavaScript ecosystem) และ timeline ของโปรเจค สามารถ upgrade เป็น Option B (Rust Axum) หรือ Option D (Cloud DB) ได้ในอนาคตถ้าต้องการ
