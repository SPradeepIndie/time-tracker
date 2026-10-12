/**
 * BlastContext.tsx
 *
 * Global background timing context for Blast mode (Stopwatch and Countdown Timer).
 * Implements real-world wall-clock timestamp synchronization (Date.now()),
 * persistent SecureStore recovery across app closes/restarts, and
 * background timer completion alerts.
 */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  scheduleBlastTimerCompletion,
  cancelBlastTimerCompletion,
} from '../services/notifications/notificationService';

export type BlastMode = 'stopwatch' | 'timer';
export type SessionState = 'idle' | 'running' | 'paused' | 'completed';

const BLAST_SESSION_STORAGE_KEY = 'blast_active_session';

interface PersistedBlastSession {
  mode: BlastMode;
  sessionState: SessionState;
  startTimeIso: string | null;
  lastStartedMs: number | null;
  accumulatedElapsedMs: number;
  timerDurationMinutes: number;
  targetEndTimeMs: number | null;
}

interface BlastContextType {
  mode: BlastMode;
  setMode: (mode: BlastMode) => void;
  sessionState: SessionState;
  stopwatchSeconds: number;
  timerRemainingSeconds: number;
  timerDurationMinutes: number;
  sessionStartTime: Date | null;
  sessionEndTime: Date | null;
  showCompletionModal: boolean;
  setShowCompletionModal: (show: boolean) => void;

  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  resetSession: () => void;
  completeSession: () => void;
  selectPreset: (minutes: number) => void;
}

const BlastContext = createContext<BlastContextType | undefined>(undefined);

