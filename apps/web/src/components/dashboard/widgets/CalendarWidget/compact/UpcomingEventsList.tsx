'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EventCard } from '../components/EventCard';
import type { UpcomingEventsListProps } from '../types';

/**
 * UpcomingEventsList - Scrollable list of upcoming events
 *
 * Compact list view for the widget's main display.
 */
export const UpcomingEventsList = memo(function UpcomingEventsList({
  events,
  maxItems = 5,
  onEventClick,
  onViewAll,
}: UpcomingEventsListProps) {
  const displayEvents = events.slice(0, maxItems);
  const hasMore = events.length > maxItems;

  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-caption text-text-muted">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Event List */}
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {displayEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: index * 0.05 }}
            >
              <EventCard
                event={event}
                isCompact
                showDate={!event.isToday}
                onClick={onEventClick}
                onJoinMeeting={(url) => window.open(url, '_blank')}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* View All Button */}
      {hasMore && (
        <div className="pt-2 border-t border-border-subtle mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="w-full justify-between text-text-muted hover:text-text-primary"
          >
            <span>View all {events.length} events</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

UpcomingEventsList.displayName = 'UpcomingEventsList';

export default UpcomingEventsList;
