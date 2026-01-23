'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getSafeImageUrl } from './utils/urlValidation';
import type { ContentItem } from '@/types/contenthub';

interface UpNextQueueProps {
  items: ContentItem[];
  onPlay: (item: ContentItem) => void;
  onRemove: (itemId: string) => void;
  onAddMore?: () => void;
  maxVisible?: number;
  className?: string;
}

/**
 * UpNextQueue Component
 *
 * Horizontal scrollable queue of upcoming content items
 * Shows thumbnails with play-on-click functionality
 */
export function UpNextQueue({
  items,
  onPlay,
  onRemove,
  onAddMore,
  maxVisible = 5,
  className,
}: UpNextQueueProps) {
  const visibleItems = items.slice(0, maxVisible);
  const remainingCount = items.length - maxVisible;

  // Get source icon color
  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      spotify: 'bg-green-500',
      youtube: 'bg-red-500',
      netflix: 'bg-red-600',
      instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
      podcast: 'bg-orange-500',
    };
    return colors[source] ?? 'bg-gray-500';
  };

  // Get source abbreviation
  const getSourceAbbr = (source: string) => {
    const abbrs: Record<string, string> = {
      spotify: 'SP',
      youtube: 'YT',
      netflix: 'NX',
      instagram: 'IG',
      podcast: 'PD',
    };
    return abbrs[source] ?? source.slice(0, 2).toUpperCase();
  };

  if (items.length === 0) {
    return (
      <div className={cn('py-3', className)}>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-text-muted">Up Next</span>
        </div>
        <div className="flex items-center justify-center py-4 text-center">
          <div>
            <p className="text-xs text-text-muted">Queue is empty</p>
            {onAddMore && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={onAddMore}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add content
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('py-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-text-muted">
          Up Next ({items.length})
        </span>
        {onAddMore && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onAddMore}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Horizontal scroll container */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border-subtle scrollbar-track-transparent">
        {visibleItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex-shrink-0 group relative"
          >
            {/* Card */}
            <div
              className={cn(
                'relative w-24 cursor-pointer rounded-lg overflow-hidden',
                'bg-surface-3 backdrop-blur-sm border border-border-subtle',
                'hover:border-neon-primary/50 transition-all'
              )}
              onClick={() => onPlay(item)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-square">
                <img
                  src={getSafeImageUrl(item.thumbnailUrl)}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Source badge */}
                <div
                  className={cn(
                    'absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] font-bold text-white',
                    getSourceColor(item.source)
                  )}
                >
                  {getSourceAbbr(item.source)}
                </div>

                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-6 w-6 text-white" />
                </div>

                {/* Remove button */}
                <button
                  className="absolute top-1 right-1 h-4 w-4 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                >
                  <X className="h-2.5 w-2.5 text-white" />
                </button>
              </div>

              {/* Info */}
              <div className="p-1.5">
                <p className="text-[10px] font-medium truncate">{item.title}</p>
                <p className="text-[9px] text-text-muted truncate">
                  {item.subtitle}
                </p>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Show more indicator */}
        {remainingCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-shrink-0 flex items-center justify-center w-16"
          >
            <div className="text-center">
              <div className="h-10 w-10 rounded-full bg-surface-3 border border-border-subtle flex items-center justify-center mx-auto mb-1">
                <span className="text-xs font-medium">+{remainingCount}</span>
              </div>
              <span className="text-[9px] text-text-muted">more</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact queue item for list view
 */
export function QueueListItem({
  item,
  index,
  onPlay,
  onRemove,
  isDraggable = false,
  className,
}: {
  item: ContentItem;
  index: number;
  onPlay: () => void;
  onRemove: () => void;
  isDraggable?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg group',
        'hover:bg-surface-3 transition-colors cursor-pointer',
        className
      )}
      onClick={onPlay}
    >
      {/* Drag handle */}
      {isDraggable && (
        <GripVertical className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
      )}

      {/* Index */}
      <span className="w-5 text-xs text-text-muted text-center">
        {index + 1}
      </span>

      {/* Thumbnail */}
      <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0">
        <img
          src={getSafeImageUrl(item.thumbnailUrl)}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-text-muted truncate">{item.subtitle}</p>
      </div>

      {/* Duration */}
      <span className="text-xs text-text-muted">
        {formatDuration(item.duration)}
      </span>

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
