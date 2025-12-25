/**
 * Topology Layout Hook
 *
 * Responsive layout configuration based on terminal size and node count.
 *
 * Feature: 008-topology-panel
 */

import { useMemo } from 'react';
import { useTerminalSize } from './useTerminalSize.js';
import type { TopologyLayoutConfig, LayoutBreakpoint } from '../types/topology.js';

/**
 * Layout constants.
 */
const LAYOUT_CONFIG = {
  /** Minimum node width in characters */
  MIN_NODE_WIDTH: 19,
  /** Standard node width in characters */
  STANDARD_NODE_WIDTH: 24,
  /** Width of connection line between nodes */
  CONNECTION_WIDTH: 10,
  /** Minimum columns for horizontal layout */
  MIN_HORIZONTAL_COLS: 80,
} as const;

/**
 * Calculate layout configuration based on terminal size and node count.
 *
 * @param nodeCount - Number of nodes to display
 * @returns Layout configuration for topology rendering
 */
export function useTopologyLayout(nodeCount: number): TopologyLayoutConfig {
  const { columns, rows } = useTerminalSize();

  return useMemo(() => {
    // Derive breakpoint inline to avoid double useTerminalSize subscription
    const layoutBreakpoint: LayoutBreakpoint =
      columns < 100 && rows < 30 ? 'compact' :
      columns < 100 ? 'narrow' :
      rows < 30 ? 'short' : 'standard';

    // Determine node width based on breakpoint
    const nodeWidth =
      layoutBreakpoint === 'narrow' || layoutBreakpoint === 'compact'
        ? LAYOUT_CONFIG.MIN_NODE_WIDTH
        : LAYOUT_CONFIG.STANDARD_NODE_WIDTH;

    // Calculate how many nodes fit per row
    // Each node takes nodeWidth + connectionWidth (for the line between nodes)
    const spacePerNode = nodeWidth + LAYOUT_CONFIG.CONNECTION_WIDTH;
    const maxNodesPerRow = Math.max(1, Math.floor(columns / spacePerNode));

    // Use vertical layout for very narrow terminals or single node
    const isVertical =
      columns < LAYOUT_CONFIG.MIN_HORIZONTAL_COLS || nodeCount === 1;

    // Limit nodes per row based on actual node count
    const nodesPerRow = isVertical ? 1 : Math.min(maxNodesPerRow, nodeCount);

    return {
      nodeWidth,
      nodesPerRow,
      isVertical,
      connectionWidth: LAYOUT_CONFIG.CONNECTION_WIDTH,
      breakpoint: layoutBreakpoint,
    };
  }, [columns, rows, nodeCount]);
}
