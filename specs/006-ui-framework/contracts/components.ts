/**
 * UI Framework Component Contracts
 *
 * TypeScript interfaces defining the public API for all UI framework components.
 * Implementation must conform to these contracts.
 *
 * Feature: 006-ui-framework
 */

import type { ReactNode, ReactElement } from 'react';

// =============================================================================
// Re-exported Types (from existing codebase)
// =============================================================================

/**
 * Panel navigation targets.
 * From: src/store/types.ts
 */
export type Panel =
  | 'topology'
  | 'subscriptions'
  | 'slots'
  | 'conflicts'
  | 'operations';

/**
 * Modal dialog types.
 * From: src/store/types.ts
 */
export type ModalType = 'help' | 'operations' | 'confirmation' | 'details';

/**
 * Modal configuration.
 * From: src/store/types.ts
 */
export interface ModalConfig {
  type: ModalType;
  title?: string;
  targetEntity?: string;
  nodeId?: string;
  data?: unknown;
}

/**
 * Theme color palette.
 * From: src/config/defaults.ts
 */
export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  critical: string;
  muted: string;
}

/**
 * Resolved theme configuration.
 * From: src/config/defaults.ts
 */
export interface ResolvedTheme {
  name: 'dark' | 'light' | 'custom';
  colors: ThemeColors;
}

// =============================================================================
// New Types
// =============================================================================

/**
 * Terminal size breakpoint categories.
 */
export type Breakpoint = 'standard' | 'narrow' | 'short' | 'compact';

/**
 * Terminal dimensions.
 */
export interface TerminalSize {
  columns: number;
  rows: number;
}

/**
 * Status indicator variants.
 */
export type StatusDotVariant =
  | 'success'
  | 'warning'
  | 'critical'
  | 'muted'
  | 'connecting';

/**
 * Badge styling variants.
 */
export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'critical'
  | 'muted';

// =============================================================================
// Atom Component Contracts
// =============================================================================

/**
 * StatusDot component props.
 *
 * Renders a colored status indicator: ● (filled), ◐ (half), ○ (empty)
 */
export interface StatusDotProps {
  /** Status variant determining color and symbol */
  variant: StatusDotVariant;
  /** Optional label displayed after the dot */
  label?: string;
}

/**
 * StatusDot component contract.
 */
export type StatusDotComponent = (props: StatusDotProps) => ReactElement;

/**
 * Badge component props.
 *
 * Renders a styled label like [text] with theme colors.
 */
export interface BadgeProps {
  /** Text content of the badge */
  label: string;
  /** Visual variant (default: 'primary') */
  variant?: BadgeVariant;
}

/**
 * Badge component contract.
 */
export type BadgeComponent = (props: BadgeProps) => ReactElement;

/**
 * ProgressBar component props.
 *
 * Renders a visual progress bar with optional percentage display.
 */
export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  percent: number;
  /** Bar width in characters (default: 20) */
  width?: number;
  /** Show percentage text (default: true) */
  showPercent?: boolean;
  /** Variant for color (default: 'primary') */
  variant?: 'primary' | 'success' | 'warning' | 'critical';
}

/**
 * ProgressBar component contract.
 */
export type ProgressBarComponent = (props: ProgressBarProps) => ReactElement;

/**
 * Spinner component props.
 *
 * Renders an animated loading indicator.
 */
export interface SpinnerProps {
  /** Optional label displayed after spinner */
  label?: string;
}

/**
 * Spinner component contract.
 */
export type SpinnerComponent = (props: SpinnerProps) => ReactElement;

// =============================================================================
// Layout Component Contracts
// =============================================================================

/**
 * Panel component props.
 *
 * Bordered container with title and focus state integration.
 */
export interface PanelProps {
  /** Panel identifier for focus matching */
  panelId: Panel;
  /** Display title in panel header */
  title: string;
  /** Optional status badges (e.g., "[3 active]") */
  badges?: string[];
  /** Panel content */
  children: ReactNode;
}

/**
 * Panel component contract.
 */
export type PanelComponent = (props: PanelProps) => ReactElement;

/**
 * Modal component props.
 *
 * Centered overlay dialog with focus trapping.
 */
export interface ModalProps {
  /** Modal configuration from store */
  config: ModalConfig;
  /** Close handler (calls store.closeModal) */
  onClose: () => void;
  /** Modal content */
  children?: ReactNode;
}

/**
 * Modal component contract.
 */
export type ModalComponent = (props: ModalProps) => ReactElement;

/**
 * SplitView component props.
 *
 * Divides space between two child components.
 */
export interface SplitViewProps {
  /** Split orientation */
  direction: 'horizontal' | 'vertical';
  /** First pane ratio (0-1, default: 0.5) */
  ratio?: number;
  /** Exactly two children */
  children: [ReactNode, ReactNode];
}

/**
 * SplitView component contract.
 */
export type SplitViewComponent = (props: SplitViewProps) => ReactElement;

/**
 * Header component props.
 *
 * Application header bar with title and status.
 */
export interface HeaderProps {
  /** Application title (default: "replmon") */
  title?: string;
  /** Show [pglogical] badge */
  showPglogicalBadge?: boolean;
  /** Additional status indicators */
  statusIndicators?: ReactNode;
}

/**
 * Header component contract.
 */
export type HeaderComponent = (props: HeaderProps) => ReactElement;

/**
 * Footer component props.
 *
 * Status bar with keyboard hints and context info.
 */
export interface FooterProps {
  /** Currently focused panel name */
  currentPanel?: Panel;
  /** Show last update timestamp */
  showTimestamp?: boolean;
  /** Override default keyboard hints */
  keyboardHints?: string;
}

/**
 * Footer component contract.
 */
export type FooterComponent = (props: FooterProps) => ReactElement;

/**
 * MainLayout component props.
 *
 * Root layout container with Header, content, and Footer.
 */
export interface MainLayoutProps {
  /** Custom header content (default: Header component) */
  header?: ReactNode;
  /** Custom footer content (default: Footer component) */
  footer?: ReactNode;
  /** Panel grid content */
  children: ReactNode;
}

/**
 * MainLayout component contract.
 */
export type MainLayoutComponent = (props: MainLayoutProps) => ReactElement;

// =============================================================================
// Theme Contracts
// =============================================================================

/**
 * ThemeProvider component props.
 */
export interface ThemeProviderProps {
  /** Resolved theme from configuration */
  theme: ResolvedTheme;
  /** Application content */
  children: ReactNode;
}

/**
 * ThemeProvider component contract.
 */
export type ThemeProviderComponent = (props: ThemeProviderProps) => ReactElement;

// =============================================================================
// Hook Contracts
// =============================================================================

/**
 * useTheme hook contract.
 *
 * Returns theme colors from ThemeContext.
 * Throws if used outside ThemeProvider.
 */
export type UseThemeHook = () => ThemeColors;

/**
 * useTerminalSize hook contract.
 *
 * Returns current terminal dimensions with debounced resize handling.
 */
export type UseTerminalSizeHook = () => TerminalSize;

/**
 * useBreakpoint hook contract.
 *
 * Returns current breakpoint based on terminal size.
 */
export type UseBreakpointHook = () => Breakpoint;
