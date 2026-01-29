'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Plus, Bell, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarBadge } from '../components/CalendarBadge';
import { QUICK_DURATIONS, DEFAULT_REMINDERS, REMINDER_PRESETS } from '../constants';
import type { CreateEventFormProps, CalendarEventInput, GoogleCalendar } from '../types';

/**
 * CreateEventForm - Full event creation form
 *
 * Comprehensive form for creating new calendar events.
 */
export const CreateEventForm = memo(function CreateEventForm({
  isOpen,
  onClose,
  defaultDate,
  defaultHour,
  calendars,
  onSave,
}: CreateEventFormProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      const date = defaultDate || new Date();
      const hour = defaultHour ?? date.getHours();

      // Round to nearest 15 minutes
      const startMinutes = Math.ceil(date.getMinutes() / 15) * 15;
      const start = new Date(date);
      start.setHours(hour, startMinutes, 0, 0);

      const end = new Date(start);
      end.setHours(end.getHours() + 1);

      setTitle('');
      setDescription('');
      setStartDate(start.toISOString().slice(0, 10));
      setStartTime(start.toISOString().slice(11, 16));
      setEndDate(end.toISOString().slice(0, 10));
      setEndTime(end.toISOString().slice(11, 16));
      setAllDay(false);
      setLocation('');
      setReminderMinutes(10);
      setError(null);

      // Set default calendar
      if (calendars.length > 0) {
        const primary = calendars.find((c) => c.primary);
        const firstCalendar = calendars[0];
        setCalendarId(primary?.id ?? firstCalendar?.id ?? '');
      }
    }
  }, [isOpen, defaultDate, defaultHour, calendars]);

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
      const startDateTime = allDay
        ? startDate
        : `${startDate}T${startTime}:00`;
      const endDateTime = allDay ? endDate : `${endDate}T${endTime}:00`;

      const eventData: CalendarEventInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startDateTime,
        end_time: endDateTime,
        all_day: allDay,
        location: location.trim() || undefined,
        calendar_id: calendarId,
        reminders: [{ method: 'popup', minutes: reminderMinutes }],
      };

      await onSave(eventData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    title,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    allDay,
    location,
    calendarId,
    reminderMinutes,
    onSave,
    onClose,
  ]);

  const handleDurationClick = (minutes: number) => {
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + minutes);
    setEndDate(end.toISOString().slice(0, 10));
    setEndTime(end.toISOString().slice(11, 16));
  };

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
              'w-auto md:w-full max-w-lg',
              'bg-surface-2 rounded-2xl shadow-2xl',
              'border border-border-subtle overflow-hidden',
              'max-h-[90vh] overflow-y-auto'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-neon-primary" />
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
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Add title"
                  autoFocus
                  className={cn(
                    'w-full px-3 py-3 rounded-lg',
                    'bg-surface-3 border border-border-subtle',
                    'text-lg text-text-primary placeholder:text-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                  )}
                />
              </div>

              {/* Calendar Selector */}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-text-muted" />
                <select
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg',
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
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">
                    {allDay ? 'Date' : 'Date & Time'}
                  </span>
                </div>

                <div className="pl-7 space-y-3">
                  {/* All day toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allDay}
                      onChange={(e) => setAllDay(e.target.checked)}
                      className="rounded border-border-subtle text-neon-primary focus:ring-neon-primary/50"
                    />
                    <span className="text-sm text-text-secondary">All day</span>
                  </label>

                  {/* Start */}
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg',
                        'bg-surface-3 border border-border-subtle',
                        'text-sm text-text-primary',
                        'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                      )}
                    />
                    {!allDay && (
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className={cn(
                          'w-32 px-3 py-2 rounded-lg',
                          'bg-surface-3 border border-border-subtle',
                          'text-sm text-text-primary',
                          'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                        )}
                      />
                    )}
                  </div>

                  {/* End */}
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg',
                        'bg-surface-3 border border-border-subtle',
                        'text-sm text-text-primary',
                        'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                      )}
                    />
                    {!allDay && (
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className={cn(
                          'w-32 px-3 py-2 rounded-lg',
                          'bg-surface-3 border border-border-subtle',
                          'text-sm text-text-primary',
                          'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                        )}
                      />
                    )}
                  </div>

                  {/* Quick durations */}
                  {!allDay && (
                    <div className="flex flex-wrap gap-1">
                      {QUICK_DURATIONS.slice(0, 5).map(({ label, minutes }) => (
                        <Button
                          key={minutes}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDurationClick(minutes)}
                          className="text-xs h-6 px-2"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-text-muted mt-2.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location"
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg',
                    'bg-surface-3 border border-border-subtle',
                    'text-sm text-text-primary placeholder:text-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                  )}
                />
              </div>

              {/* Reminder */}
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-text-muted" />
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg',
                    'bg-surface-3 border border-border-subtle',
                    'text-sm text-text-primary',
                    'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                  )}
                >
                  {REMINDER_PRESETS.map(({ label, minutes }) => (
                    <option key={minutes} value={minutes}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add description"
                  rows={3}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg resize-none',
                    'bg-surface-3 border border-border-subtle',
                    'text-sm text-text-primary placeholder:text-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                  )}
                />
              </div>

              {/* Error */}
              {error && <p className="text-sm text-error">{error}</p>}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 p-4 border-t border-border-subtle">
              <Button variant="subtle" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="default"
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

CreateEventForm.displayName = 'CreateEventForm';

export default CreateEventForm;
