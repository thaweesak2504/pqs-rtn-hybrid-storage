# PQS RTN — Personnel Qualification Standard (Royal Thai Navy)

> **Desktop Application สำหรับจัดทำชุดเอกสารมาตรฐานกำลังพล (PQS) ของกองทัพเรือ**
> สร้าง แก้ไข พรีวิว และส่งออกเอกสาร PQS ครบวงจร — ทั้ง Trainee Edition และ Qualifier Edition

| Stack       | Technology                                         |
| ----------- | -------------------------------------------------- |
| **Frontend**| React 18 · TypeScript · Tailwind CSS · Lucide Icons|
| **Backend** | Rust (Tauri v1) · rusqlite                         |
| **Database**| SQLite (`content.db` — single source of truth)     |
| **Testing** | Vitest + Testing Library (Frontend) · cargo test (Rust) |
| **CI/CD**   | GitHub Actions (`rust-tests.yml`, `frontend-tests.yml`) |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│  React (TypeScript)           Tauri invoke()             │
│  ┌────────────────┐           ┌────────────────────────┐ │
│  │  Pages          │──invoke──▶│  commands/             │ │
│  │  Components     │◀─result──│    content.rs           │ │
│  │  Editor v2      │           │    avatars.rs           │ │
│  │  Hooks/Services │           │    backup.rs · users.rs │ │
│  └────────────────┘           └──────────┬─────────────┘ │
│                                          │               │
│                                ┌─────────▼───────────┐   │
│                                │  content_database/   │   │
│                                │  ├── schema.rs       │   │
│                                │  ├── documents.rs    │   │
│                                │  ├── questions.rs    │   │
│                                │  ├── sections.rs     │   │
│                                │  ├── references.rs   │   │
│                                │  ├── answers.rs      │   │
│                                │  ├── scoring.rs      │   │
│                                │  ├── branches.rs     │   │
│                                │  ├── media.rs        │   │
│                                │  └── migrations.rs   │   │
│                                └──────────┬──────────┘   │
│                                           │              │
│                                    ┌──────▼──────┐       │
│                                    │ content.db  │       │
│                                    │  (SQLite)   │       │
│                                    └─────────────┘       │
└──────────────────────────────────────────────────────────┘
```

**Design Philosophy:**
- **Rust as the Engine** — ทุก file I/O, database CRUD, heavy data lifting อยู่ใน `src-tauri/src/`
- **React as the View** — frontend เรียก Rust ผ่าน `@tauri-apps/api` invoke เท่านั้น
- **Single Source of Truth** — `content.db` (SQLite) เป็นตัวหลัก, UI state ทำ optimistic update แล้ว sync กลับ

---

## 📁 Project Structure

```
pqs-rtn-hybrid-storage/
│
├── .agent/                          # 🤖 Agent Skills & Workflows
│   ├── skills/                      #    ⬅ AGENT: อ่านก่อนเขียนโค้ดทุกครั้ง
│   │   ├── skill-01-architecture.md #    Tech Stack, Philosophy, File Layout
│   │   ├── skill-02-frontend-react.md   UI Design System, Tailwind, Fonts
│   │   ├── skill-03-backend-rust.md #    Tauri Commands, SQLite Rules
│   │   └── skill-04-domain-logic.md #    PQS Section 100/200/300 Rules
│   └── workflows/
│       ├── agent-onboarding.md      #    Onboarding checklist
│       └── cleanup-terminals.md     #    Kill stuck processes
│
├── src/                             # ⚛️ React Frontend
│   ├── App.tsx                      #    Root component + Router
│   ├── main.tsx                     #    Entry point
│   ├── index.css                    #    Global CSS (github-bg-* vars)
│   ├── components/
│   │   ├── pages/                   #    Route pages (SignIn, Dashboard, Editor, ...)
│   │   ├── editor_v2/               #    ⭐ Core PQS editor (Question/Section/Preview)
│   │   ├── ui/                      #    Reusable UI (Button, Modal, Tooltip, Grid)
│   │   ├── forms/                   #    Form components
│   │   ├── modals/                  #    Modal dialogs
│   │   ├── search/                  #    Search functionality
│   │   ├── views/                   #    View-specific components
│   │   └── common/                  #    Shared components
│   ├── hooks/                       #    Custom React hooks (26 hooks)
│   ├── services/                    #    Tauri invoke wrappers
│   ├── types/                       #    TypeScript interfaces (maps to Rust structs)
│   ├── utils/                       #    Utilities (thaiNumbering, logger, sanitizer)
│   ├── contexts/                    #    React Context providers
│   ├── config/                      #    App configuration
│   ├── styles/                      #    Additional stylesheets
│   ├── test/                        #    Test files (unit + integration)
│   └── assets/                      #    Static assets (images, fonts)
│       └── fonts/                   #    Kanit + TH Sarabun (woff2)
│
├── src-tauri/                       # 🦀 Rust Backend (Tauri)
│   ├── src/
│   │   ├── main.rs                  #    Tauri entry + command registration
│   │   ├── commands/                #    Tauri invoke handlers
│   │   │   ├── content.rs           #    PQS content CRUD
│   │   │   ├── avatars.rs           #    Avatar management
│   │   │   ├── backup.rs            #    Database backup/restore
│   │   │   ├── users.rs             #    User operations
│   │   │   ├── officers.rs          #    Officer data
│   │   │   ├── system.rs            #    System commands
│   │   │   └── zoom.rs              #    Zoom level persistence
│   │   ├── content_database/        #    ⭐ Core SQLite logic (15 modules)
│   │   │   ├── schema.rs            #    Table definitions & creation
│   │   │   ├── documents.rs         #    Document CRUD
│   │   │   ├── questions.rs         #    Question CRUD (hierarchical)
│   │   │   ├── sections.rs          #    Section management (100/200/300)
│   │   │   ├── references.rs        #    Reference system (usage_count)
│   │   │   ├── answers.rs           #    Trainee answers
│   │   │   ├── scoring.rs           #    Score calculation
│   │   │   ├── branches.rs          #    Career branch logic
│   │   │   ├── media.rs             #    Media/image management
│   │   │   ├── section_links.rs     #    Section linking
│   │   │   ├── migrations.rs        #    DB version migrations
│   │   │   ├── connection.rs        #    Connection management
│   │   │   ├── types.rs             #    Rust struct definitions
│   │   │   ├── helpers.rs           #    Query helpers
│   │   │   └── utils.rs             #    Utility functions
│   │   ├── auth.rs                  #    Authentication
│   │   ├── database_export.rs       #    Export/Import logic
│   │   ├── hybrid_avatar.rs         #    File-based avatar storage
│   │   ├── hybrid_backup.rs         #    Hybrid backup system
│   │   ├── file_manager.rs          #    File system operations
│   │   ├── migrations.rs            #    Schema migrations
│   │   └── test_helpers.rs          #    Test utilities
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── docs/                            # 📚 Documentation
│   ├── system_specifications.md     #    Business rules & data formats
│   ├── refactoring-plan.md          #    Refactoring strategy
│   └── ...                          #    Analysis, plans, guides
│
├── scripts/                         # 🔧 Automation Scripts (22 scripts)
│   ├── run-rust-tests.ps1           #    Rust test runner
│   ├── run-frontend-tests.ps1       #    Frontend test runner
│   ├── clean-processes.ps1          #    Process cleanup
│   └── ...                          #    Utility scripts
│
├── .github/workflows/               # 🔄 CI/CD
│   ├── rust-tests.yml               #    Rust CI pipeline
│   └── frontend-tests.yml           #    Frontend CI pipeline
│
├── package.json                     #    npm scripts & dependencies
├── vite.config.ts                   #    Vite bundler config (port 1420)
├── tailwind.config.js               #    Tailwind + github-* custom palette
├── tsconfig.json                    #    TypeScript configuration
└── vitest.config.ts                 #    Vitest test configuration
```

---

## 🎯 PQS Domain Overview

ระบบ PQS มี 3 Sections หลัก แต่ละ Section มีสี theme และ logic ต่างกัน:

| Section | ชื่อ | Theme Color | ลักษณะพิเศษ |
|---------|------|-------------|-------------|
| **100** | Fundamentals (ความรู้พื้นฐาน) | 🟢 Green | คำถามแบบข้อเขียน, recursive children 3 ระดับ |
| **200** | Systems (ระบบ) | 🟠 Orange | ใช้ `OccupationSubQuestions` + `selectedSubQCodes` |
| **300** | Watchstations (การปฏิบัติหน้าที่) | 🟣 Purple | Trainee Attachments, Score calculation bottom-up |

> 📖 **รายละเอียดเพิ่มเติม:** อ่าน `.agent/skills/skill-04-domain-logic.md`

### User Roles
1. **Creator** — สร้าง/แก้ไข PQS content, จัดการ Reference Database
2. **Qualifier** — กรรมการผู้ทดสอบ (ดูเฉลย)
3. **Trainee** — ผู้รับการทดสอบ

### Output Formats
- **Trainee Edition** — เล่มคำถาม (ไม่มีเฉลย)
- **Qualifier Edition** — เล่มเฉลย/คู่มือกรรมการ

---

## 🚀 Quick Start

### Prerequisites

```powershell
node --version    # Node.js (LTS recommended)
cargo --version   # Rust toolchain
```

### Installation

```powershell
# อยู่ที่ project root เสมอ: D:\pqs-rtn-hybrid-storage
npm install
```

### Development

```powershell
# เปิด Desktop App (Tauri dev mode)
npm run tauri           # หรือ npm start / npm run app / npm run desktop

