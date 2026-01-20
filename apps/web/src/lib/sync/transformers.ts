/**
 * Field Name Transformers
 * Converts between RxDB (camelCase) and Supabase (snake_case) field naming conventions
 * Ensures seamless real-time sync between local and remote databases
 */

import { logger } from '@/lib/logger';

/**
 * Convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Transform object keys from camelCase to snake_case (for pushing to Supabase)
 */
export function toSupabaseFormat<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);

    if (value === null || value === undefined) {
      result[snakeKey] = value;
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? toSupabaseFormat(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      result[snakeKey] = toSupabaseFormat(value as Record<string, unknown>);
    } else {
      result[snakeKey] = value;
    }
  }

  return result;
}

/**
 * Transform object keys from snake_case to camelCase (for pulling from Supabase)
 */
export function toRxDBFormat<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);

    if (value === null || value === undefined) {
      result[camelKey] = value;
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? toRxDBFormat(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      result[camelKey] = toRxDBFormat(value as Record<string, unknown>);
    } else {
      result[camelKey] = value;
    }
  }

  return result;
}

/**
 * Collection-specific field mappings for edge cases
 * Some fields may have different names between RxDB and Supabase
 */
export const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  chat_messages: {
    conversationId: 'conversation_id',
    agentName: 'agent_name',
    threadId: 'thread_id',
  },
  tasks: {
    dueDate: 'due_date',
    parentTaskId: 'parent_task_id',
    projectId: 'project_id',
    sortOrder: 'sort_order',
    estimatedMinutes: 'estimated_minutes',
    completedAt: 'completed_at',
  },
  notes: {
    contentJson: 'content_json',
    folderId: 'folder_id',
    isPinned: 'is_pinned',
    isArchived: 'is_archived',
    isLocked: 'is_locked',
    isDaily: 'is_daily',
    dailyDate: 'daily_date',
    wordCount: 'word_count',
    aiSummary: 'ai_summary',
    aiActionItems: 'ai_action_items',
    lastEditedAt: 'last_edited_at',
    archivedAt: 'archived_at',
  },
  note_folders: {
    parentId: 'parent_id',
    sortOrder: 'sort_order',
  },
  threads: {
    isArchived: 'is_archived',
    lastMessageAt: 'last_message_at',
  },
  agent_memories: {
    memoryType: 'memory_type',
    sourceThreadId: 'source_thread_id',
    sourceMessageId: 'source_message_id',
    expiresAt: 'expires_at',
    accessCount: 'access_count',
    lastAccessedAt: 'last_accessed_at',
    decayFactor: 'decay_factor',
    verificationStatus: 'verification_status',
    supersededBy: 'superseded_by',
  },
  user_preferences: {
    dashboardLayout: 'dashboard_layout',
    preferredAgent: 'preferred_agent',
  },
  calendar_events: {
    startTime: 'start_time',
    endTime: 'end_time',
    meetingUrl: 'meeting_url',
    attendeesCount: 'attendees_count',
    calendarName: 'calendar_name',
  },
  github_prs: {
    // All standard camelCase to snake_case
  },
  devices: {
    // All standard camelCase to snake_case
  },
  knowledge_base: {
    // All standard camelCase to snake_case
  },
};

/**
 * Transform a batch of documents for pushing to Supabase
 */
export function transformForPush<T extends Record<string, unknown>>(
  collectionName: string,
  documents: T[]
): Record<string, unknown>[] {
  return documents.map((doc) => {
    const transformed = toSupabaseFormat(doc);

    // Remove RxDB internal fields
    delete transformed._rev;
    delete transformed._attachments;
    delete transformed._deleted;
    delete transformed._meta;

    return transformed;
  });
}

/**
 * Transform a batch of documents pulled from Supabase for RxDB
 */
export function transformForPull<T extends Record<string, unknown>>(
  collectionName: string,
  documents: T[]
): Record<string, unknown>[] {
  return documents.map((doc) => {
    const transformed = toRxDBFormat(doc);

    // Ensure required RxDB fields exist
    if (!transformed.id && transformed.id !== '') {
      logger.warn('Document missing id field', { collectionName, service: 'sync-transformers' });
    }

    return transformed;
  });
}

/**
 * Validate that a document has all required fields for sync
 */
export function validateSyncDocument(
  collectionName: string,
  doc: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Common required fields
  if (!doc.id) errors.push('Missing required field: id');
  if (!doc.userId && !doc.user_id) errors.push('Missing required field: userId');

  // Collection-specific validation
  switch (collectionName) {
    case 'tasks':
      if (!doc.title) errors.push('Missing required field: title');
      if (!doc.status) errors.push('Missing required field: status');
      break;
    case 'notes':
      if (doc.content === undefined) errors.push('Missing required field: content');
      break;
    case 'threads':
      if (doc.isArchived === undefined && doc.is_archived === undefined) {
        errors.push('Missing required field: isArchived');
      }
      break;
    case 'agent_memories':
      if (!doc.memoryType && !doc.memory_type) errors.push('Missing required field: memoryType');
      if (!doc.content) errors.push('Missing required field: content');
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Deep merge two objects, preferring values from the second object
 * Used for conflict resolution
 */
export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>
): T {
  const result = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;

    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key as keyof T] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}

/**
 * Compare two documents and return the differences
 * Useful for conflict detection
 */
export function diffDocuments<T extends Record<string, unknown>>(
  local: T,
  remote: T
): { field: string; local: unknown; remote: unknown }[] {
  const diffs: { field: string; local: unknown; remote: unknown }[] = [];
  const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const key of allKeys) {
    // Skip internal RxDB fields
    if (key.startsWith('_')) continue;

    const localVal = local[key];
    const remoteVal = remote[key];

    if (JSON.stringify(localVal) !== JSON.stringify(remoteVal)) {
      diffs.push({ field: key, local: localVal, remote: remoteVal });
    }
  }

  return diffs;
}
