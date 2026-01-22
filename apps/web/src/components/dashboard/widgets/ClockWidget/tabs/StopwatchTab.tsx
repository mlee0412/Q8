'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Flag, Copy, Trash2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StopwatchTabProps } from '../types';

export function StopwatchTab({
  state,
  onStart,
  onStop,
  onReset,
  onLap,
  onLabelLap,
  onClearLaps,
  onExportLaps,
}: StopwatchTabProps) {
  const [editingLapId, setEditingLapId] = useState<string | null>(null);
  const [lapLabel, setLapLabel] = useState('');

  const { isRunning, elapsedMs, laps } = state;

  // Format time with milliseconds
  const formatTime = (ms: number): { main: string; fraction: string } => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);

    let main: string;
    if (hours > 0) {
      main = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      main = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return {
      main,
      fraction: `.${centiseconds.toString().padStart(2, '0')}`,
    };
  };

  const displayTime = formatTime(elapsedMs);

  const handleLabelSave = (lapId: string) => {
    if (lapLabel.trim()) {
      onLabelLap(lapId, lapLabel.trim());
    }
    setEditingLapId(null);
    setLapLabel('');
  };

  const handleCopyLaps = async () => {
    const csv = onExportLaps();
    if (csv) {
      await navigator.clipboard.writeText(csv);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stopwatch Display */}
      <div className="flex-shrink-0 flex flex-col items-center py-6 border-b border-border-subtle">
        {/* Time Display */}
        <motion.div
          className="flex items-baseline"
          animate={{ scale: isRunning ? [1, 1.01, 1] : 1 }}
          transition={{ duration: 1, repeat: isRunning ? Infinity : 0 }}
        >
          <span className="text-5xl font-mono font-bold text-text-primary tracking-tight">
            {displayTime.main}
          </span>
          <span className="text-2xl font-mono text-text-muted">
            {displayTime.fraction}
          </span>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-6">
          {/* Start/Stop Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isRunning ? onStop : onStart}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center transition-colors focus-ring',
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-neon-primary hover:bg-neon-primary/90'
            )}
            aria-label={isRunning ? 'Stop' : 'Start'}
          >
            {isRunning ? (
              <Pause className="h-6 w-6 text-black" />
            ) : (
              <Play className="h-6 w-6 text-black ml-0.5" />
            )}
          </motion.button>

          {/* Lap Button (when running) or Reset Button (when stopped) */}
          {isRunning ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLap}
              className="w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center hover:bg-surface-2 transition-colors focus-ring"
              aria-label="Lap"
            >
              <Flag className="h-5 w-5 text-text-primary" />
            </motion.button>
          ) : elapsedMs > 0 ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onReset}
              className="w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center hover:bg-surface-2 transition-colors focus-ring"
              aria-label="Reset"
            >
              <RotateCcw className="h-5 w-5 text-text-primary" />
            </motion.button>
          ) : null}
        </div>
      </div>

      {/* Laps Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Laps Header */}
        {laps.length > 0 && (
          <div className="flex items-center justify-between px-2 py-2 border-b border-border-subtle">
            <span className="text-xs font-medium text-text-muted">
              Laps ({laps.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyLaps}
                className="btn-icon btn-icon-xs focus-ring"
                aria-label="Copy laps"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                onClick={onClearLaps}
                className="btn-icon btn-icon-xs focus-ring text-text-muted hover:text-error"
                aria-label="Clear laps"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Laps List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {laps.map((lap) => {
              const lapTime = formatTime(lap.lapTime);
              const totalTime = formatTime(lap.totalTime);

              return (
                <motion.div
                  key={lap.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    'list-row px-3 py-2',
                    lap.isBest && 'bg-emerald-500/5',
                    lap.isWorst && 'bg-red-500/5'
                  )}
                >
                  {/* Lap Number */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-muted w-8">
                      #{lap.lapNumber}
                    </span>
                    {lap.isBest && (
                      <Award className="h-3 w-3 text-emerald-400" />
                    )}
                    {editingLapId === lap.id ? (
                      <input
                        type="text"
                        value={lapLabel}
                        onChange={(e) => setLapLabel(e.target.value)}
                        onBlur={() => handleLabelSave(lap.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLabelSave(lap.id)}
                        placeholder="Label..."
                        className="text-xs bg-transparent border-b border-neon-primary/50 text-text-primary outline-none w-20"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditingLapId(lap.id);
                          setLapLabel(lap.label || '');
                        }}
                        className="text-xs text-text-muted hover:text-text-secondary truncate max-w-[80px]"
                      >
                        {lap.label || 'Add label'}
                      </button>
                    )}
                  </div>

                  {/* Times */}
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span
                        className={cn(
                          'text-sm font-mono font-medium',
                          lap.isBest && 'text-emerald-400',
                          lap.isWorst && 'text-red-400',
                          !lap.isBest && !lap.isWorst && 'text-text-primary'
                        )}
                      >
                        {lapTime.main}
                        <span className="text-text-muted">{lapTime.fraction}</span>
                      </span>
                      <p className="text-[10px] text-text-muted">Lap</p>
                    </div>
                    <div>
                      <span className="text-sm font-mono text-text-secondary">
                        {totalTime.main}
                        <span className="text-text-muted">{totalTime.fraction}</span>
                      </span>
                      <p className="text-[10px] text-text-muted">Total</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty State */}
          {laps.length === 0 && elapsedMs > 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Flag className="h-6 w-6 text-text-muted mb-2" />
              <p className="text-xs text-text-muted">
                Tap the flag button to record laps
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

StopwatchTab.displayName = 'StopwatchTab';
