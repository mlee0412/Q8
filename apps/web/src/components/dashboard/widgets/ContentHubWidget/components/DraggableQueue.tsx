'use client';

import { useState, useCallback } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { GripVertical, Play, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContentHubStore } from '@/lib/stores/contenthub';
import type { ContentItem } from '@/types/contenthub';

interface DraggableQueueProps {
  items: ContentItem[];
  onPlay: (item: ContentItem) => void;
  onRemove: (itemId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  maxVisible?: number;
  className?: string;
  title?: string;
  emptyMessage?: string;
}

function formatDuration(ms: number): string {
  if (!ms || ms === 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const SOURCE_COLORS: Record<string, string> = {
  spotify: 'bg-green-500',
  youtube: 'bg-red-500',
  netflix: 'bg-red-600',
  instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
  podcast: 'bg-orange-500',
};

export function DraggableQueue({
  items,
  onPlay,
  onRemove,
  onReorder,
  maxVisible = 10,
  className,
  title = 'Up Next',
  emptyMessage = 'Queue is empty',
}: DraggableQueueProps) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [isDragging, setIsDragging] = useState(false);

  // Sync with prop changes
  if (items !== orderedItems && !isDragging) {
    setOrderedItems(items);
  }

  const handleReorder = useCallback((newOrder: ContentItem[]) => {
    setOrderedItems(newOrder);
    
    // Find the item that moved and its new position
    const oldIndex = items.findIndex((item, i) => item.id !== newOrder[i]?.id);
    const newIndex = newOrder.findIndex((item, i) => item.id !== items[i]?.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex);
    }
  }, [items, onReorder]);

  const visibleItems = orderedItems.slice(0, maxVisible);
  const remainingCount = orderedItems.length - maxVisible;

  if (items.length === 0) {
    return (
      <div className={cn('py-4', className)}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center justify-center py-8 text-center">
          <p className="text-xs text-text-muted">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('py-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{title}</span>
          <span className="text-xs text-text-muted">({items.length})</span>
        </div>
        {items.length > 1 && (
          <span className="text-[10px] text-text-muted">Drag to reorder</span>
        )}
      </div>

      {/* Draggable list */}
      <Reorder.Group
        axis="y"
        values={visibleItems}
        onReorder={handleReorder}
        className="space-y-1"
      >
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, index) => (
            <QueueItem
              key={item.id}
              item={item}
              index={index}
              onPlay={() => onPlay(item)}
              onRemove={() => onRemove(item.id)}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Remaining count */}
      {remainingCount > 0 && (
        <div className="mt-2 text-center">
          <span className="text-xs text-text-muted">
            +{remainingCount} more in queue
          </span>
        </div>
      )}
    </div>
  );
}

interface QueueItemProps {
  item: ContentItem;
  index: number;
  onPlay: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function QueueItem({
  item,
  index,
  onPlay,
  onRemove,
  onDragStart,
  onDragEnd,
}: QueueItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="list-none"
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg group',
          'bg-white/5 hover:bg-white/10',
          'border border-transparent hover:border-white/10',
          'transition-colors cursor-grab active:cursor-grabbing'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Index */}
        <span className="w-5 text-xs text-text-muted text-center flex-shrink-0">
          {index + 1}
        </span>

        {/* Thumbnail with source indicator */}
        <div className="relative flex-shrink-0">
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="h-10 w-10 rounded object-cover"
          />
          <div
            className={cn(
              'absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-surface-primary',
              SOURCE_COLORS[item.source] || 'bg-gray-500'
            )}
          />
          
          {/* Play overlay */}
          <AnimatePresence>
            {isHovered && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay();
                }}
              >
                <Play className="h-4 w-4 text-white fill-white" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0" onClick={onPlay}>
          <p className="text-xs font-medium text-white truncate cursor-pointer hover:text-neon-primary transition-colors">
            {item.title}
          </p>
          <p className="text-[10px] text-text-muted truncate">
            {item.subtitle}
          </p>
        </div>

        {/* Duration */}
        {item.duration > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-text-muted flex-shrink-0">
            <Clock className="h-2.5 w-2.5" />
            {formatDuration(item.duration)}
          </div>
        )}

        {/* Remove button */}
        <button
          className={cn(
            'flex-shrink-0 p-1.5 rounded-full',
            'text-text-muted hover:text-red-400 hover:bg-red-400/10',
            'opacity-0 group-hover:opacity-100 transition-all'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </Reorder.Item>
  );
}

export default DraggableQueue;
