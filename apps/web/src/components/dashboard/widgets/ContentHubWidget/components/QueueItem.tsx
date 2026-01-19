'use client';

import { X } from 'lucide-react';
import type { QueueItemProps } from '../types';

export function QueueItem({
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
        src={item.thumbnailUrl}
        alt={item.title}
        className="h-8 w-8 rounded object-cover"
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
