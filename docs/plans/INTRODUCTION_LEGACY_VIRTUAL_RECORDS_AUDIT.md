# Introduction Legacy Virtual Records Audit

**Status:** Option C implemented and manually verified
**Audit date:** 2026-08-17
**Persistence approval:** 2026-08-17
**Manual migration/UI verification passed:** 2026-08-17
**Branch:** `editor-workflow-v2`

## Scope

The initial audit inspected legacy `Questions` rows created with virtual `section_id` values `100`, `200`, and `300` without changing persistent records. After Product Owner approval, Option C was implemented through a versioned migration and clean-Skeleton creation rule. The application has not been launched against the active database as part of implementation; live migration remains a manual verification gate.

## Legacy Record Signature

Before Option C, `seed_document_template` inserted exactly three root/header Questions for every new document:

| Virtual group | Sequence | Content | Other identifying fields |
| --- | ---: | --- | --- |
| 100 | 100 | `100 Introduction` | `parent_id IS NULL`, `is_header = 1`, `answer_type = 'none'` |
| 200 | 200 | `200 System Description (<unit name>)` | `parent_id IS NULL`, `is_header = 1`, `answer_type = 'none'` |
| 300 | 300 | `300 Operations` | `parent_id IS NULL`, `is_header = 1`, `answer_type = 'none'` |

These values are group numbers, not foreign keys to rows in `Sections`. Historical databases may therefore contain two namespaces in `Questions.section_id`: a real `Sections.id`, or one of these three virtual group numbers.

## Findings From Code

The findings below describe the pre-implementation state captured by the audit. The implemented replacement is recorded under **Implemented Persistence Policy**.

### Creation and existing documents

- `create_document` calls `seed_document_template` before creating mandatory Section 101, so every newly created Source Document receives all three rows.
- Startup schema initialization does not add missing virtual rows and does not remove existing ones. Existing documents keep whichever rows they already contain.
- The startup query whose comment says it marks seeded Section 100/200/300 Questions as template only matches Questions whose `section_id` equals a real system-defined `Sections.id`. It does not reliably identify these virtual rows.
- `Questions.section_id` has no foreign key to `Sections`, allowing the virtual values to persist but providing no database distinction between the two namespaces.

### Rendering and frontend behavior

- General, Section 100, Section 200, and Section 300 Introduction views render from typed definitions in `src/content/introductionContent.ts`; General item 2 reads `Documents.applied_to`.
- None of the four Introduction views invokes `get_document_questions` or reads the three legacy rows.
- Both Question IPC readers return every Question belonging to a document, including the virtual rows.
- Real Section editor/preview components then filter by the active real `Sections.id`. The legacy rows are normally ignored, but the filter becomes ambiguous if a real Section primary key equals 100, 200, or 300.
- The generic update/delete/reorder Question commands do not explicitly protect the legacy rows. The current UI does not expose them, but the backend does not give them a distinct immutable type.

### Simulation clone

- Simulation cloning selects every Question from the Source Document and therefore copies all three virtual rows.
- Clone code contains an explicit exception that preserves 100/200/300 when no real section mapping is found.
- The lookup checks the real `section_map` first. If a source document has a real `Sections.id` equal to 100, 200, or 300, the matching virtual row is remapped to that real Section in the Simulation instead of remaining virtual.
- Questions, Answer Keys, and real Section content are otherwise cloned independently. Trainee Answers, assessments, Progress, and Trainee attachments are not copied.

### Delete and Clear Answers

- Deleting a Document removes the rows through the `Questions.document_id` cascade.
- Clear Answers does not delete Questions, so it correctly leaves these rows untouched along with all authored Questions and Answer Keys.

### Export, backup, and portability

- Full Hybrid Backup includes a consistent snapshot of the entire `content.db`; the legacy rows are therefore included and restored with the database.
- Universal SQLite Backup copies the database and also includes the rows.
- The current JSON/CSV/SQL `export_database` path exports only `users` and `high_ranking_officers`; it is not a Document export and does not include Questions at all.
- A per-document Source/Trainee portable package is not implemented yet. No current portable-package contract depends on the virtual rows.

### Existing test coverage

