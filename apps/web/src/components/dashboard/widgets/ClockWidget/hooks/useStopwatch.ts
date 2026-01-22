'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { StopwatchState, StopwatchLap } from '../types';

interface UseStopwatchReturn {
  state: StopwatchState;
  start: () => void;
  stop: () => void;
  reset: () => void;
  lap: () => void;
  labelLap: (lapId: string, label: string) => void;
  clearLaps: () => void;
  exportLaps: () => string;
  formatTime: (ms: number, includeMs?: boolean) => string;
}

function generateLapId(): string {
  return `lap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function useStopwatch(): UseStopwatchReturn {
  const [state, setState] = useState<StopwatchState>({
    isRunning: false,
    elapsedMs: 0,
    laps: [],
    startTime: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastLapTimeRef = useRef<number>(0);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update elapsed time when running
  useEffect(() => {
    if (!state.isRunning || !state.startTime) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (!prev.isRunning || !prev.startTime) return prev;
        return {
          ...prev,
          elapsedMs: Date.now() - prev.startTime,
        };
      });
    }, 10); // Update every 10ms for smooth display

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, state.startTime]);

  // Calculate best/worst laps when laps change
  const lapsLength = state.laps.length;
  useEffect(() => {
    if (lapsLength < 2) return;

    const lapTimes = state.laps.map((l) => l.lapTime);
    const minTime = Math.min(...lapTimes);
    const maxTime = Math.max(...lapTimes);

    setState((prev) => ({
      ...prev,
      laps: prev.laps.map((lap) => ({
        ...lap,
        isBest: lap.lapTime === minTime,
        isWorst: lap.lapTime === maxTime,
      })),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- we only want to recalculate when lap count changes, not on every lap update
  }, [lapsLength]);

  // Start stopwatch
  const start = useCallback(() => {
    setState((prev) => {
      if (prev.isRunning) return prev;

      const startTime = Date.now() - prev.elapsedMs;
      return {
        ...prev,
        isRunning: true,
        startTime,
      };
    });
  }, []);

  // Stop stopwatch
  const stop = useCallback(() => {
    setState((prev) => {
      if (!prev.isRunning) return prev;
      return {
        ...prev,
        isRunning: false,
      };
    });
  }, []);

  // Reset stopwatch
  const reset = useCallback(() => {
    setState({
      isRunning: false,
      elapsedMs: 0,
      laps: [],
      startTime: null,
    });
    lastLapTimeRef.current = 0;
  }, []);

  // Record a lap
  const lap = useCallback(() => {
    setState((prev) => {
      if (!prev.isRunning) return prev;

      const currentElapsed = prev.elapsedMs;
      const lapTime = currentElapsed - lastLapTimeRef.current;
      lastLapTimeRef.current = currentElapsed;

      const newLap: StopwatchLap = {
        id: generateLapId(),
        lapNumber: prev.laps.length + 1,
        lapTime,
        totalTime: currentElapsed,
      };

      return {
        ...prev,
        laps: [newLap, ...prev.laps], // Most recent first
      };
    });
  }, []);

  // Label a lap
  const labelLap = useCallback((lapId: string, label: string) => {
    setState((prev) => ({
      ...prev,
      laps: prev.laps.map((l) => (l.id === lapId ? { ...l, label } : l)),
    }));
  }, []);

  // Clear all laps
  const clearLaps = useCallback(() => {
    setState((prev) => ({
      ...prev,
      laps: [],
    }));
    lastLapTimeRef.current = state.elapsedMs;
  }, [state.elapsedMs]);

  // Format time for display
  const formatTime = useCallback((ms: number, includeMs: boolean = true): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);

    if (hours > 0) {
      if (includeMs) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
      }
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    if (includeMs) {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Export laps as CSV
  const exportLaps = useCallback((): string => {
    const headers = ['Lap', 'Lap Time', 'Total Time', 'Label'];
    const rows = state.laps
      .slice()
      .reverse() // Chronological order
      .map((lap) => [
        lap.lapNumber.toString(),
        formatTime(lap.lapTime),
        formatTime(lap.totalTime),
        lap.label || '',
      ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }, [state.laps, formatTime]);

  return {
    state,
    start,
    stop,
    reset,
    lap,
    labelLap,
    clearLaps,
    exportLaps,
    formatTime,
  };
}
