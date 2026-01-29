'use client';

import { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarBadge } from '../components/CalendarBadge';
import type { CalendarSelectorProps } from '../types';

/**
 * CalendarSelector - Multi-calendar checkbox list
 *
 * Allows selecting which calendars to display.
 */
export const CalendarSelector = memo(function CalendarSelector({
  calendars,
  selectedIds,
  onToggle,
}: CalendarSelectorProps) {
  return (
    <div className="space-y-1">
      {calendars.map((calendar, index) => {
        const isSelected = selectedIds.includes(calendar.id);

        return (
          <button
            key={`${calendar.googleAccountId ?? ''}:${calendar.id}:${index}`}
            type="button"
            onClick={() => onToggle(calendar.id)}
            className={cn(
              'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
              'hover:bg-surface-4',
              isSelected && 'bg-surface-3'
            )}
          >
            {/* Checkbox */}
            <div
              className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                isSelected
                  ? 'border-neon-primary bg-neon-primary/20'
                  : 'border-border-subtle'
              )}
            >
              {isSelected && (
                <Check className="h-3 w-3 text-neon-primary" />
              )}
            </div>

            {/* Calendar Info */}
            <div className="flex-1 text-left">
              <CalendarBadge calendar={calendar} size="md" />
            </div>

            {/* Primary Badge */}
            {calendar.primary && (
              <span className="text-[10px] text-neon-primary font-medium px-1.5 py-0.5 rounded bg-neon-primary/10">
                Primary
              </span>
            )}

            {/* Access Role */}
            {calendar.accessRole !== 'owner' && (
              <span className="text-[10px] text-text-muted capitalize">
                {calendar.accessRole}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

CalendarSelector.displayName = 'CalendarSelector';

export default CalendarSelector;
