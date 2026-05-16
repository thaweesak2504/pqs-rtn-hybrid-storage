# Workflow: Agent Onboarding

Use this workflow when starting a new session or onboarding a new agent to the PQS RTN Hybrid Storage project.

## 1. Project Context
This is a standard hybrid desktop application utilizing Tauri (Rust) and React (TypeScript).
- The user is building the Personnel Qualification Standard (PQS) system for the Royal Thai Navy.
- PQS follows a strict structure:
  - Section 100: Fundamentals
  - Section 200: Systems
  - Section 300: Watchstations

## 2. Reading Standard Skills
Before writing any code or proposing architectural changes, you MUST read the skill files located in `.agent/skills/`.
These files contain critical domain knowledge, specifically regarding styling (A4 standard), Tauri command structures, and differences between the Sections.

Use your tools to read the following files:
- `.agent/skills/skill-01-architecture.md`
- `.agent/skills/skill-02-frontend-react.md`
- `.agent/skills/skill-03-backend-rust.md`
- `.agent/skills/skill-04-domain-logic.md`

## 3. General Development Loop
1. When asked to implement a UI component, locate existing patterns in `src/components/editor_v2/` first. Do not invent custom colors; strictly use `github-bg-*` variables.
2. When asked to implement DB logic, add the struct to `src/types/content.ts`, implement the standard `Result<T, String>` command in `src-tauri/src/commands/`, and map it via `rusqlite`.
3. When the user reports an error, always check the `npx tsc --noEmit` and `cargo check` outputs before making a conclusion.
