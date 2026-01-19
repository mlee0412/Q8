/**
 * Sync Constants
 * Centralized configuration for sync operations
 */

/**
 * Collections that support bidirectional sync with Supabase
 */
export const SYNCABLE_COLLECTIONS = [
  'chat_messages',
  'user_preferences',
  'devices',
  'knowledge_base',
  'github_prs',
  'calendar_events',
  'tasks',
] as const;

export type SyncableCollection = typeof SYNCABLE_COLLECTIONS[number];

/**
 * Default sync configuration
 */
export const SYNC_CONFIG = {
  /** Default batch size for pull/push operations */
  defaultBatchSize: 100,
  /** Polling interval in milliseconds */
  pollingIntervalMs: 10000,
  /** Maximum retry attempts for failed sync operations */
  maxRetries: 3,
  /** Base delay for exponential backoff (ms) */
  retryBaseDelayMs: 1000,
} as const;
