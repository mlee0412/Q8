'use client';

import { motion } from 'framer-motion';
import { Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWindDirection, getBeaufortScale, formatWindSpeed } from '../utils';
import type { TemperatureUnit } from '../types';

interface WindCompassProps {
  direction: number;
  speed: number;
  gust?: number;
  unit: TemperatureUnit;
}

export function WindCompass({ direction, speed, gust, unit }: WindCompassProps) {
  const windDir = getWindDirection(direction);
  const beaufort = getBeaufortScale(speed);

  return (
    <div className="flex flex-col items-center">
      {/* Compass */}
      <div className="relative w-32 h-32 mb-4">
        {/* Compass Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-white/20" />
        
        {/* Direction Labels */}
        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-medium text-white/60">
          N
        </span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium text-white/60">
          S
        </span>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-medium text-white/60">
          W
        </span>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium text-white/60">
          E
        </span>

        {/* Tick marks */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-2 bg-white/30 left-1/2 -translate-x-1/2"
            style={{
              top: '4px',
              transformOrigin: 'center 60px',
              transform: `translateX(-50%) rotate(${i * 45}deg)`,
            }}
          />
        ))}

        {/* Wind Direction Arrow */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ rotate: 0 }}
          animate={{ rotate: direction }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        >
          <Navigation
            className="h-8 w-8 text-teal-400"
            style={{ transform: 'rotate(180deg)' }}
          />
        </motion.div>

        {/* Center Circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-sm flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-white">{Math.round(speed)}</span>
            <span className="text-xs text-white/60">
              {unit === 'celsius' ? 'km/h' : 'mph'}
            </span>
          </div>
        </div>
      </div>

      {/* Wind Info */}
      <div className="text-center space-y-1">
        <p className="text-sm text-white">
          <span className="text-white/60">From: </span>
          <span className="font-medium">{windDir.full}</span>
          <span className="text-white/40 ml-1">({direction}°)</span>
        </p>
        
        {gust && gust > speed && (
          <p className="text-sm text-white">
            <span className="text-white/60">Gusts: </span>
            <span className="font-medium text-rose-400">
              {formatWindSpeed(gust, unit)}
            </span>
          </p>
        )}

        <div className="mt-2 px-3 py-1.5 rounded-lg bg-white/5">
          <p className="text-xs text-white/60">Beaufort Scale</p>
          <p className="text-sm font-medium text-white">{beaufort.label}</p>
          <p className="text-xs text-white/40">{beaufort.description}</p>
        </div>
      </div>
    </div>
  );
}

WindCompass.displayName = 'WindCompass';
