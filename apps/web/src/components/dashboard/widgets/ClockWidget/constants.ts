/**
 * ClockWidget Constants
 * Presets, timezones, themes, and configuration
 */

import type {
  TimeZoneConfig,
  FocusPresetConfig,
  SoundOption,
  ClockTab,
} from './types';

// ============================================================================
// Tab Configuration
// ============================================================================

export const CLOCK_TABS: { id: ClockTab; label: string; icon: string }[] = [
  { id: 'clock', label: 'Clock', icon: 'Clock' },
  { id: 'timer', label: 'Timer', icon: 'Timer' },
  { id: 'stopwatch', label: 'Stopwatch', icon: 'Gauge' },
  { id: 'alarms', label: 'Alarms', icon: 'Bell' },
];

// ============================================================================
// Default Timezones
// ============================================================================

export const DEFAULT_TIMEZONES: TimeZoneConfig[] = [
  {
    id: 'local',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    city: 'Local',
    country: '',
    label: 'Local Time',
    isPinned: true,
    sortOrder: 0,
  },
  {
    id: 'nyc',
    timezone: 'America/New_York',
    city: 'New York',
    country: 'USA',
    label: 'NYC',
    isPinned: false,
    sortOrder: 1,
  },
  {
    id: 'london',
    timezone: 'Europe/London',
    city: 'London',
    country: 'UK',
    label: 'LON',
    isPinned: false,
    sortOrder: 2,
  },
  {
    id: 'seoul',
    timezone: 'Asia/Seoul',
    city: 'Seoul',
    country: 'South Korea',
    label: 'SEL',
    isPinned: false,
    sortOrder: 3,
  },
];

// ============================================================================
// Popular Timezones for Selection
// ============================================================================

export const POPULAR_TIMEZONES: Omit<TimeZoneConfig, 'id' | 'isPinned' | 'sortOrder'>[] = [
  { timezone: 'America/New_York', city: 'New York', country: 'USA', label: 'NYC' },
  { timezone: 'America/Los_Angeles', city: 'Los Angeles', country: 'USA', label: 'LA' },
  { timezone: 'America/Chicago', city: 'Chicago', country: 'USA', label: 'CHI' },
  { timezone: 'America/Denver', city: 'Denver', country: 'USA', label: 'DEN' },
  { timezone: 'America/Toronto', city: 'Toronto', country: 'Canada', label: 'TOR' },
  { timezone: 'America/Vancouver', city: 'Vancouver', country: 'Canada', label: 'VAN' },
  { timezone: 'America/Mexico_City', city: 'Mexico City', country: 'Mexico', label: 'MEX' },
  { timezone: 'America/Sao_Paulo', city: 'São Paulo', country: 'Brazil', label: 'SAO' },
  { timezone: 'Europe/London', city: 'London', country: 'UK', label: 'LON' },
  { timezone: 'Europe/Paris', city: 'Paris', country: 'France', label: 'PAR' },
  { timezone: 'Europe/Berlin', city: 'Berlin', country: 'Germany', label: 'BER' },
  { timezone: 'Europe/Amsterdam', city: 'Amsterdam', country: 'Netherlands', label: 'AMS' },
  { timezone: 'Europe/Madrid', city: 'Madrid', country: 'Spain', label: 'MAD' },
  { timezone: 'Europe/Rome', city: 'Rome', country: 'Italy', label: 'ROM' },
  { timezone: 'Europe/Moscow', city: 'Moscow', country: 'Russia', label: 'MOW' },
  { timezone: 'Asia/Dubai', city: 'Dubai', country: 'UAE', label: 'DXB' },
  { timezone: 'Asia/Kolkata', city: 'Mumbai', country: 'India', label: 'BOM' },
  { timezone: 'Asia/Singapore', city: 'Singapore', country: 'Singapore', label: 'SIN' },
  { timezone: 'Asia/Hong_Kong', city: 'Hong Kong', country: 'China', label: 'HKG' },
  { timezone: 'Asia/Shanghai', city: 'Shanghai', country: 'China', label: 'SHA' },
  { timezone: 'Asia/Tokyo', city: 'Tokyo', country: 'Japan', label: 'TYO' },
  { timezone: 'Asia/Seoul', city: 'Seoul', country: 'South Korea', label: 'SEL' },
  { timezone: 'Australia/Sydney', city: 'Sydney', country: 'Australia', label: 'SYD' },
  { timezone: 'Australia/Melbourne', city: 'Melbourne', country: 'Australia', label: 'MEL' },
  { timezone: 'Pacific/Auckland', city: 'Auckland', country: 'New Zealand', label: 'AKL' },
];

// ============================================================================
// Focus Presets
// ============================================================================

