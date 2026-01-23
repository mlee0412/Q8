'use client';

import { memo } from 'react';
import { X } from 'lucide-react';
import { getSafeImageUrl } from '../utils/urlValidation';
import type { QueueItemProps } from '../types';

/**
 * QueueItem Component (Memoized)
 *
 * Displays a single item in the queue with play/remove actions.
 * Memoized to prevent unnecessary re-renders when parent state changes.
 */
function QueueItemComponent({
  item,
  index,
  onPlay,
  onRemove,
  showRemove = true,
}: QueueItemProps) {
  return (
    <div
      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer group"
      onClick={onPlay}
    >
      <span className="w-4 text-[10px] text-text-muted text-center">
        {index + 1}
      </span>
      <img
        src={getSafeImageUrl(item.thumbnailUrl)}
        alt={item.title}
        className="h-8 w-8 rounded object-cover"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{item.title}</p>
        <p className="text-[10px] text-text-muted truncate">{item.subtitle}</p>
      </div>
      {showRemove && onRemove && (
        <button
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3 text-text-muted" />
        </button>
      )}
    </div>
  );
}

// Memoize with custom comparison for performance
export const QueueItem = memo(QueueItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.index === nextProps.index &&
    prevProps.showRemove === nextProps.showRemove
  );
});

QueueItem.displayName = 'QueueItem';
