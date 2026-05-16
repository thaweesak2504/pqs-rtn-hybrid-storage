# Skill: React Frontend & UI Standards

## Objective
Define the standard patterns for creating React components and styling in the PQS RTN project.

## UI Design System (Tailwind CSS)
1. **Color Palette**: Do not use raw colors where semantic ones exist. Use the custom `github-*` CSS variables defined in `tailwind.config.js` and `index.css`.
   - `bg-github-bg-primary`, `border-github-border-primary`, `text-github-text-primary`.
   - Always support Dark Mode via `dark:` prefix (e.g., `bg-white dark:bg-github-bg-secondary`).
2. **Section Colors**:
   - Section 100: Green (`text-green-600`, `bg-green-50/50`)
   - Section 200: Orange (`text-orange-600`, `bg-orange-50/50`)
   - Section 300: Purple (`text-purple-600`, `bg-purple-50/50`)
   - Always refer to `src/components/editor_v2/questionFormCard/themeColors.ts` when building colored components.
3. **A4 Paper Layout**:
   - Components that render documents (like `PqsSectionPreview.tsx`) must adhere to standard A4 printing constraints.
   - Use `min-w-[210mm] min-h-[297mm] p-8 mx-auto bg-white shadow-lg`.

## Component Architecture
- **Stateless Components**: Extract repetitive UI parts (e.g., icons, buttons, badges) into stateless functional components.
- **Form Controls**: Use `src/components/ui/Button.tsx`, `Tooltip.tsx`, `ConfirmModal.tsx` instead of creating new ones.
- **Icons**: Strictly use `lucide-react` for all iconography.

## Typography & Numbering
- **Fonts**: Use `font-th-sarabun` for print-friendly documents and `font-kanit` for standard UI text.
- **Thai Numerals**: The Royal Thai Navy requires Thai numbering in official prints. Use functions from `src/utils/thaiNumbering.ts` (e.g., `buildPrefix`, `toThaiAlphabet`).

## Error Handling
- Capture async Tauri invoke errors in `catch (err)` blocks.
- Report them securely using `import { logger } from '../../utils/logger';` and display them via `onAlert(msg, 'danger')` or an inline error state.
