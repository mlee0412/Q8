'use client';

import { useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  RefreshCw,
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { WidgetSkeleton } from './WidgetSkeleton';

interface WidgetWrapperProps {
  /**
   * Widget title
   */
  title: string;

  /**
   * Icon component to display in header
   */
  icon?: React.ComponentType<{ className?: string }>;

  /**
   * Loading state
   */
  isLoading?: boolean;

  /**
   * Skeleton variant for loading state
   */
  skeletonVariant?: 'default' | 'weather' | 'list' | 'card' | 'stats';

  /**
   * Error message to display
   */
  error?: string | null;

  /**
   * Callback to retry failed operation
   */
  onRetry?: () => void;

  /**
   * Callback to refresh data
   */
  onRefresh?: () => void;

  /**
   * Last updated timestamp
   */
  lastUpdated?: Date | null;

  /**
   * Whether refresh is in progress
   */
  isRefreshing?: boolean;

  /**
   * Settings panel content
   */
  settingsContent?: ReactNode;

  /**
   * Show expand button
   */
  expandable?: boolean;

  /**
   * Callback when expanded
   */
  onExpand?: () => void;

  /**
   * Additional header content (right side)
   */
  headerExtra?: ReactNode;

  /**
   * Bento grid column span
   */
  colSpan?: 1 | 2 | 3 | 4;

  /**
   * Bento grid row span
   */
  rowSpan?: 1 | 2 | 3 | 4;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Widget content
   */
  children: ReactNode;
}

/**
 * Widget Wrapper
 *
 * Provides common UI patterns for all widgets:
 * - Header with title and icon
 * - Refresh button with timestamp
 * - Settings panel
 * - Loading skeleton
 * - Error state with retry
 * - Expand functionality
 */
export function WidgetWrapper({
  title,
  icon: Icon,
  isLoading = false,
  skeletonVariant = 'default',
  error = null,
  onRetry,
  onRefresh,
  lastUpdated,
  isRefreshing = false,
  settingsContent,
  expandable = false,
  onExpand,
  headerExtra,
  colSpan = 1,
  rowSpan = 1,
  className,
  children,
}: WidgetWrapperProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
    onExpand?.();
  }, [isExpanded, onExpand]);

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Map colSpan to Tailwind classes - full width on mobile, specified span on md+
  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

  // Map rowSpan to Tailwind classes
  const rowSpanClasses: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'glass-panel rounded-xl flex flex-col overflow-hidden relative w-full',
        isExpanded ? 'col-span-1 md:col-span-4 row-span-4 z-50' : cn(colSpanClasses[colSpan], rowSpanClasses[rowSpan]),
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-neon-primary" />}
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>

        <div className="flex items-center gap-1">
          {/* Last updated indicator */}
          {lastUpdated && !isLoading && (
            <span className="text-xs text-muted-foreground mr-2">
              {formatLastUpdated(lastUpdated)}
            </span>
          )}

          {/* Header extra content */}
          {headerExtra}

          {/* Refresh button */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
              />
            </Button>
          )}

          {/* Settings button */}
          {settingsContent && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Expand button */}
          {expandable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleExpand}
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && settingsContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-glass-border bg-glass-bg/50"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Settings</span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded hover:bg-glass-bg"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {settingsContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Loading State */}
        {isLoading && (
          <WidgetSkeleton variant={skeletonVariant} className="h-full" />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-4">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            {onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                <RefreshCw className="h-3 w-3 mr-2" />
                Try again
              </Button>
            )}
          </div>
        )}

        {/* Normal Content */}
        {!isLoading && !error && children}
      </div>
    </motion.div>
  );
}

WidgetWrapper.displayName = 'WidgetWrapper';
