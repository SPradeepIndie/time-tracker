/**
 * SettingsScreen.tsx
 *
 * Settings screen featuring:
 *  - Storage: Tasks stored count & storage space used
 *  - Sync: Sync toggle & manual sync trigger (URL input removed)
 *  - Security: Change PIN & reset options
 *  - About: App Information link (housing Dark Mode toggle)
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../../context/ThemeContext';
import { useSyncContext } from '../../context/SyncContext';
import { SettingsScreenNavigationProp } from '../../navigation/types';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { AppIcon } from '../../components/ui/AppIcon';
import SyncStatusBadge from '../../components/sync/SyncStatusBadge';
import { useTrackContext } from '../../context/TrackContext';
import { getStorageStats, formatBytes, StorageDetailStats } from '../../services/storage/db';
import { PIN_HASH_KEY, PIN_SALT_KEY } from '../../services/storage/encryption';
import {
  AnalyticsWeights,
  loadAnalyticsWeights,
  saveAnalyticsWeights,
  DEFAULT_ANALYTICS_WEIGHTS,
} from '../../services/analytics/analytics';

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: Props) {
  const { colors, isDark, toggleTheme } = useTheme();
  const {
    syncEnabled,
    syncStatus,
    syncError,
    canEnableSync,
    disabledReason,
    setSyncEnabled,
    triggerSync,
  } = useSyncContext();

  const { tracks, clearAllData } = useTrackContext();
  const [syncToggling, setSyncToggling] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageDetailStats>({
    taskCount: tracks.length,
    dailyGoalCount: 0,
    weeklyGoalCount: 0,
    routineCount: 0,
    routineLogCount: 0,
    dbSizeBytes: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stats = await getStorageStats();
      if (mounted) {
        setStorageStats(stats);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tracks.length]);

  const handleSyncToggle = async (value: boolean) => {
    setSyncToggling(true);
    try {
      await setSyncEnabled(value);
    } finally {
      setSyncToggling(false);
    }
  };

  const handleChangePin = async () => {
    // Require biometric verification before changing PIN if device supports it
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const bioResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify identity to change PIN',
        cancelLabel: 'Cancel',
      });
      if (!bioResult.success) {
        Alert.alert('Verification Required', 'You must verify your identity to change your PIN.');
        return;
      }
    }

    Alert.alert(
      'Change PIN',
      'This will clear your current PIN and let you set a new one now.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set New PIN',
          style: 'default',
          onPress: async () => {
            await SecureStore.deleteItemAsync(PIN_HASH_KEY);
            await SecureStore.deleteItemAsync(PIN_SALT_KEY);
            navigation.replace('PinSetup');
          },
        },
      ]
    );
  };

  const handleClearTracks = () => {
    Alert.alert(
      'Clear All Tracks',
      'This will permanently delete all your tracks and tags. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllData(false);
            Alert.alert('Done', 'All tracks have been deleted.');
          },
        },
      ]
    );
  };

  const handleFactoryReset = () => {
    Alert.alert(
      'Factory Reset',
      'This will delete ALL data including tracks, PIN, and encryption key. The app will be as if freshly installed. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset App',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Last warning',
              'All data will be permanently erased. This cannot be recovered.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Reset Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await clearAllData(true);
                      await SecureStore.deleteItemAsync(PIN_HASH_KEY);
                      await SecureStore.deleteItemAsync(PIN_SALT_KEY);
                      await SecureStore.deleteItemAsync('time_tracker_db_key');
                      await SecureStore.deleteItemAsync('backend_url');
                      await SecureStore.deleteItemAsync('sync_enabled');
                      Alert.alert(
                        'Factory Reset Complete',
                        'All local tasks, encryption keys, sync settings, and security PIN have been successfully erased. The app has been restored to factory state.'
                      );
                    } catch (err: any) {
                      console.error('[Settings] Factory reset failed:', err);
                      Alert.alert('Reset Error', `Failed to complete reset: ${err?.message || 'Please try again.'}`);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };



  const [taskSortBy, setTaskSortBy] = useState<'priority' | 'status'>('priority');
  const [taskSortOrder, setTaskSortOrder] = useState<'asc' | 'desc'>('desc');
  const [weights, setWeights] = useState<AnalyticsWeights>(DEFAULT_ANALYTICS_WEIGHTS);

  useEffect(() => {
    (async () => {
      const savedSortBy = await SecureStore.getItemAsync('task_sort_by');
      const savedSortOrder = await SecureStore.getItemAsync('task_sort_order');
      if (savedSortBy === 'priority' || savedSortBy === 'status') {
        setTaskSortBy(savedSortBy);
      }
      if (savedSortOrder === 'asc' || savedSortOrder === 'desc') {
        setTaskSortOrder(savedSortOrder);
      }
      const savedWeights = await loadAnalyticsWeights();
      setWeights(savedWeights);
    })();
  }, []);

  const handleSetWeightPreset = async (tasks: number, goals: number, routines: number) => {
    const updated = { tasks, goals, routines };
    setWeights(updated);
    await saveAnalyticsWeights(updated);
  };

  const handleAdjustWeight = async (key: keyof AnalyticsWeights, deltaPercent: number) => {
    const curT = Math.round(weights.tasks * 100);
    const curG = Math.round(weights.goals * 100);
    const curR = Math.round(weights.routines * 100);

    let newT = curT;
    let newG = curG;
    let newR = curR;

    if (key === 'tasks') {
      newT = Math.max(5, Math.min(90, curT + deltaPercent));
      const rem = 100 - newT;
      const other = curG + curR;
      if (other > 0) {
        newG = Math.round(rem * (curG / other));
        newR = 100 - newT - newG;
      }
    } else if (key === 'goals') {
      newG = Math.max(5, Math.min(90, curG + deltaPercent));
      const rem = 100 - newG;
      const other = curT + curR;
      if (other > 0) {
        newT = Math.round(rem * (curT / other));
        newR = 100 - newG - newT;
      }
    } else {
      newR = Math.max(5, Math.min(90, curR + deltaPercent));
      const rem = 100 - newR;
      const other = curT + curG;
      if (other > 0) {
        newT = Math.round(rem * (curT / other));
        newG = 100 - newR - newT;
      }
    }

    const updated: AnalyticsWeights = {
      tasks: newT / 100,
      goals: newG / 100,
      routines: newR / 100,
    };
    setWeights(updated);
    await saveAnalyticsWeights(updated);
  };

  const handleUpdateSortBy = async (sortBy: 'priority' | 'status') => {
    setTaskSortBy(sortBy);
    await SecureStore.setItemAsync('task_sort_by', sortBy);
  };

  const handleUpdateSortOrder = async (sortOrder: 'asc' | 'desc') => {
    setTaskSortOrder(sortOrder);
    await SecureStore.setItemAsync('task_sort_order', sortOrder);
  };

  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView edges={['top']}>
      <View style={s.container}>
        <Header title="Settings" right={<SyncStatusBadge />} />

        <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: 60 }}>

          {/* ── Appearance (Dark / Light Theme) ───────────────────────── */}
          <View style={s.sectionHeader}>
            <AppIcon name="moon" size={16} color={colors.textTertiary} />
            <Text style={s.sectionTitle}>Appearance</Text>
          </View>
          <Card>
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Dark Mode</Text>
                <Text style={s.rowDesc}>
                  {isDark ? 'Dark theme active' : 'Light theme active'}
                </Text>
              </View>
              <View style={s.toggleContainer}>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            </View>
          </Card>

          {/* ── Task Display & Sorting ───────────────────────────────── */}
          <View style={s.sectionHeader}>
            <AppIcon name="funnel" size={16} color={colors.textTertiary} />
            <Text style={s.sectionTitle}>Task Sorting</Text>
          </View>
          <Card>
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Sort Field</Text>
                <Text style={s.rowDesc}>Group and order tasks by</Text>
              </View>
              <View style={s.segmentedRow}>
                <TouchableOpacity
                  style={[s.segmentBtn, taskSortBy === 'priority' && s.segmentBtnActive]}
                  onPress={() => handleUpdateSortBy('priority')}
                >
                  <Text style={[s.segmentText, taskSortBy === 'priority' && s.segmentTextActive]}>Priority</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.segmentBtn, taskSortBy === 'status' && s.segmentBtnActive]}
                  onPress={() => handleUpdateSortBy('status')}
                >
                  <Text style={[s.segmentText, taskSortBy === 'status' && s.segmentTextActive]}>Status</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.divider} />
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Direction</Text>
                <Text style={s.rowDesc}>Ordering direction</Text>
              </View>
              <View style={s.segmentedRow}>
                <TouchableOpacity
                  style={[s.segmentBtn, taskSortOrder === 'asc' && s.segmentBtnActive]}
                  onPress={() => handleUpdateSortOrder('asc')}
                >
                  <Text style={[s.segmentText, taskSortOrder === 'asc' && s.segmentTextActive]}>Ascending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.segmentBtn, taskSortOrder === 'desc' && s.segmentBtnActive]}
                  onPress={() => handleUpdateSortOrder('desc')}
                >
                  <Text style={[s.segmentText, taskSortOrder === 'desc' && s.segmentTextActive]}>Descending</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          {/* ── Daily Progress Calculation ───────────────────────────── */}
          <View style={s.sectionHeader}>
            <AppIcon name="calculator" size={16} color={colors.textTertiary} />
            <Text style={s.sectionTitle}>Daily Progress Calculation</Text>
          </View>
          <Card>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                Configure how much each module contributes to your Overall Day Progress score (must total 100%).
              </Text>

              {/* Presets */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Default\n(40/35/25)', t: 0.40, g: 0.35, r: 0.25 },
                  { label: 'Balanced\n(34/33/33)', t: 0.34, g: 0.33, r: 0.33 },
                  { label: 'Task Focus\n(60/20/20)', t: 0.60, g: 0.20, r: 0.20 },
                ].map((p) => {
                  const isActive =
                    Math.round(weights.tasks * 100) === Math.round(p.t * 100) &&
                    Math.round(weights.goals * 100) === Math.round(p.g * 100) &&
                    Math.round(weights.routines * 100) === Math.round(p.r * 100);
                  return (
                    <TouchableOpacity
                      key={p.label}
                      style={[
                        s.presetChip,
                        isActive && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                      ]}
                      onPress={() => handleSetWeightPreset(p.t, p.g, p.r)}
                    >
                      <Text style={[s.presetChipText, isActive && { color: colors.primary, fontWeight: '700' }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Steppers */}
              {[
                { key: 'tasks' as const, label: 'Tasks', color: colors.primary, val: Math.round(weights.tasks * 100) },
                { key: 'goals' as const, label: 'Daily Goals', color: '#7C3AED', val: Math.round(weights.goals * 100) },
                { key: 'routines' as const, label: 'Routines', color: '#06B6D4', val: Math.round(weights.routines * 100) },
              ].map((item, idx) => (
                <View key={item.key} style={{ marginTop: idx > 0 ? 12 : 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        style={s.stepperBtn}
                        onPress={() => handleAdjustWeight(item.key, -5)}
                      >
                        <Text style={s.stepperBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={[s.weightValueText, { color: item.color }]}>{item.val}%</Text>
                      <TouchableOpacity
                        style={s.stepperBtn}
                        onPress={() => handleAdjustWeight(item.key, 5)}
                      >
                        <Text style={s.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={s.weightBar}>
                    <View style={[s.weightBarFill, { width: `${item.val}%`, backgroundColor: item.color }]} />
                  </View>
                </View>
              ))}
            </View>
          </Card>

          {/* ── Storage Analysis ──────────────────────────────────────── */}
          <View style={s.sectionHeader}>
            <AppIcon name="server" size={16} color={colors.textTertiary} />
            <Text style={s.sectionTitle}>Storage Analysis</Text>
          </View>
          <Card>
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Tasks Stored</Text>
                <Text style={s.rowDesc}>Local task records</Text>
              </View>
              <Text style={s.statBadge}>{storageStats.taskCount}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Daily Goals</Text>
                <Text style={s.rowDesc}>Active & historical daily plans</Text>
              </View>
              <Text style={s.statBadge}>{storageStats.dailyGoalCount}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Weekly Goals</Text>
                <Text style={s.rowDesc}>3-tier weekly goal hierarchy</Text>
              </View>
              <Text style={s.statBadge}>{storageStats.weeklyGoalCount}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Routines & Activities</Text>
                <Text style={s.rowDesc}>Defined routines / daily logs</Text>
              </View>
              <Text style={s.statBadge}>{storageStats.routineCount} / {storageStats.routineLogCount} logs</Text>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Checklists & Sticky Notes</Text>
                <Text style={s.rowDesc}>Simple lists / colored sticky notes</Text>
              </View>
              <Text style={s.statBadge}>
                {storageStats.checklistCount ?? 0} lists / {storageStats.stickyNoteCount ?? 0} notes
              </Text>
            </View>
            <View style={s.divider} />
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>SQLite Database Footprint</Text>
                <Text style={s.rowDesc}>Total encrypted local storage space</Text>
              </View>
              <Text style={[s.statBadge, { color: colors.info, backgroundColor: colors.info + '18' }]}>
                {formatBytes(storageStats.dbSizeBytes)}
              </Text>
            </View>
          </Card>

          {/* ── Sync ─────────────────────────────────────────────────── */}
          <View style={s.sectionHeader}>
            <AppIcon name="cloud" size={16} color={colors.textTertiary} />
            <Text style={s.sectionTitle}>Cloud Sync</Text>
          </View>
          <Card>
            <View style={[s.row, !syncEnabled && s.rowLast]}>
              <View style={s.rowLeft}>
                <Text style={[s.rowLabel, !canEnableSync && !syncEnabled && s.rowLabelDisabled]}>
                  Sync with Backend
                </Text>
                <Text style={s.rowDesc}>
                  {syncEnabled
                    ? syncError
                      ? `Error: ${syncError}`
                      : 'Bidirectional sync is active'
                    : (disabledReason ?? 'Toggle to enable background synchronization')}
                </Text>
              </View>
              <View style={s.toggleContainer}>
                {syncToggling ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={syncEnabled}
                    onValueChange={handleSyncToggle}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                )}
              </View>
            </View>

            {syncEnabled && (
              <>
                <View style={s.divider} />
                <TouchableOpacity
                  style={[s.row, s.rowLast]}
                  onPress={triggerSync}
                  disabled={syncStatus === 'syncing'}
                >
                  <Text style={[s.rowLabel, { color: colors.primary }]}>
                    {syncStatus === 'syncing' ? 'Syncing…' : 'Sync Now'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Card>

          {/* ── Security ──────────────────────────────────────────── */}
          <View style={s.sectionHeader}>
            <AppIcon name="lock-closed" size={16} color={colors.textTertiary} />
            <Text style={s.sectionTitle}>Security</Text>
          </View>
          <Card>
            <TouchableOpacity style={[s.row, s.rowLast]} onPress={handleChangePin}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Change PIN</Text>
                <Text style={s.rowDesc}>Reset your 4-digit app lock</Text>
              </View>
              <AppIcon name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </Card>

          {/* ── Danger Zone ───────────────────────────────────────── */}
          <View style={s.sectionHeader}>
            <AppIcon name="warning" size={16} color={colors.priorityHigh} />
            <Text style={[s.sectionTitle, { color: colors.priorityHigh }]}>Danger Zone</Text>
          </View>
          <Card style={{ borderColor: colors.priorityHigh + '40', borderWidth: 1 }}>
            <TouchableOpacity style={s.row} onPress={handleClearTracks}>
              <View style={s.rowLeft}>
                <Text style={[s.rowLabel, { color: colors.priorityHigh }]}>Clear All Tasks</Text>
                <Text style={s.rowDesc}>Permanently delete all tasks and tags</Text>
              </View>
              <AppIcon name="chevron-forward" size={18} color={colors.priorityHigh} />
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity style={[s.row, s.rowLast]} onPress={handleFactoryReset}>
              <View style={s.rowLeft}>
                <Text style={[s.rowLabel, { color: colors.priorityHigh, fontWeight: '700' }]}>Complete Factory Reset</Text>
                <Text style={s.rowDesc}>Wipe local database, secure-store PIN, and encryption key</Text>
              </View>
              <AppIcon name="chevron-forward" size={18} color={colors.priorityHigh} />
            </TouchableOpacity>
          </Card>

          {/* ── About ────────────────────────────────────────────── */}
          <View style={s.sectionHeader}>
            <AppIcon name="information-circle" size={16} color={colors.textTertiary} />
            <Text style={s.sectionTitle}>About</Text>
          </View>
          <Card>
            <TouchableOpacity
              style={[s.row, s.rowLast]}
              onPress={() => navigation.navigate('Info')}
            >
              <View style={s.rowLeft}>
                <Text style={[s.rowLabel, { color: colors.primary }]}>App Information</Text>
                <Text style={s.rowDesc}>Time Tracker v1.0.0 • Architecture & Guides</Text>
              </View>
              <AppIcon name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </Card>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowLeft: { flex: 1, paddingRight: 8 },
    rowLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 2,
    },
    rowLabelDisabled: {
      color: colors.textTertiary,
    },
    rowDesc: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    statBadge: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      backgroundColor: colors.primary + '18',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    segmentedRow: {
      flexDirection: 'row',
      backgroundColor: colors.border + '50',
      borderRadius: 8,
      padding: 2,
      gap: 4,
    },
    segmentBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
    },
    segmentBtnActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: '#FFFFFF',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    toggleContainer: {
      width: 56,
      alignItems: 'flex-end',
    },
    presetChip: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    presetChipText: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    stepperBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    stepperBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 18,
    },
    weightValueText: {
      fontSize: 15,
      fontWeight: '800',
      minWidth: 42,
      textAlign: 'center',
    },
    weightBar: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      marginTop: 6,
      overflow: 'hidden',
    },
    weightBarFill: {
      height: '100%',
      borderRadius: 3,
    },
  });
}
