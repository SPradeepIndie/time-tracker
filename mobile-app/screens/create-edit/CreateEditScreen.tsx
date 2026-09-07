/**
 * CreateEditScreen.tsx
 *
 * Comprehensive task creation and editing supporting:
 *  - Title, description, and tags
 *  - Priority selection (Low, Medium, High)
 *  - Track 1: Unallocated tasks (default)
 *  - Track 2: Same-Day Allocated tasks with 45-minute blocks and 3 input modes:
 *      1. Start Time - End Time
 *      2. Start Time - Duration
 *      3. Duration only (implicitly Start Time = now)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { CreateEditScreenNavigationProp, CreateEditScreenRouteProp } from '../../navigation/types';
import { useTrackContext } from '../../context/TrackContext';
import { useTheme } from '../../context/ThemeContext';
import {
  PREDEFINED_TAGS,
  TaskStatus,
  TaskType,
  TimeInputMode,
  BLOCK_DURATION_MINUTES,
} from '../../types/Track';
import { SafeAreaView } from '../../components/layout/SafeAreaView';

interface Props {
  navigation: CreateEditScreenNavigationProp;
  route: CreateEditScreenRouteProp;
}

function formatTwoDigits(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateToTimeString(d: Date): string {
  return `${formatTwoDigits(d.getHours())}:${formatTwoDigits(d.getMinutes())}`;
}

function parseTimeToToday(timeStr: string): Date | null {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
}

function formatDisplayTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${formatTwoDigits(m)} ${ampm}`;
}

export default function CreateEditScreen({ navigation, route }: Props) {
  const { id } = route.params ?? {};
  const { addTrack, updateTrack, getTrackById } = useTrackContext();
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<TaskStatus>('created');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  // Task scheduling state
  const [taskType, setTaskType] = useState<TaskType>('unallocated');
  const [timeInputMode, setTimeInputMode] = useState<TimeInputMode>('start-duration');
  const [startTimeInput, setStartTimeInput] = useState(() => dateToTimeString(new Date()));
  const [endTimeInput, setEndTimeInput] = useState(() => {
    const end = new Date(Date.now() + BLOCK_DURATION_MINUTES * 60000);
    return dateToTimeString(end);
  });
  const [blockMultiplier, setBlockMultiplier] = useState(1);

  const isEdit = !!id;

  useEffect(() => {
    if (id) {
      const track = getTrackById(id);
      if (track) {
        setTitle(track.title);
        setDescription(track.description);
        setPriority(track.priority);
        setStatus(track.status);
        setSelectedTags(track.tags ?? []);
        setTaskType(track.taskType || 'unallocated');
        if (track.timeInputMode) setTimeInputMode(track.timeInputMode);
        if (track.blockMultiplier) setBlockMultiplier(track.blockMultiplier);
        if (track.allocatedStartTime) {
          setStartTimeInput(dateToTimeString(new Date(track.allocatedStartTime)));
        }
        if (track.allocatedEndTime) {
          setEndTimeInput(dateToTimeString(new Date(track.allocatedEndTime)));
        }
      }
    }
  }, [id]);

  // Derived scheduling calculations
  const calculateAllocatedDates = (): {
    computedStart: Date | null;
    computedEnd: Date | null;
    computedDurationMinutes: number;
    error?: string;
  } => {
    if (taskType === 'unallocated') {
      return { computedStart: null, computedEnd: null, computedDurationMinutes: 0 };
    }

    const now = new Date();
    const durationMinutes = blockMultiplier * BLOCK_DURATION_MINUTES;

    if (timeInputMode === 'duration-only') {
      const start = new Date(now);
      const end = new Date(start.getTime() + durationMinutes * 60000);
      return { computedStart: start, computedEnd: end, computedDurationMinutes: durationMinutes };
    }

    if (timeInputMode === 'start-duration') {
      const start = parseTimeToToday(startTimeInput);
      if (!start) {
        return { computedStart: null, computedEnd: null, computedDurationMinutes: durationMinutes, error: 'Enter a valid start time (HH:MM)' };
      }
      // Start cannot be in the distant past (allow 2-min clock drift)
      if (start.getTime() < now.getTime() - 120000) {
        return { computedStart: start, computedEnd: null, computedDurationMinutes: durationMinutes, error: 'Start time cannot be in the past' };
      }
      const end = new Date(start.getTime() + durationMinutes * 60000);
      return { computedStart: start, computedEnd: end, computedDurationMinutes: durationMinutes };
    }

    // start-end mode
    const start = parseTimeToToday(startTimeInput);
    const end = parseTimeToToday(endTimeInput);
    if (!start || !end) {
      return { computedStart: null, computedEnd: null, computedDurationMinutes: 0, error: 'Enter valid start and end times (HH:MM)' };
    }
    if (start.getTime() < now.getTime() - 120000) {
      return { computedStart: start, computedEnd: end, computedDurationMinutes: 0, error: 'Start time cannot be in the past' };
    }
    if (end.getTime() <= start.getTime()) {
      return { computedStart: start, computedEnd: end, computedDurationMinutes: 0, error: 'End time must be after start time' };
    }
    const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    return { computedStart: start, computedEnd: end, computedDurationMinutes: diffMinutes };
  };

  const schedulingResult = calculateAllocatedDates();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || selectedTags.includes(tag)) {
      setCustomTag('');
      return;
    }
    setSelectedTags((prev) => [...prev, tag]);
    setCustomTag('');
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for this task.');
      return;
    }

    if (taskType === 'allocated') {
      if (schedulingResult.error) {
        Alert.alert('Invalid Time Schedule', schedulingResult.error);
        return;
      }
      if (!schedulingResult.computedStart || !schedulingResult.computedEnd) {
        Alert.alert('Missing Schedule', 'Please provide valid start and end times.');
        return;
      }
    }

    try {
      const initialStatus: TaskStatus = isEdit
        ? status
        : taskType === 'allocated'
        ? 'time-allocated'
        : 'created';

      if (isEdit && id) {
        await updateTrack(id, {
          title: title.trim(),
          description: description.trim(),
          priority,
          status: initialStatus,
          taskType,
          timeInputMode: taskType === 'allocated' ? timeInputMode : undefined,
          allocatedStartTime: schedulingResult.computedStart ?? undefined,
          allocatedEndTime: schedulingResult.computedEnd ?? undefined,
          blockMultiplier: taskType === 'allocated' ? blockMultiplier : undefined,
          durationMinutes: schedulingResult.computedDurationMinutes || undefined,
          tags: selectedTags,
          endTime: initialStatus === 'completed' ? new Date() : undefined,
        });
        Alert.alert('Updated', 'Task updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await addTrack({
          title: title.trim(),
          description: description.trim(),
          priority,
          status: initialStatus,
          taskType,
          timeInputMode: taskType === 'allocated' ? timeInputMode : undefined,
          allocatedStartTime: schedulingResult.computedStart ?? undefined,
          allocatedEndTime: schedulingResult.computedEnd ?? undefined,
          blockMultiplier: taskType === 'allocated' ? blockMultiplier : undefined,
          durationMinutes: schedulingResult.computedDurationMinutes || undefined,
          tags: selectedTags,
          startTime: new Date(),
          endTime: initialStatus === 'completed' ? new Date() : undefined,
        });
        Alert.alert('Created', 'Task created successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: any) {
      console.error('[CreateEditScreen] Failed to save task:', err);
      Alert.alert('Error', `Failed to save task: ${err?.message || 'Please try again.'}`);
    }
  };

  const s = makeStyles(colors);

  return (
    <SafeAreaView edges={['bottom']}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
        <Text style={s.screenTitle}>{isEdit ? 'Edit Task' : 'New Task'}</Text>

        {/* ── Title ──────────────────────────────────────────────── */}
        <View style={s.field}>
          <Text style={s.label}>Task Title *</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Implement user authentication"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* ── Description ────────────────────────────────────────── */}
        <View style={s.field}>
          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, s.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add any relevant notes or details…"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* ── Priority Selector ──────────────────────────────────── */}
        <View style={s.field}>
          <Text style={s.label}>Priority Level</Text>
          <View style={s.priorityRow}>
            {(['low', 'medium', 'high'] as const).map((p) => {
              const isSelected = priority === p;
              const badgeColor =
                p === 'high' ? colors.priorityHigh : p === 'medium' ? colors.priorityMedium : colors.priorityLow;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    s.priorityButton,
                    isSelected && { backgroundColor: badgeColor, borderColor: badgeColor },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      s.priorityButtonText,
                      isSelected ? { color: '#fff', fontWeight: 'bold' } : { color: colors.text },
                    ]}
                  >
                    {p === 'low' ? '🟢 Low' : p === 'medium' ? '🟡 Medium' : '🔴 High'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Task Scheduling Type (Module A) ────────────────────── */}
        <View style={s.field}>
          <Text style={s.label}>Task Scheduling Type</Text>
          <View style={s.tabRow}>
            <TouchableOpacity
              style={[s.typeTab, taskType === 'unallocated' && s.typeTabActive]}
              onPress={() => setTaskType('unallocated')}
            >
              <Text style={[s.typeTabText, taskType === 'unallocated' && s.typeTabTextActive]}>
                📋 Unscheduled
              </Text>
              <Text style={s.typeTabSub}>No set schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.typeTab, taskType === 'allocated' && s.typeTabActive]}
              onPress={() => setTaskType('allocated')}
            >
              <Text style={[s.typeTabText, taskType === 'allocated' && s.typeTabTextActive]}>
                ⚡ Scheduled (Today)
              </Text>
              <Text style={s.typeTabSub}>Fixed 45m blocks</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Allocated Time Options (Track 2) ───────────────────── */}
        {taskType === 'allocated' && (
          <View style={s.allocatedContainer}>
            <Text style={s.subSectionTitle}>⏰ Time Allocation Interface</Text>

            {/* Mode Selector */}
            <View style={s.modeSelector}>
              <TouchableOpacity
                style={[s.modeBtn, timeInputMode === 'start-duration' && s.modeBtnActive]}
                onPress={() => setTimeInputMode('start-duration')}
              >
                <Text style={[s.modeBtnText, timeInputMode === 'start-duration' && s.modeBtnTextActive]}>
                  Start + Duration
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modeBtn, timeInputMode === 'duration-only' && s.modeBtnActive]}
                onPress={() => setTimeInputMode('duration-only')}
              >
                <Text style={[s.modeBtnText, timeInputMode === 'duration-only' && s.modeBtnTextActive]}>
                  Duration Only
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modeBtn, timeInputMode === 'start-end' && s.modeBtnActive]}
                onPress={() => setTimeInputMode('start-end')}
              >
                <Text style={[s.modeBtnText, timeInputMode === 'start-end' && s.modeBtnTextActive]}>
                  Start – End
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mode 1: Start - End */}
            {timeInputMode === 'start-end' && (
              <View style={s.timeInputsRow}>
                <View style={s.timeInputBox}>
                  <Text style={s.timeInputLabel}>Start Time (HH:MM)</Text>
                  <TextInput
                    style={s.timeInput}
                    value={startTimeInput}
                    onChangeText={setStartTimeInput}
                    placeholder="10:00"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={5}
                  />
                </View>
                <Text style={s.timeArrow}>→</Text>
                <View style={s.timeInputBox}>
                  <Text style={s.timeInputLabel}>End Time (HH:MM)</Text>
                  <TextInput
                    style={s.timeInput}
                    value={endTimeInput}
                    onChangeText={setEndTimeInput}
                    placeholder="11:30"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={5}
                  />
                </View>
              </View>
            )}

            {/* Mode 2: Start + Duration */}
            {timeInputMode === 'start-duration' && (
              <View>
                <View style={s.singleTimeBox}>
                  <Text style={s.timeInputLabel}>Start Time (HH:MM, Today)</Text>
                  <TextInput
                    style={s.timeInput}
                    value={startTimeInput}
                    onChangeText={setStartTimeInput}
                    placeholder="10:00"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={5}
                  />
                </View>

                <Text style={[s.timeInputLabel, { marginTop: 12 }]}>
                  Duration ({blockMultiplier} × 45 min = {blockMultiplier * 45} min)
                </Text>
                <View style={s.stepperRow}>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => setBlockMultiplier((prev) => Math.max(1, prev - 1))}
                  >
                    <Text style={s.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.stepperValue}>
                    {blockMultiplier} block{blockMultiplier > 1 ? 's' : ''}
                  </Text>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => setBlockMultiplier((prev) => Math.min(10, prev + 1))}
                  >
                    <Text style={s.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Mode 3: Duration Only (Start = Now) */}
            {timeInputMode === 'duration-only' && (
              <View>
                <Text style={s.hintText}>
                  💡 Starts immediately right now. Choose how many 45-minute blocks to allocate:
                </Text>
                <Text style={[s.timeInputLabel, { marginTop: 8 }]}>
                  Duration ({blockMultiplier} × 45 min = {blockMultiplier * 45} min)
                </Text>
                <View style={s.stepperRow}>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => setBlockMultiplier((prev) => Math.max(1, prev - 1))}
                  >
                    <Text style={s.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.stepperValue}>
                    {blockMultiplier} block{blockMultiplier > 1 ? 's' : ''} ({blockMultiplier * 45}m)
                  </Text>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => setBlockMultiplier((prev) => Math.min(10, prev + 1))}
                  >
                    <Text style={s.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Live Calculation Preview Banner */}
            {schedulingResult.error ? (
              <View style={s.errorBanner}>
                <Text style={s.errorBannerText}>⚠ {schedulingResult.error}</Text>
              </View>
            ) : schedulingResult.computedStart && schedulingResult.computedEnd ? (
              <View style={s.previewBanner}>
                <Text style={s.previewTitle}>Scheduled Window Preview:</Text>
                <Text style={s.previewTime}>
                  {formatDisplayTime(schedulingResult.computedStart)} – {formatDisplayTime(schedulingResult.computedEnd)}
                </Text>
                <Text style={s.previewDuration}>
                  Total: {schedulingResult.computedDurationMinutes} minutes ({blockMultiplier} × 45m block{blockMultiplier > 1 ? 's' : ''})
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ── Tags ───────────────────────────────────────────────── */}
        <View style={s.field}>
          <Text style={s.label}>Tags</Text>
          <View style={s.chipsWrap}>
            {PREDEFINED_TAGS.map((t) => {
              const active = selectedTags.includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => toggleTag(t)}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>
                    #{t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom tag input */}
          <View style={s.customTagRow}>
            <TextInput
              style={[s.input, s.customTagInput]}
              value={customTag}
              onChangeText={setCustomTag}
              placeholder="Add custom tag…"
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={addCustomTag}
              returnKeyType="done"
              autoCapitalize="none"
            />
            <TouchableOpacity style={s.addTagBtn} onPress={addCustomTag}>
              <Text style={s.addTagBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Selected custom tags removable */}
          {selectedTags.some((t) => !PREDEFINED_TAGS.includes(t)) && (
            <View style={[s.chipsWrap, { marginTop: 6 }]}>
              {selectedTags
                .filter((t) => !PREDEFINED_TAGS.includes(t))
                .map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.chip, s.chipCustom]}
                    onPress={() => removeTag(t)}
                  >
                    <Text style={s.chipCustomText}>#{t} ✕</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>

        {/* ── Save Button ────────────────────────────────────────── */}
        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnText}>{isEdit ? 'Save Changes' : 'Create Task'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: colors.background,
    },
    screenTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
    },
    field: {
      marginBottom: 18,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    multiline: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    priorityRow: {
      flexDirection: 'row',
      gap: 10,
    },
    priorityButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    priorityButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    tabRow: {
      flexDirection: 'row',
      gap: 10,
    },
    typeTab: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    typeTabActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '12',
    },
    typeTabText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    typeTabTextActive: {
      color: colors.primary,
    },
    typeTabSub: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 2,
    },
    allocatedContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 18,
    },
    subSectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    modeSelector: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 3,
      marginBottom: 14,
    },
    modeBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 6,
    },
    modeBtnActive: {
      backgroundColor: colors.primary,
    },
    modeBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    modeBtnTextActive: {
      color: '#fff',
    },
    timeInputsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timeInputBox: {
      flex: 1,
    },
    timeArrow: {
      fontSize: 18,
      color: colors.textTertiary,
      marginHorizontal: 12,
      marginTop: 18,
    },
    singleTimeBox: {
      marginBottom: 8,
    },
    timeInputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    timeInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
      fontWeight: '600',
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 4,
    },
    stepperBtn: {
      width: 44,
      height: 40,
      backgroundColor: colors.primary + '18',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepperBtnText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.primary,
    },
    stepperValue: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    hintText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 18,
    },
    errorBanner: {
      backgroundColor: '#FEE2E2',
      borderRadius: 8,
      padding: 10,
      marginTop: 14,
    },
    errorBannerText: {
      color: '#DC2626',
      fontSize: 13,
      fontWeight: '600',
    },
    previewBanner: {
      backgroundColor: colors.primary + '10',
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      borderRadius: 6,
      padding: 10,
      marginTop: 14,
    },
    previewTitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    previewTime: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.primary,
    },
    previewDuration: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    chipCustom: {
      backgroundColor: colors.primaryLight + '20',
      borderColor: colors.primaryLight,
    },
    chipCustomText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    customTagRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
    },
    customTagInput: {
      flex: 1,
      paddingVertical: 8,
    },
    addTagBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addTagBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    saveBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
}
