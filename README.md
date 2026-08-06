# PQS RTN Hybrid Storage

Desktop application for creating, evaluating, and maintaining Royal Thai Navy Personnel Qualification Standard (PQS) documents. It produces separate Trainee and Qualifier views while keeping structured content, answers, scoring, references, and attachments together.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Tailwind CSS, Tiptap |
| Desktop/backend | Tauri v1, Rust |
| Database | SQLite `content.db` through `rusqlite` and r2d2 |
| Testing | Vitest/Testing Library and Rust tests |
| CI | GitHub Actions on Windows |

## Architecture

```text
React UI
  -> typed Tauri commands
Rust command/domain layer
  -> pooled SQLite content.db
  -> AppData media and portable per-document data files
```

Rust and SQLite own persistent business rules. React provides editing, simulated role views, and continuous print previews. See [system specifications](docs/system_specifications.md) and the [project skill](.agents/skills/pqs-project/SKILL.md) for the maintained details.

## PQS Structure

| Group | Purpose | Theme | Important behavior |
| --- | --- | --- | --- |
| 100 | Fundamentals | Green | Section 101 is mandatory, fixed-title, and non-deletable |
| 200 | Systems/equipment | Orange | Career-branch subquestions and initially exempted templates |
| 300 | Watchstation qualification | Purple | Prerequisites, trainee evidence, performance, and scoring |

The active document can simulate Edit, Qualifier, Trainee, Visitor, and Print views. This simulation is intentionally retained until real-user role mapping is requested.

## Project Layout

```text
AGENTS.md                         Repository rules for coding agents
.agents/skills/pqs-project/      Discoverable project Skill and references
src/                             React application and frontend tests
src-tauri/src/                   Rust commands, domain logic, storage, tests
docs/                            Current specifications and project goals
docs/guides/                     Operational guides
docs/plans/                      Active review/improvement plans
docs/archive/                    Completed or historical plans
scripts/                         Supported development/test scripts
.github/workflows/               Frontend and Rust CI
```

## Quick Start

Requirements: Node.js 20 or later, npm, the stable Rust toolchain, and Windows build prerequisites for Tauri v1.

```powershell
npm ci
npm start
```

After the first install, normal development only needs `npm start`. Run commands from the repository root. See [How to run the project](docs/guides/HOW_TO_RUN_PROJECT.md) for build and troubleshooting commands.

## Verification

```powershell
npx tsc --noEmit
npx eslint src --max-warnings=0
npm run test:run
npm run test:coverage
npm run build

Set-Location src-tauri
cargo test --all-targets --all-features
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
```

Frontend coverage is currently scoped to selected risk files, not the entire frontend. Known product and engineering follow-ups are documented in [testing and pending work](.agents/skills/pqs-project/references/testing-and-pending-work.md).

## Documentation

- [Documentation index](docs/README.md)
- [Project goals](docs/project_goals.md)
- [System specifications and business rules](docs/system_specifications.md)
- [Engineering roadmap](docs/plans/ENGINEERING_ROADMAP.md)
- [Git workflow guide](docs/guides/GIT_WORKFLOW_GUIDE.md)

## Agent Onboarding

Coding agents must read [AGENTS.md](AGENTS.md) and then route task-specific context through [.agents/skills/pqs-project/SKILL.md](.agents/skills/pqs-project/SKILL.md). Historical plans are not authoritative when they conflict with tested code or current specifications.
