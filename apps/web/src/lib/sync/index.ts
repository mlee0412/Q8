/**
 * RxDB ↔ Supabase Sync Module
 *
 * Provides bidirectional synchronization between local RxDB (IndexedDB)
 * and remote Supabase (PostgreSQL) with:
 * - Offline-first architecture
 * - Conflict resolution strategies
 * - Circuit breaker for resilience
 * - Real-time subscriptions
 * - Persistent push queue
 */

import { logger } from '@/lib/logger';

// Types
export * from './types';

// Health Management
export {
  SyncHealthManager,
  getSyncHealthManager,
  destroySyncHealthManager,
} from './health';

// Push Queue
export {
  PushQueueManager,
  getPushQueueManager,
  destroyPushQueueManager,
  type QueueStats,
} from './queue';

// Sync Strategies
export {
  type SyncStrategy,
  LastWriteWinsStrategy,
  FieldMergeStrategy,
  ServerWinsStrategy,
  ClientWinsStrategy,
  getStrategy,
  logConflict,
  getConflictLogs,
  clearConflictLogs,
  getNextLogicalClock,
  updateLogicalClock,
  initializeLogicalClock,
} from './strategies';

// Sync Engine
export {
  SyncEngine,
  type SyncEngineConfig,
  initSyncEngine,
  getSyncEngine,
  destroySyncEngine,
} from './engine';

// Legacy exports for backwards compatibility
export { pullChanges, pullAllCollections } from './pull';
export { pushChanges, pushAllCollections } from './push';

/**
 * @deprecated Use initSyncEngine instead
 */
export function startSync(
  db: import('rxdb').RxDatabase,
  config: { interval?: number; pullOnStart?: boolean; pushOnStart?: boolean } = {}
) {
  logger.warn('startSync is deprecated. Use initSyncEngine for the new sync system.', { module: 'sync' });

  const {
    interval = 30000,
    pullOnStart = true,
    pushOnStart = false,
  } = config;

  // Fall back to legacy behavior
  const { pullAllCollections } = require('./pull');
  const { pushAllCollections } = require('./push');

  if (pullOnStart) {
    pullAllCollections(db).catch((error: unknown) => logger.error('Initial pull failed', { module: 'sync', error }));
  }
  if (pushOnStart) {
    pushAllCollections(db).catch((error: unknown) => logger.error('Initial push failed', { module: 'sync', error }));
  }

  const syncInterval = setInterval(async () => {
    try {
      await pullAllCollections(db);
      await pushAllCollections(db);
    } catch (error) {
      logger.error('Sync error', { module: 'sync', error });
    }
  }, interval);

  return () => {
    clearInterval(syncInterval);
  };
}
