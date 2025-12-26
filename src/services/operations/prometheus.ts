/**
 * Prometheus Metrics Service
 *
 * Collects metrics from store state and formats them in Prometheus text format.
 *
 * Feature: 013-operations-modal
 */

import { useStore } from '../../store/index.js';
import type { PrometheusMetric, MetricsCollector } from '../../types/operations.js';
import * as fs from 'fs/promises';

// =============================================================================
// Metric Definitions
// =============================================================================

const METRIC_DEFINITIONS = {
  lagBytes: {
    name: 'replmon_lag_bytes',
    help: 'Replication lag in bytes',
    type: 'gauge' as const,
  },
  lagSeconds: {
    name: 'replmon_lag_seconds',
    help: 'Replication lag in seconds',
    type: 'gauge' as const,
  },
  subscriptionStatus: {
    name: 'replmon_subscription_status',
    help: 'Subscription status (1=active, 0=paused)',
    type: 'gauge' as const,
  },
  slotWalRetention: {
    name: 'replmon_slot_wal_retention_bytes',
    help: 'WAL retained by slot in bytes',
    type: 'gauge' as const,
  },
  conflictTotal: {
    name: 'replmon_conflict_total',
    help: 'Total conflicts by type',
    type: 'counter' as const,
  },
};

// =============================================================================
// Collect Metrics
// =============================================================================

/**
 * Collect all current metrics from the Zustand store state.
 */
export function collectMetrics(): PrometheusMetric[] {
  const state = useStore.getState();
  const metrics: PrometheusMetric[] = [];

  // Collect lag metrics
  for (const [key, history] of state.lagHistory) {
    const [nodeId, subscriptionName] = key.split(':');
    const latest = history[history.length - 1];
    if (!latest || !nodeId || !subscriptionName) continue;

    const node = state.nodes.get(nodeId);
    const nodeName = node?.name ?? nodeId;

    // Lag bytes
    metrics.push({
      name: METRIC_DEFINITIONS.lagBytes.name,
      type: METRIC_DEFINITIONS.lagBytes.type,
      help: METRIC_DEFINITIONS.lagBytes.help,
      labels: { node: nodeName, subscription: subscriptionName },
      value: latest.lagBytes,
    });

    // Lag seconds (if available)
    if (latest.lagSeconds !== null && latest.lagSeconds !== undefined) {
      metrics.push({
        name: METRIC_DEFINITIONS.lagSeconds.name,
        type: METRIC_DEFINITIONS.lagSeconds.type,
        help: METRIC_DEFINITIONS.lagSeconds.help,
        labels: { node: nodeName, subscription: subscriptionName },
        value: latest.lagSeconds,
      });
    }
  }

  // Collect subscription status metrics
  for (const [nodeId, subs] of state.subscriptions) {
    const node = state.nodes.get(nodeId);
    const nodeName = node?.name ?? nodeId;

    for (const sub of subs) {
      const value = sub.enabled && sub.status === 'replicating' ? 1 : 0;
      metrics.push({
        name: METRIC_DEFINITIONS.subscriptionStatus.name,
        type: METRIC_DEFINITIONS.subscriptionStatus.type,
        help: METRIC_DEFINITIONS.subscriptionStatus.help,
        labels: { node: nodeName, subscription: sub.subscriptionName },
        value,
      });
    }
  }

  // Collect slot WAL retention metrics
  for (const [nodeId, slots] of state.slots) {
    const node = state.nodes.get(nodeId);
    const nodeName = node?.name ?? nodeId;

    for (const slot of slots) {
      metrics.push({
        name: METRIC_DEFINITIONS.slotWalRetention.name,
        type: METRIC_DEFINITIONS.slotWalRetention.type,
        help: METRIC_DEFINITIONS.slotWalRetention.help,
        labels: { node: nodeName, slot_name: slot.slotName },
        value: slot.pendingBytes,
      });
    }
  }

  // Collect conflict metrics
  const conflictCounts = new Map<string, Map<string, number>>();
  for (const [nodeId, events] of state.conflictEvents) {
    const node = state.nodes.get(nodeId);
    const nodeName = node?.name ?? nodeId;

    if (!conflictCounts.has(nodeName)) {
      conflictCounts.set(nodeName, new Map());
    }

    for (const event of events) {
      const typeMap = conflictCounts.get(nodeName);
      if (typeMap) {
        typeMap.set(event.conflictType, (typeMap.get(event.conflictType) ?? 0) + 1);
      }
    }
  }

  for (const [nodeName, typeMap] of conflictCounts) {
    for (const [conflictType, count] of typeMap) {
      metrics.push({
        name: METRIC_DEFINITIONS.conflictTotal.name,
        type: METRIC_DEFINITIONS.conflictTotal.type,
        help: METRIC_DEFINITIONS.conflictTotal.help,
        labels: { node: nodeName, type: conflictType },
        value: count,
      });
    }
  }

  return metrics;
}

// =============================================================================
// Format as Prometheus
// =============================================================================

/**
 * Format metrics in Prometheus text exposition format (version 0.0.4).
 */
export function formatAsPrometheus(metrics: PrometheusMetric[]): string {
  // Group metrics by name to output HELP and TYPE once per metric family
  const families = new Map<string, PrometheusMetric[]>();

  for (const metric of metrics) {
    const existing = families.get(metric.name);
    if (existing) {
      existing.push(metric);
    } else {
      families.set(metric.name, [metric]);
    }
  }

  const lines: string[] = [];

  for (const [name, familyMetrics] of families) {
    const first = familyMetrics[0];
    if (!first) continue;

    // HELP line
    lines.push(`# HELP ${name} ${first.help}`);

    // TYPE line
    lines.push(`# TYPE ${name} ${first.type}`);

    // Metric lines
    for (const metric of familyMetrics) {
      const labelParts = Object.entries(metric.labels)
        .map(([k, v]) => `${k}="${escapeLabel(v)}"`)
        .join(',');
      const labelStr = labelParts ? `{${labelParts}}` : '';
      lines.push(`${name}${labelStr} ${metric.value}`);
    }

    // Blank line between families
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Escape special characters in label values.
 */
function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

// =============================================================================
// Write to File
// =============================================================================

/**
 * Write metrics to a file.
 */
export async function writeMetricsToFile(filePath: string): Promise<void> {
  const metrics = collectMetrics();
  const content = formatAsPrometheus(metrics);
  await fs.writeFile(filePath, content, 'utf-8');
}

// =============================================================================
// Export MetricsCollector Implementation
// =============================================================================

export const metricsCollector: MetricsCollector = {
  collectMetrics,
  formatAsPrometheus,
};
