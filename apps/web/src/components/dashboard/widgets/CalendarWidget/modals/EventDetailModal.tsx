'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  MapPin,
  Video,
  Users,
  Edit2,
  Trash2,
  ExternalLink,
  Calendar,
  Bell,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarBadge } from '../components/CalendarBadge';
import { useCalendarStore } from '@/lib/stores/calendar';
import type { EventDetailModalProps, CalendarEvent } from '../types';

/**
 * Format event date range
 */
function formatDateRange(event: CalendarEvent): string {
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  if (event.all_day) {
    return start.toLocaleDateString('en-US', dateOptions);
  }

  const startDate = start.toLocaleDateString('en-US', dateOptions);
  const startTime = start.toLocaleTimeString('en-US', timeOptions);
  const endTime = end.toLocaleTimeString('en-US', timeOptions);

  return `${startDate}\n${startTime} - ${endTime}`;
}

/**
 * EventDetailModal - Full event details view
 *
 * Shows complete event information with edit/delete actions.
 */
export const EventDetailModal = memo(function EventDetailModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
}: EventDetailModalProps) {
  const { calendars } = useCalendarStore();

  if (!event) return null;

  const calendar = calendars.find((c) => c.id === event.google_calendar_id);

  const handleCopyLocation = () => {
    if (event.location) {
      navigator.clipboard.writeText(event.location);
    }
  };

  const handleJoinMeeting = () => {
    if (event.meeting_url) {
      window.open(event.meeting_url, '_blank');
    }
  };

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
              'w-auto md:w-full max-w-md',
              'bg-surface-2 rounded-2xl shadow-2xl',
              'border border-border-subtle overflow-hidden',
              'max-h-[90vh] overflow-y-auto'
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
            <div className="flex items-start justify-between p-4 pb-0">
              <div className="flex-1 pr-8">
                <h2 className="text-lg font-semibold text-text-primary">
                  {event.title}
                </h2>
                {calendar && (
                  <div className="mt-1">
                    <CalendarBadge calendar={calendar} size="sm" />
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 absolute top-3 right-3"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Date/Time */}
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-text-muted mt-0.5 flex-shrink-0" />
                <div className="text-sm text-text-secondary whitespace-pre-line">
                  {formatDateRange(event)}
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-text-muted mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-secondary break-words">
                      {event.location}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyLocation}
                      className="h-6 px-2 mt-1 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy address
                    </Button>
                  </div>
                </div>
              )}

              {/* Meeting Link */}
              {event.meeting_url && (
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-neon-primary flex-shrink-0" />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleJoinMeeting}
                    className="bg-neon-primary/20 hover:bg-neon-primary/30 text-neon-primary"
                  >
                    Join Meeting
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              )}

              {/* Attendees */}
              {event.attendees && event.attendees.length > 0 && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-text-muted mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-text-secondary mb-2">
                      {event.attendees.length} attendees
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {event.attendees.map((attendee, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-text-muted"
                        >
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              attendee.responseStatus === 'accepted' && 'bg-success',
                              attendee.responseStatus === 'declined' && 'bg-error',
                              attendee.responseStatus === 'tentative' && 'bg-warning',
                              attendee.responseStatus === 'needsAction' && 'bg-text-muted'
                            )}
                          />
                          <span className="truncate">
                            {attendee.displayName || attendee.email}
                          </span>
                          {attendee.organizer && (
                            <span className="text-neon-primary">(Organizer)</span>
                          )}
                        </div>
                      ))}
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

              {/* Reminders */}
              {event.reminders && event.reminders.length > 0 && (
                <div className="flex items-center gap-3 pt-2 border-t border-border-subtle">
                  <Bell className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <div className="flex flex-wrap gap-2">
                    {event.reminders.map((reminder, i) => (
                      <span
                        key={i}
                        className="text-xs text-text-muted bg-surface-3 px-2 py-0.5 rounded"
                      >
                        {reminder.minutes} min before
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-4 pt-2 border-t border-border-subtle">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(event.google_event_id)}
                className="text-error hover:text-error hover:bg-error/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="subtle" size="sm" onClick={onClose}>
                  Close
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onEdit(event)}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

EventDetailModal.displayName = 'EventDetailModal';

export default EventDetailModal;
