# Introduction Phase 2 — Live System Content Governance

**Status:** Batch I2.2 complete and manually verified
**Prepared:** 2026-08-17
**Product decision:** 2026-08-17
**Edit authority decision:** 2026-08-17
**Branch:** `editor-workflow-v2`

## Confirmed Product Policy

System Introduction uses **Live Update**:

- General Introduction items 1 and 3–7 plus every Section 100/200/300 Introduction item always display the current approved System Content shipped by the application.
- Improving or correcting System Introduction updates existing Source Documents, Simulation/Trainee copies, Qualifier view, Visitor view, and Print Layout together.
- Historical documents do not freeze a separate System Introduction version.
- General Introduction item 2 (`การประยุกต์ใช้`) remains Document Content in `Documents.applied_to`; it is not overwritten by a System Content update.
- The Application Skeleton remains clean and does not persist Introduction as Questions.

This confirms Option A from the initial versioning analysis. Immutable per-document bundles and per-document System Introduction snapshots are not required under the chosen policy.

## Current Implementation

The current runtime already follows the confirmed Live Update policy:

1. `src/content/introductionContent.ts` is the single typed source for System Introduction.
2. General/100/200/300 views import the current definitions directly.
3. Normal view and Print Layout use the same definitions.
4. Source Documents and Simulation copies therefore receive revised System Content when the application is updated.
5. Simulation cloning copies only the Document-owned `applied_to`; it does not copy or version System Introduction.

No schema change or migration is needed merely to confirm Live Update.

## Current Edit Capability

There are two different content classes and only one currently has an in-app editor:

| Content | Current authority | Editable in app |
| --- | --- | --- |
| General item 2 — `การประยุกต์ใช้` | `Documents.applied_to` | Yes; Creator Source Document only |
| General items 1, 3–7 | Typed System Content in code | No |
| Section 100 Introduction | Typed System Content in code | No |
| Section 200 Introduction | Typed System Content in code | No |
| Section 300 Introduction | Typed System Content in code | No |

At present, changing System Introduction is a **Developer-controlled application change**: edit the typed definitions, run tests, review the wording/UI, and release the updated application. There is no Admin/System Content editor in the Desktop App.

## Implications of Live Update

- A correction reaches every document without copying or migrating document rows.
- Hybrid Backup restores local Document Content and work data, while System Introduction comes from the application version used after restore.
- Two installations running different application releases may temporarily show different System Introduction until both are updated.
- Future Portable Packages do not need to carry a per-document Introduction snapshot, but their compatibility policy should require an appropriate application/content release at the destination.
- A mistaken System Content release also affects every document immediately after application update; review and rollback discipline therefore matter.

## Edit-Surface Options

### Option 1 — Developer-controlled code only — Confirmed

Keep the current model. System Introduction changes through source control, automated tests, review, and application release.

Benefits:

- One clear authority.
- Changes are reviewed, attributable, and rollbackable through Git/release history.
- No new database, role, audit, or concurrent-edit rules.

This is the confirmed model. System Introduction content must be reviewed and agreed through the responsible content meeting/approval process before a Developer changes the typed definitions, runs verification, and publishes a new application version.

### Option 2 — Global Admin System Content editor — Not approved

Add a protected Administration workflow that edits one global current System Introduction set. It must not be placed inside an individual Document editor because the change affects every document.

Before implementation it requires:

- authenticated authorization for who may edit and publish global content,
- draft/preview/publish lifecycle,
- change summary and explicit confirmation that all documents will update,
- audit history with actor, timestamp, before/after content, and reason,
- rollback to the previous global revision,
- protection against simultaneous editors and partial saves,
- Rust/SQLite authority and transaction tests,
- normal/Print parity and accessibility verification.

This option is outside the approved product policy. Distributed Admin editing could create different local standards and unclear authority between sites, so no Global Admin editor, database table, or runtime publish command should be implemented.

## Confirmed Change Workflow

1. The responsible group meets, reviews, and approves the revised standard wording before code changes begin.
2. The approved wording and decision reference are handed to the Developer as the authoritative change request.
3. The Developer changes only `src/content/introductionContent.ts` unless a reviewed structural change requires otherwise.
4. Automated structure/order/normal-view/Print parity checks must pass.
5. The Product Owner manually reviews General/100/200/300 Introduction before release.
6. The change is recorded in source control and release notes, then distributed as a new application version.
7. Every installation that updates to that application version receives the same System Introduction through Live Update.
8. A defective release is corrected through a reviewed hotfix/new application version or rollback procedure, never by local Admin edits.

## Proposed Batches

### Batch I2.1 — Edit-surface decision

