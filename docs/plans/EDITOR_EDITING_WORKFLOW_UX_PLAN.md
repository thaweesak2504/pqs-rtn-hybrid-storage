# Editor Editing Workflow UX/UI Improvement Plan

**Status:** Phase 3 completed and manually validated; Phase 3.5 simulation inventory foundation implemented

**Created:** 2026-08-07

**Last reviewed:** 2026-08-10
**Scope:** Editor/Creator Answer Key, Trainee Answer, Section 100/200 workflow, save/cancel/clear behavior, focus management, and action-oriented modal dialogs.

## Current Resume Point

The validated workflow currently ends after the core **Phase 2 — Safe Save Semantics** work:

- Creator Question + Answer Key draft, cancel, Escape, competing-form, and Save-and-switch behavior passed manual validation.
- Transactional Question save passed for Section 100 and Section 200, including multiple Answer Keys, references, and subquestion remapping.
- Clearing a required Answer Key is detected at the Answer Key editor and prevents an invalid save/switch.
- `Ctrl/Cmd+S` uses the physical S key and works independently of the active Thai/English keyboard layout.
- Tiptap formatting retains the active selection and applies color/formatting immediately.
- Template and Simulation are separated; Trainee Answers and Qualifier feedback remain outside the Template.

The core **Phase 3 — Section 200 Integrity** implementation and its manual UI gate are complete. A Template-scoped simulation inventory now lists only copies that still exist, summarizes work, reopens a selected copy, exposes its managed attachment folder, and deletes only after explicit confirmation. Remaining Phase 1/2 unchecked items are supporting refinements and failure-path hardening; they must still be completed before final acceptance.

### Phase 3 Implemented Sequence

1. Backend validation now limits selected codes to the permitted Parent list.
2. Read-only impact analysis runs before removing persisted codes.
3. An action-oriented Mapping Impact modal shows Answer Key, Answer, assessment, and attachment counts.
4. Answer Key-only removal requires confirmation; Trainee-dependent removal is blocked without changing data.
5. Answer Key UPSERT, canonical ordering, and Section 200 answer hydration are unified by subquestion code.
6. Focused frontend tests and the full Rust suite pass; Creator/Simulation UI validation passed, including Section 200 exact-code hydration and answer-label baseline rendering.

### Phase 3 Manual Test Gate

Manual testing is required after items 1–5 are implemented. The test set must cover:

1. Add a new permitted subquestion code and its Answer Key; save should proceed without an unnecessary impact warning.
2. Remove a selected code that already has an Answer Key; the modal must identify the exact code, label, and Answer Key count.
3. Choose `กลับไปแก้ไขต่อ`; the Creator draft must remain open with the code still removed in the local Draft, while the Template remains unchanged. Selecting the code again must restore its buffered Answer Key.
4. Repeat the removal and choose `ยืนยันการเปลี่ยนแปลง`; reopen the Question and verify code, Answer Key, order, and labels.
5. Restore the test code/Answer Key after the check if it belongs to the real Template content.
6. Open a Simulation created before the Template change and verify its structure, Answer Keys, Trainee Answers, assessments, and attachments are unchanged.
7. In a Simulation, save answers for at least two codes, refresh, and verify Trainee and Qualifier views hydrate each answer under its exact code.
8. Verify the Template still contains no Trainee Answer or Qualifier feedback UI.

The blocked-removal path for a document that directly contains Trainee work is enforced by Rust regression tests. It is intentionally not normally reachable through the UI because Creator editing is prohibited in Simulation documents and Template documents do not own Trainee work.

## Product Boundary: Template and Trainee Test Document

The document created by an Editor/Creator is a reusable **Template Document**. When a Trainee takes a test, the system must create a separate **Trainee Test Document** from a fixed template revision. The Qualifier controls the assessment scope only inside that Trainee Test Document.

```text
Template → issue an immutable trainee-specific copy → Qualifier plans each section → Trainee responds → Qualifier assesses
```

