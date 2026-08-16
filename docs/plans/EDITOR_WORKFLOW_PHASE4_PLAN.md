# Editor Workflow Phase 4 — Lifecycle, Focus, and Accessibility

**Status:** Phase 4 complete — Batches 4.1–4.4 passed automated checks and Desktop App Manual Gates

**Created:** 2026-08-10
**Scope:** React editor lifecycle, keyboard workflow, focus management, modal accessibility, and targeted performance. This phase does not alter schemas, Rust/SQLite policy, document content, simulation data, or Print Layout.

Intermediate `awaiting Manual Gate` notes below preserve the chronological findings from each slice; the Phase 4 checkpoint at the end of this document supersedes those temporary statuses.

## Guardrails

- Preserve the validated Phase 1–3 draft/save/mapping workflows and their existing manual gates.
- Keep `22724201001` as the permanent Sample/Source Document. Application Template/Skeleton, Simulation copies, and Trainee Test Copies remain distinct concepts.
- Keep role/view simulation in `ActiveDocumentPage`.
- Do not overwrite a dirty Tiptap draft during synchronization or reduce mounted editors by losing draft/selection state.
- Do not change `content.db` or user-authored documents while implementing or verifying this phase.

## Findings from Code

1. `TiptapEditor` creates an editor from `initialContent`, focuses it after mount when `autoFocus` is enabled, and destroys it on unmount. It has no stable DOM ID, contextual accessible label, or clean-only external-content synchronization contract.
2. `TraineeAnswerBox` mounts a Tiptap editor only in its active edit state and uses the document-level editor lock, so its mount count is already bounded to one active Trainee Answer Box. It does not yet explicitly restore focus to the initiating answer action after save/cancel/discard.
3. `QuestionFormCard` renders one `AnswerKeyEditor` for every selected Section 200 code. Each therefore creates a Tiptap instance; a long selected list is the principal simultaneous-mount performance risk.
4. `WorkflowModal` has `role="dialog"`, `aria-modal`, labelled title/description, moves focus to its first action, restores the previously focused element, and handles Escape. It does not trap Tab/Shift+Tab; the backdrop is also a focusable button in the tab sequence.
5. Creator Form Escape and physical `Ctrl/Cmd+KeyS` are implemented. Trainee edit currently supports Escape but has no corresponding save shortcut. Toolbar controls use real buttons with labels, but rich-text textbox labels are generic placeholders rather than question-specific names.
6. Command buttons are not yet a coherent system: the editor/modal/UI scope contains 129 raw `<button>` usages and 39 shared `<Button>` usages. The shared `Button` explicitly removes every focus ring, does not forward a ref for focus restoration, and has no accessible loading/busy contract. The Question Form Save button uses this shared component but does not visually or semantically reflect `isDraftDirty`.

## UX Proposals

- A newly opened rich-text edit surface receives focus after it mounts. In a Creator form, focus begins at the first editable required field; the active Answer Key receives focus only when the user explicitly opens/selects it.
- Every completed close path restores focus to its origin: the Question tree command for Creator, the answer card/action for Trainee, and the invoking control for a Modal. If that element was removed, use a safe nearby fallback rather than a stale detached node.
- Modals keep Tab and Shift+Tab inside the dialog, announce their title/description, and return focus only after their close action has completed.
- A Section 200 Answer Key list uses a single active editor (accordion/disclosure pattern). Inactive rows remain visible with clear status/error/dirty information, but do not mount Tiptap.
- Save success, validation failure, and important draft-state changes use non-colour text plus a polite/assertive live announcement. Existing visual styling remains intact.
- Refactor the shared Button foundation before broad migration: preserve native Enter/Space behavior, forward refs, provide a consistent restrained focus indicator, expose loading/busy state, and keep labels meaningful. Migrate only the Phase 4 workflow controls first; audit the remaining raw buttons separately rather than changing all call sites at once.

## Implementation Batches and Manual Gates

### Batch 4.1 — Accessible Tiptap contract and clean synchronization

- [x] Add explicit stable `editorId`, `ariaLabel`, and controlled external-content synchronization semantics to `TiptapEditor`.
- [x] Sync external content only when a caller supplies a newer authoritative snapshot version and declares its draft clean; otherwise preserve the local draft and selection.
- [x] Update Creator and Trainee call sites with contextual Thai labels including Question/Subquestion identity.
- [x] Add focused Tiptap tests for textbox identity and clean-versus-dirty synchronization. Existing unmount cleanup remains covered by the component lifecycle implementation.

