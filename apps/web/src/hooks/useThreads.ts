/**
 * useThreads Hook
 * Manage chat threads with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Thread, ThreadWithCount } from '@/lib/supabase/types';

interface UseThreadsOptions {
  userId: string;
  includeArchived?: boolean;
  limit?: number;
}

interface UseThreadsReturn {
  threads: ThreadWithCount[];
  isLoading: boolean;
  error: string | null;
  currentThread: Thread | null;
  createThread: () => Promise<Thread | null>;
  selectThread: (threadId: string) => Promise<void>;
  updateThread: (threadId: string, updates: Partial<Thread>) => Promise<void>;
  archiveThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string, hard?: boolean) => Promise<void>;
  refreshThreads: () => Promise<void>;
}

export function useThreads(options: UseThreadsOptions): UseThreadsReturn {
  const { userId, includeArchived = false, limit = 50 } = options;

  const [threads, setThreads] = useState<ThreadWithCount[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch threads from API
   */
  const fetchThreads = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId,
        includeArchived: includeArchived.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/threads?${params}`);
      if (!response.ok) throw new Error('Failed to fetch threads');

      const data = await response.json();
      setThreads(data.threads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, includeArchived, limit]);

  /**
   * Create a new thread
   */
  const createThread = useCallback(async (): Promise<Thread | null> => {
    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error('Failed to create thread');

      const data = await response.json();
      const newThread = data.thread;

      setThreads((prev) => [newThread, ...prev]);
      setCurrentThread(newThread);

      return newThread;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [userId]);

  /**
   * Select a thread (load its details)
   */
  const selectThread = useCallback(async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}?includeMessages=false`);
      if (!response.ok) throw new Error('Failed to load thread');

      const data = await response.json();
      setCurrentThread(data.thread);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  /**
   * Update thread properties
   */
  const updateThread = useCallback(async (threadId: string, updates: Partial<Thread>) => {
    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update thread');

      const data = await response.json();

      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, ...data.thread } : t))
      );

      if (currentThread?.id === threadId) {
        setCurrentThread((prev) => (prev ? { ...prev, ...data.thread } : prev));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [currentThread?.id]);

  /**
   * Archive a thread (soft delete)
   */
  const archiveThread = useCallback(async (threadId: string) => {
    await updateThread(threadId, { is_archived: true });
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (currentThread?.id === threadId) {
      setCurrentThread(null);
    }
  }, [updateThread, currentThread?.id]);

  /**
   * Delete a thread
   */
  const deleteThread = useCallback(async (threadId: string, hard = false) => {
    try {
      const response = await fetch(`/api/threads/${threadId}?hard=${hard}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete thread');

      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (currentThread?.id === threadId) {
        setCurrentThread(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [currentThread?.id]);

  /**
   * Refresh threads list
   */
  const refreshThreads = useCallback(async () => {
    await fetchThreads();
  }, [fetchThreads]);

  // Initial fetch
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Real-time subscription for thread updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('threads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newThread = payload.new as Thread;
            setThreads((prev) => {
              // Avoid duplicates
              if (prev.some((t) => t.id === newThread.id)) return prev;
              return [newThread as ThreadWithCount, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedThread = payload.new as Thread;
            setThreads((prev) =>
              prev.map((t) => (t.id === updatedThread.id ? { ...t, ...updatedThread } : t))
            );
            if (currentThread?.id === updatedThread.id) {
              setCurrentThread((prev) => (prev ? { ...prev, ...updatedThread } : prev));
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setThreads((prev) => prev.filter((t) => t.id !== deletedId));
            if (currentThread?.id === deletedId) {
              setCurrentThread(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, currentThread?.id]);

  return {
    threads,
    isLoading,
    error,
    currentThread,
    createThread,
    selectThread,
    updateThread,
    archiveThread,
    deleteThread,
    refreshThreads,
  };
}
