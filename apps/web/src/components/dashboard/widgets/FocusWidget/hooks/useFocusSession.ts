/**
 * useFocusSession Hook
 * Manages focus session state, timer, and persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { FocusSession, FocusStats } from '../types';
import { STORAGE_KEY, STATS_KEY } from '../types';

export function useFocusSession(onSessionChange?: (session: FocusSession | null) => void) {
  const [currentTask, setCurrentTask] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [stats, setStats] = useState<FocusStats>({
    todayMinutes: 0,
    weekMinutes: 0,
    streak: 0,
    sessionsToday: 0,
  });

  // Load saved stats
  useEffect(() => {
    try {
      const savedStats = localStorage.getItem(STATS_KEY);
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        const today = new Date().toDateString();
        if (parsed.date === today) {
          setStats(parsed.stats);
        } else {
          setStats((prev) => ({
            ...prev,
            todayMinutes: 0,
            sessionsToday: 0,
          }));
        }
      }
    } catch (e) {
      logger.error('Failed to load focus stats', { error: e });
    }
  }, []);

  // Save stats
  useEffect(() => {
    try {
      localStorage.setItem(
        STATS_KEY,
        JSON.stringify({
          date: new Date().toDateString(),
          stats,
        })
      );
    } catch (e) {
      logger.error('Failed to save focus stats', { error: e });
    }
  }, [stats]);

  // Timer
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  const startSession = useCallback(() => {
    if (!currentTask.trim()) {
      return false; // Signal that task is needed
    }

    setIsRunning(true);
    setSessionStart(new Date());
    setElapsedTime(0);

    onSessionChange?.({
      id: `session-${Date.now()}`,
      task: currentTask,
      startTime: new Date(),
      duration: 0,
    });

    return true;
  }, [currentTask, onSessionChange]);

  const pauseSession = useCallback(() => {
    setIsRunning(false);
  }, []);

  const stopSession = useCallback(() => {
    if (elapsedTime > 0) {
      const minutes = Math.floor(elapsedTime / 60);

      setStats((prev) => ({
        todayMinutes: prev.todayMinutes + minutes,
        weekMinutes: prev.weekMinutes + minutes,
        streak: prev.streak,
        sessionsToday: prev.sessionsToday + 1,
      }));

      const session: FocusSession = {
        id: `session-${Date.now()}`,
        task: currentTask,
        startTime: sessionStart || new Date(),
        endTime: new Date(),
        duration: elapsedTime,
      };

      onSessionChange?.(null);

      try {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        history.unshift(session);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
      } catch (e) {
        logger.error('Failed to save session', { error: e });
      }
    }

    setIsRunning(false);
    setElapsedTime(0);
    setSessionStart(null);
  }, [currentTask, elapsedTime, sessionStart, onSessionChange]);

  return {
    currentTask,
    setCurrentTask,
    isRunning,
    elapsedTime,
    stats,
    startSession,
    pauseSession,
    stopSession,
  };
}
