'use client';

import { motion } from 'framer-motion';
import type { TimerDisplayProps } from '../types';

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function TimerDisplay({ elapsedTime, progressPercent }: TimerDisplayProps) {
  return (
    <div className="relative w-16 h-16 mb-2">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-border-subtle"
        />
        <motion.circle
          cx="32"
          cy="32"
          r="28"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          className="text-neon-primary"
          strokeDasharray={175.93}
          strokeDashoffset={175.93 - (progressPercent / 100) * 175.93}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-mono font-bold text-text-primary">
          {formatTime(elapsedTime)}
        </span>
      </div>
    </div>
  );
}
