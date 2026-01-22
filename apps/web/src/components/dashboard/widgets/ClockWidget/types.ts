/**
 * ClockWidget Types - Time Hub & Focus Management
 * Comprehensive type definitions for the Time Command Center
 */

// ============================================================================
// Core Enums & Literal Types
// ============================================================================

export type ClockTab = 'clock' | 'timer' | 'stopwatch' | 'alarms';
export type ClockDisplayMode = 'digital' | 'analog' | 'both';
export type TimerMode = 'pomodoro' | 'custom' | 'countdown';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'break' | 'completed';
export type FocusPreset = 'deep-work' | 'sprint' | 'marathon' | 'short-break' | 'long-break' | 'custom';
export type AlarmRepeat = 'once' | 'daily' | 'weekdays' | 'weekends' | 'custom';
export type TimeOfDay = 'day' | 'night' | 'dawn' | 'dusk';

// ============================================================================
// Widget Props
// ============================================================================

export interface ClockWidgetProps {
  defaultTab?: ClockTab;
  timezones?: TimeZoneConfig[];
  showAnalytics?: boolean;
  enableAlarms?: boolean;
  enableStopwatch?: boolean;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}

// ============================================================================
// Time Zone Types
// ============================================================================

export interface TimeZoneConfig {
  id: string;
  timezone: string;
  city: string;
  country: string;
  label?: string;
  isPinned: boolean;
  sortOrder: number;
}

export interface TimeZoneDisplay extends TimeZoneConfig {
  currentTime: Date;
  formattedTime: string;
  formattedDate: string;
  timeOfDay: TimeOfDay;
  offset: string;
  offsetMinutes: number;
  isDST: boolean;
}

export interface WorldClockCardProps {
  timezone: TimeZoneDisplay;
  isCompact?: boolean;
  showOffset?: boolean;
  showDate?: boolean;
  onRemove?: (id: string) => void;
  onPin?: (id: string) => void;
}

// ============================================================================
// Timer & Focus Session Types
// ============================================================================

export interface FocusPresetConfig {
  id: FocusPreset;
  label: string;
  description: string;
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  icon: string;
  color: string;
}

