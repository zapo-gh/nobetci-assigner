# Copilot Instructions for AI Agents

## Project Overview
This is a React + Vite application for managing and assigning teacher duties (nöbetçi) in a school context. The app supports:
- Import/export of teachers, classes, and absences via CSV (see `public/` for sample files)
- Automated and manual assignment of duties with fairness and constraints
- Visual editing (Kanban board, grid, assignment editor)
- Conflict detection, suggestions, and printable daily lists

## Architecture & Data Flow
- **Entry Point:** `src/App.jsx` manages data loading, state, and UI composition. All data flows through this component.
- **UI Components:** All major UI logic is in `src/components/` (e.g., `AssignmentEditor.jsx`, `KanbanBoard.jsx`, `ModernAvailabilityGrid.jsx`).
- **Assignment Algorithm:** Centralized in `src/utils/assignDuty.js`. Handles fairness, max duties per day, slot constraints, and locked assignments. Data flow: CSV → parsed in App → assignment algorithm → UI components.
- **State Management:** Uses React hooks (`useState`, `useMemo`, `useCallback`). No Redux or global state libraries.
- **Drag-and-Drop:** Custom logic for assignment editing in `AssignmentEditor.jsx` (not a third-party library).

## Developer Workflows
- **Start Dev Server:** `npm run dev` (Vite, hot reload)
- **Build for Production:** `npm run build`
- **Lint:** `npm run lint`
- **Preview Build:** `npm run preview`
- **No built-in tests** (add if needed)

## Project-Specific Conventions
- **CSV Format:** Input files must match expected columns (see `public/teachers.csv`, etc.).
- **Component Props:** Pass all required data as props; avoid global state or context.
- **Assignment Keys:** Use string keys in the format `day|period|classId` for mapping assignments/locks.
- **Fairness:** Assignment logic prioritizes teachers with fewer duties that day.
- **Localization:** Some code/comments are in Turkish; preserve variable names and comments unless refactoring for clarity.
- **External Libraries:** Uses `papaparse` for CSV, `xlsx` for Excel, and Vite plugins for React. No Redux, MobX, or similar state libraries.

## Key Files & Integration Points
- `src/App.jsx`: Main app logic, data flow, and state
- `src/utils/assignDuty.js`: Core assignment algorithm
- `src/components/`: All UI and interaction logic
- `public/teachers.csv`, `classes.csv`, `absents.csv`: Sample data formats

## Examples & Patterns
- **Assignment Algorithm:** See `assignDuty.js` for fairness logic and slot constraints. Example: assignment keys are always `day|period|classId` strings.
- **Component Data Flow:** All data is passed via props from `App.jsx` to child components. Example: `AssignmentEditor.jsx` receives assignments, teachers, and locks as props.
- **Drag-and-Drop:** Implemented manually in `AssignmentEditor.jsx` (not via external DnD libraries).

---
For new features, follow the established data flow and component patterns. When in doubt, review `App.jsx` and `assignDuty.js` for integration points. Use the sample CSVs in `public/` to validate data expectations.
