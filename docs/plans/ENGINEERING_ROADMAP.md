# Engineering Roadmap

Updated: 2026-08-06

This roadmap tracks current technical work. Completed phase plans and earlier audits are retained under `docs/archive/`.

## Current Product Priority

Complete and refine the document UX/UI and validate PQS structure across Edit, Qualifier, Trainee, Visitor, and continuous Print views. Keep the existing role/view simulation while this validation is in progress.

## Recently Completed

- Consolidated user/content data in `content.db` with pooled SQLite connections and versioned migrations.
- Split the main content database module into domain-focused modules.
- Protected mandatory Section 101 in the UI and Rust policy layer.
- Scoped Clear Answers to the active document's answers, progress, and trainee attachments.
- Removed password hashes from public Tauri DTOs.
- Added backend-issued opaque sessions, protected user-management commands, refreshed identity/role from SQLite, and added private/admin route guards.
- Hardened hybrid backup with SQLite snapshots, database checksums, bounded safe ZIP extraction, and SQLite restore APIs.
- Reorganized agent Skills, documentation, scripts, and generated artifacts.
- Preserved global reference files in `data/COMMON/references` before deleting a document-owned data folder.
- Added hashed persistent authentication sessions with rolling 30-day inactivity expiry for offline desktop use.

## Engineering Follow-ups

### High Priority

- Tighten the Tauri CSP and reduce broad asset filesystem scope without breaking managed media previews.
- Inventory and authorize the remaining sensitive raw IPC commands before role simulation is mapped to real users; user-management commands are already protected at the backend.
- Forward-test backup/restore with realistic databases and large media sets on packaged Windows builds.

### Quality And Maintainability

- Continue moving direct frontend `invoke` usage into typed service boundaries.
- Expand frontend coverage beyond the selected risk-file list and add end-to-end document workflows.
- Remove known React `act()` and jsdom `scrollBy` warning noise from tests.
- Move remaining best-effort schema changes into versioned migrations.
- Refactor oversized files in behavior-preserving, test-backed slices.
- Review bundle splitting; the main editor chunk remains large.
- Upgrade the audited frontend dependency chain without `--force`; prioritize React Router/PostCSS runtime exposure and the Vite/Vitest development toolchain.

## Deliberately Deferred

- Reliable physical A4 pagination and line/page breaking: resume after document UX/UI is complete or sufficiently mature.
- Mapping simulated Trainee/Qualifier/Visitor views to authenticated real users: resume after the document structure is validated.
- Full database encryption and production key management: schedule as a dedicated release-readiness phase.

## Release Gate

Before a production pilot, require full TypeScript/ESLint/build checks, frontend and Rust tests, packaged backup/restore validation, authorization review, and an explicit decision on database encryption and operational recovery.
