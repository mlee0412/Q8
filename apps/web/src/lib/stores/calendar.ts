/**
 * Calendar Store
 *
 * Zustand store for managing calendar data and UI state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type {
  GoogleCalendar,
  CalendarEvent,
  CalendarView,
  CalendarTab,
} from '@/components/dashboard/widgets/CalendarWidget/types';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface CalendarState {
  // Data
  calendars: GoogleCalendar[];
  selectedCalendarIds: string[];
  events: CalendarEvent[];

  // View state
  currentView: CalendarView;
  currentTab: CalendarTab;
  currentDate: Date;
  selectedEventId: string | null;
  selectedDate: Date | null;

  // Sync state
  lastSyncAt: string | null;
  syncToken: string | null;
  isSyncing: boolean;
  error: string | null;

  // Auth state
  isAuthenticated: boolean;
  isCheckingAuth: boolean;

  // Expanded state
  isExpanded: boolean;

  // Fetching state
  isFetchingEvents: boolean;

  // UI state
  isCreatingEvent: boolean;
  isEditingEvent: boolean;
  showSettings: boolean;

  // Actions - Data
  setCalendars: (calendars: GoogleCalendar[]) => void;
  addCalendar: (calendar: GoogleCalendar) => void;
  removeCalendar: (id: string) => void;
  toggleCalendar: (id: string) => void;
  selectAllCalendars: () => void;
  deselectAllCalendars: () => void;
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
  clearEvents: () => void;

  // Actions - View
  setCurrentView: (view: CalendarView) => void;
  setCurrentTab: (tab: CalendarTab) => void;
  setCurrentDate: (date: Date) => void;
  setSelectedEvent: (id: string | null) => void;
  setSelectedDate: (date: Date | null) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;

  // Actions - Sync
  setSyncing: (syncing: boolean) => void;
  setLastSyncAt: (timestamp: string | null) => void;
  setSyncToken: (token: string | null) => void;
  setError: (error: string | null) => void;

  // Actions - Auth
  setAuthenticated: (authenticated: boolean) => void;
  setCheckingAuth: (checking: boolean) => void;

  // Actions - Fetching
  setFetchingEvents: (fetching: boolean) => void;

  // Actions - UI
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  setCreatingEvent: (creating: boolean) => void;
  setEditingEvent: (editing: boolean) => void;
  setShowSettings: (show: boolean) => void;

  // Actions - Reset
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  // Data
  calendars: [] as GoogleCalendar[],
  selectedCalendarIds: [] as string[],
  events: [] as CalendarEvent[],

  // View state
  currentView: 'month' as CalendarView,
  currentTab: 'calendar' as CalendarTab,
  currentDate: new Date(),
  selectedEventId: null as string | null,
  selectedDate: null as Date | null,

  // Sync state
  lastSyncAt: null as string | null,
  syncToken: null as string | null,
  isSyncing: false,
  error: null as string | null,

  // Auth state
  isAuthenticated: false,
  isCheckingAuth: true,

  // Expanded state
  isExpanded: false,

  // Fetching state
  isFetchingEvents: false,

  // UI state
  isCreatingEvent: false,
  isEditingEvent: false,
  showSettings: false,
};

// ============================================================================
// STORE
// ============================================================================

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== DATA ACTIONS ==========

      setCalendars: (calendars) => {
        set({ calendars });
        // Auto-select all calendars if none selected
        const { selectedCalendarIds } = get();
        if (selectedCalendarIds.length === 0 && calendars.length > 0) {
          set({ selectedCalendarIds: calendars.map((c) => c.id) });
        }
      },

      addCalendar: (calendar) => {
        set((state) => ({
          calendars: [...state.calendars, calendar],
          selectedCalendarIds: [...state.selectedCalendarIds, calendar.id],
        }));
      },

      removeCalendar: (id) => {
        set((state) => ({
          calendars: state.calendars.filter((c) => c.id !== id),
          selectedCalendarIds: state.selectedCalendarIds.filter((cid) => cid !== id),
          events: state.events.filter((e) => e.google_calendar_id !== id),
        }));
      },

      toggleCalendar: (id) => {
        set((state) => {
          const isSelected = state.selectedCalendarIds.includes(id);
          return {
            selectedCalendarIds: isSelected
              ? state.selectedCalendarIds.filter((cid) => cid !== id)
              : [...state.selectedCalendarIds, id],
          };
        });
      },

      selectAllCalendars: () => {
        set((state) => ({
          selectedCalendarIds: state.calendars.map((c) => c.id),
        }));
      },

      deselectAllCalendars: () => {
        set({ selectedCalendarIds: [] });
      },

      setEvents: (events) => {
        // Sort events by start time
        const sortedEvents = [...events].sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
        set({ events: sortedEvents });
      },

      addEvent: (event) => {
        set((state) => {
          // Check if event already exists
          const exists = state.events.some((e) => e.id === event.id);
          if (exists) {
            return {
              events: state.events.map((e) => (e.id === event.id ? event : e)),
            };
          }
          // Add and sort
          const newEvents = [...state.events, event].sort(
            (a, b) =>
              new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );
          return { events: newEvents };
        });
      },

      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id
              ? { ...e, ...updates, updated_at: new Date().toISOString() }
              : e
          ),
        }));
      },

      removeEvent: (id) => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
          selectedEventId:
            state.selectedEventId === id ? null : state.selectedEventId,
        }));
      },

      clearEvents: () => {
        set({ events: [] });
      },

      // ========== VIEW ACTIONS ==========

      setCurrentView: (currentView) => set({ currentView }),

      setCurrentTab: (currentTab) => set({ currentTab }),

      setCurrentDate: (currentDate) => set({ currentDate }),

      setSelectedEvent: (selectedEventId) => set({ selectedEventId }),

      setSelectedDate: (selectedDate) => set({ selectedDate }),

      goToToday: () => set({ currentDate: new Date() }),

      goToPrevious: () => {
        const { currentView, currentDate } = get();
        const newDate = new Date(currentDate);

        switch (currentView) {
          case 'month':
            newDate.setMonth(newDate.getMonth() - 1);
            break;
          case 'week':
            newDate.setDate(newDate.getDate() - 7);
            break;
          case 'day':
            newDate.setDate(newDate.getDate() - 1);
            break;
          case 'agenda':
            newDate.setDate(newDate.getDate() - 7);
            break;
        }

        set({ currentDate: newDate });
      },

      goToNext: () => {
        const { currentView, currentDate } = get();
        const newDate = new Date(currentDate);

        switch (currentView) {
          case 'month':
            newDate.setMonth(newDate.getMonth() + 1);
            break;
          case 'week':
            newDate.setDate(newDate.getDate() + 7);
            break;
          case 'day':
            newDate.setDate(newDate.getDate() + 1);
            break;
          case 'agenda':
            newDate.setDate(newDate.getDate() + 7);
            break;
        }

        set({ currentDate: newDate });
      },

      // ========== SYNC ACTIONS ==========

      setSyncing: (isSyncing) => set({ isSyncing }),

      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),

      setSyncToken: (syncToken) => set({ syncToken }),

      setError: (error) => set({ error }),

      // ========== AUTH ACTIONS ==========

      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

      setCheckingAuth: (isCheckingAuth) => set({ isCheckingAuth }),

      // ========== FETCHING ACTIONS ==========

      setFetchingEvents: (isFetchingEvents) => set({ isFetchingEvents }),

      // ========== UI ACTIONS ==========

      toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

      setExpanded: (isExpanded) => set({ isExpanded }),

      setCreatingEvent: (isCreatingEvent) => set({ isCreatingEvent }),

      setEditingEvent: (isEditingEvent) => set({ isEditingEvent }),

      setShowSettings: (showSettings) => set({ showSettings }),

      // ========== RESET ==========

      reset: () =>
        set({
          ...initialState,
          currentDate: new Date(),
        }),
    }),
    {
      name: 'calendar-storage',
      partialize: (state) => ({
        // Persist user preferences
        selectedCalendarIds: state.selectedCalendarIds,
        currentView: state.currentView,
        // Persist sync state for resuming
        lastSyncAt: state.lastSyncAt,
        syncToken: state.syncToken,
        // Persist calendars list (metadata only)
        calendars: state.calendars,
      }),
    }
  )
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

// Data selectors
export const useCalendars = () => useCalendarStore((s) => s.calendars);
export const useSelectedCalendarIds = () =>
  useCalendarStore((s) => s.selectedCalendarIds);
export const useCalendarEvents = () => useCalendarStore((s) => s.events);

// View selectors
export const useCurrentView = () => useCalendarStore((s) => s.currentView);
export const useCurrentTab = () => useCalendarStore((s) => s.currentTab);
export const useCurrentDate = () => useCalendarStore((s) => s.currentDate);
export const useSelectedEventId = () => useCalendarStore((s) => s.selectedEventId);
export const useSelectedDate = () => useCalendarStore((s) => s.selectedDate);

// Sync selectors
export const useCalendarSyncing = () => useCalendarStore((s) => s.isSyncing);
export const useLastSyncAt = () => useCalendarStore((s) => s.lastSyncAt);
export const useCalendarError = () => useCalendarStore((s) => s.error);

// Auth selectors
export const useCalendarAuthenticated = () =>
  useCalendarStore((s) => s.isAuthenticated);
export const useCheckingCalendarAuth = () =>
  useCalendarStore((s) => s.isCheckingAuth);

// Fetching selectors
export const useFetchingEvents = () => useCalendarStore((s) => s.isFetchingEvents);

// UI selectors
export const useCalendarExpanded = () => useCalendarStore((s) => s.isExpanded);
export const useIsCreatingEvent = () => useCalendarStore((s) => s.isCreatingEvent);
export const useIsEditingEvent = () => useCalendarStore((s) => s.isEditingEvent);
export const useShowCalendarSettings = () =>
  useCalendarStore((s) => s.showSettings);

// Derived selectors
export const useSelectedCalendars = () =>
  useCalendarStore(
    useShallow((s) =>
      s.calendars.filter((c) => s.selectedCalendarIds.includes(c.id))
    )
  );

export const useVisibleEvents = () =>
  useCalendarStore(
    useShallow((s) =>
      s.events.filter((e) => s.selectedCalendarIds.includes(e.google_calendar_id))
    )
  );

export const useSelectedEvent = () =>
  useCalendarStore(
    useShallow((s) =>
      s.selectedEventId
        ? s.events.find((e) => e.id === s.selectedEventId) || null
        : null
    )
  );

export const useTodayEvents = () =>
  useCalendarStore(
    useShallow((s) => {
      const today = new Date().toISOString().slice(0, 10);
      return s.events.filter((e) => {
        const eventDate = e.start_time.slice(0, 10);
        return (
          eventDate === today && s.selectedCalendarIds.includes(e.google_calendar_id)
        );
      });
    })
  );

export const useUpcomingEvents = () =>
  useCalendarStore(
    useShallow((s) => {
      const now = new Date();
      return s.events
        .filter((e) => {
          const eventStart = new Date(e.start_time);
          return (
            eventStart >= now && s.selectedCalendarIds.includes(e.google_calendar_id)
          );
        })
        .slice(0, 10);
    })
  );

// Actions hook
export const useCalendarActions = () =>
  useCalendarStore((state) => ({
    setCalendars: state.setCalendars,
    toggleCalendar: state.toggleCalendar,
    selectAllCalendars: state.selectAllCalendars,
    deselectAllCalendars: state.deselectAllCalendars,
    setEvents: state.setEvents,
    addEvent: state.addEvent,
    updateEvent: state.updateEvent,
    removeEvent: state.removeEvent,
    setCurrentView: state.setCurrentView,
    setCurrentTab: state.setCurrentTab,
    setCurrentDate: state.setCurrentDate,
    setSelectedEvent: state.setSelectedEvent,
    setSelectedDate: state.setSelectedDate,
    goToToday: state.goToToday,
    goToPrevious: state.goToPrevious,
    goToNext: state.goToNext,
    setSyncing: state.setSyncing,
    setLastSyncAt: state.setLastSyncAt,
    setError: state.setError,
    setAuthenticated: state.setAuthenticated,
    setCheckingAuth: state.setCheckingAuth,
    toggleExpanded: state.toggleExpanded,
    setExpanded: state.setExpanded,
    setCreatingEvent: state.setCreatingEvent,
    setEditingEvent: state.setEditingEvent,
    setShowSettings: state.setShowSettings,
    reset: state.reset,
  }));
