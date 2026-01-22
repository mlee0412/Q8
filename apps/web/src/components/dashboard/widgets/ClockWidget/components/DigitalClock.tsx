'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DigitalClockProps } from '../types';

const SIZE_CONFIG = {
  sm: {
    time: 'text-xl',
    seconds: 'text-sm',
    date: 'text-xs',
    ampm: 'text-xs',
  },
  md: {
    time: 'text-3xl',
    seconds: 'text-lg',
    date: 'text-sm',
    ampm: 'text-sm',
  },
  lg: {
    time: 'text-5xl',
    seconds: 'text-2xl',
    date: 'text-base',
    ampm: 'text-lg',
  },
  xl: {
    time: 'text-7xl',
    seconds: 'text-3xl',
    date: 'text-lg',
    ampm: 'text-xl',
  },
};

export function DigitalClock({
  time,
  format = '12h',
  showSeconds = true,
  showDate = true,
  showTimezone = false,
  timezone,
  size = 'md',
  className,
}: DigitalClockProps) {
  const config = SIZE_CONFIG[size];

  const formattedTime = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: format === '12h',
      ...(timezone && { timeZone: timezone }),
    };

    const timeStr = time.toLocaleTimeString('en-US', options);

    if (format === '12h') {
      const [timePart, ampm] = timeStr.split(' ');
      return { timePart, ampm };
    }

    return { timePart: timeStr, ampm: undefined };
  }, [time, format, timezone]);

  const seconds = useMemo(() => {
    if (!showSeconds) return null;
    return time.toLocaleTimeString('en-US', {
      second: '2-digit',
      ...(timezone && { timeZone: timezone }),
    }).split(':').pop()?.split(' ')[0];
  }, [time, showSeconds, timezone]);

  const dateStr = useMemo(() => {
    if (!showDate) return null;
    return time.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      ...(timezone && { timeZone: timezone }),
    });
  }, [time, showDate, timezone]);

  const timezoneAbbr = useMemo(() => {
    if (!showTimezone || !timezone) return null;
    return time.toLocaleTimeString('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).split(' ').pop();
  }, [time, showTimezone, timezone]);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Time Display */}
      <div className="flex items-baseline gap-1">
        <motion.span
          key={formattedTime.timePart}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          className={cn('font-mono font-bold text-text-primary tracking-tight', config.time)}
        >
          {formattedTime.timePart}
        </motion.span>

        {showSeconds && seconds && (
          <motion.span
            key={seconds}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0.7 }}
            className={cn('font-mono text-text-muted', config.seconds)}
          >
            :{seconds}
          </motion.span>
        )}

        {formattedTime.ampm && (
          <span className={cn('font-medium text-text-secondary ml-1', config.ampm)}>
            {formattedTime.ampm}
          </span>
        )}
      </div>

      {/* Date Display */}
      {dateStr && (
        <p className={cn('text-text-muted mt-1', config.date)}>
          {dateStr}
          {timezoneAbbr && (
            <span className="ml-2 text-text-subtle">({timezoneAbbr})</span>
          )}
        </p>
      )}
    </div>
  );
}

DigitalClock.displayName = 'DigitalClock';
