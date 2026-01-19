'use client';

import { StickyNote, Plus, Calendar, Maximize2 } from 'lucide-react';
import type { WidgetHeaderProps } from '../types';

export function WidgetHeader({ onOpenDailyNote, onOpenPanel, onNewNote }: WidgetHeaderProps) {
  return (
    <div className="widget-header mb-3">
      <div className="widget-header-title">
        <StickyNote className="h-4 w-4 text-neon-primary" />
        <h3 className="text-heading text-sm">Quick Notes</h3>
      </div>
      <div className="flex items-center gap-1">
        <button
          className="btn-icon btn-icon-sm focus-ring"
          onClick={onOpenDailyNote}
          aria-label="Today's note"
        >
          <Calendar className="h-3.5 w-3.5" />
        </button>
        <button
          className="btn-icon btn-icon-sm focus-ring"
          onClick={onOpenPanel}
          aria-label="Expand notes"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          className="btn-icon btn-icon-sm focus-ring"
          onClick={onNewNote}
          aria-label="New note"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
