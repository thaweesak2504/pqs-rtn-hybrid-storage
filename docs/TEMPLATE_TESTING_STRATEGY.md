# Template Testing Strategy — Core of PQS RTN Hybrid Storage

> **Importance Level:** 🔴 CRITICAL  
> **Status:** Planning Phase  
> **Created:** 2026-03-09  
> **Priority:** Occupation Branches + Scoring Calculations

---

## 📌 Executive Summary

Template Testing is the **heart of this project** — validating that the 100-300-series question templates:
1. ✅ Auto-seed correctly when documents are created
2. ✅ Support occupation branch selection (3xx.2-3xx.5)
3. ✅ Calculate scores accurately (group_score, total_score)
4. ✅ Handle Pass/Fail evaluation (Section 300)
5. ✅ Prevent data corruption (no answer keys in 300, no references in 300)

**Testing Scope:** Full end-to-end coverage (Unit → Integration → E2E → Property-based)

---

## 🎯 Test Priorities

### Priority 1: Occupation Branch Selection Logic (3xx.2-3xx.5)

**Why Critical:** This is the **core feature** that distinguishes Section 300 from 100/200.
Users must be able to:
- Select occupation branch for 3xx.2-3xx.5 questions
- View branch-specific evaluation criteria
- Lock in branch choice once selected
- Prevent switching branches mid-evaluation

**Test Cases:**

```
1. No branch selected (ผู้ใช้ไม่เลือก occupation)
   - UI should disable submission until branch is selected
   - Error message: "โปรดเลือกสาขาอาชีพ"
   - Database should NOT create any child questions

2. Single branch selected
   - Correct child questions appear
   - Branch code saved to database
   - Cannot switch to different branch during eval

3. Invalid/deleted branch
   - Graceful fallback to first available branch
   - Log warning: "Branch {code} not found, using fallback"
   - No crashes or orphaned questions

4. Concurrent branch selection (edge case)
   - Two evaluators make selection simultaneously
   - Last write wins (or explicit locking?)
   - No race condition orphans
```

### Priority 2: Scoring Recalculation (total_score, group_score)

**Why Critical:** Pass/Fail determination depends on accurate score calculation.

**Test Cases:**

```
1. Correct group_score calculation
   - For 3xx.2-3xx.6: SUM(L2 scored questions)
   - For 3xx.1: SUM(L2 seq 4-5) only (prerequisites not scored)
   - For 3xx.7: Not scored (knowledge test, uses Pass/Fail)

2. Correct total_score calculation
   - SUM(all group_score) + SUM(individual scored L1 questions)
   - Should NOT double-count children

3. Partial completion (ตอบแบบ incomplete)
   - Pass: All required questions answered + pass majority
   - Fail: Any required question not answered OR score < threshold
   - Blank: 0/Pending (not evaluated yet)
   - Mixed: Some pass, some fail per sub-branch

4. Score overflow/underflow
   - Group_score > max_possible_score → cap at max
   - Negative scores → set to 0
   - Decimal scores → round correctly

5. Recalculation after delete/restore
   - Delete a scored question → recalculate parent group_score
   - Restore question → recalculate accurately
   - Don't orphan scores

6. Expected count validation
   - If question marked "expected" but score = 0 → warning
   - If question NOT marked "expected" but scored → allow but log
```

---

## 🧪 Testing Levels & Implementation Plan

### Level 1: Unit Tests (Rust Backend)

**Location:** `src-tauri/src/content_database.rs` (in `#[cfg(test)] mod tests`)

**Core Functions to Test:**

```rust
// Template Seeding
seed_section_100_template(&conn, &doc_id, section_id, 101)
seed_section_200_template(&conn, &doc_id, section_id, 201)
seed_section_300_template(&conn, &doc_id, section_id, 301)

// Branch Selection
get_occupation_branches(&conn)
validate_branch_selection(&conn, branch_code, sub_branch_code, section_id)
get_branch_specific_questions(&conn, question_id, branch_code)

// Scoring Calculations
calculate_group_score(&conn, parent_question_id) -> i32
calculate_total_section_score(&conn, section_id) -> i32
recalculate_group_score_chain(&conn, question_id) -> Result<(), String>

// Validation
validate_answer_key_forbidden(&conn, question_id, section_group) // 300 should fail
validate_reference_forbidden(&conn, question_id, section_group)  // 300 should fail
check_branch_selection_complete(&conn, section_id) -> bool
```