export const FOCUS_PRESETS: FocusPresetConfig[] = [
  {
    id: 'sprint',
    label: 'Sprint',
    description: 'Quick focused bursts',
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    sessionsUntilLongBreak: 4,
    icon: '⚡',
    color: 'text-amber-400',
  },
  {
    id: 'deep-work',
    label: 'Deep Work',
    description: 'Extended focus sessions',
    workMinutes: 50,
    breakMinutes: 10,
    longBreakMinutes: 30,
    sessionsUntilLongBreak: 2,
    icon: '🧠',
    color: 'text-purple-400',
  },
  {
    id: 'marathon',
    label: 'Marathon',
    description: 'Long sustained focus',
    workMinutes: 90,
    breakMinutes: 20,
    longBreakMinutes: 45,
    sessionsUntilLongBreak: 2,
    icon: '🏃',
    color: 'text-blue-400',
  },
  {
    id: 'short-break',
    label: 'Short Break',
    description: 'Quick rest period',
    workMinutes: 0,
    breakMinutes: 5,
    longBreakMinutes: 5,
    sessionsUntilLongBreak: 1,
    icon: '☕',
    color: 'text-green-400',
  },
  {
    id: 'long-break',
    label: 'Long Break',
    description: 'Extended rest period',
    workMinutes: 0,
    breakMinutes: 15,
    longBreakMinutes: 15,
    sessionsUntilLongBreak: 1,
    icon: '🌿',
    color: 'text-emerald-400',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Set your own duration',
    workMinutes: 30,
    breakMinutes: 5,
    longBreakMinutes: 15,
    sessionsUntilLongBreak: 4,
    icon: '⚙️',
    color: 'text-slate-400',
  },
];

// ============================================================================
// Quick Timer Presets (for compact view)
// ============================================================================

export const QUICK_TIMER_PRESETS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '10m', seconds: 10 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '30m', seconds: 30 * 60 },
  { label: '45m', seconds: 45 * 60 },
  { label: '60m', seconds: 60 * 60 },
  { label: '90m', seconds: 90 * 60 },
];

// ============================================================================
// Alarm Sounds
// ============================================================================

export const ALARM_SOUNDS: SoundOption[] = [
  { id: 'gentle', name: 'Gentle Chime', category: 'alarm', isBuiltIn: true },
  { id: 'classic', name: 'Classic Bell', category: 'alarm', isBuiltIn: true },
  { id: 'digital', name: 'Digital Beep', category: 'alarm', isBuiltIn: true },
  { id: 'nature', name: 'Nature Birds', category: 'alarm', isBuiltIn: true },
  { id: 'zen', name: 'Zen Bowl', category: 'alarm', isBuiltIn: true },
  { id: 'urgent', name: 'Urgent Alert', category: 'alarm', isBuiltIn: true },
];

// ============================================================================
// Ambient Sounds
// ============================================================================

export const AMBIENT_SOUNDS: SoundOption[] = [
  { id: 'none', name: 'None', category: 'ambient', isBuiltIn: true },
  { id: 'rain', name: 'Rain', category: 'ambient', isBuiltIn: true },
  { id: 'cafe', name: 'Coffee Shop', category: 'ambient', isBuiltIn: true },
  { id: 'forest', name: 'Forest', category: 'ambient', isBuiltIn: true },
  { id: 'ocean', name: 'Ocean Waves', category: 'ambient', isBuiltIn: true },
  { id: 'fire', name: 'Fireplace', category: 'ambient', isBuiltIn: true },
  { id: 'whitenoise', name: 'White Noise', category: 'ambient', isBuiltIn: true },
  { id: 'brownnoise', name: 'Brown Noise', category: 'ambient', isBuiltIn: true },
];

// ============================================================================
// Notification Sounds
// ============================================================================

export const NOTIFICATION_SOUNDS: SoundOption[] = [
  { id: 'ding', name: 'Ding', category: 'notification', isBuiltIn: true },
  { id: 'chime', name: 'Chime', category: 'notification', isBuiltIn: true },
  { id: 'bell', name: 'Bell', category: 'notification', isBuiltIn: true },
  { id: 'success', name: 'Success', category: 'notification', isBuiltIn: true },
];

// ============================================================================
// Time Format Presets
// ============================================================================

export const TIME_FORMATS = {
  '12h': { format: '12h', showAmPm: true },
  '24h': { format: '24h', showAmPm: false },
} as const;

// ============================================================================
// Day Names
// ============================================================================

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// ============================================================================
// Analytics Defaults
// ============================================================================

export const DEFAULT_DAILY_GOAL_MINUTES = 240; // 4 hours
export const STREAK_THRESHOLD_MINUTES = 60; // Minimum minutes to count as a productive day

// ============================================================================
// Animation Variants
// ============================================================================

export const TAB_VARIANTS = {
  enter: { opacity: 0, x: 10 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
};

export const FADE_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const SCALE_VARIANTS = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// ============================================================================
// Grid Span Classes
// ============================================================================

export const COL_SPAN_CLASSES: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-1 md:col-span-2',
  3: 'col-span-1 md:col-span-3',
  4: 'col-span-1 md:col-span-4',
};

export const ROW_SPAN_CLASSES: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
};
