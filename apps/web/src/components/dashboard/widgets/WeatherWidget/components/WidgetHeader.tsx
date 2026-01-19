'use client';

import { MapPin, RefreshCw, Maximize2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetHeaderProps {
  cityName: string;
  onRefresh: () => void;
  onExpand: () => void;
  isRefreshing: boolean;
  lastUpdated: Date | null;
}

export function WidgetHeader({
  cityName,
  onRefresh,
  onExpand,
  isRefreshing,
  lastUpdated,
}: WidgetHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-text-muted" />
        <span className="text-label font-medium">{cityName}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onRefresh}
          className="btn-icon btn-icon-sm focus-ring"
          title={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Refresh'}
          aria-label="Refresh weather"
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </button>
        <button
          onClick={onExpand}
          className="btn-icon btn-icon-sm focus-ring"
          title="Expand weather details"
          aria-label="Expand weather"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

WidgetHeader.displayName = 'WidgetHeader';
