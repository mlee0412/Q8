/**
 * Sync Engine Tests
 *
 * Tests for the RxDB ↔ Supabase synchronization engine
 * Mocks Supabase client and RxDB to test sync logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create hoisted mocks
const { mockHealthManager, mockQueueManager, mockGetStrategy, mockLogConflict, mockUpdateLogicalClock, mockLogger } = vi.hoisted(() => {
  // Create a proper observable-like object
  const mockObservable = {
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  };

  return {
    mockHealthManager: {
      getCurrentHealth: vi.fn().mockReturnValue({
        isOnline: true,
        circuitBreakerOpen: false,
      }),
      setPendingCount: vi.fn(),
      syncStarted: vi.fn(),
      syncCompleted: vi.fn(),
      syncFailed: vi.fn(),
      collectionError: vi.fn(),
      collectionSynced: vi.fn(),
      shouldOpenCircuitBreaker: vi.fn().mockReturnValue(false),
      openCircuitBreaker: vi.fn(),
      closeCircuitBreaker: vi.fn(),
    },
    mockQueueManager: {
      getQueueCount: vi.fn().mockReturnValue(mockObservable),
      getCheckpoint: vi.fn().mockResolvedValue(null),
      setCheckpoint: vi.fn().mockResolvedValue(undefined),
      getNextBatch: vi.fn().mockResolvedValue([]),
      enqueue: vi.fn().mockResolvedValue(undefined),
      markInProgress: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
    },
    mockGetStrategy: vi.fn().mockReturnValue({
      resolveConflict: vi.fn().mockImplementation((local, remote) => ({
        winner: remote,
        loser: local,
        source: 'server',
      })),
      prepareForPush: vi.fn().mockImplementation((item) => ({
        ...item,
        logicalClock: 1,
        originDeviceId: 'test-device',
      })),
    }),
    mockLogConflict: vi.fn(),
    mockUpdateLogicalClock: vi.fn(),
    mockLogger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
});

// Mock dependencies
vi.mock('@/lib/sync/health', () => ({
  SyncHealthManager: vi.fn(),
  getSyncHealthManager: () => mockHealthManager,
}));

vi.mock('@/lib/sync/queue', () => ({
  PushQueueManager: vi.fn(),
  getPushQueueManager: () => mockQueueManager,
}));

vi.mock('@/lib/sync/strategies', () => ({
  getStrategy: mockGetStrategy,
  logConflict: mockLogConflict,
  updateLogicalClock: mockUpdateLogicalClock,
}));

vi.mock('@/lib/sync/types', () => ({
  SYNC_CONFIGS: [
    { name: 'threads', enabled: true, direction: 'bidirectional', priority: 'high', batchSize: 100 },
    { name: 'notes', enabled: true, direction: 'bidirectional', priority: 'medium', batchSize: 100 },
  ],
  DEFAULT_CIRCUIT_BREAKER_CONFIG: {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    ignoredErrors: [],
  },
  createSyncError: (code: string, message: string) => ({ code, message, timestamp: new Date() }),
  getOrCreateDeviceId: () => 'test-device-id',
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

// Import after mocks
import { SyncEngine, initSyncEngine, getSyncEngine, destroySyncEngine, type SyncEngineConfig } from '@/lib/sync/engine';
import type { SyncMetadata } from '@/lib/sync/types';

// Mock Supabase client
const createMockSupabase = () => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      }),
    }),
  }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  }),
  removeChannel: vi.fn().mockResolvedValue(undefined),
});

// Mock RxDB database
const createMockDb = () => ({
  threads: {
    find: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    }),
    insert: vi.fn().mockResolvedValue({}),
  },
  notes: {
    find: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    }),
    insert: vi.fn().mockResolvedValue({}),
  },
});

describe('SyncEngine', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    mockDb = createMockDb();

    // Reset health manager defaults
    mockHealthManager.getCurrentHealth.mockReturnValue({
      isOnline: true,
      circuitBreakerOpen: false,
    });

    // Reset queue manager observable mock
    mockQueueManager.getQueueCount.mockReturnValue({
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    });

    // Reset strategy mock
    mockGetStrategy.mockReturnValue({
      resolveConflict: vi.fn().mockImplementation((local, remote) => ({
        winner: remote,
        loser: local,
        source: 'server',
      })),
      prepareForPush: vi.fn().mockImplementation((item) => ({
        ...item,
        logicalClock: 1,
        originDeviceId: 'test-device',
      })),
    });

    // Reset health manager mock methods
    mockHealthManager.shouldOpenCircuitBreaker.mockReturnValue(false);
  });

  afterEach(async () => {
    await destroySyncEngine();
  });

  describe('constructor', () => {
    it('initializes with default configs', () => {
      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      expect(engine).toBeDefined();
      expect(mockQueueManager.getQueueCount).toHaveBeenCalled();
    });

    it('initializes with custom sync interval', () => {
      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
        syncInterval: 60000,
      });

      expect(engine).toBeDefined();
    });

    it('auto-starts when configured', () => {
      const startSpy = vi.spyOn(SyncEngine.prototype, 'start');

      new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
        autoStart: true,
        pullOnStart: false,
      });

      expect(startSpy).toHaveBeenCalledWith(false);
      startSpy.mockRestore();
    });
  });

  describe('lifecycle', () => {
    it('start sets up realtime subscriptions', async () => {
      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      await engine.start(false);

      // Should create channels for bidirectional collections
      expect(mockSupabase.channel).toHaveBeenCalled();
    });

    it('stop clears interval and removes channels', async () => {
      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      await engine.start(false);
      await engine.stop();

      expect(mockSupabase.removeChannel).toHaveBeenCalled();
    });

    it('does not start twice', async () => {
      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      await engine.start(false);
      const channelCallCount = (mockSupabase.channel as ReturnType<typeof vi.fn>).mock.calls.length;

      await engine.start(false);

      // Channel calls should not increase
      expect(mockSupabase.channel).toHaveBeenCalledTimes(channelCallCount);
    });
  });

  describe('sync', () => {
    it('skips sync when circuit breaker is open', async () => {
      mockHealthManager.getCurrentHealth.mockReturnValue({
        isOnline: true,
        circuitBreakerOpen: true,
        circuitBreakerResetAt: new Date(Date.now() + 60000),
      });

      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      await engine.sync();

      expect(mockHealthManager.syncStarted).not.toHaveBeenCalled();
    });

    it('skips sync when offline', async () => {
      mockHealthManager.getCurrentHealth.mockReturnValue({
        isOnline: false,
        circuitBreakerOpen: false,
      });

      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      await engine.sync();

      expect(mockHealthManager.syncStarted).not.toHaveBeenCalled();
    });

    it('calls syncStarted and syncCompleted on success', async () => {
      // Mock successful Supabase response
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gt: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      await engine.sync();

      expect(mockHealthManager.syncStarted).toHaveBeenCalled();
      expect(mockHealthManager.syncCompleted).toHaveBeenCalled();
    });
  });

  describe('trackChange', () => {
    it('enqueues change for push', async () => {
      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      const item = {
        id: 'test-1',
        userId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        isDeleted: false,
        logicalClock: 0,
        originDeviceId: 'device-1',
      };

      await engine.trackChange('threads', 'create', item);

      expect(mockQueueManager.enqueue).toHaveBeenCalledWith(
        'threads',
        'create',
        expect.objectContaining({ id: 'test-1' })
      );
    });

    it('uses strategy to prepare item for push', async () => {
      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      const item = {
        id: 'test-1',
        userId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        isDeleted: false,
        logicalClock: 0,
        originDeviceId: 'device-1',
      };

      await engine.trackChange('threads', 'update', item);

      expect(mockGetStrategy).toHaveBeenCalled();
    });
  });

  describe('circuit breaker', () => {
    it('skips sync when circuit breaker is open with future reset time', async () => {
      mockHealthManager.getCurrentHealth.mockReturnValue({
        isOnline: true,
        circuitBreakerOpen: true,
        circuitBreakerResetAt: new Date(Date.now() + 60000), // Future reset time
      });

      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      await engine.sync();

      // Should not have started sync because circuit is open
      expect(mockHealthManager.syncStarted).not.toHaveBeenCalled();
    });

    it('closes circuit breaker after reset time', async () => {
      mockHealthManager.getCurrentHealth.mockReturnValue({
        isOnline: true,
        circuitBreakerOpen: true,
        circuitBreakerResetAt: new Date(Date.now() - 1000), // Already past
      });

      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      // This should close the circuit breaker since reset time has passed
      await engine.sync();

      expect(mockHealthManager.closeCircuitBreaker).toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('exposes health manager', () => {
      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      expect(engine.health).toBe(mockHealthManager);
    });

    it('exposes queue manager', () => {
      const engine = new SyncEngine({
        supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
        db: mockDb as unknown as SyncEngineConfig['db'],
        userId: 'test-user-id',
      });

      expect(engine.queue).toBe(mockQueueManager);
    });
  });
});

describe('Singleton functions', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    mockDb = createMockDb();

    // Reset queue manager observable mock
    mockQueueManager.getQueueCount.mockReturnValue({
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    });
  });

  afterEach(async () => {
    await destroySyncEngine();
  });

  it('initSyncEngine creates singleton', () => {
    const engine = initSyncEngine({
      supabase: mockSupabase as unknown as Parameters<typeof initSyncEngine>[0]['supabase'],
      db: mockDb as unknown as Parameters<typeof initSyncEngine>[0]['db'],
      userId: 'test-user-id',
    });

    expect(engine).toBeDefined();
    expect(getSyncEngine()).toBe(engine);
  });

  it('initSyncEngine stops previous instance', async () => {
    const engine1 = initSyncEngine({
      supabase: mockSupabase as unknown as Parameters<typeof initSyncEngine>[0]['supabase'],
      db: mockDb as unknown as Parameters<typeof initSyncEngine>[0]['db'],
      userId: 'test-user-id',
    });

    await engine1.start(false);

    const engine2 = initSyncEngine({
      supabase: mockSupabase as unknown as Parameters<typeof initSyncEngine>[0]['supabase'],
      db: mockDb as unknown as Parameters<typeof initSyncEngine>[0]['db'],
      userId: 'test-user-id',
    });

    expect(getSyncEngine()).toBe(engine2);
  });

  it('getSyncEngine returns null before initialization', async () => {
    await destroySyncEngine();
    expect(getSyncEngine()).toBeNull();
  });

  it('destroySyncEngine clears singleton', async () => {
    initSyncEngine({
      supabase: mockSupabase as unknown as Parameters<typeof initSyncEngine>[0]['supabase'],
      db: mockDb as unknown as Parameters<typeof initSyncEngine>[0]['db'],
      userId: 'test-user-id',
    });

    await destroySyncEngine();

    expect(getSyncEngine()).toBeNull();
  });
});

describe('Data transformation', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    mockDb = createMockDb();

    // Reset health manager defaults
    mockHealthManager.getCurrentHealth.mockReturnValue({
      isOnline: true,
      circuitBreakerOpen: false,
    });

    // Reset queue manager observable mock
    mockQueueManager.getQueueCount.mockReturnValue({
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    });

    // Reset strategy mock
    mockGetStrategy.mockReturnValue({
      resolveConflict: vi.fn().mockImplementation((local, remote) => ({
        winner: remote,
        loser: local,
        source: 'server',
      })),
      prepareForPush: vi.fn().mockImplementation((item) => ({
        ...item,
        logicalClock: 1,
        originDeviceId: 'test-device',
      })),
    });
  });

  afterEach(async () => {
    await destroySyncEngine();
  });

  it('transforms snake_case from Supabase to camelCase (unit test)', () => {
    // Test the transformation logic directly without complex mocking
    // The SyncEngine has a private transformFromSupabase method
    // We test this by verifying the expected transformation pattern

    const supabaseData = {
      id: 'test-1',
      user_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
      is_deleted: false,
      logical_clock: 5,
      origin_device_id: 'device-1',
      title: 'Test Thread',
    };

    const engine = new SyncEngine({
      supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
      db: mockDb as unknown as SyncEngineConfig['db'],
      userId: 'test-user-id',
    });

    // Access private method for testing
    const transformed = engine['transformFromSupabase']('threads', supabaseData);

    expect(transformed).toMatchObject({
      id: 'test-1',
      userId: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      logicalClock: 5,
      originDeviceId: 'device-1',
    });
  });

  it('transforms camelCase to snake_case for Supabase (unit test)', () => {
    const localData = {
      id: 'test-1',
      userId: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: null,
      isDeleted: false,
      logicalClock: 5,
      originDeviceId: 'device-1',
      title: 'Test Thread',
    };

    const engine = new SyncEngine({
      supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
      db: mockDb as unknown as SyncEngineConfig['db'],
      userId: 'test-user-id',
    });

    // Access private method for testing
    const transformed = engine['transformToSupabase']('threads', localData as SyncMetadata);

    expect(transformed).toMatchObject({
      id: 'test-1',
      user_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      logical_clock: 5,
      origin_device_id: 'device-1',
    });
  });
});

describe('Error handling', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    mockDb = createMockDb();

    // Reset health manager defaults
    mockHealthManager.getCurrentHealth.mockReturnValue({
      isOnline: true,
      circuitBreakerOpen: false,
    });

    // Reset queue manager observable mock
    mockQueueManager.getQueueCount.mockReturnValue({
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    });

    // Reset strategy mock
    mockGetStrategy.mockReturnValue({
      resolveConflict: vi.fn().mockImplementation((local, remote) => ({
        winner: remote,
        loser: local,
        source: 'server',
      })),
      prepareForPush: vi.fn().mockImplementation((item) => ({
        ...item,
        logicalClock: 1,
        originDeviceId: 'test-device',
      })),
    });
  });

  afterEach(async () => {
    await destroySyncEngine();
  });

  it('throws error for unknown collection', async () => {
    const engine = new SyncEngine({
      supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
      db: mockDb as unknown as SyncEngineConfig['db'],
      userId: 'test-user-id',
    });

    await expect(engine['pullCollection']('unknown')).rejects.toThrow('Unknown collection');
  });

  it('toSyncError classifies network errors correctly', () => {
    const engine = new SyncEngine({
      supabase: mockSupabase as unknown as SyncEngineConfig['supabase'],
      db: mockDb as unknown as SyncEngineConfig['db'],
      userId: 'test-user-id',
    });

    // Test the error classification directly
    const networkError = new Error('network connection failed');
    const syncError = engine['toSyncError'](networkError);
    expect(syncError.code).toBe('NETWORK_ERROR');

    const timeoutError = new Error('Request timeout exceeded');
    const timeoutSyncError = engine['toSyncError'](timeoutError);
    expect(timeoutSyncError.code).toBe('TIMEOUT');

    const authError = new Error('unauthorized access 401');
    const authSyncError = engine['toSyncError'](authError);
    expect(authSyncError.code).toBe('UNAUTHORIZED');

    const rlsError = new Error('RLS policy violation');
    const rlsSyncError = engine['toSyncError'](rlsError);
    expect(rlsSyncError.code).toBe('RLS_VIOLATION');

    const validationError = new Error('validation failed');
    const validationSyncError = engine['toSyncError'](validationError);
    expect(validationSyncError.code).toBe('VALIDATION_ERROR');

    const unknownError = new Error('something unexpected');
    const unknownSyncError = engine['toSyncError'](unknownError);
    expect(unknownSyncError.code).toBe('UNKNOWN_ERROR');
  });
});
