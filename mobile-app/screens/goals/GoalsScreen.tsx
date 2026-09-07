/**
 * GoalsScreen.tsx
 *
 * Segmented view for Daily Goals (Tomorrow's Plan) and Weekly Goals (3-tier hierarchy).
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList, ActivityIndicator,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { useTheme } from '../../context/ThemeContext';
import { useGoalContext } from '../../context/GoalContext';
import { GoalsScreenNavigationProp } from '../../navigation/types';
import { DailyGoal, WeeklyGoal, WeeklyGoalCategory, MAX_DAILY_GOALS, INITIAL_DAILY_GOAL_FIELDS, getTodayDateString, getTomorrowDateString } from '../../types/Goal';
import { ROUTINE_COLORS } from '../../types/Routine';

interface Props { navigation: GoalsScreenNavigationProp; }

type TabType = 'daily' | 'weekly';

export default function GoalsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const {
    todayGoals, tomorrowGoals, isLoading,
    addDailyGoal, toggleDailyGoal, deleteDailyGoal,
    categories, addCategory, deleteCategory,
    weeklyGoals, addWeeklyGoal, toggleWeeklyGoal, deleteWeeklyGoal,
  } = useGoalContext();

  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [showAllFields, setShowAllFields] = useState(false);
  const [newGoalTexts, setNewGoalTexts] = useState<string[]>(Array(INITIAL_DAILY_GOAL_FIELDS).fill(''));

  // Category management modal
  const [categoryModal, setCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(ROUTINE_COLORS[0]);

  // Weekly goal add modal
  const [weeklyGoalModal, setWeeklyGoalModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [newWeeklyGoalText, setNewWeeklyGoalText] = useState('');

  // Expanded goal IDs (for showing children)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const tomorrow = getTomorrowDateString();
  const today = getTodayDateString();

  const s = makeStyles(colors);

  // ── Daily Goal Submission ─────────────────────────────────────────────────

  const handleSubmitDailyGoals = useCallback(async () => {
    const nonEmpty = newGoalTexts.filter((t) => t.trim().length > 0);
    if (nonEmpty.length === 0) {
      Alert.alert('Nothing to save', 'Please enter at least one goal.');
      return;
    }
    try {
      for (const text of nonEmpty) {
        await addDailyGoal(text.trim(), tomorrow);
      }
      setNewGoalTexts(Array(showAllFields ? MAX_DAILY_GOALS : INITIAL_DAILY_GOAL_FIELDS).fill(''));
      Alert.alert('✅ Goals saved!', `${nonEmpty.length} goal${nonEmpty.length > 1 ? 's' : ''} added for tomorrow.`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [newGoalTexts, tomorrow, addDailyGoal, showAllFields]);

  // ── Weekly Goal Actions ───────────────────────────────────────────────────

  const handleAddWeeklyGoal = useCallback(async () => {
    if (!newWeeklyGoalText.trim() || !selectedCategoryId) return;
    try {
      await addWeeklyGoal(selectedCategoryId, newWeeklyGoalText.trim(), selectedParentId);
      setNewWeeklyGoalText('');
      setWeeklyGoalModal(false);
      setSelectedParentId(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [newWeeklyGoalText, selectedCategoryId, selectedParentId, addWeeklyGoal]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Helpers: get children ─────────────────────────────────────────────────

  const getChildren = (parentId: string | null, tier: number): WeeklyGoal[] =>
    weeklyGoals.filter((g) => g.parentId === parentId && g.tier === tier);

  // ── Render: Daily Goal Row ────────────────────────────────────────────────

  const renderDailyGoalRow = (goal: DailyGoal) => (
    <View key={goal.id} style={s.goalRow}>
      <TouchableOpacity
        style={[s.checkbox, goal.isCompleted && s.checkboxDone]}
        onPress={() => toggleDailyGoal(goal.id, !goal.isCompleted)}
      >
        {goal.isCompleted && <Text style={s.checkmark}>✓</Text>}
      </TouchableOpacity>
      <Text style={[s.goalText, goal.isCompleted && s.goalTextDone]}>{goal.text}</Text>
      <TouchableOpacity onPress={() => deleteDailyGoal(goal.id)} style={s.deleteBtn}>
        <Text style={s.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render: Weekly Goal Tier ──────────────────────────────────────────────

  const renderWeeklyGoal = (goal: WeeklyGoal, depth = 0): React.ReactNode => {
    const children = getChildren(goal.id, goal.tier + 1 as 1 | 2 | 3);
    const isExpanded = expandedIds.has(goal.id);
    const hasChildren = children.length > 0;
    const indent = depth * 20;

    return (
      <View key={goal.id}>
        <View style={[s.weeklyGoalRow, { marginLeft: indent }]}>
          <TouchableOpacity
            style={[s.checkbox, goal.isCompleted && s.checkboxDone]}
            onPress={() => toggleWeeklyGoal(goal.id, !goal.isCompleted)}
          >
            {goal.isCompleted && <Text style={s.checkmark}>✓</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => hasChildren && toggleExpanded(goal.id)}
          >
            <Text style={[s.goalText, goal.isCompleted && s.goalTextDone]}>
              {hasChildren ? (isExpanded ? '▾ ' : '▸ ') : '  '}{goal.text}
            </Text>
          </TouchableOpacity>
          {goal.tier < 3 && (
            <TouchableOpacity
              style={s.addSubBtn}
              onPress={() => {
                setSelectedParentId(goal.id);
                setSelectedCategoryId(goal.categoryId);
                setWeeklyGoalModal(true);
              }}
            >
              <Text style={[s.addSubBtnText, { color: colors.primary }]}>+Sub</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => deleteWeeklyGoal(goal.id)} style={s.deleteBtn}>
            <Text style={s.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        {isExpanded && children.map((c) => renderWeeklyGoal(c, depth + 1))}
      </View>
    );
  };

  // ── Render: Category Block ────────────────────────────────────────────────

  const renderCategory = (cat: WeeklyGoalCategory) => {
    const topGoals = getChildren(null, 1).filter((g) => g.categoryId === cat.id);
    const total = weeklyGoals.filter((g) => g.categoryId === cat.id).length;
    const completed = weeklyGoals.filter((g) => g.categoryId === cat.id && g.isCompleted).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <View key={cat.id} style={s.categoryCard}>
        <View style={s.categoryHeader}>
          <View style={[s.categoryDot, { backgroundColor: cat.color }]} />
          <Text style={s.categoryName}>{cat.name}</Text>
          <Text style={[s.categoryPct, { color: pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.error }]}>
            {pct}%
          </Text>
          {!cat.isDefault && (
            <TouchableOpacity onPress={() => deleteCategory(cat.id)} style={s.deleteBtn}>
              <Text style={s.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Progress bar */}
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: cat.color }]} />
        </View>

        {topGoals.map((g) => renderWeeklyGoal(g))}

        <TouchableOpacity
          style={[s.addGoalBtn, { borderColor: cat.color }]}
          onPress={() => {
            setSelectedCategoryId(cat.id);
            setSelectedParentId(null);
            setWeeklyGoalModal(true);
          }}
        >
          <Text style={[s.addGoalBtnText, { color: cat.color }]}>+ Add Goal</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Main Render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>🎯 Goals</Text>
        </View>

        {/* Tab Switcher */}
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'daily' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('daily')}
          >
            <Text style={[s.tabText, { color: activeTab === 'daily' ? colors.primary : colors.textSecondary }]}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'weekly' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('weekly')}
          >
            <Text style={[s.tabText, { color: activeTab === 'weekly' ? colors.primary : colors.textSecondary }]}>Weekly</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <ScrollView contentContainerStyle={[s.scrollContent, { paddingBottom: 150 }]} keyboardShouldPersistTaps="handled">
            {/* ── DAILY GOALS ────────────────────────────────────── */}
            {activeTab === 'daily' && (
              <View>
                {/* Today's goals */}
                {todayGoals.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>📅 Today's Goals</Text>
                    {todayGoals.map(renderDailyGoalRow)}
                  </View>
                )}

                {/* Plan for tomorrow */}
                <View style={s.section}>
                  <View style={s.sectionHeaderRow}>
                    <Text style={s.sectionTitle}>🌙 Plan for Tomorrow</Text>
                    <Text style={s.countLabel}>{tomorrowGoals.length}/{MAX_DAILY_GOALS}</Text>
                  </View>

                  {/* Existing tomorrow goals */}
                  {tomorrowGoals.map(renderDailyGoalRow)}

                  {/* Input fields for new goals */}
                  {tomorrowGoals.length < MAX_DAILY_GOALS && (
                    <>
                      {Array(showAllFields ? MAX_DAILY_GOALS - tomorrowGoals.length : Math.min(INITIAL_DAILY_GOAL_FIELDS, MAX_DAILY_GOALS - tomorrowGoals.length))
                        .fill(0)
                        .map((_, i) => (
                          <TextInput
                            key={i}
                            style={s.goalInput}
                            placeholder={`Goal ${tomorrowGoals.length + i + 1}…`}
                            placeholderTextColor={colors.placeholder}
                            value={newGoalTexts[i] ?? ''}
                            onChangeText={(t) => {
                              const next = [...newGoalTexts];
                              next[i] = t;
                              setNewGoalTexts(next);
                            }}
                          />
                        ))}

                      {!showAllFields && tomorrowGoals.length < MAX_DAILY_GOALS - INITIAL_DAILY_GOAL_FIELDS && (
                        <TouchableOpacity onPress={() => setShowAllFields(true)} style={s.expandBtn}>
                          <Text style={[s.expandBtnText, { color: colors.primary }]}>
                            + Add more (up to {MAX_DAILY_GOALS})
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleSubmitDailyGoals}>
                        <Text style={s.primaryBtnText}>Save Goals for Tomorrow</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* ── WEEKLY GOALS ───────────────────────────────────── */}
            {activeTab === 'weekly' && (
              <View>
                {/* Manage categories */}
                <TouchableOpacity
                  style={[s.manageCatBtn, { borderColor: colors.border }]}
                  onPress={() => setCategoryModal(true)}
                >
                  <Text style={[s.manageCatBtnText, { color: colors.primary }]}>⚙ Manage Categories</Text>
                </TouchableOpacity>

                {categories.map(renderCategory)}
              </View>
            )}
          </ScrollView>
        )}

        {/* ── Add Weekly Goal Modal ────────────────────────────────── */}
        <Modal visible={weeklyGoalModal} transparent animationType="fade">
          <KeyboardAvoidingView
            style={s.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={s.modalBackdrop} />
            </TouchableWithoutFeedback>
            <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                {selectedParentId ? 'Add Sub-Goal' : 'Add Goal'}
              </Text>
              <TextInput
                style={[s.modalInput, { borderColor: colors.border, color: colors.text }]}
                placeholder="Goal description…"
                placeholderTextColor={colors.placeholder}
                value={newWeeklyGoalText}
                onChangeText={setNewWeeklyGoalText}
                autoFocus
              />
              <View style={s.modalActions}>
                <TouchableOpacity onPress={() => { setWeeklyGoalModal(false); setNewWeeklyGoalText(''); }}>
                  <Text style={[s.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalConfirm, { backgroundColor: colors.primary }]}
                  onPress={handleAddWeeklyGoal}
                >
                  <Text style={s.modalConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── Category Management Modal ────────────────────────────── */}
        <Modal visible={categoryModal} transparent animationType="fade">
          <KeyboardAvoidingView
            style={s.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={s.modalBackdrop} />
            </TouchableWithoutFeedback>
            <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[s.modalTitle, { color: colors.text }]}>Manage Categories</Text>

                {categories.map((cat) => (
                  <View key={cat.id} style={s.catRow}>
                    <View style={[s.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={[s.catRowName, { color: colors.text }]}>{cat.name}</Text>
                    {cat.isDefault
                      ? <Text style={[s.defaultBadge, { color: colors.textSecondary }]}>Default</Text>
                      : <TouchableOpacity onPress={() => deleteCategory(cat.id)}>
                          <Text style={{ color: colors.error }}>Delete</Text>
                        </TouchableOpacity>
                    }
                  </View>
                ))}

                <Text style={[s.addCatLabel, { color: colors.text }]}>Add New Category</Text>
                <TextInput
                  style={[s.modalInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="Category name…"
                  placeholderTextColor={colors.placeholder}
                  value={newCatName}
                  onChangeText={setNewCatName}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                  {ROUTINE_COLORS.map((c) => (
                    <TouchableOpacity key={c} onPress={() => setNewCatColor(c)}
                      style={[s.colorSwatch, { backgroundColor: c, borderWidth: newCatColor === c ? 3 : 0, borderColor: colors.text }]}
                    />
                  ))}
                </ScrollView>

                <View style={s.modalActions}>
                  <TouchableOpacity onPress={() => { setCategoryModal(false); setNewCatName(''); }}>
                    <Text style={[s.modalCancel, { color: colors.textSecondary }]}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.modalConfirm, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      if (!newCatName.trim()) return;
                      try {
                        await addCategory(newCatName.trim(), newCatColor);
                        setNewCatName('');
                      } catch (e: any) {
                        Alert.alert('Error', e.message);
                      }
                    }}
                  >
                    <Text style={s.modalConfirmText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingVertical: 16 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    tabText: { fontSize: 15, fontWeight: '700' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 24 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
    countLabel: { fontSize: 13, color: colors.textSecondary },
    goalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
    weeklyGoalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    checkbox: {
      width: 22, height: 22, borderRadius: 5,
      borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
    checkmark: { color: '#fff', fontWeight: '800', fontSize: 13 },
    goalText: { flex: 1, fontSize: 15, color: colors.text },
    goalTextDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
    deleteBtn: { padding: 4 },
    deleteBtnText: { color: colors.error, fontWeight: '700', fontSize: 15 },
    addSubBtn: { paddingHorizontal: 6 },
    addSubBtnText: { fontSize: 12, fontWeight: '700' },
    goalInput: {
      borderWidth: 1, borderColor: colors.border, borderRadius: 10,
      padding: 12, marginBottom: 10, color: colors.text,
      backgroundColor: colors.card, fontSize: 15,
    },
    expandBtn: { alignItems: 'center', marginBottom: 10 },
    expandBtnText: { fontSize: 14, fontWeight: '600' },
    primaryBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    manageCatBtn: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16 },
    manageCatBtnText: { fontWeight: '700', fontSize: 14 },
    categoryCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 16,
      marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06,
      shadowRadius: 8, elevation: 2,
    },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    categoryDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
    categoryName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
    categoryPct: { fontSize: 15, fontWeight: '700', marginRight: 8 },
    progressBar: {
      height: 6, backgroundColor: colors.border, borderRadius: 3,
      marginBottom: 12, overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3 },
    addGoalBtn: {
      borderWidth: 1, borderRadius: 8, padding: 8,
      alignItems: 'center', marginTop: 8,
    },
    addGoalBtnText: { fontSize: 14, fontWeight: '600' },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFill,
    },
    modalCard: {
      borderRadius: 20,
      padding: 20,
      maxHeight: '85%',
      elevation: 6,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    modalInput: {
      borderWidth: 1, borderRadius: 10, padding: 12,
      fontSize: 15, marginBottom: 12,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
    modalCancel: { fontSize: 15, fontWeight: '600', padding: 8 },
    modalConfirm: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
    modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    catRowName: { flex: 1, fontSize: 15, fontWeight: '600' },
    defaultBadge: { fontSize: 12 },
    addCatLabel: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
    colorSwatch: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  });
}