# Frontend only (Vite dev server, port 1420)
npm run dev

# Build production
npm run tauri:build
```

> ⚠️ **สำคัญ:** ต้องรัน commands จาก **project root** (`D:\pqs-rtn-hybrid-storage`) เสมอ
> ดูรายละเอียดเพิ่มเติมที่ `HOW_TO_RUN_PROJECT.md`

---

## 🧪 Testing

### Frontend Tests (Vitest)

```powershell
npm run test:run          # Run all tests
npm run test:integration  # Integration tests only
npm run test:coverage     # Coverage report
npm run test:ui           # Interactive test UI
npm test                  # Watch mode
```

### Rust Tests

```powershell
cd src-tauri && cargo test && cd ..

# หรือใช้ automation script
.\scripts\run-rust-tests.ps1
.\scripts\run-rust-tests.ps1 -Coverage
```

### CI/CD
- `.github/workflows/rust-tests.yml` — Rust test pipeline
- `.github/workflows/frontend-tests.yml` — Frontend test pipeline

---

## 🤖 Agent Instructions

> **สำหรับ AI Agent ที่เข้ามาทำงานกับโปรเจคนี้**

### ขั้นตอนแรก (Onboarding)

1. **อ่าน skills ทั้ง 4 ไฟล์** ใน `.agent/skills/` ก่อนเขียนหรือแก้ไขโค้ดใดๆ:
   - `skill-01-architecture.md` — Tech Stack, Philosophy, File Layout
   - `skill-02-frontend-react.md` — UI Design System, Tailwind (github-bg-*), A4 Paper, Typography
   - `skill-03-backend-rust.md` — Tauri Command patterns, SQLite rules, Type synchronization
   - `skill-04-domain-logic.md` — PQS Section 100/200/300 rules, `usage_count`, Attachments

2. **ทำตาม workflow** ใน `.agent/workflows/agent-onboarding.md`

### กฎที่ต้องปฏิบัติ

| หมวด | กฎ |
|------|-----|
| **UI Colors** | ใช้ `github-bg-*` CSS variables เท่านั้น ห้ามสร้างสีใหม่ |
| **Section Colors** | 100=Green, 200=Orange, 300=Purple (ดู `themeColors.ts`) |
| **Icons** | ใช้ `lucide-react` เท่านั้น |
| **Fonts** | `font-kanit` (UI) + `font-th-sarabun` (print/documents) |
| **Tauri Commands** | Return `Result<T, String>` — ห้าม `.unwrap()` ใน production |
| **SQLite** | ใช้ prepared statements + parameter binding เสมอ |
| **Types** | Rust structs ต้อง sync กับ `src/types/content.ts` |
| **Components** | ใช้ `src/components/ui/` ที่มีอยู่ ไม่สร้างใหม่ซ้ำ |
| **Error Handling** | ใช้ `logger` + `onAlert(msg, 'danger')` |

---

## 📚 Documentation Index

### คู่มือการใช้งาน
- [`HOW_TO_RUN_PROJECT.md`](HOW_TO_RUN_PROJECT.md) — วิธีรันโปรเจค (ละเอียด)
- [`GIT_WORKFLOW_GUIDE.md`](GIT_WORKFLOW_GUIDE.md) — Git branching strategy
- [`FIX_WHITE_FLASH_STARTUP.md`](FIX_WHITE_FLASH_STARTUP.md) — แก้ปัญหาจอขาว startup

### Business Logic & Specifications
- [`docs/system_specifications.md`](docs/system_specifications.md) — Document ID generation, Section rules, Business rules
- [`project_goals.md`](project_goals.md) — Project vision & objectives

### Plans & Refactoring
- [`PHASE5_REFACTORING_PLAN.md`](PHASE5_REFACTORING_PLAN.md)
- [`PHASE5G_TRAINEE_ATTACHMENTS_PLAN.md`](PHASE5G_TRAINEE_ATTACHMENTS_PLAN.md)
- [`300-template-plan.md`](300-template-plan.md)
- [`career_branch_management_plan.md`](career_branch_management_plan.md)
- [`PROJECT_REVIEW_PLAN.md`](PROJECT_REVIEW_PLAN.md)


### Analysis

- [`docs/refactoring-plan.md`](docs/refactoring-plan.md) — Comprehensive refactoring plan

---

## 📄 License

MIT License
