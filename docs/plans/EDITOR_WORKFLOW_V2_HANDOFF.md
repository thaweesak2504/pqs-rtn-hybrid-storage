# Editor Workflow V2 Handoff

**Prepared:** 2026-08-10

**Checkpoint branch:** `welcome-uxandui-upgrade`

**Continuation branch:** `editor-workflow-v2`

## Start Here

Read these sources in order before changing the repository:

1. `AGENTS.md`
2. `.agents/skills/pqs-project/SKILL.md`
3. `docs/system_specifications.md`, especially Sections 7.2-7.4
4. `docs/plans/EDITOR_EDITING_WORKFLOW_UX_PLAN.md`
5. This handoff

Read `EDITOR_EDITING_WORKFLOW_BASELINE.md` only when tracing legacy behavior. Load the topic references routed by the PQS skill for architecture/storage, domain rules, frontend work, Rust/SQLite work, or verification.

## Validated Checkpoint

- Phase 3 Section 200 mapping integrity is implemented and passed its manual UI gate.
- Creator Question Draft covers Question, Description, Sub-questions, References, Answer Key, and Question Attachments.
- The Unsaved Changes Modal lists only the areas changed in the current Draft.
- Continue keeps the Draft; Discard restores persisted state; Save-and-switch opens the next form only after a successful save.
- Removing a Section 200 subquestion with an Answer Key requires an explicit impact decision. Existing Trainee work blocks removal.
- Persisted Question attachments are deleted only after save succeeds. Discard keeps persisted files and removes newly uploaded Draft files.
- Tiptap physical `KeyS` save support works with Thai and English keyboard layouts. Toolbar selection ownership and selected-text color feedback were manually validated.
- Simulation copies are isolated documents with stable `<source-id>-SIM-<sequence>` identities. Returning to the source does not delete a copy.
- Desktop session restoration and Sign-in feedback were stabilized and manually validated.

The permanent completed Sample/Source Document is `22724201001`. It is not the empty Application Template/Skeleton. Development SIM copies and mock `T-001`/`Q-001` work must not enter the clean release seed.

## Continue From Here

For the Editor UX track, continue with **Phase 4 — Editor Lifecycle, Focus, and Accessibility**:

1. Add stable editor IDs and accessible labels.
2. Implement clean-only external content synchronization.
3. Use mount-on-edit for long Section 200 lists and measure simultaneous Tiptap mounts.
4. Focus the active editor on open and restore focus after save, cancel, delete, and Modal actions.
5. Verify mouse, keyboard, screen-reader labels, dark mode, and failure paths.

Keep Phase 3.5 product work separate from Phase 4 commits. Phase 3.5 still needs the real Trainee Test Copy issuance model, Qualifier all/selected/random plans, portable export/import, revision lineage, and release-seed cleanup.

## Always Preserve

- Rust and SQLite are authoritative for persistent business rules.
- Section 101 is fixed and cannot be deleted.
- Section 300 cannot persist References or Answer Keys.
- Clear Answers affects only the active document's Trainee answers, progress, and Trainee attachments.
- Role/view simulation remains available until real-user mapping is explicitly requested.
- Returning to a source document never deletes a Simulation copy.
- Do not delete or stage user databases, test content, backups, or managed attachment folders.

## Verification Before Shared Checkpoints

Run the full verification list in `AGENTS.md`. Focused Creator form coverage is in `QuestionFormCard.integration.test.tsx`; Tiptap selection ownership is in `TiptapEditor.test.tsx`.

At this checkpoint, TypeScript, ESLint, production build, all 33 frontend test files (237 tests), all 114 Rust tests, rustfmt, and Clippy pass. Run Vitest with one worker and file parallelism disabled if the local machine has limited Node heap: `npx vitest run --maxWorkers=1 --no-file-parallelism`.
