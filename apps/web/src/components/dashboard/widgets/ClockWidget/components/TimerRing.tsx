'use client';

import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimerRingProps } from '../types';

const SIZE_CONFIG = {
  sm: {
    container: 'w-16 h-16',
    svg: 56,
    radius: 24,
    strokeWidth: 3,
    textSize: 'text-xs',
    buttonSize: 'h-6 w-6',
    iconSize: 'h-3 w-3',
  },
  md: {
    container: 'w-24 h-24',
    svg: 96,
    radius: 40,
    strokeWidth: 4,
    textSize: 'text-lg',
    buttonSize: 'h-8 w-8',
    iconSize: 'h-4 w-4',
  },
  lg: {
    container: 'w-32 h-32',
    svg: 128,
    radius: 54,
    strokeWidth: 5,
    textSize: 'text-2xl',
    buttonSize: 'h-10 w-10',
    iconSize: 'h-5 w-5',
  },
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function TimerRing({
  progress,
  timeRemaining,
  status,
  isBreak,
  size = 'md',
  showControls = true,
  onPlay,
  onPause,
  onReset,
  onSkip,
}: TimerRingProps) {
  const config = SIZE_CONFIG[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const center = config.svg / 2;

  const ringColor = isBreak ? 'text-emerald-400' : 'text-neon-primary';
  const bgRingColor = 'text-border-subtle';

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Circular Progress Ring */}
      <div className={cn('relative', config.container)}>
        <svg
          className="w-full h-full -rotate-90"
          viewBox={`0 0 ${config.svg} ${config.svg}`}
        >
          {/* Background Ring */}
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            fill="none"
            className={bgRingColor}
          />
          {/* Progress Ring */}
          <motion.circle
            cx={center}
            cy={center}
            r={config.radius}
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            className={ringColor}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-mono font-bold text-text-primary', config.textSize)}>
            {formatTime(timeRemaining)}
          </span>
          {size !== 'sm' && (
            <span className="text-[10px] text-text-muted uppercase tracking-wide">
              {isBreak ? 'Break' : status === 'running' ? 'Focus' : status}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-1">
          {status === 'running' ? (
            <button
              className={cn('btn-icon focus-ring', config.buttonSize)}
              onClick={onPause}
              aria-label="Pause timer"
            >
              <Pause className={config.iconSize} />
            </button>
          ) : (
            <button
              className={cn('btn-icon focus-ring', config.buttonSize)}
              onClick={onPlay}
              aria-label="Start timer"
            >
              <Play className={config.iconSize} />
            </button>
          )}
          <button
            className={cn('btn-icon focus-ring', config.buttonSize)}
            onClick={onReset}
            aria-label="Reset timer"
          >
            <RotateCcw className={config.iconSize} />
          </button>
          {onSkip && (
            <button
              className={cn('btn-icon focus-ring', config.buttonSize)}
              onClick={onSkip}
              aria-label="Skip to next phase"
            >
              <SkipForward className={config.iconSize} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

TimerRing.displayName = 'TimerRing';
