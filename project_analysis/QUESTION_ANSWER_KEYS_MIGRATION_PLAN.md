# QuestionAnswerKeys Migration and Cleanup Plan

## Objective
Make `QuestionAnswerKeys` the single authoritative source for answer key content across create, save, display, trainee matching, and counting flows.

## Current Findings
- `editor_v2` save path already writes answer keys to `QuestionAnswerKeys` via `update_answer_key`.
- Several display and legacy UI paths still read `metadata.answerKey` and `metadata.answerKeys`.
- Counting and dev metrics partially use relational data but still include transitional metadata fallbacks.
- Multi-part save currently upserts selected keys but does not fully reconcile removed sub-question codes.
- Empty answer key edits can leave stale rows in `QuestionAnswerKeys`.

## Implementation Plan

### Phase 1: Correctness
1. Make backend answer-key writes idempotent and reconcilable.
   - Delete row when answer key text becomes empty.
   - Add API to replace all answer keys for a question in one transaction.
   - Preserve `order_index` consistently for multi-part keys.

2. Move `editor_v2` display to relational reads.
   - Stop rendering answer keys from `metadata.answerKey` / `metadata.answerKeys`.
   - Load keys through `get_question_answer_keys`.
   - Keep metadata only for config such as `image`, `requireAnswerKey`, `selectedSubQuestions`, `selectedBranch`.

3. Remove dual-source conditional logic.
   - Replace `metaHasAnswerKeys` checks with relational existence checks where needed.
   - Ensure answer-box visibility is based on question config and fetched answer-key rows.

### Phase 2: Legacy Cleanup
4. Audit older UI components outside `editor_v2`.
   - `QuestionRenderer.tsx`
   - `AddQuestionModal.tsx`
   - preview components still parsing answer keys from metadata

5. Decide per legacy component:
   - migrate to relational API if still active
   - or remove/deprecate if no longer used

### Phase 3: Performance / Structure
6. Reduce repeated metadata scanning at startup.
   - Move migration/scrub to a versioned migration mechanism.
   - Remove one-time hotfix paths after data is clean.

7. Consider enriching question fetch responses.
   - Include answer keys in `get_document_questions_with_details` or create a batch answer-key endpoint.
   - Avoid N+1 per-question answer-key fetches in large trees.

## Invariants to Preserve
- Single-part questions use `sub_question_code = ''`.
- Multi-part questions use real sub-question codes.
- `UserAnswers` must continue matching `(question_id, sub_question_code)` to answer keys.
- `requireAnswerKey` remains question configuration, not answer-key content.

## Immediate Work Order
1. Backend API semantics cleanup
2. `editor_v2` answer-key display migration
3. editor_v2 visibility-condition cleanup
4. legacy component audit and cleanup
5. validation and follow-up report
