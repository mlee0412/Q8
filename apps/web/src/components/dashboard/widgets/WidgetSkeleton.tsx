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
 * Widget Skeleton
 * 
 * Animated loading skeleton for widgets that provides
 * a better UX than spinners by showing the expected content shape.
 */
export function WidgetSkeleton({ 
  variant = 'default',
  listItems = 3,
  className 
}: WidgetSkeletonProps) {
  const shimmer = 'animate-pulse bg-gradient-to-r from-glass-bg via-glass-border to-glass-bg bg-[length:200%_100%]';

  if (variant === 'weather') {
    return (
      <div className={cn('p-4 space-y-4', className)}>
        {/* Location */}
        <div className="flex items-center gap-2">
          <div className={cn('h-4 w-4 rounded', shimmer)} />
          <div className={cn('h-4 w-24 rounded', shimmer)} />
        </div>
        
        {/* Temperature */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className={cn('h-12 w-24 rounded', shimmer)} />
            <div className={cn('h-3 w-20 rounded', shimmer)} />
          </div>
          <div className={cn('h-20 w-20 rounded-full', shimmer)} />
        </div>
        
        {/* Details grid */}
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className={cn('h-8 w-full rounded', shimmer)} />
            </div>
          ))}
        </div>
        
        {/* Forecast */}
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={cn('h-16 flex-1 rounded-lg', shimmer)} />
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
            <div className={cn('h-5 w-5 rounded', shimmer)} />
            <div className={cn('h-4 w-20 rounded', shimmer)} />
          </div>
          <div className={cn('h-6 w-6 rounded', shimmer)} />
        </div>
        
        {/* List items */}
        {[...Array(listItems)].map((_, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={cn('h-14 w-full rounded-lg', shimmer)}
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
          <div className={cn('h-12 w-12 rounded-lg', shimmer)} />
          <div className="flex-1 space-y-2">
            <div className={cn('h-4 w-3/4 rounded', shimmer)} />
            <div className={cn('h-3 w-1/2 rounded', shimmer)} />
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <div className={cn('h-3 w-full rounded', shimmer)} />
          <div className={cn('h-3 w-5/6 rounded', shimmer)} />
          <div className={cn('h-3 w-4/6 rounded', shimmer)} />
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <div className={cn('h-8 flex-1 rounded', shimmer)} />
          <div className={cn('h-8 flex-1 rounded', shimmer)} />
        </div>
      </div>
    );
  }

  if (variant === 'stats') {
    return (
      <div className={cn('p-4 space-y-4', className)}>
        {/* Main stat */}
        <div className="text-center space-y-2">
          <div className={cn('h-16 w-16 mx-auto rounded-full', shimmer)} />
          <div className={cn('h-6 w-24 mx-auto rounded', shimmer)} />
          <div className={cn('h-3 w-32 mx-auto rounded', shimmer)} />
        </div>
        
        {/* Secondary stats */}
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center space-y-1">
              <div className={cn('h-8 w-full rounded', shimmer)} />
              <div className={cn('h-3 w-12 mx-auto rounded', shimmer)} />
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
        <div className={cn('h-5 w-32 rounded', shimmer)} />
        <div className={cn('h-5 w-5 rounded', shimmer)} />
      </div>
      <div className={cn('h-24 w-full rounded-lg', shimmer)} />
      <div className="space-y-2">
        <div className={cn('h-3 w-full rounded', shimmer)} />
        <div className={cn('h-3 w-3/4 rounded', shimmer)} />
      </div>
    </div>
  );
}

WidgetSkeleton.displayName = 'WidgetSkeleton';
