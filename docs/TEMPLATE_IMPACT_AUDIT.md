# Template Impact Audit (Read-Only Baseline)

Date: 2026-03-10
Mode: Read-only audit (no runtime code changes)
Goal: Establish current behavior baseline before tests-first implementation.

## Scope Reviewed

- `src-tauri/src/content_database.rs`
- `src/components/editor_v2/PqsQuestionSection.tsx`
- `src/components/editor_v2/QuestionTreeNode.tsx`
- `src/components/modals/EditMetadataModal.tsx`

## Confirmed Current Behavior (Baseline)

### 1) Document/Section Seeding

- `create_document` seeds generic root questions for 100/200/300 and also auto-creates section 101.
- Reference:
  - `src-tauri/src/content_database.rs:254`
  - `src-tauri/src/content_database.rs:1302`
- `create_section` auto-seeds by group/range:
  - 200-series -> `seed_section_200_template`
  - 300-series -> `seed_section_300_template`
  - 102 only for 100-series
- Reference:
  - `src-tauri/src/content_database.rs:1995`
  - `src-tauri/src/content_database.rs:2055`
  - `src-tauri/src/content_database.rs:2088`

### 2) Section 300 Template Shape and Defaults

- L1 seq 1..7 are inserted.
- 3xx.2-3xx.5 are seeded as `question_type='exempted'`, `is_group_header=true`, `is_scored=false`.
- 3xx.6 seeded as normal group header (`is_group_header=true`, `is_scored=false`).
- 3xx.1.1-1.3 exempted + unscored.
- 3xx.1.4-1.5 exempted + scored (`is_scored=true`).
- 3xx.7.1-7.2 unscored.
- Reference:
  - `src-tauri/src/content_database.rs:2088`
  - `src-tauri/src/content_database.rs:2113`

### 3) Score Calculation Rules in Backend

- Section total score uses top-level only (`parent_id IS NULL`):
  - group headers contribute `group_score`
  - non-header scored L1 contributes `score`
  - exempted contributes 0
- Group score sums children:
  - child group headers -> `group_score`
  - child scored leaves -> `score`
  - exempted -> 0
- Reference:
  - `src-tauri/src/content_database.rs:3674`
  - `src-tauri/src/content_database.rs:3704`
  - `src-tauri/src/content_database.rs:4116`

### 4) Dynamic Child Flows

- Two dynamic child mechanisms exist and affect scoring chain:
  - `section_ref` children for 3xx.1.4/1.5
  - `required_instance` children for count-based rows ("ครั้งที่ X")
- Parent is toggled to group header when children exist.
- Group/section totals recalc through chain helper.
- Reference:
  - `src-tauri/src/content_database.rs:4235`
  - `src-tauri/src/content_database.rs:4577`
  - `src-tauri/src/content_database.rs:4116`

### 5) Branch Selection Model

- Document-level branch fields exist and are updatable (`occupation_branch_main/sub`).
- No backend lock rule found that prevents switching branch mid-evaluation.
- Reference:
  - `src-tauri/src/content_database.rs:534`
  - `src-tauri/src/content_database.rs:547`
  - `src/components/modals/EditMetadataModal.tsx:100`

## Critical Gaps vs Strategy Assumptions

### Gap A: "No answer keys in section 300" is not backend-enforced

- Backend answer-key APIs do not check section group before write.
- Reference:
  - `src-tauri/src/content_database.rs:5358`
  - `src-tauri/src/content_database.rs:5401`
- Impact:
  - UI may hide controls, but API-level writes remain possible.

### Gap B: "No references in section 300" is not backend-enforced

- `add_question_reference` has duplicate-check/order logic only; no section 300 guard.
- Reference:
  - `src-tauri/src/content_database.rs:3276`
- Impact:
  - Constraint currently depends on UI behavior, not backend contract.

### Gap C: Branch lock behavior is not enforced server-side

- Branch values are updated directly on document.
- No hard rule detected for "cannot switch during evaluation".
- Reference:
  - `src-tauri/src/content_database.rs:547`

## No-Break Invariants (Must Preserve)

1. Section total uses top-level-only aggregation to avoid double-counting.
2. Exempted questions always contribute zero to group/section totals.
3. Group score recomputation must propagate parent -> grandparent -> section total.
4. Creating/removing dynamic children must keep parent header flags coherent.
5. Section-number range guards must remain strict by section group.
6. Section 101 remains system-defined and blocked from manual creation.

## Regression Hotspots (Highest Risk)

1. `seed_section_300_template` defaults and flag combinations.
2. `update_question_score` and `recalculate_group_score_chain` cascade logic.
3. Dynamic child flows (`section_ref`, `required_instance`) that mutate parent roles.
4. Frontend-only guards for section 300 answer keys/references (backend currently permissive).

## Recommended Tests-First Entry Points

### Phase 1 (backend first, minimal risk)

- Unit tests for `calculate_group_score` and `calculate_section_total_score` using mixed question types.
- Unit tests for `seed_section_300_template` exact shape and flag expectations.
- Unit tests for `recalculate_group_score_chain` propagation correctness.

### Phase 2 (contract safety)

- Integration tests proving current API behavior:
  - branch update is accepted repeatedly (document baseline truth)
  - answer key API accepts writes regardless of section (current behavior)
  - reference API accepts link writes regardless of section (current behavior)

Note: These tests should initially encode CURRENT behavior, then policy-hardening can be a deliberate, reviewed change.

## Audit Outcome

- Baseline captured.
- High-risk mismatch points identified.
- Safe next move: implement tests that lock current behavior before any refactor or policy tightening.