**Automated verification (2026-08-10):** focused Tiptap, Question Form, and Trainee Answer tests: 36 passed; TypeScript, scoped ESLint, and production build passed.

**Manual verification (2026-08-10):** passed in the Desktop App. Creator Section 100 and Section 200 Answer Key editors expose their contextual answer-key names. Trainee Simulation Section 100 exposes `คำตอบ ข้อ 101.1`; Section 200 exposes the exact Question/subquestion identity (`คำตอบ ข้อ 201.2.1.ก. คำถามย่อย ก`). All inspected surfaces reported `role=textbox`, focusable/focused, `Editable=richtext`, and `Read-only=false`.

**Manual gate:** open a Section 100 Creator answer key and a Section 200 subquestion answer key; inspect each with a screen reader or browser accessibility tree. Confirm that the textbox name identifies its Question/Subquestion. Type text, trigger a parent refresh/change, and confirm the local draft and selection remain intact.

### Batch 4.2 — Modal focus trap and focus restoration

- [x] Add reusable focus-trap behavior to `WorkflowModal`; remove the backdrop from the keyboard tab order while retaining pointer close behavior.
- [x] Define initial-focus and restore-focus precedence for action Modals, including asynchronous actions and detached trigger fallbacks.
- [x] Add tests for initial focus, Tab, Shift+Tab, Escape, and restoration. Action-completion behavior remains covered by existing workflow integrations and is part of the Manual Gate.

**Automated verification (2026-08-10):** `WorkflowModal` focus tests: 3 passed, including recovery when WebView focus moves outside the dialog and Escape ownership ahead of the parent Draft Guard. Initial focus now runs during layout and every focused Modal control has an explicit visible ring, including pointer-opened dialogs. Focused Modal and Question Form tests: 32 passed; TypeScript, scoped ESLint, and production build passed.

**Manual verification (2026-08-10):** passed after Desktop restart. Initial focus is visible on `แก้ไขต่อ`; Tab and Shift+Tab remain inside the Modal; Escape closes according to the Modal rule. The white focus ring was judged visually too heavy and will be reduced as part of the shared Button/focus treatment in Batch 4.3.

**Manual gate:** open Unsaved Changes and Mapping Impact dialogs. Verify focus enters the dialog, Tab/Shift+Tab never reaches page controls, Escape follows the existing safe close rule, and close/continue returns focus to the editing control that invoked the dialog.

### Batch 4.3 — Creator/Trainee lifecycle and keyboard completion

- [x] Refactor the shared Button foundation first: `forwardRef`, restrained and consistent focus treatment, accessible loading/busy semantics, and regression tests. Do not mass-migrate unrelated raw buttons in this batch.
- [x] Connect Question Form Save presentation and accessible description to its clean/dirty/saving state without changing the validated save policy.
- [x] Record invoking elements before Creator/Trainee edit begins; restore focus after save, clean cancel, discard, and successful delete/assessment actions.
- Complete shortcut handling only where it is non-conflicting: Escape follows Draft Guard; physical `Ctrl/Cmd+KeyS` saves the active draft only when focus is not inside a Tiptap shortcut/interaction that must own the event.
- Ensure action buttons retain native Enter/Space behavior and have meaningful names/state text.
- Add live regions and linked validation/error summaries without relying only on amber/red visual state.

**Button-foundation scope note (2026-08-10):** this first slice adds the required contract to the shared `Button`, applies the same restrained focus treatment to `WorkflowModal`, and connects the Section 100/200 Question Form Save command to clean/dirty/saving state. It intentionally does not replace every raw `<button>` in the project; remaining command buttons will be audited and migrated by workflow as their lifecycle behavior is implemented and manually proven.

**Automated verification (2026-08-10):** focused `Button`, `WorkflowModal`, and Question Form suites: 37 passed. TypeScript, scoped ESLint, and production build passed. The build reported only the existing dynamic-import and large-chunk warnings.

**Manual verification (2026-08-10):** passed in the Desktop App. The Question Form Save command distinguishes clean and dirty state, the restrained focus indicator is visible, Modal initial focus and forward/reverse trapping work, Escape restores focus to the invoking Cancel command, and native Enter/Space activation works. The test draft was discarded without saving document data.

**Manual gate for the Button-foundation slice:** passed. Verified the clean/dirty Save label and emphasis, the thinner focus indicator, Modal initial focus/trapping/Escape behavior, focus restoration to the invoking Cancel command, and Enter/Space command activation.

