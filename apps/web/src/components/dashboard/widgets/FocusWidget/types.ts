/**
 * FocusWidget Types
 * Shared type definitions for focus tracking components
 */

export interface FocusSession {
  id: string;
  task: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
}

export interface FocusStats {
  todayMinutes: number;
  weekMinutes: number;
  streak: number;
  sessionsToday: number;
}

export interface FocusWidgetProps {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  onSessionChange?: (session: FocusSession | null) => void;
  className?: string;
}

export interface TimerDisplayProps {
  elapsedTime: number;
  progressPercent: number;
}

export interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

export interface TaskInputProps {
  currentTask: string;
  isEditing: boolean;
  editValue: string;
  isRunning: boolean;
  onEditStart: () => void;
  onEditChange: (value: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
}

export interface FocusStatsDisplayProps {
  stats: FocusStats;
}

export const STORAGE_KEY = 'q8-focus-sessions';
export const STATS_KEY = 'q8-focus-stats';
