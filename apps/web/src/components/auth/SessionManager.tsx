'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getDatabase } from '@/lib/db';
import type { User, Session } from '@supabase/supabase-js';
import type { RxDatabase } from 'rxdb';

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
        console.error('Session initialization failed:', error);
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
      console.error('Sign out failed:', error);
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
      console.error('Session refresh failed:', error);
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

    // TODO: Update once users collection is defined in RxDB schema
    // const userCollection = db.collections.users;
    //
    // await userCollection.upsert({
    //   id: user.id,
    //   email: user.email,
    //   full_name: user.user_metadata?.full_name,
    //   avatar_url: user.user_metadata?.avatar_url,
    //   role: user.user_metadata?.role || 'user',
    //   created_at: user.created_at,
    //   updated_at: new Date().toISOString(),
    // });

    // User synced to RxDB (placeholder)
  } catch (error) {
    console.error('Failed to sync user to RxDB:', error);
  }
}

// Helper: Start RxDB replication
async function startReplication(session: Session) {
  try {
    const db = await getDatabase();

    // Start background sync with Supabase

    // Pull initial data from Supabase
    const { pullAllCollections } = await import('@/lib/sync/pull');
    await pullAllCollections(db);

    // Set up periodic sync (every 30 seconds)
    const syncInterval = setInterval(async () => {
      try {
        const { pushAllCollections } = await import('@/lib/sync/push');
        const { pullAllCollections } = await import('@/lib/sync/pull');

        // Push local changes
        await pushAllCollections(db);

        // Pull remote changes
        await pullAllCollections(db);
      } catch (error) {
        console.error('Sync error:', error);
      }
    }, 30000);

    // Store interval ID for cleanup
    (window as any).__rxdbSyncInterval = syncInterval;
  } catch (error) {
    console.error('Failed to start replication:', error);
  }
}

// Helper: Stop RxDB replication
async function stopReplication() {
  try {
    // Clear sync interval
    const syncInterval = (window as any).__rxdbSyncInterval;
    if (syncInterval) {
      clearInterval(syncInterval);
      delete (window as any).__rxdbSyncInterval;
    }
  } catch (error) {
    console.error('Failed to stop replication:', error);
  }
}

// Helper: Clear RxDB data on logout
async function clearRxDBData() {
  try {
    // TODO: Clear user-specific data, not entire database
    // const db = await getDatabase();
    // await db.collections.users.remove();
  } catch (error) {
    console.error('Failed to clear RxDB data:', error);
  }
}
