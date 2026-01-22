'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  TimerSession,
  TimerState,
  TimerStatus,
  FocusPreset,
  DailyTimerStats,
} from '../types';
import { FOCUS_PRESETS } from '../constants';

interface UseTimerSessionOptions {
  onSessionComplete?: (session: TimerSession) => void;
  onBreakStart?: () => void;
  onBreakEnd?: () => void;
  autoStartBreaks?: boolean;
}

interface UseTimerSessionReturn {
  timerState: TimerState;
  currentTask: string;
  setCurrentTask: (task: string) => void;
  startSession: (preset: FocusPreset, customMinutes?: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  resetSession: () => void;
  skipPhase: () => void;
  linkTask: (taskId: string, taskTitle?: string) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  setCustomDuration: (minutes: number) => void;
  formatTime: (seconds: number) => string;
}

const TIMER_STATS_KEY = 'q8-timer-stats';
const TIMER_SESSIONS_KEY = 'q8-timer-sessions';

function generateId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getTodayKey(): string {
  const dateStr = new Date().toISOString().split('T')[0];
  return dateStr ?? new Date().toDateString();
}

function createEmptyStats(): DailyTimerStats {
  return {
    date: getTodayKey(),
    focusMinutes: 0,
    breakMinutes: 0,
    sessionsCompleted: 0,
    longestSession: 0,
    tags: {},
  };
}

function loadStatsFromStorage(): DailyTimerStats {
  if (typeof window === 'undefined') return createEmptyStats();
  try {
    const saved = localStorage.getItem(TIMER_STATS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if it's today's stats
      if (parsed.date === getTodayKey()) {
        return parsed;
      }
    }
  } catch {
    // Ignore errors
  }
  return createEmptyStats();
}

function saveStatsToStorage(stats: DailyTimerStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TIMER_STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore errors
  }
}

function saveSessionToHistory(session: TimerSession): void {
  if (typeof window === 'undefined') return;
  try {
    const history = JSON.parse(localStorage.getItem(TIMER_SESSIONS_KEY) || '[]');
    history.unshift(session);
    localStorage.setItem(TIMER_SESSIONS_KEY, JSON.stringify(history.slice(0, 100)));
  } catch {
    // Ignore errors
  }
}

