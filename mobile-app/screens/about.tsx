import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function InfoScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ℹ️ App Information</Text>
      </View>

      {/* ── Appearance Section (Moved from Settings) ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌓 Appearance</Text>
        <View style={styles.themeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.themeLabel}>Dark Mode</Text>
            <Text style={styles.themeDesc}>Switch between light and dark visual themes</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Task Tracker App</Text>
        <Text style={styles.sectionText}>
          A robust offline-first task, goal, and routine management app with 45-minute block scheduling and analytics.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Core Features</Text>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Unallocated Tasks:</Text> Create immediate tasks and transition via state machine.
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Allocated Tasks (Same-Day):</Text> Schedule tasks with 45-minute blocks using 3 distinct input modes.
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Daily Goals:</Text> Night planning checklist with morning & afternoon verifications.
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Weekly Goals:</Text> 3-tier hierarchical goal tracking across custom categories.
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Routines:</Text> Sub-activity checklists with custom daily reminder matrices.
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Analytics:</Text> Real-time mathematical scoring for tasks, goals, and routines.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Task States</Text>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: '#6B7280' }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>Created:</Text> Initial state upon creation
          </Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: '#8B5CF6' }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>Time Allocated:</Text> Scheduled within the current day
          </Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>Pending / In Progress:</Text> Active or awaiting execution
          </Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>Completed:</Text> Task successfully accomplished
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚦 Priority Levels</Text>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: colors.priorityLow }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>Low:</Text> Can wait, lower urgency
          </Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: colors.priorityMedium }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>Medium:</Text> Standard priority task
          </Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: colors.priorityHigh }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>High:</Text> Urgent focus required
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Task Tracker v1.0.0 (Expo SDK 57)</Text>
        <Text style={styles.footerText}>Offline-First Local Storage Engine</Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
    },
    section: {
      backgroundColor: colors.surface,
      padding: 16,
      marginTop: 12,
      marginHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    sectionText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    themeLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    themeDesc: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    featureItem: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    bulletPoint: {
      fontSize: 16,
      color: colors.primary,
      marginRight: 8,
      lineHeight: 20,
    },
    featureText: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    bold: {
      fontWeight: 'bold',
      color: colors.text,
    },
    statusItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    statusBadge: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginRight: 10,
    },
    statusText: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
    },
    footer: {
      padding: 24,
      marginTop: 16,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 13,
      color: colors.textTertiary,
      marginBottom: 4,
    },
  });
}
