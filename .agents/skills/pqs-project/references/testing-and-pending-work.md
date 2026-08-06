# Testing And Pending Work

## Current Test Surfaces

- Frontend: Vitest + Testing Library under `src/test/`.
- Rust: unit/policy tests across `src-tauri/src/` and `content_database/tests/`.
- CI: separate Windows workflows for frontend and Rust.

The frontend coverage configuration intentionally measures a selected risk set rather than the whole application. Treat its aggregate percentage as scoped coverage, not project-wide coverage. Remove nonexistent include paths when discovered.

## Verification Matrix

For frontend-only changes, run TypeScript, ESLint, relevant Vitest tests, and production build. For Rust-only changes, run targeted tests, full Rust tests, rustfmt, and Clippy. For IPC contracts, document flows, authentication, backup, or shared policies, run both suites.

Expected non-failing test noise currently includes intentional logger errors, jsdom `scrollBy` limitations, and some React `act()` warnings. Do not ignore new warnings merely because known warnings exist.

## Known Pending Work

### Keep During Development

- Role/view mapping remains a deliberate simulation so document behavior can be reviewed without repeatedly signing in as different people.
- Clear Answers remains under testing. Its scope must stay limited to the active document.

### Deferred Product Work

- Reliable A4 print pagination and line/page breaking are deferred until document UX/UI is complete or sufficiently mature.
- Full mapping from simulated roles to authenticated real users is deferred until the document structure is validated.

### Engineering Follow-ups

- Continue migrating direct frontend `invoke` calls into typed service boundaries.
- Expand coverage beyond the selected-file threshold and add end-to-end coverage for critical document workflows.
- Upgrade the frontend toolchain without `--force`: resolve the audited Vite/Vitest dependency chain and retest desktop startup, build, and coverage behavior.
- Reduce oversized editor/database modules only through behavior-preserving, test-backed slices.
- Complete versioned migration ownership for legacy best-effort schema changes.

## Commit Discipline

Keep cleanup/documentation, security behavior, and product UX changes in separate commits. Before staging, compare `git status` with the pre-task worktree and exclude unrelated user changes.
