/**
 * Push Queue Manager
 * Persistent queue for sync operations with retry logic
 */

import Dexie from 'dexie';
import { BehaviorSubject, type Observable } from 'rxjs';
import type {
  QueuedOperation,
  QueueStatus,
  OperationType,
  SyncError,
  PushQueueConfig,
} from './types';
import { DEFAULT_PUSH_QUEUE_CONFIG } from './types';

// =============================================================================
// QUEUE DATABASE
// =============================================================================

interface QueueEntry {
  id: string;
  collection: string;
  operation: OperationType;
  item: string; // JSON stringified
  queuedAt: string;
  attempts: number;
  lastAttempt: string | null;
  lastError: string | null; // JSON stringified SyncError
  status: QueueStatus;
}

interface CheckpointEntry {
  collection: string;
  checkpoint: string;
}

class SyncQueueDatabase extends Dexie {
  operations: Dexie.Table<QueueEntry, string>;
  checkpoints: Dexie.Table<CheckpointEntry, string>;

  constructor() {
    super('q8_sync_queue');

    this.version(1).stores({
      operations: 'id, collection, status, queuedAt, [status+collection]',
      checkpoints: 'collection',
    });

    this.operations = this.table('operations');
    this.checkpoints = this.table('checkpoints');
  }
}

// =============================================================================
// PUSH QUEUE MANAGER
// =============================================================================

export class PushQueueManager {
  private db: SyncQueueDatabase;
  private config: PushQueueConfig;
  private queueCount$: BehaviorSubject<number>;
  private isProcessing: boolean = false;
  private processingPromise: Promise<void> | null = null;

  constructor(config: Partial<PushQueueConfig> = {}) {
    this.db = new SyncQueueDatabase();
    this.config = { ...DEFAULT_PUSH_QUEUE_CONFIG, ...config };
    this.queueCount$ = new BehaviorSubject<number>(0);

    // Initialize count
    this.refreshCount();
  }

  // ===========================================================================
  // OBSERVABLES
  // ===========================================================================

  /**
   * Get observable of pending operation count
   */
  getQueueCount(): Observable<number> {
    return this.queueCount$.asObservable();
  }

  /**
   * Get current queue count
   */
  getCurrentCount(): number {
    return this.queueCount$.getValue();
  }

  // ===========================================================================
  // QUEUE OPERATIONS
  // ===========================================================================

