/**
 * Push Sync Logic
 * Sends local changes to Supabase
 */

import type { RxDocument } from 'rxdb';
import type { Q8Database } from '@/lib/db';

export interface PushOptions {
  batchSize?: number;
}

/**
 * Push local changes to Supabase for a specific collection
 */
export async function pushChanges(
  db: Q8Database,
  collectionName: string,
  options: PushOptions = {}
) {
  const { batchSize = 100 } = options;

  try {
    const collection = db[collectionName];
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found`);
    }

    // Get all documents that need syncing
    // In production, you'd track which docs have changed
    const docs = await collection.find().limit(batchSize).exec();

    if (docs.length === 0) {
      return { documentsSent: 0 };
    }

    // Convert RxDocuments to plain objects
    const documents = docs.map((doc: RxDocument) => doc.toJSON());

    // Send to Supabase API
    const response = await fetch(`/api/sync/push?collection=${collectionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documents }),
    });

    if (!response.ok) {
      throw new Error(`Push sync failed: ${response.statusText}`);
    }

    const { success, errors } = await response.json();

    return {
      documentsSent: documents.length,
      successful: success.length,
      failed: errors.length,
      errors,
    };
  } catch (error) {
    console.error(`Push sync error for ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Push changes for all collections
 */
export async function pushAllCollections(db: Q8Database, options: PushOptions = {}) {
  const collections = ['chat_messages', 'user_preferences', 'devices', 'knowledge_base', 'github_prs'];

  const results = await Promise.allSettled(
    collections.map((name) => pushChanges(db, name, options))
  );

  return results.map((result, index) => ({
    collection: collections[index],
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));
}
