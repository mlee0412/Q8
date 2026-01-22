/**
 * RxDB ↔ Supabase Sync Protocol Types
 * Based on expert panel specification v2.0
 */

// =============================================================================
// SYNC METADATA
// =============================================================================

/**
 * Metadata added to all synced entities
 */
export interface SyncMetadata {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isDeleted: boolean;
  logicalClock: number;
  originDeviceId: string;
}

/**
 * Local-only sync tracking fields (not sent to server)
 */
export interface LocalSyncFields {
  _syncStatus: SyncStatus;
  _lastSyncAttempt: string | null;
  _syncError: string | null;
}

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

/**
 * Entity with both sync metadata and local tracking
 */
export type SyncedEntity<T> = T & SyncMetadata & LocalSyncFields;

// =============================================================================
// COLLECTION CONFIGURATION
// =============================================================================

export type SyncDirection = 'bidirectional' | 'pull-only' | 'push-only';
export type ConflictStrategy = 'last-write-wins' | 'field-merge' | 'server-wins' | 'client-wins';
export type SyncPriority = 'high' | 'medium' | 'low';

export interface CollectionSyncConfig {
  name: string;
  direction: SyncDirection;
  conflictStrategy: ConflictStrategy;
  pullInterval?: number;
  batchSize: number;
  priority: SyncPriority;
  enabled: boolean;
}

/**
 * Default sync configurations per collection
 */
export const SYNC_CONFIGS: CollectionSyncConfig[] = [
  {
    name: 'chat_messages',
    direction: 'bidirectional',
    conflictStrategy: 'last-write-wins',
    batchSize: 50,
    priority: 'high',
    enabled: true,
  },
  {
    name: 'tasks',
    direction: 'bidirectional',
    conflictStrategy: 'last-write-wins',
    batchSize: 100,
    priority: 'high',
    enabled: true,
  },
  {
    name: 'notes',
    direction: 'bidirectional',
    conflictStrategy: 'last-write-wins',
    batchSize: 20,
    priority: 'high',
    enabled: true,
  },
  {
    name: 'note_folders',
    direction: 'bidirectional',
    conflictStrategy: 'last-write-wins',
    batchSize: 50,
    priority: 'medium',
    enabled: true,
  },
  {
    name: 'threads',
    direction: 'bidirectional',
    conflictStrategy: 'last-write-wins',
    batchSize: 50,
    priority: 'medium',
    enabled: true,
  },
  {
    name: 'agent_memories',
    direction: 'bidirectional',
    conflictStrategy: 'last-write-wins',
    batchSize: 50,
    priority: 'medium',
    enabled: true,
  },
  {
    name: 'user_preferences',
    direction: 'bidirectional',
    conflictStrategy: 'field-merge',
    batchSize: 1,
    priority: 'medium',
    enabled: true,
  },
  {
    name: 'devices',
    direction: 'pull-only',
    conflictStrategy: 'server-wins',
    pullInterval: 30000,
    batchSize: 50,
    priority: 'low',
    enabled: true,
  },
  {
    name: 'github_prs',
    direction: 'pull-only',
    conflictStrategy: 'server-wins',
    pullInterval: 60000,
    batchSize: 100,
    priority: 'low',
    enabled: true,
  },
  {
    name: 'calendar_events',
    direction: 'pull-only',
    conflictStrategy: 'server-wins',
    pullInterval: 60000,
    batchSize: 200,
    priority: 'medium',
    enabled: true,
  },
  {
    name: 'knowledge_base',
    direction: 'push-only',
    conflictStrategy: 'client-wins',
    batchSize: 10,
    priority: 'low',
    enabled: true,
  },
];

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

export type OperationType = 'create' | 'update' | 'delete';

export interface QueuedOperation<T = unknown> {
  id: string;
  collection: string;
  operation: OperationType;
  item: T;
  queuedAt: string;
  attempts: number;
  lastAttempt: string | null;
  lastError: SyncError | null;
  status: QueueStatus;
}

export type QueueStatus = 'pending' | 'in-progress' | 'failed' | 'dead-letter';

