# Editor Editing Workflow — Phase 0 Baseline

**Status:** Completed baseline; Phase 3 interim retention policy selected

**Created:** 2026-08-07
**Related plan:** [EDITOR_EDITING_WORKFLOW_UX_PLAN.md](EDITOR_EDITING_WORKFLOW_UX_PLAN.md)

## Purpose

This document records the current authoritative implementation before workflow changes begin. It is the baseline for regression tests and for reviewing every later phase.

## Product Context Added After Baseline Review

The document being authored is a **Template Document**. It is not the document a Trainee performs directly.

```text
Template Document (Creator owns structure and Answer Keys)
        │ copy/snapshot for one trainee
        ▼
Trainee Test Document (one immutable lineage to one template revision)
        │ Qualifier configures the actual assessment scope per section
        ▼
Section Assessment Plan (all / selected / randomly selected questions)
        │
        ▼
Trainee Answer → Qualifier assessment → progress / qualification outcome
```

Consequences for this plan:

- Template edits must never silently change a Trainee Test Document that has already been issued.
- Trainee Answers, feedback, assessments, attachments, randomized selections, and progress belong to the Trainee Test Document, not the Template Document.
- Qualifier configuration is an execution plan for a specific Trainee Test Document and must not modify the Template or another trainee's copy.
- The future answer identity needs a document-instance boundary. The existing `document_id` component provides this only after every issued test is a distinct document instance.

**Implementation status (2026-08-07):** a persistent simulation clone command and `DocumentSimulationInstances` lineage table are now being introduced for UX testing. Per-section assessment-plan/randomization, real-user assignment, template revisioning, answer-history, and managed-media copy remain pending. Current role simulation is retained, but Trainee/Qualifier views are now intended to run only on a simulation copy.

## Authoritative Identity

One Trainee Answer is identified by the composite key:

```text
user_id + question_id + document_id + sub_question_code
```

`sub_question_code` is an empty string for a normal single-answer Question. For Section 200 per-subquestion answers, it is the selected occupation subquestion code.

The database enforces uniqueness for this identity in `UserAnswers`.

## Persistent Data Model

| Concern | Table / source of truth | Key relationship |
|---|---|---|
| Question | `Questions` | Question ID is the parent of links and answer keys. |
| Selected Section 200 subquestions | `QuestionSubQuestionLinks` | Unique by `question_id + sub_question_code`. It is synchronized from `Questions.metadata.selectedSubQuestions`. |
| Answer Key | `QuestionAnswerKeys` | Unique by `question_id + sub_question_code`. |
| Trainee Answer / assessment | `UserAnswers` | Unique by the authoritative answer identity above. |
| Attachments | `UserAnswers.attachments` plus managed filesystem | Paths are stored as JSON and are document-scoped in managed storage. |
| Progress | `UserProgress` | Recalculated after assessment or answer deletion where current commands invoke recalculation. |
| Template/test-document lineage | Not implemented yet | Required before issuing a template as an individual Trainee Test Document. |
| Qualifier section assessment plan | Not implemented yet | Required for all/selected/random section control. |

Important database protection: `UserAnswers(question_id, sub_question_code)` has a foreign key to `QuestionAnswerKeys(question_id, sub_question_code)` with `ON DELETE CASCADE`.

Therefore, replacing/removing an Answer Key can delete its matching Trainee Answer. Any future mapping or Answer Key change must calculate and show that impact before committing.

## Current Command Flows

### Creator Question Save

Current React flow in `QuestionFormCard`:

1. Validate Question content, visible Answer Key fields, and references.
2. Call existing Question create/update callback.
3. Call `replace_question_answer_keys` afterward.
4. For Section 200, `selectedSubQuestions` in metadata is synchronized by the Question create/update backend code into `QuestionSubQuestionLinks`.

Current limitation: Question save and Answer Key replacement are separate operations. `persistAnswerKeys` catches and logs Answer Key errors rather than returning a failure to the form. This can leave a partial save and must be replaced by the Phase 2 transactional command.

### Answer Key Replace

`replace_question_answer_keys` starts its own transaction, deletes all Answer Keys for the Question, then inserts the supplied non-empty entries. The database cascade described above can remove corresponding Trainee Answers during that delete.

