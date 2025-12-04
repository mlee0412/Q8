/**
 * Sync Health Manager
 * Observable state management for sync status
 */

import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs';
import type {
  SyncHealth,
  SyncState,
  SyncError,
  CollectionSyncHealth,
} from './types';
import { DEFAULT_SYNC_HEALTH } from './types';

/**
 * Manages sync health state and provides observable updates
 */
export class SyncHealthManager {
  private health$: BehaviorSubject<SyncHealth>;

  constructor(initialHealth: SyncHealth = DEFAULT_SYNC_HEALTH) {
    this.health$ = new BehaviorSubject<SyncHealth>({
      ...initialHealth,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    });

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  // ===========================================================================
  // OBSERVABLES
  // ===========================================================================

  /**
   * Get the full health state observable
   */
  getHealth(): Observable<SyncHealth> {
    return this.health$.asObservable();
  }

  /**
   * Get current health value (snapshot)
   */
  getCurrentHealth(): SyncHealth {
    return this.health$.getValue();
  }

  /**
   * Get sync state observable
   */
  getState(): Observable<SyncState> {
    return this.health$.pipe(
      map((h: SyncHealth) => h.state),
      distinctUntilChanged()
    );
  }

  /**
   * Get online status observable
   */
  getOnlineStatus(): Observable<boolean> {
    return this.health$.pipe(
      map((h: SyncHealth) => h.isOnline),
      distinctUntilChanged()
    );
  }

  /**
   * Get pending count observable
   */
  getPendingCount(): Observable<number> {
    return this.health$.pipe(
      map((h: SyncHealth) => h.pendingPushCount),
      distinctUntilChanged()
    );
  }

  /**
   * Get circuit breaker status observable
   */
  getCircuitBreakerStatus(): Observable<boolean> {
    return this.health$.pipe(
      map((h: SyncHealth) => h.circuitBreakerOpen),
      distinctUntilChanged()
    );
  }

  // ===========================================================================
  // STATE UPDATES
  // ===========================================================================

  /**
   * Update sync state
   */
  setState(state: SyncState): void {
    this.update({ state });
  }

  /**
   * Mark sync as started
   */
  syncStarted(): void {
    this.update({
      state: 'syncing',
      lastSyncAttempt: new Date(),
    });
  }

  /**
   * Mark sync as completed successfully
   */
  syncCompleted(): void {
    this.update({
      state: 'idle',
      lastSuccessfulSync: new Date(),
      consecutiveFailures: 0,
      lastError: null,
    });
  }

  /**
   * Mark sync as failed
   */
  syncFailed(error: SyncError): void {
    const current = this.health$.getValue();
    this.update({
      state: 'error',
      consecutiveFailures: current.consecutiveFailures + 1,
      lastError: error,
    });
  }

  /**
   * Update pending operation count
   */
  setPendingCount(count: number): void {
    this.update({ pendingPushCount: count });
  }

  /**
   * Increment pending count
   */
  incrementPending(by: number = 1): void {
    const current = this.health$.getValue();
    this.update({ pendingPushCount: current.pendingPushCount + by });
  }

  /**
   * Decrement pending count
   */
  decrementPending(by: number = 1): void {
    const current = this.health$.getValue();
    this.update({ pendingPushCount: Math.max(0, current.pendingPushCount - by) });
  }

  /**
   * Update failed count
   */
  setFailedCount(count: number): void {
    this.update({ failedPushCount: count });
  }

  // ===========================================================================
  // CIRCUIT BREAKER
  // ===========================================================================

  /**
   * Open the circuit breaker
   */
  openCircuitBreaker(resetAt: Date): void {
    this.update({
      circuitBreakerOpen: true,
      circuitBreakerResetAt: resetAt,
    });
  }

  /**
   * Close the circuit breaker
   */
  closeCircuitBreaker(): void {
    this.update({
      circuitBreakerOpen: false,
      circuitBreakerResetAt: null,
      consecutiveFailures: 0,
    });
  }

  /**
   * Check if circuit breaker should open based on consecutive failures
   */
  shouldOpenCircuitBreaker(threshold: number): boolean {
    const current = this.health$.getValue();
    return current.consecutiveFailures >= threshold;
  }

  // ===========================================================================
  // COLLECTION HEALTH
  // ===========================================================================

  /**
   * Update collection-specific health
   */
  updateCollectionHealth(name: string, update: Partial<CollectionSyncHealth>): void {
    const current = this.health$.getValue();
    const existing = current.collections[name] || {
      name,
      lastSync: null,
      pendingCount: 0,
      checkpoint: null,
      status: 'pending' as const,
    };

    this.update({
      collections: {
        ...current.collections,
        [name]: { ...existing, ...update },
      },
    });
  }

  /**
   * Mark collection as synced
   */
  collectionSynced(name: string, checkpoint: string): void {
    this.updateCollectionHealth(name, {
      lastSync: new Date(),
      checkpoint,
      status: 'synced',
      pendingCount: 0,
    });
  }

  /**
   * Mark collection as having error
   */
  collectionError(name: string): void {
    this.updateCollectionHealth(name, { status: 'error' });
  }

  /**
   * Update collection pending count
   */
  setCollectionPendingCount(name: string, count: number): void {
    this.updateCollectionHealth(name, {
      pendingCount: count,
      status: count > 0 ? 'pending' : 'synced',
    });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private update(partial: Partial<SyncHealth>): void {
    const current = this.health$.getValue();
    this.health$.next({ ...current, ...partial });
  }

  private handleOnline = (): void => {
    this.update({ isOnline: true, state: 'idle' });
  };

  private handleOffline = (): void => {
    this.update({ isOnline: false, state: 'offline' });
  };

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Clean up event listeners
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.health$.complete();
  }
}

// Singleton instance for the app
let healthManagerInstance: SyncHealthManager | null = null;

export function getSyncHealthManager(): SyncHealthManager {
  if (!healthManagerInstance) {
    healthManagerInstance = new SyncHealthManager();
  }
  return healthManagerInstance;
}

export function destroySyncHealthManager(): void {
  if (healthManagerInstance) {
    healthManagerInstance.destroy();
    healthManagerInstance = null;
  }
}