Template changes after issue affect future copies only. They must not change any Trainee's issued copy, selected questions, answers, assessments, or progress.

## 1. Goal

Make editing predictable and safe:

- A user always knows whether a change is a local draft or has been saved.
- Cancel never silently destroys a meaningful local draft.
- A save either completes the related change set or reports failure without a misleading success state.
- Section 200 maintains a reliable mapping between selected subquestions, answer keys, trainee answers, and assessments.
- Rich-text editors are mounted only when needed, without sacrificing accessibility or keyboard flow.
- Confirmation dialogs explain consequences and let the user complete the relevant action inside the dialog.

## 2. Current Product Rules to Preserve

- Section 100 uses the direct model: one Question, one Answer Key, one Trainee Answer.
- Section 200 supports one Question with a subquestion list. A child Question can bind to selected subquestion codes; Answer Keys and Trainee Answers are stored by that code.
- Each issued Trainee Test Document belongs to exactly one Trainee and records the Template ID/revision it was created from.
- Qualifier section control (`all`, `selected`, `random`) belongs to the issued Trainee Test Document, never the Template.
- Section 300 must not expose or persist Answer Keys.
- Section 101 remains system-defined and protected.
- `Clear Answers` may affect only answers, progress, and trainee attachments belonging to the active document.
- Rust/SQLite remain the authority for persistent rules; frontend validation is supplementary.
- Existing role/view simulation remains in place.

## 3. Target Editing States

| State | Meaning | Allowed actions |
|---|---|---|
| `view` | Persisted data is being displayed. | Start edit, view status/history. |
| `editing-clean` | Editor is open but matches the persisted snapshot. | Cancel/close without confirmation. |
| `editing-dirty` | Local draft differs from the persisted snapshot. | Save, discard through confirmation, continue editing. |
| `saving` | Save request is in progress. | Disable duplicate/destructive actions; retain draft on failure. |
| `save-failed` | Persisted data is unchanged or transaction rolled back. | Retry, inspect error details, keep editing. |
| `deleting` | Destructive request is in progress. | Disable duplicate actions; report final result. |

## 4. Intended Workflows

### 4.1 Creator: Question and Answer Key

1. Open one Question form and load Question, references, subquestion bindings, and Answer Keys before mounting rich-text Answer Key editors.
2. Keep one immutable persisted snapshot and one editable draft.
3. For Section 100, show one Answer Key editor.
4. For Section 200, show Answer Key editors only for currently selected subquestion codes. Prefer an accordion or one active Answer Key editor when the selected list is long.
5. Validate all visible required fields before issuing a save request.
6. Save Question metadata, references, subquestion links, and Answer Keys as one backend transaction.
7. On success, replace the persisted snapshot with the returned authoritative data, show success feedback, and close only when the user chose Save-and-close.
8. On Cancel, Escape, navigation, mode switch, or a competing edit request: if the draft is dirty, show the Unsaved Changes modal.

### 4.2 Trainee: Answer

1. Show a persisted answer in view state and expose a clear Edit/Answer action.
2. When editing starts, obtain a document-level answer-editor lock and mount Tiptap only for the active Answer Box.
3. Focus the rich-text textbox after it mounts.
4. Enable Save only when the answer satisfies the relevant policy. For `needs_improvement`, require an actual change from the persisted snapshot.
5. On success, store the answer and attachment metadata, set status to `pending`, release the lock, refresh progress, and restore focus to the originating Answer Box action.
6. On Cancel with a dirty draft, request confirmation before discarding text and newly uploaded attachments.
7. Keep deletion separate from Cancel. Deletion always requires a destructive confirmation.

### 4.2.1 Issue a Trainee Test Document and Plan a Section

1. Creator/authorized issuer chooses a Template revision and a Trainee.
2. Backend creates a new Trainee Test Document with new document/section/question identities, a lineage record, and a snapshot of all relevant content and Answer Keys.
3. Qualifier opens the issued document and chooses one scope for each Section before the Trainee begins:
   - `ทั้งหมด` — all eligible Questions are required.
   - `กำหนดข้อ` — Qualifier selects explicit eligible Questions/subquestion codes.
   - `สุ่ม` — Qualifier selects a count; backend chooses from the eligible set once and persists the exact selection and seed.