export function useTimerSession(options: UseTimerSessionOptions = {}): UseTimerSessionReturn {
  const {
    onSessionComplete,
    onBreakStart,
    onBreakEnd,
    autoStartBreaks = true,
  } = options;

  const [session, setSession] = useState<TimerSession | null>(null);
  const [todayStats, setTodayStats] = useState<DailyTimerStats>(loadStatsFromStorage);
  const [currentTask, setCurrentTask] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Load stats from localStorage on mount
  useEffect(() => {
    const loaded = loadStatsFromStorage();
    setTodayStats(loaded);
  }, []);

  // Save stats to localStorage when they change
  useEffect(() => {
    saveStatsToStorage(todayStats);
  }, [todayStats]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Track session status for effect dependency
  const sessionStatus = session?.status;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Timer tick logic
  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only start interval if session is running
    if (sessionStatus !== 'running') {
      return;
    }

    intervalRef.current = setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.status !== 'running') return prev;

        const newRemaining = prev.remaining - 1;

        if (newRemaining <= 0) {
          // Phase completed
          if (prev.isBreak) {
            // Break finished
            onBreakEnd?.();
            const presetConfig = FOCUS_PRESETS.find((p) => p.id === prev.preset);
            if (!presetConfig) return null;

            // Start next work session
            return {
              ...prev,
              isBreak: false,
              duration: presetConfig.workMinutes * 60,
              remaining: presetConfig.workMinutes * 60,
              status: autoStartBreaks ? 'running' : 'idle',
            };
          } else {
            // Work session finished
            const completedSession: TimerSession = {
              ...prev,
              status: 'completed',
              remaining: 0,
              sessionsCompleted: prev.sessionsCompleted + 1,
              completedAt: new Date().toISOString(),
            };

            onSessionComplete?.(completedSession);

            // Save to session history
            saveSessionToHistory(completedSession);

            // Update stats
            const sessionMinutes = Math.floor(prev.duration / 60);
            setTodayStats((stats) => ({
              ...stats,
              focusMinutes: stats.focusMinutes + sessionMinutes,
              sessionsCompleted: stats.sessionsCompleted + 1,
              longestSession: Math.max(stats.longestSession, sessionMinutes),
              tags: prev.tags?.reduce(
                (acc, tag) => ({
                  ...acc,
                  [tag]: (acc[tag] || 0) + sessionMinutes,
                }),
                stats.tags
              ) || stats.tags,
            }));

            // Determine break type
            const presetConfig = FOCUS_PRESETS.find((p) => p.id === prev.preset);
            if (!presetConfig) return null;

            const isLongBreak =
              completedSession.sessionsCompleted % presetConfig.sessionsUntilLongBreak === 0;
            const breakDuration = isLongBreak
              ? presetConfig.longBreakMinutes
              : presetConfig.breakMinutes;

            onBreakStart?.();

            // Start break
            return {
              ...completedSession,
              isBreak: true,
              duration: breakDuration * 60,
              remaining: breakDuration * 60,
              status: autoStartBreaks ? 'running' : 'break',
            };
          }
        }

        return { ...prev, remaining: newRemaining };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionStatus, autoStartBreaks, onSessionComplete, onBreakStart, onBreakEnd]);

  // Start a new session
  const startSession = useCallback((preset: FocusPreset, customMinutes?: number) => {
    const presetConfig = FOCUS_PRESETS.find((p) => p.id === preset);
    if (!presetConfig) return;

    const duration = (customMinutes ?? presetConfig.workMinutes) * 60;

    const newSession: TimerSession = {
      id: generateId(),
      mode: preset === 'custom' ? 'custom' : 'pomodoro',
      preset,
      duration,
      remaining: duration,
      status: 'running',
      isBreak: false,
      sessionsCompleted: 0,
      tags: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setSession(newSession);
    startTimeRef.current = Date.now();
  }, []);

  // Pause session
  const pauseSession = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.status !== 'running') return prev;
      return {
        ...prev,
        status: 'paused',
        pausedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Resume session
  const resumeSession = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.status !== 'paused') return prev;
      return {
        ...prev,
        status: 'running',
        pausedAt: undefined,
      };
    });
  }, []);

  // Reset session
  const resetSession = useCallback(() => {
    setSession(null);
    startTimeRef.current = null;
  }, []);

  // Skip current phase (work -> break or break -> work)
  const skipPhase = useCallback(() => {
    setSession((prev) => {
      if (!prev) return null;

      const presetConfig = FOCUS_PRESETS.find((p) => p.id === prev.preset);
      if (!presetConfig) return null;

      if (prev.isBreak) {
        // Skip break, start work
        onBreakEnd?.();
        return {
          ...prev,
          isBreak: false,
          duration: presetConfig.workMinutes * 60,
          remaining: presetConfig.workMinutes * 60,
          status: 'running',
        };
      } else {
        // Skip work, start break (count as partial completion)
        const newSessionsCompleted = prev.sessionsCompleted + 1;
        const isLongBreak = newSessionsCompleted % presetConfig.sessionsUntilLongBreak === 0;
        const breakDuration = isLongBreak
          ? presetConfig.longBreakMinutes
          : presetConfig.breakMinutes;

        onBreakStart?.();

        return {
          ...prev,
          isBreak: true,
          sessionsCompleted: newSessionsCompleted,
          duration: breakDuration * 60,
          remaining: breakDuration * 60,
          status: 'running',
        };
      }
    });
  }, [onBreakStart, onBreakEnd]);

  // Link task to session
  const linkTask = useCallback((taskId: string, taskTitle?: string) => {
    setSession((prev) => {
      if (!prev) return null;
      return { ...prev, linkedTaskId: taskId, linkedTaskTitle: taskTitle };
    });
  }, []);

  // Add tag to session
  const addTag = useCallback((tag: string) => {
    setSession((prev) => {
      if (!prev) return null;
      const tags = prev.tags || [];
      if (tags.includes(tag)) return prev;
      return { ...prev, tags: [...tags, tag] };
    });
  }, []);

  // Remove tag from session
  const removeTag = useCallback((tag: string) => {
    setSession((prev) => {
      if (!prev) return null;
      return { ...prev, tags: prev.tags?.filter((t) => t !== tag) };
    });
  }, []);

  // Set custom duration
  const setCustomDuration = useCallback((minutes: number) => {
    setSession((prev) => {
      if (!prev || prev.status === 'running') return prev;
      const seconds = minutes * 60;
      return { ...prev, duration: seconds, remaining: seconds };
    });
  }, []);

  // Format seconds to mm:ss
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Build timer state
  const timerState: TimerState = {
    session,
    isRunning: session?.status === 'running',
    progress: session ? ((session.duration - session.remaining) / session.duration) * 100 : 0,
    currentPhase: session?.isBreak
      ? session.sessionsCompleted %
          (FOCUS_PRESETS.find((p) => p.id === session.preset)?.sessionsUntilLongBreak || 4) ===
        0
        ? 'long-break'
        : 'break'
      : 'work',
    todayStats,
  };

  return {
    timerState,
    currentTask,
    setCurrentTask,
    startSession,
    pauseSession,
    resumeSession,
    resetSession,
    skipPhase,
    linkTask,
    addTag,
    removeTag,
    setCustomDuration,
    formatTime,
  };
}
