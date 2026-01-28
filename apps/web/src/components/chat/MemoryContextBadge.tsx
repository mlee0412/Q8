'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MemoryContextData {
  id: string;
  memoryId: string;
  content: string;
  relevance: number;
}

interface MemoryContextBadgeProps {
  memories: MemoryContextData[];
  className?: string;
}

interface SingleMemoryBadgeProps {
  memory: MemoryContextData;
  index: number;
}

/**
 * Get relevance color based on score
 */
function getRelevanceColor(relevance: number): string {
  if (relevance >= 0.8) return 'text-green-400 bg-green-500/20 border-green-500/30';
  if (relevance >= 0.5) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
  return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
}

/**
 * SingleMemoryBadge - Individual memory pill with expandable content
 */
function SingleMemoryBadge({ memory, index }: SingleMemoryBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const relevanceColor = getRelevanceColor(memory.relevance);
  const snippet = memory.content.length > 60
    ? memory.content.slice(0, 60) + '...'
    : memory.content;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
          'border transition-all cursor-pointer',
          'hover:brightness-110',
          relevanceColor
        )}
        title={`Relevance: ${Math.round(memory.relevance * 100)}%`}
      >
        <Brain className="h-3 w-3" />
        <span className="font-medium max-w-32 truncate">{snippet}</span>
        {memory.content.length > 60 && (
          isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        )}
      </button>

      {/* Expanded content popup */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 left-0 top-full mt-1',
              'w-72 p-3 rounded-lg',
              'bg-surface-3 border border-border-subtle shadow-lg'
            )}
          >
            <div className="flex items-start gap-2">
              <Brain className={cn('h-4 w-4 mt-0.5 flex-shrink-0', relevanceColor.split(' ')[0])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary whitespace-pre-wrap">
                  {memory.content}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    relevanceColor
                  )}>
                    {Math.round(memory.relevance * 100)}% match
                  </span>
                  <span className="text-[10px] text-text-muted">
                    ID: {memory.memoryId.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * MemoryContextBadge Component
 *
 * Displays compact pill badges for memories used in generating a response
 * with expandable content on click and relevance indicators
 */
export function MemoryContextBadge({ memories, className }: MemoryContextBadgeProps) {
  const [showAll, setShowAll] = useState(false);

  if (memories.length === 0) return null;

  // Show max 3 memories by default, rest behind "show more"
  const visibleMemories = showAll ? memories : memories.slice(0, 3);
  const hiddenCount = memories.length - 3;

  return (
    <div className={cn('flex flex-wrap items-center gap-2 my-2', className)}>
      <span className="text-xs text-text-muted flex items-center gap-1">
        <Brain className="h-3 w-3" />
        Using memories:
      </span>

      {visibleMemories.map((memory, index) => (
        <SingleMemoryBadge
          key={memory.id}
          memory={memory}
          index={index}
        />
      ))}

      {hiddenCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          +{hiddenCount} more
        </button>
      )}

      {showAll && memories.length > 3 && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}

MemoryContextBadge.displayName = 'MemoryContextBadge';
