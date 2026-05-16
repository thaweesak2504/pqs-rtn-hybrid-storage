# Skill: PQS Domain Logic

## Objective
Understand the domain-specific logic of the Royal Thai Navy PQS System to prevent architectural mistakes.

## Section Rules
1. **Section 100 (Fundamentals)**:
   - Base knowledge (e.g. 101 Precautions, 102 Ordnance Safety).
   - Usually standard text questions with choices or references.
   - Child components are rendered recursively up to 3 levels deep.

2. **Section 200 (Systems)**:
   - System/Equipment breakdowns.
   - Questions DO NOT usually have L2 children in the `Questions` table. Instead, they use `OccupationSubQuestions` and manage selections via `metadata` field (`activeSubQCodes`, `selectedSubQCodes`).
   - Like Section 100, newly created questions in Section 200 **must** reference a document. However, an exception is allowed for older documents that didn't strictly map references.

3. **Section 300 (Watchstations)**:
   - Evaluation of performance.
   - Contains Prerequisite Questions (3xx.1.1, 3xx.1.2) which allow Trainee Attachments (PDFs/Images).
   - "Performance" subquestions (3xx.2 - 3xx.6) calculate scores bottom-up.
   - Trainee answers are captured in `UserAnswers` with specific states (`pending`, `passed`, `needs_improvement`).

## The `usage_count` Rule
- The `usage_count` determines if a `DocumentReference` is actively linked to any `Question` via `QuestionReferences`.
- It dictates if a reference can be deleted safely (preventing orphan constraints).
- The `usage_count` logic is critical for **both Section 100 and Section 200**. It allows authors to evaluate how effectively each reference is being utilized across the questions, and whether any unused references should be removed.

## Database File Attachments
- Use `AttachmentPanel.tsx` for file attachments.
- Files should be managed by the `save_attachment_file` Rust command which automatically structures the data into `documents/<DocId>/trainee-attachments/`.