**Test Count Target:** 
- Seeding: 6 tests per template × 3 = 18 tests
- Branch logic: 8-10 tests
- Scoring: 15-20 tests
- Validation: 8-10 tests
- **Total Unit Tests: ~55-60 tests**

**Example Test:**

```rust
#[test]
fn test_section_300_branch_selection_required() {
    let conn = create_test_db();
    let doc_id = "22724201001";
    let section_id = create_section_300(&conn, &doc_id).unwrap();
    
    // Get 3xx.2 (requires branch)
    let q302 = get_question_by_sequence(&conn, section_id, 2).unwrap();
    
    // Should NOT allow submission without branch selected
    let result = validate_branch_selection_complete(&conn, section_id);
    assert!(!result, "Should require branch selection for 3xx.2");
    
    // Select a valid branch
    set_section_branch(&conn, section_id, "2-1").unwrap();
    let result = validate_branch_selection_complete(&conn, section_id);
    assert!(result, "Should allow submission after branch selected");
}

#[test]
fn test_group_score_calculation_3xx2_branch() {
    // Create 3xx.2 with children (5 scored, 2 unscored)
    // Each child has score = 10
    // Expected group_score = 5 * 10 = 50
    
    let actual_score = calculate_group_score(&conn, q302_id).unwrap();
    assert_eq!(actual_score, 50);
}
```

---

### Level 2: Integration Tests (Frontend ↔️ Tauri Backend)

**Location:** `src/test/integration/templateIntegration.test.ts`

**Test Scenarios:**

```typescript
describe("Template Integration", () => {
  
  // Section 300 + Branch Selection
  describe("Occupation Branch Selection", () => {
    it("should prevent question submission without branch selected", async () => {
      // Create document, Section 301
      const section = await invoke("create_section", {
        document_id: "22724201001",
        section_group: 300,
        section_number: 301,
      });
      
      // Try to submit without branch → should fail
      const result = await invoke("submit_section_answers", {
        section_id: section.id,
        branch_code: null,  // ← Missing
      });
      
      expect(result).toHaveError("Branch selection required");
    });

    it("should load correct questions when branch selected", async () => {
      await invoke("set_section_branch", {
        section_id: "s1",
        branch_code: "2-1",
      });
      
      const questions = await invoke("get_section_questions", {
        section_id: "s1",
        with_occupation_data: true,
      });
      
      const q302 = questions.find(q => q.sequence === 2);
      assert(q302.metadata.occupationBranch === "2-1");
    });

    it("should prevent branch switching during evaluation (edge case)", async () => {
      // Start with branch "2-1"
      await invoke("set_section_branch", { section_id: "s1", branch_code: "2-1" });
      
      // Try to switch to "2-2" → should fail
      const result = await invoke("set_section_branch", {
        section_id: "s1",
        branch_code: "2-2",  // Different branch
      });
      
      expect(result).toHaveError("Cannot change branch during evaluation");
    });
  });

  // Scoring
  describe("Score Calculation API", () => {
    it("should calculate correct total_score from section", async () => {
      // Setup: Section 301 with 2 group headers (3xx.2, 3xx.3)
      // 3xx.2: 3 scored children × 10 points = 30
      // 3xx.3: 2 scored children × 15 points = 30
      // Total: 60
      
      const score = await invoke("get_section_total_score", {
        section_id: "s1",
      });
      
      expect(score).toBe(60);
    });

    it("should update group_score when child question score changes", async () => {
      const parent_id = "q302";  // 3xx.2
      
      // Initial: 3 children, each 10 points → group_score = 30
      let groupScore = await invoke("get_question_group_score", {
        question_id: parent_id,
      });
      expect(groupScore).toBe(30);
      
      // Update child 1 to 15 points
      await invoke("update_question", {
        id: "child1",
        score: 15,
      });
      
      // group_score should recalculate to 35
      groupScore = await invoke("get_question_group_score", {
        question_id: parent_id,
      });
      expect(groupScore).toBe(35);
    });

    it("should NOT recalculate if non-scored question changes", async () => {
      // 3xx.1 children (seq 1-3) are NOT scored by default
      // Changing them should NOT affect group_score
      
      const parent_id = "q301";
      const initialGroupScore = await invoke("get_question_group_score", {
        question_id: parent_id,
      });
      
      await invoke("update_question", {
        id: "child_unscored",
        score: 100,  // Try to give it a huge score
      });
      
      const newGroupScore = await invoke("get_question_group_score", {
        question_id: parent_id,
      });
      
      expect(newGroupScore).toBe(initialGroupScore); // Should NOT change
    });
  });

  // Data Validation
  describe("Template Constraints", () => {
    it("should prevent answer key in Section 300", async () => {
      const q301 = await invoke("get_question", { id: "q301" });
      
      // Try to add answer key
      const result = await invoke("update_question", {
        id: "q301",
        metadata: { 
          answerKey: "This should be forbidden" 
        },
      });
      
      expect(result).toHaveError("Answer keys not supported in Section 300");
    });

    it("should prevent references in Section 300", async () => {
      const result = await invoke("add_question_reference", {
        question_id: "q301",
        reference_id: "ref123",
      });
      
      expect(result).toHaveError("References not supported in Section 300");
    });

    it("should allow answer key in Section 100 & 200", async () => {
      const result = await invoke("update_question", {
        id: "q201",  // Section 200
        metadata: { answerKey: "This is allowed" },
      });
      
      expect(result).toSucceed();
    });
  });
});
```

