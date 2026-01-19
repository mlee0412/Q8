'use client';

import { useEffect, useState } from 'react';
import { Provider } from 'rxdb-hooks';
import { getDatabase, type Q8Database } from '@/lib/db';
import { logger } from '@/lib/logger';

interface RxDBProviderProps {
  children: React.ReactNode;
}

export function RxDBProvider({ children }: RxDBProviderProps) {
  const [db, setDb] = useState<Q8Database | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initDb() {
      try {
        const database = await getDatabase();
        if (mounted) {
          setDb(database);
        }
      } catch (error) {
        console.error('Failed to initialize RxDB:', error);
      }
    }

    initDb();

    return () => {
      mounted = false;
    };
  }, []);

  if (!db) {
    // Show loading state while database initializes
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Initializing Q8...</p>
        </div>
      </div>
    );
  }

  return <Provider db={db}>{children}</Provider>;
}
