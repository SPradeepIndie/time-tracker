/**
 * SettingsScreen.tsx
 *
 * Extended settings with:
 *  - Security: Change PIN, biometric toggle
 *  - Sync: Backend URL input, sync toggle with live validation
 *  - Appearance: Dark mode
 *  - About: App info
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
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
import { isRemoteUrl, syncDisabledReason, isInsecureUrl } from '../../utils/urlValidator';
import SyncStatusBadge from '../../components/sync/SyncStatusBadge';
import { useTrackContext } from '../../context/TrackContext';

interface Props {
  navigation: SettingsScreenNavigationProp;
}

const PIN_HASH_KEY = 'app_pin_hash';

export default function SettingsScreen({ navigation }: Props) {
  const { colors, isDark, toggleTheme } = useTheme();
  const {
    syncEnabled,
    backendUrl,
    syncStatus,
    syncError,
    canEnableSync,
    disabledReason,
    setSyncEnabled,
    setBackendUrl,
    triggerSync,
  } = useSyncContext();

  const { clearAllData } = useTrackContext();
  const [urlInput, setUrlInput] = useState(backendUrl);
  const [syncToggling, setSyncToggling] = useState(false);

  const urlIsRemote = isRemoteUrl(urlInput);
  const urlIsInsecure = isInsecureUrl(urlInput);
  const urlDisabledReason = syncDisabledReason(urlInput);

  const handleUrlBlur = async () => {
    if (urlInput !== backendUrl) {
      await setBackendUrl(urlInput.trim());
    }
  };

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
            await clearAllData(false); // keep encryption key
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
            // Second confirmation for destructive action
            Alert.alert(
              'Last warning',
              'All data will be permanently erased. This cannot be recovered.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Reset Everything',
                  style: 'destructive',
                  onPress: async () => {
                    await clearAllData(true); // delete key too
                    await SecureStore.deleteItemAsync(PIN_HASH_KEY);
                    Alert.alert('Reset complete', 'Please restart the app to set up a new PIN.');
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

        <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Data ──────────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>🗑️  Data</Text>
          <Card>
            <TouchableOpacity style={s.row} onPress={handleClearTracks}>
              <View style={s.rowLeft}>
                <Text style={[s.rowLabel, { color: colors.priorityHigh }]}>Clear All Tracks</Text>
                <Text style={s.rowDesc}>Delete all tracks and tags from this device</Text>
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

          {/* ── Security ──────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>🔐  Security</Text>
          <Card>
            <TouchableOpacity style={s.row} onPress={handleChangePin}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Change PIN</Text>
                <Text style={s.rowDesc}>Reset your 4-digit app lock</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          </Card>

          {/* ── Sync ─────────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>🔄  Sync</Text>
          <Card>
            {/* URL input */}
            <View style={[s.row, s.rowColumn]}>
              <Text style={s.rowLabel}>Backend URL</Text>
              <TextInput
                style={[
                  s.urlInput,
                  { borderColor: urlIsRemote ? colors.primary : colors.border },
                ]}
                value={urlInput}
                onChangeText={setUrlInput}
                onBlur={handleUrlBlur}
                placeholder="https://your-server.com"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {urlInput.length > 0 && !urlIsRemote && (
                <Text style={s.urlHint}>{urlDisabledReason}</Text>
              )}
              {urlIsInsecure && urlIsRemote && (
                <Text style={[s.urlHint, { color: '#FF9800' }]}>
                  ⚠ HTTP connection is not secure. Use HTTPS in production.
                </Text>
              )}
            </View>

            <View style={s.divider} />

            {/* Sync toggle */}
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowLeft}>
                <Text style={[s.rowLabel, !canEnableSync && s.rowLabelDisabled]}>
                  Sync with Backend
                </Text>
                <Text style={s.rowDesc}>
                  {syncEnabled
                    ? syncError
                      ? `Error: ${syncError}`
                      : 'Bidirectional sync is active'
                    : (urlInput ? (disabledReason ?? 'Tap to enable sync') : 'Enter a backend URL above')}
                </Text>
              </View>
              <View style={s.toggleContainer}>
                {syncToggling ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={syncEnabled}
                    onValueChange={handleSyncToggle}
                    disabled={!canEnableSync && !syncEnabled}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                )}
              </View>
            </View>

            {/* Manual sync button */}
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

          {/* ── Appearance ───────────────────────────────────────── */}
          <Text style={s.sectionTitle}>🌓  Appearance</Text>
          <Card>
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowLeft}>
                <Text style={s.rowLabel}>Dark Mode</Text>
                <Text style={s.rowDesc}>Toggle between light and dark theme</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </Card>

          {/* ── About ────────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>ℹ️  About</Text>
          <Card>
            <TouchableOpacity
              style={[s.row, s.rowLast]}
              onPress={() => navigation.navigate('Info')}
            >
              <Text style={[s.rowLabel, { color: colors.primary }]}>App Information</Text>
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
    rowColumn: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 8,
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
    chevron: {
      fontSize: 20,
      color: colors.textTertiary,
    },
    urlInput: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.background,
    },
    urlHint: {
      fontSize: 12,
      color: colors.priorityHigh,
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
