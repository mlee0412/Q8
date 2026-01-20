/**
 * OpenAI Client Pooling Singleton
 * Manages a pool of OpenAI client instances for efficient resource usage
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

interface ClientConfig {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  timeout?: number;
  maxRetries?: number;
}

interface PooledClient {
  client: OpenAI;
  inUse: boolean;
  lastUsed: number;
  createdAt: number;
}

class OpenAIClientPool {
  private static instance: OpenAIClientPool | null = null;
  private pool: Map<string, PooledClient[]> = new Map();
  private readonly maxPoolSize: number;
  private readonly clientTimeout: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(maxPoolSize = 5, clientTimeout = 5 * 60 * 1000) {
    this.maxPoolSize = maxPoolSize;
    this.clientTimeout = clientTimeout;

    // Start cleanup interval to remove stale clients
    this.startCleanup();
  }

  /**
   * Get the singleton instance of the client pool
   */
  static getInstance(): OpenAIClientPool {
    if (!OpenAIClientPool.instance) {
      OpenAIClientPool.instance = new OpenAIClientPool();
    }
    return OpenAIClientPool.instance;
  }

  /**
   * Generate a unique key for a client configuration
   */
  private getConfigKey(config: ClientConfig): string {
    return JSON.stringify({
      apiKey: config.apiKey?.substring(0, 8) || 'default',
      baseURL: config.baseURL || 'default',
      organization: config.organization || 'default',
    });
  }

  /**
   * Get an OpenAI client from the pool or create a new one
   */
  getClient(config: ClientConfig = {}): OpenAI {
    const key = this.getConfigKey(config);
    let pooledClients = this.pool.get(key);

    if (!pooledClients) {
      pooledClients = [];
      this.pool.set(key, pooledClients);
    }

    // Find an available client
    const availableClient = pooledClients.find((pc) => !pc.inUse);

    if (availableClient) {
      availableClient.inUse = true;
      availableClient.lastUsed = Date.now();
      return availableClient.client;
    }

    // Create a new client if pool isn't full
    if (pooledClients.length < this.maxPoolSize) {
      const resolvedConfig: ClientConfig = {
        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
        baseURL: config.baseURL,
        organization: config.organization,
        timeout: config.timeout || 60000,
        maxRetries: config.maxRetries || 3,
      };

      const client = new OpenAI({
        apiKey: resolvedConfig.apiKey,
        baseURL: resolvedConfig.baseURL,
        organization: resolvedConfig.organization,
        timeout: resolvedConfig.timeout,
        maxRetries: resolvedConfig.maxRetries,
      });

      const pooledClient: PooledClient = {
        client,
        inUse: true,
        lastUsed: Date.now(),
        createdAt: Date.now(),
      };

      pooledClients.push(pooledClient);
      return client;
    }

    // All clients in use, wait for one to become available
    // In a real implementation, you might want to implement a queue
    // For now, create a temporary client
    logger.warn('OpenAI client pool exhausted, creating temporary client', { maxPoolSize: this.maxPoolSize, configKey: key });
    return new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseURL,
      organization: config.organization,
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
    });
  }

  /**
   * Release a client back to the pool
   */
  releaseClient(client: OpenAI): void {
    for (const pooledClients of this.pool.values()) {
      const pooledClient = pooledClients.find((pc) => pc.client === client);
      if (pooledClient) {
        pooledClient.inUse = false;
        pooledClient.lastUsed = Date.now();
        return;
      }
    }
  }

  /**
   * Execute a function with a client from the pool
   * Automatically releases the client when done
   */
  async withClient<T>(
    fn: (client: OpenAI) => Promise<T>,
    config: ClientConfig = {}
  ): Promise<T> {
    const client = this.getClient(config);
    try {
      return await fn(client);
    } finally {
      this.releaseClient(client);
    }
  }

  /**
   * Start the cleanup interval
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Run every minute
  }

  /**
   * Clean up stale clients from the pool
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, pooledClients] of this.pool.entries()) {
      const activeClients = pooledClients.filter((pc) => {
        // Keep clients that are in use or were recently used
        if (pc.inUse) return true;
        if (now - pc.lastUsed < this.clientTimeout) return true;
        return false;
      });

      if (activeClients.length === 0) {
        this.pool.delete(key);
      } else {
        this.pool.set(key, activeClients);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalClients: number;
    inUseClients: number;
    availableClients: number;
    poolKeys: string[];
  } {
    let totalClients = 0;
    let inUseClients = 0;

    for (const pooledClients of this.pool.values()) {
      totalClients += pooledClients.length;
      inUseClients += pooledClients.filter((pc) => pc.inUse).length;
    }

    return {
      totalClients,
      inUseClients,
      availableClients: totalClients - inUseClients,
      poolKeys: Array.from(this.pool.keys()),
    };
  }

  /**
   * Destroy the pool and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.pool.clear();
    OpenAIClientPool.instance = null;
  }
}

// Export singleton instance getter
export const getOpenAIClient = (config?: ClientConfig): OpenAI => {
  return OpenAIClientPool.getInstance().getClient(config);
};

// Export helper for managed client usage
export const withOpenAIClient = <T>(
  fn: (client: OpenAI) => Promise<T>,
  config?: ClientConfig
): Promise<T> => {
  return OpenAIClientPool.getInstance().withClient(fn, config);
};

// Export the pool class for advanced usage
export { OpenAIClientPool };
