# AI Handoff - PQS RTN Hybrid Storage

Last updated: 2026-03-11
Status: **Phase F Complete** - Manual verification passed, reference-progress label update finalized, ready for next phase

## Phase F Closure (2026-03-11)

- Manual verification passed across key functions with no regression found.
- Progress banner wording aligned for Qualifier/Trainee views: `รอตรวจ` -> `รอประเมิน`.
- Update committed and pushed on branch `phase-f-refactor-big-files`.
- Repository prepared for next phase with final cleanup applied.

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
- **Total: 107 tests passing across 16 files**.
- Latest refactor/fix commit on working branch: `3b76179` (`phase-f-refactor-big-files`).
- Current coverage baseline: 66.89% lines, 67.18% functions, 69.60% branches.
- Phase C + early Phase D add E2E and modal integration coverage for section 300 workflow.
- Backend policy guard tests: **6 passing** (`cargo test test_policy_`).

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
✅ **Phase D (Policy Hardening & UI Integration Coverage)** - Complete
✅ **Phase E (Coverage Target Expansion & UX Guardrails)** - Complete
✅ **Phase F (Refactor Big Files Split)** - Complete

- Expand coverage include targets to template-critical components/services
- Add UX guardrails for backend policy errors in section 300 flows
- Consolidate/standardize policy error messaging

**Starting Phase F (Next Session):**

