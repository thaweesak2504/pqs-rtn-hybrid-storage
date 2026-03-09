# Testing Usage Guide — PQS RTN Hybrid Storage

> Created: 2026-03-09  
> Testing Infrastructure Complete: Phase B & C1 ✅  
> Total Tests: **47 passing** across 8 files

---

## 📋 Quick Reference

| Command                    | Purpose                                           |
| -------------------------- | ------------------------------------------------- |
| `npm run test:run`         | รันทุก tests ครั้งเดียว (CLI mode)                |
| `npm test`                 | Watch mode - เฝ้าดูไฟล์ที่เปลี่ยน รีรัน tests     |
| `npm run test:ui`          | Interactive dashboard - ดู tests ทั้งหมดแบบ UI    |
| `npm run test:coverage`    | สร้าง coverage report - ดูเปอร์เซ็นต์โค้ดที่ test |
| `npm run test:integration` | รัน integration tests เท่านั้น (25 tests)         |

---

## 🎯 Test Structure

### โครงสร้างไฟล์

```
src/test/
├── setup.ts                                          # Global setup
├── utils/                    (14 tests)
│   ├── commandSanitizer.test.ts                (8 tests)
│   └── resolveAvatarSource.test.ts             (6 tests)
├── components/               (8 tests)
│   ├── Button.test.tsx                         (3 tests)
│   └── Modal.test.tsx                          (5 tests)
└── integration/              (25 tests)
    ├── zoomService.integration.test.ts         (4 tests)
    ├── hybridAvatarService.integration.test.ts (4 tests)
    ├── tauriService.integration.test.ts        (10 tests)
    └── desktopService.integration.test.ts      (7 tests)
```

### Summary

| ประเภท          | ไฟล์  | Tests  | ทดสอบอะไร                                        |
| --------------- | ----- | ------ | ------------------------------------------------ |
| **Utility**     | 2     | 14     | Pure functions (Thai numbers, sanitize, resolve) |
| **Component**   | 2     | 8      | UI rendering & user interactions                 |
| **Integration** | 4     | 25     | Service layers + Tauri backend mapping           |
| **TOTAL**       | **8** | **47** | ✅ Coverage: 64.72% lines, 62.5% functions       |

---

## 🏃 Running Tests

### 1. รันทุก Tests

```bash
npm run test:run
```

**Output:**

```
✓ src/test/integration/zoomService.integration.test.ts (4 tests)
✓ src/test/integration/hybridAvatarService.integration.test.ts (4 tests)
✓ src/test/utils/resolveAvatarSource.test.ts (6 tests)
✓ src/test/integration/tauriService.integration.test.ts (10 tests)
✓ src/test/utils/commandSanitizer.test.ts (8 tests)
✓ src/test/integration/desktopService.integration.test.ts (7 tests)
✓ src/test/components/Button.test.tsx (3 tests)
✓ src/test/components/Modal.test.tsx (5 tests)

Test Files  8 passed (8)
      Tests  47 passed (47)
 Duration  2.36s
```

### 2. Watch Mode -- ดูทันทีขณะเขียนโค้ด

```bash
npm test
```

- ไฟล์ที่เปลี่ยน → tests ของไฟล์นั้นรีรันอัตโนมัติ
- ไม่ต้อง commit เพื่อดู test results
- กด `q` เพื่อออก

### 3. Test UI Dashboard

```bash
npm run test:ui
```

- เปิด http://localhost:51204/**vitest**/
- ดูทุก tests พร้อม filter/search
- ดูรายละเอียด error ถ้า tests fail
- Interactive mode ใช้เมื่อ debug

### 4. Coverage Report

```bash
npm run test:coverage
```

**Output:**

```
 File | % Stmts | % Branch | % Funcs | % Lines
------|---------|----------|---------|--------
 All  |  64.72  |   62.5   |  62.5   | 64.72
```

- สร้าง `coverage/frontend/index.html`
- ดูว่าไฟล์ไหนต้อง test เพิ่ม
- Threshold: 50% (current: exceed ✅)

### 5. รัน Tests กรุ๊ปเฉพาะ

```bash
# Integration tests เท่านั้น
npm run test:integration

# Utility tests เท่านั้น
npm run test:run -- src/test/utils

# Component tests เท่านั้น
npm run test:run -- src/test/components

# ไฟล์เดียว
npm run test:run -- Button.test.tsx

# Verbose output
npm run test:run -- --reporter=verbose
```

