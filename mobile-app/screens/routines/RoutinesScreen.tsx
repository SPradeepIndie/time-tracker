/**
 * RoutinesScreen.tsx
 *
 * Manage routines with sub-activities and custom reminder matrix.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { useTheme } from '../../context/ThemeContext';
import { useRoutineContext } from '../../context/RoutineContext';
import { RoutinesScreenNavigationProp } from '../../navigation/types';
import { Routine, SubActivity, RoutineReminder, RoutineActivityLog, ROUTINE_COLORS } from '../../types/Routine';

interface Props { navigation: RoutinesScreenNavigationProp; }

export default function RoutinesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const {
    routines, isLoading,
    addRoutine, updateRoutine, deleteRoutine,
    getSubActivities, addSubActivity, deleteSubActivity,
    getReminders, addReminder, toggleReminderEnabled, deleteReminder,
    getDailyLogs, toggleActivityLog,
  } = useRoutineContext();

  const today = new Date().toISOString().split('T')[0];

  // Per-routine data (loaded on expand)
  const [subActivitiesMap, setSubActivitiesMap] = useState<Record<string, SubActivity[]>>({});
  const [remindersMap, setRemindersMap] = useState<Record<string, RoutineReminder[]>>({});
  const [logsMap, setLogsMap] = useState<Record<string, RoutineActivityLog[]>>({});
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);

  // Modals
  const [createRoutineModal, setCreateRoutineModal] = useState(false);
  const [reminderModal, setReminderModal] = useState(false);
  const [addActivityModal, setAddActivityModal] = useState(false);
  const [activeRoutineId, setActiveRoutineId] = useState<string>('');

  // Form state
  const [routineName, setRoutineName] = useState('');
  const [routineDesc, setRoutineDesc] = useState('');
  const [routineColor, setRoutineColor] = useState(ROUTINE_COLORS[0]);
  const [newActivity, setNewActivity] = useState('');
  const [reminderHour, setReminderHour] = useState('09');
  const [reminderMinute, setReminderMinute] = useState('00');

  const s = makeStyles(colors);

  const loadRoutineData = useCallback(async (routineId: string) => {
    const [acts, rems] = await Promise.all([
      getSubActivities(routineId),
      getReminders(routineId),
    ]);
    const logs = await getDailyLogs(routineId, acts, today);
    setSubActivitiesMap((p) => ({ ...p, [routineId]: acts }));
    setRemindersMap((p) => ({ ...p, [routineId]: rems }));
    setLogsMap((p) => ({ ...p, [routineId]: logs }));
  }, [getSubActivities, getReminders, getDailyLogs, today]);

  const handleExpandRoutine = useCallback(async (routineId: string) => {
    if (expandedRoutineId === routineId) {
      setExpandedRoutineId(null);
      return;
    }
    setExpandedRoutineId(routineId);
    await loadRoutineData(routineId);
  }, [expandedRoutineId, loadRoutineData]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCreateRoutine = useCallback(async () => {
    if (!routineName.trim()) return;
    await addRoutine(routineName.trim(), routineDesc.trim(), routineColor);
    setRoutineName(''); setRoutineDesc(''); setRoutineColor(ROUTINE_COLORS[0]);
    setCreateRoutineModal(false);
  }, [routineName, routineDesc, routineColor, addRoutine]);

  const handleAddActivity = useCallback(async () => {
    if (!newActivity.trim() || !activeRoutineId) return;
    await addSubActivity(activeRoutineId, newActivity.trim());
    setNewActivity('');
    setAddActivityModal(false);
    await loadRoutineData(activeRoutineId);
  }, [newActivity, activeRoutineId, addSubActivity, loadRoutineData]);

  const handleDeleteActivity = useCallback(async (routineId: string, actId: string) => {
    await deleteSubActivity(actId);
    await loadRoutineData(routineId);
  }, [deleteSubActivity, loadRoutineData]);

  const handleAddReminder = useCallback(async () => {
    const h = parseInt(reminderHour, 10);
    const m = parseInt(reminderMinute, 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      Alert.alert('Invalid time', 'Enter a valid hour (0-23) and minute (0-59).');
      return;
    }
    await addReminder(activeRoutineId, h, m);
    setReminderHour('09'); setReminderMinute('00');
    setReminderModal(false);
    await loadRoutineData(activeRoutineId);
  }, [reminderHour, reminderMinute, activeRoutineId, addReminder, loadRoutineData]);

  const handleToggleLog = useCallback(async (routineId: string, logId: string, current: boolean) => {
    await toggleActivityLog(logId, !current);
    // Reload logs
    const acts = subActivitiesMap[routineId] ?? [];
    const logs = await getDailyLogs(routineId, acts, today);
    setLogsMap((p) => ({ ...p, [routineId]: logs }));
  }, [toggleActivityLog, getDailyLogs, subActivitiesMap, today]);

  // ── Render a single routine card ─────────────────────────────────────────

  const renderRoutine = (routine: Routine) => {
    const isExpanded = expandedRoutineId === routine.id;
    const acts = subActivitiesMap[routine.id] ?? [];
    const logs = logsMap[routine.id] ?? [];
    const reminders = remindersMap[routine.id] ?? [];
    const checked = logs.filter((l) => l.isChecked).length;

    return (
      <View key={routine.id} style={[s.routineCard, { borderLeftColor: routine.color, borderLeftWidth: 4 }]}>
        {/* Header */}
        <TouchableOpacity style={s.routineHeader} onPress={() => handleExpandRoutine(routine.id)}>
          <View style={[s.colorBadge, { backgroundColor: routine.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.routineName}>{routine.name}</Text>
            {routine.description ? <Text style={s.routineDesc}>{routine.description}</Text> : null}
          </View>
          <Text style={s.progressText}>
            {acts.length > 0 ? `${checked}/${acts.length}` : 'No steps'}
          </Text>
          <Text style={s.chevron}>{isExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {/* Progress bar */}
        {acts.length > 0 && (
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.round((checked / acts.length) * 100)}%` as any, backgroundColor: routine.color }]} />
          </View>
        )}

        {/* Expanded content */}
        {isExpanded && (
          <View style={s.expandedContent}>
            {/* Sub-activities checklist */}
            <Text style={s.subSectionTitle}>✅ Activities</Text>
            {acts.length === 0 && (
              <Text style={s.emptyText}>No activities yet. Add one below.</Text>
            )}
            {acts.map((act) => {
              const log = logs.find((l) => l.subActivityId === act.id);
              const isChecked = log?.isChecked ?? false;
              return (
                <View key={act.id} style={s.activityRow}>
                  <TouchableOpacity
                    style={[s.checkbox, isChecked && { backgroundColor: routine.color, borderColor: routine.color }]}
                    onPress={() => log && handleToggleLog(routine.id, log.id, isChecked)}
                  >
                    {isChecked && <Text style={s.checkmark}>✓</Text>}
                  </TouchableOpacity>
                  <Text style={[s.activityText, isChecked && s.activityDone]}>{act.text}</Text>
                  <TouchableOpacity onPress={() => handleDeleteActivity(routine.id, act.id)}>
                    <Text style={s.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity
              style={s.addBtn}
              onPress={() => { setActiveRoutineId(routine.id); setAddActivityModal(true); }}
            >
              <Text style={[s.addBtnText, { color: routine.color }]}>+ Add Activity</Text>
            </TouchableOpacity>

            {/* Reminder Matrix */}
            <Text style={[s.subSectionTitle, { marginTop: 16 }]}>⏰ Reminders</Text>
            {reminders.length === 0 && <Text style={s.emptyText}>No reminders set.</Text>}
            {reminders.map((rem) => (
              <View key={rem.id} style={s.reminderRow}>
                <Text style={s.reminderTime}>
                  {String(rem.hour).padStart(2, '0')}:{String(rem.minute).padStart(2, '0')}
                </Text>
                <Switch
                  value={rem.isEnabled}
                  onValueChange={() => toggleReminderEnabled(rem)}
                  trackColor={{ false: colors.border, true: routine.color }}
                  thumbColor={rem.isEnabled ? '#fff' : colors.textSecondary}
                />
                <TouchableOpacity onPress={() => deleteReminder(rem)}>
                  <Text style={s.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={s.addBtn}
              onPress={() => { setActiveRoutineId(routine.id); setReminderModal(true); }}
            >
              <Text style={[s.addBtnText, { color: routine.color }]}>+ Add Reminder</Text>
            </TouchableOpacity>

            {/* Delete routine */}
            <TouchableOpacity
              style={s.deleteRoutineBtn}
              onPress={() => Alert.alert('Delete Routine', `Delete "${routine.name}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteRoutine(routine.id) },
              ])}
            >
              <Text style={[s.deleteRoutineText, { color: colors.error }]}>Delete Routine</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>🔄 Routines</Text>
          <TouchableOpacity
            style={[s.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => setCreateRoutineModal(true)}
          >
            <Text style={s.createBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : routines.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyStateIcon}>🔄</Text>
            <Text style={s.emptyStateText}>No routines yet.</Text>
            <Text style={s.emptyStateSubtext}>Create one to start tracking your habits.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.scrollContent}>
            {routines.map(renderRoutine)}
          </ScrollView>
        )}

        {/* Create Routine Modal */}
        <Modal visible={createRoutineModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>New Routine</Text>
              <TextInput
                style={[s.modalInput, { borderColor: colors.border, color: colors.text }]}
                placeholder="Routine name (e.g., Morning Routine)"
                placeholderTextColor={colors.placeholder}
                value={routineName}
                onChangeText={setRoutineName}
              />
              <TextInput
                style={[s.modalInput, { borderColor: colors.border, color: colors.text }]}
                placeholder="Description (optional)"
                placeholderTextColor={colors.placeholder}
                value={routineDesc}
                onChangeText={setRoutineDesc}
              />
              <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {ROUTINE_COLORS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setRoutineColor(c)}
                    style={[s.colorSwatch, { backgroundColor: c, borderWidth: routineColor === c ? 3 : 0, borderColor: colors.text }]}
                  />
                ))}
              </ScrollView>
              <View style={s.modalActions}>
                <TouchableOpacity onPress={() => setCreateRoutineModal(false)}>
                  <Text style={[s.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalConfirm, { backgroundColor: colors.primary }]}
                  onPress={handleCreateRoutine}
                >
                  <Text style={s.modalConfirmText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Activity Modal */}
        <Modal visible={addActivityModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Add Activity</Text>
              <TextInput
                style={[s.modalInput, { borderColor: colors.border, color: colors.text }]}
                placeholder="Activity description…"
                placeholderTextColor={colors.placeholder}
                value={newActivity}
                onChangeText={setNewActivity}
                autoFocus
              />
              <View style={s.modalActions}>
                <TouchableOpacity onPress={() => { setAddActivityModal(false); setNewActivity(''); }}>
                  <Text style={[s.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalConfirm, { backgroundColor: colors.primary }]}
                  onPress={handleAddActivity}
                >
                  <Text style={s.modalConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Reminder Modal */}
        <Modal visible={reminderModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Add Reminder</Text>
              <View style={s.timeRow}>
                <TextInput
                  style={[s.timeInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="HH"
                  placeholderTextColor={colors.placeholder}
                  value={reminderHour}
                  onChangeText={setReminderHour}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={[s.timeSep, { color: colors.text }]}>:</Text>
                <TextInput
                  style={[s.timeInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="MM"
                  placeholderTextColor={colors.placeholder}
                  value={reminderMinute}
                  onChangeText={setReminderMinute}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={s.modalActions}>
                <TouchableOpacity onPress={() => setReminderModal(false)}>
                  <Text style={[s.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalConfirm, { backgroundColor: colors.primary }]}
                  onPress={handleAddReminder}
                >
                  <Text style={s.modalConfirmText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
    createBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    routineCard: {
      backgroundColor: colors.card, borderRadius: 16, marginBottom: 16,
      overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07,
      shadowRadius: 10, elevation: 3,
    },
    routineHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
    colorBadge: { width: 14, height: 14, borderRadius: 7 },
    routineName: { fontSize: 16, fontWeight: '700', color: colors.text },
    routineDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    progressText: { fontSize: 13, color: colors.textSecondary, marginRight: 8 },
    chevron: { fontSize: 12, color: colors.textSecondary },
    progressBar: { height: 4, backgroundColor: colors.border, marginHorizontal: 16, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    expandedContent: { paddingHorizontal: 16, paddingBottom: 16 },
    subSectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 8 },
    activityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
    checkbox: {
      width: 22, height: 22, borderRadius: 5,
      borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    checkmark: { color: '#fff', fontWeight: '800', fontSize: 12 },
    activityText: { flex: 1, fontSize: 14, color: colors.text },
    activityDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
    deleteText: { color: colors.error, fontWeight: '700', fontSize: 16, paddingHorizontal: 4 },
    addBtn: { paddingVertical: 6 },
    addBtnText: { fontSize: 14, fontWeight: '600' },
    reminderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
    reminderTime: { fontSize: 15, fontWeight: '700', color: colors.text, width: 55 },
    deleteRoutineBtn: { marginTop: 16, alignItems: 'center' },
    deleteRoutineText: { fontSize: 14, fontWeight: '600' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyStateIcon: { fontSize: 64, marginBottom: 16 },
    emptyStateText: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
    emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    emptyText: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    modalInput: {
      borderWidth: 1, borderRadius: 10, padding: 12,
      fontSize: 15, marginBottom: 12,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
    modalCancel: { fontSize: 15, fontWeight: '600', padding: 8 },
    modalConfirm: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
    modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    colorSwatch: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
    timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
    timeInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 20, fontWeight: '700', width: 70, textAlign: 'center' },
    timeSep: { fontSize: 24, fontWeight: '700' },
  });
}

