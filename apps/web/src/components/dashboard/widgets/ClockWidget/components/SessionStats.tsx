'use client';

import { motion } from 'framer-motion';
import { Flame, Target, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyTimerStats } from '../types';

interface SessionStatsProps {
  stats: DailyTimerStats;
  dailyGoal?: number; // in minutes
  isCompact?: boolean;
  className?: string;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function SessionStats({
  stats,
  dailyGoal = 240,
  isCompact = false,
  className,
}: SessionStatsProps) {
  const goalProgress = Math.min((stats.focusMinutes / dailyGoal) * 100, 100);

  if (isCompact) {
    return (
      <div className={cn('flex items-center gap-3 text-xs', className)}>
        <div className="flex items-center gap-1">
          <Flame className="h-3 w-3 text-orange-400" />
          <span className="text-text-secondary">{stats.sessionsCompleted}</span>
        </div>
        <div className="flex items-center gap-1">
          <Target className="h-3 w-3 text-neon-primary" />
          <span className="text-text-secondary">{formatDuration(stats.focusMinutes)}</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('card-item p-3 space-y-3', className)}
    >
      {/* Daily Goal Progress */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-muted">Daily Goal</span>
          <span className="text-xs text-text-secondary">
            {formatDuration(stats.focusMinutes)} / {formatDuration(dailyGoal)}
          </span>
        </div>
        <div className="h-2 bg-surface-4 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-neon-primary to-purple-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${goalProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Sessions Completed */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-4/50">
          <div className="p-1.5 rounded-md bg-orange-500/10">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary">{stats.sessionsCompleted}</p>
            <p className="text-[10px] text-text-muted">Sessions</p>
          </div>
        </div>

        {/* Focus Time */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-4/50">
          <div className="p-1.5 rounded-md bg-neon-primary/10">
            <Target className="h-3.5 w-3.5 text-neon-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary">{formatDuration(stats.focusMinutes)}</p>
            <p className="text-[10px] text-text-muted">Focus</p>
          </div>
        </div>

        {/* Longest Session */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-4/50">
          <div className="p-1.5 rounded-md bg-purple-500/10">
            <Zap className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary">{formatDuration(stats.longestSession)}</p>
            <p className="text-[10px] text-text-muted">Longest</p>
          </div>
        </div>

        {/* Break Time */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-4/50">
          <div className="p-1.5 rounded-md bg-emerald-500/10">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary">{formatDuration(stats.breakMinutes)}</p>
            <p className="text-[10px] text-text-muted">Breaks</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

SessionStats.displayName = 'SessionStats';
