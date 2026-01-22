'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TimeZoneConfig, TimeZoneDisplay, TimeOfDay } from '../types';
import { DEFAULT_TIMEZONES } from '../constants';

interface UseTimeDataOptions {
  updateInterval?: number;
  timezones?: TimeZoneConfig[];
}

interface UseTimeDataReturn {
  currentTime: Date;
  timezones: TimeZoneDisplay[];
  addTimezone: (config: Omit<TimeZoneConfig, 'id' | 'sortOrder'>) => void;
  removeTimezone: (id: string) => void;
  reorderTimezones: (timezones: TimeZoneConfig[]) => void;
  togglePin: (id: string) => void;
  formatTimeForZone: (date: Date, timezone: string, options?: Intl.DateTimeFormatOptions) => string;
  getTimeOfDay: (date: Date, timezone: string) => TimeOfDay;
  getTimeDifference: (timezone1: string, timezone2: string) => number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getTimeOfDay(date: Date, timezone: string): TimeOfDay {
  const hour = parseInt(
    date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
  );

  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 18) return 'day';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
}

function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
}

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `UTC${sign}${hours}${minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''}`;
}

function isDST(date: Date, timezone: string): boolean {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const janOffset = getTimezoneOffset(timezone, jan);
  const julOffset = getTimezoneOffset(timezone, jul);
  const currentOffset = getTimezoneOffset(timezone, date);
  const standardOffset = Math.min(janOffset, julOffset);
  return currentOffset !== standardOffset;
}

export function useTimeData(options: UseTimeDataOptions = {}): UseTimeDataReturn {
  const { updateInterval = 1000, timezones: initialTimezones } = options;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezoneConfigs, setTimezoneConfigs] = useState<TimeZoneConfig[]>(
    initialTimezones || DEFAULT_TIMEZONES
  );

  // Update current time at specified interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, updateInterval);

    return () => clearInterval(timer);
  }, [updateInterval]);

  // Format time for a specific timezone
  const formatTimeForZone = useCallback(
    (date: Date, timezone: string, formatOptions?: Intl.DateTimeFormatOptions) => {
      const defaultOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      return date.toLocaleTimeString('en-US', { ...defaultOptions, ...formatOptions });
    },
    []
  );

  // Get time difference between two timezones in minutes
  const getTimeDifference = useCallback((timezone1: string, timezone2: string): number => {
    const offset1 = getTimezoneOffset(timezone1);
    const offset2 = getTimezoneOffset(timezone2);
    return offset2 - offset1;
  }, []);

  // Build timezone display objects
  const timezones = useMemo<TimeZoneDisplay[]>(() => {
    return timezoneConfigs
      .sort((a, b) => {
        // Pinned items first, then by sort order
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      })
      .map((config) => {
        const offsetMinutes = getTimezoneOffset(config.timezone, currentTime);
        return {
          ...config,
          currentTime,
          formattedTime: formatTimeForZone(currentTime, config.timezone),
          formattedDate: currentTime.toLocaleDateString('en-US', {
            timeZone: config.timezone,
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          timeOfDay: getTimeOfDay(currentTime, config.timezone),
          offset: formatOffset(offsetMinutes),
          offsetMinutes,
          isDST: isDST(currentTime, config.timezone),
        };
      });
  }, [timezoneConfigs, currentTime, formatTimeForZone]);

  // Add a new timezone
  const addTimezone = useCallback(
    (config: Omit<TimeZoneConfig, 'id' | 'sortOrder'>) => {
      const newConfig: TimeZoneConfig = {
        ...config,
        id: generateId(),
        sortOrder: timezoneConfigs.length,
      };
      setTimezoneConfigs((prev) => [...prev, newConfig]);
    },
    [timezoneConfigs.length]
  );

  // Remove a timezone
  const removeTimezone = useCallback((id: string) => {
    setTimezoneConfigs((prev) => prev.filter((tz) => tz.id !== id));
  }, []);

  // Reorder timezones
  const reorderTimezones = useCallback((newOrder: TimeZoneConfig[]) => {
    setTimezoneConfigs(
      newOrder.map((tz, index) => ({
        ...tz,
        sortOrder: index,
      }))
    );
  }, []);

  // Toggle pin status
  const togglePin = useCallback((id: string) => {
    setTimezoneConfigs((prev) =>
      prev.map((tz) => (tz.id === id ? { ...tz, isPinned: !tz.isPinned } : tz))
    );
  }, []);

  return {
    currentTime,
    timezones,
    addTimezone,
    removeTimezone,
    reorderTimezones,
    togglePin,
    formatTimeForZone,
    getTimeOfDay: (date: Date, timezone: string) => getTimeOfDay(date, timezone),
    getTimeDifference,
  };
}
