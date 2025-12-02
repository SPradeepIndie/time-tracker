import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/Track';
import { useTheme } from '../theme/ThemeContext';

type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: Props) {
  const { colors, isDark, toggleTheme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    section: {
      backgroundColor: colors.surface,
      marginTop: 12,
      paddingVertical: 8,
    },
    sectionHeader: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.background,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingItemLast: {
      borderBottomWidth: 0,
    },
    settingLeft: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    settingIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    settingButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingButtonLast: {
      borderBottomWidth: 0,
    },
    settingButtonText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '500',
    },
    themePreview: {
      flexDirection: 'row',
      gap: 8,
    },
    themeCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
    },
    infoSection: {
      backgroundColor: colors.surface,
      marginTop: 12,
      padding: 20,
      alignItems: 'center',
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    version: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Appearance</Text>
      </View>
      <View style={styles.section}>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingLabel}>🌓 Dark Mode</Text>
            <Text style={styles.settingDescription}>
              Toggle between light and dark theme
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>

        <View style={[styles.settingItem, styles.settingItemLast]}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingLabel}>🎨 Current Theme</Text>
            <Text style={styles.settingDescription}>
              {isDark ? 'Dark mode active' : 'Light mode active'}
            </Text>
          </View>
          <View style={styles.themePreview}>
            <View
              style={[styles.themeCircle, { backgroundColor: colors.primary }]}
            />
            <View
              style={[styles.themeCircle, { backgroundColor: colors.background }]}
            />
            <View
              style={[styles.themeCircle, { backgroundColor: colors.text }]}
            />
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>About</Text>
      </View>
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.settingButton, styles.settingButtonLast]}
          onPress={() => navigation.navigate('Info')}
        >
          <Text style={styles.settingIcon}>ℹ️</Text>
          <Text style={styles.settingButtonText}>App Information</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
