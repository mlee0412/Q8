'use client';

import { motion } from 'framer-motion';
import { Sun, Moon, Sunrise, Sunset, Pin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorldClockCardProps, TimeOfDay } from '../types';

const TIME_OF_DAY_ICONS: Record<TimeOfDay, typeof Sun> = {
  day: Sun,
  night: Moon,
  dawn: Sunrise,
  dusk: Sunset,
};

const TIME_OF_DAY_COLORS: Record<TimeOfDay, string> = {
  day: 'text-amber-400',
  night: 'text-indigo-400',
  dawn: 'text-orange-400',
  dusk: 'text-purple-400',
};

export function WorldClockCard({
  timezone,
  isCompact = false,
  showOffset = true,
  showDate = true,
  onRemove,
  onPin,
}: WorldClockCardProps) {
  const Icon = TIME_OF_DAY_ICONS[timezone.timeOfDay];
  const iconColor = TIME_OF_DAY_COLORS[timezone.timeOfDay];

  if (isCompact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        className="list-row px-3 py-1.5 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('h-3.5 w-3.5', iconColor)} />
          <span className="text-label text-xs">{timezone.city}</span>
        </div>
        <span className="text-base font-mono font-semibold text-text-primary">
          {timezone.formattedTime}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'card-item p-3 relative group',
        timezone.isPinned && 'ring-1 ring-neon-primary/30'
      )}
    >
      {/* Actions */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onPin && (
          <button
            onClick={() => onPin(timezone.id)}
            className={cn(
              'btn-icon btn-icon-xs focus-ring',
              timezone.isPinned && 'text-neon-primary'
            )}
            aria-label={timezone.isPinned ? 'Unpin timezone' : 'Pin timezone'}
          >
            <Pin className="h-3 w-3" />
          </button>
        )}
        {onRemove && !timezone.isPinned && (
          <button
            onClick={() => onRemove(timezone.id)}
            className="btn-icon btn-icon-xs focus-ring text-text-muted hover:text-error"
            aria-label="Remove timezone"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-4 w-4', iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {timezone.city}
          </p>
          <p className="text-xs text-text-muted truncate">
            {timezone.country}
            {timezone.label && ` · ${timezone.label}`}
          </p>
        </div>
      </div>

      {/* Time Display */}
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-mono font-bold text-text-primary">
          {timezone.formattedTime}
        </span>
        {showOffset && (
          <span className="text-xs text-text-muted">{timezone.offset}</span>
        )}
      </div>

      {/* Date */}
      {showDate && (
        <p className="text-xs text-text-muted mt-1">
          {timezone.formattedDate}
          {timezone.isDST && (
            <span className="ml-1 text-warning">(DST)</span>
          )}
        </p>
      )}
    </motion.div>
  );
}

WorldClockCard.displayName = 'WorldClockCard';