**Test Count Target:** 12-15 integration tests

---

### Level 3: Component Tests (React UI)

**Location:** `src/test/components/Section300Form.test.tsx` (when component is built)

**Key Interactions to Test:**

```typescript
describe("Section 300 UI Component", () => {
  // Branch Selection UI
  it("should disable submit until branch is selected", async () => {
    const { getByRole } = render(
      <Section300Form section={mockSection} />
    );
    
    const submitBtn = getByRole("button", { name: /submit/i });
    expect(submitBtn).toBeDisabled();
    
    // Select branch
    const branchSelect = getByRole("combobox");
    await userEvent.selectOption(branchSelect, "2-1");
    
    expect(submitBtn).toBeEnabled();
  });

  // Pass/Fail evaluation
  it("should show Pass/Fail buttons instead of score input", () => {
    const { queryByRole, getByRole } = render(
      <Section300Form section={mockSection} />
    );
    
    // Should NOT have score input
    expect(queryByRole("spinbutton")).not.toBeInTheDocument();
    
    // Should have Pass/Fail buttons
    expect(getByRole("button", { name: /pass/i })).toBeInTheDocument();
    expect(getByRole("button", { name: /fail/i })).toBeInTheDocument();
  });

  // Hidden fields
  it("should hide answer key fields for Section 300", () => {
    const { queryByText } = render(
      <Section300Form section={mockSection} />
    );
    
    expect(queryByText(/answer key/i)).not.toBeInTheDocument();
  });
});
```

**Test Count Target:** 8-10 component tests

---

### Level 4: E2E Tests (Full Workflow)

**Location:** `e2e/tests/template-workflow.e2e.ts` (future, using Tauri Driver)

**Scenario 1: Complete Section 300 Evaluation**

```
1. Create New Document
   INPUT: Name "Watch Station", Unit "2272400"
   VERIFY: Document created, auto-seeds Section 101, 201, 301

2. Navigate to Section 301
   INPUT: Click "301" tab
   VERIFY: Questions 3xx.1-3xx.7 visible
   
3. Answer Prerequisites (3xx.1)
   INPUT: Check "Passed training", "Passed standards"... (items 1-5)
   VERIFY: Form accepts answers, prerequisites locked

4. Select Occupation Branch (3xx.2-3xx.5)
   INPUT: Select "สาขา 2.1 - ระบบหลัก"
   VERIFY: Branch-specific evaluation criteria appear
   
5. Evaluate Normal Operations (3xx.2)
   INPUT: Click "Pass" for normal operations test
   VERIFY: Score updated, group_score calculated
   
6. Evaluate Other Areas (3xx.3-3xx.5)
   INPUT: Click "Pass" for special/failure/emergency cases
   VERIFY: All group_scores calculated correctly
   
7. Evaluate Daily Operations (3xx.6)
   INPUT: Enter performance ratings (1-5) for 10 items
   VERIFY: Total score = sum of items
   
8. Skip Knowledge Test (3xx.7)
   INPUT: Leave blank or mark "Pending"
   VERIFY: Can save without completing
   
9. Submit Section
   INPUT: Click "Submit Section"
   VERIFY: All validations pass, scores persisted
```