4. The plan view shows candidate count, required count, selected identities, creator/Qualifier, and locked/unlocked state.
5. Once an answer exists in a section, changing its scope requires an impact modal and an explicit reset/change policy. Never silently recalculate random selection.

### 4.3 Qualifier: Assessment

1. View Trainee Answer and attachments read-only.
2. Passing, reverting, and requesting improvement are explicit assessment actions.
3. `needs_improvement` requires non-empty feedback before saving.
4. Changing an already passed assessment warns that qualification/progress may change.
5. Refresh authoritative status and restore focus after a successful assessment action.
6. For `needs_improvement`, show the prior feedback and answer submission context. Trainee resubmission returns the exact answer identity to `pending`; later work should retain answer/feedback history.

### 4.4 Section 200: Change to Subquestion Mapping

1. Creator selects or removes subquestion codes in the Question form.
2. Before save, backend calculates the impact of the proposed mapping change: Answer Keys, Trainee Answers, assessments, attachments, and progress entries affected by each removed code.
3. If nothing persisted is affected, save normally.
4. If existing trainee work is affected, show an impact modal and require the creator to select an explicit policy before saving.
5. Preserve a recoverable audit/archive record by default. Permanent deletion must be a separate, explicit, authorized action.

## 5. Modal Specification

### 5.1 Unsaved Changes Modal

**Trigger:** closing, navigating away, switching mode/section/question, or starting another editor while a draft is dirty.

**Content:** title, current Question/subquestion label, summary of changed fields, number of new attachments, and a clear statement that discard removes only local draft changes.

**Actions:**

- `บันทึกและไปต่อ` — save; only continue when save succeeds.
- `ทิ้งการแก้ไข` — discard draft and clean up only newly uploaded draft attachments.
- `อยู่หน้านี้` — close modal and restore focus to the editing control.

### 5.2 Section 200 Mapping Impact Modal

**Trigger:** removing or remapping a subquestion code that has persisted dependent data.

**Content:** affected codes, Question labels, counts of Answer Keys/Answers/assessments/attachments, and progress impact.

**Actions:**

- `กลับไปแก้ไขรายการ` — no data change.
- `บันทึกและเก็บรายการเดิมเป็นประวัติ` — recommended default where archival support exists.
- `ลบข้อมูลที่ได้รับผลกระทบ` — only if backend policy permits; require typed confirmation.

### 5.3 Delete One Answer Modal

**Trigger:** Trainee chooses Clear/Delete Answer for one Answer Box.

**Content:** Question/subquestion label, whether text and attachments will be deleted, and status/progress consequence.

**Actions:** `ลบคำตอบ`, `ยกเลิก`. Disable actions and show progress while deleting.

### 5.4 Clear Answers for Current Document Modal

**Trigger:** document-level Clear Answers command.

**Content:** active document number/title, scope (answers, progress, trainee attachments), explicit exclusion of Question/Answer Key/reference data, and an irreversible warning.

**Actions:** require the user to type the document number before enabling `ล้างคำตอบ`. Show result counts after completion.

### 5.5 Save Failure Modal

**Trigger:** a save/delete transaction fails.

**Content:** plain-language failure, whether the draft remains intact, technical detail available behind `คัดลอกรายละเอียด`, and the next safe action.

**Actions:** `ลองใหม่`, `แก้ไขต่อ`, `คัดลอกรายละเอียด`.

## 6. Technical Design Decisions

### 6.1 Draft and Dirty Tracking

- Introduce a shared `useUnsavedChanges` hook or draft-session abstraction.
- Compare normalized persisted snapshot and normalized draft. Include rich-text Markdown, metadata, selected subquestion codes, references, and attachment paths.
- Do not replace a dirty draft with a refresh from a parent component.
- Maintain a navigation guard at route/section/mode boundaries.

