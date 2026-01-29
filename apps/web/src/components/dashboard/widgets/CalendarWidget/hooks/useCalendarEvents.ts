'use client';

import { useMemo } from 'react';
import { useCalendarStore, useVisibleEvents, useFetchingEvents } from '@/lib/stores/calendar';
import type { CalendarEvent, CalendarEventDisplay, UseCalendarEventsReturn } from '../types';

/**
 * Utility functions for date/time calculations
 */
const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  );
};

const isThisWeek = (date: Date): boolean => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return date >= startOfWeek && date < endOfWeek;
};

const formatTime = (date: Date, allDay: boolean): string => {
  if (allDay) return 'All day';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Transform CalendarEvent to CalendarEventDisplay with computed properties
 */
function enrichEvent(
  event: CalendarEvent,
  calendarColor?: string
): CalendarEventDisplay {
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const now = new Date();
  const isNow = startDate <= now && endDate >= now;
  const durationMinutes = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  );

  return {
    ...event,
    isNow,
    isToday: isToday(startDate),
    isTomorrow: isTomorrow(startDate),
    isThisWeek: isThisWeek(startDate),
    startDate,
    endDate,
    durationMinutes,
    formattedTime: formatTime(startDate, event.all_day),
    formattedDate: formatDate(startDate),
    calendarColor: calendarColor || event.color || '#039be5',
  };
}

/**
 * useCalendarEvents Hook
 *
 * Provides filtered and enriched calendar events with computed display properties.
 */
export function useCalendarEvents(options: {
  calendarIds?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  filter?: 'all' | 'today' | 'upcoming' | 'this-week';
} = {}): UseCalendarEventsReturn {
  const { calendars, isSyncing } = useCalendarStore();
  const visibleEvents = useVisibleEvents();
  const isFetching = useFetchingEvents();

  const events = useMemo(() => {
    let filtered = visibleEvents;

    // Filter by calendar IDs if specified
    if (options.calendarIds && options.calendarIds.length > 0) {
      filtered = filtered.filter((e) =>
        options.calendarIds!.includes(e.google_calendar_id)
      );
    }

    // Filter by date range
    if (options.startDate) {
      const start = options.startDate.toISOString();
      filtered = filtered.filter((e) => e.start_time >= start);
    }

    if (options.endDate) {
      const end = options.endDate.toISOString();
      filtered = filtered.filter((e) => e.start_time <= end);
    }

    // Apply preset filters
    const now = new Date();
    switch (options.filter) {
      case 'today':
        filtered = filtered.filter((e) => isToday(new Date(e.start_time)));
        break;
      case 'upcoming':
        filtered = filtered.filter(
          (e) => new Date(e.start_time) >= now || new Date(e.end_time) >= now
        );
        break;
      case 'this-week':
        filtered = filtered.filter((e) => isThisWeek(new Date(e.start_time)));
        break;
    }

    // Create calendar color lookup
    const calendarColors: Record<string, string> = {};
    calendars.forEach((cal) => {
      calendarColors[cal.id] = cal.backgroundColor;
    });

    // Enrich events with computed properties
    const enriched = filtered.map((event) =>
      enrichEvent(event, calendarColors[event.google_calendar_id])
    );

    // Sort by start time
    enriched.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // Apply limit
    if (options.limit && options.limit > 0) {
      return enriched.slice(0, options.limit);
    }

    return enriched;
  }, [visibleEvents, calendars, options]);

  // Loading when syncing for the first time (no events yet) or actively fetching
  const isLoading = (isSyncing || isFetching) && events.length === 0;

  return {
    events,
    isLoading,
    refetch: () => {
      // Events are reactive from store, no manual refetch needed
    },
  };
}

/**
 * Get events for a specific date
 */
export function useEventsForDate(date: Date): CalendarEventDisplay[] {
  const { events } = useCalendarEvents();

  return useMemo(() => {
    const dateStr = date.toISOString().slice(0, 10);
    return events.filter((e) => {
      const eventDate = e.start_time.slice(0, 10);
      return eventDate === dateStr;
    });
  }, [events, date]);
}

/**
 * Get events for a date range (e.g., week view)
 */
export function useEventsForRange(
  startDate: Date,
  endDate: Date
): CalendarEventDisplay[] {
  const { events } = useCalendarEvents();

  return useMemo(() => {
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    return events.filter((e) => e.start_time >= start && e.start_time <= end);
  }, [events, startDate, endDate]);
}

/**
 * Get next upcoming event
 */
export function useNextEvent(): { event: CalendarEventDisplay | null } {
  const { events } = useCalendarEvents({ filter: 'upcoming', limit: 1 });
  return { event: events[0] || null };
}

/**
 * Get today's events
 */
export function useTodayEvents(): { events: CalendarEventDisplay[] } {
  const { events } = useCalendarEvents({ filter: 'today' });
  return { events };
}

export default useCalendarEvents;
