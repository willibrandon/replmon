# Research: Lag Visualization

**Feature**: 011-lag-visualization
**Date**: 2025-12-25

## Research Tasks

### 1. Unicode Block Character Rendering in Ink

**Decision**: Use the standard Unicode block character set (▁▂▃▄▅▆▇█) with Ink's `<Text>` component.

**Rationale**:
- Unicode block characters (U+2581 to U+2588) are part of the "Block Elements" Unicode block
- These render correctly in all modern terminal emulators (iTerm2, Terminal.app, Alacritty, etc.)
- Ink's `<Text>` component handles Unicode correctly by default
- Each character represents 1/8th increments from empty to full block

**Alternatives Considered**:
- ASCII-only rendering (`_-=#`) - rejected: less visual resolution, 4 levels vs 8
- Braille patterns (⣿) - rejected: inconsistent font rendering, harder to interpret
- ANSI background colors - rejected: requires color support, less portable

**Implementation Pattern**:
```typescript
const BLOCK_CHARS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;
// Index 0 = empty (0%), Index 8 = full (100%)
// Quantize value 0-1 to index 0-8
const getBlock = (value: number): string => BLOCK_CHARS[Math.round(value * 8)];
```

### 2. Linear Scaling Algorithm

**Decision**: Use min-max linear scaling where height = (value - min) / (max - min).

**Rationale**:
- User specified linear scaling in clarification session
- Extreme spikes render at maximum height, normal values are proportionally compressed
- The y-axis indicator shows current max to provide context for interpretation
- This matches user mental model: "higher bar = more lag"

**Alternatives Considered**:
- Capped scaling (e.g., max 60s) - rejected per user preference
- Logarithmic scaling - rejected per user preference
- Percentile-based scaling - rejected: too complex, obscures actual values

**Implementation Pattern**:
```typescript
function normalizeValues(samples: LagSample[]): number[] {
  const values = samples.map(s => s.lagSeconds ?? s.lagBytes);
  const max = Math.max(...values);
  if (max === 0) return values.map(() => 0); // Flat line at bottom for zero lag
  return values.map(v => v / max);
}
```

### 3. Responsive Width Handling

**Decision**: Sparkline width adapts to modal width, with configurable minimum (20 chars) and maximum (60 chars).

**Rationale**:
- Modal width varies based on terminal size
- Need to downsample 300 samples to fit available width
- Fixed width would either waste space or be unreadable on small terminals

**Alternatives Considered**:
- Fixed width - rejected: poor UX on varying terminal sizes
- Full-width - rejected: modals have borders and padding

**Implementation Pattern**:
```typescript
function resampleData(samples: LagSample[], targetWidth: number): number[] {
  if (samples.length <= targetWidth) {
    return samples.map(s => s.lagSeconds ?? s.lagBytes);
  }
  // Downsample: average each bucket
  const bucketSize = samples.length / targetWidth;
  const result: number[] = [];
  for (let i = 0; i < targetWidth; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    const bucket = samples.slice(start, end);
    const avg = bucket.reduce((sum, s) => sum + (s.lagSeconds ?? s.lagBytes), 0) / bucket.length;
    result.push(avg);
  }
  return result;
}
```

### 4. Empty and Stale States

**Decision**: Use distinct visual indicators for empty data vs stale data.

**Rationale**:
- FR-007 requires empty state placeholder
- FR-008 requires stale visual indicator
- Users need to distinguish "no data yet" from "data stopped arriving"

**Alternatives Considered**:
- Same treatment for both - rejected: different operational meanings
- Hide sparkline entirely - rejected: loses temporal context

**Implementation Pattern**:
```typescript
// Empty state: "No lag data available"
// Stale state: Sparkline + Badge label="stale"
// Both use muted text color
```

### 5. Time Axis Labels

**Decision**: Display "-5m" on left edge and "now" on right edge. For partial data, show actual range (e.g., "-2m" to "now").

**Rationale**:
- FR-005 requires time axis labels
- Users correlate lag events with external events (deployments, traffic spikes)
- Simple labels are readable at a glance

**Alternatives Considered**:
- Numeric timestamps - rejected: too verbose, clutters UI
- Tick marks every minute - rejected: takes vertical space, overkill for sparkline
- No labels - rejected: violates FR-005

**Implementation Pattern**:
```typescript
function getTimeAxisLabels(sampleCount: number): { left: string; right: string } {
  const secondsOfData = sampleCount; // 1 sample per second
  if (secondsOfData >= 300) return { left: '-5m', right: 'now' };
  if (secondsOfData >= 60) return { left: `-${Math.floor(secondsOfData / 60)}m`, right: 'now' };
  return { left: `-${secondsOfData}s`, right: 'now' };
}
```

### 6. Y-Axis Max Indicator

**Decision**: Display current max value as "max: Xs" or "max: XKB" in muted text above or beside the sparkline.

**Rationale**:
- FR-006 requires y-axis indicator
- Without max context, linear scaling is misleading
- Tells user what "top of chart" means

**Alternatives Considered**:
- Vertical scale on left side - rejected: takes horizontal space
- Hover tooltip - rejected: not keyboard accessible
- Fixed scale - rejected: obscures detail in normal operation

**Implementation Pattern**:
```typescript
function formatMaxLabel(maxValue: number, hasSeconds: boolean): string {
  if (hasSeconds) {
    return maxValue < 60 ? `max: ${maxValue.toFixed(1)}s` : `max: ${(maxValue / 60).toFixed(1)}m`;
  }
  return `max: ${formatBytes(maxValue)}`;
}
```

## Key Decisions Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Block characters | ▁▂▃▄▅▆▇█ | Universal terminal support, 8 visual levels |
| Scaling | Linear, dynamic max | Per user clarification; spike shows at top |
| Width | Adaptive 20-60 chars | Fits modal across terminal sizes |
| Downsampling | Bucket averaging | Preserves trends when compressing 300→N |
| Empty state | "No lag data" text | Clear distinction from zero-lag |
| Stale state | Sparkline + badge | Preserves data, indicates freshness |
| Time axis | "-5m" / "now" labels | Simple, scannable, correlatable |
| Y-axis | "max: Xs" label | Provides scale context |