---

## 📚 Test Examples

### Utility Test — commandSanitizer.test.ts

```typescript
describe("commandSanitizer", () => {
  // ทดสอบการลบ Thai diacritics อันตรายออก
  it("removes Thai diacritics marks", () => {
    expect(sanitizeCommand("คำสั่งเดี่ยว")).toBe("คำสงเดยว");
  });

  // ทดสอบการลบ zero-width characters
  it("removes invisible zero-width characters", () => {
    expect(sanitizeCommand("test\u200Bcommand")).toBe("testcommand");
  });

  // ทดสอบการลบ control characters
  it("removes control characters", () => {
    expect(sanitizeCommand("test\u0001command")).toBe("testcommand");
  });
});
```

**ใช้เมื่อ:** บันทึก commands จาก user input ต้องปลอดภัย

---

### Component Test — Button.test.tsx

```typescript
describe("Button component", () => {
  // Test onClick event
  it("should call onClick when clicked", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalled();
  });

  // Test disabled + loading state
  it("should be disabled while loading", () => {
    render(<Button isLoading={true}>Loading...</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  // Test icon positioning
  it("should position icon correctly", () => {
    const { container } = render(<Button icon={<Icon />}>Text</Button>);
    const flexContainer = container.querySelector(".flex");
    expect(flexContainer).toHaveClass("items-center");
  });
});
```

**ใช้เมื่อ:** แก้ UI components หรือเพิ่ม interactions

---

### Integration Test — tauriService.integration.test.ts

```typescript
describe("tauriService integration", () => {
  // Test Tauri environment detection
  it("safeInvoke rejects when not in tauri environment", async () => {
    setTauriUnavailable(); // Mock Tauri = undefined

    await expect(safeInvoke("get_all_users")).rejects.toThrow(
      "Not running in Tauri environment",
    );
  });

  // Test command payload mapping
  it("maps createUser payload to backend keys", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce({ id: 1 });

    await tauriUserService.createUser(
      "admin",
      "admin@x.com",
      "pass",
      "Admin User",
      "CAPT",
      "admin",
    );

    expect(invoke).toHaveBeenCalledWith("create_user", {
      username: "admin",
      email: "admin@x.com",
      password: "pass",
      fullName: "Admin User",
      rank: "CAPT",
      role: "admin",
    });
  });

  // Test Uint8Array serialization
  it("maps saveAvatar payload with Uint8Array → number[]", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce({ id: 2 });

    await tauriAvatarService.saveAvatar(
      7,
      new Uint8Array([10, 20, 30]),
      "image/png",
    );

    expect(invoke).toHaveBeenCalledWith("save_avatar", {
      userId: 7,
      avatarData: [10, 20, 30], // ← Serialized
      mimeType: "image/png",
    });
  });

  // Test error handling
  it("rethrows deleteAvatar errors", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockRejectedValueOnce(new Error("delete failed"));

    await expect(tauriAvatarService.deleteAvatar(3)).rejects.toThrow(
      "delete failed",
    );
  });
});
```

**ใช้เมื่อ:**

- เชื่อมต่อ Frontend ↔ Tauri Backend
- ทดสอบ command mapping + payload serialization
- ตรวจ error handling

---

## 🛠️ Configuration Files

### vitest.config.ts

```typescript
{
  test: {
    globals: true,              // ใช้ describe/it โดยไม่ต้อง import
    environment: "jsdom",       // Browser-like environment สำหรับ React
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",           // v8 coverage provider
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 45,
      },
    },
  },
}
```

### src/test/setup.ts

```typescript
// Global mocking สำหรับทุก tests:
vi.mock("@tauri-apps/api/tauri"); // Mock invoke() → Tauri
vi.mock("@tauri-apps/api/dialog"); // Mock open/save dialogs
vi.mock("@tauri-apps/api/fs"); // Mock file operations

// Mock browser APIs
global.IntersectionObserver = class {
  /* ... */
};
```

---

## ✅ Workflow — Best Practices

### 1. Create New Feature

```bash
# Start watch mode
npm test

# Edit src/features/NewFeature.tsx
# → watch mode รีรัน tests อัตโนมัติ
```

### 2. Add New Tests

