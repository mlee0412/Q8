/**
 * CalendarWidget Types - Google Calendar Integration
 * Comprehensive type definitions for the Calendar Command Center
 */

// ============================================================================
// Core Enums & Literal Types
// ============================================================================

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';
export type CompactView = 'upcoming' | 'today' | 'next';
export type CalendarTab = 'calendar' | 'events' | 'settings';

// ============================================================================
// Google Calendar Types
// ============================================================================

/**
 * Google Calendar metadata from Calendar API
 */
export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor: string;
  foregroundColor: string;
  primary?: boolean;
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
  timeZone?: string;
  selected?: boolean;
  // Multi-account support
  googleAccountId?: string;
  googleAccountEmail?: string;
  googleAccountLabel?: string;
}

/**
 * Event attendee information
 */
export interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  organizer?: boolean;
  self?: boolean;
  optional?: boolean;
}

/**
 * Event reminder configuration
 */
export interface EventReminder {
  method: 'email' | 'popup';
  minutes: number;
}

/**
 * Event recurrence rule (RRULE)
 */
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  count?: number;
  until?: string;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
}

// ============================================================================
// Calendar Event Types
// ============================================================================

/**
 * Calendar event stored in RxDB/Supabase
 */
export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  meeting_url?: string;
  attendees: EventAttendee[];
  color?: string;
  calendar_name: string;
  google_calendar_id: string;
  google_event_id: string;
  google_account_id?: string; // Multi-account support
  recurrence?: string[];
  reminders?: EventReminder[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  created_at: string;
  updated_at: string;
}

/**
 * Form input for creating/updating events
 */
export interface CalendarEventInput {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  location?: string;
  calendar_id: string;
  reminders?: EventReminder[];
  attendees?: string[];
  recurrence?: RecurrenceRule;
}

/**
 * Event for display with computed properties
 */
export interface CalendarEventDisplay extends CalendarEvent {
  isNow: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  isThisWeek: boolean;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
  formattedTime: string;
  formattedDate: string;
  calendarColor: string;
}

// ============================================================================
// Widget Props
// ============================================================================

export interface CalendarWidgetProps {
  maxItems?: number;
  todayOnly?: boolean;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
  defaultView?: CompactView;
}

export interface CalendarCommandCenterProps {
  onClose: () => void;
  initialView?: CalendarView;
  initialDate?: Date;
  selectedEventId?: string;
}

// ============================================================================
// Component Props
// ============================================================================

export interface EventCardProps {
  event: CalendarEventDisplay;
  isCompact?: boolean;
  showDate?: boolean;
  showCalendar?: boolean;
  onClick?: (event: CalendarEventDisplay) => void;
  onJoinMeeting?: (url: string) => void;
}

export interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  events?: CalendarEvent[];
  highlightToday?: boolean;
  showNavigation?: boolean;
  className?: string;
}

export interface CalendarBadgeProps {
  calendar: GoogleCalendar;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  showPresets?: boolean;
  minTime?: string;
  maxTime?: string;
  disabled?: boolean;
}

export interface DateTimePickerProps {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  onStartDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateChange: (date: string) => void;
  onEndTimeChange: (time: string) => void;
  onAllDayChange: (allDay: boolean) => void;
}

// ============================================================================
// Modal Props
// ============================================================================

export interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEventDisplay | null;
  onEdit: (event: CalendarEventDisplay) => void;
  onDelete: (eventId: string) => void;
}

export interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date;
  defaultCalendarId?: string;
  onSave: (event: CalendarEventInput) => Promise<void>;
}

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

// ============================================================================
// Shared Component Props
// ============================================================================

