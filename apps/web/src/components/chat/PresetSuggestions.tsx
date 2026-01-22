'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AGENT_COLORS,
  CATEGORY_CONFIG,
  type PresetSuggestion,
  type PresetCategory,
} from '@/lib/presets/preset-config';
import { usePresetSuggestions } from '@/hooks/usePresetSuggestions';

interface PresetSuggestionsProps {
  onSelect: (prompt: string) => void;
  className?: string;
}

/**
 * PresetSuggestions Component
 * Displays context-aware, agent-mapped preset suggestions for the chat empty state
 */
export function PresetSuggestions({ onSelect, className }: PresetSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    presets: contextualPresets,
    allPresets,
    timeOfDay,
    subtitle,
    services,
    isLoading,
    recordUsage,
  } = usePresetSuggestions({ maxPresets: 4 });

  // Handle preset selection with usage tracking
  const handleSelect = useCallback((preset: PresetSuggestion) => {
    recordUsage(preset.id);
    onSelect(preset.prompt);
  }, [recordUsage, onSelect]);

  // Group all presets by category for expanded view
  const groupedPresets = useMemo(() => {
    return allPresets.reduce(
      (acc, preset) => {
        if (!acc[preset.category]) {
          acc[preset.category] = [];
        }
        acc[preset.category].push(preset);
        return acc;
      },
      {} as Record<PresetCategory, PresetSuggestion[]>
    );
  }, [allPresets]);

  // Sort categories by order, filter empty ones
  const sortedCategories = useMemo(() => {
    return (Object.keys(groupedPresets) as PresetCategory[])
      .filter((cat) => groupedPresets[cat]?.length > 0)
      .sort((a, b) => CATEGORY_CONFIG[a].order - CATEGORY_CONFIG[b].order);
  }, [groupedPresets]);

  // Count available services for indicator
  const serviceCount = Object.values(services).filter(Boolean).length;

  return (
    <div className={cn('w-full max-w-md', className)}>
      {/* Time context indicator */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted mb-3">
        <Clock className="h-3 w-3" />
        <span>{subtitle}</span>
        {serviceCount > 0 && (
          <span className="text-neon-primary">• {serviceCount} services connected</span>
        )}
      </div>

      {/* Default compact view - contextual presets */}
      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {contextualPresets.map((preset) => (
            <PresetChip
              key={preset.id}
              preset={preset}
              onSelect={() => handleSelect(preset)}
            />
          ))}
        </div>
      )}

      {/* Expand/collapse toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-3 mx-auto flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            More suggestions
          </>
        )}
      </button>

      {/* Expanded view with all categories */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 space-y-4 overflow-hidden"
          >
            {sortedCategories.map((category) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-text-muted mb-2 text-left">
                  {CATEGORY_CONFIG[category].label}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {groupedPresets[category].map((preset) => (
                    <PresetChip
                      key={preset.id}
                      preset={preset}
                      onSelect={() => handleSelect(preset)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PresetChipProps {
  preset: PresetSuggestion;
  onSelect: (prompt: string) => void;
}

/**
 * Individual preset chip with icon and agent color
 */
function PresetChip({ preset, onSelect }: PresetChipProps) {
  const colors = AGENT_COLORS[preset.agent];
  const Icon = preset.icon;

  return (
    <button
      onClick={() => onSelect(preset.prompt)}
      className={cn(
        'group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs',
        'border transition-all duration-200',
        'bg-surface-3 border-border-subtle',
        'hover:border-current',
        colors.text
      )}
      title={`Handled by ${preset.agent} agent`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-text-primary group-hover:text-current transition-colors">
        {preset.label}
      </span>
    </button>
  );
}

/**
 * Compact version showing just icons (for very small spaces)
 */
export function PresetSuggestionsCompact({
  onSelect,
  className,
}: PresetSuggestionsProps) {
  const { presets, recordUsage } = usePresetSuggestions({ maxPresets: 4 });

  const handleSelect = useCallback((preset: PresetSuggestion) => {
    recordUsage(preset.id);
    onSelect(preset.prompt);
  }, [recordUsage, onSelect]);

  return (
    <div className={cn('flex justify-center gap-2', className)}>
      {presets.map((preset) => {
        const colors = AGENT_COLORS[preset.agent];
        const Icon = preset.icon;

        return (
          <button
            key={preset.id}
            onClick={() => handleSelect(preset)}
            className={cn(
              'p-2 rounded-full transition-all duration-200',
              'border border-border-subtle',
              'hover:border-current',
              colors.bg,
              colors.text
            )}
            title={preset.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
