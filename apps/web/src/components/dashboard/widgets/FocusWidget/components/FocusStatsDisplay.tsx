'use client';

import { Clock, Calendar, Zap } from 'lucide-react';
import type { FocusStatsDisplayProps } from '../types';

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function FocusStatsDisplay({ stats }: FocusStatsDisplayProps) {
  return (
    <div className="w-[100px] flex flex-col gap-1.5 overflow-y-auto scrollbar-thin">
      <div className="card-item text-center flex-shrink-0">
        <div className="flex items-center justify-center gap-1">
          <Clock className="h-3 w-3 text-neon-primary" />
          <span className="text-[10px] text-text-muted">Today</span>
        </div>
        <p className="text-sm font-bold text-text-primary">
          {formatMinutes(stats.todayMinutes)}
        </p>
        <p className="text-[10px] text-text-muted">
          {stats.sessionsToday} sessions
        </p>
      </div>

      <div className="card-item text-center flex-shrink-0">
        <div className="flex items-center justify-center gap-1">
          <Calendar className="h-3 w-3 text-info" />
          <span className="text-[10px] text-text-muted">Week</span>
        </div>
        <p className="text-sm font-bold text-text-primary">
          {formatMinutes(stats.weekMinutes)}
        </p>
      </div>

      <div className="card-item text-center flex-shrink-0">
        <div className="flex items-center justify-center gap-1">
          <Zap className="h-3 w-3 text-warning" />
          <span className="text-[10px] text-text-muted">Streak</span>
        </div>
        <p className="text-sm font-bold text-text-primary">{stats.streak}d</p>
      </div>
    </div>
  );
}
