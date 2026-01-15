'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  Coffee,
  Dumbbell,
  Moon,
  Compass,
  Sparkles,
  Home,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useContentHubStore } from '@/lib/stores/contenthub';
import type { ContentMode } from '@/types/contenthub';
import { PRESET_MODES } from '@/types/contenthub';

interface QuickActionsProps {
  onAIDiscover?: () => void;
  onSmartHome?: () => void;
  onVoice?: () => void;
  className?: string;
}

// Icon mapping for modes
const MODE_ICONS: Record<ContentMode, React.ComponentType<{ className?: string }>> = {
  focus: Brain,
  break: Coffee,
  workout: Dumbbell,
  sleep: Moon,
  discover: Compass,
};

/**
 * QuickActions Component
 *
 * Mode selector buttons and quick action triggers
 * for AI discovery, Smart Home, and Voice control
 */
export function QuickActions({
  onAIDiscover,
  onSmartHome,
  onVoice,
  className,
}: QuickActionsProps) {
  const { activeMode, setMode } = useContentHubStore();

  const modes: ContentMode[] = ['focus', 'break', 'discover', 'workout', 'sleep'];

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Mode selector */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
        {modes.map((mode) => {
          const Icon = MODE_ICONS[mode];
          const config = PRESET_MODES[mode];
          const isActive = activeMode === mode;

          return (
            <motion.button
              key={mode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode(mode)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium',
                'transition-all whitespace-nowrap',
                isActive
                  ? 'bg-neon-primary text-white shadow-lg shadow-neon-primary/30'
                  : 'bg-surface-3 text-text-muted hover:text-foreground hover:bg-border-subtle'
              )}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{config.name.replace(' Mode', '')}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Quick action buttons */}
      <div className="flex items-center justify-center gap-2">
        {/* AI Discover */}
        {onAIDiscover && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-text-muted hover:text-neon-primary"
            onClick={onAIDiscover}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI Suggest</span>
          </Button>
        )}

        {/* Smart Home */}
        {onSmartHome && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-text-muted hover:text-neon-accent hover:bg-neon-accent/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Cast button clicked in QuickActions');
              onSmartHome();
            }}
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cast to TV</span>
          </Button>
        )}

        {/* Voice */}
        {onVoice && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-text-muted hover:text-foreground"
            onClick={onVoice}
          >
            <Mic className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Voice</span>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact mode indicator for minimal UI
 */
export function ModeIndicator({
  mode,
  onClick,
  className,
}: {
  mode: ContentMode;
  onClick?: () => void;
  className?: string;
}) {
  const Icon = MODE_ICONS[mode];
  const config = PRESET_MODES[mode];

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-full text-[10px]',
        'bg-surface-3 border border-border-subtle',
        'hover:border-neon-primary/50 transition-colors',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{config.name.replace(' Mode', '')}</span>
    </motion.button>
  );
}
