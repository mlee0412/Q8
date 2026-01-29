'use client';

import { memo } from 'react';
import {
  CalendarDays,
  CalendarRange,
  CalendarClock,
  ListTodo,
  Plus,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MiniCalendar } from '../components/MiniCalendar';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import type { CalendarSidebarProps, CalendarView } from '../types';

const VIEW_ICONS: Record<CalendarView, typeof CalendarDays> = {
  month: CalendarDays,
  week: CalendarRange,
  day: CalendarClock,
  agenda: ListTodo,
};

const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Month',
  week: 'Week',
  day: 'Day',
  agenda: 'Agenda',
};

/**
 * CalendarSidebar - Left navigation for expanded view
 *
 * Contains view switcher, mini calendar, and calendar list.
 */
export const CalendarSidebar = memo(function CalendarSidebar({
  currentView,
  onViewChange,
  selectedDate,
  onDateSelect,
  calendars,
  selectedCalendarIds,
  onCalendarToggle,
  onAddEvent,
}: CalendarSidebarProps) {
  const { events } = useCalendarEvents();

  return (
    <div className="hidden md:flex w-64 h-full border-r border-border-subtle bg-surface-2/50 flex-col">
      {/* Add Event Button */}
      <div className="p-4">
        <Button
          variant="default"
          onClick={onAddEvent}
          className="w-full bg-neon-primary/20 hover:bg-neon-primary/30 text-neon-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* Mini Calendar */}
      <div className="px-4 pb-4">
        <MiniCalendar
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          events={events}
          highlightToday
          showNavigation
        />
      </div>

      {/* View Switcher */}
      <div className="px-4 pb-4">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          View
        </h3>
        <div className="space-y-1">
          {(Object.keys(VIEW_ICONS) as CalendarView[]).map((view) => {
            const Icon = VIEW_ICONS[view];
            const isActive = currentView === view;

            return (
              <button
                key={view}
                onClick={() => onViewChange(view)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  'text-sm',
                  isActive
                    ? 'bg-neon-primary/20 text-neon-primary'
                    : 'text-text-secondary hover:bg-surface-4 hover:text-text-primary'
                )}
              >
                <Icon className="h-4 w-4" />
                {VIEW_LABELS[view]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          My Calendars
        </h3>
        <div className="space-y-1">
          {calendars.map((calendar, index) => {
            const isSelected = selectedCalendarIds.includes(calendar.id);

            return (
              <button
                key={`${calendar.googleAccountId ?? ''}:${calendar.id}:${index}`}
                onClick={() => onCalendarToggle(calendar.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors',
                  'text-sm text-left',
                  'hover:bg-surface-4'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0'
                  )}
                  style={{
                    borderColor: calendar.backgroundColor,
                    backgroundColor: isSelected
                      ? calendar.backgroundColor
                      : 'transparent',
                  }}
                >
                  {isSelected && (
                    <Check
                      className="h-3 w-3"
                      style={{ color: calendar.foregroundColor }}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'truncate',
                    isSelected ? 'text-text-primary' : 'text-text-muted'
                  )}
                >
                  {calendar.summary}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

CalendarSidebar.displayName = 'CalendarSidebar';

export default CalendarSidebar;
