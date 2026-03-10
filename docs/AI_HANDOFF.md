# AI Handoff - PQS RTN Hybrid Storage

Last updated: 2026-03-10
Status: **Phase D In Progress** - UI modal integration + backend policy guards implemented

## Project Intent

- Template testing for sections 100/200/300 is the core priority.
- Section 300 (Practical Skills) is the highest risk area.
- Primary quality goal: no behavior regression.

## Phase A ✅ Complete (Backend Unit Tests)

**Commits:**

- acdd950 - Template seeding tests (3 tests)
- 2251c27 - Score calculation tests (1 test)
- 40f8740 - Cascade chain tests (2 tests)

**Test Coverage:**

- 6 backend unit tests in `src-tauri/src/content_database.rs`
- All tests use in-memory SQLite (`create_test_db()`)
- Zero production database impact
- Baseline behavior validated

**Files Modified:**

- `src-tauri/src/content_database.rs` - Added test functions
- `src-tauri/src/test_helpers.rs` - Updated schema (commit 5543b14)
- `docs/AI_WORKLOG.md` - Session logging
- `docs/TEMPLATE_IMPACT_AUDIT.md` - Baseline audit (commit 4863c42)

## Phase B ✅ Complete (Frontend Integration Tests)

**Goal:** Test React components and verify template system integrity.

**Implemented Tests (44 tests):**

1. **Component Tests (12 tests)** - `QuestionRenderer.test.tsx`
   - Template rendering (Section 100 vs 300)
   - Exempted groups detection (3xx.2-3xx.5)
   - Score display validation
   - Read-only mode verification
   - Thai number formatting
   - Hierarchy and nesting

2. **Structure Validation (15 tests)** - `templateStructure.test.ts`
   - Section 300 structure (7 L1 groups, flags)
   - Score calculation logic
   - Cascade chain validation
   - Section differences
   - Branch metadata validation
   - Error detection

3. **Branch & Cascade Logic (17 tests)** - `branchAndCascade.test.ts`
   - Branch selection for exempted groups
   - Score cascade chain (L1 only, no double counting)
   - Section total calculation
   - Exempted status blocking
   - Prerequisites vs knowledge flags
   - Anomaly detection

**Approach Used:**

1. Pure logic unit tests (no complex mocking)
2. Focused component rendering tests for `QuestionRenderer.tsx`
3. Template structure validation without component coupling
4. Cascade chain validation with realistic data scenarios

## Phase C ✅ Complete (E2E Workflow & Coverage)

**Goal:** Implement end-to-end workflow tests and raise template-related confidence.

**Implemented Tests (3 tests):**

1. **E2E Template Workflow** (new file) - `templateWorkflow.integration.test.ts`
   - Create document -> create section 301 -> verify section 300 auto-seeding
   - Verify exempted L1 groups (3xx.2-3xx.5)
   - Persist document-level branch selection (main/sub)
   - Verify score cascade from 3xx.1 scored children (seq 4-5)
   - Verify section total matches expected L1 aggregation (no double count)

**Files Modified:**

- `src/test/integration/templateWorkflow.integration.test.ts` - Added Phase C workflow tests
- `docs/AI_HANDOFF.md` - Phase status + next-session prompt update
- `docs/AI_WORKLOG.md` - Session logging

**Fast Start for Phase B:**

```bash
# Review existing frontend tests
npm run test:run

# Check current coverage
npm run test:coverage

# Identify template-related components
grep -r "QuestionAnswerForm\|SectionSelector" src/components/
```

**Handoff Materials:**

- Read `/memories/repo/template-system-facts.md` for complete template domain knowledge
- Read `docs/TEMPLATE_IMPACT_AUDIT.md` for baseline behavior analysis
- Read `docs/AI_WORKLOG.md` for session history

## Current Verified Baseline

- Frontend test stack is active: Vitest + Testing Library + jsdom. ✅
- **Existing tests: 47 passing** (8 files).
- **Phase B tests: 44 passing** (3 new files: QuestionRenderer.test.tsx, templateStructure.test.ts, branchAndCascade.test.ts).
- **Total: 98 tests passing across 14 files**.
- Current coverage baseline: 66.89% lines, 67.18% functions, 69.60% branches.
- Phase C + early Phase D add E2E and modal integration coverage for section 300 workflow.
- Backend policy guard tests: **4 passing** (`cargo test test_policy_`).

## Critical Context

- `docs/TEST_USAGE_GUIDE.md` is the operational test reference.
- `docs/TEMPLATE_TESTING_STRATEGY.md` is the roadmap (90-108 planned tests).
- User concern: avoid refactor-first workflows that force heavy manual retesting.
- Agreed direction: tests-first safety net, then refactor only behind passing tests.

## Non-Negotiables (Do/Don't)

- Do preserve existing behavior unless explicitly approved to change it.
- Do implement small, verifiable steps with immediate test feedback.
- Do prioritize branch-selection and score-calculation correctness.
- Don't refactor large files before baseline tests protect current behavior.
- Don't require broad manual verification for every change.

## Template Domain Facts

- Section 100: Q&A, answer keys allowed, references allowed.
- Section 200: Q&A, answer keys allowed, references allowed.
- Section 300: evaluator style, no answer keys, no references.
- Section 300 includes branch-sensitive groups (3xx.2-3xx.5).

## Next Safe Execution Order