- Existing Simulation tests cover listing/summary scope and rejection of a Simulation ID as a template scope; they do not assert cloning of the virtual rows or the collision case.
- Existing template-seeding tests cover the real Section 200 and Section 300 question structures; they do not exercise `seed_document_template` or assert the three virtual rows.
- Batch 3 ran both existing groups successfully (2 Simulation tests and 8 template-seeding tests), but the missing cases must be added with the persistence implementation rather than treating the current suite as proof that the overloaded namespace is safe.

## Read-only Database Evidence

Read-only inspection of the active `content.db` on 2026-08-17 found:

- 3 Documents: 2 `draft`, 1 `simulation`.
- 9 matching virtual rows: exactly one 100, one 200, and one 300 row per Document.
- All 9 rows have `is_template = 0`.
- No matching row has an Answer Key, Choice, Question Reference, or User Answer.
- No document has a missing or duplicate virtual group row.
- Current `Sections` IDs range from 124 to 327 and the AUTOINCREMENT sequence is 345.
- No current `Sections` row has ID 100, 200, or 300, so the active database has no present collision.
- No non-virtual Question points to a missing real Section in the inspected database.

This is a point-in-time safety check, not a schema guarantee. Imported/older databases and historical clone operations can still contain the collision condition because the data model permits it.

## Risk Assessment

1. **Namespace collision:** one integer column represents two different concepts. Joins, filters, clone mapping, policy helpers, and future export code can misclassify a row.
2. **Duplicate authority:** Introduction content is already authoritative elsewhere, while these rows contain obsolete English placeholders.
3. **Unnecessary issued-copy payload:** every Simulation receives three unused records.
4. **Misleading template flag:** the rows are system-seeded but remain `is_template = 0` in the inspected database; relying on that flag for cleanup would be unsafe.
5. **Future portability ambiguity:** carrying unused Questions into a portable package would create records with no rendered meaning and no stable Introduction contract.

Current user-visible risk is low because the active database has no ID collision and no dependent rows. Structural risk remains high enough that new seeding should not continue indefinitely.

## Policy Options

### Option A — Retain permanently

Not recommended. It preserves dead data and the overloaded namespace without a current consumer.

### Option B — Stop new seeding, leave existing rows

Acceptable only as a temporary transition. It prevents growth but keeps ambiguity in existing Sources, Simulations, backups, and future packages.

### Option C — Deprecate and migrate exact legacy rows

**Recommended.** Introduction rendering and `Documents.applied_to` remain unchanged, while the unused rows and virtual namespace are removed.

## Implemented Persistence Policy

1. Migration version 3 classifies only the exact historical signature and additionally requires that the numeric value is not a real `Sections.id` belonging to the same Document.
2. Before deletion, the migration requires zero children and zero rows in Question Answer Keys, Choices, Question References, Question/Subquestion links, Question/Section links, and User Answers. Any dependency aborts and rolls back the entire migration; it never cascades silently.
3. Exact candidates are deleted in one migration transaction. A database with no candidates baselines version 3 without a data mutation.
4. `seed_document_template` was removed. New Documents now receive the clean Application Skeleton: mandatory, fixed Section 101 only; Introduction standard content remains code-owned and General item 2 remains `Documents.applied_to`.
5. Simulation cloning no longer preserves virtual IDs. Every cloned Question must map to a real cloned Section, including the isolated collision case where a real Section primary key is 100, 200, or 300.
6. Rust regression tests cover clean-Skeleton creation, exact migration cleanup, dependency abort/rollback, real-Section collision preservation, baseline behavior, and clone mapping/rejection.
7. Full TypeScript, ESLint, frontend test/build, Rust test/fmt/clippy verification passed. Manual verification then confirmed existing Source/Simulation content, all Introduction views, clean new-document structure, and new Simulation cloning. Recreating Section 100/200 Questions and Answer Keys was intentionally not required because that authoring workflow had already passed and existing persisted content plus clone behavior covered this batch's risk.

## Manual Gate

Product Owner approved Option C and the preflight/abort behavior on 2026-08-17. The Manual Gate passed after the safety-backup/startup sequence and UI verification. The standing operational rule remains: if migration preflight ever reports an unexpected dependency on another database, stop and inspect the evidence; do not bypass or manually delete the row.