```typescript
// src/test/components/NewFeature.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewFeature } from "@/components/NewFeature";

describe("NewFeature", () => {
  it("should render the feature", () => {
    render(<NewFeature />);
    expect(screen.getByText(/new feature/i)).toBeInTheDocument();
  });
});
```

### 3. Before Commit

```bash
# Verify all tests pass
npm run test:run

# Check coverage
npm run test:coverage

# Commit & push
git add .
git commit -m "Add NewFeature with tests"
git push
```

### 4. CI/CD Integration

GitHub Actions automatic:

```yaml
on: [push, pull_request]
jobs:
  test:
    - npm install
    - npm run test:run # All tests must pass
    - npm run test:coverage # Coverage report
```

---

## 🐛 Troubleshooting

### Tests fail with "Cannot find module"

```bash
# Clear vitest cache
rm -r node_modules/.vitest
npm run test:run
```

### Tauri mock not working in test

```typescript
// Ensure setup.ts runs BEFORE test
import "@tauri-apps/api/tauri"; // ← Must import first
import { invoke } from "@tauri-apps/api/tauri";

vi.mock("@tauri-apps/api/tauri"); // ← Then mock
```

### Tests timeout

```bash
# Increase timeout
npm run test:run -- --testTimeout=10000

# Or in test file
it("slow test", async () => {
  // ...
}, { timeout: 5000 });
```

---

## 📊 Coverage Targets

Current (Phase C1 complete):

```
Lines:     64.72% ✅ (Target: 50%)
Functions: 62.5%  ✅ (Target: 50%)
Branches:  >50%   ✅ (Target: 45%)
```

Files with 100% coverage:

- `resolveAvatarSource.ts` — 6 tests
- `Modal.tsx` — 5 tests

Files with >90% coverage:

- `Button.tsx` — 98.18%

---

## 🎓 Learning Resources

### Internal

- [refactoring-plan.md](refactoring-plan.md) — Phase A-D testing roadmap
- [README.md](../README.md) — Testing section
- Sample tests in `src/test/` — Real examples

### External

- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Vue/React Testing Patterns](https://vitest.dev/guide/testing-types.html)

---

## 📝 Next Steps

### Immediate (Ready to start)

- [ ] Add tests for new features before implementing
- [ ] Maintain >50% coverage threshold
- [ ] Run `npm test` in watch mode while developing

### Phase A (Rust unit tests) — Coming soon

- [ ] Setup cargo test infrastructure
- [ ] Test pure functions (generate_document_id, etc.)
- [ ] Test database CRUD operations

### Phase D (E2E tests) — After refactoring stable

- [ ] Setup Tauri WebDriver
- [ ] Create smoke tests (app launch)
- [ ] Test critical user paths

---

## 📂 Complete File Tree — Test Related

```
project/
├── 📄 vitest.config.ts                     # Vitest configuration
├── 📄 tsconfig.json                        # TypeScript config (with vitest/globals types)
├── 📄 package.json                         # Test scripts + devDependencies
│
├── src/
│   ├── 📄 main.tsx                         # React entry point
│   ├── 📄 index.css                        # Global styles
│   ├── 📄 App.tsx                          # Root component
│   ├── 📄 vite-env.d.ts
│   │
│   ├── components/                         # React components (tested)
│   │   ├── ui/
│   │   │   ├── Button.tsx                  # Button component
│   │   │   └── Modal.tsx                   # Modal component
│   │   └── ... (other components)
│   │
│   ├── services/                           # Frontend services (tested)
│   │   ├── zoomService.ts                  # Zoom operations → Tauri
│   │   ├── hybridAvatarService.ts          # Avatar file storage
│   │   ├── tauriService.ts                 # Tauri backend mapping
│   │   ├── desktopService.ts               # Window + system ops
│   │   └── ... (other services)
│   │
│   ├── utils/                              # Utility functions (tested)
│   │   ├── commandSanitizer.ts             # Thai char sanitization
│   │   ├── resolveAvatarSource.ts          # Avatar image resolution
│   │   └── ... (other utils)
│   │
│   └── test/                               # ⭐ TEST DIRECTORY
│       ├── 📄 setup.ts                     # Global test setup + mocks
│       │                  ├─ vi.mock("@tauri-apps/api/tauri")
│       │                  ├─ vi.mock("@tauri-apps/api/dialog")
│       │                  ├─ vi.mock("@tauri-apps/api/fs")
│       │                  └─ global polyfills (IntersectionObserver)
│       │
│       ├── utils/                          # Utility tests (14 tests)
│       │   ├── commandSanitizer.test.ts    # 8 tests
│       │   │  └─ Thai diacritics, control chars, zero-width removal
│       │   └── resolveAvatarSource.test.ts # 6 tests
│       │      └─ Image type detection, fallback paths
│       │
│       ├── components/                     # Component tests (8 tests)
│       │   ├── Button.test.tsx             # 3 tests
│       │   │  └─ Click, disabled/loading states, icon positioning
│       │   └── Modal.test.tsx              # 5 tests
│       │      └─ Escape key, close button, backdrop behavior
│       │
│       └── integration/                    # Integration tests (25 tests)
│           ├── zoomService.integration.test.ts        # 4 tests
│           │  └─ zoom_in, zoom_out, zoom_reset, errors
│           ├── hybridAvatarService.integration.test.ts # 4 tests
│           │  └─ saveAvatar, getAvatarInfo, deleteAvatar, serialization
│           ├── tauriService.integration.test.ts       # 10 tests
│           │  └─ safeInvoke, createUser, authenticateUser,
│           │     hashPassword, saveAvatar, getAvatarByUserId,
│           │     deleteAvatar, initializeDatabase
│           └── desktopService.integration.test.ts     # 7 tests
│              └─ Window state queries, zoom, sizing/positioning
│
├── .github/
│   └── workflows/
│       └── 📄 frontend-tests.yml           # GitHub Actions CI/CD
│          └─ Auto-runs: npm run test:run, test:coverage
│
├── docs/
│   ├── 📄 TEST_USAGE_GUIDE.md              # ⭐ This file
│   ├── 📄 refactoring-plan.md              # Phase A-D testing roadmap
│   └── 📄 system_specifications.md
│
└── scripts/                                # Automation scripts
    ├── setup-frontend-tests.ps1            # Setup test environment
    ├── run-frontend-tests.ps1              # Run tests with options
    └── run-integration-tests.ps1           # Run integration tests
```

### File Summary

**Test Framework Files:**

- `vitest.config.ts` — Vitest runner configuration (jsdom, globals, coverage)
- `src/test/setup.ts` — Global mocks for Tauri APIs, browser APIs

**Test Files (8 total, 47 tests):**

- 2 utility test files (14 tests)
- 2 component test files (8 tests)
- 4 integration test files (25 tests)

**Configuration Files:**

- `tsconfig.json` — Added `types: ["vitest/globals", "node"]`
- `package.json` — Added test scripts: `test`, `test:ui`, `test:run`, `test:coverage`, `test:integration`
- `.github/workflows/frontend-tests.yml` — Automated testing on push/PR

**Documentation:**

- `docs/TEST_USAGE_GUIDE.md` — Complete usage guide (this file)
- `docs/refactoring-plan.md` — Testing infrastructure roadmap

**Script Helpers:**

- `scripts/setup-frontend-tests.ps1` — Installation helper
- `scripts/run-frontend-tests.ps1` — Run with watch/UI/coverage options
- `scripts/run-integration-tests.ps1` — Integration test runner

---

## 🏛️ Testing 100-300 Section Templates

### What are 100-300 Templates?

Section templates (100, 200, 300) are **fixed question structures** auto-seeded when a new document is created.

| Section | Thai Name | Purpose | Type | Answer Keys | References |
|---------|-----------|---------|------|-------------|------------|
| **100** | Introduction | หมายเหตุ/สำเร็จจำเป็น | Mixed | ❌ None | ❌ None |
| **200** | System Description | รายละเอียดระบบ | Q&A | ✅ Yes | ✅ Yes |
| **300** | Practical Skills | ทักษะการปฏิบัติงาน | Evaluator | ❌ None | ❌ None |

### 300 Template Structure (Practical Skills)

```
3xx.1  คุณสมบัติก่อนการทดสอบ (Prerequisites)
├── 3xx.1.1  ผ่านการอบรม
├── 3xx.1.2  ผ่านมาตรฐานการทดสอบกำลังพล
├── 3xx.1.3  ผ่านการปฏิบัติหน้าที่
├── 3xx.1.4  ผ่านการทดสอบความรู้พื้นฐาน ← Scored
└── 3xx.1.5  ผ่านการทดสอบระบบ ← Scored

3xx.2  การทดสอบปฏิบัติงานปกติ (Normal Operations) ← Scored, Branch selection
3xx.3  การทดสอบปฏิบัติงานกรณีพิเศษ (Special Cases) ← Scored, Branch selection
3xx.4  การทดสอบปฏิบัติงานกรณีเหตุขัดข้อง (Failure Handling) ← Scored, Branch selection
3xx.5  การทดสอบปฏิบัติงานกรณีเหตุฉุกเฉิน (Emergencies) ← Scored, Branch selection

3xx.6  การทดสอบการปฏิบัติงานประจำตำแหน่ง (Daily Operations) ← Scored
└── Children with scoring

3xx.7  สอบความรู้ (Knowledge Test)
├── 3xx.7.1  สอบข้อเขียน (Written)
└── 3xx.7.2  สอบปากเปล่า (Oral)
```

### Testing Strategy for Templates

#### 1. **Unit Tests** (Backend—Rust)

Test the template seeding functions in `src-tauri/src/content_database.rs`:

```rust
#[cfg(test)]
mod template_tests {
    use super::*;

    #[test]
    fn test_seed_section_300_template() {
        // Create a test document
        let conn = create_test_db();
        let doc_id = create_document(/* ... */).unwrap();
        let section_id = create_section(/* ... */).unwrap();
        
        // Seed Section 301 (3xx.1 - 3xx.7 questions)
        seed_section_300_template(&conn, &doc_id, section_id, 301).unwrap();
        
        // Verify
        let questions = get_section_questions(&conn, section_id).unwrap();
        assert_eq!(questions.len(), 7); // 3xx.1 through 3xx.7
        
        // Verify 3xx.2-3xx.5 have occupation branch selection UI
        let q2 = questions.iter().find(|q| q.sequence == 2).unwrap();
        assert_eq!(q2.parent_id, None); // L1 root
        assert!(q2.is_group_header); // Group header, not scored itself
        
        // Verify 3xx.6 is scored and has children
        let q6 = questions.iter().find(|q| q.sequence == 6).unwrap();
        let children_count = get_question_children(&conn, &q6.id).unwrap().len();
        assert!(children_count > 0); // Has check items
    }

    #[test]
    fn test_section_300_scoring_logic() {
        // Verify is_scored flags are set correctly
        // L1 seq 2-6: is_group_header=1, is_scored=0 (group headers, not scored individually)
        // L1 seq 1,7: is_group_header=1, is_scored=0 (prerequisites/knowledge, not scored)
        // L2 children of L1 seq 2-6: is_scored=1 (scored individually)
        // L2 children of L1 seq 1,7: is_scored=0 (prerequisites/knowledge, not scored)
    }

    #[test]
    fn test_branch_selection_for_300_2xx() {
        // Verify 3xx.2, 3xx.3, 3xx.4, 3xx.5 have occupation branch selection
        // These should have metadata indicating branch selection mode
    }

    #[test]
    fn test_no_answer_keys_in_300() {
        // Verify Section 300 questions have NO answer_keys in metadata
        // Only Section 200 should have answer_keys
    }

    #[test]
    fn test_no_references_in_300() {
        // Verify Section 300 questions have NO references
        // Only Section 200 should have section_references
    }
}
```

#### 2. **Integration Tests** (Frontend ↔ Tauri Backend)

Test template creation via Tauri API:

```typescript
// src/test/integration/templateService.integration.test.ts
import { describe, it, expect, vi } from "vitest";
import { invoke } from "@tauri-apps/api/tauri";

vi.mock("@tauri-apps/api/tauri");

describe("Section 300 Template Integration", () => {
  it("should create document with auto-seeded Section 301 template", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({ id: "22724201001" });
    
    const result = await invoke("create_document", {
      name: "Watch Station Test",
      unit_id: "2272400",
      unit_code: "22724",
      applied_to: "Station A",
      doc_type: "20",
      user_level: "1",
    });

    expect(result).toBe("22724201001");
    
    // Verify template questions are auto-created
    vi.mocked(invoke).mockResolvedValueOnce([
      { id: "q1", sequence: 1, content: "3xx.1", is_group_header: true, is_scored: false },
      { id: "q2", sequence: 2, content: "3xx.2", is_group_header: true, is_scored: false },
      // ... 3xx.3 - 3xx.7
    ]);
    
    const questions = await invoke("get_document_questions", { doc_id: result });
    expect(questions.length).toBe(7);
  });

  it("should support occupation branch selection for 3xx.2-3xx.5", async () => {
    // Test metadata contains branch selection configuration
    const q3_2 = questions.find(q => q.sequence === 2);
    expect(q3_2.metadata).toContain("occupationBranch");
  });

  it("should prevent answer key editing in Section 300", async () => {
    // UI should disable answer key fields for 300 questions
    vi.mocked(invoke).mockRejectedValueOnce(
      new Error("Answer keys not supported for Section 300")
    );
  });

  it("should prevent reference linking in Section 300", async () => {
    // UI should hide reference section for 300 questions
    // Test that references cannot be added to 300 questions
    vi.mocked(invoke).mockRejectedValueOnce(
      new Error("References not supported for Section 300")
    );
  });
});
```

#### 3. **Component Tests** (Frontend UI)

Test template UI components (when they're created):

```typescript
// src/test/components/Section300Display.test.tsx (Future)
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Section300Display } from "@/components/Section300Display";

describe("Section 300 Display Component", () => {
  it("should render 300 questions in correct order", () => {
    const questions = [
      { id: "q1", sequence: 1, content: "3xx.1" },
      { id: "q2", sequence: 2, content: "3xx.2" },
      // ... etc
    ];
    
    render(<Section300Display questions={questions} />);
    
    expect(screen.getByText(/3xx.1/)).toBeInTheDocument();
    expect(screen.getByText(/3xx.2/)).toBeInTheDocument();
  });

  it("should NOT show answer key section for 300", () => {
    render(<Section300Display questions={mockQuestions} />);
    
    // Answer key UI should not exist
    expect(screen.queryByText(/Answer Key/i)).not.toBeInTheDocument();
  });

  it("should NOT show reference section for 300", () => {
    render(<Section300Display questions={mockQuestions} />);
    
    // Reference UI should not exist
    expect(screen.queryByText(/Reference/i)).not.toBeInTheDocument();
  });

  it("should show occupation branch selector for 3xx.2-3xx.5", () => {
    render(<Section300Display questions={mockQuestions} />);
    
    const q302 = screen.getByText(/3xx.2/);
    const branchSelector = q302.closest("[data-testid='branch-selector']");
    expect(branchSelector).toBeInTheDocument();
  });

  it("should show Pass/Fail instead of numeric scores", () => {
    render(<Section300Display questions={mockQuestions} />);
    
    // Should have Pass/Fail buttons instead of score input
    expect(screen.queryByText(/Pass/i)).toBeInTheDocument();
    expect(screen.queryByText(/Fail/i)).toBeInTheDocument();
  });
});
```

### Testing Checklist for Template 100-300

**Backend (Rust—`src-tauri/src/content_database.rs`)**
- [ ] `seed_section_100_template()` creates correct questions
- [ ] `seed_section_200_template()` creates questions with answer keys
- [ ] `seed_section_300_template()` creates questions without answer keys
- [ ] Branch selection metadata is set for 3xx.2-3xx.5
- [ ] Scoring flags (`is_scored`, `is_group_header`) match specification
- [ ] Total score calculation includes only scored items
- [ ] Cascade delete removes template questions correctly

**Frontend (React—`src/components/`)**
- [ ] Template questions display in correct order
- [ ] Section 200 shows answer key fields
- [ ] Section 300 hides answer key fields (UI disabled/hidden)
- [ ] Section 300 hides reference section (UI disabled/hidden)
- [ ] Occupation branch selector appears for 3xx.2-3xx.5
- [ ] Pass/Fail evaluator UI works for Section 300
- [ ] Color scheme applies correctly (Purple for 300, etc.)

**Integration (Frontend ↔ Rust)**
- [ ] Document creation auto-seeds template questions
- [ ] Getting questions returns full template with correct flags
- [ ] Updating questions respects template restrictions
- [ ] Deleting questions re-indexes sequence correctly

---

**Last Updated:** 2026-03-09  
**Status:** Phase B & C1 Complete ✅  
**Next Phase:** Phase A (Rust) or Phase D (E2E) after refactoring
