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
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSkeleton } from './WidgetSkeleton';

interface WidgetWrapperProps {
  /**
   * Widget title
   */
  title: string;

  /**
   * Icon component to display in header
   */
  icon?: LucideIcon;

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
   * Use glass surface (sparingly) vs matte default
   */
  variant?: 'matte' | 'glass';

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
 * Widget Wrapper v2.0
 *
 * Unified widget chrome with consistent design tokens.
 * Uses matte surfaces by default, glass sparingly for accent.
 *
 * Features:
 * - Header with icon (16px) and title (14px semibold)
 * - Refresh button with timestamp
 * - Settings panel
 * - Loading skeleton (unified style)
 * - Error state with retry
 * - Expand functionality
 * - A11y: Focus rings, keyboard navigation
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
  variant = 'matte',
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

  // Surface class based on variant
  const surfaceClass = variant === 'glass' ? 'glass-panel' : 'surface-matte';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        surfaceClass,
        'flex flex-col overflow-hidden relative w-full',
        isExpanded
          ? 'col-span-1 md:col-span-4 row-span-4 z-50'
          : cn(colSpanClasses[colSpan], rowSpanClasses[rowSpan]),
        className
      )}
    >
      {/* Header - Widget Chrome */}
      <div className="widget-header">
        <div className="widget-header-title">
          {Icon && <Icon className="h-4 w-4 text-neon-primary" />}
          <h3 className="text-heading text-sm">{title}</h3>
        </div>

        <div className="widget-header-actions">
          {/* Last updated indicator */}
          {lastUpdated && !isLoading && (
            <span className="text-caption mr-2">
              {formatLastUpdated(lastUpdated)}
            </span>
          )}

          {/* Header extra content */}
          {headerExtra}

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh"
              className="btn-icon btn-icon-sm focus-ring"
              aria-label="Refresh widget"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
              />
            </button>
          )}

          {/* Settings button */}
          {settingsContent && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
              className="btn-icon btn-icon-sm focus-ring"
              aria-label="Widget settings"
              aria-expanded={showSettings}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Expand button */}
          {expandable && (
            <button
              onClick={handleExpand}
              title={isExpanded ? 'Minimize' : 'Expand'}
              className="btn-icon btn-icon-sm focus-ring"
              aria-label={isExpanded ? 'Minimize widget' : 'Expand widget'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
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
            className="border-b border-border-subtle bg-surface-3/50"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-label">Settings</span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="btn-icon btn-icon-sm focus-ring"
                  aria-label="Close settings"
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
      <div className="widget-content">
        {/* Loading State */}
        {isLoading && (
          <WidgetSkeleton variant={skeletonVariant} className="h-full" />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="empty-state">
            <AlertTriangle className="empty-state-icon text-warning" />
            <p className="empty-state-title">Something went wrong</p>
            <p className="empty-state-description">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="btn-ghost focus-ring mt-2"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Try again
              </button>
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
