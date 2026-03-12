# Fix: Section 200 Template L1 Exempted Questions Answer Box Display

## Problem 🐛

In Section 200 template, L1 questions (2xx.1-2xx.6) with `question_type = 'exempted'` (specifically 2xx.2 and 2xx.4) were incorrectly showing "กลองคำตอบ" (answer box) in Qualifier/Trainee views, despite being header questions that should not have answers.

### Root Cause

The `PqsSectionPreview200.tsx` component had 3 sections that render `TraineeAnswerBox`:

1. **Single Answer Key section** (line ~444)
2. **Multi Answer Keys section** (line ~468)
3. **Fallback Answer Box section** (line ~512)

None of these checked:

- `question.question_type === 'exempted'` - should hide answer boxes for exempted questions
- `question.is_group_header === true` - should hide answer boxes for group headers

### Affected Questions

- **2xx.2**: "ส่วนประกอบและชิ้นส่วน" → `exempted` type
- **2xx.4**: "ค่าทำงานปกติ ค่าสูงสุด ต่ำสุด" → `exempted` type

These are instructional headers, not real questions requiring answers.

---

## Solution ✅

Added conditional checks to all three answer box rendering sections in [PqsSectionPreview200.tsx](src/components/editor_v2/PqsSectionPreview200.tsx):

### Code Changes

**Before:**

```javascript
{
  showAnswerKey && answerKey && Object.keys(answerKeys).length === 0 && (
    // Renders TraineeAnswerBox without checking exempted/group_header
  )
}
```

**After:**

```javascript
{
  showAnswerKey && answerKey && Object.keys(answerKeys).length === 0 &&
  question.question_type !== 'exempted' && !question.is_group_header && (
    // Only renders if question is not exempted and not a group header
  )
}
```

### Applied to:

1. ✅ **Single Answer Key rendering** (line 444)
   - Added: `question.question_type !== 'exempted' && !question.is_group_header`
2. ✅ **Multi Answer Keys rendering** (line 468)
   - Added: `question.question_type !== 'exempted' && !question.is_group_header`
3. ✅ **Fallback Answer Box rendering** (line 512)
   - Added: `question.question_type !== 'exempted' && !question.is_group_header`

---

## Test Coverage 🧪

Created comprehensive integration tests: [PqsSectionPreview200.integration.test.tsx](src/test/integration/PqsSectionPreview200.integration.test.tsx)

### Test Cases (All ✅ Passing)

1. **Exempted L1 Qualifier**: Exempted question (2xx.2) in qualifier view → NO answer box
2. **Non-exempted L1 Trainee**: Normal question (2xx.1) in trainee view → Shows fallback answer box
3. **Group Header L1**: Group header question → NO answer box
4. **Exempted with Keys**: Exempted question with answer keys → NO TraineeAnswerBox before key
5. **Exempted Trainee View**: Exempted in trainee view → NO answer box (any mode)

**Result**: 5/5 tests passing ✅

---

## Impact Analysis

### What Changed

- ✅ Exempted questions (2xx.2, 2xx.4) no longer show answer input boxes
- ✅ Group header questions no longer show answer boxes
- ✅ Non-exempted normal questions still work correctly
- ✅ Answer key display logic unaffected (only answer box input is hidden)

### Backward Compatibility

- ✅ No breaking changes - only hiding inappropriate answer boxes
- ✅ All existing non-exempted questions continue to work
- ✅ QuestionDisplayCard.tsx already had similar checks (line 154)

### Section Alignment

- ✅ Section 100: Uses `is_group_header` check in QuestionDisplayCard
- ✅ Section 200: NOW uses same exempted + group_header checks in Preview
- ✅ Section 300: Always has `!is300` in shouldShowAnswerBox logic

---

## Files Modified

### Component

- [src/components/editor_v2/PqsSectionPreview200.tsx](src/components/editor_v2/PqsSectionPreview200.tsx)
  - Lines 444-445: Single answer key conditional
  - Lines 468-469: Multi answer keys conditional
  - Lines 512-513: Fallback answer box conditional

### Tests

- [src/test/integration/PqsSectionPreview200.integration.test.tsx](src/test/integration/PqsSectionPreview200.integration.test.tsx) (NEW)
  - 5 integration test cases
  - Covers exempted + normal questions
  - Tests qualifier and trainee modes

---

## Verification Steps

✅ **Run new tests:**

```bash
npm test -- src/test/integration/PqsSectionPreview200.integration.test.tsx --run
Result: 5/5 passing
```

✅ **Manual verification:**

1. Create Section 200 document
2. Switch to Qualifier view
3. Verify 2xx.2 and 2xx.4 show exempted text "(ไม่ต้องอธิบาย)" WITHOUT answer boxes
4. Verify 2xx.1, 2xx.3, 2xx.5, 2xx.6 show answer boxes normally

---

## Related Issues

- Template display correctness for L1 header groups
- Consistent treatment across Section 100/200/300 template types

## Follow-up

- Monitor Section 200 template behavior in user testing
- Verify no regressions in other Section 200 components
