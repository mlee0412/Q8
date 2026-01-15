'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WidgetSkeletonProps {
  /**
   * Type of skeleton to render
   */
  variant?: 'default' | 'weather' | 'list' | 'card' | 'stats';

  /**
   * Number of list items for list variant
   * @default 3
   */
  listItems?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Widget Skeleton v2.0
 *
 * Unified loading skeleton using Q8 Design System.
 * Single consistent animation style across all widgets.
 */
export function WidgetSkeleton({
  variant = 'default',
  listItems = 3,
  className,
}: WidgetSkeletonProps) {
  if (variant === 'weather') {
    return (
      <div className={cn('p-4 space-y-4', className)}>
        {/* Location */}
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-4 rounded" />
          <div className="skeleton h-4 w-24 rounded" />
        </div>

        {/* Temperature */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-12 w-24 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton h-20 w-20 rounded-full" />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="skeleton h-8 w-full rounded" />
            </div>
          ))}
        </div>

        {/* Forecast */}
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-16 flex-1 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('p-4 space-y-3', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="skeleton h-5 w-5 rounded" />
            <div className="skeleton h-4 w-20 rounded" />
          </div>
          <div className="skeleton h-6 w-6 rounded" />
        </div>

        {/* List items */}
        {[...Array(listItems)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="skeleton h-14 w-full rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('p-4 space-y-4', className)}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="skeleton h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-5/6 rounded" />
          <div className="skeleton h-3 w-4/6 rounded" />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <div className="skeleton h-8 flex-1 rounded" />
          <div className="skeleton h-8 flex-1 rounded" />
        </div>
      </div>
    );
  }

  if (variant === 'stats') {
    return (
      <div className={cn('p-4 space-y-4', className)}>
        {/* Main stat */}
        <div className="text-center space-y-2">
          <div className="skeleton h-16 w-16 mx-auto rounded-full" />
          <div className="skeleton h-6 w-24 mx-auto rounded" />
          <div className="skeleton h-3 w-32 mx-auto rounded" />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <div className="skeleton h-8 w-full rounded" />
              <div className="skeleton h-3 w-12 mx-auto rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default skeleton
  return (
    <div className={cn('p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="skeleton h-5 w-32 rounded" />
        <div className="skeleton h-5 w-5 rounded" />
      </div>
      <div className="skeleton h-24 w-full rounded-lg" />
      <div className="space-y-2">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-3/4 rounded" />
      </div>
    </div>
  );
}

WidgetSkeleton.displayName = 'WidgetSkeleton';
