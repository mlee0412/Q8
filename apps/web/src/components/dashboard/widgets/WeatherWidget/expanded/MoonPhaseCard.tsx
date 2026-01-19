'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MOON_PHASE_ICONS, MOON_PHASE_LABELS } from '../constants';
import type { MoonPhaseName } from '../types';

interface MoonPhaseCardProps {
  phase: MoonPhaseName;
  illumination: number;
  moonrise?: string;
  moonset?: string;
}

export function MoonPhaseCard({
  phase,
  illumination,
  moonrise,
  moonset,
}: MoonPhaseCardProps) {
  const icon = MOON_PHASE_ICONS[phase];
  const label = MOON_PHASE_LABELS[phase];

  return (
    <div className="flex items-center gap-4">
      {/* Moon Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-4xl"
      >
        {icon}
      </motion.div>

      {/* Moon Info */}
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-white/60">
          {illumination}% illuminated
        </p>
        
        {(moonrise || moonset) && (
          <div className="flex gap-3 mt-1 text-xs text-white/50">
            {moonrise && <span>Rise: {moonrise}</span>}
            {moonset && <span>Set: {moonset}</span>}
          </div>
        )}
      </div>

      {/* Illumination Bar */}
      <div className="w-12 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${illumination}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-slate-300 rounded-full"
        />
      </div>
    </div>
  );
}

MoonPhaseCard.displayName = 'MoonPhaseCard';
