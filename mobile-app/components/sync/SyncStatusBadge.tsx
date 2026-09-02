/**
 * SyncStatusBadge.tsx
 *
 * Small inline badge showing the current sync state.
 * Used in the Settings header and Home screen header.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSyncContext, SyncStatus } from '../../context/SyncContext';
import { useTheme } from '../../context/ThemeContext';

const STATUS_CONFIG: Record<
  SyncStatus,
  { label: string; emoji: string; color: string }
> = {
  idle: { label: 'Not synced', emoji: '○', color: '#9E9E9E' },
  checking: { label: 'Checking…', emoji: '⟳', color: '#FF9800' },
  syncing: { label: 'Syncing…', emoji: '⟳', color: '#2196F3' },
  synced: { label: 'Synced', emoji: '✓', color: '#4CAF50' },
  error: { label: 'Sync error', emoji: '⚠', color: '#F44336' },
  disabled: { label: 'Sync off', emoji: '—', color: '#9E9E9E' },
};

export default function SyncStatusBadge() {
  const { syncEnabled, syncStatus } = useSyncContext();
  const { colors } = useTheme();

  if (!syncEnabled) return null;

  const cfg = STATUS_CONFIG[syncStatus] ?? STATUS_CONFIG.idle;

  return (
    <View style={[styles.badge, { borderColor: cfg.color + '40', backgroundColor: cfg.color + '18' }]}>
      <Text style={[styles.emoji, { color: cfg.color }]}>{cfg.emoji}</Text>
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  emoji: {
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
