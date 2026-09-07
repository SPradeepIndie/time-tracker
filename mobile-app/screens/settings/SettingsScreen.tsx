/**
 * SettingsScreen.tsx
 *
 * Settings screen featuring:
 *  - Storage: Tasks stored count & storage space used
 *  - Sync: Sync toggle & manual sync trigger (URL input removed)
 *  - Security: Change PIN & reset options
 *  - About: App Information link (housing Dark Mode toggle)
 */
import React, { useState, useEffect } from 'react';
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
import { useTheme } from '../../context/ThemeContext';
import { useSyncContext } from '../../context/SyncContext';
import { SettingsScreenNavigationProp } from '../../navigation/types';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import SyncStatusBadge from '../../components/sync/SyncStatusBadge';
import { useTrackContext } from '../../context/TrackContext';
import { getStorageStats, formatBytes } from '../../services/storage/db';

interface Props {
  navigation: SettingsScreenNavigationProp;
}

const PIN_HASH_KEY = 'app_pin_hash';

export default function SettingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
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
  const [storageStats, setStorageStats] = useState<{ taskCount: number; dbSizeBytes: number }>({
    taskCount: tracks.length,
    dbSizeBytes: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stats = await getStorageStats();
      if (mounted) {
        setStorageStats({
          taskCount: tracks.length || stats.taskCount,
          dbSizeBytes: stats.dbSizeBytes,
        });
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

  const handleChangePin = () => {
    Alert.alert(
      'Change PIN',
      'This will clear your current PIN. You will need to set a new one on next launch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset PIN',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync(PIN_HASH_KEY);
            Alert.alert('PIN cleared', 'A new PIN will be required next time you open the app.');
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



  const s = makeStyles(colors);

  return (
    <SafeAreaView edges={['top']}>
      <View style={s.container}>
        <Header title="Settings" right={<SyncStatusBadge />} />

        <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: 50 }}>

          {/* ── Storage & Space ───────────────────────────────────────── */}
          <Text style={s.sectionTitle}>💾  Task Storage</Text>
          <Card>
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Tasks Stored</Text>
                <Text style={s.rowDesc}>Total local task records</Text>
              </View>
              <Text style={s.statBadge}>{storageStats.taskCount} tasks</Text>
            </View>
            <View style={s.divider} />
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Space Used</Text>
                <Text style={s.rowDesc}>SQLite database storage footprint</Text>
              </View>
              <Text style={s.statBadge}>{formatBytes(storageStats.dbSizeBytes)}</Text>
            </View>
          </Card>

          {/* ── Sync ─────────────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>🔄  Cloud Sync</Text>
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
          <Text style={s.sectionTitle}>🔐  Security</Text>
          <Card>
            <TouchableOpacity style={[s.row, s.rowLast]} onPress={handleChangePin}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Change PIN</Text>
                <Text style={s.rowDesc}>Reset your 4-digit app lock</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          </Card>

          {/* ── Data Management ───────────────────────────────────── */}
          <Text style={s.sectionTitle}>🗑️  Data Management</Text>
          <Card>
            <TouchableOpacity style={s.row} onPress={handleClearTracks}>
              <View style={s.rowLeft}>
                <Text style={[s.rowLabel, { color: colors.priorityHigh }]}>Clear All Tasks</Text>
                <Text style={s.rowDesc}>Delete all tasks and tags from this device</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity style={[s.row, s.rowLast]} onPress={handleFactoryReset}>
              <View style={s.rowLeft}>
                <Text style={[s.rowLabel, { color: colors.priorityHigh }]}>Factory Reset</Text>
                <Text style={s.rowDesc}>Erase all data, PIN, and encryption key</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          </Card>

          {/* ── About ────────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>ℹ️  About & Appearance</Text>
          <Card>
            <TouchableOpacity
              style={[s.row, s.rowLast]}
              onPress={() => navigation.navigate('Info')}
            >
              <View style={s.rowLeft}>
                <Text style={[s.rowLabel, { color: colors.primary }]}>App Information & Theme</Text>
                <Text style={s.rowDesc}>Version, guides, and Dark Mode appearance</Text>
              </View>
              <Text style={s.chevron}>›</Text>
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
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
      marginTop: 20,
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
    rowLeft: { flex: 1 },
    rowLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 2,
    },
    rowLabelDisabled: {
      color: colors.textTertiary,
    },
    rowDesc: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    statBadge: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
      backgroundColor: colors.primary + '18',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    chevron: {
      fontSize: 20,
      color: colors.textTertiary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    toggleContainer: {
      width: 56,
      alignItems: 'flex-end',
    },
  });
}
