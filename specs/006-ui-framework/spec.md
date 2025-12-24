# Feature Specification: UI Framework & Layout

**Feature Branch**: `006-ui-framework`
**Created**: 2025-12-24
**Status**: Draft
**Input**: User description: "UI Framework & Layout - MainLayout with flexbox via Yoga, responsive breakpoints, Panel/Modal/SplitView primitives, Header/Footer, theming system"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Responsive Dashboard Layout (Priority: P1)

A system administrator launches replmon in their terminal and sees a well-organized dashboard with clear visual hierarchy. The application automatically adapts to their terminal size, showing all panels in an optimal arrangement. When they resize their terminal or work on a smaller laptop screen, the layout reorganizes to remain usable.

**Why this priority**: The layout is the foundation for all user interaction - without a working responsive layout, no other features can be properly displayed.

**Independent Test**: Can be fully tested by launching the app in terminals of various sizes (80x24, 120x40, narrow 60x24) and verifying all content remains visible and usable.

**Acceptance Scenarios**:

1. **Given** a standard terminal (≥100 columns, ≥30 rows), **When** the user launches replmon, **Then** the layout displays with Header, main content area with panels, and Footer in a visually balanced arrangement.
2. **Given** a narrow terminal (<100 columns), **When** the user launches replmon, **Then** the layout switches to a stacked vertical arrangement with panels in a single column.
3. **Given** a short terminal (<30 rows), **When** the user launches replmon, **Then** the layout compacts vertical spacing and may hide or abbreviate Footer content.
4. **Given** a running application, **When** the user resizes their terminal, **Then** the layout re-renders appropriately within one visual update cycle.

---

### User Story 2 - Panel Focus and Visual Feedback (Priority: P1)

A system administrator navigates between panels using keyboard shortcuts (t/s/l/c/o) or Tab key. The currently focused panel is visually distinct with a highlighted border and title. Unfocused panels remain visible but visually recede.

**Why this priority**: Panel navigation is the core interaction model - users must clearly see which panel has focus before they can interact with it.

**Independent Test**: Can be fully tested by launching the app, pressing different panel shortcuts, and verifying visual focus indicators update correctly.

**Acceptance Scenarios**:

1. **Given** the dashboard is displayed, **When** the user presses 't', **Then** the Topology panel shows a highlighted border and focused styling.
2. **Given** the Topology panel is focused, **When** the user presses Tab, **Then** focus moves to Subscriptions panel with updated visual indicators.
3. **Given** any panel is focused, **When** the user views the panel header, **Then** it displays the panel name and any relevant status badges.
4. **Given** the dashboard is displayed, **When** the user observes unfocused panels, **Then** they display with muted/dimmed borders but content remains readable.

---

### User Story 3 - Modal Overlay Display (Priority: P2)

A system administrator opens a modal (help, operations, confirmation, details) and it appears centered over the current content. The modal traps focus, the background is visually dimmed, and the user can close it to return to the previous focus state.

**Why this priority**: Modals are essential for help documentation, confirmation dialogs, and detailed views, but the dashboard layout must work first.

**Independent Test**: Can be fully tested by pressing '?' to open help modal, verifying overlay appearance, then pressing Escape to close and confirm focus restoration.

**Acceptance Scenarios**:

1. **Given** the dashboard is displayed, **When** the user opens a modal, **Then** it appears centered with a distinct border and the background content is visually dimmed.
2. **Given** a modal is open, **When** the user presses Escape or the close action, **Then** the modal closes and focus returns to the previously focused panel.
3. **Given** a modal is open, **When** the user attempts to navigate panels, **Then** the navigation is blocked until the modal is closed.
4. **Given** the terminal is narrow, **When** a modal opens, **Then** the modal width adapts to fit within the available space with appropriate padding.

---

### User Story 4 - Theme Color Application (Priority: P2)

A system administrator uses replmon with their preferred color scheme (dark or light). All UI components consistently apply theme colors: borders, text, status indicators, highlights, and backgrounds follow the configured theme.

