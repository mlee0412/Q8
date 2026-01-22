'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Alarm, AlarmRepeat } from '../types';

interface UseAlarmsOptions {
  onAlarmTrigger?: (alarm: Alarm) => void;
  checkInterval?: number;
}

interface UseAlarmsReturn {
  alarms: Alarm[];
  addAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt' | 'snoozeCount'>) => void;
  updateAlarm: (id: string, updates: Partial<Alarm>) => void;
  deleteAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
  snoozeAlarm: (id: string) => void;
  dismissAlarm: (id: string) => void;
  getNextTrigger: (alarm: Alarm) => Date | null;
  activeAlarm: Alarm | null;
}

function generateId(): string {
  return `alarm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.split(':').map(Number);
  return { hours: parts[0] ?? 0, minutes: parts[1] ?? 0 };
}

function getNextTriggerDate(alarm: Alarm): Date | null {
  if (!alarm.enabled) return null;

  const now = new Date();
  const { hours, minutes } = parseTimeString(alarm.time);
  const today = new Date();
  today.setHours(hours, minutes, 0, 0);

  // Helper to get next occurrence based on repeat pattern
  const getNextOccurrence = (): Date | null => {
    switch (alarm.repeat) {
      case 'once': {
        if (today > now) return today;
        return null; // Already passed
      }

      case 'daily': {
        if (today > now) return today;
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      }

      case 'weekdays': {
        let checkDate = new Date(today);
        for (let i = 0; i < 7; i++) {
          if (checkDate > now) {
            const day = checkDate.getDay();
            if (day >= 1 && day <= 5) return checkDate;
          }
          checkDate = new Date(checkDate);
          checkDate.setDate(checkDate.getDate() + 1);
          checkDate.setHours(hours, minutes, 0, 0);
        }
        return null;
      }

      case 'weekends': {
        let checkDate = new Date(today);
        for (let i = 0; i < 7; i++) {
          if (checkDate > now) {
            const day = checkDate.getDay();
            if (day === 0 || day === 6) return checkDate;
          }
          checkDate = new Date(checkDate);
          checkDate.setDate(checkDate.getDate() + 1);
          checkDate.setHours(hours, minutes, 0, 0);
        }
        return null;
      }

      case 'custom': {
        if (!alarm.customDays || alarm.customDays.length === 0) return null;
        let checkDate = new Date(today);
        for (let i = 0; i < 7; i++) {
          if (checkDate > now) {
            const day = checkDate.getDay();
            if (alarm.customDays.includes(day)) return checkDate;
          }
          checkDate = new Date(checkDate);
          checkDate.setDate(checkDate.getDate() + 1);
          checkDate.setHours(hours, minutes, 0, 0);
        }
        return null;
      }

      default:
        return null;
    }
  };

  return getNextOccurrence();
}

export function useAlarms(options: UseAlarmsOptions = {}): UseAlarmsReturn {
  const { onAlarmTrigger, checkInterval = 1000 } = options;

  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for triggered alarms
  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      alarms.forEach((alarm) => {
        if (!alarm.enabled) return;

        // Check if current time matches alarm time (within the same minute)
        if (alarm.time === currentTime) {
          // Check if we already triggered this alarm recently
          if (alarm.lastTriggered) {
            const lastTriggered = new Date(alarm.lastTriggered);
            const timeSinceLastTrigger = now.getTime() - lastTriggered.getTime();
            if (timeSinceLastTrigger < 60000) return; // Don't re-trigger within a minute
          }

          // Check if day matches repeat pattern
          const day = now.getDay();
          let shouldTrigger = false;

          switch (alarm.repeat) {
            case 'once':
            case 'daily':
              shouldTrigger = true;
              break;
            case 'weekdays':
              shouldTrigger = day >= 1 && day <= 5;
              break;
            case 'weekends':
              shouldTrigger = day === 0 || day === 6;
              break;
            case 'custom':
              shouldTrigger = alarm.customDays?.includes(day) ?? false;
              break;
          }

          if (shouldTrigger) {
            setActiveAlarm(alarm);
            onAlarmTrigger?.(alarm);

            // Update last triggered
            setAlarms((prev) =>
              prev.map((a) =>
                a.id === alarm.id
                  ? { ...a, lastTriggered: now.toISOString() }
                  : a
              )
            );

            // Disable one-time alarms
            if (alarm.repeat === 'once') {
              setAlarms((prev) =>
                prev.map((a) =>
                  a.id === alarm.id ? { ...a, enabled: false } : a
                )
              );
            }
          }
        }
      });
    }, checkInterval);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [alarms, checkInterval, onAlarmTrigger]);

  // Add a new alarm
  const addAlarm = useCallback(
    (alarm: Omit<Alarm, 'id' | 'createdAt' | 'snoozeCount'>) => {
      const newAlarm: Alarm = {
        ...alarm,
        id: generateId(),
        createdAt: new Date().toISOString(),
        snoozeCount: 0,
      };
      setAlarms((prev) => [...prev, newAlarm]);
    },
    []
  );

  // Update an alarm
  const updateAlarm = useCallback((id: string, updates: Partial<Alarm>) => {
    setAlarms((prev) =>
      prev.map((alarm) =>
        alarm.id === id ? { ...alarm, ...updates } : alarm
      )
    );
  }, []);

  // Delete an alarm
  const deleteAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.filter((alarm) => alarm.id !== id));
    if (activeAlarm?.id === id) {
      setActiveAlarm(null);
    }
  }, [activeAlarm?.id]);

  // Toggle alarm enabled state
  const toggleAlarm = useCallback((id: string) => {
    setAlarms((prev) =>
      prev.map((alarm) =>
        alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm
      )
    );
  }, []);

  // Snooze the active alarm
  const snoozeAlarm = useCallback((id: string) => {
    setAlarms((prev) =>
      prev.map((alarm) => {
        if (alarm.id !== id) return alarm;
        if (alarm.snoozeCount >= alarm.maxSnoozes) return alarm;

        // Calculate snooze time
        const now = new Date();
        now.setMinutes(now.getMinutes() + alarm.snoozeMinutes);
        const snoozeTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        return {
          ...alarm,
          time: snoozeTime,
          snoozeCount: alarm.snoozeCount + 1,
        };
      })
    );
    setActiveAlarm(null);
  }, []);

  // Dismiss the active alarm
  const dismissAlarm = useCallback((id: string) => {
    // Reset snooze count
    setAlarms((prev) =>
      prev.map((alarm) =>
        alarm.id === id ? { ...alarm, snoozeCount: 0 } : alarm
      )
    );
    setActiveAlarm(null);
  }, []);

  // Get next trigger time for an alarm
  const getNextTrigger = useCallback((alarm: Alarm): Date | null => {
    return getNextTriggerDate(alarm);
  }, []);

  return {
    alarms,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    toggleAlarm,
    snoozeAlarm,
    dismissAlarm,
    getNextTrigger,
    activeAlarm,
  };
}
