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
  maxItems?: number;
  todayOnly?: boolean;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * Calendar Widget v2.0
 *
 * Uses Q8 Design System with matte surfaces and reduced neon.
 */
export function CalendarWidget({
  maxItems = 5,
  todayOnly = false,
  colSpan = 2,
  rowSpan = 2,
  className,
}: CalendarWidgetProps) {
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

  const nextEvent = events?.[0];
  const isHappeningNow = nextEvent && new Date(nextEvent.start_time) <= new Date();

  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

  const rowSpanClasses: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'surface-matte p-4 flex flex-col overflow-hidden w-full',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {/* Header */}
      <div className="widget-header-title mb-4">
        <Calendar className="h-4 w-4 text-neon-primary" />
        <h3 className="text-heading text-sm">Calendar</h3>
        {events && events.length > 0 && (
          <span className="text-caption ml-auto">{events.length} upcoming</span>
        )}
      </div>

      {/* Loading State */}
      {isFetching && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-neon-primary/50 border-t-neon-primary rounded-full animate-spin mx-auto mb-2" />
            <p className="text-caption">Loading events...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isFetching && (!events || events.length === 0) && (
        <div className="empty-state">
          <Calendar className="empty-state-icon" />
          <p className="empty-state-title">
            {todayOnly ? 'No events today' : 'No upcoming events'}
          </p>
          <p className="empty-state-description">
            Your schedule is clear
          </p>
        </div>
      )}

      {/* Event List */}
      {!isFetching && events && events.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
          {events.map((event, index) => {
            const startTime = new Date(event.start_time);
            const endTime = new Date(event.end_time);
            const isNow = index === 0 && isHappeningNow;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'card-item relative overflow-hidden',
                  isNow && 'ring-1 ring-success'
                )}
              >
                {/* Color Indicator */}
                {event.color && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
                    style={{ backgroundColor: event.color }}
                  />
                )}

                <div className="pl-2">
                  {/* Time & Status */}
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3 w-3 text-text-muted" />
                    <span className="text-caption">
                      {formatTime(startTime)} - {formatTime(endTime)}
                    </span>
                    {isNow && (
                      <span className="badge badge-success text-[10px]">
                        Now
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="text-body text-sm font-medium mb-2 line-clamp-2">
                    {event.title}
                  </h4>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 text-caption">
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
                        className="flex items-center gap-1 text-neon-primary hover:text-neon-accent transition-colors focus-ring rounded"
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

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
