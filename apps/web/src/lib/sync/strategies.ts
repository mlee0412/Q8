/**
 * Sync Strategies
 * Conflict resolution and sync direction handling per collection
 */

import type {
  SyncMetadata,
  ConflictResolution,
  ConflictStrategy,
  SyncPushResult,
  SyncPullResult,
  SyncError,
  CollectionSyncConfig,
} from './types';
import { createSyncError, getOrCreateDeviceId } from './types';

// =============================================================================
// STRATEGY INTERFACE
// =============================================================================

export interface SyncStrategy<T extends SyncMetadata> {
  /**
   * Resolve conflict between local and remote versions
   */
  resolveConflict(local: T, remote: T): ConflictResolution<T>;

  /**
   * Prepare item for pushing to server
   */
  prepareForPush(item: T): T;

  /**
   * Process item received from server
   */
  processFromPull(item: T): T;
}

// =============================================================================
// LAST WRITE WINS STRATEGY
// =============================================================================

export class LastWriteWinsStrategy<T extends SyncMetadata> implements SyncStrategy<T> {
  resolveConflict(local: T, remote: T): ConflictResolution<T> {
    // Handle delete conflicts
    if (local.isDeleted !== remote.isDeleted) {
      return this.resolveDeleteConflict(local, remote);
    }

    // Compare logical clocks first (more accurate than wall clock)
    if (local.logicalClock !== remote.logicalClock) {
      const winner = local.logicalClock > remote.logicalClock ? local : remote;
      const loser = winner === local ? remote : local;
      return {
        winner,
        loser,
        strategy: 'last-write-wins',
        shouldLog: true,
      };
    }

    // Fall back to wall clock if logical clocks are equal
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();

    // If timestamps are equal, prefer remote (server is source of truth for ties)
    const winner = localTime > remoteTime ? local : remote;
    const loser = winner === local ? remote : local;

    return {
      winner,
      loser,
      strategy: 'last-write-wins',
      shouldLog: localTime !== remoteTime,
    };
  }

  private resolveDeleteConflict(local: T, remote: T): ConflictResolution<T> {
    // If one is deleted and one is not, compare the delete time vs update time
    const localActionTime = local.isDeleted
      ? new Date(local.deletedAt || local.updatedAt).getTime()
      : new Date(local.updatedAt).getTime();

    const remoteActionTime = remote.isDeleted
      ? new Date(remote.deletedAt || remote.updatedAt).getTime()
      : new Date(remote.updatedAt).getTime();

    // Latest action wins
    if (localActionTime >= remoteActionTime) {
      return {
        winner: local,
        loser: remote,
        strategy: 'last-write-wins',
        shouldLog: true,
      };
    } else {
      return {
        winner: remote,
        loser: local,
        strategy: 'last-write-wins',
        shouldLog: true,
      };
    }
  }

  prepareForPush(item: T): T {
    return {
      ...item,
      logicalClock: item.logicalClock + 1,
      originDeviceId: getOrCreateDeviceId(),
      updatedAt: new Date().toISOString(),
    };
  }

  processFromPull(item: T): T {
    return item;
  }
}

// =============================================================================
// FIELD MERGE STRATEGY
// =============================================================================

/**
 * Merges fields from both versions, preferring more recently updated fields
 * Useful for settings/preferences where different fields may be updated independently
 */
export class FieldMergeStrategy<T extends SyncMetadata> implements SyncStrategy<T> {
  private fieldTimestamps: Map<string, Map<string, string>> = new Map();

  resolveConflict(local: T, remote: T): ConflictResolution<T> {
    // Start with remote as base
    const merged = { ...remote } as T;
    let hasLocalChanges = false;

    // Get stored field timestamps for this item
    const localFieldTimes = this.fieldTimestamps.get(local.id) || new Map();

    // Merge each field based on most recent update
    for (const key of Object.keys(local) as Array<keyof T>) {
      // Skip internal fields
      if (String(key).startsWith('_')) continue;
      if (['id', 'userId', 'createdAt', 'logicalClock', 'originDeviceId'].includes(String(key))) continue;

      const localValue = local[key];
      const remoteValue = remote[key];

      // If values are different, check which is newer
      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        const localFieldTime = localFieldTimes.get(String(key)) || local.updatedAt;
        const remoteFieldTime = remote.updatedAt;

        if (new Date(localFieldTime).getTime() > new Date(remoteFieldTime).getTime()) {
          (merged as Record<string, unknown>)[String(key)] = localValue;
          hasLocalChanges = true;
        }
      }
    }

    // Update timestamps
    merged.updatedAt = new Date().toISOString();
    merged.logicalClock = Math.max(local.logicalClock, remote.logicalClock) + 1;

