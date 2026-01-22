'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getDatabase } from '@/lib/db';
import { destroySyncEngine, initSyncEngine } from '@/lib/sync';
import { logger } from '@/lib/logger';
import type { User, Session } from '@supabase/supabase-js';

interface SessionContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined
);

/**
 * Hook to access session context
 * @throws {Error} If used outside SessionManager
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, signOut } = useSession();
 * ```
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionManager');
  }
  return context;
}

interface SessionManagerProps {
  children: React.ReactNode;
}

/**
 * Global session state manager
 *
 * Features:
 * - Syncs Supabase auth state with RxDB
 * - Handles session refresh
 * - Provides auth context to the app
 * - Manages replication lifecycle
 *
 * @example
 * ```tsx
 * <SessionManager>
 *   <App />
 * </SessionManager>
 * ```
 */
export function SessionManager({ children }: SessionManagerProps) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setSession(session);
          setUser(session.user);

          // Sync user to RxDB for offline access
          await syncUserToRxDB(session.user);
        }

        setIsLoading(false);
      } catch (error) {
        logger.error('Session initialization failed', { error });
        setIsLoading(false);
      }
    };

    initSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          // Sync user to RxDB
          await syncUserToRxDB(session.user);

          // Start RxDB replication
          await startReplication(session);
        }

        if (event === 'SIGNED_OUT') {
          // Clear RxDB data
          await clearRxDBData();

          // Stop replication
          await stopReplication();
        }

        if (event === 'TOKEN_REFRESHED') {
          // Session token refreshed successfully
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await clearRxDBData();
      router.push('/login');
    } catch (error) {
      logger.error('Sign out failed', { error });
    }
  };

  // Refresh session manually
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      setSession(data.session);
      setUser(data.session?.user ?? null);
    } catch (error) {
      logger.error('Session refresh failed', { error });
    }
  };

  const value: SessionContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

SessionManager.displayName = 'SessionManager';

// Helper: Sync user to RxDB
async function syncUserToRxDB(user: User) {
  try {
    const db = await getDatabase();
    const userCollection = db.collections.users;

    await userCollection.upsert({
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      role: user.user_metadata?.role || 'user',
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
    });

    logger.info('User synced to RxDB', { userId: user.id });
  } catch (error) {
    logger.error('Failed to sync user to RxDB', { error });
  }
}

// Helper: Start RxDB replication
async function startReplication(session: Session) {
  try {
    const db = await getDatabase();
    const syncEngine = initSyncEngine({
      supabase,
      db,
      userId: session.user.id,
      syncInterval: 30000,
    });

    await syncEngine.start(true);
  } catch (error) {
    logger.error('Failed to start replication', { error });
  }
}

// Helper: Stop RxDB replication
async function stopReplication() {
  try {
    await destroySyncEngine();
  } catch (error) {
    logger.error('Failed to stop replication', { error });
  }
}

// Helper: Clear RxDB data on logout
async function clearRxDBData() {
  try {
    const db = await getDatabase();

    // Clear all user-specific collections
    // This removes all documents but preserves the collections for next login
    const collections = [
      'users',
      'chat_messages',
      'user_preferences',
      'devices',
      'knowledge_base',
      'github_prs',
      'calendar_events',
      'tasks',
    ];

    await Promise.all(
      collections.map(async (collectionName) => {
        const collection = db.collections[collectionName];
        if (collection) {
          // Find and remove all documents in the collection
          const allDocs = await collection.find().exec();
          await Promise.all(allDocs.map((doc: { remove: () => Promise<void> }) => doc.remove()));
        }
      })
    );

    logger.info('RxDB user data cleared on logout');
  } catch (error) {
    logger.error('Failed to clear RxDB data', { error });
  }
}