export interface CalendarSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface CalendarSelectorProps {
  calendars: GoogleCalendar[];
  selectedIds: string[];
  onToggle: (calendarId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export interface SyncStatusProps {
  lastSyncAt?: string | null;
  isSyncing?: boolean;
  onSync?: () => void;
  error?: string | null;
  compact?: boolean;
}

export interface LinkCalendarPromptProps {
  onLink: () => void;
  isLinking?: boolean;
}

// ============================================================================
// Expanded View Props
// ============================================================================

export interface CalendarSidebarProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  calendars: GoogleCalendar[];
  selectedCalendarIds: string[];
  onCalendarToggle: (id: string) => void;
  onAddEvent: () => void;
}

export interface MonthViewProps {
  currentDate: Date;
  events: CalendarEventDisplay[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onCreateEvent: (date: Date) => void;
}

export interface WeekViewProps {
  currentDate: Date;
  events: CalendarEventDisplay[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onCreateEvent: (date: Date, hour?: number) => void;
}

export interface DayViewProps {
  currentDate: Date;
  events: CalendarEventDisplay[];
  onEventClick: (event: CalendarEvent) => void;
  onCreateEvent: (hour: number) => void;
}

export interface AgendaViewProps {
  events: CalendarEventDisplay[];
  onEventClick: (event: CalendarEvent) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export interface EventDetailPanelProps {
  event: CalendarEvent | null;
  isEditing: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSave: (event: CalendarEventInput) => Promise<void>;
  onDelete: () => void;
  onCancelEdit: () => void;
}

export interface CreateEventFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date;
  defaultHour?: number;
  calendars: GoogleCalendar[];
  onSave: (event: CalendarEventInput) => Promise<void>;
}

// ============================================================================
// Compact View Props
// ============================================================================

export interface UpcomingEventsListProps {
  events: CalendarEventDisplay[];
  maxItems?: number;
  onEventClick: (event: CalendarEventDisplay) => void;
  onViewAll?: () => void;
  onJoinMeeting?: (url: string) => void;
}

export interface TodayOverviewProps {
  events: CalendarEventDisplay[];
  onEventClick: (event: CalendarEventDisplay) => void;
  onJoinMeeting?: (url: string) => void;
  onCreateEvent?: () => void;
}

export interface NextEventCardProps {
  event: CalendarEventDisplay | null;
  onEventClick: (event: CalendarEventDisplay) => void;
  onJoinMeeting?: (url: string) => void;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseCalendarSyncReturn {
  // Data
  calendars: GoogleCalendar[];
  selectedCalendarIds: string[];

  // Auth
  isAuthenticated: boolean;
  isCheckingAuth: boolean;

  // Sync
  isSyncing: boolean;
  lastSyncAt: string | null;
  error: string | null;

  // Actions
  fetchCalendars: () => Promise<boolean>;
  syncEvents: (options?: { forceRefresh?: boolean }) => Promise<void>;
  createEvent: (event: CalendarEventInput) => Promise<CalendarEvent>;
  updateEvent: (eventId: string, event: Partial<CalendarEventInput>) => Promise<CalendarEvent>;
  deleteEvent: (eventId: string, calendarId: string) => Promise<void>;
  toggleCalendar: (calendarId: string) => void;
  linkCalendar: () => Promise<void>;
}

export interface UseCalendarEventsReturn {
  events: CalendarEventDisplay[];
  isLoading: boolean;
  refetch: () => void;
}

export interface UseEventFormReturn {
  formData: CalendarEventInput;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
  setField: <K extends keyof CalendarEventInput>(
    field: K,
    value: CalendarEventInput[K]
  ) => void;
  handleSubmit: () => Promise<void>;
  reset: () => void;
  validate: () => boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface CalendarListResponse {
  calendars: GoogleCalendar[];
}

export interface EventsResponse {
  events: CalendarEvent[];
  nextPageToken?: string;
  syncToken?: string;
}

export interface SyncResponse {
  synced: number;
  deleted: number;
  syncToken: string;
  lastSyncAt: string;
}

export interface CreateEventResponse {
  event: CalendarEvent;
}

export interface UpdateEventResponse {
  event: CalendarEvent;
}

export interface DeleteEventResponse {
  success: boolean;
}