**Why this priority**: Consistent theming improves readability and accessibility, but basic layout must work before theming can be applied.

**Independent Test**: Can be fully tested by launching with dark theme, verifying color consistency, then switching config to light theme and re-launching.

**Acceptance Scenarios**:

1. **Given** the dark theme is configured (default), **When** the dashboard displays, **Then** all components use dark theme colors (dark background, light text, cyan primary accent).
2. **Given** the light theme is configured, **When** the dashboard displays, **Then** all components use light theme colors (light background, dark text, blue primary accent).
3. **Given** any theme, **When** the user views status indicators, **Then** success/warning/critical colors are applied consistently from the theme palette.
4. **Given** the theme configuration includes custom color overrides, **When** the application renders, **Then** custom colors take precedence over default theme values.

---

### User Story 5 - SplitView Layout for Detail Views (Priority: P3)

A system administrator selects an item in a panel (node, subscription, slot) and a detail view opens in a split pane, showing detailed information alongside the list view.

**Why this priority**: SplitView enhances information density but requires basic panels and modals working first.

**Independent Test**: Can be fully tested by selecting an item in a panel and verifying the split view appears with detail content.

**Acceptance Scenarios**:

1. **Given** an item is selected in a panel, **When** the user opens details (Enter key), **Then** a vertical split view shows the list on one side and details on the other.
2. **Given** a split view is active, **When** the user navigates the list, **Then** the detail pane updates to show the newly selected item.
3. **Given** a narrow terminal, **When** a split view is requested, **Then** it may stack vertically or show as a modal overlay based on available space.
4. **Given** a split view is active, **When** the user presses Escape, **Then** the split view closes and the full panel view is restored.

---

### Edge Cases

- What happens when terminal is extremely small (e.g., 40x10)? Display a "terminal too small" message with minimum dimension requirements.
- How does system handle rapid resize events? Debounce resize handling to prevent excessive re-renders (≤100ms debounce).
- What happens when theme colors are invalid hex values? Fall back to default theme colors and log a warning.
- How does the layout behave with 0 nodes configured? Show empty state message in Topology panel, other panels remain visible.
- What happens when modal content exceeds modal height? Enable vertical scrolling within the modal content area.

## Requirements *(mandatory)*

### Functional Requirements

**Layout Components**

- **FR-001**: System MUST provide a `MainLayout` component that organizes Header, main content area, and Footer using flexbox layout.
- **FR-002**: System MUST provide a `Panel` component that displays a bordered container with title, optional status indicators, and content area.
- **FR-003**: System MUST provide a `Modal` component that renders as a centered overlay with backdrop dimming and focus trapping.
- **FR-004**: System MUST provide a `SplitView` component that divides available space between two child components (horizontal or vertical split).
- **FR-005**: System MUST provide a `Header` component that displays application title, current view context, and global status indicators.
- **FR-006**: System MUST provide a `Footer` component that displays keyboard shortcut hints, current panel name, and timestamp.

**Atom Components**

- **FR-007**: System MUST provide a `StatusDot` component that renders a colored indicator (●/◐/○) based on health status using theme colors.
- **FR-008**: System MUST provide a `Badge` component that renders a styled label (e.g., "[pglogical]", "[stale]") using theme colors.
- **FR-009**: System MUST provide a `ProgressBar` component that renders a visual progress indicator with percentage or value display.
- **FR-010**: System MUST provide a `Spinner` component that renders an animated loading indicator.

**Responsive Behavior**

- **FR-011**: System MUST detect terminal dimensions on startup and on resize events.
- **FR-012**: System MUST define breakpoints: narrow (<100 columns), short (<30 rows), standard (≥100x30).
- **FR-013**: System MUST switch layout arrangement based on breakpoints (side-by-side vs stacked panels).
- **FR-014**: System MUST debounce resize events with ≤100ms delay to prevent excessive re-renders.

**Theme System**

- **FR-015**: System MUST provide a `useTheme` hook that returns the current resolved theme colors from configuration.
- **FR-016**: System MUST support dark theme (default), light theme, and custom theme color overrides.
- **FR-017**: System MUST apply theme colors consistently across all components (borders, text, backgrounds, status indicators).
- **FR-018**: Theme colors MUST use the existing `ThemeColors` interface from configuration.

