---
name: pqs-project
description: Build, review, test, or maintain the PQS RTN Hybrid Storage desktop application. Use for any task in this repository involving React/Tauri architecture, PQS Sections 100/200/300, document authoring, trainee or qualifier views, SQLite content data, hybrid file storage, authentication, backup, testing, or release readiness.
---

# PQS RTN Project

Start by reading `AGENTS.md` at the repository root. Inspect the current worktree before editing and preserve unrelated changes.

## Route Context By Task

- Read [architecture-and-storage.md](references/architecture-and-storage.md) for startup, routes, data flow, schema, document lifecycle, or storage paths.
- Read [domain-rules.md](references/domain-rules.md) before changing sections, questions, references, career branches, scoring, answers, or view modes.
- Read [frontend-patterns.md](references/frontend-patterns.md) for React, editor, print preview, UI, type, or Tauri invocation work.
- Read [rust-database-patterns.md](references/rust-database-patterns.md) for Rust commands, SQLite, migrations, filesystem, authentication, or backup work.
- Read [testing-and-pending-work.md](references/testing-and-pending-work.md) when planning work, changing shared behavior, or preparing a commit/release.

## Working Loop

1. Locate the authoritative implementation and nearby tests; do not rely on historical planning documents as current behavior.
2. Confirm whether the rule belongs in Rust, React, or both. Enforce persistent invariants in Rust.
3. Reuse existing types, services, components, and transaction boundaries.
4. Add focused regression tests for policy changes and broader checks for shared flows.
5. Update `docs/system_specifications.md` when business behavior or known pending work changes.
6. Report user-owned dirty files separately and never include them in a commit without explicit scope.

## Sources Of Truth

Use this priority when sources disagree:

1. Tested Rust policy and schema code
2. Current React behavior and integration tests
3. `docs/system_specifications.md`
4. This skill's references
5. Historical plans under `docs/archive/`

