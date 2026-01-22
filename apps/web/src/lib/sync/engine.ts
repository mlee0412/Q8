/**
 * Sync Engine
 * Main orchestrator for RxDB ↔ Supabase synchronization
 */

import type { RxCollection } from 'rxdb';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Q8Database } from '@/lib/db';
import type {
  SyncMetadata,
  CollectionSyncConfig,
  SyncError,
  CircuitBreakerConfig,
  SyncPullResult,
  SyncPushResult,
  LocalSyncFields,
} from './types';
import {
  SYNC_CONFIGS,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  createSyncError,
  getOrCreateDeviceId,
} from './types';
import { FIELD_MAPPINGS, toRxDBFormat, toSupabaseFormat } from './transformers';
import { SyncHealthManager, getSyncHealthManager } from './health';
import { PushQueueManager, getPushQueueManager } from './queue';
import { getStrategy, logConflict, updateLogicalClock } from './strategies';
import { logger } from '@/lib/logger';

// =============================================================================
// SYNC ENGINE
// =============================================================================

export interface SyncEngineConfig {
  supabase: SupabaseClient;
  db: Q8Database;
  userId: string;
  collections?: CollectionSyncConfig[];
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  autoStart?: boolean;
  pullOnStart?: boolean;
  syncInterval?: number;
}

const SNAKE_CASE_COLLECTIONS = new Set(['chat_messages', 'calendar_events']);

export class SyncEngine {
  private supabase: SupabaseClient;
  private db: Q8Database;
  private configs: Map<string, CollectionSyncConfig>;
  private circuitBreakerConfig: CircuitBreakerConfig;
  private healthManager: SyncHealthManager;
  private queueManager: PushQueueManager;
  private realtimeChannels: Map<string, RealtimeChannel>;
  private syncInterval: number;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private deviceId: string;
  private userId: string;

  constructor(config: SyncEngineConfig) {
    this.supabase = config.supabase;
    this.db = config.db;
    if (!config.userId) {
      throw new Error('[SyncEngine] userId is required for explicit scoping.');
    }
    this.userId = config.userId;
    this.syncInterval = config.syncInterval || 30000;
    this.deviceId = getOrCreateDeviceId();

    // Initialize configs
    this.configs = new Map();
    const collections = config.collections || SYNC_CONFIGS;
    for (const col of collections) {
      this.configs.set(col.name, col);
    }

    // Initialize circuit breaker
    this.circuitBreakerConfig = {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      ...config.circuitBreaker,
    };

    // Initialize managers
    this.healthManager = getSyncHealthManager();
    this.queueManager = getPushQueueManager();
    this.realtimeChannels = new Map();

    // Subscribe to queue changes
    this.queueManager.getQueueCount().subscribe((count: number) => {
      this.healthManager.setPendingCount(count);
    });

    // Auto-start if configured
    if (config.autoStart) {
      this.start(config.pullOnStart);
    }
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the sync engine
   */
  async start(pullOnStart: boolean = true): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    // Subscribe to realtime changes
    await this.setupRealtimeSubscriptions();

    // Initial pull if requested
    if (pullOnStart) {
      await this.pullAll();
    }

    // Start periodic sync
    this.syncTimer = setInterval(() => {
      this.sync();
    }, this.syncInterval);
  }

  /**
   * Stop the sync engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Stop periodic sync
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    // Unsubscribe from realtime
    for (const [name, channel] of this.realtimeChannels) {
      await this.supabase.removeChannel(channel);
    }
    this.realtimeChannels.clear();
  }

  /**
   * Perform a full sync (pull then push)
   */
  async sync(): Promise<void> {
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      return;
    }

    // Check online status
    if (!this.healthManager.getCurrentHealth().isOnline) {
      return;
    }

    this.healthManager.syncStarted();

