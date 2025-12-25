# Feature Specification: Lag Visualization

**Feature Branch**: `011-lag-visualization`
**Created**: 2025-12-25
**Status**: Draft
**Input**: User description: "Sparkline chart for replication lag over time. Rolling 5-minute history at 1s intervals. Block character rendering, axis labels, per-node lag samples."

## Clarifications

### Session 2025-12-25

- Q: Where should the sparkline charts be displayed in the UI? → A: In detail modal when subscription is selected (Enter key)
- Q: How should the sparkline handle extreme lag spikes? → A: Linear scaling (spike at top, normal values compressed)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Real-Time Lag Trend (Priority: P1)

Operators monitoring PostgreSQL replication need to quickly assess whether replication lag is stable, improving, or degrading over time. A sparkline visualization provides at-a-glance trend awareness without requiring mental aggregation of raw numbers.

**Why this priority**: Core value proposition - transforms raw lag numbers into actionable visual insight. Without this, the feature has no purpose.

**Independent Test**: Can be fully tested by observing the sparkline update every second with simulated lag data and visually confirming the trend matches the underlying data pattern.

**Acceptance Scenarios**:

1. **Given** a subscription with stable lag around 2 seconds, **When** viewing the sparkline for 30+ seconds, **Then** the visualization shows a flat horizontal line at approximately 20-30% height.

2. **Given** a subscription where lag is increasing (degrading replication), **When** viewing the sparkline, **Then** the visualization shows an upward trend moving left-to-right (oldest data on left).

3. **Given** a subscription where lag drops from high to low, **When** viewing the sparkline, **Then** the visualization shows a downward trend indicating recovery.

---

### User Story 2 - Compare Lag Across Subscriptions (Priority: P2)

Operators managing multiple replication subscriptions need to quickly identify which subscriptions are lagging most and compare relative performance across the cluster.

**Why this priority**: Enables efficient triage when multiple subscriptions exist - operators can focus on the worst performers first.

**Independent Test**: Can be tested by displaying sparklines for 3+ subscriptions with different lag patterns and confirming visual comparison matches actual lag values.

**Acceptance Scenarios**:

1. **Given** multiple subscriptions with different lag levels, **When** viewing their sparklines, **Then** subscriptions with higher lag show taller bars relative to a consistent scale.

2. **Given** a cluster where one subscription suddenly experiences high lag, **When** viewing all sparklines, **Then** the problematic subscription visually stands out with bars near the top of its chart area.

---

### User Story 3 - Understand Time Context (Priority: P3)

Operators investigating lag spikes need to understand when events occurred within the 5-minute history window to correlate with external events (deployments, traffic spikes, etc.).

**Why this priority**: Adds temporal context to the visualization - useful but not essential for basic trend awareness.

**Independent Test**: Can be tested by observing axis labels and confirming they accurately represent the time window being displayed.

**Acceptance Scenarios**:

1. **Given** a sparkline with 5 minutes of data, **When** viewing the chart, **Then** axis labels indicate the time range (e.g., "-5m" on left edge, "now" on right edge).

2. **Given** a sparkline with less than 5 minutes of history (new subscription), **When** viewing the chart, **Then** only the available data is rendered and axis labels reflect the actual time range.

---

### Edge Cases

- What happens when a subscription has no lag data yet? Display an empty chart area with a "no data" indicator.
- What happens when lag values are all zero? Display a flat line at the bottom of the chart (indicating healthy replication).
- What happens when lag spikes to an extreme value? Use linear scaling where the spike renders at maximum height and normal values are proportionally compressed; the y-axis indicator shows the current max to provide context.
- What happens when a node becomes stale/disconnected? Preserve existing sparkline data with a stale indicator; stop appending new samples until reconnection.
- What happens when lag_seconds is null but lag_bytes is available? Fall back to displaying bytes-based lag (existing fallback behavior).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render sparkline charts using Unicode block characters (▁▂▃▄▅▆▇█) for terminal compatibility.
- **FR-002**: System MUST maintain a rolling 5-minute history window (300 samples at 1-second intervals).
- **FR-003**: System MUST update the sparkline display every second as new lag samples arrive.
- **FR-004**: System MUST use linear scaling for sparkline bars, where height is proportional to lag value relative to the maximum within the displayed history.
- **FR-005**: System MUST display time axis labels indicating the time range ("-5m" to "now" or actual range if less data available).
- **FR-006**: System MUST display a y-axis indicator showing the current scale (e.g., "max: 30s").
- **FR-007**: System MUST handle subscriptions with no lag data by displaying an empty state placeholder.
- **FR-008**: System MUST preserve sparkline data for stale nodes with a visual indicator of staleness.
- **FR-009**: System MUST support per-subscription sparklines (one chart per subscription, keyed by nodeId:subscriptionName).
- **FR-010**: System MUST display sparkline within the subscription detail modal, accessible via Enter key when a subscription is selected.

### Key Entities

- **LagSample**: Timestamped measurement containing lag in bytes and/or seconds (existing entity).
- **LagHistory**: Time-series collection of LagSamples for a specific subscription (existing, key: `${nodeId}:${subscriptionName}`).
- **Sparkline**: Visual representation of LagHistory as a series of block characters with configurable width.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify replication trends (stable/improving/degrading) within 3 seconds of viewing a sparkline.
- **SC-002**: Sparkline renders correctly on terminal widths from 40 to 200+ columns.
- **SC-003**: Chart updates are visually smooth with no flicker or jarring redraws during 1-second polling.
- **SC-004**: Users can compare relative lag severity across 5+ subscriptions at a glance.
- **SC-005**: Time context is clear - users can estimate when lag events occurred within ±30 seconds.

## Assumptions

- Lag data is already being collected at 1-second intervals by the existing PollingService.
- The existing `LagSample` type and `lagHistory` store structure will be reused.
- Block characters (▁▂▃▄▅▆▇█) render correctly in typical terminal emulators (iTerm2, Terminal.app, Alacritty, etc.).
- The sparkline will be displayed in the subscription detail modal (opened via Enter key when a subscription is selected).
- The current `MAX_LAG_HISTORY_SAMPLES` constant (60 samples) will be increased to 300 to support the 5-minute window.

## Out of Scope

- Historical lag data persistence beyond the in-memory 5-minute window.
- Exporting or saving sparkline data.
- Custom time windows (always 5 minutes for this feature).
- Interactive zoom or pan within the sparkline.
- Alerting or notifications based on lag trends.
