'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { FocusPresetConfig, FocusPreset } from '../types';
import { FOCUS_PRESETS, QUICK_TIMER_PRESETS } from '../constants';

interface QuickTimerPresetsProps {
  activePreset?: FocusPreset;
  activeDuration?: number; // in seconds
  onSelectPreset: (preset: FocusPreset) => void;
  onSelectDuration: (seconds: number) => void;
  mode?: 'presets' | 'durations' | 'both';
  isCompact?: boolean;
  className?: string;
}

export function QuickTimerPresets({
  activePreset,
  activeDuration,
  onSelectPreset,
  onSelectDuration,
  mode = 'both',
  isCompact = false,
  className,
}: QuickTimerPresetsProps) {
  const workPresets = FOCUS_PRESETS.filter(
    (p) => p.id !== 'short-break' && p.id !== 'long-break'
  );

  if (isCompact) {
    return (
      <div className={cn('flex items-center gap-0.5', className)}>
        {QUICK_TIMER_PRESETS.slice(0, 4).map((preset) => (
          <button
            key={preset.label}
            onClick={() => onSelectDuration(preset.seconds)}
            className={cn(
              'h-5 px-2 text-[9px] font-medium rounded focus-ring transition-colors',
              activeDuration === preset.seconds
                ? 'bg-neon-primary/20 text-neon-primary'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-4'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Focus Mode Presets */}
      {(mode === 'presets' || mode === 'both') && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted font-medium">Focus Modes</p>
          <div className="grid grid-cols-3 gap-2">
            {workPresets.map((preset) => (
              <motion.button
                key={preset.id}
                onClick={() => onSelectPreset(preset.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'p-2 rounded-lg border transition-all text-left',
                  activePreset === preset.id
                    ? 'border-neon-primary bg-neon-primary/10'
                    : 'border-border-subtle bg-surface-4/50 hover:border-border-default'
                )}
              >
                <span className="text-lg mb-1 block">{preset.icon}</span>
                <p className="text-xs font-medium text-text-primary">{preset.label}</p>
                <p className="text-[10px] text-text-muted">{preset.workMinutes}m work</p>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Duration Presets */}
      {(mode === 'durations' || mode === 'both') && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted font-medium">Quick Timer</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TIMER_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => onSelectDuration(preset.seconds)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors focus-ring',
                  activeDuration === preset.seconds
                    ? 'bg-neon-primary text-black'
                    : 'bg-surface-4 text-text-secondary hover:bg-surface-3'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

QuickTimerPresets.displayName = 'QuickTimerPresets';