    try {
      // Pull first to get latest from server
      await this.pullAll();

      // Then push local changes
      await this.pushAll();

      this.healthManager.syncCompleted();
    } catch (error) {
      const syncError = this.toSyncError(error);
      this.healthManager.syncFailed(syncError);
      this.checkCircuitBreaker(syncError);
    }
  }

  // ===========================================================================
  // PULL OPERATIONS
  // ===========================================================================

  /**
   * Pull changes for all collections (parallel by priority group)
   */
  async pullAll(): Promise<void> {
    const pullConfigs = Array.from(this.configs.values()).filter(
      (config) => config.enabled && config.direction !== 'push-only'
    );

    // Group by priority for parallel execution within same priority
    type Priority = 'high' | 'medium' | 'low';
    const priorityGroups: Record<Priority, CollectionSyncConfig[]> = {
      high: [],
      medium: [],
      low: [],
    };

    for (const config of pullConfigs) {
      const priority = config.priority as Priority;
      priorityGroups[priority].push(config);
    }

    // Process priority groups sequentially, but collections within each group in parallel
    const priorities: Priority[] = ['high', 'medium', 'low'];
    for (const priority of priorities) {
      const group = priorityGroups[priority];
      if (group.length === 0) continue;

      const results = await Promise.allSettled(
        group.map((config) =>
          this.pullCollection(config.name).catch((error) => {
            logger.error(`[SyncEngine] Pull failed for ${config.name}`, { error });
            this.healthManager.collectionError(config.name);
            throw error;
          })
        )
      );

      // Log any failures (already logged above, but track stats)
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        logger.warn(`[SyncEngine] ${failures.length}/${group.length} ${priority} priority pulls failed`);
      }
    }
  }

  /**
   * Pull changes for a specific collection
   */
  async pullCollection(collectionName: string): Promise<SyncPullResult<SyncMetadata>> {
    const config = this.configs.get(collectionName);
    if (!config) {
      throw new Error(`Unknown collection: ${collectionName}`);
    }

    const collection = this.db[collectionName] as RxCollection;
    if (!collection) {
      throw new Error(`Collection not found in RxDB: ${collectionName}`);
    }

    // Get checkpoint
    const checkpoint = await this.queueManager.getCheckpoint(collectionName);

    // Fetch from Supabase
    let query = this.supabase
      .from(collectionName)
      .select('*')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: true })
      .limit(config.batchSize);

    if (checkpoint) {
      query = query.gt('updated_at', checkpoint);
    }

    const { data, error } = await query;

    if (error) {
      throw createSyncError('NETWORK_ERROR', error.message);
    }

    const rawItems = (data || []) as Record<string, unknown>[];
    const result: SyncPullResult<SyncMetadata> = {
      items: [],
      deletedIds: [],
      checkpoint: checkpoint || new Date(0).toISOString(),
      hasMore: rawItems.length >= config.batchSize,
    };

    // Process each item
    const strategy = getStrategy(config);

    for (const remoteItem of rawItems) {
      // Transform snake_case to camelCase
      const transformed = this.transformFromSupabase(collectionName, remoteItem);

      // Update logical clock
      if (transformed.logicalClock) {
        updateLogicalClock(transformed.logicalClock);
      }

      // Check for local version
      const localDoc = await collection.findOne(transformed.id).exec();

      if (localDoc) {
        const localItem = localDoc.toJSON() as SyncMetadata & LocalSyncFields;

        // Skip if local is pending (will be pushed later)
        if (localItem._syncStatus === 'pending') {
          continue;
        }

        // Resolve conflict
        const resolution = strategy.resolveConflict(localItem, transformed);
        logConflict(collectionName, resolution, localItem, transformed);

        // Apply winner
        await localDoc.incrementalPatch(resolution.winner);
      } else {
        // Insert new item
        await collection.insert({
          ...transformed,
          _syncStatus: 'synced',
          _lastSyncAttempt: new Date().toISOString(),
          _syncError: null,
        });
      }

      // Track deleted items
      if (transformed.isDeleted) {
        result.deletedIds.push(transformed.id);
      } else {
        result.items.push(transformed);
      }

      // Update checkpoint
      if (transformed.updatedAt > result.checkpoint) {
        result.checkpoint = transformed.updatedAt;
      }
    }

    // Save checkpoint
    await this.queueManager.setCheckpoint(collectionName, result.checkpoint);
    this.healthManager.collectionSynced(collectionName, result.checkpoint);

    return result;
  }

  // ===========================================================================
  // PUSH OPERATIONS
  // ===========================================================================

  /**
   * Push all pending changes
   */
  async pushAll(): Promise<void> {
    const pushConfigs = Array.from(this.configs.values()).filter(
      (config) => config.enabled && config.direction !== 'pull-only'
    );

    for (const config of pushConfigs) {
      try {
        await this.pushCollection(config.name);
      } catch (error) {
        logger.error(`[SyncEngine] Push failed for ${config.name}`, { error });
      }
    }
  }

  /**
   * Push pending changes for a specific collection
   */
  async pushCollection(collectionName: string): Promise<SyncPushResult<SyncMetadata>> {
    const config = this.configs.get(collectionName);
    if (!config) {
      throw new Error(`Unknown collection: ${collectionName}`);
    }

    // Get pending operations from queue
    const pendingOps = await this.queueManager.getNextBatch(collectionName);

    if (pendingOps.length === 0) {
      return {
        succeeded: [],
        failed: [],
        serverTimestamp: new Date().toISOString(),
      };
    }

    const result: SyncPushResult<SyncMetadata> = {
      succeeded: [],
      failed: [],
      serverTimestamp: new Date().toISOString(),
    };

    // Process each operation
    for (const op of pendingOps) {
      await this.queueManager.markInProgress(op.id);

      try {
        const item = { ...(op.item as SyncMetadata), userId: this.userId };
        const transformed = this.transformToSupabase(collectionName, item);

        let response;

        switch (op.operation) {
          case 'create':
          case 'update':
            response = await this.supabase
              .from(collectionName)
              .upsert(transformed, { onConflict: 'id' })
              .select()
              .single();
            break;

          case 'delete':
            // Soft delete
            response = await this.supabase
              .from(collectionName)
              .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
              })
              .eq('id', item.id)
              .eq('user_id', this.userId)
              .select()
              .single();
            break;
        }

        if (response.error) {
          throw response.error;
        }

        // Mark as completed
        await this.queueManager.markCompleted(op.id);
        result.succeeded.push(item);

        // Update local sync status
        const collection = this.db[collectionName] as RxCollection;
        const doc = await collection.findOne(item.id).exec();
        if (doc) {
          await doc.incrementalPatch({
            _syncStatus: 'synced',
            _lastSyncAttempt: new Date().toISOString(),
            _syncError: null,
          });
        }
      } catch (error) {
        const syncError = this.toSyncError(error);
        await this.queueManager.markFailed(op.id, syncError);
        result.failed.push({ item: op.item as SyncMetadata, error: syncError });

        // Update local sync status
        const collection = this.db[collectionName] as RxCollection;
        const doc = await collection.findOne((op.item as SyncMetadata).id).exec();
        if (doc) {
          await doc.incrementalPatch({
            _syncStatus: 'error',
            _syncError: syncError.message,
          });
        }
      }
    }

    result.serverTimestamp = new Date().toISOString();
    return result;
  }

  // ===========================================================================
  // REALTIME SUBSCRIPTIONS
  // ===========================================================================

  /**
   * Set up realtime subscriptions for all bidirectional collections
   */
  private async setupRealtimeSubscriptions(): Promise<void> {
    const realtimeConfigs = Array.from(this.configs.values()).filter(
      (config) => config.enabled && config.direction === 'bidirectional'
    );

    for (const config of realtimeConfigs) {
      await this.subscribeToCollection(config.name);
    }
  }

  /**
   * Subscribe to realtime changes for a collection
   */
  private async subscribeToCollection(collectionName: string): Promise<void> {
    const channel = this.supabase
      .channel(`sync_${collectionName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: collectionName,
          filter: `user_id=eq.${this.userId}`,
        },
        async (payload) => {
          await this.handleRealtimeChange(collectionName, payload);
        }
      )
      .subscribe();

    this.realtimeChannels.set(collectionName, channel);
  }

  /**
   * Handle a realtime change event
   */
  private async handleRealtimeChange(
    collectionName: string,
    payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Record<string, unknown> | null;
      old: Record<string, unknown> | null;
    }
  ): Promise<void> {
    const config = this.configs.get(collectionName);
    if (!config) return;

    const collection = this.db[collectionName] as RxCollection;
    if (!collection) return;

    try {
      const rawItem = payload.eventType === 'DELETE' ? payload.old : payload.new;
      if (!rawItem) {
        return;
      }

      // Ignore changes from this device
      if (rawItem.origin_device_id === this.deviceId) {
        return;
      }

      const transformed = this.transformFromSupabase(collectionName, rawItem);
      const strategy = getStrategy(config);

      switch (payload.eventType) {
        case 'INSERT': {
          const existing = await collection.findOne(transformed.id).exec();
          if (!existing) {
            await collection.insert({
              ...transformed,
              _syncStatus: 'synced',
              _lastSyncAttempt: new Date().toISOString(),
              _syncError: null,
            });
          }
          break;
        }

        case 'UPDATE': {
          const doc = await collection.findOne(transformed.id).exec();
          if (doc) {
            const localItem = doc.toJSON() as SyncMetadata & LocalSyncFields;

            // Skip if local is pending
            if (localItem._syncStatus === 'pending') {
              return;
            }

            const resolution = strategy.resolveConflict(localItem, transformed);
            logConflict(collectionName, resolution, localItem, transformed);
            await doc.incrementalPatch(resolution.winner);
          }
          break;
        }

        case 'DELETE': {
          const deletedId = transformed.id;
          const doc = await collection.findOne(deletedId).exec();
          if (doc) {
            await doc.incrementalPatch({
              isDeleted: true,
              deletedAt: new Date().toISOString(),
              _syncStatus: 'synced',
            });
          }
          break;
        }
      }

      // Update logical clock
      if (transformed.logicalClock) {
        updateLogicalClock(transformed.logicalClock);
      }
    } catch (error) {
      logger.error(`[SyncEngine] Realtime handler error for ${collectionName}`, { error });
    }
  }

  // ===========================================================================
  // CIRCUIT BREAKER
  // ===========================================================================

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(): boolean {
    const health = this.healthManager.getCurrentHealth();

    if (!health.circuitBreakerOpen) {
      return false;
    }

    // Check if reset time has passed
    if (health.circuitBreakerResetAt && new Date() >= health.circuitBreakerResetAt) {
      this.healthManager.closeCircuitBreaker();
      return false;
    }

    return true;
  }

  /**
   * Check if circuit breaker should trip
   */
  private checkCircuitBreaker(error: SyncError): void {
    // Don't count ignored errors
    if (this.circuitBreakerConfig.ignoredErrors.includes(error.code)) {
      return;
    }

    if (this.healthManager.shouldOpenCircuitBreaker(this.circuitBreakerConfig.failureThreshold)) {
      const resetAt = new Date(Date.now() + this.circuitBreakerConfig.resetTimeoutMs);
      this.healthManager.openCircuitBreaker(resetAt);
      logger.warn('[SyncEngine] Circuit breaker opened', { resetAt });
    }
  }

  // ===========================================================================
  // LOCAL CHANGE TRACKING
  // ===========================================================================

  /**
   * Track a local change for syncing
   */
  async trackChange<T extends SyncMetadata>(
    collectionName: string,
    operation: 'create' | 'update' | 'delete',
    item: T
  ): Promise<void> {
    const config = this.configs.get(collectionName);
    if (!config || config.direction === 'pull-only') {
      return;
    }

    const strategy = getStrategy<T>(config);
    const preparedItem = strategy.prepareForPush(item);

    await this.queueManager.enqueue(collectionName, operation, preparedItem);

    // Update local item with pending status
    const collection = this.db[collectionName] as RxCollection;
    const doc = await collection.findOne(item.id).exec();
    if (doc) {
      await doc.incrementalPatch({
        ...preparedItem,
        _syncStatus: 'pending',
      });
    }
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Transform Supabase snake_case to RxDB camelCase
   */
  private transformFromSupabase(collectionName: string, item: Record<string, unknown>): SyncMetadata {
    const formatted = toRxDBFormat(item);
    const metadata = {
      id: formatted.id as string,
      userId: (formatted.userId as string) || this.userId,
      createdAt: formatted.createdAt as string,
      updatedAt: formatted.updatedAt as string,
      deletedAt: (formatted.deletedAt as string) || null,
      isDeleted: (formatted.isDeleted as boolean) || false,
      logicalClock: (formatted.logicalClock as number) || 0,
      originDeviceId: (formatted.originDeviceId as string) || 'unknown',
    };

    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(formatted)) {
      if (
        ![
          'id',
          'userId',
          'createdAt',
          'updatedAt',
          'deletedAt',
          'isDeleted',
          'logicalClock',
          'originDeviceId',
        ].includes(key)
      ) {
        rest[key] = value;
      }
    }

    const adjusted = this.applySnakeCaseFieldMappings(collectionName, rest);

    return {
      ...metadata,
      ...adjusted,
    };
  }

  /**
   * Transform RxDB camelCase to Supabase snake_case
   */
  private transformToSupabase(
    collectionName: string,
    item: SyncMetadata & Partial<LocalSyncFields>
  ): Record<string, unknown> {
    const { _syncStatus, _lastSyncAttempt, _syncError, ...rest } = item;
    const payload = { ...rest, userId: this.userId };

    return toSupabaseFormat(payload as Record<string, unknown>);
  }

  private applySnakeCaseFieldMappings(
    collectionName: string,
    data: Record<string, unknown>
  ): Record<string, unknown> {
    if (!SNAKE_CASE_COLLECTIONS.has(collectionName)) {
      return data;
    }

    const mapping = FIELD_MAPPINGS[collectionName];
    if (!mapping) {
      return data;
    }

    const result = { ...data };
    for (const [camelKey, snakeKey] of Object.entries(mapping)) {
      if (camelKey in result) {
        result[snakeKey] = result[camelKey];
        delete result[camelKey];
      }
    }

    return result;
  }

  /**
   * Convert error to SyncError
   */
  private toSyncError(error: unknown): SyncError {
    if (error && typeof error === 'object' && 'code' in error) {
      return error as SyncError;
    }

    const message = error instanceof Error ? error.message : String(error);

    // Detect error type
    if (message.includes('network') || message.includes('fetch')) {
      return createSyncError('NETWORK_ERROR', message);
    }
    if (message.includes('timeout')) {
      return createSyncError('TIMEOUT', message);
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return createSyncError('UNAUTHORIZED', message);
    }
    if (message.includes('RLS') || message.includes('policy')) {
      return createSyncError('RLS_VIOLATION', message);
    }
    if (message.includes('validation')) {
      return createSyncError('VALIDATION_ERROR', message);
    }

    return createSyncError('UNKNOWN_ERROR', message);
  }

  // ===========================================================================
  // GETTERS
  // ===========================================================================

  get health(): SyncHealthManager {
    return this.healthManager;
  }

  get queue(): PushQueueManager {
    return this.queueManager;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let syncEngineInstance: SyncEngine | null = null;

export function initSyncEngine(config: SyncEngineConfig): SyncEngine {
  if (syncEngineInstance) {
    syncEngineInstance.stop();
  }
  syncEngineInstance = new SyncEngine(config);
  return syncEngineInstance;
}

export function getSyncEngine(): SyncEngine | null {
  return syncEngineInstance;
}

export async function destroySyncEngine(): Promise<void> {
  if (syncEngineInstance) {
    await syncEngineInstance.stop();
    syncEngineInstance = null;
  }
}
