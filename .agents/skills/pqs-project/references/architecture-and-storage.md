# Architecture And Storage

## Runtime Shape

PQS RTN Hybrid Storage is a Windows-oriented Tauri v1 desktop application for Royal Thai Navy Personnel Qualification Standard documents.

```text
React 18 + TypeScript + Tailwind
        | Tauri invoke
Rust command adapters
        | domain/database functions
SQLite content.db + managed filesystem data
```

Rust owns persistence, filesystem access, validation, and structural policy. React owns interaction and rendering. SQLite is the persistent authority; component state is temporary.

## Frontend Entry And Routes

- `src/main.tsx`: React entry.
- `src/App.tsx`: providers and HashRouter routes.
- `src/contexts/InitializationContext.tsx`: validates database/media before normal UI.
- `src/contexts/AuthContext.tsx`: authenticated user state and session restoration.
- `src/components/pages/ActiveDocumentPage.tsx`: active document, section navigation, role/view simulation, Clear Answers, and Print Layout.

Main routes include welcome/sign-in/registration, editor/example, `pqs/:docId`, and dashboard administration pages. Authentication guards protect private routes; role/view simulation inside an active document remains a separate authoring tool.

## Backend Startup

`src-tauri/src/main.rs` performs startup cleanup and initialization, builds the content database pool, initializes schema/migrations and media folders, removes orphaned references, then reveals the window after the frontend first paint.

Database access uses an r2d2 pool with a maximum of eight SQLite connections. Every connection applies foreign keys, WAL, normal synchronous mode, in-memory temp storage, and a five-second busy timeout.

## Persistent Data

The consolidated `content.db` contains user/authentication data and PQS content. Important table groups:

- Identity: `users`, `high_ranking_officers`
- Documents: `OwnerUnits`, `Documents`, `Sections`, `Questions`, `QuestionChoices`
- References: `DocumentReferences`, `SectionReferences`, `QuestionReferences`, `QuestionSectionLinks`
- Assessment: `UserAnswers`, `UserProgress`, `QuestionAnswerKeys`
- Career branches: `OccupationBranches`, `OccupationSubBranches`, `OccupationSubQuestions`, `OccupationSlotCompletion`, `QuestionSubQuestionLinks`
- Evolution: `schema_migrations`

## Filesystem Layout

- Database and user media live under Tauri AppData: `pqs-rtn-hybrid-storage/content.db` and `media/`.
- Development document files live under AppData `pqs-rtn-hybrid-storage/data/`.
- Release document files live beside the executable under `data/` for portable deployment.
- Per-document folders are `data/<document-id>/question-images`, `references`, and `trainee-attachments`.
- Shared reference files may use `data/COMMON/references/`.

Never construct paths from unvalidated absolute user input. Persist normalized relative paths beginning with `data/` where the existing APIs expect them.

## Document Lifecycle

Document creation generates an ID from owner unit, document type, user level, and a three-digit sequence. It inserts document metadata, ensures the standard career branch, seeds Section 101 and group introduction questions, and prepares the standard Section 200/300 templates when those sections are added.

Document deletion removes relational children through foreign-key cascades and then removes `data/<document-id>/`. The built-in sample document ID is protected. Before changing reference deletion, account for global reference records that may point to a file physically stored under a document folder.

## Backup

Hybrid backups include a consistent SQLite snapshot, `media/`, `data/`, and a manifest. Import must reject unsafe ZIP paths, validate the manifest/checksum, stage extraction, and avoid replacing live files until validation succeeds.