// =============================================================================
// SYNC RESULTS
// =============================================================================

export interface SyncPushResult<T> {
  succeeded: T[];
  failed: Array<{ item: T; error: SyncError }>;
  serverTimestamp: string;
}

export interface SyncPullResult<T> {
  items: T[];
  deletedIds: string[];
  checkpoint: string;
  hasMore: boolean;
}

export interface ConflictResolution<T> {
  winner: T;
  loser: T | null;
  strategy: ConflictStrategy;
  shouldLog: boolean;
}

// =============================================================================
// HEALTH & STATE
// =============================================================================

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncHealth {
  state: SyncState;
  isOnline: boolean;
  lastSuccessfulSync: Date | null;
  lastSyncAttempt: Date | null;
  pendingPushCount: number;
  failedPushCount: number;
  consecutiveFailures: number;
  circuitBreakerOpen: boolean;
  circuitBreakerResetAt: Date | null;
  collections: Record<string, CollectionSyncHealth>;
  lastError: SyncError | null;
}

export interface CollectionSyncHealth {
  name: string;
  lastSync: Date | null;
  pendingCount: number;
  checkpoint: string | null;
  status: 'synced' | 'pending' | 'error' | 'disabled';
}

export const DEFAULT_SYNC_HEALTH: SyncHealth = {
  state: 'idle',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSuccessfulSync: null,
  lastSyncAttempt: null,
  pendingPushCount: 0,
  failedPushCount: 0,
  consecutiveFailures: 0,
  circuitBreakerOpen: false,
  circuitBreakerResetAt: null,
  collections: {},
  lastError: null,
};

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
  ignoredErrors: SyncErrorCode[];
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxAttempts: 1,
  ignoredErrors: ['CONFLICT', 'VALIDATION_ERROR'],
};

// =============================================================================
// PUSH QUEUE
// =============================================================================

export interface PushQueueConfig {
  batchSize: number;
  batchDelayMs: number;
  maxRetries: number;
  retryBackoff: RetryBackoffConfig;
  partialFailureStrategy: 'skip-and-continue' | 'halt-queue';
}

export interface RetryBackoffConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
}

export const DEFAULT_PUSH_QUEUE_CONFIG: PushQueueConfig = {
  batchSize: 50,
  batchDelayMs: 100,
  maxRetries: 3,
  retryBackoff: {
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    multiplier: 2,
  },
  partialFailureStrategy: 'skip-and-continue',
};

// =============================================================================
// ERRORS
// =============================================================================

export type SyncErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED'
  | 'VALIDATION_ERROR'
  | 'RLS_VIOLATION'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'STORAGE_FULL'
  | 'CHECKPOINT_CORRUPTED'
  | 'QUEUE_OVERFLOW'
  | 'CIRCUIT_OPEN'
  | 'UNKNOWN_ERROR';

export interface SyncError {
  code: SyncErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  timestamp: string;
}

export function createSyncError(
  code: SyncErrorCode,
  message: string,
  details?: Record<string, unknown>
): SyncError {
  const retryableCodes: SyncErrorCode[] = ['NETWORK_ERROR', 'TIMEOUT', 'UNKNOWN_ERROR'];
  return {
    code,
    message,
    details,
    retryable: retryableCodes.includes(code),
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// CONFLICT LOG
// =============================================================================

export interface ConflictLogEntry<T = unknown> {
  id: string;
  collection: string;
  localVersion: T;
  remoteVersion: T;
  resolvedVersion: T;
  strategy: ConflictStrategy;
  resolvedAt: string;
  canUndo: boolean;
}

// =============================================================================
// CHECKPOINT
// =============================================================================

export interface SyncCheckpoint {
  collection: string;
  lastPulledAt: string;
  lastPushedAt: string;
  serverVersion: string | null;
}

// =============================================================================
// DEVICE
// =============================================================================

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: string;
  lastSeen: string;
}

/**
 * Generate a unique device ID for this browser/device
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  const storageKey = 'q8_device_id';
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
}