### 6.2 Tiptap Lifecycle and Focus

- Tiptap may be used in multiple components, but mount it only for active editable content when the number of fields can be large.
- Give every editor a stable identity and explicit accessible label, for example `คำตอบ ข้อ 201.2 ก` or `เฉลย ข้อ 101.3`.
- Extend the editor interface with a safe external-sync policy: sync only when clean, never overwrite a dirty document.
- Use a ref/callback to focus after mount and restore focus to the initiating control after save, cancel, or modal close.
- Preserve keyboard behavior: `Escape` requests discard only when dirty; `Ctrl/Cmd+S` saves the active draft; Tab order remains predictable.

### 6.3 Backend Transaction Boundary

- Add a typed command for Creator save that owns the transaction boundary.
- Validate Section 300 prohibition, Question ownership, valid Section 200 subquestion codes, and mapping impact in Rust.
- Commit Question changes, metadata, references, subquestion links, and Answer Key replacement in one transaction.
- Return authoritative Question/Answer Key state and impact summary to React.
- Do not swallow Answer Key save errors in the frontend.

### 6.3.1 Template Issue and Assessment-Plan Boundary

- Add Rust-owned commands for issuing a Template revision to one Trainee and for saving a Qualifier's Section Assessment Plan.
- Persist template lineage, instance owner, issue time, issue actor, and source revision.
- Generate new instance IDs; do not let trainee answers attach to Template question IDs.
- Validate that selected/random Questions and Section 200 subquestion codes exist in the issued document and are eligible.
- Persist the random seed, candidate set/version, and exact selected identities in the same transaction as the Section Assessment Plan.
- Lock or impact-check plan changes after work exists. Enforce this in Rust.

### 6.4 Attachment Lifecycle

- Mark uploaded but unsaved files as draft-owned.
- Remove draft-owned files only after explicit discard or a successful final save has reconciled them.
- Keep deletion of persisted attachments inside the relevant successful delete/update transaction where feasible.

### 6.5 Rendering and Hydration

- Consolidate Section 200 Answer Box rendering so every path receives the authoritative `traineeAnswer`, status, attachment list, and refresh callbacks.
- Avoid mounting answer editors for non-active answers.
- Use one canonical mapping function for `question_id + sub_question_code` to avoid visual order differing from persistent identity.

## 7. Implementation Todo List

### Phase 0 — Baseline and Design

- [x] Document current Section 100 and Section 200 save payloads and database rows. See [baseline](EDITOR_EDITING_WORKFLOW_BASELINE.md).
- [ ] Identify and consolidate all `TraineeAnswerBox` render paths. Paths are identified in the baseline; consolidation is Phase 3 implementation work.
- [x] Define the authoritative answer identity: `user_id + document_id + question_id + sub_question_code`.
- [x] Define normalized draft shapes for Question Form, Answer Key, Trainee Answer, and Qualifier Assessment.
- [x] Decide and document the retention policy for removed Section 200 subquestion mappings: block removal when Trainee work exists; Answer Key-only removal requires confirmation. Archive/recovery remains a future schema-backed enhancement.
- [ ] Decide and document template revision, Trainee Test Document issuance, section-plan lock, randomization audit, and answer-history policies.
- [x] Record acceptance examples for 100 single-key, 200 multi-key, attachments, needs-improvement, and passed states.

### Phase 1 — Modal Foundation and Draft State

