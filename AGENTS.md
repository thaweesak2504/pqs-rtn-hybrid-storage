# PQS RTN Agent Guide

Read `.agents/skills/pqs-project/SKILL.md` before changing this repository. Load only the referenced topic files needed for the task.

## Non-negotiable Rules

- Treat Rust and SQLite as the authority for persistent business rules; UI guards are supplementary.
- Keep the canonical product artifacts distinct: the Application Template/Skeleton is an empty guided format, `22724201001` is the permanent completed Sample/Source Document, and each Trainee Test Copy is an isolated issued instance. Never describe Trainee/Qualifier work as part of the Template/Skeleton.
- Preserve `22724201001` as the project's permanent sample document. Development simulations and mock `T-001`/`Q-001` work may exercise Creator, Trainee, and Qualifier workflows around it, but release seed data must exclude those simulations, answers, assessments, progress, attachments, sessions, and other mock work.
- The developer must be able to inspect Creator, Trainee, and Qualifier workflows, but this is a Developer/Simulation capability rather than three data layers embedded in a Template.
- Preserve the role/view simulation in `ActiveDocumentPage` until real-user role mapping is explicitly requested.
- Section 101 is created for every new document, has a fixed title, and cannot be deleted in any mode.
- Clear Answers must affect only answers, progress, and trainee attachments owned by the active document.
- Print Layout is intentionally a continuous preview. Reliable A4 pagination remains pending until document UX/UI is mature.
- Never expose password hashes or other secrets through Tauri IPC.
- Preserve unrelated worktree changes and ask before deleting user-authored data.

## Required Verification

Run checks proportional to the change. For shared or release-facing changes, run all of these:

```powershell
npx tsc --noEmit
npx eslint src --max-warnings=0
npm run test:run
npm run build
Set-Location src-tauri
cargo test --all-targets --all-features
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
```
