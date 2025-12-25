import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import { StatusDot } from '../atoms/StatusDot.js';
import { Badge } from '../atoms/Badge.js';
import type { ModalConfig } from '../../store/types.js';
import type { SubscriptionListItem } from '../../hooks/useSubscriptions.js';
import type { TopologyNodeData } from '../../types/topology.js';
import { getLagSeverity, getLagColor, formatLag, getRoleBadgeLabel, getRoleBadgeColor } from '../../utils/topology.js';

export interface ModalProps {
  config: ModalConfig;
  onClose: () => void;
  children?: React.ReactNode;
}

/**
 * Detail field row component.
 */
function DetailRow({ label, value, valueColor }: { label: string; value: string | null; valueColor?: string }): React.ReactElement {
  const colors = useTheme();
  return (
    <Box>
      <Box width={18}>
        <Text color={colors.muted}>{label}:</Text>
      </Box>
      <Text color={valueColor ?? colors.foreground}>{value ?? '-'}</Text>
    </Box>
  );
}

/**
 * Subscription detail content for modal.
 */
function SubscriptionDetailContent({ item }: { item: SubscriptionListItem }): React.ReactElement {
  const colors = useTheme();

  const formatDate = (date: Date | null): string => {
    if (!date) return '-';
    return date.toLocaleString();
  };

  return (
    <Box flexDirection="column" gap={1}>
      {/* Status section */}
      <Box flexDirection="column">
        <Text bold color={colors.primary}>Status</Text>
        <Box gap={2} marginLeft={2}>
          <StatusDot variant={item.statusVariant} label={item.status} />
          <Badge label={item.source} variant={item.source === 'pglogical' ? 'secondary' : 'muted'} />
          {!item.enabled && <Badge label="disabled" variant="muted" />}
          {item.isStale && <Badge label="stale" variant="warning" />}
        </Box>
      </Box>

      {/* Node section */}
      <Box flexDirection="column">
        <Text bold color={colors.primary}>Node</Text>
        <Box marginLeft={2} flexDirection="column">
          <DetailRow label="Node" value={item.nodeName} />
          <DetailRow label="Node ID" value={item.nodeId} />
        </Box>
      </Box>

      {/* Provider section (pglogical only) */}
      {item.source === 'pglogical' && (item.providerNode || item.providerHost) && (
        <Box flexDirection="column">
          <Text bold color={colors.primary}>Provider</Text>
          <Box marginLeft={2} flexDirection="column">
            {item.providerNode && <DetailRow label="Provider Node" value={item.providerNode} />}
            {item.providerHost && (
              <DetailRow
                label="Provider Host"
                value={`${item.providerHost}:${item.providerPort ?? 5432}`}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Replication sets (pglogical only) */}
      {item.replicationSets.length > 0 && (
        <Box flexDirection="column">
          <Text bold color={colors.primary}>Replication Sets</Text>
          <Box marginLeft={2}>
            <Text color={colors.foreground}>{item.replicationSets.join(', ')}</Text>
          </Box>
        </Box>
      )}

      {/* Slot and worker section */}
      <Box flexDirection="column">
        <Text bold color={colors.primary}>Replication Details</Text>
        <Box marginLeft={2} flexDirection="column">
          <DetailRow label="Slot Name" value={item.slotName} />
          <DetailRow label="Worker PID" value={item.workerPid?.toString() ?? null} />
          <DetailRow label="Last Message" value={formatDate(item.lastMessageTime)} />
        </Box>
      </Box>

      {/* LSN section */}
      <Box flexDirection="column">
        <Text bold color={colors.primary}>LSN Positions</Text>
        <Box marginLeft={2} flexDirection="column">
          <DetailRow label="Received LSN" value={item.receivedLsn} />
          <DetailRow label="Latest End LSN" value={item.latestEndLsn} />
        </Box>
      </Box>

      {/* Lag section */}
      {item.latestLag && (
        <Box flexDirection="column">
          <Text bold color={colors.primary}>Lag</Text>
          <Box marginLeft={2} flexDirection="column">
            <DetailRow
              label="Lag Bytes"
              value={`${item.latestLag.lagBytes.toLocaleString()} B`}
              valueColor={item.lagSeverity === 'critical' ? colors.critical : item.lagSeverity === 'warning' ? colors.warning : colors.success}
            />
            <DetailRow
              label="Lag Time"
              value={item.latestLag.lagSeconds !== null ? `${item.latestLag.lagSeconds.toFixed(1)}s` : '-'}
              valueColor={item.lagSeverity === 'critical' ? colors.critical : item.lagSeverity === 'warning' ? colors.warning : colors.success}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

/**
 * Topology node detail content for modal.
 */
function TopologyNodeDetailContent({ node }: { node: TopologyNodeData }): React.ReactElement {
  const colors = useTheme();

  // Connection status to StatusDot variant
  const statusVariant = node.connectionStatus === 'connected' ? 'success'
    : node.connectionStatus === 'connecting' ? 'connecting'
    : node.connectionStatus === 'failed' ? 'critical'
    : 'muted';

  return (
    <Box flexDirection="column" gap={1}>
      {/* Status section */}
      <Box flexDirection="column">
        <Text bold color={colors.primary}>Status</Text>
        <Box gap={2} marginLeft={2}>
          <StatusDot variant={statusVariant} label={node.connectionStatus ?? 'unknown'} />
          <Badge label={getRoleBadgeLabel(node.role)} variant={getRoleBadgeColor(node.role)} />
          {node.hasPglogical && <Badge label="pglogical" variant="secondary" />}
          {node.isStale && <Badge label="stale" variant="warning" />}
        </Box>
      </Box>

      {/* Connection info */}
      <Box flexDirection="column">
        <Text bold color={colors.primary}>Connection</Text>
        <Box marginLeft={2} flexDirection="column">
          <DetailRow label="Node ID" value={node.nodeId} />
          <DetailRow label="Host" value={node.hostInfo} />
        </Box>
      </Box>

      {/* Incoming edges (subscriptions TO this node) */}
      {node.incomingEdges.length > 0 && (
        <Box flexDirection="column">
          <Text bold color={colors.primary}>Incoming Replication ({node.incomingEdges.length})</Text>
          <Box marginLeft={2} flexDirection="column">
            {node.incomingEdges.map((edge) => {
              const severity = getLagSeverity(edge.lagSeconds);
              const lagColorKey = getLagColor(severity);
              return (
                <Box key={edge.id} gap={2}>
                  <Text color={colors.foreground}>← {edge.sourceNodeId}</Text>
                  {edge.subscriptionName && (
                    <Text color={colors.muted}>({edge.subscriptionName})</Text>
                  )}
                  <Text color={colors[lagColorKey]}>{formatLag(edge.lagSeconds)}</Text>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Outgoing edges (subscriptions FROM this node) */}
      {node.outgoingEdges.length > 0 && (
        <Box flexDirection="column">
          <Text bold color={colors.primary}>Outgoing Replication ({node.outgoingEdges.length})</Text>
          <Box marginLeft={2} flexDirection="column">
            {node.outgoingEdges.map((edge) => {
              const severity = getLagSeverity(edge.lagSeconds);
              const lagColorKey = getLagColor(severity);
              return (
                <Box key={edge.id} gap={2}>
                  <Text color={colors.foreground}>→ {edge.targetNodeId}</Text>
                  {edge.subscriptionName && (
                    <Text color={colors.muted}>({edge.subscriptionName})</Text>
                  )}
                  <Text color={colors[lagColorKey]}>{formatLag(edge.lagSeconds)}</Text>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* No connections */}
      {node.incomingEdges.length === 0 && node.outgoingEdges.length === 0 && (
        <Box marginTop={1}>
          <Text color={colors.muted}>No replication connections</Text>
        </Box>
      )}
    </Box>
  );
}

export function Modal({ config, onClose, children }: ModalProps): React.ReactElement {
  const colors = useTheme();
  useInput((_input, key) => { if (key.escape) onClose(); });
  const title = config.title ?? config.type.charAt(0).toUpperCase() + config.type.slice(1);

  // Render content based on modal type
  const renderContent = (): React.ReactNode => {
    if (children) return children;

    if (config.type === 'help') {
      return (
        <Box flexDirection="column">
          <Text bold color={colors.primary}>Keyboard Shortcuts</Text>
          <Text><Text color={colors.secondary}>t</Text>        Topology panel</Text>
          <Text><Text color={colors.secondary}>s</Text>        Subscriptions panel</Text>
          <Text><Text color={colors.secondary}>l</Text>        Slots panel</Text>
          <Text><Text color={colors.secondary}>c</Text>        Conflicts panel</Text>
          <Text><Text color={colors.secondary}>o</Text>        Operations panel</Text>
          <Text><Text color={colors.secondary}>Tab</Text>      Next panel</Text>
          <Text><Text color={colors.secondary}>↑/k</Text>      Previous item</Text>
          <Text><Text color={colors.secondary}>↓/j</Text>      Next item</Text>
          <Text><Text color={colors.secondary}>Enter</Text>    View details</Text>
          <Text><Text color={colors.secondary}>h/?</Text>      Show this help</Text>
          <Text><Text color={colors.secondary}>Esc</Text>      Close modal</Text>
          <Text><Text color={colors.secondary}>q</Text>        Quit application</Text>
        </Box>
      );
    }

    if (config.type === 'details' && config.data) {
      // Check if it's a subscription item
      const subItem = config.data as SubscriptionListItem;
      if (subItem.subscriptionName !== undefined) {
        return <SubscriptionDetailContent item={subItem} />;
      }

      // Check if it's a topology node
      const nodeItem = config.data as TopologyNodeData;
      if (nodeItem.nodeId !== undefined && nodeItem.role !== undefined) {
        return <TopologyNodeDetailContent node={nodeItem} />;
      }
    }

    return <Text color={colors.muted}>{config.title ?? config.type}</Text>;
  };

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" width="100%" height="100%">
      <Box flexDirection="column" borderStyle="double" borderColor={colors.primary} paddingX={2} paddingY={1} minWidth={40}>
        <Box marginBottom={1}><Text bold color={colors.primary}>{title}</Text><Box flexGrow={1} /><Text color={colors.muted}>[Esc]</Text></Box>
        {renderContent()}
      </Box>
    </Box>
  );
}
