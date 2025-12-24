# Data Model: UI Framework & Layout

**Feature**: 006-ui-framework
**Date**: 2025-12-24
**Status**: Complete

## Overview

This document defines the data entities, types, and state shapes for the UI framework. Most types extend existing definitions in `src/store/types.ts` and `src/config/defaults.ts`.

## Existing Types (No Changes)

These types are already defined and will be used as-is:

### From `src/store/types.ts`

```typescript
// Panel navigation targets
type Panel = 'topology' | 'subscriptions' | 'slots' | 'conflicts' | 'operations';

// Modal dialog types
type ModalType = 'help' | 'operations' | 'confirmation' | 'details';

// Modal configuration
interface ModalConfig {
  type: ModalType;
  title?: string;
  targetEntity?: string;
  nodeId?: string;
  data?: unknown;
}
```

### From `src/config/defaults.ts`

```typescript
// Theme color palette
interface ThemeColors {
  background: string;  // Main background color (hex)
  foreground: string;  // Primary text color (hex)
  primary: string;     // Accent color for highlights (hex)
  secondary: string;   // Secondary accent color (hex)
  success: string;     // Healthy/OK state color (hex)
  warning: string;     // Warning state color (hex)
  critical: string;    // Critical/error state color (hex)
  muted: string;       // Dimmed/inactive text color (hex)
}

// Resolved theme configuration
interface ResolvedTheme {
  name: 'dark' | 'light' | 'custom';
  colors: ThemeColors;
}
```

## New Types

### Breakpoint

Represents terminal size classification for responsive layout.

```typescript
/**
 * Terminal size breakpoint categories.
 */
type Breakpoint = 'standard' | 'narrow' | 'short' | 'compact';
```

**Derivation Rules**:
- `compact`: columns < 100 AND rows < 30
- `narrow`: columns < 100 (and rows >= 30)
- `short`: rows < 30 (and columns >= 100)
- `standard`: columns >= 100 AND rows >= 30

### TerminalSize

Terminal dimension measurements.

```typescript
/**
 * Terminal dimensions in characters/lines.
 */
interface TerminalSize {
  columns: number;  // Terminal width in characters
  rows: number;     // Terminal height in lines
}
```

**Defaults** (when stdout unavailable):
- columns: 80
- rows: 24

### StatusDotVariant

Status indicator visual variants.

```typescript
/**
 * Visual status for StatusDot component.
 */
type StatusDotVariant = 'success' | 'warning' | 'critical' | 'muted' | 'connecting';
```

**Character Mapping**:
- `success`: ● (filled circle, theme.success color)
- `warning`: ◐ (half circle, theme.warning color)
- `critical`: ● (filled circle, theme.critical color)
- `muted`: ○ (empty circle, theme.muted color)
- `connecting`: ◐ (half circle, theme.warning color, animated)

### BadgeVariant

Badge styling variants.

```typescript
/**
 * Visual variant for Badge component.
 */
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'critical' | 'muted';
```

**Rendering**: `[text]` with color from theme based on variant.

### PanelProps

Panel component properties.

```typescript
/**
 * Props for the Panel layout component.
 */
interface PanelProps {
  panelId: Panel;           // Which panel this is
  title: string;            // Display title
  badges?: string[];        // Optional status badges
  children: React.ReactNode; // Panel content
}
```

### ModalProps

Modal component properties.

```typescript
/**
 * Props for the Modal layout component.
 */
interface ModalProps {
  config: ModalConfig;       // Modal configuration from store
  onClose: () => void;       // Close handler (calls store.closeModal)
  children?: React.ReactNode; // Modal content
}
```

### SplitViewProps

Split view component properties.

```typescript
/**
 * Props for the SplitView layout component.
 */
interface SplitViewProps {
  direction: 'horizontal' | 'vertical';  // Split orientation
  ratio?: number;                         // First pane ratio (0-1), default 0.5
  children: [React.ReactNode, React.ReactNode]; // Exactly two children
}
```

### HeaderProps

Header component properties.

