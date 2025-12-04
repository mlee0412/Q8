/**
 * Pull Sync Logic
 * Fetches changes from Supabase and updates local RxDB
 */

import type { RxDatabase } from 'rxdb';

export interface PullOptions {
  lastPulledAt?: string;
  batchSize?: number;
}

/**
 * Pull changes from Supabase for a specific collection
 */
export async function pullChanges(
  db: RxDatabase,
  collectionName: string,
  options: PullOptions = {}
) {
  const { lastPulledAt = new Date(0).toISOString(), batchSize = 100 } = options;

  try {
    // Fetch changes from Supabase API
    const response = await fetch(`/api/sync/pull?collection=${collectionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lastPulledAt,
        batchSize,
      }),
    });

    if (!response.ok) {
      throw new Error(`Pull sync failed: ${response.statusText}`);
    }

    const { documents, checkpoint } = await response.json();

    // Upsert documents to local RxDB
    const collection = db[collectionName];
    if (collection && documents.length > 0) {
      await collection.bulkUpsert(documents);
    }

    return {
      documentsReceived: documents.length,
      newCheckpoint: checkpoint,
    };
  } catch (error) {
    console.error(`Pull sync error for ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Pull changes for all collections
 */
export async function pullAllCollections(db: RxDatabase, options: PullOptions = {}) {
  const collections = ['chat_messages', 'user_preferences', 'devices', 'knowledge_base', 'github_prs'];

  const results = await Promise.allSettled(
    collections.map((name) => pullChanges(db, name, options))
  );

  return results.map((result, index) => ({
    collection: collections[index],
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));
}