This is safe only when the request has already confirmed the intended impact. The current UI does not yet do this.

### Trainee Save

Current flow in `TraineeAnswerBox`:

1. Tiptap text and attachment paths remain in local component state.
2. `save_trainee_answer` first creates an empty Answer Key placeholder if none exists.
3. It upserts `UserAnswers`, resets status to `pending`, and updates the timestamp.
4. Frontend replaces its local snapshot and closes the active editor after success.

The placeholder behavior prevents an answer from violating the foreign key, but means Answer Key lifecycle has direct effects on persisted Trainee Answers.

### Qualifier Assessment

`save_qualifier_assessment` upserts status, feedback, qualifier identity, and timestamps against the same answer identity. It recalculates section progress after save.

The current `needs_improvement` feedback is the appropriate interaction baseline for the requested “ปรับปรุงคำตอบใหม่” flow. The target behavior is: Qualifier records required improvements, the Trainee revises the answer in that trainee's own test document, saves it, and its status returns to `pending` for re-review. The original answer should remain available in audit history once versioning is introduced; the current schema stores only the latest answer text.

### Delete and Clear

- `delete_trainee_answer` targets one authoritative answer identity, deletes its stored attachment files, deletes the row, then recalculates progress.
- `clear_document_trainee_answers` deletes `UserAnswers` and `UserProgress` only for one document ID, then removes that document's trainee-attachment directory.
- Neither action is permitted to affect Questions, Answer Keys, or another document.

## Current Rich-Text Editor Lifecycle

- `TiptapEditor` uses `initialContent` at editor creation and destroys the editor at unmount.
- `TraineeAnswerBox` mounts Tiptap only while that Answer Box is in edit state.
- `useEditorLock` allows only one active Trainee Answer Box at a time.
- `QuestionFormCard` can mount one Answer Key editor per currently selected subquestion. This is functionally possible, but a long Section 200 list should move to an accordion or one-active-editor UI in Phase 4.
- The current Tiptap textbox uses the placeholder as its accessibility label. Phase 4 must replace this with contextual labels that include Question/Subquestion identity.

**Phase 1 progress:** Trainee Answer editing now tracks text and attachment drafts. Cancel and Escape ask for confirmation when the draft is dirty; discarding removes only newly added attachment files and restores the persisted snapshot. A synchronous editor lock now rejects a rapid attempt to open a second answer while another answer is active, while allowing a clean editor to be switched automatically. The active lock callback is refreshed as the draft changes, preventing stale-clean state and duplicate conflict modals.

Question/Answer Key forms now use a form-level draft guard for user input/change events. Cancel and Escape no longer clear an Answer Key before confirmation; a dirty form presents an action Modal and a clean form closes immediately.

**Manual validation result:** Section 100 and Section 200 Creator draft/cancel/Escape workflows passed. The next risk boundary is transactional persistence: Question metadata and Answer Keys must succeed or fail together.

**Phase 2 implementation:** normal Creator create/update now calls one Rust/SQLite transaction for the Question, `QuestionSubQuestionLinks`, `QuestionReferences`, and `QuestionAnswerKeys`. A failed child write rolls back the entire save and the React form retains its draft. Duplicate submission is disabled while saving. Specialized Section 300/background-save and score-sync paths remain follow-up work.

**Manual validation result:** transactional Creator save passed for Section 100 and Section 200, including multiple Answer Keys, reference add/remove, and remapping a selected subquestion from ข. to ค. Toolbar controls now prevent pointer focus from stealing the current Tiptap selection before formatting commands execute; this addresses the intermittent first-edit color/formatting failure observed during validation.

## Current Rendering Paths

| Path | Hydrates existing `traineeAnswer` | Refreshes after save | Baseline finding |
|---|---:|---:|---|
| `QuestionMetadataDisplay` | Yes | Yes | Preferred behavior to preserve. |
| `PqsSectionPreview200` | No in its direct `TraineeAnswerBox` calls | No callback supplied | Must be consolidated or supplied with the same authoritative data in Phase 3. |

## Draft Shapes for Phase 1

All draft comparisons must normalize empty/null values, sort order-insensitive IDs, and avoid treating formatting-only transport differences as a user change.

### Creator Question Draft

