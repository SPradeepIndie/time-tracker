import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AppIcon } from '../components/ui/AppIcon';

export default function InfoScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <AppIcon name="information-circle-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>App Information</Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionBadgeText}>v1.0.0 Release</Text>
        </View>
      </View>

      {/* ── KATTA Tech Production Card ── */}
      <View style={[styles.section, styles.kattaCard]}>
        <Image
          source={require('../assets/katta-logo.png')}
          style={styles.kattaLogo}
          resizeMode="contain"
        />
        <View style={styles.kattaBadge}>
          <AppIcon name="shield-checkmark" size={14} color="#38BDF8" />
          <Text style={styles.kattaBadgeText}>A Production of KATTA Tech</Text>
        </View>
      </View>

      {/* ── Signature Card ── */}
      <View style={[styles.section, styles.signatureCard]}>
        <View style={styles.sectionHeaderRow}>
          <AppIcon name="ribbon-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Crafted with Precision</Text>
        </View>
        <Text style={styles.signatureName}>Sanjaya Pradeep</Text>
        <Text style={styles.signatureRole}>Architect & Lead Developer</Text>
        <Text style={styles.signatureNote}>
          Engineered as a high-performance, offline-first productivity operating system.
        </Text>
      </View>

      {/* ── App Overview ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <AppIcon name="phone-portrait-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Task Tracker OS</Text>
        </View>
        <Text style={styles.sectionText}>
          A robust offline-first task, goal, routine, and habit management ecosystem with 45-minute block scheduling and real-time analytical metrics.
        </Text>
      </View>

      {/* ── Core Features ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <AppIcon name="disc-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Core Features</Text>
        </View>
        <View style={styles.featureItem}>
          <AppIcon name="checkmark-circle-outline" size={16} color={colors.primary} style={styles.bulletIcon} />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Unallocated Tasks:</Text> Create immediate tasks and transition smoothly via state machine.
          </Text>
        </View>
        <View style={styles.featureItem}>
          <AppIcon name="checkmark-circle-outline" size={16} color={colors.primary} style={styles.bulletIcon} />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Allocated Tasks (Same-Day):</Text> Schedule tasks with 45-minute blocks using 3 distinct input modes.
          </Text>
        </View>
        <View style={styles.featureItem}>
          <AppIcon name="checkmark-circle-outline" size={16} color={colors.primary} style={styles.bulletIcon} />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Daily Goals:</Text> Night planning checklist with morning & afternoon verifications.
          </Text>
        </View>
        <View style={styles.featureItem}>
          <AppIcon name="checkmark-circle-outline" size={16} color={colors.primary} style={styles.bulletIcon} />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Weekly Goals:</Text> 3-tier hierarchical goal tracking across custom categories.
          </Text>
        </View>
        <View style={styles.featureItem}>
          <AppIcon name="checkmark-circle-outline" size={16} color={colors.primary} style={styles.bulletIcon} />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Routines & Habits:</Text> Daily & weekly recurring behavioral checklists with active tracking.
          </Text>
        </View>
        <View style={styles.featureItem}>
          <AppIcon name="checkmark-circle-outline" size={16} color={colors.primary} style={styles.bulletIcon} />
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Analytics:</Text> Real-time mathematical scoring evaluated across the full 24-hour cycle.
          </Text>
        </View>
      </View>

      {/* ── Task States ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <AppIcon name="layers-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Task States</Text>
        </View>
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

      {/* ── Priority Levels ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <AppIcon name="alert-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Priority Levels</Text>
        </View>
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

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Task Tracker v1.0.0 (Production Release)</Text>
        <Text style={styles.footerText}>Expo SDK 57 • SQLite Offline Engine</Text>
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
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    headerIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 6,
    },
    versionBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    versionBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    section: {
      backgroundColor: colors.surface,
      padding: 16,
      marginTop: 12,
      marginHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    kattaCard: {
      alignItems: 'center',
      paddingVertical: 24,
      backgroundColor: '#090D16',
      borderWidth: 1.5,
      borderColor: '#38BDF840',
      overflow: 'hidden',
    },
    kattaLogo: {
      width: 170,
      height: 170,
      marginBottom: 12,
    },
    kattaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#38BDF815',
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#38BDF835',
    },
    kattaBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#38BDF8',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    signatureCard: {
      borderWidth: 1.5,
      borderColor: colors.primary + '40',
      backgroundColor: colors.surface,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    signatureName: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.primary,
      marginTop: 2,
    },
    signatureRole: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    signatureNote: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    sectionText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    bulletIcon: {
      marginRight: 8,
      marginTop: 2,
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
