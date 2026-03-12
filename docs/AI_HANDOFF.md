# AI Handoff - PQS RTN Hybrid Storage

Last updated: 2026-03-11
Status: **Phase G Complete** - Editor v2 coverage hardening complete (G.1-G.4), automated regression guards added, ready for next feature/refactor round

## Phase F Closure (2026-03-11)

- Manual verification passed across key functions with no regression found.
- Progress banner wording aligned for Qualifier/Trainee views: `รอตรวจ` -> `รอประเมิน`.
- Update committed and pushed on branch `phase-f-refactor-big-files`.
- Repository prepared for next phase with final cleanup applied.

## Phase G Closure (2026-03-11)

- Completed G.1-G.4 on branch `phase-f-refactor-big-files` and pushed all commits.
- Added 5 new editor_v2 regression test files (progress banner + display card + form card + tree node).
- Latest automated status: **150/150 tests passing**.
- Coverage include now tracks all critical editor_v2 targets (`ScoreProgressBanner`, `DevProgressVerificationTable`, `QuestionDisplayCard`, `QuestionFormCard`, `QuestionTreeNode`).

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
✅ **Phase G (Editor v2 Test Coverage Hardening)** - Complete

- Phase G covers four sub-phases, each with its own New Chat Initial prompt (see ## Phase G section below)
- Goal: add automated regression guards for editor_v2 before new features are added
- Sub-phases run sequentially; each must pass 100% before next begins

**Phase G complete — use this handoff as baseline before starting the next implementation phase.**

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

## Starting Phase H (Next Phase)

> **When starting Phase H:** Read the "Phase H Quick Starter" section below, then copy the **"## Phase H Initial Prompt"** and paste to new chat. 
> 
> Replace `[HASH]`, `[TESTS]`, `[BRANCH]` with current values from `git log`, `npm run test:run`, and `git branch` commands.

### Phase H Quick Starter

**Status summary:**
- Phase G (Editor v2 coverage) complete
- 150/150 tests passing on branch `phase-f-refactor-big-files`
- All regression guards in place for critical editor_v2 components

**What's done:**
- ✅ ScoreProgressBanner + DevProgressVerificationTable text regression guards (G.1)
- ✅ QuestionDisplayCard 12 view-mode tests (G.2)
- ✅ QuestionFormCard 15 behavior boundary tests (G.3)
- ✅ QuestionTreeNode 10 routing logic tests (G.4)

**What to do in Phase H:**
- [Determine next priority from project backlog]
- Options: Panel UI refactor | Advanced print modes | Desktop E2E automation (Phase 0 baseline) | Other

**Key files to reference (read before starting):**
- `docs/AI_HANDOFF.md` (this file, Phase H section)
- `/memories/repo/template-system-facts.md` (template facts)
- `docs/TEST_USAGE_GUIDE.md` (test commands)
- `docs/TEMPLATE_TESTING_STRATEGY.md` (roadmap if template-focused)
- `docs/AI_WORKLOG.md` (session history)

## Phase F Quick Starter

**Status:** Phase F (QuestionTreeNode refactor split) complete on branch `phase-f-refactor-big-files`

**What was done:**
- ✅ QuestionTreeNode.tsx split into 6-8 focused files (Thai utilities, components, renderers, section logic)
- ✅ Expected reduction: 2,999 → ~1,300 lines (core tree logic only)
- ✅ Manual verification passed with zero regression
- ✅ All automated tests passing, TypeScript clean
- ✅ Committed and pushed to remote

**Key refactoring approach used:**
1. Extract Thai Numbering Utilities → `src/utils/thaiNumbering.ts`
2. Extract AsyncImagePreview Component → `src/components/editor_v2/AsyncImagePreview.tsx`
3. Extract QuestionFormCard Component → `src/components/editor_v2/QuestionFormCard.tsx`
4. Extract ViewMode Renderers → `src/components/editor_v2/renderers/[4 files]`
5. Extract Section-Specific Logic → `src/components/editor_v2/sections/[4 files]`

**Why this refactor was safe:** Tests-first baseline + atomic commits at each extraction checkpoint → rollback available if regression detected

---

## Phase G — Editor v2 Test Coverage Hardening

**Why this phase exists:**
Manual analysis (2026-03-11) identified that the `editor_v2` component family has zero automated test coverage despite being the highest-risk area in the system. Phase G adds targeted tests without changing any runtime behavior, so every sub-phase is safe to run independently.

**Current test gap summary:**

| File                             | Lines | Tests | Risk                        |
| -------------------------------- | ----- | ----- | --------------------------- |
| QuestionFormCard.tsx             | 2,491 | 0     | High                        |
| QuestionDisplayCard.tsx          | 629   | 0     | High                        |
| QuestionTreeNode.tsx             | 462   | 0     | Medium                      |
| ScoreProgressBanner.tsx          | 170   | 0     | Medium (text regress guard) |
| DevProgressVerificationTable.tsx | 201   | 0     | Low                         |

**Coverage config gap:** `vitest.config.ts` coverage `include` list does not contain any `editor_v2` file — regressions would be invisible to automated reports.

---

### Phase G.1 — Coverage Config + Progress Banner Text Guard

**Goal:** Expand coverage `include` to editor_v2 critical files; add regression assertions for the UI text labels that were recently updated (`รอประเมิน`, etc.) so future text changes cannot silently regress.

**Tests to write (target ~8 tests):**

- `ScoreProgressBanner` renders `รอประเมิน` label (not `รอตรวจ`)
- `ScoreProgressBanner` renders `ผ่าน`, `รอประเมิน`, `ปรับปรุง`, `ส่งคำตอบ`, `คะแนนสะสม` labels correctly
- `DevProgressVerificationTable` renders `รอประเมิน / รอดำเนินการ` label (not `รอตรวจ`)
- `ScoreProgressBanner` converts counts to Thai numerals correctly
- `ScoreProgressBanner` shows correct values for all prop combinations

**Files to create:**

- `src/test/components/ScoreProgressBanner.test.tsx`
- `src/test/components/DevProgressVerificationTable.test.tsx`

**Files to modify:**

- `vitest.config.ts` — add `editor_v2/ScoreProgressBanner.tsx`, `editor_v2/DevProgressVerificationTable.tsx`, `editor_v2/QuestionDisplayCard.tsx`, `editor_v2/QuestionFormCard.tsx`, `editor_v2/QuestionTreeNode.tsx` to coverage `include`

**Validation:** `npm run test:coverage` — new files appear in report with line coverage

**Initial prompt (copy to New Chat):**

```
Start Phase G.1 on branch phase-f-refactor-big-files.

Context:
- All prior phases (A-F) are complete and pushed.
- 107/107 tests passing. Branch is clean.

Goal of G.1:
1. Expand vitest.config.ts coverage include to add 5 editor_v2 files:
   - src/components/editor_v2/ScoreProgressBanner.tsx
   - src/components/editor_v2/DevProgressVerificationTable.tsx
   - src/components/editor_v2/QuestionDisplayCard.tsx
   - src/components/editor_v2/QuestionFormCard.tsx
   - src/components/editor_v2/QuestionTreeNode.tsx
2. Write regression guard tests (~8 tests) for progress banner text labels:
   - ScoreProgressBanner renders รอประเมิน (not รอตรวจ)
   - ScoreProgressBanner renders ผ่าน, ปรับปรุง, ส่งคำตอบ, คะแนนสะสม labels
   - DevProgressVerificationTable renders รอประเมิน / รอดำเนินการ
   - ScoreProgressBanner passes Thai numeral conversion
3. Run npm run test:coverage — confirm all 5 new files appear in coverage report.
4. Commit and push.

Please read docs/AI_HANDOFF.md first.
```

---

### Phase G.2 — QuestionDisplayCard Integration Tests

**Goal:** Add integration tests covering the view-mode branching and action-menu visibility logic in `QuestionDisplayCard` — the read path that every question renders through in all modes.

**Tests to write (target ~12 tests):**

- Edit mode: shows action dropdown, not in qualifier/trainee/visitor mode
- Score badge renders correctly for group header (L1) vs individual scored question
- Oral assessment status badge: renders `รอประเมิน` when pending, `ผ่าน` when passed
- Exempted badge `(ไม่ต้องปฏิบัติ)` renders when `question_type === 'exempted'`
- Section reference progress block: renders when `linkedSectionMeta` present in trainee/qualifier mode
- Inline sub-question checkboxes render with correct Thai alphabet labels
- Description renders only when `showDescriptionImage` condition met
- Collapse/expand toggle visibility (has children vs no children)
- L1 sub-question usage badges render in edit mode only
- Section selector warning renders when no children linked

**Files to create:**

- `src/test/integration/QuestionDisplayCard.integration.test.tsx`

**Initial prompt (copy to New Chat):**

```
Start Phase G.2 on branch phase-f-refactor-big-files.

Context:
- Phase G.1 is complete. 115+/115+ tests passing. Branch is clean.
- vitest.config.ts already includes editor_v2 coverage targets.

Goal of G.2:
Write ~12 integration tests for QuestionDisplayCard.tsx, covering:
1. Action dropdown: visible in edit mode; hidden in qualifier/trainee/visitor/print
2. Score badge: group header (L1) shows amber รวม badge; individual scored shows emerald badge
3. Oral assessment badge: pending → รอประเมิน; passed → ผ่าน
4. Exempted badge: renders (ไม่ต้องปฏิบัติ) when question_type=exempted
5. Section selector warning: renders ⚠ when isSectionSelector and no children
6. Inline sub-question checkboxes: Thai alphabet labels render correctly
7. Collapse/expand toggle: visible only when hasChildren=true
8. Sub-question usage badges: show only in edit mode
9. Description renders only for correct level/section combinations
10. Section reference progress block renders in trainee/qualifier mode

Use React Testing Library + vi.mocked(invoke) pattern already established.
Run npm run test:coverage after writing. Commit and push.

Please read docs/AI_HANDOFF.md first.
```

---

### Phase G.3 — QuestionFormCard Integration Tests

**Goal:** Add integration tests for the most critical user-facing flows in `QuestionFormCard` — the form that handles all question creation and editing. Focus on behavior boundaries, not exhaustive UI coverage.

**Tests to write (target ~15 tests):**

_Reference editor flows:_

- Opens reference selector when toggled
- Selecting ref updates draftSelectedRefIds; deselecting removes it
- Attempting to select 3rd ref shows alert (max 2 limit)
- Invalid page format shows Thai error message
- Valid page format clears error
- Saving references updates linkedRefs and closes editor

_Core save flow:_

- Empty content shows validation error; does not call onSave
- Valid content calls onSave with correct payload
- `requireRef=true` + no linked refs → shows validation error
- `requireAnswerKey=true` + empty answer key → shows validation error

_Section 300 policy guards in form:_

- Reference editor section not rendered when `sectionGroup=300`
- Answer key section not rendered when `sectionGroup=300`

_Score section:_

- Score input visible only when `is_scored=true`
- Changing score type to `exempted` hides score inputs

**Files to create:**

- `src/test/integration/QuestionFormCard.integration.test.tsx`

**Initial prompt (copy to New Chat):**

```
Start Phase G.3 on branch phase-f-refactor-big-files.

Context:
- Phases G.1 and G.2 are complete. All prior tests passing. Branch is clean.

Goal of G.3:
Write ~15 integration tests for QuestionFormCard.tsx covering critical behavior boundaries:

Reference editor:
- Toggle opens/closes reference picker
- Checkbox toggles update draft selection (max 2 guard)
- Invalid page format → Thai error message; valid format → clears error
- Save references → updates linkedRefs, closes picker

Save flow validation:
- Empty content → validation error, onSave NOT called
- requireRef=true + no refs → error
- requireAnswerKey=true + empty key → error
- Valid data → onSave called with correct payload

Section 300 policy in form:
- Reference section hidden when sectionGroup=300
- Answer key section hidden when sectionGroup=300

Scoring:
- Score input hidden when is_scored=false

Important: QuestionFormCard has heavy invoke() calls. Mock all invoke calls
with vi.mocked(invoke). Use the pattern from AddQuestionModal.integration.test.tsx.
Run npm run test:coverage after writing. Commit and push.

Please read docs/AI_HANDOFF.md first.
```

---

### Phase G.4 — QuestionTreeNode Integration Tests

**Goal:** Add integration tests for the tree routing logic — verifying that `QuestionTreeNode` renders the correct sub-component given different editing states, and that recursive child propagation passes the right props.

**Tests to write (target ~10 tests):**

- When `editingId === question.id` and `useInlineScoreForm=true` → renders inline score form (not QuestionFormCard)
- When `editingId === question.id` and normal question → renders QuestionFormCard
- When `editingId !== question.id` → renders QuestionDisplayCard
- When `isCreating && insertingAfterId === question.id` → renders QuestionFormCard for insert-after
- When `isCreating && creatingAtParent === question.id` → renders QuestionFormCard for add-sub
- Collapsed node: children NOT rendered
- Expanded node with children: children rendered recursively
- Exempted 3xx.3/3xx.4/3xx.5 children suppressed even when expanded (exempted L2 filter)
- `canAddSub` flag: no add-sub form shown for 300-locked L1 (seq=1, seq=7)
- `canInsertSibling` flag: no insert-after form for required_instance children

**Files to create:**

- `src/test/integration/QuestionTreeNode.integration.test.tsx`

**Initial prompt (copy to New Chat):**

```
Start Phase G.4 on branch phase-f-refactor-big-files.

Context:
- Phases G.1, G.2, G.3 are complete. All prior tests passing. Branch is clean.

Goal of G.4:
Write ~10 integration tests for QuestionTreeNode.tsx covering tree routing logic:

1. editingId = current question + useInlineScoreForm → inline score form rendered
2. editingId = current question + normal → QuestionFormCard rendered
3. editingId ≠ current question → QuestionDisplayCard rendered
4. isCreating + insertingAfterId match → insert-after QuestionFormCard shown
5. isCreating + creatingAtParent match → add-sub QuestionFormCard shown
6. collapsedIds contains question.id → children NOT in DOM
7. Expanded with children → children rendered (at least first child visible)
8. Exempted L2 (3xx.3-3xx.5) suppressed even when parentExpanded=true
9. 300 locked L1 (canAddSub=false) → no add sub button
10. required_instance child → no insert-after button

Note: QuestionTreeNode is a recursive component. Render it with shallow children
(children array of 1-2 items) via mock data rather than deep trees.
Mock invoke() for all backend calls.
Run npm run test:coverage after writing. Commit and push.
Update docs/AI_HANDOFF.md to mark Phase G complete.

Please read docs/AI_HANDOFF.md first.
```

---

### Phase G — Summary Table

| Sub-phase | Focus                                | Target tests | Risk     | New files                      |
| --------- | ------------------------------------ | :----------: | -------- | ------------------------------ |
| G.1       | Coverage config + banner text guard  |      ~8      | None     | 2 test files, vitest.config.ts |
| G.2       | QuestionDisplayCard view-mode logic  |     ~12      | Very Low | 1 test file                    |
| G.3       | QuestionFormCard behavior boundaries |     ~15      | Low      | 1 test file                    |
| G.4       | QuestionTreeNode routing logic       |     ~10      | Low      | 1 test file                    |
| **Total** |                                      |   **~45**    |          | **5 files**                    |

**After Phase G completes:** ~152 tests total. All major editor_v2 behavior boundaries will have automated regression guards before the next feature round begins. Refactor round 2 (QuestionFormCard split) can then proceed safely.

---

## Phase Transition Checklist (Use Every Time)

Before moving to the next phase, always do this sequence:

1. **Condense completed phase**
   - In the completed phase section, replace full "Initial Prompt" block with condensed "Quick Starter"
   - Quick Starter = 5-8 lines: status, what was done, what's next, key file references
   - This keeps AI_HANDOFF.md readable (only current/next phase has full Initial Prompt)

2. **Add new phase section**
   - Create new "Starting Phase [X+1]" section with complete Initial Prompt
   - Use template: context → what's done → what to do → key files → guidelines
   - Copy Initial Prompt blocks are for pasting directly to new chat

3. **Update status in AI_HANDOFF.md**
   - Set completed phase to ✅ Complete
   - Set next phase as "Ready"
   - Refresh test totals, branch status, and recent commits

4. **Verify baseline before handoff**
   - Run `npm run test:run`
   - Run `npm run test:coverage` (if coverage is part of next phase)
   - Confirm no unexpected regressions

5. **Commit and push handoff updates**
   - Commit docs with clear message: e.g., "docs: Phase G complete → condensed to Quick Starter, added Phase H"
   - Push current branch
   - Ensure working tree is clean (except intentional temporary artifacts)

6. **Start next chat with new phase Initial Prompt**
   - Copy the "## Phase [X+1] Initial Prompt" block
   - Paste directly to new chat
   - This keeps context continuity and reduces re-explaining work
