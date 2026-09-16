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
import { AppIcon } from '../../components/ui/AppIcon';
import { DailyGoal, WeeklyGoal, WeeklyGoalCategory, MAX_DAILY_GOALS, INITIAL_DAILY_GOAL_FIELDS, getTodayDateString, getTomorrowDateString } from '../../types/Goal';
import { ROUTINE_COLORS } from '../../types/Routine';

interface Props { navigation: GoalsScreenNavigationProp; }

type TabType = 'daily' | 'weekly';

export default function GoalsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const {
    todayGoals, tomorrowGoals, isLoading,
    addDailyGoal, toggleDailyGoal, updateDailyGoalText, deleteDailyGoal, duplicateDailyGoal,
    categories, addCategory, updateCategory, deleteCategory,
    weeklyGoals, currentWeekLabel, nextWeekLabel, selectedWeekLabel, setSelectedWeekLabel,
    addWeeklyGoal, toggleWeeklyGoal, updateWeeklyGoalText, deleteWeeklyGoal, duplicateWeeklyGoal,
  } = useGoalContext();

  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [showAllFields, setShowAllFields] = useState(false);
  const [newGoalTexts, setNewGoalTexts] = useState<string[]>(Array(INITIAL_DAILY_GOAL_FIELDS).fill(''));

  // Category management modal
  const [categoryModal, setCategoryModal] = useState(false);
  const [selectedCatForColor, setSelectedCatForColor] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(ROUTINE_COLORS[0]);

  // Weekly goal add modal
  const [weeklyGoalModal, setWeeklyGoalModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [newWeeklyGoalText, setNewWeeklyGoalText] = useState('');

  // Edit Goal Modal (Daily or Weekly)
  const [editGoalModal, setEditGoalModal] = useState(false);
  const [editingGoalType, setEditingGoalType] = useState<'daily' | 'weekly'>('daily');
  const [editingGoalId, setEditingGoalId] = useState('');
  const [editingGoalText, setEditingGoalText] = useState('');

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

  const handleSaveEditedGoal = useCallback(async () => {
    if (!editingGoalText.trim() || !editingGoalId) return;
    try {
      if (editingGoalType === 'daily') {
        await updateDailyGoalText(editingGoalId, editingGoalText.trim());
      } else {
        await updateWeeklyGoalText(editingGoalId, editingGoalText.trim());
      }
      setEditGoalModal(false);
      setEditingGoalId('');
      setEditingGoalText('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [editingGoalText, editingGoalId, editingGoalType, updateDailyGoalText, updateWeeklyGoalText]);

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
        {goal.isCompleted && <AppIcon name="checkmark" size={14} color="#fff" />}
      </TouchableOpacity>
      <Text style={[s.goalText, goal.isCompleted && s.goalTextDone]}>{goal.text}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={() => {
            setEditingGoalType('daily');
            setEditingGoalId(goal.id);
            setEditingGoalText(goal.text);
            setEditGoalModal(true);
          }}
          style={s.actionIconBtn}
        >
          <AppIcon name="pencil" size={17} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => duplicateDailyGoal(goal)}
          style={s.actionIconBtn}
        >
          <AppIcon name="copy" size={17} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteDailyGoal(goal.id)} style={s.deleteBtn}>
          <AppIcon name="trash" size={17} color={colors.error || '#EF4444'} />
        </TouchableOpacity>
      </View>
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
            {goal.isCompleted && <AppIcon name="checkmark" size={14} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            onPress={() => hasChildren && toggleExpanded(goal.id)}
          >
            {hasChildren && (
              <AppIcon
                name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                size={14}
                color={colors.textSecondary}
              />
            )}
            <Text style={[s.goalText, goal.isCompleted && s.goalTextDone]}>
              {goal.text}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
            <TouchableOpacity
              onPress={() => {
                setEditingGoalType('weekly');
                setEditingGoalId(goal.id);
                setEditingGoalText(goal.text);
                setEditGoalModal(true);
              }}
              style={s.actionIconBtn}
            >
              <AppIcon name="pencil" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => duplicateWeeklyGoal(goal)}
              style={s.actionIconBtn}
            >
              <AppIcon name="copy" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteWeeklyGoal(goal.id)} style={s.deleteBtn}>
              <AppIcon name="trash" size={16} color={colors.error || '#EF4444'} />
            </TouchableOpacity>
          </View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="flag" size={24} color={colors.primary} />
            <Text style={s.headerTitle}>Goals</Text>
          </View>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <AppIcon name="calendar" size={16} color={colors.primary} />
                      <Text style={s.sectionTitle}>Today's Goals</Text>
                    </View>
                    {todayGoals.map(renderDailyGoalRow)}
                  </View>
                )}

                {/* Plan for tomorrow */}
                <View style={s.section}>
                  <View style={s.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppIcon name="moon" size={16} color={colors.primary} />
                      <Text style={s.sectionTitle}>Plan for Tomorrow</Text>
                    </View>
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
                {/* Week Selector: This Week vs Next Week */}
                <View style={s.weekSelectorContainer}>
                  <TouchableOpacity
                    style={[s.weekSelectorBtn, selectedWeekLabel === currentWeekLabel && s.weekSelectorBtnActive]}
                    onPress={() => setSelectedWeekLabel(currentWeekLabel)}
                  >
                    <Text style={[s.weekSelectorText, selectedWeekLabel === currentWeekLabel && s.weekSelectorTextActive]}>
                      This Week ({currentWeekLabel})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.weekSelectorBtn, selectedWeekLabel === nextWeekLabel && s.weekSelectorBtnActive]}
                    onPress={() => setSelectedWeekLabel(nextWeekLabel)}
                  >
                    <Text style={[s.weekSelectorText, selectedWeekLabel === nextWeekLabel && s.weekSelectorTextActive]}>
                      Next Week ({nextWeekLabel})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Manage categories */}
                <TouchableOpacity
                  style={[s.manageCatBtn, { borderColor: colors.border }]}
                  onPress={() => setCategoryModal(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppIcon name="settings" size={16} color={colors.primary} />
                    <Text style={[s.manageCatBtnText, { color: colors.primary }]}>Manage Categories & Colors</Text>
                  </View>
                </TouchableOpacity>

                {categories.map(renderCategory)}
              </View>
            )}
          </ScrollView>
        )}

        {/* ── Edit Goal Modal (Daily or Weekly) ───────────────────── */}
        <Modal visible={editGoalModal} transparent animationType="fade">
          <KeyboardAvoidingView
            style={s.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={s.modalBackdrop} />
            </TouchableWithoutFeedback>
            <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>
                {editingGoalType === 'daily' ? 'Edit Daily Goal' : 'Edit Weekly Goal'}
              </Text>
              <TextInput
                style={[s.modalInput, { borderColor: colors.border, color: colors.text }]}
                placeholder="Goal text…"
                placeholderTextColor={colors.placeholder}
                value={editingGoalText}
                onChangeText={setEditingGoalText}
                autoFocus
              />
              <View style={s.modalActions}>
                <TouchableOpacity onPress={() => { setEditGoalModal(false); setEditingGoalId(''); setEditingGoalText(''); }}>
                  <Text style={[s.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalConfirm, { backgroundColor: colors.primary }]}
                  onPress={handleSaveEditedGoal}
                >
                  <Text style={s.modalConfirmText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

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
                <Text style={[s.modalTitle, { color: colors.text }]}>Manage Categories & Colors</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                  Tap any category or its color dot to choose a new color palette.
                </Text>

                {categories.map((cat) => {
                  const isPickingColor = selectedCatForColor === cat.id;
                  return (
                    <View key={cat.id} style={{ marginBottom: 12 }}>
                      <View style={s.catRow}>
                        <TouchableOpacity
                          style={[
                            s.categoryDot,
                            {
                              backgroundColor: cat.color,
                              width: 26,
                              height: 26,
                              borderRadius: 13,
                              borderWidth: isPickingColor ? 3 : 0,
                              borderColor: colors.text,
                            },
                          ]}
                          onPress={() => setSelectedCatForColor(isPickingColor ? null : cat.id)}
                        />
                        <Text style={[s.catRowName, { color: colors.text }]}>{cat.name}</Text>
                        <TouchableOpacity
                          onPress={() => setSelectedCatForColor(isPickingColor ? null : cat.id)}
                          style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                        >
                          <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                            {isPickingColor ? 'Done' : 'Change Color'}
                          </Text>
                        </TouchableOpacity>
                        {!cat.isDefault && (
                          <TouchableOpacity onPress={() => deleteCategory(cat.id)} style={{ padding: 4 }}>
                            <Text style={{ color: colors.error, fontWeight: '600' }}>Delete</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Inline Color Palette Swatches */}
                      {isPickingColor && (
                        <View style={{ marginTop: 8, paddingLeft: 34 }}>
                          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                            Tap a color swatch for {cat.name}:
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {ROUTINE_COLORS.map((c) => (
                              <TouchableOpacity
                                key={c}
                                onPress={() => updateCategory(cat.id, { color: c })}
                                style={[
                                  s.colorSwatch,
                                  {
                                    backgroundColor: c,
                                    borderWidth: cat.color === c ? 3 : 0,
                                    borderColor: colors.text,
                                  },
                                ]}
                              />
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  );
                })}

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
      width: 22, height: 22, borderRadius: 6,
      borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
    checkmark: { color: '#fff', fontWeight: '800', fontSize: 13 },
    goalText: { flex: 1, fontSize: 15, color: colors.text },
    goalTextDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
    deleteBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    deleteBtnText: { color: colors.error, fontWeight: '700', fontSize: 15 },
    actionIconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
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
    weekSelectorContainer: {
      flexDirection: 'row',
      backgroundColor: colors.border + '50',
      borderRadius: 10,
      padding: 4,
      marginBottom: 16,
      gap: 4,
    },
    weekSelectorBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    weekSelectorBtnActive: {
      backgroundColor: colors.primary,
    },
    weekSelectorText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    weekSelectorTextActive: {
      color: '#FFFFFF',
    },
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
    catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    catRowName: { flex: 1, fontSize: 15, fontWeight: '600' },
    defaultBadge: { fontSize: 12 },
    addCatLabel: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
    colorSwatch: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  });
}