### Key Entities *(data involved)*

- **ThemeColors**: Color palette containing background, foreground, primary, secondary, success, warning, critical, muted hex values.
- **Panel**: Union type of 'topology' | 'subscriptions' | 'slots' | 'conflicts' | 'operations'.
- **ModalConfig**: Configuration object with type, title, targetEntity, nodeId, and data fields.
- **Breakpoint**: Derived from terminal dimensions - determines layout mode (narrow, short, standard).

## Clarifications

### Session 2025-12-24

- Q: Should StatusBar.tsx be merged into Footer or kept as a separate component? → A: Merge StatusBar logic into Footer (delete StatusBar.tsx)

## Integration Instructions *(mandatory)*

This section provides step-by-step instructions for integrating the UI framework into the existing replmon application. These instructions are critical for implementation.

### File Organization

New components MUST be organized as follows:

```
src/
├── components/
│   ├── atoms/                    # Small, reusable UI primitives
│   │   ├── StatusDot.tsx         # Colored status indicator (●/◐/○)
│   │   ├── Badge.tsx             # Styled label component
│   │   ├── ProgressBar.tsx       # Visual progress indicator
│   │   ├── Spinner.tsx           # Animated loading indicator
│   │   └── index.ts              # Barrel export for atoms
│   ├── layout/                   # Layout container components
│   │   ├── MainLayout.tsx        # Root layout with Header/Footer
│   │   ├── Panel.tsx             # Bordered panel with focus state
│   │   ├── Modal.tsx             # Centered overlay dialog
│   │   ├── SplitView.tsx         # Dual-pane split layout
│   │   ├── Header.tsx            # Application header bar
│   │   ├── Footer.tsx            # Status bar with shortcuts
│   │   └── index.ts              # Barrel export for layout
│   ├── panels/                   # Domain-specific panel content (Phase 3)
│   │   ├── TopologyPanel.tsx     # Node topology display
│   │   ├── SubscriptionsPanel.tsx
│   │   ├── SlotsPanel.tsx
│   │   ├── ConflictsPanel.tsx
│   │   └── index.ts
│   └── ... existing files
├── hooks/
│   ├── useTheme.ts               # Theme context consumer hook
│   ├── useTerminalSize.ts        # Terminal dimensions with resize
│   └── useBreakpoint.ts          # Responsive breakpoint detection
├── theme/
│   ├── ThemeProvider.tsx         # React context provider
│   ├── ThemeContext.ts           # Context definition
│   └── index.ts                  # Barrel export
└── ... existing files
```

### Component Hierarchy

The component tree MUST be structured as follows:

```
App.tsx
└── ThemeProvider (wraps entire app, provides theme context)
    └── Box (fullscreen container)
        ├── ConnectionStatus (when currentScreen === 'connection-status')
        └── MainLayout (when currentScreen === 'dashboard')
            ├── Header
            │   ├── App title: "replmon"
            │   ├── Mode badge: Badge with "[pglogical]" when enabled
            │   └── Global status indicators
            ├── PanelGrid (main content area)
            │   ├── Panel (topology) ← reads focusedPanel from store
            │   │   └── TopologyPanel content (or placeholder initially)
            │   ├── Panel (subscriptions)
            │   ├── Panel (slots)
            │   ├── Panel (conflicts)
            │   └── Panel (operations)
            ├── Modal (conditional, when activeModal !== null)
            │   └── Modal content based on modalData.type
            └── Footer
                ├── Keyboard hints: "t:topology s:subs l:slots c:conflicts o:ops ?:help q:quit"
                ├── Current panel name
                └── Last update timestamp
```

### Theme Provider Wiring

1. **Create ThemeContext** (`src/theme/ThemeContext.ts`):
   - Define a context that holds `ResolvedTheme` from `src/config/defaults.ts`
   - Export the context and a custom hook `useThemeContext`