  /**
   * Add an operation to the queue
   */
  async enqueue<T>(
    collection: string,
    operation: OperationType,
    item: T
  ): Promise<string> {
    const id = `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const entry: QueueEntry = {
      id,
      collection,
      operation,
      item: JSON.stringify(item),
      queuedAt: new Date().toISOString(),
      attempts: 0,
      lastAttempt: null,
      lastError: null,
      status: 'pending',
    };

    await this.db.operations.add(entry);
    await this.refreshCount();

    return id;
  }

  /**
   * Add multiple operations to the queue
   */
  async enqueueBatch<T>(
    collection: string,
    operations: Array<{ operation: OperationType; item: T }>
  ): Promise<string[]> {
    const entries: QueueEntry[] = operations.map((op, index) => ({
      id: `op_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
      collection,
      operation: op.operation,
      item: JSON.stringify(op.item),
      queuedAt: new Date().toISOString(),
      attempts: 0,
      lastAttempt: null,
      lastError: null,
      status: 'pending' as const,
    }));

    await this.db.operations.bulkAdd(entries);
    await this.refreshCount();

    return entries.map((e) => e.id);
  }

  /**
   * Get pending operations for a collection
   */
  async getPending(collection?: string, limit?: number): Promise<QueuedOperation[]> {
    let query = this.db.operations.where('status').equals('pending');

    if (collection) {
      query = this.db.operations
        .where('[status+collection]')
        .equals(['pending', collection]);
    }

    const entries = await (limit ? query.limit(limit) : query).toArray();

    return entries.map(this.entryToOperation);
  }

  /**
   * Get failed operations
   */
  async getFailed(collection?: string): Promise<QueuedOperation[]> {
    let query = this.db.operations.where('status').equals('failed');

    if (collection) {
      query = this.db.operations
        .where('[status+collection]')
        .equals(['failed', collection]);
    }

    return (await query.toArray()).map(this.entryToOperation);
  }

  /**
   * Get dead letter operations
   */
  async getDeadLetter(): Promise<QueuedOperation[]> {
    const entries = await this.db.operations
      .where('status')
      .equals('dead-letter')
      .toArray();

    return entries.map(this.entryToOperation);
  }

  /**
   * Mark operation as in progress
   */
  async markInProgress(id: string): Promise<void> {
    await this.db.operations.update(id, {
      status: 'in-progress',
      lastAttempt: new Date().toISOString(),
    });
  }

  /**
   * Mark operation as completed (removes from queue)
   */
  async markCompleted(id: string): Promise<void> {
    await this.db.operations.delete(id);
    await this.refreshCount();
  }

  /**
   * Mark operations as completed in batch
   */
  async markCompletedBatch(ids: string[]): Promise<void> {
    await this.db.operations.bulkDelete(ids);
    await this.refreshCount();
  }

  /**
   * Mark operation as failed
   */
  async markFailed(id: string, error: SyncError): Promise<void> {
    const entry = await this.db.operations.get(id);
    if (!entry) return;

    const newAttempts = entry.attempts + 1;
    const shouldDeadLetter = newAttempts >= this.config.maxRetries;

    await this.db.operations.update(id, {
      status: shouldDeadLetter ? 'dead-letter' : 'failed',
      attempts: newAttempts,
      lastError: JSON.stringify(error),
    });

    await this.refreshCount();
  }

  /**
   * Retry a failed operation
   */
  async retry(id: string): Promise<void> {
    await this.db.operations.update(id, {
      status: 'pending',
    });
    await this.refreshCount();
  }

  /**
   * Retry all failed operations for a collection
   */
  async retryAllFailed(collection?: string): Promise<number> {
    const failed = await this.getFailed(collection);
    const ids = failed.map((op) => op.id);

    await this.db.operations
      .where('id')
      .anyOf(ids)
      .modify({ status: 'pending' });

    await this.refreshCount();
    return ids.length;
  }

  /**
   * Remove an operation from the queue
   */
  async remove(id: string): Promise<void> {
    await this.db.operations.delete(id);
    await this.refreshCount();
  }

  /**
   * Clear all operations for a collection
   */
  async clearCollection(collection: string): Promise<void> {
    await this.db.operations.where('collection').equals(collection).delete();
    await this.refreshCount();
  }

  /**
   * Clear all operations
   */
  async clearAll(): Promise<void> {
    await this.db.operations.clear();
    await this.refreshCount();
  }

  // ===========================================================================
  // BATCH PROCESSING
  // ===========================================================================

  /**
   * Get the next batch to process
   */
  async getNextBatch(collection?: string): Promise<QueuedOperation[]> {
    return this.getPending(collection, this.config.batchSize);
  }

  /**
   * Calculate retry delay using exponential backoff
   */
  getRetryDelay(attempts: number): number {
    const { initialDelayMs, maxDelayMs, multiplier } = this.config.retryBackoff;
    const delay = initialDelayMs * Math.pow(multiplier, attempts - 1);
    return Math.min(delay, maxDelayMs);
  }

  /**
   * Check if an operation should be retried
   */
  shouldRetry(operation: QueuedOperation): boolean {
    if (operation.attempts >= this.config.maxRetries) {
      return false;
    }

    // Check if error is retryable
    if (operation.lastError && !operation.lastError.retryable) {
      return false;
    }

    return true;
  }

  // ===========================================================================
  // CHECKPOINTS
  // ===========================================================================

  /**
   * Get checkpoint for a collection
   */
  async getCheckpoint(collection: string): Promise<string | null> {
    const entry = await this.db.checkpoints.get(collection);
    return entry?.checkpoint ?? null;
  }

  /**
   * Set checkpoint for a collection
   */
  async setCheckpoint(collection: string, checkpoint: string): Promise<void> {
    await this.db.checkpoints.put({ collection, checkpoint });
  }

  /**
   * Clear checkpoint for a collection
   */
  async clearCheckpoint(collection: string): Promise<void> {
    await this.db.checkpoints.delete(collection);
  }

  // ===========================================================================
  // STATS
  // ===========================================================================

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const [pending, failed, deadLetter, inProgress] = await Promise.all([
      this.db.operations.where('status').equals('pending').count(),
      this.db.operations.where('status').equals('failed').count(),
      this.db.operations.where('status').equals('dead-letter').count(),
      this.db.operations.where('status').equals('in-progress').count(),
    ]);

    // Get per-collection counts
    const collections: Record<string, { pending: number; failed: number }> = {};
    const allPending = await this.db.operations
      .where('status')
      .equals('pending')
      .toArray();

    for (const entry of allPending) {
      const collectionStats = collections[entry.collection] ?? { pending: 0, failed: 0 };
      collectionStats.pending++;
      collections[entry.collection] = collectionStats;
    }

    const allFailed = await this.db.operations
      .where('status')
      .equals('failed')
      .toArray();

    for (const entry of allFailed) {
      const collectionStats = collections[entry.collection] ?? { pending: 0, failed: 0 };
      collectionStats.failed++;
      collections[entry.collection] = collectionStats;
    }

    return {
      pending,
      failed,
      deadLetter,
      inProgress,
      total: pending + failed + deadLetter + inProgress,
      collections,
    };
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async refreshCount(): Promise<void> {
    const count = await this.db.operations
      .where('status')
      .anyOf(['pending', 'in-progress', 'failed'])
      .count();
    this.queueCount$.next(count);
  }

  private entryToOperation(entry: QueueEntry): QueuedOperation {
    return {
      id: entry.id,
      collection: entry.collection,
      operation: entry.operation,
      item: JSON.parse(entry.item),
      queuedAt: entry.queuedAt,
      attempts: entry.attempts,
      lastAttempt: entry.lastAttempt,
      lastError: entry.lastError ? JSON.parse(entry.lastError) : null,
      status: entry.status,
    };
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Close the database connection
   */
  destroy(): void {
    this.queueCount$.complete();
    this.db.close();
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface QueueStats {
  pending: number;
  failed: number;
  deadLetter: number;
  inProgress: number;
  total: number;
  collections: Record<string, { pending: number; failed: number }>;
}

// =============================================================================
// SINGLETON
// =============================================================================

let queueManagerInstance: PushQueueManager | null = null;

export function getPushQueueManager(): PushQueueManager {
  if (!queueManagerInstance) {
    queueManagerInstance = new PushQueueManager();
  }
  return queueManagerInstance;
}

export function destroyPushQueueManager(): void {
  if (queueManagerInstance) {
    queueManagerInstance.destroy();
    queueManagerInstance = null;
  }
}
