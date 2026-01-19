'use client';

import { motion } from 'framer-motion';
import { Sunrise, Sunset, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSunPosition } from '../utils';
import type { SunriseSunsetProps } from '../types';

export function SunriseSunset({ sunrise, sunset }: SunriseSunsetProps) {
  const { progress, isDay } = getSunPosition(sunrise, sunset);

  return (
    <div className="card-item p-3 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sunrise className="h-4 w-4 text-amber-400" />
          <div>
            <p className="text-caption text-text-muted">Sunrise</p>
            <p className="text-label font-medium">{sunrise}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-caption text-text-muted">Sunset</p>
            <p className="text-label font-medium">{sunset}</p>
          </div>
          <Sunset className="h-4 w-4 text-orange-400" />
        </div>
      </div>

      {/* Sun Arc Visualization */}
      <div className="relative h-12 overflow-hidden">
        {/* Arc Path */}
        <svg
          viewBox="0 0 200 60"
          className="w-full h-full"
          preserveAspectRatio="xMidYMax meet"
        >
          {/* Background arc */}
          <path
            d="M 10 55 Q 100 -20 190 55"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border-subtle"
            strokeDasharray="4 4"
          />
          {/* Progress arc */}
          <path
            d="M 10 55 Q 100 -20 190 55"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={isDay ? 'text-amber-400' : 'text-slate-500'}
            strokeDasharray={`${progress * 2.5} 250`}
          />
        </svg>

        {/* Sun indicator */}
        <motion.div
          className="absolute"
          style={{
            left: `${5 + progress * 0.9}%`,
            bottom: `${Math.sin((progress / 100) * Math.PI) * 100}%`,
          }}
          animate={{
            scale: isDay ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Sun
            className={cn(
              'h-5 w-5 -translate-x-1/2 translate-y-1/2',
              isDay ? 'text-amber-400' : 'text-slate-500'
            )}
          />
        </motion.div>
      </div>

      {/* Day/Night indicator */}
      <p className="text-center text-caption text-text-muted mt-1">
        {isDay ? 'Daytime' : 'Nighttime'}
      </p>
    </div>
  );
}

SunriseSunset.displayName = 'SunriseSunset';