2. **Create ThemeProvider** (`src/theme/ThemeProvider.tsx`):
   - Accept `theme: ResolvedTheme` as a prop (from config)
   - Provide theme to all children via context
   - Wrap the entire app in `App.tsx`

3. **Create useTheme hook** (`src/hooks/useTheme.ts`):
   - Consume `ThemeContext` and return `ThemeColors`
   - Provide convenient accessors: `colors.primary`, `colors.success`, etc.
   - Components call `const { colors } = useTheme()` to access theme

4. **Wire in App.tsx**:
   - Import ThemeProvider
   - Wrap the existing Box with ThemeProvider
   - Pass `config.theme` (resolved theme from YAML config) as prop
   - Theme flows: YAML config → ConfigLoader → App.tsx → ThemeProvider → useTheme() in components

### Dashboard.tsx Replacement

The existing `Dashboard.tsx` MUST be refactored as follows:

1. **Before** (current structure):
   ```
   Dashboard
   ├── Box (column, padding)
   │   ├── Box (Topology header with border)
   │   ├── Box (node list)
   │   └── Box (monitoring status text)
   └── useInput handler (q to quit)
   ```

2. **After** (new structure):
   ```
   Dashboard
   └── MainLayout
       ├── Header (app title, pglogical badge, status)
       ├── PanelGrid
       │   ├── Panel title="Topology" panelId="topology"
       │   │   └── TopologyContent (existing node list logic)
       │   ├── Panel title="Subscriptions" panelId="subscriptions"
       │   │   └── (placeholder or SubscriptionsPanel)
       │   ├── Panel title="Slots" panelId="slots"
       │   ├── Panel title="Conflicts" panelId="conflicts"
       │   └── Panel title="Operations" panelId="operations"
       ├── Modal (conditional)
       └── Footer
   ```

3. **Keyboard handling migration**:
   - Move `useInput` from Dashboard to MainLayout or a dedicated `useKeyboardNavigation` hook
   - Panel shortcuts (t/s/l/c/o) call `store.setFocusedPanel(panel)`
   - Tab/Shift+Tab call `store.focusNextPanel()` / `store.focusPreviousPanel()`
   - j/k call `store.selectNext()` / `store.selectPrevious()`
   - Escape when modal open calls `store.closeModal()`
   - '?' opens help modal via `store.openModal({ type: 'help' })`

### Panel Component Store Integration

Each Panel component MUST integrate with the UI store as follows:

1. **Reading focus state**:
   ```
   // Inside Panel component
   const focusedPanel = useStore(state => state.focusedPanel)
   const isFocused = focusedPanel === panelId
   ```

2. **Applying focus styling**:
   ```
   const { colors } = useTheme()
   const borderColor = isFocused ? colors.primary : colors.muted
   const titleStyle = isFocused ? { bold: true, color: colors.primary } : { color: colors.muted }
   ```

3. **Panel component props**:
   - `panelId: Panel` - which panel this is ('topology', 'subscriptions', etc.)
   - `title: string` - display title for the panel header
   - `badges?: string[]` - optional badges to show (e.g., "[3 active]")
   - `children: React.ReactNode` - panel content

4. **Border styles**:
   - Focused panel: `borderStyle="bold"` or `borderStyle="double"`, border color = `primary`
   - Unfocused panel: `borderStyle="single"`, border color = `muted`

### Modal Component Store Integration

The Modal component MUST integrate with the UI store as follows:

1. **Reading modal state**:
   ```
   const activeModal = useStore(state => state.activeModal)
   const modalData = useStore(state => state.modalData)
   const closeModal = useStore(state => state.closeModal)
   ```

2. **Conditional rendering**:
   - Modal renders only when `activeModal !== null`
   - Modal content determined by `modalData.type`: 'help' | 'operations' | 'confirmation' | 'details'

3. **Keyboard handling inside Modal**:
   - Escape key calls `closeModal()`
   - Other navigation keys (t/s/l/c/o/Tab) are blocked while modal is open
   - Modal-specific keys handled within modal (e.g., Enter to confirm)