**Scenario 2: Partial Completion with Different Outcomes**

```
Case 1: All Pass → Overall Result = PASS
- 3xx.1 prerequisites: All checked
- 3xx.2-3xx.5: All Pass
- 3xx.6: High rating (>70%)
- 3xx.7: Skipped (optional)
Expected: Overall = PASS

Case 2: One Area Fails → Overall Result = FAIL
- 3xx.1 prerequisites: Missing one item
- 3xx.2: Pass
- 3xx.3: FAIL ← One failure
- 3xx.4-5: Pass
- 3xx.6: Medium rating
Expected: Overall = FAIL (prerequisite missing)

Case 3: Incomplete Submission
- 3xx.1: Incomplete
- 3xx.2: Pass
- 3xx.3-7: Not started
Expected: Status = PENDING, Cannot submit
```

**Test Count Target:** 5-6 E2E scenario tests

---

### Level 5: Property-Based Tests

**Location:** `src-tauri/src/content_database.rs` + `src/test/property-based/`

**Properties to Verify:**

```
INVARIANT 1: total_score ≥ 0
- For any section, total_score should never be negative
  (even if something goes wrong with calculation)

INVARIANT 2: group_score ≤ max_possible_score
- For any group header, group_score ≤ SUM(max scores of children)

INVARIANT 3: Referential integrity
- Every scored question must have a parent (except L1)
- Every parent must have at least 1 child if is_group_header=1

INVARIANT 4: Question sequence uniqueness
- No two questions at same level share sequence number

INVARIANT 5: Template immutability
- Once is_template=1 is set, certain columns cannot be updated
  (e.g., cannot change content of seeded template questions)

INVARIANT 6: Section group range
- Questions in section_group=100 have section_number in [101, 199]
- Questions in section_group=200 have section_number in [201, 299]
- Questions in section_group=300 have section_number in [301, 399]
```

**Example (Using QuickCheck-style):**

```rust
#[test]
fn property_total_score_never_negative() {
    quickcheck! {
        fn prop(
            doc_questions: Vec<CreateQuestionArgs>,
            scores: Vec<(String, i32)>  // (question_id, score)
        ) -> bool {
            let conn = create_test_db();
            let section_id = create_section(&conn, /*...*/).unwrap();
            
            // Create random questions
            let q_ids = doc_questions.iter().map(|q| {
                create_question(&conn, q.clone()).unwrap()
            }).collect::<Vec<_>>();
            
            // Assign random scores (including negative attempts)
            for (qid, score) in scores {
                let _ = update_question(&conn, &qid, score);
            }
            
            // Verify: total_score ≥ 0
            let total = calculate_total_section_score(&conn, section_id).unwrap_or(0);
            total >= 0
        }
    }
}
```

**Test Count Target:** 6-8 property tests

---

### Level 6: Performance Tests

**Location:** `src-tauri/src/content_database.rs` (benchmark module)

**Scenarios to Benchmark:**

```
1. GET large section with 100+ questions
   - Should complete in < 100ms
   
2. Recalculate group_score for deeply nested questions
   - 7 L1 groups × 5-10 L2 children = 50-70 questions
   - Should complete in < 50ms
   
3. Batch update scores for 50 questions
   - Should complete in < 200ms
   
4. CREATE new document + seed all templates
   - Should complete in < 500ms
```

**Benchmark Code:**

```rust
#[bench]
fn bench_calculate_total_section_score(b: &mut Bencher) {
    let conn = create_test_db_with_section_300(); // Pre-populated
    let section_id = 999;
    
    b.iter(|| {
        calculate_total_section_score(&conn, section_id)
    });
}
```

**Test Count Target:** 4-5 performance benchmarks