    return {
      winner: merged,
      loser: hasLocalChanges ? remote : local,
      strategy: 'field-merge',
      shouldLog: hasLocalChanges,
    };
  }

  /**
   * Track when a field was last updated locally
   */
  trackFieldUpdate(itemId: string, field: string): void {
    if (!this.fieldTimestamps.has(itemId)) {
      this.fieldTimestamps.set(itemId, new Map());
    }
    this.fieldTimestamps.get(itemId)!.set(field, new Date().toISOString());
  }

  prepareForPush(item: T): T {
    return {
      ...item,
      logicalClock: item.logicalClock + 1,
      originDeviceId: getOrCreateDeviceId(),
      updatedAt: new Date().toISOString(),
    };
  }

  processFromPull(item: T): T {
    return item;
  }
}

// =============================================================================
// SERVER WINS STRATEGY
// =============================================================================

/**
 * Server always wins - used for pull-only collections
 * Local changes are discarded in favor of server data
 */
export class ServerWinsStrategy<T extends SyncMetadata> implements SyncStrategy<T> {
  resolveConflict(local: T, remote: T): ConflictResolution<T> {
    return {
      winner: remote,
      loser: local,
      strategy: 'server-wins',
      shouldLog: false,
    };
  }

  prepareForPush(item: T): T {
    // Pull-only collections shouldn't push, but just in case
    throw new Error('ServerWinsStrategy does not support push operations');
  }

  processFromPull(item: T): T {
    return item;
  }
}

// =============================================================================
// CLIENT WINS STRATEGY
// =============================================================================

/**
 * Client always wins - used for push-only collections
 * Server data is overwritten by local changes
 */
export class ClientWinsStrategy<T extends SyncMetadata> implements SyncStrategy<T> {
  resolveConflict(local: T, remote: T): ConflictResolution<T> {
    return {
      winner: local,
      loser: remote,
      strategy: 'client-wins',
      shouldLog: false,
    };
  }

  prepareForPush(item: T): T {
    return {
      ...item,
      logicalClock: item.logicalClock + 1,
      originDeviceId: getOrCreateDeviceId(),
      updatedAt: new Date().toISOString(),
    };
  }

  processFromPull(item: T): T {
    // Push-only collections shouldn't pull, but just in case
    throw new Error('ClientWinsStrategy does not support pull operations');
  }
}

// =============================================================================
// STRATEGY FACTORY
// =============================================================================

const strategyCache = new Map<string, SyncStrategy<SyncMetadata>>();

export function getStrategy<T extends SyncMetadata>(
  config: CollectionSyncConfig
): SyncStrategy<T> {
  const cacheKey = `${config.name}_${config.conflictStrategy}`;

  if (!strategyCache.has(cacheKey)) {
    let strategy: SyncStrategy<SyncMetadata>;

    switch (config.conflictStrategy) {
      case 'last-write-wins':
        strategy = new LastWriteWinsStrategy();
        break;
      case 'field-merge':
        strategy = new FieldMergeStrategy();
        break;
      case 'server-wins':
        strategy = new ServerWinsStrategy();
        break;
      case 'client-wins':
        strategy = new ClientWinsStrategy();
        break;
      default:
        strategy = new LastWriteWinsStrategy();
    }

    strategyCache.set(cacheKey, strategy);
  }

  return strategyCache.get(cacheKey) as SyncStrategy<T>;
}

// =============================================================================
// CONFLICT LOGGING
// =============================================================================

export interface ConflictLog<T = unknown> {
  id: string;
  collection: string;
  localVersion: T;
  remoteVersion: T;
  resolvedVersion: T;
  strategy: ConflictStrategy;
  resolvedAt: string;
  originDevice: string;
}

const conflictLogs: ConflictLog[] = [];
const MAX_CONFLICT_LOGS = 100;

export function logConflict<T extends SyncMetadata>(
  collection: string,
  resolution: ConflictResolution<T>,
  local: T,
  remote: T
): void {
  if (!resolution.shouldLog) return;

  const log: ConflictLog<T> = {
    id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    collection,
    localVersion: local,
    remoteVersion: remote,
    resolvedVersion: resolution.winner,
    strategy: resolution.strategy,
    resolvedAt: new Date().toISOString(),
    originDevice: getOrCreateDeviceId(),
  };

  conflictLogs.unshift(log);

  // Keep only recent conflicts
  if (conflictLogs.length > MAX_CONFLICT_LOGS) {
    conflictLogs.pop();
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Sync] Conflict resolved:', {
      collection,
      strategy: resolution.strategy,
      winner: resolution.winner.id,
      loser: resolution.loser?.id,
    });
  }
}

export function getConflictLogs(): ConflictLog[] {
  return [...conflictLogs];
}

export function clearConflictLogs(): void {
  conflictLogs.length = 0;
}

// =============================================================================
// LOGICAL CLOCK UTILITIES
// =============================================================================

let globalLogicalClock = 0;

/**
 * Get the next logical clock value
 */
export function getNextLogicalClock(): number {
  return ++globalLogicalClock;
}

/**
 * Update the global logical clock based on received value
 */
export function updateLogicalClock(received: number): number {
  globalLogicalClock = Math.max(globalLogicalClock, received) + 1;
  return globalLogicalClock;
}

/**
 * Initialize logical clock from stored value
 */
export function initializeLogicalClock(stored: number): void {
  globalLogicalClock = stored;
}
