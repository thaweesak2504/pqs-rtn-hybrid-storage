# Legacy Archive

This directory contains components and tests that were part of the initial PQS implementation but have been superseded by the `editor_v2` system. These files are kept here for historical reference or in case they contain specific logic that needs to be consulted later.

## Archived Files

- **QuestionRenderer.tsx**: A recursive question rendering component (formerly in `src/components/questions/`).
- **ReferenceManager.tsx**: A component for managing section-level references (formerly in `src/components/sections/`).
- **SectionQuestionView.tsx**: An older view component that utilized both `QuestionRenderer` and `ReferenceManager` (formerly in `src/components/views/`).
- **QuestionRenderer.test.tsx**: Original test suite for the `QuestionRenderer` component.

## Why were they moved?

These files are not used by the current active document editor (`ActiveDocumentPage.tsx` and the `editor_v2` family of components). They were moved here on 2026-03-26 to clean up the main source tree while preserving the code for safety.
