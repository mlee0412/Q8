'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Globe, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DigitalClock, AnalogClock, WorldClockCard } from '../components';
import type { ClockTabProps, ClockDisplayMode } from '../types';

export function ClockTab({
  currentTime,
  timezones,
  displayMode,
  onDisplayModeChange,
  onAddTimezone,
  onRemoveTimezone,
}: ClockTabProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const localTimezone = timezones.find((tz) => tz.id === 'local') || timezones[0];
  const otherTimezones = timezones.filter((tz) => tz.id !== 'local');

  return (
    <div className="flex flex-col h-full">
      {/* Main Clock Display */}
      <div className="flex items-center justify-center py-4 border-b border-border-subtle">
        <div className="flex flex-col items-center gap-2">
          {/* Display Mode Toggle */}
          <div className="flex items-center gap-1 mb-2">
            {(['digital', 'analog', 'both'] as ClockDisplayMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onDisplayModeChange(mode)}
                className={cn(
                  'px-2 py-1 text-[10px] font-medium rounded transition-colors capitalize',
                  displayMode === mode
                    ? 'bg-neon-primary/20 text-neon-primary'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Clock Display */}
          <div className="flex items-center gap-6">
            {(displayMode === 'analog' || displayMode === 'both') && (
              <AnalogClock time={currentTime} size="md" theme="neon" />
            )}
            {(displayMode === 'digital' || displayMode === 'both') && (
              <DigitalClock
                time={currentTime}
                size={displayMode === 'both' ? 'md' : 'lg'}
                showSeconds
                showDate
              />
            )}
          </div>
        </div>
      </div>

      {/* World Clocks Header */}
      <div className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-xs font-medium text-text-muted">World Clocks</span>
          <span className="text-xs text-text-subtle">({otherTimezones.length})</span>
        </div>
        <div className="flex items-center gap-1">
          {/* View Toggle */}
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-1 rounded transition-colors',
              viewMode === 'list' ? 'text-neon-primary' : 'text-text-muted hover:text-text-secondary'
            )}
            aria-label="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-1 rounded transition-colors',
              viewMode === 'grid' ? 'text-neon-primary' : 'text-text-muted hover:text-text-secondary'
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          {/* Add Timezone */}
          <button
            onClick={onAddTimezone}
            className="btn-icon btn-icon-xs focus-ring ml-1"
            aria-label="Add timezone"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* World Clocks List/Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {otherTimezones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Globe className="h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm text-text-muted">No world clocks added</p>
            <button
              onClick={onAddTimezone}
              className="text-xs text-neon-primary hover:underline mt-1"
            >
              Add a timezone
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {viewMode === 'list' ? (
              <div className="space-y-1">
                {otherTimezones.map((tz) => (
                  <WorldClockCard
                    key={tz.id}
                    timezone={tz}
                    isCompact
                    onRemove={onRemoveTimezone}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-2 gap-2"
              >
                {otherTimezones.map((tz) => (
                  <WorldClockCard
                    key={tz.id}
                    timezone={tz}
                    showDate={false}
                    onRemove={onRemoveTimezone}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

ClockTab.displayName = 'ClockTab';
