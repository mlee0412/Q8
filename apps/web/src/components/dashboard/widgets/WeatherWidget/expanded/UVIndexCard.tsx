'use client';

import { motion } from 'framer-motion';
import { Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UV_CONFIG } from '../constants';
import type { UVIndex } from '../types';

interface UVIndexCardProps {
  uvIndex: UVIndex;
}

export function UVIndexCard({ uvIndex }: UVIndexCardProps) {
  const config = UV_CONFIG[uvIndex.category];
  const uvPercent = Math.min(100, (uvIndex.value / 11) * 100);

  const getProtectionAdvice = () => {
    switch (uvIndex.category) {
      case 'low':
        return 'No protection needed. Enjoy the outdoors!';
      case 'moderate':
        return 'Wear sunglasses. Use SPF 30+ if outside for 30+ minutes.';
      case 'high':
        return 'Reduce sun exposure between 10am-4pm. Wear sunscreen, hat, and sunglasses.';
      case 'very-high':
        return 'Minimize sun exposure. Seek shade, wear protective clothing and SPF 50+.';
      case 'extreme':
        return 'Avoid sun exposure. Stay indoors during midday hours if possible.';
      default:
        return '';
    }
  };

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-white/80">UV Index</span>
        </div>
        <span className={cn('text-sm font-semibold', config.color)}>
          {config.label}
        </span>
      </div>

      {/* UV Value */}
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold text-white">{uvIndex.value}</span>
        <span className="text-xs text-white/50 mb-1">of 11+</span>
      </div>

      {/* UV Bar */}
      <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${uvPercent}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #a855f7)',
          }}
        />
      </div>

      {/* Scale Labels */}
      <div className="flex justify-between text-xs text-white/40 mb-3">
        <span>Low</span>
        <span>Moderate</span>
        <span>High</span>
        <span>Very High</span>
        <span>Extreme</span>
      </div>

      {/* Peak Time */}
      {uvIndex.peakTime && (
        <p className="text-xs text-white/60 mb-2">
          Peak UV at: <span className="text-white">{uvIndex.peakTime}</span>
        </p>
      )}

      {/* Protection Advice */}
      <div className={cn('p-2 rounded-lg text-xs', config.bgColor)}>
        <p className={config.color}>{getProtectionAdvice()}</p>
      </div>
    </div>
  );
}

UVIndexCard.displayName = 'UVIndexCard';
