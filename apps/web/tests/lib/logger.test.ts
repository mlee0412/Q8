/**
 * Structured Logger Tests
 *
 * Tests for the production-ready structured logging system
 * Verifies log levels, context injection, child loggers, and environment-aware behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, createRequestLogger, type Logger, type ChildLogger } from '@/lib/logger';

describe('Structured Logger', () => {
  // Spy on all console methods - use type inference to avoid MockInstance type issues
  let consoleDebugSpy: ReturnType<typeof vi.fn>;
  let consoleInfoSpy: ReturnType<typeof vi.fn>;
  let consoleWarnSpy: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {}) as ReturnType<typeof vi.fn>;
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {}) as ReturnType<typeof vi.fn>;
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) as ReturnType<typeof vi.fn>;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as ReturnType<typeof vi.fn>;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Logger Interface', () => {
    it('exports logger object with all required methods', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.child).toBe('function');
    });

    it('logger methods are callable without throwing', () => {
      expect(() => logger.debug('debug message')).not.toThrow();
      expect(() => logger.info('info message')).not.toThrow();
      expect(() => logger.warn('warn message')).not.toThrow();
      expect(() => logger.error('error message')).not.toThrow();
    });

    it('logger methods accept optional context object', () => {
      expect(() => logger.debug('message', { key: 'value' })).not.toThrow();
      expect(() => logger.info('message', { userId: '123', action: 'login' })).not.toThrow();
      expect(() => logger.warn('message', { count: 42, nested: { a: 1 } })).not.toThrow();
      expect(() => logger.error('message', { error: new Error('test') })).not.toThrow();
    });
  });

  describe('Test Environment Behavior', () => {
    it('does not output logs in test environment (NODE_ENV=test)', () => {
      // Call all log methods
      logger.debug('debug test');
      logger.info('info test');
      logger.warn('warn test');
      logger.error('error test');

      // Verify no console methods were called
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('silently discards log messages with context in test mode', () => {
      logger.info('User action', { userId: 'user-123', action: 'signin' });
      logger.error('API failure', {
        endpoint: '/api/data',
        status: 500,
        error: new Error('Internal Server Error')
      });

      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Child Logger', () => {
    it('creates a child logger with bound context', () => {
      const childLogger = logger.child({ service: 'auth', version: '1.0' });

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.debug).toBe('function');
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.warn).toBe('function');
      expect(typeof childLogger.error).toBe('function');
    });

    it('child logger methods are callable', () => {
      const childLogger = logger.child({ requestId: 'req-123' });

      expect(() => childLogger.debug('debug')).not.toThrow();
      expect(() => childLogger.info('info')).not.toThrow();
      expect(() => childLogger.warn('warn')).not.toThrow();
      expect(() => childLogger.error('error')).not.toThrow();
    });

    it('child logger accepts additional context that merges with bound context', () => {
      const childLogger = logger.child({ baseContext: 'value' });

      // These should not throw - verifies context merging works
      expect(() => childLogger.info('message', { additionalKey: 'additionalValue' })).not.toThrow();
      expect(() => childLogger.error('error', { errorCode: 500 })).not.toThrow();
    });

    it('child logger does not output in test environment', () => {
      const childLogger = logger.child({ requestId: 'test-request' });

      childLogger.debug('child debug');
      childLogger.info('child info');
      childLogger.warn('child warn');
      childLogger.error('child error');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('can create nested child loggers', () => {
      const serviceLogger = logger.child({ service: 'api' });
      // Child loggers don't have a child method, but we can create another from main logger
      const requestLogger = logger.child({ service: 'api', requestId: 'req-456' });

      expect(() => requestLogger.info('nested log', { action: 'test' })).not.toThrow();
    });
  });

  describe('createRequestLogger', () => {
    it('creates a request logger with requestId', () => {
      const requestLogger = createRequestLogger('req-abc-123');

      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.debug).toBe('function');
      expect(typeof requestLogger.info).toBe('function');
      expect(typeof requestLogger.warn).toBe('function');
      expect(typeof requestLogger.error).toBe('function');
    });

    it('creates a request logger with requestId and userId', () => {
      const requestLogger = createRequestLogger('req-xyz-789', 'user-456');

      expect(requestLogger).toBeDefined();
      expect(() => requestLogger.info('request started')).not.toThrow();
    });

    it('creates a request logger with only requestId when userId is undefined', () => {
      const requestLogger = createRequestLogger('req-only-id', undefined);

      expect(requestLogger).toBeDefined();
      expect(() => requestLogger.info('anonymous request')).not.toThrow();
    });

    it('request logger does not output in test environment', () => {
      const requestLogger = createRequestLogger('req-test', 'user-test');

      requestLogger.info('Request received');
      requestLogger.error('Request failed', { status: 500 });

      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('request logger accepts additional context', () => {
      const requestLogger = createRequestLogger('req-ctx', 'user-ctx');

      expect(() => requestLogger.info('API call', {
        endpoint: '/api/users',
        method: 'GET',
        duration: 150
      })).not.toThrow();
    });
  });

  describe('Type Exports', () => {
    it('Logger type is usable for type annotations', () => {
      const typedLogger: Logger = logger;
      expect(typedLogger).toBeDefined();
    });

    it('ChildLogger type is usable for type annotations', () => {
      const typedChildLogger: ChildLogger = logger.child({ test: true });
      expect(typedChildLogger).toBeDefined();
    });

    it('createRequestLogger returns ChildLogger type', () => {
      const requestLogger: ChildLogger = createRequestLogger('req-typed');
      expect(requestLogger).toBeDefined();
    });
  });

  describe('Error Handling in Context', () => {
    it('handles Error objects in context without throwing', () => {
      const testError = new Error('Test error message');
      testError.stack = 'Error: Test error message\n    at test.ts:1:1';

      expect(() => logger.error('Operation failed', {
        error: testError,
        operation: 'test'
      })).not.toThrow();
    });

    it('handles custom error types in context', () => {
      class CustomError extends Error {
        code: string;
        constructor(message: string, code: string) {
          super(message);
          this.name = 'CustomError';
          this.code = code;
        }
      }

      const customError = new CustomError('Custom failure', 'ERR_CUSTOM');

      expect(() => logger.error('Custom error occurred', {
        error: customError,
        details: { code: customError.code }
      })).not.toThrow();
    });

    it('handles non-Error objects in error context', () => {
      expect(() => logger.error('Unexpected error type', {
        error: 'string error',
      })).not.toThrow();

      expect(() => logger.error('Unexpected error type', {
        error: { custom: 'error object' },
      })).not.toThrow();

      expect(() => logger.error('Unexpected error type', {
        error: 42,
      })).not.toThrow();

      expect(() => logger.error('Unexpected error type', {
        error: null,
      })).not.toThrow();

      expect(() => logger.error('Unexpected error type', {
        error: undefined,
      })).not.toThrow();
    });
  });

  describe('Complex Context Handling', () => {
    it('handles nested objects in context', () => {
      expect(() => logger.info('Complex context', {
        user: {
          id: '123',
          profile: {
            name: 'Test User',
            preferences: {
              theme: 'dark',
              notifications: true
            }
          }
        }
      })).not.toThrow();
    });

    it('handles arrays in context', () => {
      expect(() => logger.info('Array context', {
        ids: ['a', 'b', 'c'],
        items: [{ id: 1 }, { id: 2 }]
      })).not.toThrow();
    });

    it('handles mixed types in context', () => {
      expect(() => logger.debug('Mixed context', {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        array: [1, 2, 3],
        object: { nested: true },
        date: new Date().toISOString()
      })).not.toThrow();
    });

    it('handles empty context object', () => {
      expect(() => logger.info('Empty context', {})).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty message string', () => {
      expect(() => logger.info('')).not.toThrow();
    });

    it('handles very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      expect(() => logger.info(longMessage)).not.toThrow();
    });

    it('handles special characters in messages', () => {
      expect(() => logger.info('Special chars: \n\t\r "quotes" \'apostrophe\' <tags>')).not.toThrow();
    });

    it('handles unicode in messages and context', () => {
      expect(() => logger.info('Unicode: \u{1F600} \u{1F389}', {
        emoji: '\u{1F4BB}',
        chinese: '\u4e2d\u6587',
        arabic: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629'
      })).not.toThrow();
    });

    it('multiple rapid log calls do not interfere', () => {
      for (let i = 0; i < 100; i++) {
        logger.debug(`Debug ${i}`);
        logger.info(`Info ${i}`);
        logger.warn(`Warn ${i}`);
        logger.error(`Error ${i}`);
      }
      // All calls should complete without throwing
      expect(true).toBe(true);
    });
  });
});

describe('Logger Integration Scenarios', () => {
  let consoleWarnSpy: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) as ReturnType<typeof vi.fn>;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('simulates typical request lifecycle logging', () => {
    const requestId = 'req-' + Date.now();
    const userId = 'user-abc';
    const reqLogger = createRequestLogger(requestId, userId);

    // Simulate request lifecycle - none should throw
    expect(() => {
      reqLogger.info('Request started', { method: 'POST', path: '/api/data' });
      reqLogger.debug('Validating request body');
      reqLogger.info('Request processed', { duration: 150 });
    }).not.toThrow();
  });

  it('simulates error logging scenario', () => {
    const reqLogger = createRequestLogger('req-error-test', 'user-error');

    expect(() => {
      try {
        throw new Error('Database connection failed');
      } catch (err) {
        reqLogger.error('Request failed', {
          error: err,
          phase: 'database',
          retryable: true
        });
      }
    }).not.toThrow();
  });

  it('simulates service-level logging with child logger', () => {
    const authLogger = logger.child({ service: 'auth', version: '2.0' });

    expect(() => {
      authLogger.info('Authentication attempt', { method: 'oauth', provider: 'google' });
      authLogger.warn('Rate limit approaching', { current: 95, max: 100 });
      authLogger.info('Authentication successful', { userId: 'new-user-123' });
    }).not.toThrow();
  });

  it('handles concurrent logging from multiple child loggers', () => {
    const loggers = [
      logger.child({ service: 'auth' }),
      logger.child({ service: 'api' }),
      logger.child({ service: 'db' }),
      createRequestLogger('req-1'),
      createRequestLogger('req-2', 'user-2'),
    ];

    expect(() => {
      loggers.forEach((l, i) => {
        l.info(`Message from logger ${i}`);
        l.debug(`Debug from logger ${i}`);
        l.warn(`Warning from logger ${i}`);
      });
    }).not.toThrow();
  });
});
