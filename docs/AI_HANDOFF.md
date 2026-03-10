# AI Handoff - PQS RTN Hybrid Storage

Last updated: 2026-03-10
Status: Planning-safe mode ("do not break current behavior")

## Project Intent
- Template testing for sections 100/200/300 is the core priority.
- Section 300 (Practical Skills) is the highest risk area.
- Primary quality goal: no behavior regression.

## Current Verified Baseline
- Frontend test stack is active: Vitest + Testing Library + jsdom.
- Existing tests: 47 passing (8 files).
- Current coverage baseline: 64.72% lines, 62.5% functions.
- Strategy docs exist and are approved for planning-level work.

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
1. Impact audit of `src-tauri/src/content_database.rs` (read-only).
2. Capture invariants and regression checklist.
3. Add backend unit tests for template seeding and score/branch logic.
4. Add integration tests for API contract around template restrictions.
5. Keep E2E minimal first (smoke-critical paths only).

## Done Recently
- Created and refined testing docs focused on template testing.
- Confirmed planning pause to avoid accidental production behavior changes.

## Fast Start Commands
- `npm run test:run`
- `npm run test:integration`
- `npm run test:coverage`
