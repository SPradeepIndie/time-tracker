import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SettingsScreenNavigationProp } from '../../navigation/types';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: Props) {
  const { colors, isDark, toggleTheme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
      marginTop: 8,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
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
    settingButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    settingIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    settingButtonText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '500',
    },
  });

  return (
    <SafeAreaView edges={['top']}>
      <View style={styles.container}>
        <Header title="Settings" />
        
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Card>
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
          </Card>

          <Text style={styles.sectionTitle}>About</Text>
          <Card>
            <TouchableOpacity
              style={[styles.settingButton, styles.settingItemLast]}
              onPress={() => navigation.navigate('Info')}
            >
              <Text style={styles.settingIcon}>ℹ️</Text>
              <Text style={styles.settingButtonText}>App Information</Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
