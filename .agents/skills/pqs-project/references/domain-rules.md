# PQS Domain Rules

## Document Groups

- Section 100: fundamentals and basic knowledge; section numbers 101-199; green theme.
- Section 200: systems and equipment; section numbers 201-299; orange theme.
- Section 300: watchstation performance and qualification; section numbers 301-399; purple theme.

Section numbers are unique inside a document and must stay inside their group range.

## Mandatory Section 101

Every new document receives Section 101 automatically. It is system-defined, its fixed Thai title comes from `FIXED_SECTION_101_TITLE`, its menu label is `101 Precautions`, and neither UI nor backend may allow it to be deleted. Its fixed title may not be changed.

Other system-defined sections are also protected from deletion. Do not infer that every Section 100 section is protected.

## Section 200

Creating a Section 200 section seeds six L1 template questions and initially marks them `exempted`. Their activation depends on career-position configuration.

Question metadata uses current keys such as `activeSubQuestions` and `selectedSubQuestions`. Selected occupation subquestions are synchronized into `QuestionSubQuestionLinks`; do not introduce legacy `activeSubQCodes` or `selectedSubQCodes` fields.

References and answer keys are required only where the current question policy/metadata requires them. Default exempted L1 templates intentionally hide those editors.

## Section 300

Creating a Section 300 section seeds the 3xx.1-3xx.7 structure for prerequisites, performance, scoring, and qualification. Configurable items may begin exempted.

Section 300 questions do not support document references or answer keys. Enforce this in Rust as well as hiding the controls in React. Trainee attachments are available for supported prerequisite/response flows. Scores aggregate from active children and exclude exempted items.

## Career Branch Protection

Documents begin with a standard branch/subbranch. Changing branch after answers exist is blocked unless the value is unchanged. The explicit reset flow removes linked occupation subquestions, answer keys, affected answers, and returns target questions to their exempted baseline before applying the new branch.

## References

`DocumentReferences` is the global master list. `SectionReferences` makes a reference available to a section; `QuestionReferences` links it to a question. A section reference cannot be removed while a question uses it. Physical deletion must account for every database user of the same path.

## Answers And Modes

`UserAnswers` stores trainee answers, attachments, qualifier feedback, and states such as `pending`, `passed`, and `needs_improvement`. `UserProgress` stores scoring/progress.

`ActiveDocumentPage` intentionally simulates `edit`, `qualifier`, `trainee`, `visitor`, and `print` views. Mock IDs such as `T-001` and `Q-001` are temporary development identities. Preserve this simulation until real-user mapping is explicitly requested.

Clear Answers is a test-stage operation. It may delete only `UserAnswers`, `UserProgress`, and trainee attachment files belonging to the active document. It must never clear another document.

## Print Layout

Print Layout currently provides a continuous A4-width preview:

- `question-only` represents the Trainee copy.
- `question-with-key` represents the Qualifier copy where answer keys are supported.

Reliable physical A4 pagination and line/page breaking remain pending until document UX/UI is sufficiently complete. Do not present the current `min-h-[297mm]` containers as finished pagination.
