/**
 * useMemories Hook
 * Manage agent memories with CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { AgentMemory, MemoryType, MemoryImportance } from '@/lib/supabase/types';

interface UseMemoriesOptions {
  userId: string;
  memoryType?: MemoryType;
  limit?: number;
}

interface UseMemoriesReturn {
  memories: AgentMemory[];
  isLoading: boolean;
  error: string | null;
  createMemory: (content: string, type: MemoryType, importance?: MemoryImportance, tags?: string[]) => Promise<AgentMemory | null>;
  deleteMemory: (memoryId: string) => Promise<void>;
  updateMemory: (memoryId: string, updates: Partial<AgentMemory>) => Promise<void>;
  searchMemories: (query: string, limit?: number) => Promise<AgentMemory[]>;
  refreshMemories: () => Promise<void>;
  memoryStats: {
    total: number;
    byType: Record<MemoryType, number>;
  };
}

export function useMemories(options: UseMemoriesOptions): UseMemoriesReturn {
  const { userId, memoryType, limit = 100 } = options;

  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch memories from API
   */
  const fetchMemories = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId,
        limit: limit.toString(),
      });

      if (memoryType) {
        params.append('type', memoryType);
      }

      const response = await fetch(`/api/memories?${params}`);
      if (!response.ok) throw new Error('Failed to fetch memories');

      const data = await response.json();
      setMemories(data.memories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, memoryType, limit]);

  /**
   * Create a new memory
   */
  const createMemory = useCallback(async (
    content: string,
    type: MemoryType,
    importance: MemoryImportance = 'medium',
    tags: string[] = []
  ): Promise<AgentMemory | null> => {
    try {
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          content,
          memoryType: type,
          importance,
          tags,
        }),
      });

      if (!response.ok) throw new Error('Failed to create memory');

      const data = await response.json();
      const newMemory = data.memory;

      setMemories((prev) => [newMemory, ...prev]);
      return newMemory;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [userId]);

  /**
   * Delete a memory
   */
  const deleteMemory = useCallback(async (memoryId: string) => {
    try {
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete memory');

      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  /**
   * Update a memory
   */
  const updateMemory = useCallback(async (memoryId: string, updates: Partial<AgentMemory>) => {
    try {
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update memory');

      const data = await response.json();

      setMemories((prev) =>
        prev.map((m) => (m.id === memoryId ? { ...m, ...data.memory } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  /**
   * Search memories semantically
   */
  const searchMemories = useCallback(async (query: string, searchLimit = 10): Promise<AgentMemory[]> => {
    try {
      const response = await fetch('/api/memories/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          query,
          limit: searchLimit,
        }),
      });

      if (!response.ok) throw new Error('Failed to search memories');

      const data = await response.json();
      return data.memories || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, [userId]);

  /**
   * Refresh memories list
   */
  const refreshMemories = useCallback(async () => {
    await fetchMemories();
  }, [fetchMemories]);

  /**
   * Calculate memory statistics
   */
  const memoryStats = {
    total: memories.length,
    byType: memories.reduce((acc, m) => {
      acc[m.memory_type] = (acc[m.memory_type] || 0) + 1;
      return acc;
    }, {} as Record<MemoryType, number>),
  };

  // Initial fetch
  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Real-time subscription for memory updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('memories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_memories',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMemory = payload.new as AgentMemory;
            setMemories((prev) => {
              if (prev.some((m) => m.id === newMemory.id)) return prev;
              return [newMemory, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMemory = payload.new as AgentMemory;
            setMemories((prev) =>
              prev.map((m) => (m.id === updatedMemory.id ? updatedMemory : m))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setMemories((prev) => prev.filter((m) => m.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    memories,
    isLoading,
    error,
    createMemory,
    deleteMemory,
    updateMemory,
    searchMemories,
    refreshMemories,
    memoryStats,
  };
}
