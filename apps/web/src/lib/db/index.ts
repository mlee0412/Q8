/**
 * RxDB Database Initialization
 * Local-first database using IndexedDB
 */

import { createRxDatabase, addRxPlugin, RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import {
  chatMessageSchema,
  userPreferencesSchema,
  deviceSchema,
  knowledgeBaseSchema,
  githubPRSchema,
  calendarEventSchema,
  taskSchema,
} from './schema';

// Add essential plugins
addRxPlugin(RxDBQueryBuilderPlugin);

// Add dev mode plugin in development
if (process.env.NODE_ENV === 'development') {
  addRxPlugin(RxDBDevModePlugin);
}

// Database collection types
interface Q8DatabaseCollections {
  chat_messages: RxCollection;
  user_preferences: RxCollection;
  devices: RxCollection;
  knowledge_base: RxCollection;
  github_prs: RxCollection;
  calendar_events: RxCollection;
  tasks: RxCollection;
  [key: string]: RxCollection;
}

export type Q8Database = RxDatabase<Q8DatabaseCollections>;

let dbPromise: Promise<Q8Database> | null = null;

/**
 * Initialize RxDB database
 * Singleton pattern ensures only one instance
 */
export async function initDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = createRxDatabase<Q8DatabaseCollections>({
    name: 'q8_db',
    storage: getRxStorageDexie(),
    multiInstance: false,
  }).then(async (db) => {
    // Create collections
    await db.addCollections({
      chat_messages: {
        schema: chatMessageSchema,
      },
      user_preferences: {
        schema: userPreferencesSchema,
      },
      devices: {
        schema: deviceSchema,
      },
      knowledge_base: {
        schema: knowledgeBaseSchema,
      },
      github_prs: {
        schema: githubPRSchema,
      },
      calendar_events: {
        schema: calendarEventSchema,
      },
      tasks: {
        schema: taskSchema,
      },
    });

    return db as Q8Database;
  });

  return dbPromise;
}

/**
 * Get the database instance
 */
export async function getDatabase() {
  return initDatabase();
}

/**
 * Destroy the database (for testing or reset)
 */
export async function destroyDatabase() {
  if (dbPromise) {
    const db = await dbPromise;
    await db.destroy();
    dbPromise = null;
  }
}