- [x] Confirm Live Update for System Introduction.
- [x] Confirm `applied_to` remains independent Document Content.
- [x] Confirm no per-document System Introduction version or snapshot is required.
- [x] Confirm System Content remains Developer-controlled through Code/Release.
- [x] Exclude a distributed Global Admin editor from the approved scope.
- [x] Require content meeting/review approval before Developer implementation.

No database or UI mutation belongs in this batch.

### Batch I2.2 — Live-content change discipline

- [x] Document the exact source file and review procedure in `docs/plans/INTRODUCTION_CONTENT_CHANGE_CHECKLIST.md`.
- [x] Add structural validation for unique sibling IDs and required content at section, sub-item, and nested-item levels.
- [x] Require content-order and normal/Print parity tests for every change.
- [x] Provide detailed Manual Gate steps for General/100/200/300 and Creator/Visitor/Trainee/Qualifier/Print views.
- [x] Define the release-note entry and approved-content decision reference expected for each update.

**Implementation note (2026-08-20):** `src/content/introductionContentValidation.ts` now validates all four canonical Introduction pages without changing runtime content or UI. The negative test suite proves empty collections, blank required text, and duplicate sibling IDs are reported with exact source paths. Existing integration coverage remains the authority for approved order, complete nested content, normal/Print parity, and heading semantics. Focused Introduction verification passed 17 tests across 2 files. The frontend checkpoint passed TypeScript, full `src` ESLint with zero warnings, 315 tests across 41 files, and the production build; the build reported only the existing dynamic-import and large-chunk warnings. The Desktop App Manual Gate remains before this batch is closed.

**Manual Gate finding (2026-08-20):** General/100/200/300 content, order, authority, and view parity passed, but Print Layout exposed semantic orange list labels and inline Tiptap colors. The route-level Print surface now enforces monochrome text only while retaining authored and semantic colors in normal views. The correction passed 24 focused tests, TypeScript, full `src` ESLint with zero warnings, 316 frontend tests across 41 files, and the production build; only the existing build warnings remain. A focused Print Question/Answer Key retest is required before Batch I2.2 closes.

**Print cleanup (2026-08-20):** The print-only branches for Cover, General Introduction, and Section 100/200/300 Introduction now define one neutral foreground at the paper root and let descendant text inherit it. The contradictory Section 200 orange list-marker class and redundant descendant foreground classes were removed only from Print rendering. The route-level monochrome guard remains intentionally in place for inline Tiptap color marks and future components. Regression coverage now rejects chromatic Tailwind text classes in Introduction Print views. The post-cleanup frontend checkpoint remained at 316 passing tests across 41 files, with TypeScript, full ESLint, and production build passing.

**Manual closeout (2026-08-20):** Product Owner manually verified monochrome Print rendering, reference-page placement in the Section 200 question text flow, and Arabic system-generated Section/Question numbering across Sections 100/200/300 in both Print subviews. Thai alphabet labels (`ก.`, `ข.`) remain part of the document structure. User-authored Tiptap content remains unchanged; automatic rejection or silent conversion of Thai digits is intentionally outside this batch and is not a required follow-up. Final frontend verification passed 320 tests across 42 files, TypeScript, full ESLint, and the production build before the cross-stack closeout checkpoint.

### Batch I2.3 — Release and rollback handoff

**Transferred (2026-08-22):** เก็บรวมใน `VERSIONING_AND_DISTRIBUTION_HANDOFF.md` เพื่อออกแบบพร้อม Application, Schema, Source Revision, Issued Copy, Backup และ Portable Package โดยไม่สร้าง Release mechanism เฉพาะ Introduction ซ้ำอีกชุด

- [ ] Confirm how installations identify the application version containing approved Introduction content.
- [ ] Define update rollout and recovery when one site remains on an older application version.
- [ ] Define hotfix/rollback ownership without adding local content editing.
- [ ] Keep approved wording and decision references in project/release history.

### Batch I2.4 — Compatibility handoff

**Transferred (2026-08-22):** minimum application/content release และ package compatibility ถูกย้ายไป Consolidated Versioning Phase เดียวกัน รายการด้านล่างยังเป็น decision backlog ไม่ใช่ implementation ที่ขวางการปิด Batch I2.2

- [ ] Record the minimum application/content release in future package compatibility rules.
- [ ] On import, reject an unsupported required release rather than silently displaying incomplete System Content.
- [ ] Keep this handoff separate from implementation of the deferred Portable Export engine.

## Confirmed Boundary

System Introduction remains editable only by Developers through approved Code/Release changes. Do not add an Admin editor, database tables, local publish command, or runtime System Content mutation unless the Product Owner explicitly reopens this policy in a future phase.
