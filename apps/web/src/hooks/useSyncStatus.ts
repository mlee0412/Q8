'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSyncHealthManager, type SyncHealth, type SyncState } from '@/lib/sync';

type SimpleSyncState = 'online' | 'offline' | 'syncing' | 'error' | 'synced';

interface SyncStatusData {
  /** Current sync state for UI display */
  state: SimpleSyncState;
  /** Last successful sync timestamp */
  lastSync: Date | null;
  /** Number of pending changes to push */
  pendingChanges: number;
  /** Last sync error if any */
  error: Error | null;
  /** Whether the device is online */
  isOnline: boolean;
  /** Whether circuit breaker is open */
  circuitBreakerOpen: boolean;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Full health data for advanced use */
  health: SyncHealth | null;
}

/**
 * Hook for monitoring RxDB sync status with Supabase
 *
 * @returns {SyncStatusData} Current sync status data
 *
 * @example
 * ```tsx
 * const { state, lastSync, pendingChanges, isOnline } = useSyncStatus();
 *
 * // Simple usage
 * if (state === 'syncing') {
 *   return <Spinner />;
 * }
 *
 * // Advanced usage
 * const { health, circuitBreakerOpen } = useSyncStatus();
 * if (circuitBreakerOpen) {
 *   return <Alert>Sync temporarily disabled due to errors</Alert>;
 * }
 * ```
 */
export function useSyncStatus(): SyncStatusData {
  const [status, setStatus] = useState<SyncStatusData>({
    state: 'offline',
    lastSync: null,
    pendingChanges: 0,
    error: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    circuitBreakerOpen: false,
    consecutiveFailures: 0,
    health: null,
  });

  useEffect(() => {
    // Get the health manager
    const healthManager = getSyncHealthManager();

    // Subscribe to health updates
    const subscription = healthManager.getHealth().subscribe({
      next: (health) => {
        setStatus({
          state: mapSyncState(health.state, health.isOnline),
          lastSync: health.lastSuccessfulSync,
          pendingChanges: health.pendingPushCount,
          error: health.lastError ? new Error(health.lastError.message) : null,
          isOnline: health.isOnline,
          circuitBreakerOpen: health.circuitBreakerOpen,
          consecutiveFailures: health.consecutiveFailures,
          health,
        });
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return status;
}

/**
 * Map internal sync state to simple UI state
 */
function mapSyncState(state: SyncState, isOnline: boolean): SimpleSyncState {
  if (!isOnline) return 'offline';

  switch (state) {
    case 'syncing':
      return 'syncing';
    case 'error':
      return 'error';
    case 'idle':
      return 'synced';
    case 'offline':
      return 'offline';
    default:
      return 'online';
  }
}

/**
 * Hook for getting sync status of a specific collection
 */
export function useCollectionSyncStatus(collectionName: string) {
  const { health } = useSyncStatus();

  return useMemo(() => {
    if (!health) {
      return {
        status: 'pending' as const,
        lastSync: null,
        pendingCount: 0,
        checkpoint: null,
      };
    }

    return (
      health.collections[collectionName] || {
        name: collectionName,
        status: 'pending' as const,
        lastSync: null,
        pendingCount: 0,
        checkpoint: null,
      }
    );
  }, [health, collectionName]);
}

/**
 * Hook for getting pending operation count
 */
export function usePendingCount(): number {
  const { pendingChanges } = useSyncStatus();
  return pendingChanges;
}

/**
 * Hook for checking online status
 */
export function useOnlineStatus(): boolean {
  const { isOnline } = useSyncStatus();
  return isOnline;
}

/**
 * Hook for checking if sync is healthy
 */
export function useSyncHealthy(): boolean {
  const { state, circuitBreakerOpen, consecutiveFailures } = useSyncStatus();
  return state !== 'error' && !circuitBreakerOpen && consecutiveFailures < 3;
}
