# Research: Replication Slots Panel

**Feature**: 010-slots-panel
**Date**: 2025-12-24

## Research Summary

This feature follows established patterns from the existing codebase. All technical decisions are based on precedent from SubscriptionsPanel (feature 009) and existing infrastructure.

---

## Decision 1: ProgressBar Color Extension

**Question**: How to add severity-based coloring to ProgressBar component?

**Decision**: Add optional `color` prop to ProgressBar, defaulting to `colors.primary`

**Rationale**:
- ProgressBar currently uses `colors.primary` for filled portion
- Adding an optional `color` prop maintains backward compatibility
- Caller (SlotRow) can compute color based on retention severity
- Follows minimal-change principle - existing usages unchanged

**Alternatives Considered**:
1. **Variant prop with preset colors** - Rejected: Less flexible, requires predefined severity mapping
2. **New SeverityProgressBar component** - Rejected: Unnecessary duplication; composition preferred
3. **Color via context/theme** - Rejected: Per-instance color more explicit and controllable

**Implementation**:
```typescript
export interface ProgressBarProps {
  percent: number;
  width?: number;
  showLabel?: boolean;
  color?: string;  // NEW: Override filled color (default: colors.primary)
}
```

---

## Decision 2: WAL Status Severity Mapping

**Question**: How to map PostgreSQL WAL status to visual severity?

**Decision**: Map based on data loss risk

**Rationale**:
- `reserved`: Normal operation → success (green)
- `extended`: Beyond wal_keep_size but within max_slot_wal_keep_size → warning (yellow)
- `unreserved`: WAL may be removed at checkpoint → critical (red)
- `lost`: Slot can no longer catch up → critical (red)

**Source**: PostgreSQL documentation for `pg_replication_slots.wal_status` (PG13+)

**Alternatives Considered**:
1. **Treat extended as healthy** - Rejected: User should know when nearing limits
2. **Add "danger" intermediate level** - Rejected: Complexity; warning/critical sufficient

---

## Decision 3: Retention Progress Bar Calculation

**Question**: How to calculate progress bar percentage from retained bytes?

**Decision**: Percentage = (retainedBytes / criticalThreshold) × 100, capped at 100%

**Rationale**:
- Critical threshold (default 5GB) represents "full" bar
- Values exceeding critical still show 100% but with critical color
- Numeric display shows actual bytes regardless of bar position
- User can see at a glance how close to critical each slot is

**Alternatives Considered**:
1. **Use warning threshold as midpoint** - Rejected: Less intuitive; 100% should mean "critical"
2. **Logarithmic scale** - Rejected: Complicates interpretation
3. **Dynamic max based on largest slot** - Rejected: Inconsistent baseline across sessions

---

## Decision 4: Modal Content Pattern

**Question**: How to add slot details to the existing Modal component?

**Decision**: Add `SlotDetailContent` component following `SubscriptionDetailContent` pattern

**Rationale**:
- Modal.tsx already handles type discrimination via `config.data`
- Adding a slot-specific content component follows established pattern
- Type guard: `if (item.slotName !== undefined && item.slotType !== undefined)`

**Implementation**: Add type guard and content component to Modal.tsx

---

## Decision 5: Sorting and Ordering

**Question**: How to order slots in the list?

**Decision**: Sort by nodeName (alphabetical), then slotName (alphabetical)

**Rationale**:
- Consistent, predictable ordering
- Groups slots by node for easy scanning
- Matches assumption documented in spec
- User can visually locate slots without searching

**Alternatives Considered**:
1. **Sort by severity (critical first)** - Rejected: Position would change frequently; disorienting
2. **Sort by retention size (largest first)** - Rejected: Position instability
3. **Group by slot type** - Rejected: Node grouping more actionable for DBA workflow

---

## Decision 6: Selection State Key

**Question**: What key to use in store's `selections` Map for slot selection?

**Decision**: Use `'slots'` as the panel key, matching existing pattern

**Rationale**:
- Follows pattern from SubscriptionsPanel: `selections.get('subscriptions')`
- Panel enum includes 'slots' as a valid value
- Selection ID format: `${nodeId}:${slotName}` (unique identifier)

---

## Decision 7: Stale Node Handling

**Question**: How to handle slots from disconnected nodes?

**Decision**: Retain slot data with visual stale indicator (dimmed text, stale badge)

**Rationale**:
- Follows existing pattern from SubscriptionsPanel
- DBA can still see last-known state
- Stale indicator warns that data may be outdated
- Matches Constitution VI: "Errors surfaced, never swallowed"

---

## Dependencies Best Practices

### Ink/React TUI Patterns
- Use `Box` for layout with flexbox props
- Use `Text` for styled text content
- Avoid inline conditional rendering for complex elements
- Extract presentational subcomponents (SlotRow, EmptyState)

### Zustand Hook Patterns
- Use `useMemo` for derived data to prevent unnecessary recomputes
- Select minimal state slices to reduce re-renders
- Return typed result object with all derived values

### Testing Patterns
- Use ink-testing-library for component rendering
- Mock useStore selectors with jest.fn()
- Test edge cases: empty state, stale nodes, max retention

---

## No Further Research Required

All technical decisions are resolved. Feature is ready for Phase 1 design.
