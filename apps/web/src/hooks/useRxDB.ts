'use client';

import { useEffect, useState } from 'react';
import { getDatabase } from '@/lib/db';
import type { RxDatabase, RxCollection, RxQuery, RxDocument } from 'rxdb';

/**
 * Hook to access RxDB database
 */
export function useRxDB() {
  const [db, setDb] = useState<RxDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initDb() {
      try {
        const database = await getDatabase();
        if (mounted) {
          setDb(database);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    }

    initDb();

    return () => {
      mounted = false;
    };
  }, []);

  return { db, isLoading, error };
}

/**
 * Hook to query RxDB collection
 * NOTE: For widgets to show empty state instead of loading, set isLoading to false immediately if db is ready but collection is empty
 */
export function useRxQuery<T>(
  collectionName: string,
  queryBuilder?: (collection: RxCollection<T>) => RxQuery<T>
) {
  const { db, isLoading: dbLoading, error: dbError } = useRxDB();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If database is still loading, keep loading state
    if (dbLoading) {
      return;
    }

    // If database failed to initialize, show empty state
    if (dbError || !db) {
      console.error('RxDB initialization error:', dbError);
      setData([]);
      setIsLoading(false);
      return;
    }

    let subscription: { unsubscribe: () => void } | undefined;
    let mounted = true;

    async function subscribe() {
      try {
        if (!db) return; // Additional null check

        const collection = db[collectionName] as RxCollection<T>;
        if (!collection) {
          console.warn(`Collection ${collectionName} not found in database`);
          if (mounted) {
            setData([]);
            setIsLoading(false);
          }
          return;
        }

        const query = queryBuilder ? queryBuilder(collection) : collection.find();

        // Subscribe to query results
        subscription = query.$.subscribe({
          next: (docs: RxDocument<T>[]) => {
            if (mounted) {
              setData(docs.map((doc) => doc.toJSON() as T));
              setIsLoading(false);
            }
          },
          error: (err) => {
            console.error(`RxDB query error for ${collectionName}:`, err);
            if (mounted) {
              setData([]);
              setIsLoading(false);
            }
          },
        });
      } catch (error) {
        console.error(`Error subscribing to ${collectionName}:`, error);
        if (mounted) {
          setData([]);
          setIsLoading(false);
        }
      }
    }

    subscribe();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
    // NOTE: queryBuilder is intentionally excluded from deps to prevent infinite loops
    // The RxDB subscription is already reactive and will update automatically
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, dbLoading, dbError, collectionName]);

  return { data, isLoading };
}
