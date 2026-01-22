'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AlarmBadgeProps } from '../types';
import { DAY_NAMES } from '../constants';

function formatNextTrigger(date: Date | null): string {
  if (!date) return 'Not scheduled';

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `in ${diffMins}m`;
  if (diffHours < 24) return `in ${diffHours}h ${diffMins % 60}m`;
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getRepeatLabel(repeat: string, customDays?: number[]): string {
  switch (repeat) {
    case 'once':
      return 'Once';
    case 'daily':
      return 'Daily';
    case 'weekdays':
      return 'Weekdays';
    case 'weekends':
      return 'Weekends';
    case 'custom':
      if (customDays && customDays.length > 0) {
        return customDays.map((d) => DAY_NAMES[d]).join(', ');
      }
      return 'Custom';
    default:
      return repeat;
  }
}

export function AlarmBadge({
  alarm,
  nextTrigger,
  isCompact = false,
}: AlarmBadgeProps) {
  const repeatLabel = useMemo(
    () => getRepeatLabel(alarm.repeat, alarm.customDays),
    [alarm.repeat, alarm.customDays]
  );

  const nextTriggerLabel = useMemo(
    () => formatNextTrigger(nextTrigger),
    [nextTrigger]
  );

  if (isCompact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-lg',
          alarm.enabled ? 'bg-surface-4' : 'bg-surface-4/50 opacity-50'
        )}
      >
        {alarm.enabled ? (
          <Bell className="h-3 w-3 text-neon-primary" />
        ) : (
          <BellOff className="h-3 w-3 text-text-muted" />
        )}
        <span className="text-xs font-mono font-medium text-text-primary">
          {alarm.time}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'list-row px-3 py-2',
        !alarm.enabled && 'opacity-50'
      )}
    >
      {/* Left: Icon & Time */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'p-2 rounded-lg',
            alarm.enabled ? 'bg-neon-primary/10' : 'bg-surface-4'
          )}
        >
          {alarm.enabled ? (
            <Bell className="h-4 w-4 text-neon-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-text-muted" />
          )}
        </div>
        <div>
          <p className="text-lg font-mono font-bold text-text-primary">
            {alarm.time}
          </p>
          <p className="text-xs text-text-muted">{alarm.label || 'Alarm'}</p>
        </div>
      </div>

      {/* Right: Repeat & Next */}
      <div className="text-right">
        <div className="flex items-center gap-1 justify-end">
          {alarm.repeat !== 'once' && (
            <Repeat className="h-3 w-3 text-text-muted" />
          )}
          <span className="text-xs text-text-muted">{repeatLabel}</span>
        </div>
        {alarm.enabled && (
          <p className="text-xs text-text-secondary mt-0.5">
            {nextTriggerLabel}
          </p>
        )}
      </div>
    </motion.div>
  );
}

AlarmBadge.displayName = 'AlarmBadge';