✅ **Phase A (Backend Unit Tests)** - Complete (6 tests)
✅ **Phase B (Frontend Integration Tests)** - Complete (44 tests)
✅ **Phase C (E2E & Coverage)** - Complete (3 tests)
⏳ **Phase D (Policy Hardening & UI Integration Coverage)** - Next

- Add UI integration tests for branch selection and section creation modals
- Align template constraints with explicit policy decisions (Section 300 guards)
- Expand coverage targets to template-critical components/services

**Starting Phase D (Next Session):**

```bash
# Run current baseline
npm run test:run
npm run test:coverage

# Phase D focus:
# 1. Add UI integration tests for EditMetadataModal branch selection
# 2. Add UI integration tests for AddSectionModal section 300 creation contract
# 3. Decide/encode policy for section 300 answer-key/reference/branch-lock behavior
# 4. Increase template-related coverage visibility in vitest include targets
```

## Done Recently

- ✅ Created and refined testing docs focused on template testing.
- ✅ Performed impact audit of `src-tauri/src/content_database.rs` (read-only baseline).
- ✅ Updated test infrastructure schema in `src-tauri/src/test_helpers.rs`.
- ✅ Implemented 6 backend unit tests (Phase A).
  - Template seeding structure (section 300)
  - Scoring flags validation
  - Exempted defaults verification
  - Cascade chain propagation (3 levels)
  - Exempted status blocking in cascade
- ✅ Implemented 44 frontend tests (Phase B):
  - 12 component rendering tests (`QuestionRenderer.test.tsx`)
  - 15 template structure validation tests (`templateStructure.test.ts`)
  - 17 branch selection & cascade logic tests (`branchAndCascade.test.ts`)
- ✅ All 91 tests passing with zero regression.
- ✅ Implemented 3 E2E workflow tests (Phase C):
  - create document -> create section 301 -> verify section 300 seeding
  - persist document branch main/sub selection
  - score cascade propagation + section total validation (no double count)
- ✅ All 94 tests passing with zero regression.
- ✅ Started Phase D modal integration coverage (2 new tests):
  - EditMetadataModal branch selection load + save payload validation
  - AddSectionModal section 100/300 contract validation (101 block + create_section payload)
- ✅ All 98 tests passing with zero regression.
- ✅ Implemented backend policy guards (Phase D):
   - Block references for questions in section group 300
   - Block answer keys for questions in section group 300
   - Block document branch changes after evaluation activity starts (allow no-op same branch)
- ✅ Added backend policy tests (4 tests) and all passing.
- ✅ Committed and pushed updates on `testing-infrastructure-feature`.

## Fast Start Commands

**Backend Testing:**

```bash
cd src-tauri
cargo test content_database::tests::test_seed_section_300
cargo test content_database::tests::test_calculate
cargo test content_database::tests::test_cascade
cargo test test_policy_
```

**Frontend Testing:**

```bash
npm run test:run
npm run test:integration
npm run test:coverage
npm run test:integration -- src/test/integration/templateWorkflow.integration.test.ts
```

## Starting Phase D (New Conversation)

**What to say/share in new conversation:**

1. **Initial prompt:**

   ```
   I'm starting Phase D (policy hardening & UI integration coverage) of template system testing.
   Phase A, Phase B, and Phase C are complete - see docs/AI_HANDOFF.md.

   Goal: harden template behavior contracts and expand UI integration coverage with no regression.
   Focus: section 300 policy guards (answer keys/references/branch lock) and modal-level branch/section workflows.

   Please read:
   - docs/AI_HANDOFF.md (project context)
   - /memories/repo/template-system-facts.md (template domain knowledge)
   - docs/TEMPLATE_IMPACT_AUDIT.md (baseline behavior)
   ```

2. **Key files to reference:**
   - `docs/AI_HANDOFF.md` - This file (updated with Phase B completion)
   - `/memories/repo/template-system-facts.md` - Complete template facts
   - `docs/TEMPLATE_IMPACT_AUDIT.md` - Baseline audit
   - `docs/TEMPLATE_TESTING_STRATEGY.md` - Phase roadmap and target scope
   - `docs/TEST_USAGE_GUIDE.md` - Operational test commands
   - `docs/AI_WORKLOG.md` - Session history

3. **Branch status:**
   - Current branch: `testing-infrastructure-feature`
   - Synced with origin/testing-infrastructure-feature
   - All tests passing

4. **No manual actions needed - everything is in git:**
   - ✅ Handoff docs updated
   - ✅ Memory files created
   - ✅ Tests committed
   - ✅ Baseline audit preserved

## Phase Transition Checklist (Use Every Time)

Before moving to the next phase, always do this sequence:

1. **Update status in AI_HANDOFF.md**
   - Set current phase to complete
   - Set next phase as "Ready"
   - Refresh test totals, branch status, and recent commits

2. **Update the New Conversation starter block**
   - Rename section to "Starting Phase <Next>"
   - Replace old prompt with next-phase goals and constraints
   - Keep required read-first files current

3. **Verify baseline before handoff**
   - Run `npm run test:run`
   - Run `npm run test:coverage` (if coverage is part of next phase)
   - Confirm no unexpected regressions

4. **Commit and push handoff updates**
   - Commit docs with clear message
   - Push current branch
   - Ensure working tree is clean (except intentional temporary artifacts)

5. **Start next chat with the updated starter prompt**
   - Use the exact "Starting Phase <Next>" block from this file
   - This keeps context continuity and reduces re-explaining work