export const BlastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<BlastMode>('stopwatch');
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [timerDurationMinutes, setTimerDurationMinutes] = useState(25);

  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Timestamp references for accurate wall-clock calculations
  const lastStartedMsRef = useRef<number | null>(null);
  const accumulatedElapsedMsRef = useRef<number>(0);
  const targetEndTimeMsRef = useRef<number | null>(null);

  // Computed display counters
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [timerRemainingSeconds, setTimerRemainingSeconds] = useState(25 * 60);

  // ── Sync Helper: Recalculates elapsed/remaining seconds from wall-clock ─────
  const recalculateTime = useCallback(() => {
    const now = Date.now();
    let totalElapsedMs = accumulatedElapsedMsRef.current;

    if (sessionState === 'running' && lastStartedMsRef.current) {
      totalElapsedMs += now - lastStartedMsRef.current;
    }

    const elapsedSecs = Math.floor(totalElapsedMs / 1000);
    setStopwatchSeconds(elapsedSecs);

    const totalTargetSecs = timerDurationMinutes * 60;
    const remainingSecs = Math.max(0, totalTargetSecs - elapsedSecs);
    setTimerRemainingSeconds(remainingSecs);

    // If countdown timer has expired while running
    if (mode === 'timer' && sessionState === 'running' && remainingSecs <= 0) {
      setSessionState('completed');
      setSessionEndTime(new Date());
      setShowCompletionModal(true);
      cancelBlastTimerCompletion().catch(console.error);
    }
  }, [mode, sessionState, timerDurationMinutes]);

  // ── Persistence: Save active session state to SecureStore ──────────────────
  const persistSessionState = useCallback(async () => {
    try {
      if (sessionState === 'idle') {
        await SecureStore.deleteItemAsync(BLAST_SESSION_STORAGE_KEY).catch(() => {});
        return;
      }

      const payload: PersistedBlastSession = {
        mode,
        sessionState,
        startTimeIso: sessionStartTime ? sessionStartTime.toISOString() : null,
        lastStartedMs: lastStartedMsRef.current,
        accumulatedElapsedMs: accumulatedElapsedMsRef.current,
        timerDurationMinutes,
        targetEndTimeMs: targetEndTimeMsRef.current,
      };

      await SecureStore.setItemAsync(BLAST_SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[BlastContext] Failed to persist session:', err);
    }
  }, [mode, sessionState, sessionStartTime, timerDurationMinutes]);

  // ── Restore active session on app startup ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(BLAST_SESSION_STORAGE_KEY);
        if (!raw) return;

        const data: PersistedBlastSession = JSON.parse(raw);
        if (!data || data.sessionState === 'idle') return;

        setModeState(data.mode);
        setTimerDurationMinutes(data.timerDurationMinutes || 25);
        if (data.startTimeIso) {
          setSessionStartTime(new Date(data.startTimeIso));
        }

        accumulatedElapsedMsRef.current = data.accumulatedElapsedMs || 0;
        targetEndTimeMsRef.current = data.targetEndTimeMs || null;

        if (data.sessionState === 'running' && data.lastStartedMs) {
          lastStartedMsRef.current = data.lastStartedMs;
          const now = Date.now();
          const totalElapsed = accumulatedElapsedMsRef.current + (now - data.lastStartedMs);
          const totalTargetSecs = (data.timerDurationMinutes || 25) * 60;

          if (data.mode === 'timer' && totalElapsed >= totalTargetSecs * 1000) {
            setSessionState('completed');
            setSessionEndTime(new Date());
            setShowCompletionModal(true);
            setTimerRemainingSeconds(0);
            setStopwatchSeconds(totalTargetSecs);
          } else {
            setSessionState('running');
            setStopwatchSeconds(Math.floor(totalElapsed / 1000));
            setTimerRemainingSeconds(Math.max(0, totalTargetSecs - Math.floor(totalElapsed / 1000)));
          }
        } else {
          setSessionState(data.sessionState);
          lastStartedMsRef.current = null;
          const totalElapsed = accumulatedElapsedMsRef.current;
          setStopwatchSeconds(Math.floor(totalElapsed / 1000));
          const totalTargetSecs = (data.timerDurationMinutes || 25) * 60;
          setTimerRemainingSeconds(Math.max(0, totalTargetSecs - Math.floor(totalElapsed / 1000)));
        }
      } catch (err) {
        console.warn('[BlastContext] Restore session error:', err);
      }
    })();
  }, []);

  // ── AppState Listener: Instantly recalculates when returning to foreground ──
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        recalculateTime();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [recalculateTime]);

  // ── Ticking Interval: Active only while running ────────────────────────────
  useEffect(() => {
    if (sessionState !== 'running') return;

    recalculateTime();
    const interval = setInterval(() => {
      recalculateTime();
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState, recalculateTime]);

  // Persist session whenever core timing state changes
  useEffect(() => {
    persistSessionState();
  }, [persistSessionState]);

  // ── Session Controls ───────────────────────────────────────────────────────

  const setMode = (newMode: BlastMode) => {
    if (sessionState !== 'idle') return;
    setModeState(newMode);
  };

  const startSession = () => {
    const now = Date.now();
    const startDate = sessionStartTime || new Date(now);
    setSessionStartTime(startDate);
    lastStartedMsRef.current = now;
    setSessionState('running');

    if (mode === 'timer') {
      const remainingMs = timerDurationMinutes * 60 * 1000 - accumulatedElapsedMsRef.current;
      targetEndTimeMsRef.current = now + remainingMs;
      scheduleBlastTimerCompletion(remainingMs / 1000).catch(console.error);
    }
  };

  const pauseSession = () => {
    if (sessionState !== 'running') return;
    const now = Date.now();
    if (lastStartedMsRef.current) {
      accumulatedElapsedMsRef.current += now - lastStartedMsRef.current;
      lastStartedMsRef.current = null;
    }
    setSessionState('paused');
    cancelBlastTimerCompletion().catch(console.error);
  };

  const resumeSession = () => {
    if (sessionState !== 'paused') return;
    const now = Date.now();
    lastStartedMsRef.current = now;
    setSessionState('running');

    if (mode === 'timer') {
      const remainingMs = timerDurationMinutes * 60 * 1000 - accumulatedElapsedMsRef.current;
      targetEndTimeMsRef.current = now + remainingMs;
      scheduleBlastTimerCompletion(remainingMs / 1000).catch(console.error);
    }
  };

  const resetSession = () => {
    setSessionState('idle');
    lastStartedMsRef.current = null;
    accumulatedElapsedMsRef.current = 0;
    targetEndTimeMsRef.current = null;
    setSessionStartTime(null);
    setSessionEndTime(null);
    setShowCompletionModal(false);
    setStopwatchSeconds(0);
    setTimerRemainingSeconds(timerDurationMinutes * 60);
    cancelBlastTimerCompletion().catch(console.error);
    SecureStore.deleteItemAsync(BLAST_SESSION_STORAGE_KEY).catch(() => {});
  };

  const completeSession = () => {
    const now = new Date();
    if (sessionState === 'running' && lastStartedMsRef.current) {
      accumulatedElapsedMsRef.current += Date.now() - lastStartedMsRef.current;
      lastStartedMsRef.current = null;
    }
    setSessionEndTime(now);
    setSessionState('completed');
    setShowCompletionModal(true);
    cancelBlastTimerCompletion().catch(console.error);
  };

  const selectPreset = (minutes: number) => {
    if (sessionState !== 'idle') return;
    setTimerDurationMinutes(minutes);
    setTimerRemainingSeconds(minutes * 60);
  };

  return (
    <BlastContext.Provider
      value={{
        mode,
        setMode,
        sessionState,
        stopwatchSeconds,
        timerRemainingSeconds,
        timerDurationMinutes,
        sessionStartTime,
        sessionEndTime,
        showCompletionModal,
        setShowCompletionModal,
        startSession,
        pauseSession,
        resumeSession,
        resetSession,
        completeSession,
        selectPreset,
      }}
    >
      {children}
    </BlastContext.Provider>
  );
};

export const useBlastContext = (): BlastContextType => {
  const context = useContext(BlastContext);
  if (!context) {
    throw new Error('useBlastContext must be used within a BlastProvider');
  }
  return context;
};