**Creator/Trainee focus-return slice (2026-08-10):** implemented and manually validated. Creator Question commands now have stable IDs and meaningful names so Save/Cancel/Discard can focus the newly rendered command rather than a detached Menu item. Trainee Answer view now exposes an explicit native `ตอบคำถาม`/`แก้ไขคำตอบ` command and restores focus to it after Save, clean Cancel, or confirmed Discard. The Trainee discard guard now uses the validated `WorkflowModal` focus contract. Delete and Qualifier assessment paths were intentionally handled in the following slice.

**Automated verification (2026-08-10):** focused Creator focus-return, Question action, Trainee Answer lifecycle, and Workflow Modal suites: 25 passed. TypeScript, scoped ESLint, and production build passed. The build reported only the existing dynamic-import and large-chunk warnings.

**Manual verification (2026-08-10):** passed in the Desktop App for both Section 100 and Section 200. Creator Question edit returns focus to the correct remounted Question action command after the tested close paths. Trainee Answer commands open through keyboard activation and regain focus after clean Cancel and confirmed Discard; the dirty-answer Modal retains the validated initial-focus, trap, Escape, and restoration behavior.

**Delete/Qualifier focus slice (2026-08-10):** implemented and awaiting Manual Gate. Creator Question Delete and Trainee `ล้างคำตอบ` now use the validated `WorkflowModal` contract. Cancelling returns to the originating command; successful Question deletion selects the nearest surviving sibling, parent, or empty-section Add command, while successful answer clearing returns to `ตอบคำถาม`. Qualifier assessment now has stable open/close commands, moves focus into a manually opened panel, restores focus after close or successful assessment save, and retains a reachable `เปิดการประเมิน` command after reverting to `pending`.

**Automated verification (2026-08-10):** focused Creator Delete, Trainee clear-answer, Qualifier lifecycle, Question action, and Workflow Modal suites: 30 passed. TypeScript, scoped ESLint, and production build passed. The build reported only the existing dynamic-import and large-chunk warnings.

**Manual finding and Qualifier rework (2026-08-10):** the first Qualifier gate did not pass. `ปิดการประเมิน` looked like plain text rather than a command, while the raw `ยกเลิกผ่าน` control displayed the WebView's thick white focus outline. The entire Qualifier command group was therefore migrated to the shared `Button` contract: green `ผ่าน`, red `ปรับปรุง`, amber `ยกเลิกผ่าน`, and an outlined `ปิดการประเมิน` with an X icon. `ปรับปรุง` is hidden while the answer is already passed, reducing an unavailable and confusing branch. All commands now share the restrained blue focus indicator and action-specific loading state. Focused Button, Qualifier, Creator Delete, and Workflow Modal suites: 19 passed; TypeScript, scoped ESLint, and production build passed. Manual retest remains required.

**Qualifier visual calibration (2026-08-10):** the first shared-Button rendering made the green/red/amber commands too visually dominant compared with the established Trainee controls, while the Close outline remained too faint. The semantic commands were returned to their earlier light/outline treatment (with a filled rose state only after `ปรับปรุง` is selected). `ปิดการประเมิน` now uses a stronger slate border, subtle surface, shadow, and X icon. The shared thin blue focus indicator and lifecycle behavior remain unchanged. Focused suites: 19 passed; TypeScript, scoped ESLint, and production build passed. Manual Qualifier visual/focus retest remains required.

**Qualifier typography and inline Tab boundary (2026-08-11):** manual review accepted the revised button treatment but found the `เปิดการประเมิน` typography inconsistent and reported focus leaving the active assessment. Code inspection confirmed a Tailwind conflict between shared `size="small"` (`text-sm`) and local `text-[10px]`/`text-xs`; Qualifier sizes and weights are now explicit important utilities matching the compact Trainee treatment. The assessment is now exposed as a named accessibility region. It remains an inline form rather than a Modal: Tab intentionally leaves after the last enabled control and is not trapped. Focused suites: 16 passed; TypeScript, scoped ESLint, and production build passed. A complete Qualifier UX manual pass remains required.