```typescript
/**
 * Props for the Header layout component.
 */
interface HeaderProps {
  title?: string;            // App title, default "replmon"
  showPglogicalBadge?: boolean; // Show [pglogical] badge
  statusIndicators?: React.ReactNode; // Optional status content
}
```

### FooterProps

Footer component properties.

```typescript
/**
 * Props for the Footer layout component.
 */
interface FooterProps {
  currentPanel?: Panel;      // Currently focused panel name
  showTimestamp?: boolean;   // Show last update timestamp
  keyboardHints?: string;    // Override default keyboard hints
}
```

### MainLayoutProps

Main layout component properties.

```typescript
/**
 * Props for the MainLayout container component.
 */
interface MainLayoutProps {
  header?: React.ReactNode;   // Custom header content
  footer?: React.ReactNode;   // Custom footer content
  children: React.ReactNode;  // Panel grid content
}
```

## State Relationships

### Theme Flow

```
YAML config (theme section)
    ↓
ConfigLoader (resolves to ResolvedTheme)
    ↓
App.tsx (passes to ThemeProvider)
    ↓
ThemeProvider (provides via ThemeContext)
    ↓
useTheme() hook (returns ThemeColors)
    ↓
Components (use colors for styling)
```

### Focus State Flow

```
Zustand UI Store
├── focusedPanel: Panel
├── previousFocusedPanel: Panel | null
├── activeModal: ModalType | null
└── modalData: ModalConfig | null

MainLayout reads:
├── focusedPanel → passes isFocused to each Panel
├── activeModal → conditional Modal rendering
└── modalData → Modal content configuration

Panel reads:
├── isFocused prop → border/title styling
└── panelId → matches against focusedPanel
```

### Breakpoint Flow

```
process.stdout.columns / rows
    ↓
useTerminalSize hook (debounced)
    ↓
useBreakpoint hook (derives breakpoint)
    ↓
MainLayout (selects layout variant)
├── standard → 2-column grid
├── narrow → 1-column stack
├── short → reduced chrome
└── compact → single panel + tabs
```

## Validation Rules

### Theme Colors
- All color values must be valid 6-digit hex (e.g., `#00BFFF`)
- Invalid colors fall back to default theme colors
- Theme name must be 'dark', 'light', or 'custom'

### Terminal Size
- Minimum supported: 40 columns x 10 rows
- Below minimum: display "Terminal too small" message
- Maximum: no upper limit (layout scales with flexbox)

### Panel Navigation
- Panel must be one of the 5 defined values
- Tab cycling wraps around (operations → topology)
- Modal open blocks panel navigation

## Entity Relationships Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    ThemeProvider                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │                   MainLayout                     │  │  │
│  │  │  ┌──────────┐ ┌────────────────────┐ ┌────────┐ │  │  │
│  │  │  │  Header  │ │     PanelGrid      │ │ Footer │ │  │  │
│  │  │  │ ┌Badge┐  │ │ ┌─────┐  ┌─────┐   │ │        │ │  │  │
│  │  │  └──┴─────┴──┘ │ │Panel│  │Panel│   │ └────────┘ │  │  │
│  │  │                │ │  ↓  │  │  ↓  │   │            │  │  │
│  │  │                │ │Dots │  │Bars │   │            │  │  │
│  │  │                │ └─────┘  └─────┘   │            │  │  │
│  │  │                └────────────────────┘            │  │  │
│  │  │  ┌──────────────────────────────────────────┐   │  │  │
│  │  │  │             Modal (overlay)               │   │  │  │
│  │  │  │  ┌─────────────────────────────────────┐ │   │  │  │
│  │  │  │  │           Modal Content              │ │   │  │  │
│  │  │  │  └─────────────────────────────────────┘ │   │  │  │
│  │  │  └──────────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

Legend:
- ThemeProvider: Provides ThemeContext with ResolvedTheme
- MainLayout: Container with Header, content, Footer
- Panel: Bordered container with focus state
- Badge: Inline label ([pglogical], [3 active])
- Dots: StatusDot atoms for status indication
- Bars: ProgressBar atoms for metrics
- Modal: Overlay dialog when activeModal !== null
```