4. **Focus restoration**:
   - When `closeModal()` is called, the store action already handles restoring `focusedPanel` from `previousFocusedPanel`
   - Modal component just needs to call `closeModal()`, focus restoration is automatic

### Atom Component Usage in Panels

Atom components MUST be used in panel content as follows:

1. **StatusDot** usage:
   - TopologyPanel: Show node connection status (connected=success, connecting=warning, failed=critical)
   - SlotsPanel: Show slot active status
   - SubscriptionsPanel: Show subscription sync state

2. **Badge** usage:
   - Header: "[pglogical]" mode indicator (when `pglogicalMode === true`)
   - Panel headers: Count badges like "[3 active]", "[stale]"
   - TopologyPanel: Node role badges

3. **ProgressBar** usage:
   - SlotsPanel: WAL retention percentage
   - SubscriptionsPanel: Sync progress when applicable

4. **Spinner** usage:
   - ConnectionStatus: While connecting to nodes
   - Any panel: While loading initial data

### Terminal Size Detection

1. **Create useTerminalSize hook** (`src/hooks/useTerminalSize.ts`):
   - Use `process.stdout.columns` and `process.stdout.rows` for initial size
   - Subscribe to `process.stdout.on('resize', ...)` for updates
   - Return `{ columns: number, rows: number }`
   - Debounce resize events by 100ms to prevent excessive re-renders

2. **Create useBreakpoint hook** (`src/hooks/useBreakpoint.ts`):
   - Consume `useTerminalSize`
   - Return current breakpoint: `'standard' | 'narrow' | 'short' | 'compact'`
   - Breakpoint logic:
     - `narrow`: columns < 100
     - `short`: rows < 30
     - `compact`: columns < 100 AND rows < 30
     - `standard`: columns >= 100 AND rows >= 30

3. **MainLayout uses breakpoint**:
   - `standard`: 2-column panel grid (topology+subscriptions left, slots+conflicts+operations right)
   - `narrow`: 1-column stacked panels
   - `short`: Reduced padding, abbreviated footer
   - `compact`: Minimal chrome, single visible panel with tabs

### Existing Code Preservation

1. **StatusBar.tsx**: Merge into Footer component and delete StatusBar.tsx
   - Move all StatusBar logic (keyboard hints display, status text) into Footer component
   - Remove StatusBar.tsx after migration is complete
   - Update any imports that reference StatusBar

2. **ConnectionStatus.tsx**: No changes required
   - Continues to render when `currentScreen === 'connection-status'`
   - ThemeProvider wraps it, so it can use `useTheme()` for consistent styling

3. **TopologyNode in Dashboard.tsx**: Extract to TopologyPanel
   - Move the `TopologyNode` sub-component to `src/components/panels/TopologyPanel.tsx`
   - Use `StatusDot` instead of inline status icon logic
   - Use theme colors instead of hardcoded 'green', 'yellow', 'gray'

4. **Store hooks**: No changes to store structure
   - `useConnectionStore` continues to work
   - `useStore` (from replication/UI slices) continues to work
   - Components just add `useTheme()` for colors

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see all five panels (Topology, Subscriptions, Slots, Conflicts, Operations) arranged visibly on standard terminals (≥100x30) without horizontal scrolling.
- **SC-002**: Layout correctly adapts within 100ms when terminal is resized between standard and narrow/short dimensions.
- **SC-003**: Users can navigate between all panels using keyboard (Tab, Shift+Tab, t/s/l/c/o) with immediate visual feedback on focus change.
- **SC-004**: Modals open centered over content and close with focus correctly restored to the previous panel 100% of the time.
- **SC-005**: Dark and light themes render all UI elements with correct, consistent colors as defined in ThemeColors.
- **SC-006**: Atom components (StatusDot, Badge, ProgressBar, Spinner) render correctly in all panel contexts.
- **SC-007**: Application remains responsive during layout transitions with no visible flicker or delay perceptible to users.
- **SC-008**: Integration with existing Dashboard.tsx is complete - old inline layout code is fully replaced by MainLayout.