**Qualifier UX Full Pass (2026-08-11):** implemented and awaiting Manual Gate. Escape now closes the inline assessment from any control and restores focus to the assessment trigger. Selecting `ปรับปรุง` moves focus directly to the linked Feedback textbox. Empty or unchanged Feedback produces an inline, screen-reader-linked validation message and returns focus to that textbox without calling persistent save; its Save command remains keyboard reachable with `aria-disabled` and a visible unavailable state so keyboard users can discover the reason. Assessment save, validation, close, and status changes have live announcements, and only the command performing the active save displays the loading label. Added integration coverage for Escape restoration, linked Feedback validation, action-specific busy state, and saved-status announcements. Focused Qualifier and Workflow Modal suites: 15 passed; TypeScript, scoped ESLint, and production build passed. The build reported only the existing dynamic-import and large-chunk warnings.

**Qualifier improvement reversal correction (2026-08-11):** manual review found that a saved `needs_improvement` assessment had no explicit path back to `pending`. It also exposed a draft-state defect: selecting `ปรับปรุง` and closing before save could leave the local status selected and remove the stable reopen command. The component now tracks the saved assessment status separately from the open-panel draft. Close/Escape restores the saved status and feedback, while a saved improvement exposes `ยกเลิกการปรับปรุง` with a confirmation Modal that explains Feedback removal and Progress recalculation. Confirming persists `pending` through the existing authoritative assessment command, clears Qualifier Feedback, preserves the Trainee answer and attachments, and restores focus to `เปิดการประเมิน`. Qualifier and Workflow Modal suites: 17 passed; TypeScript, scoped ESLint, and production build passed. No schema or Rust code changed.

**Qualifier post-save refresh correction (2026-08-11):** Manual Gate A passed, but Gate B showed the pending assessment panel reopening after `ยกเลิกการปรับปรุง`. The save path closed it correctly; the subsequent authoritative answer refresh re-ran prop synchronization and treated every incoming `pending` value as a request to open. Panel visibility no longer derives from incoming assessment refreshes. The reversal regression test now rerenders the component with the refreshed `pending` answer and verifies that only `เปิดการประเมิน` remains focused. Focused Qualifier and Workflow Modal suites remain 17 passed; Gate B requires manual retest.

**Qualifier collapsed initial state (2026-08-11):** manual inspection then showed that the first entry into Qualifier view still auto-opened every pending assessment. This was inconsistent with explicit command ownership and would multiply Tab stops in Section 200. Every assessment now initializes closed: `pending` exposes only `เปิดการประเมิน`, `passed` exposes `แก้ไขการประเมิน`, and `needs_improvement` exposes its saved Feedback with `แก้ไขคำแนะนำ`. The inline region mounts only after explicit activation. Entering or leaving Qualifier mode also closes any open assessment and restores the authoritative saved status/Feedback so an unsaved panel draft cannot leak across modes. Lifecycle integration tests now verify both the initial collapsed state and a Trainee-to-Qualifier return before testing focus entry/restoration. Focused Qualifier and Workflow Modal suites: 18 passed; the initial-state and Gate B behavior require manual retest.

**Trainee answer-card layout prototype (2026-08-11):** manual review found duplicated empty-answer guidance and a right-side, non-shrinking metadata/action column that reduced the width of every line in a long answer. Empty cards now show one `ยังไม่มีคำตอบ` message and one `ตอบคำถาม` command. Answered cards place Status and Timestamp in the left-aligned header inside the card and render rich-text content at full width below it. The first visual pass placed the edit command in a separate bottom-right footer, but review showed excessive empty space and weak association; `แก้ไขคำตอบ` now sits at the right edge of the header, matching the empty-state command without constraining the separate content row. Added regression coverage for the single empty state and full-width content/header-action separation. Trainee Answer integration suite: 16 passed; revised visual review in Section 100 and Section 200 remains required.

**Qualifier answer-header refinement (2026-08-11):** visual review accepted the full-width answer layout and requested the same compact command ownership in Qualifier. Closed `pending` and `passed` assessment triggers now occupy the answer header's right edge rather than a separate bottom row; the open assessment region remains below the answer. Its label/command header and command group now wrap at narrow widths without changing DOM/Tab order. Timestamp typography now matches the compact status text size/weight with brighter slate contrast; the hover title was removed while the non-visual `อัปเดตล่าสุด <time>` accessible label remains. Focused Trainee/Qualifier tests cover header command placement, responsive wrap classes, timestamp semantics, and the existing focus lifecycle; manual visual review remains required.

