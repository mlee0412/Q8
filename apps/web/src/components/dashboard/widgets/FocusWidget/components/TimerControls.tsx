'use client';

import { Play, Pause, Square } from 'lucide-react';
import type { TimerControlsProps } from '../types';

export function TimerControls({ isRunning, onStart, onPause, onStop }: TimerControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {!isRunning ? (
        <button
          onClick={onStart}
          className="flex items-center gap-1 h-7 px-3 text-xs font-medium bg-neon-primary text-white rounded-md hover:bg-neon-primary/90 transition-colors focus-ring"
        >
          <Play className="h-3 w-3" />
          Start
        </button>
      ) : (
        <>
          <button
            className="btn-icon btn-icon-sm focus-ring"
            onClick={onPause}
            aria-label="Pause"
          >
            <Pause className="h-3 w-3" />
          </button>
          <button
            className="btn-icon btn-icon-sm focus-ring"
            onClick={onStop}
            aria-label="Stop"
          >
            <Square className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}
