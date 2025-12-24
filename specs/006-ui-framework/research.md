# Research: UI Framework & Layout

**Feature**: 006-ui-framework
**Date**: 2025-12-24
**Status**: Complete

## Overview

This document captures research findings for implementing the UI framework. All technical decisions align with the existing replmon stack (Ink 5.x, React 18.x, Zustand).

## Research Topics

### 1. Ink Flexbox Layout Patterns

**Decision**: Use Ink's built-in Box component with Yoga flexbox for all layout.

**Rationale**:
- Ink 5.x uses Yoga (same layout engine as React Native) internally
- Box component supports all standard flexbox properties: `flexDirection`, `flexGrow`, `flexShrink`, `alignItems`, `justifyContent`
- No additional dependencies needed; works out of the box

**Alternatives Considered**:
- Custom layout calculation: Rejected - reinventing what Yoga already provides
- Grid-based layout library: Rejected - no mature options for Ink; flexbox sufficient

**Key Patterns**:
```tsx
// Column layout
<Box flexDirection="column">...</Box>

// Row with flexible children
<Box flexDirection="row">
  <Box flexGrow={1}>...</Box>  // Takes remaining space
  <Box width={20}>...</Box>     // Fixed width
</Box>

// Centered content
<Box alignItems="center" justifyContent="center">...</Box>
```

### 2. Terminal Size Detection

**Decision**: Use `process.stdout.columns` and `process.stdout.rows` with resize event listener.

**Rationale**:
- Standard Node.js API, works in all terminals
- `resize` event fires when terminal is resized
- Ink automatically re-renders on size change, but we need breakpoint logic

**Alternatives Considered**:
- `term-size` package: Rejected - unnecessary dependency for simple task
- Ink's `useStdout` hook: Provides stdout but still need manual dimension reading

**Implementation Pattern**:
```tsx
// useTerminalSize hook
const [size, setSize] = useState({
  columns: process.stdout.columns ?? 80,
  rows: process.stdout.rows ?? 24
});

useEffect(() => {
  const handleResize = debounce(() => {
    setSize({
      columns: process.stdout.columns ?? 80,
      rows: process.stdout.rows ?? 24
    });
  }, 100);

  process.stdout.on('resize', handleResize);
  return () => process.stdout.off('resize', handleResize);
}, []);
```

### 3. Debounce Strategy for Resize Events

**Decision**: 100ms debounce using simple setTimeout/clearTimeout pattern.

**Rationale**:
- Prevents layout thrashing during continuous resize
- 100ms is imperceptible to users but prevents excessive re-renders
- No external library needed for simple debounce

**Alternatives Considered**:
- `lodash.debounce`: Rejected - unnecessary dependency for single use case
- `use-debounce` hook: Rejected - can implement inline with useCallback

**Implementation**:
```tsx
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timeoutId: NodeJS.Timeout | undefined;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}
```

### 4. Theme Context Pattern

**Decision**: React Context with custom hook for type-safe theme access.

**Rationale**:
- Standard React pattern, familiar to developers
- Provides theme colors at any component depth without prop drilling
- Integrates with existing `ResolvedTheme` and `ThemeColors` types

**Alternatives Considered**:
- Zustand for theme: Rejected - theme is static per session, context sufficient
- CSS variables: N/A - Ink uses inline styles, no CSS support
- Prop drilling: Rejected - verbose, couples components to parent

**Implementation Pattern**:
```tsx
// ThemeContext.ts
const ThemeContext = createContext<ResolvedTheme | null>(null);

// ThemeProvider.tsx
export function ThemeProvider({ theme, children }: Props) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// useTheme.ts
export function useTheme(): ThemeColors {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within ThemeProvider');
  return theme.colors;
}
```

### 5. Panel Focus Visual Feedback

**Decision**: Use Ink's `borderStyle` and `borderColor` props with theme-derived colors.

**Rationale**:
- Ink Box supports `borderStyle`: 'single', 'double', 'round', 'bold', 'singleDouble', 'doubleSingle', 'classic'
- `borderColor` accepts hex colors (from theme)
- Clear visual distinction between focused (bold/primary) and unfocused (single/muted)

**Alternatives Considered**:
- ASCII art borders: Rejected - Ink handles border rendering
- Background color change: Could be added but borders are primary indicator

**Implementation Pattern**:
```tsx
const { colors } = useTheme();
const borderStyle = isFocused ? 'bold' : 'single';
const borderColor = isFocused ? colors.primary : colors.muted;

<Box borderStyle={borderStyle} borderColor={borderColor}>
  <Text bold={isFocused} color={isFocused ? colors.primary : colors.muted}>
    {title}
  </Text>
  {children}
</Box>
```

### 6. Modal Overlay Pattern in Ink

**Decision**: Absolute positioning with full-screen Box and centered content.