---

## 📊 Test Summary by Level

| Level | Type | Count | Priority | Duration | Owner |
|-------|------|-------|----------|----------|-------|
| 1 | Unit (Rust) | 55-60 | 🔴 Critical | 2-3 days | Backend |
| 2 | Integration | 12-15 | 🔴 Critical | 1-2 days | Full-stack |
| 3 | Component (React) | 8-10 | 🟡 High | 1 day | Frontend |
| 4 | E2E (Workflow) | 5-6 | 🟡 High | 2-3 days | QA |
| 5 | Property-based | 6-8 | 🟢 Medium | 1 day | Backend |
| 6 | Performance | 4-5 | 🟢 Medium | 1 day | DevOps |
| **TOTAL** | **All** | **90-108** | | **8-11 days** | |

---

## 🎯 Implementation Roadmap

### Week 1 (Current)
- ✅ [Done] Create TEST_USAGE_GUIDE.md
- ✅ [Done] Add template testing section
- ✅ [Done] Identify priorities + edge cases
- **→ TODAY:** Create this TEMPLATE_TESTING_STRATEGY.md

### Week 2
- **Phase 1:** Rust Unit Tests
  - [ ] Create test module structure
  - [ ] Implement 55-60 unit tests
  - [ ] Run `cargo test` → all passing
  - [ ] Generate coverage report

### Week 3
- **Phase 2:** Integration Tests
  - [ ] Create integration test framework
  - [ ] Implement 12-15 Tauri API tests
  - [ ] Verify frontend ↔ backend communication
  - [ ] `npm run test:integration` → all passing

### Week 4
- **Phase 3:** Component + E2E Tests
  - [ ] Build React component tests
  - [ ] Setup E2E test framework (Tauri Driver)
  - [ ] Implement full workflow tests

### Week 5
- **Phase 4:** Property-based + Performance Tests
  - [ ] Configure quickcheck/property testing
  - [ ] Implement invariant tests
  - [ ] Setup benchmarks
  - [ ] Optimize slow operations

---

## 🚨 Critical Success Factors

**CSF 1: Occupation Branch Selection Works**
- Users MUST be able to select branch
- Branch assignment MUST be persistent
- Branch switching MUST be prevented
- Invalid branches MUST have fallback
- → Without this, evaluators cannot use feature

**CSF 2: Scoring Calculations are 100% Correct**
- group_score = SUM(scored children) ✅
- total_score = SUM(all group_scores, non-group scored items) ✅
- Pass/Fail determination uses correct calculation ✅
- Recalculation happens on every score change ✅
- → Without this, evaluation results are meaningless

**CSF 3: Section 300 Constraints Enforced**
- NO answer keys allowed ✅
- NO references allowed ✅
- Answer key removal on save ✅
- Reference removal on save ✅
- → Without this, data corruption risk is high

**CSF 4: Template Immutability Protected**
- Users CANNOT edit template questions ✅
- Only allowed operations: rank, comment, evaluate ✅
- Accidental modification reverts or warns ✅
- → Without this, template structure breaks

---

## 📋 Test Execution Checklist

Before marking templates as "production ready":

### Rust Unit Tests
- [ ] All 55-60 tests pass
- [ ] Coverage: >80% for template functions
- [ ] No compiler warnings
- [ ] `cargo test --release` passes

### Integration Tests
- [ ] All 12-15 tests pass
- [ ] API contracts verified
- [ ] Frontend receives correct data
- [ ] Database persists correctly

### Component Tests
- [ ] All 8-10 tests pass
- [ ] User interactions work
- [ ] Accessibility validated
- [ ] Visual regression checked

### E2E Tests
- [ ] All 5-6 scenarios pass end-to-end
- [ ] Real browser execution
- [ ] Performance acceptable
- [ ] No test flakiness

### Property Tests
- [ ] All 6-8 invariants hold
- [ ] No counterexamples found
- [ ] Edge cases identified & fixed

### Performance Tests
- [ ] All operations < target duration
- [ ] No memory leaks
- [ ] Query plans optimized
- [ ] Scale tested (100+ questions)

---

**Last Updated:** 2026-03-09  
**Next Review:** After Unit Tests Complete
