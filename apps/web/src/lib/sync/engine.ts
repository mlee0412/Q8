/**
 * Sync Engine
 * Main orchestrator for RxDB ↔ Supabase synchronization
 */

import type { RxDatabase, RxCollection, RxDocument } from 'rxdb';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
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
import { SyncHealthManager, getSyncHealthManager } from './health';
import { PushQueueManager, getPushQueueManager } from './queue';
import { getStrategy, logConflict, updateLogicalClock } from './strategies';

// =============================================================================
// SYNC ENGINE
// =============================================================================

export interface SyncEngineConfig {
  supabase: SupabaseClient;
  db: RxDatabase;
  collections?: CollectionSyncConfig[];
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  autoStart?: boolean;
  pullOnStart?: boolean;
  syncInterval?: number;
}

export class SyncEngine {
  private supabase: SupabaseClient;
  private db: RxDatabase;
  private configs: Map<string, CollectionSyncConfig>;
  private circuitBreakerConfig: CircuitBreakerConfig;
  private healthManager: SyncHealthManager;
  private queueManager: PushQueueManager;
  private realtimeChannels: Map<string, RealtimeChannel>;
  private syncInterval: number;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private deviceId: string;

  constructor(config: SyncEngineConfig) {
    this.supabase = config.supabase;
    this.db = config.db;
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
   * Pull changes for all collections
   */
  async pullAll(): Promise<void> {
    const pullConfigs = Array.from(this.configs.values()).filter(
      (config) => config.enabled && config.direction !== 'push-only'
    );

    // Sort by priority
    pullConfigs.sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[a.priority] - priority[b.priority];
    });

    for (const config of pullConfigs) {
      try {
        await this.pullCollection(config.name);
      } catch (error) {
        console.error(`[SyncEngine] Pull failed for ${config.name}:`, error);
        this.healthManager.collectionError(config.name);
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
      const transformed = this.transformFromSupabase(remoteItem);

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
        console.error(`[SyncEngine] Push failed for ${config.name}:`, error);
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
        const item = op.item as SyncMetadata;
        const transformed = this.transformToSupabase(item);

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
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }
  ): Promise<void> {
    const config = this.configs.get(collectionName);
    if (!config) return;

    const collection = this.db[collectionName] as RxCollection;
    if (!collection) return;

    try {
      const rawItem = payload.new;

      // Ignore changes from this device
      if (rawItem.origin_device_id === this.deviceId) {
        return;
      }

      const transformed = this.transformFromSupabase(rawItem);
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
          const deletedId = payload.old.id as string;
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
      console.error(`[SyncEngine] Realtime handler error for ${collectionName}:`, error);
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
      console.warn('[SyncEngine] Circuit breaker opened, will reset at:', resetAt);
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
  private transformFromSupabase(item: Record<string, unknown>): SyncMetadata {
    return {
      id: item.id as string,
      userId: item.user_id as string,
      createdAt: item.created_at as string,
      updatedAt: item.updated_at as string,
      deletedAt: (item.deleted_at as string) || null,
      isDeleted: (item.is_deleted as boolean) || false,
      logicalClock: (item.logical_clock as number) || 0,
      originDeviceId: (item.origin_device_id as string) || 'unknown',
      // Copy other fields
      ...Object.fromEntries(
        Object.entries(item).filter(
          ([key]) =>
            !['id', 'user_id', 'created_at', 'updated_at', 'deleted_at', 'is_deleted', 'logical_clock', 'origin_device_id'].includes(key)
        )
      ),
    };
  }

  /**
   * Transform RxDB camelCase to Supabase snake_case
   */
  private transformToSupabase(item: SyncMetadata): Record<string, unknown> {
    const { userId, createdAt, updatedAt, deletedAt, isDeleted, logicalClock, originDeviceId, ...rest } = item;

    return {
      ...rest,
      user_id: userId,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: deletedAt,
      is_deleted: isDeleted,
      logical_clock: logicalClock,
      origin_device_id: originDeviceId,
    };
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