```bash
# Run current baseline
npm run test:run
npm run test:coverage

# Phase F focus:
# 1. Split big files behind existing passing tests (no behavior change)
# 2. Keep policy error handling centralized via src/utils/policyGuards.ts
# 3. Add/adjust tests only when extraction changes boundaries
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
- ✅ Added EditMetadataModal branch-lock error-path integration test (frontend policy UX).
- ✅ All 99 tests passing with zero regression.
- ✅ Implemented backend policy guards (Phase D):
  - Block references for questions in section group 300
  - Block answer keys for questions in section group 300
  - Block document branch changes after evaluation activity starts (allow no-op same branch)
- ✅ Added backend policy consistency update:
  - Block `update_answer_key` for questions in section group 300 (same policy as replace API)
- ✅ Added backend policy tests (6 tests) and all passing.
- ✅ Committed and pushed updates on `testing-infrastructure-feature`.
- ✅ Phase E: expanded template-focused coverage include targets:
  - `QuestionRenderer.tsx`, `AddSectionModal.tsx`, `EditMetadataModal.tsx`, `AddQuestionModal.tsx`, `policyGuards.ts`
- ✅ Phase E: added section 100/200 modal integration gap tests:
  - Section 100 create payload contract (`AddSectionModal.integration.test.tsx`)
  - Section 200 out-of-range validation block (`AddSectionModal.integration.test.tsx`)
- ✅ Phase E: added section 300 policy UX guardrail tests:
  - branch-lock message normalization path (`EditMetadataModal.integration.test.tsx`)
  - answer-key policy error UX path (`AddQuestionModal.integration.test.tsx`)
  - reference policy error UX path (`AddQuestionModal.integration.test.tsx`)
- ✅ Phase E: normalized policy error messages in UI:
  - Added shared helper `src/utils/policyGuards.ts`
  - Applied to metadata and question modal save flows
- ✅ Validation after Phase E updates:
  - `npm run test:coverage` => 107/107 passing (16 files)
  - Coverage summary (configured include scope): lines 68.08%, functions 53.43%, branches 70.06%

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

## Starting Phase F (New Conversation)

**What to say/share in new conversation:**

1. **Initial prompt:**

   ```
   Continue Phase F from the latest state on branch phase-f-refactor-big-files.
   Current HEAD is commit 3b76179.

   What is already done:
   - QuestionTreeNode split completed (QuestionFormCard extracted)
   - Automated checks passing (TypeScript + 107/107 tests)
   - Replaced Windows alert flows in editor_v2 with ConfirmModal-based UX
   - Added reference-refresh wiring for 100/200 so Used/Unused updates without leaving page

   What must be done now:
   - Perform final manual verification (single full round)
   - Focus scenarios:
     1) 100/200: Used/Unused badge refresh after add/edit/delete question references
     2) Delete in-use reference: must show in-app modal alert, not Windows alert
     3) Edit question reference page/location_text: value persists after save and reload
   - If manual test passes: commit (if needed), push, and update docs/AI_HANDOFF.md status

   Please read first:
   - docs/AI_HANDOFF.md
   - /memories/repo/template-system-facts.md
   - docs/TEMPLATE_IMPACT_AUDIT.md
   ```

2. **Key files to reference:**
   - `docs/AI_HANDOFF.md` - This file (updated with Phase B completion)
   - `/memories/repo/template-system-facts.md` - Complete template facts
   - `docs/TEMPLATE_IMPACT_AUDIT.md` - Baseline audit
   - `docs/TEMPLATE_TESTING_STRATEGY.md` - Phase roadmap and target scope
   - `docs/TEST_USAGE_GUIDE.md` - Operational test commands
   - `docs/AI_WORKLOG.md` - Session history

3. **Branch status:**
   - Current branch: `phase-f-refactor-big-files`
   - HEAD: `3b76179` (local ahead of origin)
   - Automated tests passing (107/107)

4. **No manual actions needed - everything is in git:**
   - ✅ Handoff docs updated
   - ✅ Memory files created
   - ✅ Tests committed
   - ✅ Baseline audit preserved

## Phase E Delta (Completed Session)

## Phase F Target Analysis (File Size Audit)

**Refactor Criteria: >= 1,000 lines**

Large files identified (sorted by size):

- ✅ **QuestionTreeNode.tsx: 2,999 lines** — PRIMARY TARGET (3x threshold)
- ❌ PqsReferenceSection.tsx: 902 lines (below threshold)
- ❌ DatabaseManagementPage.tsx: 745 lines (below threshold)
- ❌ AddReferenceModal.tsx: 709 lines (below threshold)
- ❌ PqsQuestionSection.tsx: 688 lines (below threshold)
- ❌ AddQuestionModal.tsx: 483 lines (originally planned, but below threshold)
- ❌ QuestionRenderer.tsx: 347 lines (originally planned, but below threshold)

**Why QuestionTreeNode.tsx:**

- 2,999 lines = largest file by far (3x refactor threshold)
- 8+ responsibilities: tree rendering, editing, answer keys, references, occupation branches, image upload, drag & drop, multi-mode rendering
- No dedicated test coverage (integration tests only)
- High maintenance burden (scroll 3,000 lines to find logic)
- Clear extraction opportunities: utilities, sub-components, renderers, section-specific logic

**Expected Outcome:**

- QuestionTreeNode.tsx: 2,999 → ~1,300 lines (core tree logic)
- New extracted modules: 6-8 focused files (100-600 lines each)
- Better testability, maintainability, reusability

## Phase E Delta (Completed Session)

- Added shared policy guard error normalizer for section 300 UX consistency.
- Replaced generic save/update error rendering in modal flows with normalized policy-aware messages.
- Increased template-focused coverage visibility for section 100/200/300 critical frontend modules.
- Added targeted tests to close section 100/200 add-section modal gaps.
- Added targeted tests for section 300 answer-key/reference/branch-lock policy UX paths.
- All frontend tests and coverage runs are green after changes (107/107).

## Suggested Next Safe Execution Order

### Phase F: QuestionTreeNode.tsx Refactor (2,999 lines → 6-8 files)

**File Size Criteria:**

- ✅ **>= 1,000 lines** = MUST refactor
- ✅ QuestionTreeNode.tsx (2,999 lines) is the only file meeting threshold
- ❌ Other files < 1,000 lines = skip (AddQuestionModal: 483, QuestionRenderer: 347)

**Extraction Order (do ONE at a time):**

1. **Phase F.1: Extract Thai Numbering Utilities**
   - Checkpoint: `git add -A && git commit -m "checkpoint: before F.1 extract utilities"`
   - Extract to: `src/utils/thaiNumbering.ts`
   - Functions: toThaiNumber, toThaiAlphabet, convertThaiToArabic, buildPrefix, buildPrefix200_300, DEFAULT_L1_DESC_BY_SEQ
   - Automated test: `npm run test:run` (must pass 107/107)
   - Manual test: Open Active Document Editor → verify question prefixes render correctly (ข., (๑), etc.)
   - Commit: `git commit -m "refactor: extract thai numbering utilities from QuestionTreeNode"`

2. **Phase F.2: Extract AsyncImagePreview Component**
   - Checkpoint: `git add -A && git commit -m "checkpoint: before F.2 extract AsyncImagePreview"`
   - Extract to: `src/components/editor_v2/AsyncImagePreview.tsx`
   - Automated test: `npm run test:run`
   - Manual test: Upload image to question → verify preview renders
   - Commit: `git commit -m "refactor: extract AsyncImagePreview component"`

3. **Phase F.3: Extract QuestionFormCard Component**
   - Checkpoint: `git add -A && git commit -m "checkpoint: before F.3 extract QuestionFormCard"`
   - Extract to: `src/components/editor_v2/QuestionFormCard.tsx`
   - Automated test: `npm run test:run`
   - Manual test: Create/edit question → verify form, image upload, answer keys work
   - Commit: `git commit -m "refactor: extract QuestionFormCard component"`

4. **Phase F.4: Extract ViewMode Renderers**
   - Checkpoint: `git add -A && git commit -m "checkpoint: before F.4 extract renderers"`
   - Extract to: `src/components/editor_v2/renderers/` (QualifierRenderer, TraineeRenderer, VisitorRenderer, PrintRenderer)
   - Automated test: `npm run test:run`
   - Manual test: Switch between view modes → verify each renders correctly
   - Commit: `git commit -m "refactor: extract view mode renderers"`

5. **Phase F.5: Extract Section-Specific Logic**
   - Checkpoint: `git add -A && git commit -m "checkpoint: before F.5 extract section logic"`
   - Extract to: `src/components/editor_v2/sections/` (Section100Logic, Section200Logic, Section300Logic, SectionReferenceLogic)
   - Automated test: `npm run test:run`
   - Manual test: Test Section 100/200/300 specific behaviors (occupation branches, references, answer keys)
   - Commit: `git commit -m "refactor: extract section-specific logic"`

6. **Phase F.6: Validate Final State**
   - QuestionTreeNode.tsx should now be ~1,300 lines (core tree logic only)
   - Full regression: `npm run test:coverage` (verify coverage not degraded)
   - Full manual test: Create document → add sections 100/200/300 → verify all features work
   - Final commit: `git commit -m "refactor: complete QuestionTreeNode split (2999 → ~1300 lines)"`

**Rollback Procedure (if regression detected):**

```bash
# List recent commits to find checkpoint
git log --oneline -10

# Rollback to checkpoint (replace <hash> with checkpoint commit)
git reset --hard <checkpoint-hash>

# Verify tests pass
npm run test:run

# Continue from that point with adjusted approach
```

**Manual Testing Checklist (verify after EACH extraction):**

- [ ] Question tree expands/collapses correctly
- [ ] Thai numbering prefixes render (ข., (๑), ๓๐๑.๑, etc.)
- [ ] Create/edit/delete questions works
- [ ] Image upload displays preview
- [ ] Answer key editor functions
- [ ] References link correctly
- [ ] Section 300 occupation branch selection works
- [ ] Drag & drop reordering (if applicable to extracted unit)
- [ ] View mode switching (edit/qualifier/trainee/visitor/print)

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
