'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  Bell,
  Calendar,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  X,
  RefreshCw,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProactiveSuggestion } from '@/lib/memory/types';

interface SuggestionsWidgetProps {
  /**
   * User ID
   */
  userId: string;

  /**
   * Session ID
   */
  sessionId: string;

  /**
   * Callback when a suggestion is clicked
   */
  onSuggestionClick?: (action: { type: string; payload: string }) => void;

  /**
   * Pending tasks count
   */
  pendingTasks?: number;

  /**
   * Upcoming events count
   */
  upcomingEvents?: number;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Compact mode (for sidebar)
   */
  compact?: boolean;
}

/**
 * Get icon for suggestion type
 */
function getSuggestionIcon(type: ProactiveSuggestion['type']) {
  const icons = {
    reminder: Bell,
    recommendation: Lightbulb,
    'follow-up': MessageSquare,
    alert: AlertTriangle,
    tip: Sparkles,
  };
  return icons[type] || Lightbulb;
}

/**
 * Get color for suggestion priority
 */
function getPriorityColor(priority: ProactiveSuggestion['priority']) {
  const colors = {
    high: 'border-red-500/30 bg-red-500/10',
    medium: 'border-yellow-500/30 bg-yellow-500/10',
    low: 'border-blue-500/30 bg-blue-500/10',
  };
  return colors[priority];
}

/**
 * SuggestionsWidget Component
 *
 * Shows proactive suggestions based on context
 */
export function SuggestionsWidget({
  userId,
  sessionId,
  onSuggestionClick,
  pendingTasks = 0,
  upcomingEvents = 0,
  className,
  compact = false,
}: SuggestionsWidgetProps) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  /**
   * Fetch suggestions
   */
  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId,
          pendingTasks,
          upcomingEvents,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setQuickActions(data.quickActions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, sessionId, pendingTasks, upcomingEvents]);

  // Fetch on mount and periodically
  useEffect(() => {
    fetchSuggestions();

    // Refresh every 5 minutes
    const interval = setInterval(fetchSuggestions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSuggestions]);

  /**
   * Dismiss a suggestion
   */
  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set([...prev, id]));
  };

  /**
   * Handle suggestion click
   */
  const handleClick = (suggestion: ProactiveSuggestion) => {
    if (suggestion.action && onSuggestionClick) {
      onSuggestionClick(suggestion.action);
    }
  };

  /**
   * Handle quick action click
   */
  const handleQuickAction = (action: string) => {
    if (onSuggestionClick) {
      onSuggestionClick({ type: 'message', payload: action });
    }
  };

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(s => !dismissedIds.has(s.id));

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-1">
          {quickActions.slice(0, 3).map((action, index) => (
            <button
              key={index}
              onClick={() => handleQuickAction(action)}
              className="px-2 py-1 text-xs rounded-full bg-glass-bg hover:bg-neon-primary/20 transition-colors"
            >
              {action.slice(0, 20)}...
            </button>
          ))}
        </div>

        {/* Top suggestion */}
        {visibleSuggestions.length > 0 && (() => {
          const topSuggestion = visibleSuggestions[0]!;
          const Icon = getSuggestionIcon(topSuggestion.type);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg border cursor-pointer',
                getPriorityColor(topSuggestion.priority)
              )}
              onClick={() => handleClick(topSuggestion)}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs truncate flex-1">
                {topSuggestion.title}
              </span>
            </motion.div>
          );
        })()}
      </div>
    );
  }

  return (
    <div className={cn('glass-panel rounded-xl p-3 flex flex-col h-full overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-neon-primary" />
          <h3 className="font-semibold text-sm">Suggestions</h3>
        </div>
        <button
          onClick={fetchSuggestions}
          className="p-1 rounded-lg hover:bg-glass-bg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="mb-2 flex-shrink-0">
          <p className="text-[10px] text-muted-foreground mb-1">Quick Actions</p>
          <div className="flex flex-wrap gap-1">
            {quickActions.slice(0, 2).map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                className="px-2 py-1 text-xs rounded-full bg-glass-bg hover:bg-neon-primary/20 border border-glass-border hover:border-neon-primary/30 transition-colors truncate max-w-[120px]"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        <AnimatePresence>
          {visibleSuggestions.slice(0, 3).map((suggestion) => {
            const Icon = getSuggestionIcon(suggestion.type);
            
            return (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  'flex items-start gap-2 p-2 rounded-lg border cursor-pointer group',
                  'hover:bg-glass-bg/50 transition-colors',
                  getPriorityColor(suggestion.priority)
                )}
                onClick={() => handleClick(suggestion)}
              >
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-medium text-xs truncate">{suggestion.title}</h4>
                    <button
                      onClick={(e) => handleDismiss(suggestion.id, e)}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-bg transition-all flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {suggestion.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {visibleSuggestions.length === 0 && !isLoading && (
          <div className="text-center py-2 text-xs text-muted-foreground">
            No suggestions right now
          </div>
        )}

        {/* Loading state */}
        {isLoading && suggestions.length === 0 && (
          <div className="text-center py-2">
            <RefreshCw className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

SuggestionsWidget.displayName = 'SuggestionsWidget';
