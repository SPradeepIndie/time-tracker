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
} from 'react-native';
import { useTrackContext } from '../../context/TrackContext';
import { useTheme } from '../../context/ThemeContext';
import { HomeScreenNavigationProp } from '../../navigation/types';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
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

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; icon: string }
> = {
  created: { label: 'Created', color: '#6B7280', icon: '⚪' },
  'time-allocated': { label: 'Time Allocated', color: '#8B5CF6', icon: '🟣' },
  pending: { label: 'Pending', color: '#F59E0B', icon: '🟡' },
  'in-progress': { label: 'In Progress', color: '#3B82F6', icon: '🔵' },
  completed: { label: 'Completed', color: '#10B981', icon: '🟢' },
};

export default function HomeScreen({ navigation }: Props) {
  const { tracks, deleteTrack, updateTrack, searchTracks, refreshTracks } = useTrackContext();
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

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

  // Filter tasks
  const searchedTracks = searchQuery ? searchTracks(searchQuery) : tracks;
  const filteredTracks = searchedTracks.filter((t) => {
    if (activeFilter === 'completed') return t.status === 'completed';
    if (activeFilter === 'allocated') return t.taskType === 'allocated' && t.status !== 'completed';
    if (activeFilter === 'unallocated') return t.taskType === 'unallocated' && t.status !== 'completed';
    return true; // 'all'
  });

  // Calculate counts for filter chips
  const counts = {
    all: tracks.length,
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
            icon="🔍"
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
                { key: 'all', label: 'All Tasks', count: counts.all },
                { key: 'allocated', label: '⚡ Scheduled', count: counts.allocated },
                { key: 'unallocated', label: '📋 Unscheduled', count: counts.unallocated },
                { key: 'completed', label: '✅ Completed', count: counts.completed },
              ] as const
            ).map((tab) => {
              const active = activeFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.filterChip, active && s.filterChipActive]}
                  onPress={() => setActiveFilter(tab.key)}
                >
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

        {/* ── Task List ──────────────────────────────────────────── */}
        <FlatList
          data={filteredTracks}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingBottom: 90 }}
          renderItem={({ item }) => {
            const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.created;
            const priorityColor =
              item.priority === 'high'
                ? colors.priorityHigh
                : item.priority === 'medium'
                ? colors.priorityMedium
                : colors.priorityLow;

            return (
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
                      <View style={[s.priorityBadge, { backgroundColor: priorityColor + '20', borderColor: priorityColor }]}>
                        <Text style={[s.priorityText, { color: priorityColor }]}>
                          {item.priority === 'high' ? '🔴 High' : item.priority === 'medium' ? '🟡 Med' : '🟢 Low'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Description */}
                  {!!item.description && (
                    <Text style={s.trackDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}

                  {/* Allocated Time & Block Info (Module A) */}
                  {item.taskType === 'allocated' ? (
                    <View style={s.scheduleInfoBox}>
                      <Text style={s.scheduleIcon}>⏰</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.scheduleTime}>
                          {formatDisplayTime(item.allocatedStartTime)} – {formatDisplayTime(item.allocatedEndTime)}
                        </Text>
                        <Text style={s.scheduleBlocks}>
                          {item.blockMultiplier ? `${item.blockMultiplier} block${item.blockMultiplier > 1 ? 's' : ''}` : 'Scheduled'} · {item.durationMinutes || (item.blockMultiplier ? item.blockMultiplier * 45 : 45)} min
                        </Text>
                      </View>
                      <View style={s.trackTypeBadge}>
                        <Text style={s.trackTypeBadgeText}>⚡ Same-Day</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={s.unscheduledInfoBox}>
                      <Text style={s.unscheduledText}>📋 Unscheduled task</Text>
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
                      <Text style={s.statusIcon}>{statusInfo.icon}</Text>
                      <Text style={[s.statusDropdownText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                      <Text style={[s.statusDropdownChevron, { color: statusInfo.color }]}>▾</Text>
                    </TouchableOpacity>

                    {/* Actions */}
                    <View style={s.actions}>
                      <TouchableOpacity
                        style={s.iconActionBtn}
                        onPress={() => navigation.navigate('CreateEdit', { id: item.id })}
                      >
                        <Text style={s.actionEmoji}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.iconActionBtn}
                        onPress={() => handleDelete(item.id, item.title)}
                      >
                        <Text style={s.actionEmoji}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Text style={s.emptyEmoji}>📝</Text>
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
                        <Text style={s.statusOptionIcon}>{cfg.icon}</Text>
                        <Text
                          style={[
                            s.statusOptionLabel,
                            isCurrent && { color: cfg.color, fontWeight: 'bold' },
                          ]}
                        >
                          {cfg.label}
                        </Text>
                        {isCurrent && <Text style={[s.currentCheck, { color: cfg.color }]}>✓</Text>}
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
          onPress={() => navigation.navigate('CreateEdit', {})}
        >
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
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
      padding: 6,
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
  });
}
