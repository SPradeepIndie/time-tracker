/**
 * BlastActiveBanner.tsx
 *
 * Floating in-app persistent banner displayed when a Blast session (Stopwatch or Timer)
 * is running or paused in the background while the user navigates other screens.
 * Tapping the banner instantly opens the Blast screen.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useBlastContext } from '../../context/BlastContext';
import { AppIcon } from './AppIcon';
import { navigationRef } from '../../navigation/navigationRef';

interface Props {
  currentRouteName?: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDisplayTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export const BlastActiveBanner: React.FC<Props> = ({ currentRouteName }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    mode,
    sessionState,
    stopwatchSeconds,
    timerRemainingSeconds,
    pauseSession,
    resumeSession,
  } = useBlastContext();

  // Hide if idle or already viewing BlastScreen
  if (currentRouteName === 'Blast') return null;
  if (sessionState === 'idle') return null;

  const isRunning = sessionState === 'running';
  const isCompleted = sessionState === 'completed';
  const displayTime = isCompleted
    ? '00:00'
    : formatDisplayTime(mode === 'stopwatch' ? stopwatchSeconds : timerRemainingSeconds);

  const handleOpenBlast = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Blast');
    }
  };

  const handleTogglePlayPause = () => {
    if (isRunning) {
      pauseSession();
    } else {
      resumeSession();
    }
  };

  const s = makeStyles(colors, isDark, insets.top);

  return (
    <View style={s.wrapper} pointerEvents="box-none">
      <TouchableOpacity
        style={s.bannerCard}
        onPress={handleOpenBlast}
        activeOpacity={0.88}
      >
        {/* Left: Glowing Flash Icon */}
        <View style={s.iconBox}>
          <AppIcon name="flash" size={16} color="#FFFFFF" />
        </View>

        {/* Middle: Mode & Live Time */}
        <View style={s.infoColumn}>
          <View style={s.titleRow}>
            <Text style={s.modeTitle}>
              {mode === 'timer' ? 'Blast Timer' : 'Stopwatch'}
            </Text>
            <View
              style={[
                s.statusBadge,
                isRunning || isCompleted ? s.statusBadgeRunning : s.statusBadgePaused,
              ]}
            >
              <Text
                style={[
                  s.statusText,
                  isRunning || isCompleted ? s.statusTextRunning : s.statusTextPaused,
                ]}
              >
                {isRunning ? 'RUNNING' : isCompleted ? 'COMPLETED' : 'PAUSED'}
              </Text>
            </View>
          </View>
          <Text style={s.timeText}>{displayTime}</Text>
        </View>

        {/* Right: Inline Controls & Chevron */}
        <View style={s.actionsRow}>
          {!isCompleted && (
            <TouchableOpacity
              style={s.playPauseBtn}
              onPress={handleTogglePlayPause}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppIcon
                name={isRunning ? 'pause' : 'play'}
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
          <View style={s.openBtn}>
            <Text style={s.openBtnText}>{isCompleted ? 'Record' : 'Open'}</Text>
            <AppIcon name="chevron-forward" size={14} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

function makeStyles(colors: any, isDark: boolean, topInset: number) {
  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      top: Math.max(topInset, 12) + 4,
      left: 12,
      right: 12,
      zIndex: 9999,
      elevation: 10,
    },
    bannerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E1E24' : '#18181B',
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1.5,
      borderColor: colors.primary + '80',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 8,
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    infoColumn: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    modeTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: '#A1A1AA',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statusBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: 4,
    },
    statusBadgeRunning: {
      backgroundColor: '#10B98125',
    },
    statusBadgePaused: {
      backgroundColor: '#F59E0B25',
    },
    statusText: {
      fontSize: 9,
      fontWeight: '700',
    },
    statusTextRunning: {
      color: '#34D399',
    },
    statusTextPaused: {
      color: '#FBBF24',
    },
    timeText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
      fontVariant: ['tabular-nums'],
      marginTop: 1,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    playPauseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#2A2A35' : '#27272A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    openBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 2,
    },
    openBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}
