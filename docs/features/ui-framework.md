# UI Framework & Layout

MainLayout with flexbox via Yoga. Responsive breakpoints for narrow/short terminals. Panel, Modal, SplitView primitives. Header, Footer, theming system with color schemes.

## Integration

Replace Dashboard.tsx layout with MainLayout. Panel components read `focusedPanel` from UI store (`src/store/ui.ts`) for focus styling. Modal reads `activeModal`/`modalData` and calls `closeModal()`. Theme colors from `src/config/defaults.ts` via useTheme hook. Atoms (StatusDot, Badge, ProgressBar) used by panel components in Phase 3.
