'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface OfflineIndicatorProps {
  /**
   * Banner position
   * @default 'top'
   */
  position?: 'top' | 'bottom';

  /**
   * Show retry button
   * @default true
   */
  showRetry?: boolean;

  /**
   * Auto-dismiss delay when back online (ms)
   * @default 3000
   */
  dismissDelay?: number;

  /**
   * Custom offline message
   */
  offlineMessage?: string;

  /**
   * Custom online message
   */
  onlineMessage?: string;

  /**
   * Show pending changes count
   * @default true
   */
  showPendingCount?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * OfflineIndicator component for displaying network status
 *
 * Shows a banner when the application goes offline, with optional retry
 * functionality and pending changes counter. Auto-dismisses when reconnected.
 *
 * @example
 * ```tsx
 * // Basic usage in root layout
 * <OfflineIndicator />
 *
 * // Bottom position with custom messages
 * <OfflineIndicator
 *   position="bottom"
 *   offlineMessage="You're offline - changes will sync when reconnected"
 *   onlineMessage="Connection restored!"
 * />
 * ```
 */
export function OfflineIndicator({
  position = 'top',
  showRetry = true,
  dismissDelay = 3000,
  offlineMessage = 'No internet connection',
  onlineMessage = 'Back online',
  showPendingCount = true,
  className,
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);

  useEffect(() => {
    // Set initial online state
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);

      // Auto-dismiss success message
      setTimeout(() => {
        setJustReconnected(false);
      }, dismissDelay);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // TODO: Subscribe to pending changes from RxDB
    // This would connect to your sync service to get pending count
    // Example:
    // const subscription = db.pending$.subscribe({
    //   next: (count) => setPendingChanges(count),
    // });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // subscription?.unsubscribe();
    };
  }, [dismissDelay]);

  // Handle manual retry
  const handleRetry = async () => {
    // Trigger manual sync attempt
    try {
      // TODO: Implement manual sync trigger
      // await db.sync();
    } catch (error) {
      console.error('Sync retry failed:', error);
    }
  };

  // Don't show anything if online and not just reconnected
  if (isOnline && !justReconnected) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed left-0 right-0 z-50 mx-auto max-w-2xl px-4',
          position === 'top' ? 'top-4' : 'bottom-4',
          className
        )}
        role="status"
        aria-live="polite"
      >
        <div
          className={cn(
            'glass-panel rounded-xl p-4 shadow-lg border',
            isOnline
              ? 'border-neon-accent/50 bg-neon-accent/10'
              : 'border-yellow-500/50 bg-yellow-500/10'
          )}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Icon & Message */}
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-neon-accent" aria-hidden="true" />
              ) : (
                <WifiOff className="h-5 w-5 text-yellow-500" aria-hidden="true" />
              )}

              <div>
                <p
                  className={cn(
                    'font-medium',
                    isOnline ? 'text-neon-accent' : 'text-yellow-500'
                  )}
                >
                  {isOnline ? onlineMessage : offlineMessage}
                </p>

                {!isOnline && showPendingCount && pendingChanges > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {pendingChanges} pending {pendingChanges === 1 ? 'change' : 'changes'}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isOnline && showRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="text-yellow-500 hover:text-yellow-400"
                aria-label="Retry synchronization"
              >
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

OfflineIndicator.displayName = 'OfflineIndicator';