export interface TimerSession {
  id: string;
  mode: TimerMode;
  preset: FocusPreset;
  duration: number; // Total duration in seconds
  remaining: number; // Remaining seconds
  status: TimerStatus;
  isBreak: boolean;
  sessionsCompleted: number;
  linkedTaskId?: string;
  linkedTaskTitle?: string;
  tags?: string[];
  notes?: string;
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface TimerState {
  session: TimerSession | null;
  isRunning: boolean;
  progress: number; // 0-100
  currentPhase: 'work' | 'break' | 'long-break';
  todayStats: DailyTimerStats;
}

export interface DailyTimerStats {
  date: string;
  focusMinutes: number;
  breakMinutes: number;
  sessionsCompleted: number;
  longestSession: number;
  tags: Record<string, number>;
}

export interface TimerRingProps {
  progress: number;
  timeRemaining: number;
  status: TimerStatus;
  isBreak: boolean;
  size?: 'sm' | 'md' | 'lg';
  showControls?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onSkip?: () => void;
}

// ============================================================================
// Stopwatch Types
// ============================================================================

export interface StopwatchState {
  isRunning: boolean;
  elapsedMs: number;
  laps: StopwatchLap[];
  startTime: number | null;
}

export interface StopwatchLap {
  id: string;
  lapNumber: number;
  lapTime: number; // ms for this lap
  totalTime: number; // ms total at this point
  label?: string;
  isBest?: boolean;
  isWorst?: boolean;
}

export interface StopwatchDisplayProps {
  elapsed: number;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onLap: () => void;
}

// ============================================================================
// Alarm Types
// ============================================================================

export interface Alarm {
  id: string;
  time: string; // HH:mm format
  label: string;
  enabled: boolean;
  repeat: AlarmRepeat;
  customDays?: number[]; // 0-6, Sunday = 0
  sound: string;
  volume: number; // 0-100
  vibrate: boolean;
  snoozeMinutes: number;
  snoozeCount: number;
  maxSnoozes: number;
  gradualWake: boolean;
  gradualWakeMinutes: number;
  createdAt: string;
  lastTriggered?: string;
}

export interface AlarmBadgeProps {
  alarm: Alarm;
  nextTrigger: Date | null;
  isCompact?: boolean;
}

export interface SetAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  alarm?: Alarm;
  onSave: (alarm: Partial<Alarm>) => void;
  onDelete?: (id: string) => void;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface FocusAnalytics {
  today: {
    focusMinutes: number;
    breakMinutes: number;
    sessions: number;
    goalProgress: number;
  };
  thisWeek: {
    focusMinutes: number;
    sessions: number;
    averageSessionLength: number;
    streak: number;
    bestDay: string;
  };
  byHour: Record<number, number>; // Hour (0-23) -> minutes
  byDay: Record<string, number>; // ISO date -> minutes
  byTag: Record<string, number>; // Tag -> minutes
  recentSessions: TimerSession[];
}

export interface AnalyticsDashboardProps {
  analytics: FocusAnalytics;
  dailyGoalMinutes: number;
  onGoalChange: (minutes: number) => void;
}

// ============================================================================
// Clock Display Types
// ============================================================================

export interface AnalogClockProps {
  time: Date;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSeconds?: boolean;
  showNumbers?: boolean;
  theme?: 'light' | 'dark' | 'neon';
  className?: string;
}

export interface DigitalClockProps {
  time: Date;
  format?: '12h' | '24h';
  showSeconds?: boolean;
  showDate?: boolean;
  showTimezone?: boolean;
  timezone?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// ============================================================================
// Tab Component Props
// ============================================================================

export interface ClockTabProps {
  currentTime: Date;
  timezones: TimeZoneDisplay[];
  displayMode: ClockDisplayMode;
  onDisplayModeChange: (mode: ClockDisplayMode) => void;
  onAddTimezone: () => void;
  onRemoveTimezone: (id: string) => void;
  onReorderTimezones: (timezones: TimeZoneConfig[]) => void;
}

export interface TimerTabProps {
  timerState: TimerState;
  presets: FocusPresetConfig[];
  currentTask: string;
  onTaskChange: (task: string) => void;
  onStartSession: (preset: FocusPreset, duration?: number) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkipBreak: () => void;
  onLinkTask: (taskId: string) => void;
}

export interface StopwatchTabProps {
  state: StopwatchState;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onLap: () => void;
  onLabelLap: (lapId: string, label: string) => void;
  onClearLaps: () => void;
  onExportLaps: () => string;
}

export interface AlarmsTabProps {
  alarms: Alarm[];
  onToggleAlarm: (id: string) => void;
  onEditAlarm: (alarm: Alarm) => void;
  onDeleteAlarm: (id: string) => void;
  onAddAlarm: () => void;
}

// ============================================================================
// Command Center Props
// ============================================================================

export interface TimeCommandCenterProps {
  onClose: () => void;
  initialTab?: ClockTab;
  timezones: TimeZoneConfig[];
  analytics: FocusAnalytics;
  // Timer functionality
  timerState: TimerState;
  onStartSession: (preset: FocusPreset, duration?: number) => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onResetSession: () => void;
  onSkipPhase: () => void;
  // Stopwatch functionality
  stopwatchState: StopwatchState;
  onStopwatchStart: () => void;
  onStopwatchStop: () => void;
  onStopwatchReset: () => void;
  onStopwatchLap: () => void;
  onStopwatchLabelLap: (lapId: string, label: string) => void;
  onStopwatchClearLaps: () => void;
  // Alarms functionality
  alarms: Alarm[];
  onToggleAlarm: (id: string) => void;
  onAddAlarm: () => void;
  onEditAlarm: (alarm: Alarm) => void;
  onDeleteAlarm: (id: string) => void;
}

export interface FocusModeProps {
  session: TimerSession;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onComplete: () => void;
  ambientSound?: string;
  onAmbientSoundChange: (sound: string | null) => void;
}

// ============================================================================
// Modal Props
// ============================================================================

export interface AddTimezoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (timezone: TimeZoneConfig) => void;
  existingTimezones: string[];
}

export interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TimerSession;
  onAddNotes: (notes: string) => void;
  onAddTags: (tags: string[]) => void;
  onStartAnother: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface TimeFormatOptions {
  format: '12h' | '24h';
  showSeconds: boolean;
  showAmPm: boolean;
  showTimezone: boolean;
}

export interface SoundOption {
  id: string;
  name: string;
  category: 'alarm' | 'ambient' | 'notification';
  url?: string;
  isBuiltIn: boolean;
}