- [ ] Create a reusable `WorkflowModal` supporting async actions, loading state, error display, optional typed confirmation, and focus restoration. **Foundation implemented:** async actions, per-action loading, inline error display, Escape handling, and focus restoration are available; typed confirmation remains pending.
- [ ] Retain `ConfirmModal` for simple confirmations or migrate each caller deliberately.
- [ ] Implement shared dirty-state tracking and draft snapshots.
- [x] Add Unsaved Changes modal to Trainee Answer editing (text/attachment draft, Cancel, Escape).
- [x] Add Unsaved Changes modal to Question/Answer Key editing (Question-form input/change draft guard).
- [x] Track Creator Description and Question Attachments as named draft areas; defer deletion of persisted files until save succeeds and remove newly uploaded files only when the draft is discarded. **Manual UI validation passed 2026-08-10:** the Modal listed every changed area and omitted unchanged areas as intended.
- [x] Add guard for competing Trainee Answer editors with synchronous lock conflict feedback; a clean editor can be switched automatically.
- [x] Add a global competing-form guard for Creator Question/Create/Insert forms: clean drafts switch immediately; dirty drafts offer Continue, Discard-and-switch, or transactional Save-and-switch in one modal.
- [x] Treat Answer Key Tiptap changes—including clearing the editor—as Creator Draft changes; normalize structurally empty rich text and show required/error state at the Answer Key box itself.
- [ ] Add keyboard support for Escape and Ctrl/Cmd+S. **Creator Question Form completed:** Escape opens the draft decision and Ctrl/Cmd+S saves using physical `KeyS`, independent of the active Thai/English keyboard layout; remaining editor surfaces are pending.

### Phase 2 — Safe Save Semantics

- [x] Add `isSaving` protection and accessible saving feedback to Question Form actions.
- [ ] Remove remaining specialized pre-save persistent side effects from React where they violate Cancel semantics.
- [x] Create the Rust transactional Creator-save command and typed DTOs.
- [x] Move Question references, subquestion-link sync, and Answer Key replacement into that transaction.
- [x] Return the saved Question identity and surface errors without closing the draft.
- [ ] Ensure trainee answer save/delete leaves a usable local draft after failure.

### Phase 3 — Section 200 Integrity

- [x] Add Rust validation that every selected subquestion code belongs to the permitted parent list.
- [x] Add backend impact analysis for proposed removed/remapped codes.
- [x] Build the Mapping Impact modal and connect its selected policy to the backend command.
- [ ] Implement archival/recovery behavior if selected as the product policy.
- [x] Make Answer Key ordering, labels, and Trainee Answer binding use the same canonical code ordering.
- [x] Consolidate hydration so existing trainee responses are consistently shown in all Section 200 views.

### Phase 3.5 — Template Issue and Qualifier Assessment Plan

- [x] Confirm the canonical product model: empty Application Template/Skeleton, permanent completed Sample/Source Document `22724201001`, and isolated Trainee Test Copies. Creator/Trainee/Qualifier visibility is a Developer/Simulation capability, not data embedded in the Skeleton.
- [x] Add a Template-scoped inventory of existing Simulation copies with real count, Trainee ID, created/latest activity time, answer/assessment/attachment/progress summary, reopen, managed-folder access, and confirmed deletion.
- [ ] Design schema/DTOs for Template lineage, Template revision, Trainee Test Document ownership, and Section Assessment Plan.
- [ ] Implement Rust transaction to issue one immutable Template snapshot to one Trainee. **In progress:** simulation clone foundation exists; media copy, revisioning, and real-user assignment remain.
- [ ] Implement Template-to-instance file/reference handling without cross-document deletion risk.
- [ ] Build Qualifier UI to set each Section to all, selected, or random scope before Trainee work starts.
- [ ] Persist selected Question IDs and Section 200 subquestion codes; persist random seed and candidate snapshot for random scope.
- [ ] Add an impact/reset workflow for changing a plan after a Trainee has started work.
- [ ] Ensure Trainee sees only the assigned plan, while Qualifier sees plan, answers, feedback, and history.
- [ ] Add answer/feedback history model for `needs_improvement` resubmission.
- [ ] Design a Trainee Portable Package that exports/imports one issued Test Copy, saved progress, assessment history, and managed attachments without restoring or replacing the destination system database.
- [ ] Define offline transfer identity, package version/conflict handling, integrity/signature, classification, Answer Key exposure, and multi-Qualifier audit policies before implementing Portable Import/Export.
- [ ] Build and verify a clean Release Seed process that retains Skeleton rules and sample `22724201001` while excluding SIM instances, mock identities/work, answers, assessments, progress, attachments, and sessions.

