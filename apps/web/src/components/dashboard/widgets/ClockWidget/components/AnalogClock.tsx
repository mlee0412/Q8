'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AnalogClockProps } from '../types';

const SIZE_CONFIG = {
  sm: { size: 64, hourHand: 16, minuteHand: 22, secondHand: 24, hourWidth: 3, minuteWidth: 2, secondWidth: 1 },
  md: { size: 96, hourHand: 24, minuteHand: 34, secondHand: 38, hourWidth: 4, minuteWidth: 3, secondWidth: 1.5 },
  lg: { size: 128, hourHand: 32, minuteHand: 46, secondHand: 50, hourWidth: 5, minuteWidth: 3, secondWidth: 2 },
  xl: { size: 192, hourHand: 48, minuteHand: 70, secondHand: 76, hourWidth: 6, minuteWidth: 4, secondWidth: 2 },
};

const THEME_CONFIG = {
  light: {
    face: 'bg-white',
    border: 'border-gray-200',
    hourHand: 'bg-gray-800',
    minuteHand: 'bg-gray-600',
    secondHand: 'bg-red-500',
    center: 'bg-gray-800',
    marks: 'bg-gray-300',
    numbers: 'text-gray-700',
  },
  dark: {
    face: 'bg-surface-3',
    border: 'border-border-subtle',
    hourHand: 'bg-text-primary',
    minuteHand: 'bg-text-secondary',
    secondHand: 'bg-neon-primary',
    center: 'bg-text-primary',
    marks: 'bg-border-subtle',
    numbers: 'text-text-muted',
  },
  neon: {
    face: 'bg-black/50',
    border: 'border-neon-primary/30',
    hourHand: 'bg-neon-primary',
    minuteHand: 'bg-purple-400',
    secondHand: 'bg-cyan-400',
    center: 'bg-neon-primary',
    marks: 'bg-neon-primary/20',
    numbers: 'text-neon-primary/70',
  },
};

export function AnalogClock({
  time,
  size = 'md',
  showSeconds = true,
  showNumbers = false,
  theme = 'dark',
  className,
}: AnalogClockProps) {
  const config = SIZE_CONFIG[size];
  const colors = THEME_CONFIG[theme];
  const center = config.size / 2;

  const angles = useMemo(() => {
    const hours = time.getHours() % 12;
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    return {
      hour: (hours * 30) + (minutes * 0.5), // 360/12 = 30 degrees per hour + minute adjustment
      minute: (minutes * 6) + (seconds * 0.1), // 360/60 = 6 degrees per minute
      second: seconds * 6, // 360/60 = 6 degrees per second
    };
  }, [time]);

  const hourMarks = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = i * 30 - 90; // Start from 12 o'clock
      const radian = (angle * Math.PI) / 180;
      const outerRadius = center - 4;
      const innerRadius = i % 3 === 0 ? center - 12 : center - 8;

      return {
        x1: center + innerRadius * Math.cos(radian),
        y1: center + innerRadius * Math.sin(radian),
        x2: center + outerRadius * Math.cos(radian),
        y2: center + outerRadius * Math.sin(radian),
        isHour: i % 3 === 0,
        number: i === 0 ? 12 : i,
        numberX: center + (center - 20) * Math.cos(radian),
        numberY: center + (center - 20) * Math.sin(radian),
      };
    });
  }, [center]);

  return (
    <div
      className={cn(
        'relative rounded-full border-2 shadow-lg',
        colors.face,
        colors.border,
        className
      )}
      style={{ width: config.size, height: config.size }}
    >
      {/* Hour Marks */}
      <svg className="absolute inset-0 w-full h-full">
        {hourMarks.map((mark, i) => (
          <line
            key={i}
            x1={mark.x1}
            y1={mark.y1}
            x2={mark.x2}
            y2={mark.y2}
            stroke="currentColor"
            strokeWidth={mark.isHour ? 2 : 1}
            className={colors.marks}
          />
        ))}
      </svg>

      {/* Numbers */}
      {showNumbers && (
        <svg className="absolute inset-0 w-full h-full">
          {hourMarks.filter(m => m.isHour).map((mark) => (
            <text
              key={mark.number}
              x={mark.numberX}
              y={mark.numberY}
              textAnchor="middle"
              dominantBaseline="middle"
              className={cn('font-mono text-xs', colors.numbers)}
              fill="currentColor"
            >
              {mark.number}
            </text>
          ))}
        </svg>
      )}

      {/* Hour Hand */}
      <motion.div
        className={cn('absolute rounded-full origin-bottom', colors.hourHand)}
        style={{
          width: config.hourWidth,
          height: config.hourHand,
          left: center - config.hourWidth / 2,
          bottom: center,
        }}
        animate={{ rotate: angles.hour }}
        transition={{ type: 'spring', stiffness: 50, damping: 15 }}
      />

      {/* Minute Hand */}
      <motion.div
        className={cn('absolute rounded-full origin-bottom', colors.minuteHand)}
        style={{
          width: config.minuteWidth,
          height: config.minuteHand,
          left: center - config.minuteWidth / 2,
          bottom: center,
        }}
        animate={{ rotate: angles.minute }}
        transition={{ type: 'spring', stiffness: 50, damping: 15 }}
      />

      {/* Second Hand */}
      {showSeconds && (
        <motion.div
          className={cn('absolute rounded-full origin-bottom', colors.secondHand)}
          style={{
            width: config.secondWidth,
            height: config.secondHand,
            left: center - config.secondWidth / 2,
            bottom: center,
          }}
          animate={{ rotate: angles.second }}
          transition={{ type: 'tween', ease: 'linear', duration: 0 }}
        />
      )}

      {/* Center Dot */}
      <div
        className={cn('absolute rounded-full', colors.center)}
        style={{
          width: config.hourWidth + 4,
          height: config.hourWidth + 4,
          left: center - (config.hourWidth + 4) / 2,
          top: center - (config.hourWidth + 4) / 2,
        }}
      />
    </div>
  );
}

AnalogClock.displayName = 'AnalogClock';
