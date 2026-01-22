'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, Users, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PresetSuggestions } from './PresetSuggestions';
import { AgentCarousel } from './AgentCarousel';

type ViewMode = 'quick' | 'agents';

interface ChatEmptyStateProps {
  onSend: (message: string) => void;
  onMentionInsert?: (mention: string) => void;
  className?: string;
}

/**
 * ChatEmptyState Component
 * Enhanced empty state with toggle between quick actions and agent exploration
 */
export function ChatEmptyState({
  onSend,
  onMentionInsert,
  className,
}: ChatEmptyStateProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('quick');

  const handleMentionInsert = useCallback(
    (mention: string) => {
      onMentionInsert?.(mention);
    },
    [onMentionInsert]
  );

  return (
    <div className={cn('h-full flex items-center justify-center', className)}>
      <div className="text-center max-w-lg px-4 w-full">
        {/* Logo/Avatar */}
        <div className="h-14 w-14 rounded-full bg-neon-primary/20 flex items-center justify-center mx-auto mb-4">
          <Bot className="h-7 w-7 text-neon-primary" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-medium text-text-primary mb-1">
          Start a conversation
        </h3>
        <p className="text-sm text-text-muted mb-5">
          Ask Q8 anything or explore what each agent can do
        </p>

        {/* View toggle */}
        <div className="flex items-center justify-center gap-1 p-1 bg-surface-2 rounded-lg mb-5 max-w-[240px] mx-auto">
          <button
            onClick={() => setViewMode('quick')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'quick'
                ? 'bg-surface-4 text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Quick Actions
          </button>
          <button
            onClick={() => setViewMode('agents')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'agents'
                ? 'bg-surface-4 text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Meet Agents
          </button>
        </div>

        {/* Content based on view mode */}
        <AnimatePresence mode="wait">
          {viewMode === 'quick' ? (
            <motion.div
              key="quick"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <PresetSuggestions onSelect={onSend} />
            </motion.div>
          ) : (
            <motion.div
              key="agents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <AgentCarousel
                onSelectPreset={onSend}
                onMentionInsert={handleMentionInsert}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom hint */}
        <div className="mt-6 pt-4 border-t border-border-subtle">
          <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
            <AtSign className="h-3 w-3" />
            <span>
              Pro tip: Type{' '}
              <code className="px-1.5 py-0.5 bg-surface-3 rounded text-[10px] font-mono">
                @
              </code>{' '}
              to mention a specific agent
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
