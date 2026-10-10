/**
 * BlastScreen.tsx
 *
 * Spontaneous / quick-tracking screen featuring:
 *  - Stopwatch (count up)
 *  - Countdown Timer (with presets: 15m, 25m Pomodoro, 45m Block, 60m)
 *  - Minimal, high-contrast, theme-aware layout with minimal animation
 *  - Post-session completion prompt ("Did you complete this task?")
 *  - Task detail capture (title, description, priority, tags)
 *  - Direct persistence into SQLite tracks table via TrackContext
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlastScreenNavigationProp } from '../../navigation/types';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { AppIcon } from '../../components/ui/AppIcon';
import { ThemedAlert, ThemedAlertProps } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { useTrackContext } from '../../context/TrackContext';
import { PREDEFINED_TAGS, TaskStatus } from '../../types/Track';

type BlastMode = 'stopwatch' | 'timer';
type SessionState = 'idle' | 'running' | 'paused';

const TIMER_PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '25 min (Pomo)', minutes: 25 },
  { label: '45 min (Block)', minutes: 45 },
  { label: '60 min (Deep)', minutes: 60 },
];

function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export default function BlastScreen() {
  const navigation = useNavigation<BlastScreenNavigationProp>();
  const { colors } = useTheme();
  const { addTrack } = useTrackContext();

  const safeGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  };

  // Mode & Timer State
  const [mode, setMode] = useState<BlastMode>('stopwatch');
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [timerDurationMinutes, setTimerDurationMinutes] = useState(25);
  const [timerRemainingSeconds, setTimerRemainingSeconds] = useState(25 * 60);

  // Session Timing Timestamps
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);

  // Completion Sheet / Modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isTaskCompleted, setIsTaskCompleted] = useState<boolean>(true);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<ThemedAlertProps | null>(null);

  // Interval reference
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Unified timer/stopwatch interval
  useEffect(() => {
    if (sessionState !== 'running') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (mode === 'stopwatch') {
      intervalRef.current = setInterval(() => {
        setStopwatchSeconds((prev) => prev + 1);
      }, 1000);
    } else if (mode === 'timer') {
      intervalRef.current = setInterval(() => {
        setTimerRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            handleFinishSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [mode, sessionState]);

  // Handlers
  const handleStart = () => {
    if (!sessionStartTime) {
      setSessionStartTime(new Date());
    }
    setSessionState('running');
  };

  const handlePause = () => {
    setSessionState('paused');
  };

  const handleResume = () => {
    setSessionState('running');
  };

  const handleReset = () => {
    setSessionState('idle');
    setStopwatchSeconds(0);
    setTimerRemainingSeconds(timerDurationMinutes * 60);
    setSessionStartTime(null);
    setSessionEndTime(null);
  };

  const handleSelectPreset = (minutes: number) => {
    if (sessionState !== 'idle') return;
    setTimerDurationMinutes(minutes);
    setTimerRemainingSeconds(minutes * 60);
  };

  const handleFinishSession = () => {
    setSessionState('paused');
    setSessionEndTime(new Date());
    setShowCompletionModal(true);
  };

  const calculateElapsedMinutes = (): number => {
    if (mode === 'stopwatch') {
      return Math.max(1, Math.round(stopwatchSeconds / 60));
    } else {
      const elapsedSecs = timerDurationMinutes * 60 - timerRemainingSeconds;
      return Math.max(1, Math.round(elapsedSecs / 60));
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setCustomTagInput('');
  };

  const handleSaveTask = async () => {
    const trimmedTitle = taskTitle.trim();
    if (!trimmedTitle) {
      setAlertConfig({
        visible: true,
        title: 'Title Required',
        message: 'Please enter a title for your blast task.',
        icon: 'alert-circle',
        iconColor: '#F59E0B',
        buttons: [{ text: 'OK', style: 'default' }],
        onClose: () => setAlertConfig(null),
      });
      return;
    }

    const start = sessionStartTime || new Date(Date.now() - calculateElapsedMinutes() * 60000);
    const end = sessionEndTime || new Date();
    const duration = calculateElapsedMinutes();
    const finalStatus: TaskStatus = isTaskCompleted ? 'completed' : 'in-progress';

    try {
      await addTrack({
        title: trimmedTitle,
        description: taskDescription.trim(),
        priority: taskPriority,
        tags: selectedTags,
        taskType: 'allocated',
        status: finalStatus,
        timeInputMode: 'start-end',
        allocatedStartTime: start,
        allocatedEndTime: end,
        startTime: start,
        endTime: end,
        durationMinutes: duration,
        blockMultiplier: Math.max(1, Math.round(duration / 45)),
      });

      setShowCompletionModal(false);
      const msg = `Blast session recorded: ${trimmedTitle}`;
      if (Platform.OS === 'android') {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      }
      safeGoBack();
    } catch {
      setAlertConfig({
        visible: true,
        title: 'Save Failed',
        message: 'Unable to record blast task. Please try again.',
        icon: 'alert-circle',
        iconColor: colors.error || '#EF4444',
        buttons: [{ text: 'OK', style: 'default' }],
        onClose: () => setAlertConfig(null),
      });
    }
  };

  const handleDiscard = () => {
    setAlertConfig({
      visible: true,
      title: 'Discard Session',
      message: 'Are you sure you want to discard this recorded time?',
      icon: 'trash',
      iconColor: colors.error || '#EF4444',
      buttons: [
        { text: 'Keep Tracking', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setShowCompletionModal(false);
            safeGoBack();
          },
        },
      ],
      onClose: () => setAlertConfig(null),
    });
  };

  const currentSeconds = mode === 'stopwatch' ? stopwatchSeconds : timerRemainingSeconds;
  const timerTotalSeconds = timerDurationMinutes * 60;
  const progressRatio =
    mode === 'timer' && timerTotalSeconds > 0
      ? Math.max(0, Math.min(1, (timerTotalSeconds - timerRemainingSeconds) / timerTotalSeconds))
      : 0;

  const s = makeStyles(colors);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
      <View style={s.container}>
        {/* ── Top Header ─────────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => safeGoBack()} style={s.backBtn}>
            <AppIcon name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Blast Quick Track</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Mode Selector Segment ──────────────────────────────── */}
        <View style={s.modeSelector}>
          <TouchableOpacity
            style={[s.modeBtn, mode === 'stopwatch' && s.modeBtnActive]}
            onPress={() => {
              if (sessionState === 'idle') setMode('stopwatch');
            }}
            disabled={sessionState !== 'idle'}
          >
            <AppIcon
              name="stopwatch-outline"
              size={18}
              color={mode === 'stopwatch' ? colors.primary : colors.textSecondary}
            />
            <Text style={[s.modeBtnText, mode === 'stopwatch' && s.modeBtnTextActive]}>
              Stopwatch
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.modeBtn, mode === 'timer' && s.modeBtnActive]}
            onPress={() => {
              if (sessionState === 'idle') setMode('timer');
            }}
            disabled={sessionState !== 'idle'}
          >
            <AppIcon
              name="timer-outline"
              size={18}
              color={mode === 'timer' ? colors.primary : colors.textSecondary}
            />
            <Text style={[s.modeBtnText, mode === 'timer' && s.modeBtnTextActive]}>
              Timer
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Presets for Timer Mode ─────────────────────────────── */}
        {mode === 'timer' && (
          <View style={s.presetRow}>
            {TIMER_PRESETS.map((p) => {
              const active = timerDurationMinutes === p.minutes;
              return (
                <TouchableOpacity
                  key={p.minutes}
                  style={[s.presetChip, active && s.presetChipActive]}
                  onPress={() => handleSelectPreset(p.minutes)}
                  disabled={sessionState !== 'idle'}
                >
                  <Text style={[s.presetChipText, active && s.presetChipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Main Time Readout Display ──────────────────────────── */}
        <View style={s.readoutContainer}>
          <View style={s.readoutCard}>
            <Text style={s.readoutStatus}>
              {sessionState === 'idle'
                ? 'Ready to Start'
                : sessionState === 'running'
                ? 'Tracking Session…'
                : 'Paused'}
            </Text>
            <Text style={s.readoutTime}>{formatTime(currentSeconds)}</Text>

            {/* Minimal Progress Bar for Timer Mode */}
            {mode === 'timer' && (
              <View style={s.progressBarTrack}>
                <View style={[s.progressBarFill, { width: `${progressRatio * 100}%` }]} />
              </View>
            )}
          </View>
        </View>

        {/* ── Control Action Buttons ─────────────────────────────── */}
        <View style={s.controlsContainer}>
          {sessionState === 'idle' && (
            <TouchableOpacity style={s.primaryActionBtn} onPress={handleStart}>
              <AppIcon name="play" size={26} color="#FFFFFF" />
              <Text style={s.primaryActionBtnText}>Start Blast</Text>
            </TouchableOpacity>
          )}

          {sessionState === 'running' && (
            <View style={s.actionRow}>
              <TouchableOpacity style={s.pauseActionBtn} onPress={handlePause}>
                <AppIcon name="pause" size={22} color={colors.text} />
                <Text style={s.pauseActionBtnText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.finishActionBtn} onPress={handleFinishSession}>
                <AppIcon name="checkmark" size={22} color="#FFFFFF" />
                <Text style={s.finishActionBtnText}>Finish</Text>
              </TouchableOpacity>
            </View>
          )}

          {sessionState === 'paused' && (
            <View style={s.actionRow}>
              <TouchableOpacity style={s.resetActionBtn} onPress={handleReset}>
                <AppIcon name="refresh" size={20} color={colors.textSecondary} />
                <Text style={s.resetActionBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.resumeActionBtn} onPress={handleResume}>
                <AppIcon name="play" size={22} color="#FFFFFF" />
                <Text style={s.resumeActionBtnText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.finishActionBtn} onPress={handleFinishSession}>
                <AppIcon name="checkmark" size={22} color="#FFFFFF" />
                <Text style={s.finishActionBtnText}>Finish</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Completion & Task Details Modal ────────────────────── */}
        <Modal
          visible={showCompletionModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCompletionModal(false)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.modalHeading}>Record Blast Session</Text>
                <Text style={s.modalSubheading}>
                  Logged {calculateElapsedMinutes()} min of focused time
                </Text>

                {/* Question: Did you complete this task? */}
                <Text style={s.fieldLabel}>Did you complete this task?</Text>
                <View style={s.completionToggleRow}>
                  <TouchableOpacity
                    style={[s.completionToggleBtn, isTaskCompleted && s.completionToggleBtnActive]}
                    onPress={() => setIsTaskCompleted(true)}
                  >
                    <AppIcon
                      name="checkmark-circle"
                      size={20}
                      color={isTaskCompleted ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        s.completionToggleText,
                        isTaskCompleted && s.completionToggleTextActive,
                      ]}
                    >
                      Yes, Completed
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      s.completionToggleBtn,
                      !isTaskCompleted && s.completionToggleBtnActive,
                    ]}
                    onPress={() => setIsTaskCompleted(false)}
                  >
                    <AppIcon
                      name="time-outline"
                      size={20}
                      color={!isTaskCompleted ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        s.completionToggleText,
                        !isTaskCompleted && s.completionToggleTextActive,
                      ]}
                    >
                      In Progress
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Title Input */}
                <Text style={s.fieldLabel}>Task Title *</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="What were you working on?"
                  placeholderTextColor={colors.placeholder}
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                />

                {/* Description Input */}
                <Text style={s.fieldLabel}>Description (Optional)</Text>
                <TextInput
                  style={[s.textInput, { height: 72, textAlignVertical: 'top' }]}
                  placeholder="Additional notes or context…"
                  placeholderTextColor={colors.placeholder}
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  multiline
                />

                {/* Priority Selector */}
                <Text style={s.fieldLabel}>Priority</Text>
                <View style={s.priorityRow}>
                  {(['low', 'medium', 'high'] as const).map((pr) => {
                    const active = taskPriority === pr;
                    return (
                      <TouchableOpacity
                        key={pr}
                        style={[s.priorityChip, active && s.priorityChipActive]}
                        onPress={() => setTaskPriority(pr)}
                      >
                        <Text style={[s.priorityChipText, active && s.priorityChipTextActive]}>
                          {pr.charAt(0).toUpperCase() + pr.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Tags Selector */}
                <Text style={s.fieldLabel}>Tags</Text>
                <View style={s.tagsGrid}>
                  {PREDEFINED_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[s.tagChip, active && s.tagChipActive]}
                        onPress={() => toggleTag(tag)}
                      >
                        <Text style={[s.tagChipText, active && s.tagChipTextActive]}>
                          #{tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Tag Input */}
                <View style={s.customTagRow}>
                  <TextInput
                    style={[s.textInput, { flex: 1, marginBottom: 0 }]}
                    placeholder="Add custom tag…"
                    placeholderTextColor={colors.placeholder}
                    value={customTagInput}
                    onChangeText={setCustomTagInput}
                  />
                  <TouchableOpacity style={s.addTagBtn} onPress={handleAddCustomTag}>
                    <AppIcon name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Modal Action Buttons */}
                <View style={s.modalActions}>
                  <TouchableOpacity style={s.saveModalBtn} onPress={handleSaveTask}>
                    <Text style={s.saveModalBtnText}>Save Task</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.discardModalBtn} onPress={handleDiscard}>
                    <Text style={s.discardModalBtnText}>Discard Session</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── Custom Themed Alert Dialog ─────────────────────────── */}
        {alertConfig && (
          <ThemedAlert
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            icon={alertConfig.icon}
            iconColor={alertConfig.iconColor}
            buttons={alertConfig.buttons}
            onClose={() => setAlertConfig(null)}
          />
        )}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    modeSelector: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginTop: 16,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      borderRadius: 8,
    },
    modeBtnActive: {
      backgroundColor: colors.primary + '20',
    },
    modeBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    modeBtnTextActive: {
      color: colors.primary,
    },
    presetRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
      paddingHorizontal: 16,
    },
    presetChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    presetChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    presetChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    presetChipTextActive: {
      color: colors.primary,
    },
    readoutContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    readoutCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingVertical: 40,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    readoutStatus: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    readoutTime: {
      fontSize: 64,
      fontWeight: '900',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    progressBarTrack: {
      width: '80%',
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      marginTop: 24,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
    controlsContainer: {
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    primaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryActionBtnText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    pauseActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      borderRadius: 14,
    },
    pauseActionBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    finishActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 14,
    },
    finishActionBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    resetActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      borderRadius: 14,
    },
    resetActionBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    resumeActionBtn: {
      flex: 1.2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 14,
    },
    resumeActionBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: 16,
    },
    modalCard: {
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 20,
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
    modalHeading: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    modalSubheading: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 12,
      marginBottom: 6,
    },
    completionToggleRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 8,
    },
    completionToggleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      borderRadius: 12,
    },
    completionToggleBtnActive: {
      backgroundColor: colors.primary + '18',
      borderColor: colors.primary,
    },
    completionToggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    completionToggleTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    textInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      marginBottom: 4,
    },
    priorityRow: {
      flexDirection: 'row',
      gap: 8,
    },
    priorityChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    priorityChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    priorityChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    priorityChipTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    tagsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    tagChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tagChipActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    tagChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tagChipTextActive: {
      color: colors.primary,
    },
    customTagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    addTagBtn: {
      backgroundColor: colors.primary,
      width: 44,
      height: 44,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalActions: {
      marginTop: 20,
      gap: 8,
      paddingBottom: 8,
    },
    saveModalBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveModalBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    discardModalBtn: {
      backgroundColor: 'transparent',
      paddingVertical: 10,
      alignItems: 'center',
    },
    discardModalBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.error || '#EF4444',
    },
  });
}