```text
content
description
metadata (including requirement toggles and selected subquestion codes)
references (reference ID + page)
answerKeys (sub_question_code -> Markdown)
questionAttachments (relative paths)
score/type/display fields where that form exposes them
```

### Trainee Answer Draft

```text
authoritative answer identity
answer_text (Markdown)
attachments (relative paths)
persisted status and feedback snapshot
```

### Qualifier Assessment Draft

```text
authoritative answer identity
target status
feedback
```

## Baseline Acceptance Examples

### Section 100

1. Create Question 101.x with one Answer Key.
2. Trainee submits one Markdown answer.
3. Qualifier marks it `needs_improvement` with feedback.
4. Trainee changes the answer and saves; status becomes `pending`.
5. Deleting that answer removes only its text/attachments and recalculates progress.

### Section 200

1. A parent list exposes codes A, B, C; a child Question selects A and C.
2. The child Question has Answer Keys and Trainee Answers independently keyed as `(question, A)` and `(question, C)`.
3. The UI displays the label/order based on the parent list, but persistence always uses the code.
4. Removing C must show any dependent Answer Key, Trainee Answer, assessment, attachment, and progress impact before persistence.

### Tiptap and Interaction

1. Starting one Trainee answer edit focuses its rich-text textbox and locks other answer boxes.
2. Saving, cancelling, deleting, or dismissing a workflow modal returns focus to a meaningful control.
3. A dirty draft cannot be discarded by navigation or Escape without the Phase 1 confirmation action.

## Phase 3 Retention Policy Decision

When a creator removes a Section 200 subquestion code with dependent Trainee work, choose one policy:

| Option | Behavior | Trade-off |
|---|---|---|
| **A. Block removal** | Do not allow the mapping change until all dependent answers are resolved manually. | Safest and simplest; can slow structural corrections. |
| **B. Archive dependents (recommended)** | Remove the active mapping but preserve Answer Keys, answers, assessments, and attachments in an auditable inactive/archive record. | Best recoverability; requires new schema/UX. |
| **C. Permanent deletion** | Delete dependent data after explicit typed confirmation. | Simplest data model; irreversible and highest operational risk. |

**Selected for the current phase:** Option A (Block removal) whenever Trainee work exists. Removing a code that has only an Answer Key requires explicit Creator confirmation. Option B remains the intended future enhancement after an auditable archive/recovery schema and UX are designed. Permanent deletion is not available as the normal editing workflow.

## New Product Decisions Required Before Issuing Trainee Documents

These decisions are not needed to complete the current authoring UX test, but they are required before building the Template → Trainee Test Document workflow:

1. **Template revision policy:** recommended: issuing creates an immutable snapshot with a stored template ID and revision; later Template edits apply only to future issues.
2. **Qualifier scope timing:** recommended: Qualifier configures Section scope after issue but before Trainee starts; lock the plan once the first answer in that section exists, with an explicit reset/change workflow.
3. **Random selection policy:** recommended: persist the seed, candidate set, selected Question IDs/codes, selector identity, and timestamp. Never recalculate a random selection on page refresh.
4. **Improvement history:** recommended: retain each submitted answer version and qualifier feedback event for the Trainee Test Document. At minimum, preserve the immediately prior answer when a response is returned for improvement.

## Evidence Locations

- `src-tauri/src/content_database/schema.rs` — composite answer identity and foreign key structure.
- `src-tauri/src/content_database/answers.rs` — answer, assessment, delete, clear, and Answer Key commands.
- `src-tauri/src/content_database/questions.rs` — Question persistence and Section 200 link synchronization.
- `src/components/editor_v2/QuestionFormCard.tsx` — current Creator save ordering.
- `src/components/editor_v2/TraineeAnswerBox.tsx` — current Trainee state, lock, and save flow.
- `src/components/editor_v2/QuestionMetadataDisplay.tsx` and `src/components/editor_v2/PqsSectionPreview200.tsx` — answer rendering/hydration paths.
# Simulation identifier policy (confirmed)

The template keeps its normal document identifier (for example, `22724201001`). A trainee simulation copy uses a separate, template-scoped identifier, for example `22724201001-SIM-001`. The `SIM` suffix is not part of the unit document running number. Its counter only advances and is not reused after a simulation is deleted. Admin may later map the simulation to a named trainee; qualifier identity policy remains a future anti-bias decision.
