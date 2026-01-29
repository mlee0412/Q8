'use client';

import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Clock,
  MapPin,
  Video,
  Users,
  Edit2,
  Trash2,
  Save,
  ExternalLink,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarBadge } from '../components/CalendarBadge';
import { useCalendarStore } from '@/lib/stores/calendar';
import { QUICK_DURATIONS, DEFAULT_REMINDERS } from '../constants';
import type { EventDetailPanelProps, CalendarEventInput } from '../types';

/**
 * EventDetailPanel - Side panel for viewing/editing events
 *
 * Slide-in panel showing full event details with edit mode.
 */
export const EventDetailPanel = memo(function EventDetailPanel({
  event,
  isEditing,
  onClose,
  onEdit,
  onSave,
  onDelete,
  onCancelEdit,
}: EventDetailPanelProps) {
  const { calendars } = useCalendarStore();

  // Form state for editing
  const [formData, setFormData] = useState<CalendarEventInput>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false,
    location: '',
    calendar_id: '',
    reminders: DEFAULT_REMINDERS,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form when event changes or edit mode starts
  useEffect(() => {
    if (event && isEditing) {
      setFormData({
        title: event.title,
        description: event.description || '',
        start_time: event.start_time.slice(0, 16),
        end_time: event.end_time.slice(0, 16),
        all_day: event.all_day,
        location: event.location || '',
        calendar_id: event.google_calendar_id,
        reminders: event.reminders || DEFAULT_REMINDERS,
      });
    }
  }, [event, isEditing]);

  if (!event) return null;

  const calendar = calendars.find((c) => c.id === event.google_calendar_id);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'fixed right-0 top-0 bottom-0 z-40',
        'w-full md:w-80',
        'bg-surface-2 md:border-l border-border-subtle',
        'flex flex-col shadow-2xl'
      )}
    >
      {/* Color accent */}
      <div
        className="h-2"
        style={{
          backgroundColor: calendar?.backgroundColor || event.color || '#039be5',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        <h3 className="text-sm font-semibold text-text-primary">
          {isEditing ? 'Edit Event' : 'Event Details'}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isEditing ? (
          <>
            {/* Edit Form */}
            <div>
              <label className="text-xs text-text-muted mb-1 block">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className={cn(
                  'w-full px-3 py-2 rounded-lg',
                  'bg-surface-3 border border-border-subtle',
                  'text-sm text-text-primary',
                  'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-text-muted mb-1 block">
                  Start
                </label>
                <input
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  value={formData.all_day ? formData.start_time.slice(0, 10) : formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  className={cn(
                    'w-full px-2 py-1.5 rounded',
                    'bg-surface-3 border border-border-subtle',
                    'text-xs text-text-primary',
                    'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                  )}
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">End</label>
                <input
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  value={formData.all_day ? formData.end_time.slice(0, 10) : formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  className={cn(
                    'w-full px-2 py-1.5 rounded',
                    'bg-surface-3 border border-border-subtle',
                    'text-xs text-text-primary',
                    'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                  )}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.all_day}
                onChange={(e) =>
                  setFormData({ ...formData, all_day: e.target.checked })
                }
                className="rounded border-border-subtle text-neon-primary focus:ring-neon-primary/50"
              />
              <span className="text-sm text-text-secondary">All day</span>
            </label>

            <div>
              <label className="text-xs text-text-muted mb-1 block">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className={cn(
                  'w-full px-3 py-2 rounded-lg',
                  'bg-surface-3 border border-border-subtle',
                  'text-sm text-text-primary',
                  'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                )}
              />
            </div>

            <div>
              <label className="text-xs text-text-muted mb-1 block">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className={cn(
                  'w-full px-3 py-2 rounded-lg resize-none',
                  'bg-surface-3 border border-border-subtle',
                  'text-sm text-text-primary',
                  'focus:outline-none focus:ring-2 focus:ring-neon-primary/50'
                )}
              />
            </div>
          </>
        ) : (
          <>
            {/* View Mode */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-1">
                {event.title}
              </h2>
              {calendar && (
                <CalendarBadge calendar={calendar} size="sm" />
              )}
            </div>

            {/* Time */}
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-text-muted mt-0.5" />
              <div className="text-sm text-text-secondary">
                <div>
                  {new Date(event.start_time).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                {!event.all_day && (
                  <div className="text-text-muted">
                    {new Date(event.start_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(event.end_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-text-muted mt-0.5" />
                <span className="text-sm text-text-secondary">
                  {event.location}
                </span>
              </div>
            )}

            {/* Meeting Link */}
            {event.meeting_url && (
              <div className="flex items-center gap-3">
                <Video className="h-4 w-4 text-neon-primary" />
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.open(event.meeting_url, '_blank')}
                  className="bg-neon-primary/20 hover:bg-neon-primary/30 text-neon-primary"
                >
                  Join Meeting
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}

            {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-text-muted mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-text-secondary mb-1">
                    {event.attendees.length} attendees
                  </div>
                  <div className="space-y-1 text-xs text-text-muted">
                    {event.attendees.slice(0, 5).map((a, i) => (
                      <div key={i} className="truncate">
                        {a.displayName || a.email}
                      </div>
                    ))}
                    {event.attendees.length > 5 && (
                      <div>+{event.attendees.length - 5} more</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="pt-2 border-t border-border-subtle">
                <p className="text-sm text-text-secondary whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border-subtle space-y-2">
        {isEditing ? (
          <>
            <div className="flex gap-2">
              <Button
                variant="subtle"
                size="sm"
                onClick={onCancelEdit}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <div className="h-3 w-3 border-2 border-white/50 border-t-white rounded-full animate-spin mr-1" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </>
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full text-error hover:text-error hover:bg-error/10"
            >
              {isDeleting ? (
                <>
                  <div className="h-3 w-3 border-2 border-error/50 border-t-error rounded-full animate-spin mr-1" />
                  Deleting
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete Event
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-error hover:text-error hover:bg-error/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onEdit}
              className="flex-1"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

EventDetailPanel.displayName = 'EventDetailPanel';

export default EventDetailPanel;