**Trainee answer command ownership (2026-08-11):** manual review found four apparent ways to start the same edit: the saved answer card, answer text, `รอการแก้ไข`/`ปรับปรุง` status badges, and the explicit `แก้ไขคำตอบ` command. The card is now display content rather than a large implicit command: it has no click handler, pointer cursor, interactive hover border, or hover shadow. Trainee `needs_improvement` renders one non-interactive rose `รอการแก้ไข` badge; the rose family intentionally matches Qualifier feedback/action-required meaning rather than the orange document-exemption meaning of `ไม่ต้องอธิบาย`. The native `ตอบคำถาม`/`แก้ไขคำตอบ` button is the sole edit entry point, preserving explicit keyboard semantics and allowing answer text selection without accidental editing.

**Manual gate:** test mouse and keyboard for Creator Section 100, Creator Section 200, and one Trainee Answer: open, type, save, cancel clean, cancel dirty/discard, Escape, and Ctrl+S with Thai layout. Confirm focus location and announcement after each outcome.

### Batch 4.4 — Section 200 mount-on-edit performance

- [x] Replace simultaneous Section 200 Answer Key mounts with one active editor while retaining every row's draft, validation, labels, and ordering.
- [x] Measure/render-test a long selected-code list; changing the active row must unmount only its clean editor and preserve all unsaved values in React draft state.
- [x] Explicitly test the existing selection/color behavior after active-editor switches.

**Implementation note (2026-08-12):** a multi-code Section 200 Answer Key list now mounts Tiptap only for its active row. Inactive rows render their formatted draft as a non-editable preview with an explicit `แก้ไขเฉลย` command. Opening a row moves focus into that row's editor; initial form open does not steal focus. Save ordering follows the canonical parent subquestion order, and validation activates/focuses the first required Answer Key that is still empty.

**Automated verification (2026-08-12):** focused Answer Key, Question Form, and Tiptap lifecycle tests: 39 passed. The suite covers a 12-code list with one mounted editor, draft preservation and canonical save order across row switches, first-missing validation activation, formatted inactive previews, and colour selection ownership after the active editor changes. TypeScript, full `src` ESLint, and the production build also passed.

**Manual workflow verification (2026-08-13):** passed all five Desktop App checks: one mounted Answer Key textbox, switching among multiple drafts, first-missing validation activation, save/reopen persistence, and text-format/colour retention.

**UX refinement after manual review (2026-08-13):** the generic validation confirmation was misleading because `ยกเลิก` and `ยืนยัน` performed the same acknowledgement. Question Form validation now uses the accessible Phase 4 `WorkflowModal` contract with the title `ยังบันทึกไม่ได้` and clearer pre-save correction text. For a multi-code Section 200 Question, the Modal lists every empty Answer Key in canonical order with its Sub-question text, and its single amber warning action names the first destination (for example `ไปที่เฉลย ข.`). The Modal retains focus while open and moves focus to that Answer Key only after dismissal. The active Answer Key's Sub-question context is also rendered with stronger light/dark contrast while inactive contexts remain secondary. Focused lifecycle suites now pass 47 tests.

**Manual UX refinement verification (2026-08-13):** passed every Desktop App step. The Modal identifies each missing Answer Key and its Sub-question, exposes one unambiguous amber correction command, traps focus until dismissal, then focuses the intended Answer Key editor. The active Sub-question context is visibly easier to read. Batch 4.4 is accepted; no additional UI retest is required for this batch.

**Manual gate:** use a Section 200 Question with multiple selected codes. Enter distinct draft text in several Answer Keys, switch among rows, change text colour in the active editor, save, reopen, and verify exact text/code/order. Confirm only one rich-text textbox/editor is mounted at a time.

## Deferred from this Phase

- Template revisioning, issued Trainee Test Copy ownership, Qualifier plans, portability, and release seed cleanup (Phase 3.5).
- Typed confirmation/destructive-operation upgrades (Phase 5).
- Reliable A4 pagination.
- Rust/SQLite schema or permanent policy changes, unless a later code finding proves one is essential and is first approved with its impact.

## Verification

Each batch: TypeScript, ESLint, affected Vitest tests, and production build. Run the full frontend and Rust checkpoint matrix only after the user accepts the completed Phase 4 checkpoint or if scope expands into shared/Rust behavior.

**Phase 4 checkpoint (2026-08-13):** all four batches passed their Desktop App Manual Gates. The full checkpoint passed TypeScript, full `src` ESLint with zero warnings, 269 frontend tests across 36 files, production build, 114 Rust tests, Rustfmt check, and Clippy with warnings denied. No Rust/SQLite schema or persistent-data rule changed in Phase 4, and no real `content.db` data was modified.
