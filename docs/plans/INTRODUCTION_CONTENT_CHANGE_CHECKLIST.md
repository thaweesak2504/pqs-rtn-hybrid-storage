# System Introduction Content Change Checklist

**Applies to:** General Introduction items 1 and 3–7, Section 100 Introduction, Section 200 Introduction, and Section 300 Introduction
**Policy:** Live Update through a reviewed application release
**Edit authority:** Developer-controlled source change only

## 1. Approved Change Input

Do not edit System Introduction until the responsible content group has approved the wording. The change request must provide:

- approval or meeting-decision reference,
- approval date and responsible group,
- reason for the change,
- affected page and stable section ID,
- complete approved replacement wording, including nested list items,
- intended application release or release window.

General Introduction item 2 (`applied-to`, `การประยุกต์ใช้`) is excluded from this process because its value is Document Content stored in `Documents.applied_to`.

## 2. Exact Source and Change Boundary

1. Change approved System Introduction wording only in `src/content/introductionContent.ts`.
2. Preserve existing stable IDs unless the approval explicitly requires a structural change. An ID change can affect rendering keys, automated order checks, and future compatibility records.
3. Do not add Introduction rows to SQLite, the Application Skeleton, Source Documents, or Simulation copies.
4. Do not edit General item 2 while applying a System Content update.
5. Do not change view components merely to update wording. A required layout or semantic change must be reviewed as a separate implementation change.

`src/content/introductionContentValidation.ts` is the automated structure guard. It checks every canonical Introduction page for a non-empty section collection, non-empty required text, and unique sibling IDs at section, sub-item, and nested-item levels.

## 3. Automated Gate

Run the focused Introduction checks first:

```powershell
npx vitest run src/test/integration/introductionContentValidation.integration.test.ts src/test/integration/introductionContent.integration.test.tsx
```

The focused tests must prove:

- the canonical General/100/200/300 definitions pass structural validation,
- malformed or duplicate IDs fail with an exact source path,
- the approved top-level order remains unchanged unless explicitly reviewed,
- all nested Section 200/300 content remains present,
- normal and Print views render the same canonical order and complete content,
- Introduction heading semantics remain intact.

Before release, run the complete frontend checkpoint:

```powershell
npx tsc --noEmit
npx eslint src --max-warnings=0
npm run test:run
npm run build
```

If the change also affects Rust, SQLite, packaging, or another shared persistent rule, run the full Rust checkpoint required by `AGENTS.md`.

## 4. Desktop App Manual Gate

Use a small test Source Document such as `22730203001`; do not modify permanent Sample/Source Document `22724201001` merely to verify Introduction content.

### A. Creator and Visitor normal views

1. Open the test Source Document in Creator/Edit view.
2. Open `Introduction` and verify General items 1–7 appear in the approved order.
3. Confirm item 2 still shows that document's own `การประยุกต์ใช้` value and remains the only editable Introduction item.
4. Open `100 Introduction`, `200 Introduction`, and `300 Introduction` from the Sections menu.
5. Compare every changed paragraph and nested list item with the approved wording; confirm no item is missing, duplicated, or reordered.
6. Select `View As > Visitor (Questions Only)` and repeat steps 2–5. Confirm no Introduction edit command appears.

### B. Existing Simulation — Trainee, Qualifier, and Visitor

1. Open an existing Simulation for the same test Source Document. If none exists, create one only in the test document; no Trainee answers are required.
2. Select `View As > Trainee (Answer Only)` and inspect General/100/200/300 Introduction.
3. Select `View As > Qualifier (See All)` and inspect the same four pages.
4. Select `View As > Visitor (Questions Only)` and inspect the same four pages.
5. In all three modes, confirm the revised System Content is identical to the Source Document and General item 2 retains the Simulation's document-specific cloned value.
6. Confirm no mode can edit System Introduction.

### C. Print Layout parity

1. On the test Source Document, choose `Print Layout (A4) > Question (เล่มคำถาม)`.
2. Inspect General/100/200/300 Introduction for approved wording, order, nested lists, and readable headings.
3. Choose `Print Layout (A4) > Answer Key (เล่มเฉลย)` and repeat the inspection.
4. Confirm both Print choices show the same Introduction content as normal view. A4 pagination is not part of this gate; Print remains a continuous preview.

### Expected result

- All existing Source Documents and Simulations display the newly approved System Introduction after installing the application release.
- General item 2 remains isolated Document Content.
- No Questions, Answer Keys, Trainee answers, assessments, progress, attachments, or user documents change as a side effect.

## 5. Required Change and Release Record

Record the following with the source-control change and release notes:

```text
System Introduction Live Update
- Application version/release:
- Approval or meeting-decision reference:
- Approval date / responsible group:
- Affected page(s) and stable section ID(s):
- Change summary:
- Automated gate result:
- Desktop App Manual Gate result / reviewer / date:
- Rollback or corrective release reference (if applicable):
```

The release note must state that the update is live System Content affecting every document opened with that application version, while General item 2 remains document-owned. Do not describe this record as a per-document content version.
