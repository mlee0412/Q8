'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCalendarStore } from '@/lib/stores/calendar';
import { CalendarBadge } from '../components/CalendarBadge';
import { QUICK_DURATIONS, DEFAULT_REMINDERS } from '../constants';
import type { QuickAddModalProps, CalendarEventInput } from '../types';

/**
 * QuickAddModal - Fast event creation modal
 *
 * Simplified form for quickly creating events.
 */
export const QuickAddModal = memo(function QuickAddModal({
  isOpen,
  onClose,
  defaultDate,
  defaultCalendarId,
  onSave,
}: QuickAddModalProps) {
  const { calendars } = useCalendarStore();

  // Form state
  const [title, setTitle] = useState('');
  const [calendarId, setCalendarId] = useState(defaultCalendarId || '');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60); // minutes
  const [allDay, setAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setError(null);

      // Set default calendar
      if (defaultCalendarId) {
        setCalendarId(defaultCalendarId);
      } else if (calendars.length > 0) {
        const primary = calendars.find((c) => c.primary);
        const firstCalendar = calendars[0];
        setCalendarId(primary?.id ?? firstCalendar?.id ?? '');
      }

      // Set default time
      const now = defaultDate || new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
      setStartTime(now.toISOString().slice(0, 16));
    }
  }, [isOpen, defaultDate, defaultCalendarId, calendars]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter an event title');
      return;
    }

    if (!calendarId) {
      setError('Please select a calendar');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const startDate = new Date(startTime);
      const endDate = new Date(startDate);

      if (allDay) {
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate.setMinutes(endDate.getMinutes() + duration);
      }

      const eventData: CalendarEventInput = {
        title: title.trim(),
        start_time: allDay ? startTime.slice(0, 10) : startDate.toISOString(),
        end_time: allDay ? startTime.slice(0, 10) : endDate.toISOString(),
        all_day: allDay,
        calendar_id: calendarId,
        reminders: DEFAULT_REMINDERS,
      };

      await onSave(eventData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, calendarId, startTime, duration, allDay, onSave, onClose]);

  const selectedCalendar = calendars.find((c) => c.id === calendarId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'fixed z-50',
              'inset-x-3 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2',
              'w-auto md:w-full max-w-sm',
              'bg-surface-2 rounded-2xl shadow-2xl',
              'border border-border-subtle overflow-hidden',
              'max-h-[90vh] overflow-y-auto'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-neon-primary" />
                <h2 className="text-lg font-semibold text-text-primary">
                  New Event
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              {/* Title */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                  autoFocus
                  className={cn(
                    'w-full px-3 py-2 rounded-lg',
                    'bg-surface-3 border border-border-subtle',
                    'text-base text-text-primary placeholder:text-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                />
              </div>

              {/* Calendar Selector */}
              <div>
                <label className="text-xs text-text-muted mb-1 block">
                  Calendar
                </label>
                <select
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg',
                    'bg-surface-3 border border-border-subtle',
                    'text-sm text-text-primary',
                    'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                  )}
                >
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date/Time */}
              <div>
                <label className="text-xs text-text-muted mb-1 block">
                  When
                </label>
                <input
                  type={allDay ? 'date' : 'datetime-local'}
                  value={allDay ? startTime.slice(0, 10) : startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg',
                    'bg-surface-3 border border-border-subtle',
                    'text-sm text-text-primary',
                    'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                  )}
                />
              </div>

              {/* All Day Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="rounded border-border-subtle text-neon-primary focus:ring-neon-primary/50"
                />
                <span className="text-sm text-text-secondary">All day</span>
              </label>

              {/* Duration (only for timed events) */}
              {!allDay && (
                <div>
                  <label className="text-xs text-text-muted mb-1 block">
                    Duration
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_DURATIONS.slice(0, 6).map(({ label, minutes }) => (
                      <Button
                        key={minutes}
                        variant={duration === minutes ? 'default' : 'subtle'}
                        size="sm"
                        onClick={() => setDuration(minutes)}
                        className={cn(
                          'text-xs',
                          duration === minutes &&
                            'bg-neon-primary/20 text-neon-primary border-neon-primary/30'
                        )}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-error">{error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="subtle" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim()}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Event
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

QuickAddModal.displayName = 'QuickAddModal';

export default QuickAddModal;
