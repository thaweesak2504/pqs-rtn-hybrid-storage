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

## Canonical Product Artifacts And Terminology

Do not collapse these three artifacts into one meaning of "Template":

1. **Application Template/Skeleton** is the empty guided authoring format used when creating a new PQS document. It may seed required Sections, fixed headings, structural slots, and navigation, but it contains no authored Questions, Answer Keys, Trainee Answers, assessments, progress, or trainee attachments.
2. **Sample/Source Document** is the completed permanent example `22724201001`. It contains realistic Questions, Answer Keys, References, and Section structure, stays with the project, and is the source document used to develop and demonstrate the workflows.
3. **Trainee Test Copy** is an isolated issued snapshot/copy for one Trainee. Development IDs currently use `<source-id>-SIM-<sequence>`. It owns its answers, assessment events, progress, and trainee attachments independently from the source document and every other copy.

The current `TEMPLATE` badge on an authored source document is a test-stage UI label and must not redefine the empty Application Template/Skeleton. Before product release, document lifecycle terminology should distinguish Draft/Published Source Document, Sample Document, and Trainee Test Copy.

During development, the application intentionally exposes Creator, Trainee, and Qualifier views around the permanent sample document so the developer can validate all three workflows. Those views are capabilities of the Developer/Simulation workspace; they are not three kinds of data embedded in the Skeleton.

The clean release seed must retain system/master configuration, the empty Skeleton rules, and the permanent sample document. It must not ship development SIM instances, mock `T-001`/`Q-001` work, answers, assessments, progress, trainee attachments, sessions, or other test residue. Creating real documents after installation naturally adds local content; "one sample document" describes the clean initial seed, not a permanent one-document database limit.

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

Full-system Hybrid Backup/Restore is an administrator disaster-recovery operation and replaces the local system state. It is not the future Trainee portability workflow. A Trainee Portable Package must export/import only one issued test copy and its authorized work into an existing installation without replacing the destination `content.db` or unrelated documents.
