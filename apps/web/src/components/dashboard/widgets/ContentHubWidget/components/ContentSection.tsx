'use client';

import { Button } from '@/components/ui/button';
import { ContentCard } from './ContentCard';
import type { ContentSectionProps } from '../types';

export function ContentSection({
  title,
  items,
  onPlay,
  showAll = false,
  onToggleShowAll,
  maxItems = 6,
}: ContentSectionProps) {
  const displayItems = showAll ? items : items.slice(0, maxItems);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        {items.length > maxItems && onToggleShowAll && (
          <Button
            variant="ghost"
            size="sm"
            className="text-neon-primary hover:text-neon-accent"
            onClick={onToggleShowAll}
          >
            {showAll ? 'Show less' : `Show all (${items.length})`}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {displayItems.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            onClick={() => onPlay(item)}
          />
        ))}
      </div>
    </div>
  );
}