**Rationale**:
- Ink doesn't support true layering, but we can render modal after main content
- Use `position="absolute"` (if supported) or conditional rendering order
- Dimming effect via muted text color on background content (simulated)

**Alternatives Considered**:
- z-index layering: Not supported in Ink
- Portal pattern: Not needed - single render tree

**Implementation Pattern**:
```tsx
// In MainLayout, render modal last (on top)
<Box flexDirection="column">
  <Header />
  <PanelGrid />
  <Footer />
  {activeModal && (
    <Box position="absolute" width="100%" height="100%">
      <Modal config={modalData} onClose={closeModal} />
    </Box>
  )}
</Box>
```

**Note**: Ink 5.x doesn't support `position="absolute"` directly. Alternative approach:
- Render modal conditionally and use `useInput` to trap keyboard
- Modal takes full screen, replacing panel grid content
- This matches common TUI patterns (vim help, htop dialogs)

**Revised Pattern**:
```tsx
// Render either panels or modal, not both simultaneously visible
{activeModal ? (
  <Modal config={modalData} onClose={closeModal} />
) : (
  <PanelGrid>{/* panels */}</PanelGrid>
)}
```

### 7. Keyboard Handler Unification

**Decision**: Single `useInput` in MainLayout with modal state check.

**Rationale**:
- Ink's `useInput` is the standard keyboard handling hook
- Central handler prevents conflicts between components
- Modal state determines which keys are active

**Alternatives Considered**:
- Per-component useInput: Leads to conflicts, harder to manage
- External keyboard library: Unnecessary - useInput is sufficient

**Implementation Pattern**:
```tsx
useInput((input, key) => {
  // If modal is open, only handle modal keys
  if (activeModal) {
    if (key.escape) closeModal();
    return; // Block all other input
  }

  // Panel navigation
  if (input === 't') setFocusedPanel('topology');
  if (input === 's') setFocusedPanel('subscriptions');
  // ... etc
  if (key.tab) key.shift ? focusPreviousPanel() : focusNextPanel();
  if (input === 'j') selectNext();
  if (input === 'k') selectPrevious();
  if (input === '?') openModal({ type: 'help' });
  if (input === 'q') exitApp(0);
});
```

### 8. Responsive Breakpoint Strategy

**Decision**: Four breakpoints based on terminal dimensions.

**Rationale**:
- Standard (≥100x30): Full 2-column layout with all chrome
- Narrow (<100 cols): Single column stacked panels
- Short (<30 rows): Reduced padding, abbreviated footer
- Compact (<100 cols AND <30 rows): Minimal chrome, single panel with tabs

**Alternatives Considered**:
- CSS media queries: N/A - Ink uses terminal dimensions, not viewport
- Continuous scaling: Rejected - discrete breakpoints easier to design for

**Implementation Pattern**:
```tsx
type Breakpoint = 'standard' | 'narrow' | 'short' | 'compact';

function useBreakpoint(): Breakpoint {
  const { columns, rows } = useTerminalSize();

  if (columns < 100 && rows < 30) return 'compact';
  if (columns < 100) return 'narrow';
  if (rows < 30) return 'short';
  return 'standard';
}
```

### 9. Atom Component Patterns

**Decision**: Stateless functional components with theme colors as props or via useTheme.

**StatusDot**:
- Props: `status: 'success' | 'warning' | 'critical' | 'muted'`
- Renders: ● (filled), ◐ (half), ○ (empty) based on status
- Color from theme

**Badge**:
- Props: `label: string`, `variant?: 'primary' | 'secondary' | 'muted'`
- Renders: `[label]` with appropriate color
- Used for mode indicators, counts

**ProgressBar**:
- Props: `percent: number`, `width?: number`
- Renders: `[████░░░░░░] 45%` style bar
- Uses theme.primary for filled, theme.muted for empty

**Spinner**:
- Uses Ink's built-in `Spinner` component from `ink-spinner` or custom frames
- Renders: ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ (braille spinner)
- Ink provides this pattern built-in

### 10. Existing Code Integration

**Decision**: Incremental migration with backwards compatibility.

**StatusBar.tsx → Footer**:
- Copy all StatusBar logic into Footer
- Footer adds: keyboard hints based on context, current panel name, timestamp
- Delete StatusBar.tsx after migration

**Dashboard.tsx → MainLayout + Panels**:
- Extract TopologyNode to TopologyPanel
- Replace inline Box layout with MainLayout
- Preserve useInput logic (move to MainLayout)

**App.tsx**:
- Wrap existing content with ThemeProvider
- Pass config.theme to ThemeProvider
- No other changes needed

## Summary

All research topics resolved. No external dependencies required beyond existing stack. Implementation will follow established React/Ink patterns with theme context, responsive hooks, and component composition.
