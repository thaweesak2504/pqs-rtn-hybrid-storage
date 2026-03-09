# Testing Usage Guide — PQS RTN Hybrid Storage

> Created: 2026-03-09  
> Testing Infrastructure Complete: Phase B & C1 ✅  
> Total Tests: **47 passing** across 8 files

---

## 📋 Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run test:run` | รันทุก tests ครั้งเดียว (CLI mode) |
| `npm test` | Watch mode - เฝ้าดูไฟล์ที่เปลี่ยน รีรัน tests |
| `npm run test:ui` | Interactive dashboard - ดู tests ทั้งหมดแบบ UI |
| `npm run test:coverage` | สร้าง coverage report - ดูเปอร์เซ็นต์โค้ดที่ test |
| `npm run test:integration` | รัน integration tests เท่านั้น (25 tests) |

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

| ประเภท | ไฟล์ | Tests | ทดสอบอะไร |
|--|--|--|--|
| **Utility** | 2 | 14 | Pure functions (Thai numbers, sanitize, resolve) |
| **Component** | 2 | 8 | UI rendering & user interactions |
| **Integration** | 4 | 25 | Service layers + Tauri backend mapping |
| **TOTAL** | **8** | **47** | ✅ Coverage: 64.72% lines, 62.5% functions |

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

- เปิด http://localhost:51204/__vitest__/
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
    
    await expect(safeInvoke("get_all_users"))
      .rejects.toThrow("Not running in Tauri environment");
  });

  // Test command payload mapping
  it("maps createUser payload to backend keys", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockResolvedValueOnce({ id: 1 });

    await tauriUserService.createUser(
      "admin", "admin@x.com", "pass", "Admin User", "CAPT", "admin"
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
      "image/png"
    );

    expect(invoke).toHaveBeenCalledWith("save_avatar", {
      userId: 7,
      avatarData: [10, 20, 30],  // ← Serialized
      mimeType: "image/png",
    });
  });

  // Test error handling
  it("rethrows deleteAvatar errors", async () => {
    setTauriAvailable();
    vi.mocked(invoke).mockRejectedValueOnce(new Error("delete failed"));

    await expect(tauriAvatarService.deleteAvatar(3))
      .rejects.toThrow("delete failed");
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
vi.mock("@tauri-apps/api/tauri");      // Mock invoke() → Tauri
vi.mock("@tauri-apps/api/dialog");     // Mock open/save dialogs
vi.mock("@tauri-apps/api/fs");         // Mock file operations

// Mock browser APIs
global.IntersectionObserver = class { /* ... */ };
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
    - npm run test:run          # All tests must pass
    - npm run test:coverage     # Coverage report
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
import "@tauri-apps/api/tauri";  // ← Must import first
import { invoke } from "@tauri-apps/api/tauri";

vi.mock("@tauri-apps/api/tauri");  // ← Then mock
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

**Last Updated:** 2026-03-09  
**Status:** Phase B & C1 Complete ✅  
**Next Phase:** Phase A (Rust) or Phase D (E2E) after refactoring
