# Test Suite Audit

## Scope

This document records the completed audit and follow-up hardening work for the Rust test suite around the `content_database` refactor.

## Audit Summary

The existing suite already covered these areas well:

- Template seeding for Section 200 and Section 300
- Policy enforcement for references, answer keys, Section 101, and branch changes
- Score propagation and exempted-score behavior
- Basic CRUD, transaction rollback, temp database helpers, export/import, and backup utilities

The highest-value gaps found during the audit were:

- No direct regression tests for the migration helpers in `content_database/migrations.rs`
- Document ID tests that did not exercise the real ID-generation logic directly
- No focused tests for standard-branch bootstrap idempotency and fallback behavior
- No deterministic temp-dir tests for managed media file path and cleanup helpers

## Improvements Implemented

### Migration regression coverage

Added tests for:

- placeholder answer-key insertion when legacy metadata requires an answer key
- idempotent migration of `selectedSubQuestions`
- scrubbing legacy `answerKey` and `answerKeys` fields without removing unrelated metadata

### Document ID coverage

Extracted `generate_document_id_with_conn(...)` from the existing production logic so tests can exercise the real sequence-generation behavior against an isolated in-memory database.

Added or strengthened tests for:

- ID format from an empty table
- next-sequence generation for an existing prefix
- independence across different prefixes

### Standard branch bootstrap coverage

Added tests for:

- idempotent rerun of `ensure_standard_occupation_branch_exists(...)`
- numeric fallback main-branch code assignment when the preferred `STD` code is already taken

### Media helper coverage

Extracted internal helpers in `content_database/media.rs` to allow deterministic temp-dir testing without touching the real app data directory.

Added tests for:

- bundling a reference file into the expected portable `data/...` path
- resolving and deleting managed question-image paths inside an injected temp directory

## Files Changed

- `src-tauri/src/content_database/documents.rs`
- `src-tauri/src/content_database/media.rs`
- `src-tauri/src/content_database/tests.rs`
- `docs/TEST_SUITE_AUDIT.md`

## Verification

Latest verification result:

```text
cargo test
62 passed; 0 failed
```

## Outcome

The test suite now has stronger regression protection around migration behavior, document ID generation, standard branch bootstrap behavior, and managed media file handling.
