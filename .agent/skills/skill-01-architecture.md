# Skill: Project Architecture Overview

## Objective
Provide an understanding of the PQS RTN Hybrid Storage project architecture to ensure all agents and developers maintain consistency across the codebase.

## Tech Stack
1. **Frontend**: React 18 (TypeScript), Tailwind CSS (custom github-style palette), Lucide React (Icons).
2. **Backend**: Rust via Tauri Framework.
3. **Database**: SQLite (via `rusqlite` crate in Rust).
4. **State Management**: React Hooks (`useState`, `useEffect`, `useMemo`) combined with Rust DB as the single source of truth.

## Project Philosophy (Hybrid Storage)
- **Rust as the Engine**: All file system operations, database queries (CRUD), and heavy data lifting must be written in Rust (`src-tauri/src/`).
- **React as the View**: The frontend (`src/`) should only handle UI rendering and user interactions. Data must be requested via Tauri `invoke`.
- **Single Source of Truth**: The `content.db` SQLite database is the ultimate authority. UI state should be optimistic but eventually synchronized with Rust.

## PQS Data Structure Standard
The system revolves around the PQS (Personnel Qualification Standard) for the Royal Thai Navy.
- **Section 100 (Fundamental)**: Basic knowledge. Green theme (`text-green-600`, `bg-green-50`).
- **Section 200 (System)**: Equipment and systems. Orange theme (`text-orange-600`, `bg-orange-50`).
- **Section 300 (Watchstation)**: Performance and qualification. Purple theme (`text-purple-600`, `bg-purple-50`).

## File Architecture
- `src/components/editor_v2/`: Core editing interfaces.
- `src/types/`: Shared TypeScript interfaces mapping exactly to Rust structs.
- `src-tauri/src/content_database/`: Core SQLite database logic for content.
- `src-tauri/src/commands/`: Tauri invoke handlers.
