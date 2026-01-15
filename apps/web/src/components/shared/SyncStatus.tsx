'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { formatTimestamp } from '@/lib/utils';

type SyncState = 'online' | 'offline' | 'syncing' | 'error' | 'synced';

interface SyncStatusProps {
  /**
   * Display variant
   * - badge: Small badge with icon only
   * - compact: Icon + status text
   * - detailed: Full status with last sync time
   */
  variant?: 'badge' | 'compact' | 'detailed';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show last sync timestamp
   * @default true for detailed variant, false otherwise
   */
  showTimestamp?: boolean;

  /**
   * Auto-hide when synced
   * @default false
   */
  autoHide?: boolean;

  /**
   * Auto-hide delay in milliseconds
   * @default 3000
   */
  autoHideDelay?: number;
}

export function SyncStatus({
  variant = 'compact',
  className,
  showTimestamp,
  autoHide = false,
  autoHideDelay = 3000,
}: SyncStatusProps) {
  const { state, lastSync, pendingChanges, error } = useSyncStatus();
  const [visible, setVisible] = useState(true);

  // Auto-hide logic for synced state
  useEffect(() => {
    if (autoHide && state === 'synced') {
      const timer = setTimeout(() => setVisible(false), autoHideDelay);
      return () => clearTimeout(timer);
    }
    setVisible(true);
  }, [state, autoHide, autoHideDelay]);

  // Determine display properties based on state
  const config = getSyncConfig(state);
  const shouldShowTimestamp = showTimestamp ?? variant === 'detailed';

  if (!visible && autoHide) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'surface-matte inline-flex items-center gap-2 rounded-full',
          variant === 'badge' && 'px-2 py-1',
          variant === 'compact' && 'px-3 py-1.5',
          variant === 'detailed' && 'px-4 py-2',
          className
        )}
      >
        {/* Icon */}
        <motion.div
          animate={state === 'syncing' ? { rotate: 360 } : {}}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <config.icon
            className={cn(
              'h-4 w-4',
              config.color
            )}
            aria-hidden="true"
          />
        </motion.div>

        {/* Status Text (compact & detailed) */}
        {variant !== 'badge' && (
          <div className="flex flex-col">
            <span className={cn('text-sm font-medium', config.color)} role="status">
              {config.label}
            </span>

            {/* Pending changes indicator */}
            {pendingChanges > 0 && (
              <span className="text-xs text-text-muted">
                {pendingChanges} pending
              </span>
            )}
          </div>
        )}

        {/* Timestamp (detailed only) */}
        {variant === 'detailed' && shouldShowTimestamp && lastSync && (
          <span className="text-xs text-text-muted ml-auto">
            {formatTimestamp(lastSync)}
          </span>
        )}

        {/* Error indicator */}
        {error && variant === 'detailed' && (
          <AlertCircle className="h-4 w-4 text-red-500" aria-label="Error occurred" />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

SyncStatus.displayName = 'SyncStatus';

// Helper: Get configuration for each sync state
function getSyncConfig(state: SyncState) {
  const configs = {
    online: {
      icon: Cloud,
      label: 'Online',
      color: 'text-neon-accent',
    },
    offline: {
      icon: CloudOff,
      label: 'Offline',
      color: 'text-yellow-500',
    },
    syncing: {
      icon: RefreshCw,
      label: 'Syncing',
      color: 'text-blue-500',
    },
    synced: {
      icon: Check,
      label: 'Synced',
      color: 'text-neon-accent',
    },
    error: {
      icon: AlertCircle,
      label: 'Error',
      color: 'text-red-500',
    },
  };

  return configs[state];
}
