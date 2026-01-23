'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Coffee,
  Dumbbell,
  Moon,
  Compass,
  Sparkles,
  Cast,
  Mic,
  Loader2,
  Play,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { useContentHubStore } from '@/lib/stores/contenthub';
import type { ContentMode } from '@/types/contenthub';
import { PRESET_MODES } from '@/types/contenthub';

interface QuickActionsProps {
  onAIDiscover?: () => void;
  onSmartHome?: () => void;
  onVoice?: () => void;
  aiDiscoverLoading?: boolean;
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

// Mode-specific colors for visual feedback
const MODE_COLORS: Record<ContentMode, { bg: string; text: string; glow: string }> = {
  focus: { bg: 'bg-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/30' },
  break: { bg: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/30' },
  discover: { bg: 'bg-neon-primary', text: 'text-neon-primary', glow: 'shadow-neon-primary/30' },
  workout: { bg: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/30' },
  sleep: { bg: 'bg-indigo-500', text: 'text-indigo-400', glow: 'shadow-indigo-500/30' },
};

// Mode-specific descriptions for feedback
const MODE_DESCRIPTIONS: Record<ContentMode, string> = {
  focus: 'Long-form content, no distractions',
  break: 'Quick entertainment & trending shorts',
  discover: 'Explore all content types',
  workout: 'High-energy music & fitness videos',
  sleep: 'Calming ambient content, auto-fade',
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
  aiDiscoverLoading = false,
  className,
}: QuickActionsProps) {
  const { activeMode, setMode, setError } = useContentHubStore();

  const modes: ContentMode[] = ['focus', 'break', 'discover', 'workout', 'sleep'];

  // Handle mode change with feedback
  const handleModeChange = (mode: ContentMode) => {
    setMode(mode);
    const config = PRESET_MODES[mode];
    const description = MODE_DESCRIPTIONS[mode];
    setError(`${config.name}: ${description}`);
    setTimeout(() => setError(null), 3000);
    logger.info('Mode changed', { mode, description });
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Mode selector */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
        {modes.map((mode) => {
          const Icon = MODE_ICONS[mode];
          const config = PRESET_MODES[mode];
          const colors = MODE_COLORS[mode];
          const isActive = activeMode === mode;

          return (
            <motion.button
              key={mode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleModeChange(mode)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium',
                'transition-all whitespace-nowrap',
                isActive
                  ? `${colors.bg} text-white shadow-lg ${colors.glow}`
                  : 'bg-surface-3 text-text-muted hover:text-foreground hover:bg-border-subtle'
              )}
              title={MODE_DESCRIPTIONS[mode]}
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
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 text-text-muted hover:text-neon-primary disabled:opacity-50"
          onClick={() => {
            logger.info('AI Suggest clicked');
            if (onAIDiscover) {
              onAIDiscover();
            } else {
              setError('AI Suggest: Getting recommendations...');
              setTimeout(() => setError(null), 2000);
            }
          }}
          disabled={aiDiscoverLoading}
        >
          {aiDiscoverLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {aiDiscoverLoading ? 'Loading...' : 'AI Suggest'}
          </span>
        </Button>

        {/* Smart Home / Cast */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 text-text-muted hover:text-neon-accent hover:bg-neon-accent/10"
          onClick={() => {
            logger.info('Cast to TV clicked');
            if (onSmartHome) {
              onSmartHome();
            } else {
              setError('Cast: Select a device to cast to');
              setTimeout(() => setError(null), 2000);
            }
          }}
        >
          <Cast className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Cast to TV</span>
        </Button>

        {/* Voice */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 text-text-muted hover:text-foreground"
          onClick={() => {
            logger.info('Voice control clicked');
            if (onVoice) {
              onVoice();
            } else {
              setError('Voice: Click the mic icon in the header');
              setTimeout(() => setError(null), 2000);
            }
          }}
        >
          <Mic className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Voice</span>
        </Button>
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