### Phase 4 — Editor Lifecycle, Focus, and Accessibility

- [ ] Add stable editor IDs and context-specific accessible labels to `TiptapEditor`.
- [ ] Add clean-only external content synchronization.
- [ ] Use mount-on-edit for long lists of Section 200 Answer Keys; evaluate accordion/single-active-editor presentation.
- [ ] Focus content on open; restore focus after save/cancel/delete/modal close.
- [ ] Verify mouse, keyboard, screen-reader labels, and dark-mode states.

### Phase 5 — Destructive Operations and Feedback

- [ ] Upgrade Delete One Answer modal with item/attachment/status impact.
- [ ] Upgrade Clear Answers modal with active-document identity, typed confirmation, and result summary.
- [ ] Ensure destructive actions are disabled during requests and cannot submit twice.
- [ ] Report recoverable errors with Retry and Copy Details actions.
- [ ] Confirm Clear Answers still excludes Question, Answer Key, references, and all other documents.

### Phase 6 — Tests and Documentation

- [ ] Add frontend tests for dirty/cancel/save/navigate behavior.
- [ ] Add frontend tests for modal actions, loading, failures, and focus restoration.
- [ ] Add Tiptap tests for accessible textbox labels and clean-only external sync.
- [ ] Add Section 100 integration tests: create, edit, cancel, save failure, delete answer.
- [ ] Add Section 200 integration tests: multiple selected codes, mapping changes, impact modal, ordering, and hydration.
- [ ] Add Rust tests for transaction rollback and Section 200 mapping policy.
- [ ] Add Rust tests proving document-scoped clear and single-answer delete isolation.
- [ ] Add integration tests proving a Template edit cannot change an issued Trainee Test Document.
- [ ] Add Rust and frontend tests for all/selected/random plans, deterministic persisted random selection, and plan-change locking.
- [ ] Update `docs/system_specifications.md` after product behavior and retention policy are finalized.

## 8. Acceptance Criteria

- [ ] A dirty Trainee Answer cannot be lost by Cancel, navigation, mode change, or starting another answer edit without an explicit choice.
- [ ] A dirty Question/Answer Key form cannot be lost without an explicit choice.
- [ ] Save success never appears when Question data saved but its Answer Keys did not.
- [ ] Section 200 cannot silently orphan or destroy dependent data when mappings change.
- [ ] Each visible Section 200 Answer Box displays and edits the correct persisted answer for its exact subquestion code.
- [ ] At most one Trainee Tiptap editor is active at a time; multiple Answer Key editors are mounted only intentionally and perform reliably.
- [ ] Focus lands on the rich-text editor after opening and returns to a meaningful initiating control after each completed flow.
- [ ] Modals perform their named workflow action and do not function as information-only alerts.
- [ ] Clear Answers remains limited to the active document's trainee-owned answer/progress/attachment data.
- [ ] Section 300 remains unable to save Answer Keys through both frontend and backend paths.
- [ ] Issuing a Template produces a distinct Trainee Test Document whose answers/progress cannot affect the Template or another Trainee's document.
- [ ] A Qualifier's all/selected/random section plan is reproducible, auditable, and does not change after refresh.

## 9. Verification Matrix

| Change area | Minimum verification |
|---|---|
| React workflow/modal/editor change | TypeScript, ESLint, focused Vitest tests, production build |
| Rust command/schema/policy change | targeted Rust tests, full Rust tests, rustfmt, Clippy |
| Shared IPC/document workflow change | all frontend and Rust checks from `AGENTS.md` |

## 10. Implementation Order Recommendation

1. Draft/dirty state and Unsaved Changes modal.
2. Transactional Creator save and honest failure behavior.
3. Section 200 mapping impact policy and UI.
4. Consolidated Answer Box hydration/rendering.
5. Focus/accessibility refinement and destructive-operation workflow.
6. Full regression coverage and system specification update.

This order resolves accidental data loss and partial-save risks before visual refinement or broader editor expansion.
