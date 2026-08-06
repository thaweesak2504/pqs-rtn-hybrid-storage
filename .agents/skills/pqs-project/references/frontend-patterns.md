# Frontend Patterns

## Structure

- `src/components/editor_v2/`: document editing, question trees, role views, answer/scoring widgets, and print previews.
- `src/components/pages/`: route-level pages.
- `src/components/modals/`: application modals, including `ConfirmModal.tsx`.
- `src/components/ui/`: reusable controls such as `Button`, `Modal`, and `Tooltip`.
- `src/hooks/`: data-loading and workflow hooks.
- `src/services/`: Tauri and desktop adapters.
- `src/types/backend.ts`: canonical frontend mirror for Rust IPC structs.
- `src/types/content.ts`: smaller editor-local models, not the complete backend contract.

Keep route components focused on orchestration. Follow existing hooks and subcomponents before adding another abstraction.

## Tauri Calls

Prefer typed service functions and `safeInvoke` from `src/services/tauriService.ts` for new calls. Existing direct `invoke` usage is technical debt, not a pattern to expand. Normalize backend errors for user-facing policy messages and log diagnostic details through `logger`.

## UI System

Use Tailwind semantic GitHub colors for general surfaces and dark mode. Section identity colors are intentional domain colors:

- 100: green
- 200: orange/amber
- 300: purple

`questionFormCard/themeColors.ts` currently centralizes only Section 200/300 subquestion colors; do not treat it as the source for every Section 100 style. Use Lucide icons and existing UI controls. The print font is TH Sarabun; application UI uses Kanit.

## Types And State

Update `src/types/backend.ts` whenever a serialized Rust DTO changes. Nullable Rust `Option<T>` values normally map to `T | null`. Never add secret database fields to frontend interfaces.

Use the Rust database as the final authority. Optimistic UI is acceptable only when failures restore or reload authoritative state.

## Document Rendering

Preview components use fixed `210mm` width and at least `297mm` height for a paper-like continuous surface. `break-inside-avoid` is a hint, not a pagination engine. Keep Print Layout changes separate from normal Edit/Qualifier/Trainee behavior.

## Accessibility And Tests

Interactive rich-text editors must expose a stable textbox role/label. Prefer Testing Library queries by role, label, or visible behavior. Mock Tiptap only when a test targets the containing component contract; use the real adapter for editor-specific behavior.
