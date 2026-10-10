/**
 * HomeScreen.tsx
 *
 * Primary Task Viewing Tab for Module A:
 *  - Filter chips: All, Scheduled (Today), Unscheduled, Completed
 *  - Task cards displaying Priority, Track Type, and 45-min Block Duration Info
 *  - Interactive Status Dropdown / Transition Modal conforming to state machine rules
 *  - Auto-transition: automatically transitions time-allocated tasks to in-progress when clock hits start time
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  ToastAndroid,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTrackContext } from '../../context/TrackContext';
import { useTheme } from '../../context/ThemeContext';
import { HomeScreenNavigationProp } from '../../navigation/types';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { AppIcon } from '../../components/ui/AppIcon';
import * as SecureStore from 'expo-secure-store';
import { Track, TaskStatus } from '../../types/Track';

interface Props {
  navigation: HomeScreenNavigationProp;
}

type FilterType = 'all' | 'allocated' | 'unallocated' | 'completed';

function formatTwoDigits(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDisplayTime(d: Date | string | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${formatTwoDigits(m)} ${ampm}`;
}

function getScheduledDateLabel(d: Date): string {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const tm = new Date();
  tm.setDate(tm.getDate() + 1);
  if (d.toDateString() === tm.toDateString()) return 'Tomorrow';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; icon: string; family?: 'ionicons' | 'feather' | 'material' }
> = {
  created: { label: 'Created', color: '#6B7280', icon: 'ellipse' },
  'time-allocated': { label: 'Time Allocated', color: '#8B5CF6', icon: 'time' },
  pending: { label: 'Pending', color: '#F59E0B', icon: 'hourglass' },
  'in-progress': { label: 'In Progress', color: '#3B82F6', icon: 'play-circle' },
  completed: { label: 'Completed', color: '#10B981', icon: 'checkmark-circle' },
};

export default function HomeScreen({ navigation }: Props) {
  const { tracks, deleteTrack, updateTrack, searchTracks, refreshTracks, addTrack, reorderTracks } = useTrackContext();
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('unallocated');
  const [refreshing, setRefreshing] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showFabActionModal, setShowFabActionModal] = useState(false);

  // Sorting state (configured via Settings)
  const [taskSortBy, setTaskSortBy] = useState<'priority' | 'status'>('priority');
  const [taskSortOrder, setTaskSortOrder] = useState<'asc' | 'desc'>('desc');

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
    })();
  }, []);

  // Status transition modal state
  const [selectedTaskForStatus, setSelectedTaskForStatus] = useState<Track | null>(null);

  // Auto-transition engine: check clock every 30 seconds for scheduled tasks
  useEffect(() => {
    const checkScheduledTransitions = () => {
      const now = new Date();
      tracks.forEach((t) => {
        if (t.taskType === 'allocated' && t.allocatedStartTime) {
          const start = new Date(t.allocatedStartTime);
          // If task is in 'time-allocated' and current time has reached start time -> auto transition to 'in-progress'
          if (t.status === 'time-allocated' && now.getTime() >= start.getTime()) {
            updateTrack(t.id, { status: 'in-progress' }).catch(console.error);
          }
        }
      });
    };

    checkScheduledTransitions();
    const interval = setInterval(checkScheduledTransitions, 30000);
    return () => clearInterval(interval);
  }, [tracks, updateTrack]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshTracks();
    setRefreshing(false);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTrack(id),
        },
      ]
    );
  };

  const handleCopyTask = (title: string) => {
    Clipboard.setStringAsync(title);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied', 'Task title copied to clipboard');
    }
  };

  // Filter tasks (hide completed from active workspace view)
  const searchedTracks = searchQuery ? searchTracks(searchQuery) : tracks;
  const filteredTracks = searchedTracks.filter((t) => {
    if (activeFilter === 'completed') return t.status === 'completed';
    if (activeFilter === 'allocated') return t.taskType === 'allocated' && t.status !== 'completed';
    if (activeFilter === 'unallocated') return t.taskType === 'unallocated' && t.status !== 'completed';
    return t.status !== 'completed';
  });

  // Sort tasks
  const sortedTracks = [...filteredTracks].sort((a, b) => {
    if (isReorderMode) {
      return (a.position ?? 0) - (b.position ?? 0);
    }
    if (taskSortBy === 'priority') {
      const pWeights: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const diff = (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0);
      return taskSortOrder === 'asc' ? -diff : diff;
    } else {
      const sWeights: Record<string, number> = {
        'in-progress': 4,
        'time-allocated': 3,
        pending: 2,
        created: 1,
        completed: 0,
      };
      const diff = (sWeights[b.status] || 0) - (sWeights[a.status] || 0);
      return taskSortOrder === 'asc' ? -diff : diff;
    }
  });

  const handleMoveTask = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedTracks.length) return;

    const currentList = [...sortedTracks];
    const [moved] = currentList.splice(index, 1);
    currentList.splice(targetIndex, 0, moved);

    const reorderedItems = currentList.map((t, idx) => ({ id: t.id, position: idx }));
    await reorderTracks(reorderedItems);
  };

  const getGroupKey = (track: Track): string => {
    if (taskSortBy === 'priority') {
      return track.priority === 'high' ? 'High Priority' : track.priority === 'medium' ? 'Medium Priority' : 'Low Priority';
    } else {
      return STATUS_CONFIG[track.status]?.label || track.status;
    }
  };

  // Calculate counts for filter chips
  const counts = {
    all: tracks.filter((t) => t.status !== 'completed').length,
    allocated: tracks.filter((t) => t.taskType === 'allocated' && t.status !== 'completed').length,
    unallocated: tracks.filter((t) => t.taskType === 'unallocated' && t.status !== 'completed').length,
    completed: tracks.filter((t) => t.status === 'completed').length,
  };

  // Status transitions conforming to state machines
  const getAllowedStatuses = (task: Track): TaskStatus[] => {
    if (task.taskType === 'allocated') {
      // Track 2: created → time-allocated → in-progress → completed
      return ['created', 'time-allocated', 'in-progress', 'completed'];
    }
    // Track 1: created → pending → in-progress → completed
    return ['created', 'pending', 'in-progress', 'completed'];
  };

  const handleSelectStatus = async (newStatus: TaskStatus) => {
    if (!selectedTaskForStatus) return;
    const task = selectedTaskForStatus;
    setSelectedTaskForStatus(null);

    if (task.status === newStatus) return;

    try {
      await updateTrack(task.id, {
        status: newStatus,
        endTime: newStatus === 'completed' ? new Date() : undefined,
      });
    } catch {
      Alert.alert('Error', 'Failed to update task status.');
    }
  };

  const s = makeStyles(colors);

  return (
    <SafeAreaView edges={['top']}>
      <View style={s.container}>
        <Header title="Task Tracker" />

        {/* ── Search Bar ─────────────────────────────────────────── */}
        <View style={s.searchContainer}>
          <Input
            placeholder="Search tasks by title, tag, description…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={<AppIcon name="search-outline" size={18} color={colors.textSecondary} />}
          />
        </View>

        {/* ── Filter Tabs (Module A) ─────────────────────────────── */}
        <View style={s.filterScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterContainer}
          >
            {(
              [
                { key: 'all', label: 'All Tasks', icon: 'layers-outline', count: counts.all },
                { key: 'allocated', label: 'Scheduled', icon: 'time-outline', count: counts.allocated },
                { key: 'unallocated', label: 'Unscheduled', icon: 'document-text-outline', count: counts.unallocated },
                { key: 'completed', label: 'Completed', icon: 'checkmark-done-outline', count: counts.completed },
              ] as const
            ).map((tab) => {
              const active = activeFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.filterChip, active && s.filterChipActive]}
                  onPress={() => setActiveFilter(tab.key)}
                >
                  <AppIcon
                    name={tab.icon}
                    size={14}
                    color={active ? '#fff' : colors.textSecondary}
                  />
                  <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                    {tab.label}
                  </Text>
                  <View style={[s.filterBadge, active && s.filterBadgeActive]}>
                    <Text style={[s.filterBadgeText, active && s.filterBadgeTextActive]}>
                      {tab.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── List Meta & Reorder Toggle ─────────────────────────── */}
        <View style={s.listMetaRow}>
          <Text style={s.listMetaCount}>
            {sortedTracks.length} {sortedTracks.length === 1 ? 'task' : 'tasks'}
          </Text>
          <TouchableOpacity
            style={[s.reorderToggleBtn, isReorderMode && s.reorderToggleBtnActive]}
            onPress={() => setIsReorderMode((prev) => !prev)}
          >
            <AppIcon
              name="reorder-two-outline"
              size={16}
              color={isReorderMode ? colors.primary : colors.textSecondary}
            />
            <Text style={[s.reorderToggleText, isReorderMode && s.reorderToggleTextActive]}>
              {isReorderMode ? 'Done' : 'Reorder'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Task List ──────────────────────────────────────────── */}
        <FlatList
          data={sortedTracks}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingBottom: 90 }}
          renderItem={({ item, index }) => {
            const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.created;
            const priorityColor =
              item.priority === 'high'
                ? colors.priorityHigh
                : item.priority === 'medium'
                ? colors.priorityMedium
                : colors.priorityLow;

            const showGroupDivider = index === 0 || getGroupKey(sortedTracks[index - 1]) !== getGroupKey(item);

            return (
              <View>
                {showGroupDivider && (
                  <View style={s.groupDividerContainer}>
                    <Text style={s.groupDividerTitle}>{getGroupKey(item)}</Text>
                    <View style={s.groupDividerLine} />
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => navigation.navigate('TrackDetails', { id: item.id })}
                  activeOpacity={0.8}
                >
                  <Card style={s.trackCard}>
                    {/* Header Row: Title & Priority */}
                    <View style={s.trackHeader}>
                      <Text style={s.trackTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View style={s.badgeRow}>
                        <View style={[s.priorityBadge, { backgroundColor: priorityColor + '20', borderColor: priorityColor, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                          <AppIcon
                            name={item.priority === 'high' ? 'alert-circle' : item.priority === 'medium' ? 'remove-circle' : 'checkmark-circle'}
                            size={12}
                            color={priorityColor}
                          />
                          <Text style={[s.priorityText, { color: priorityColor }]}>
                            {item.priority === 'high' ? 'High' : item.priority === 'medium' ? 'Med' : 'Low'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Reorder Buttons Row (when in Reorder Mode) */}
                    {isReorderMode && (
                      <View style={s.reorderControlsRow}>
                        <Text style={s.reorderPosText}>Position #{index + 1}</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={[s.reorderBtn, index === 0 && s.reorderBtnDisabled]}
                            onPress={() => handleMoveTask(index, 'up')}
                            disabled={index === 0}
                          >
                            <AppIcon
                              name="chevron-up"
                              size={16}
                              color={index === 0 ? colors.border : colors.primary}
                            />
                            <Text style={[s.reorderBtnText, index === 0 && { color: colors.border }]}>
                              Move Up
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.reorderBtn, index === sortedTracks.length - 1 && s.reorderBtnDisabled]}
                            onPress={() => handleMoveTask(index, 'down')}
                            disabled={index === sortedTracks.length - 1}
                          >
                            <AppIcon
                              name="chevron-down"
                              size={16}
                              color={index === sortedTracks.length - 1 ? colors.border : colors.primary}
                            />
                            <Text
                              style={[
                                s.reorderBtnText,
                                index === sortedTracks.length - 1 && { color: colors.border },
                              ]}
                            >
                              Move Down
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Description */}
                    {!!item.description && (
                      <Text style={s.trackDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}

                    {/* Allocated Time & Block Info (Module A) */}
                    {item.taskType === 'allocated' ? (
                      <View style={s.scheduleInfoBox}>
                        <AppIcon name="time-outline" size={18} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.scheduleTime}>
                            {formatDisplayTime(item.allocatedStartTime)} – {formatDisplayTime(item.allocatedEndTime)}
                          </Text>
                          <Text style={s.scheduleBlocks}>
                            {item.blockMultiplier ? `${item.blockMultiplier} block${item.blockMultiplier > 1 ? 's' : ''}` : 'Scheduled'} · {item.durationMinutes || (item.blockMultiplier ? item.blockMultiplier * 45 : 45)} min
                          </Text>
                        </View>
                        <View style={[s.trackTypeBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                          <AppIcon name="calendar-outline" size={12} color={colors.primary} />
                          <Text style={s.trackTypeBadgeText}>
                            {item.allocatedStartTime
                              ? getScheduledDateLabel(new Date(item.allocatedStartTime))
                              : 'Scheduled'}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={[s.unscheduledInfoBox, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                        <AppIcon name="document-text-outline" size={14} color={colors.textSecondary} />
                        <Text style={s.unscheduledText}>Unscheduled task</Text>
                      </View>
                    )}

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <View style={s.tagsContainer}>
                        {item.tags.map((tag, idx) => (
                          <View key={idx} style={s.tag}>
                            <Text style={s.tagText}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Footer Row: Interactive Status Dropdown & Action Buttons */}
                    <View style={s.trackFooter}>
                      {/* Status Button (Tappable Dropdown) */}
                      <TouchableOpacity
                        style={[s.statusDropdownBtn, { backgroundColor: statusInfo.color + '18', borderColor: statusInfo.color }]}
                        onPress={() => setSelectedTaskForStatus(item)}
                      >
                        <AppIcon name={statusInfo.icon} size={15} color={statusInfo.color} />
                        <Text style={[s.statusDropdownText, { color: statusInfo.color }]}>
                          {statusInfo.label}
                        </Text>
                        <AppIcon name="chevron-down" size={14} color={statusInfo.color} />
                      </TouchableOpacity>

                      {/* Actions */}
                      <View style={s.actions}>
                        <TouchableOpacity
                          style={s.iconActionBtn}
                          onPress={() => handleCopyTask(item.title)}
                        >
                          <AppIcon name="copy" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.iconActionBtn}
                          onPress={() => navigation.navigate('CreateEdit', { id: item.id })}
                        >
                          <AppIcon name="create" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.iconActionBtn}
                          onPress={() => handleDelete(item.id, item.title)}
                        >
                          <AppIcon name="trash" size={18} color={colors.error || '#EF4444'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <AppIcon name="document-text-outline" size={48} color={colors.border} />
              <Text style={s.emptyTitle}>No tasks found</Text>
              <Text style={s.emptyText}>
                {searchQuery
                  ? 'No tasks match your search query.'
                  : activeFilter === 'allocated'
                  ? 'No scheduled tasks today. Tap + to add one.'
                  : activeFilter === 'completed'
                  ? 'No completed tasks yet.'
                  : 'Tap the + button below to create your first task!'}
              </Text>
            </View>
          }
        />

        {/* ── Status Transition Modal (Dropdown) ─────────────────── */}
        <Modal
          visible={!!selectedTaskForStatus}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedTaskForStatus(null)}
        >
          <TouchableOpacity
            style={s.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedTaskForStatus(null)}
          >
            <View style={s.modalCard} onStartShouldSetResponder={() => true}>
              <Text style={s.modalTitle}>Change Task Status</Text>
              <Text style={s.modalSubtitle} numberOfLines={1}>
                {selectedTaskForStatus?.title}
              </Text>

              <View style={s.statusOptionsList}>
                {selectedTaskForStatus &&
                  getAllowedStatuses(selectedTaskForStatus).map((st) => {
                    const cfg = STATUS_CONFIG[st];
                    const isCurrent = selectedTaskForStatus.status === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[
                          s.statusOptionItem,
                          isCurrent && { backgroundColor: cfg.color + '22', borderColor: cfg.color },
                        ]}
                        onPress={() => handleSelectStatus(st)}
                      >
                        <AppIcon name={cfg.icon} size={18} color={cfg.color} />
                        <Text
                          style={[
                            s.statusOptionLabel,
                            isCurrent && { color: cfg.color, fontWeight: 'bold' },
                          ]}
                        >
                          {cfg.label}
                        </Text>
                        {isCurrent && <AppIcon name="checkmark" size={16} color={cfg.color} />}
                      </TouchableOpacity>
                    );
                  })}
              </View>

              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setSelectedTaskForStatus(null)}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── FAB to Add Task ────────────────────────────────────── */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => setShowFabActionModal(true)}
        >
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>

        {/* ── FAB Action Selection Modal ─────────────────────────── */}
        <Modal
          visible={showFabActionModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFabActionModal(false)}
        >
          <TouchableOpacity
            style={s.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowFabActionModal(false)}
          >
            <View style={s.fabModalCard} onStartShouldSetResponder={() => true}>
              <Text style={s.fabModalTitle}>Create New Task</Text>
              <Text style={s.fabModalSubtitle}>Choose how you want to track your task</Text>

              <TouchableOpacity
                style={s.fabOptionCard}
                onPress={() => {
                  setShowFabActionModal(false);
                  navigation.navigate('CreateEdit', {});
                }}
              >
                <View style={[s.fabOptionIconBox, { backgroundColor: colors.primary + '18' }]}>
                  <AppIcon name="calendar-outline" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fabOptionTitle}>Plan a Task</Text>
                  <Text style={s.fabOptionDesc}>Schedule allocated time or plan for later</Text>
                </View>
                <AppIcon name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.fabOptionCard}
                onPress={() => {
                  setShowFabActionModal(false);
                  navigation.navigate('Blast');
                }}
              >
                <View style={[s.fabOptionIconBox, { backgroundColor: '#F59E0B18' }]}>
                  <AppIcon name="flash-outline" size={24} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fabOptionTitle}>Blast (Quick Track)</Text>
                  <Text style={s.fabOptionDesc}>Immediate stopwatch or countdown timer session</Text>
                </View>
                <AppIcon name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setShowFabActionModal(false)}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    groupDividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 8,
      gap: 10,
    },
    groupDividerTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    groupDividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    filterScrollWrapper: {
      marginBottom: 8,
    },
    filterContainer: {
      paddingHorizontal: 16,
      gap: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: '#fff',
    },
    filterBadge: {
      backgroundColor: colors.border,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
    },
    filterBadgeActive: {
      backgroundColor: '#ffffff35',
    },
    filterBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: colors.textSecondary,
    },
    filterBadgeTextActive: {
      color: '#fff',
    },
    trackCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 14,
    },
    trackHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 6,
    },
    trackTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      flex: 1,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 6,
    },
    priorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    priorityText: {
      fontSize: 11,
      fontWeight: 'bold',
    },
    trackDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 18,
    },
    scheduleInfoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '0D',
      padding: 10,
      borderRadius: 8,
      marginBottom: 8,
      gap: 8,
    },
    scheduleIcon: {
      fontSize: 18,
    },
    scheduleTime: {
      fontSize: 13,
      fontWeight: 'bold',
      color: colors.primary,
    },
    scheduleBlocks: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    trackTypeBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    trackTypeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    unscheduledInfoBox: {
      marginBottom: 6,
    },
    unscheduledText: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    tag: {
      backgroundColor: colors.primaryLight + '20',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.primaryLight,
    },
    tagText: {
      color: colors.primary,
      fontSize: 11,
    },
    trackFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border + '60',
    },
    statusDropdownBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      gap: 6,
    },
    statusIcon: {
      fontSize: 12,
    },
    statusDropdownText: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    statusDropdownChevron: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    actions: {
      flexDirection: 'row',
      gap: 6,
    },
    iconActionBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionEmoji: {
      fontSize: 16,
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
    emptyEmoji: {
      fontSize: 40,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 6,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
      lineHeight: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: '#00000060',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 340,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 6,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 16,
    },
    statusOptionsList: {
      gap: 8,
      marginBottom: 16,
    },
    statusOptionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    statusOptionIcon: {
      fontSize: 16,
      marginRight: 12,
    },
    statusOptionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    currentCheck: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    modalCancelBtn: {
      paddingVertical: 10,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    fabText: {
      fontSize: 32,
      color: '#fff',
      fontWeight: 'bold',
      marginTop: -2,
    },
    listMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    listMetaCount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    reorderToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    reorderToggleBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '18',
    },
    reorderToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    reorderToggleTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    reorderControlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    reorderPosText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    reorderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primary + '12',
    },
    reorderBtnDisabled: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    reorderBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    fabModalCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 6,
    },
    fabModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    fabModalSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 16,
    },
    fabOptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      marginBottom: 10,
    },
    fabOptionIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fabOptionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    fabOptionDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
}
