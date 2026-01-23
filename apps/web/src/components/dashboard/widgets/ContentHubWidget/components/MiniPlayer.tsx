'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  ChevronUp,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MiniWaveform } from './WaveformVisualizer';
import type { ContentItem } from '@/types/contenthub';

interface MiniPlayerProps {
  item: ContentItem | null;
  isPlaying: boolean;
  progress: number;
  onPlayPause: () => void;
  onNext: () => void;
  onExpand: () => void;
  onClose?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function MiniPlayer({
  item,
  isPlaying,
  progress,
  onPlayPause,
  onNext,
  onExpand,
  onClose,
  isLoading = false,
  className,
}: MiniPlayerProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!item) return null;

  const progressPercent = item.duration ? (progress / item.duration) * 100 : 0;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-40',
        'w-[90%] max-w-md',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl',
          'bg-surface-primary/95 backdrop-blur-xl',
          'border border-border-subtle shadow-2xl shadow-black/20',
          'transition-all duration-300',
          isHovered && 'shadow-neon-primary/10'
        )}
      >
        {/* Progress bar at top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
          <motion.div
            className="h-full bg-neon-primary"
            style={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex items-center gap-3 p-2">
          {/* Album art with click to expand */}
          <motion.div
            className="relative cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onExpand}
          >
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="h-12 w-12 rounded-lg object-cover"
            />
            
            {/* Playing indicator */}
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                <MiniWaveform isPlaying={isPlaying} />
              </div>
            )}

            {/* Expand indicator on hover */}
            <AnimatePresence>
              {isHovered && !isPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg"
                >
                  <ChevronUp className="h-5 w-5 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Track info */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onExpand}>
            <p className="text-sm font-medium text-white truncate">
              {item.title}
            </p>
            <p className="text-xs text-text-muted truncate">
              {item.subtitle}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:text-neon-primary hover:bg-neon-primary/10"
              onClick={onPlayPause}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            {/* Next */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-muted hover:text-white"
              onClick={onNext}
              disabled={isLoading}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Close (optional) */}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-text-muted hover:text-white"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Subtle glow effect when playing */}
        {isPlaying && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              background: `radial-gradient(ellipse at center, rgb(var(--neon-primary) / 0.1), transparent 70%)`,
            }}
          />
        )}
      </div>
    </motion.div>
  );
}

export default MiniPlayer;
