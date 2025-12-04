'use client';

import { useRxQuery } from '@/hooks/useRxDB';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  meeting_url?: string;
  attendees_count?: number;
  color?: string;
  calendar_name: string;
}

interface CalendarWidgetProps {
  /**
   * Maximum number of events to display
   * @default 5
   */
  maxItems?: number;

  /**
   * Show only today's events
   * @default false
   */
  todayOnly?: boolean;

  /**
   * Bento grid column span
   * @default 2
   */
  colSpan?: 1 | 2 | 3 | 4;

  /**
   * Bento grid row span
   * @default 2
   */
  rowSpan?: 1 | 2 | 3 | 4;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Google Calendar Widget
 *
 * Displays upcoming events from Google Calendar with time indicators,
 * meeting links, and quick actions.
 *
 * Features:
 * - Real-time event tracking
 * - "Happening now" indicator
 * - Meeting link integration
 * - Location and attendee display
 * - Color-coded calendar events
 *
 * @example
 * ```tsx
 * // All upcoming events
 * <CalendarWidget />
 *
 * // Today only
 * <CalendarWidget todayOnly maxItems={10} />
 *
 * // Custom sizing
 * <CalendarWidget colSpan={2} rowSpan={3} />
 * ```
 */
export function CalendarWidget({
  maxItems = 5,
  todayOnly = false,
  colSpan = 2,
  rowSpan = 2,
  className,
}: CalendarWidgetProps) {
  // Fetch events from RxDB
  const { data: events, isLoading: isFetching } = useRxQuery<CalendarEvent>(
    'calendar_events',
    (collection) => {
      const now = new Date().toISOString();
      let query = collection.find().where('start_time').gte(now);

      if (todayOnly) {
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        query = query.where('start_time').lte(endOfDay.toISOString());
      }

      return query.limit(maxItems).sort({ start_time: 'asc' });
    }
  );

  // Get next event (happening now or soon)
  const nextEvent = events?.[0];
  const isHappeningNow = nextEvent && new Date(nextEvent.start_time) <= new Date();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
      className={cn(
        'glass-panel rounded-xl p-6 flex flex-col overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-neon-primary" />
          <h3 className="font-semibold">Calendar</h3>
        </div>
        {events && events.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {events.length} upcoming
          </span>
        )}
      </div>

      {/* Loading State */}
      {isFetching && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-neon-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading events...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isFetching && (!events || events.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {todayOnly ? 'No events today' : 'No upcoming events'}
            </p>
          </div>
        </div>
      )}

      {/* Event List */}
      {!isFetching && events && events.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {events.map((event, index) => {
            const startTime = new Date(event.start_time);
            const endTime = new Date(event.end_time);
            const isNow = index === 0 && isHappeningNow;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'glass-panel p-3 rounded-lg relative overflow-hidden',
                  isNow && 'ring-2 ring-neon-accent'
                )}
              >
                {/* Color Indicator */}
                {event.color && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: event.color }}
                  />
                )}

                <div className="pl-2">
                  {/* Time & Status */}
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatTime(startTime)} - {formatTime(endTime)}
                    </span>
                    {isNow && (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-xs font-medium text-neon-accent"
                      >
                        Happening now
                      </motion.span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-medium mb-2 line-clamp-2">
                    {event.title}
                  </h4>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{event.location}</span>
                      </div>
                    )}

                    {event.attendees_count && event.attendees_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{event.attendees_count}</span>
                      </div>
                    )}

                    {event.meeting_url && (
                      <a
                        href={event.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-neon-primary hover:text-neon-accent transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Video className="h-3 w-3" />
                        <span>Join</span>
                        <ExternalLink className="h-2 w-2" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

CalendarWidget.displayName = 'CalendarWidget';

// Helper: Format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
