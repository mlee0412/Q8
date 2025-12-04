/**
 * Memory Store
 * Manages short-term and long-term memory storage
 */

import type {
  MemoryEntry,
  MemoryType,
  MemoryImportance,
  ShortTermMemory,
  ConversationMemory,
  LongTermMemory,
  UserPreferences,
  MemoryQuery,
  MemorySearchResult,
  ExtractedEntity,
} from './types';

/**
 * In-memory store (will be persisted to Supabase in production)
 */
const shortTermStore = new Map<string, ShortTermMemory>();
const longTermStore = new Map<string, LongTermMemory[]>();
const preferencesStore = new Map<string, UserPreferences>();

// Constants
const SHORT_TERM_MAX_ENTRIES = 50;
const SHORT_TERM_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================
// SHORT-TERM MEMORY (Conversation Context)
// ============================================================

/**
 * Get or create short-term memory for a session
 */
export function getShortTermMemory(sessionId: string, userId: string): ShortTermMemory {
  let memory = shortTermStore.get(sessionId);

  if (!memory) {
    memory = {
      sessionId,
      userId,
      entries: [],
      topics: [],
      startedAt: new Date(),
      lastActivity: new Date(),
    };
    shortTermStore.set(sessionId, memory);
  }

  return memory;
}

/**
 * Add a conversation entry to short-term memory
 */
export function addConversationEntry(
  sessionId: string,
  userId: string,
  entry: Omit<ConversationMemory, 'id' | 'timestamp'>
): ConversationMemory {
  const memory = getShortTermMemory(sessionId, userId);
  
  const conversationEntry: ConversationMemory = {
    ...entry,
    id: generateId(),
    timestamp: new Date(),
  };

  memory.entries.push(conversationEntry);
  memory.lastActivity = new Date();

  // Extract entities from conversation
  if (entry.content) {
    const entities = extractEntities(entry.content);
    conversationEntry.entities = entities;

    // Extract topics
    const newTopics = entities
      .filter(e => e.type === 'event' || e.type === 'task' || e.type === 'preference')
      .map(e => e.value);
    
    memory.topics = [...new Set([...memory.topics, ...newTopics])].slice(-10);
  }

  // Trim old entries if exceeding limit
  if (memory.entries.length > SHORT_TERM_MAX_ENTRIES) {
    const removed = memory.entries.shift();
    // Optionally consolidate to long-term memory
    if (removed && removed.role === 'user') {
      maybePromoteToLongTerm(userId, removed);
    }
  }

  return conversationEntry;
}

/**
 * Get recent conversation context
 */
export function getConversationContext(
  sessionId: string,
  maxEntries: number = 10
): ConversationMemory[] {
  const memory = shortTermStore.get(sessionId);
  if (!memory) return [];

  return memory.entries.slice(-maxEntries);
}

/**
 * Generate a conversation summary
 */
export function generateConversationSummary(sessionId: string): string {
  const memory = shortTermStore.get(sessionId);
  if (!memory || memory.entries.length === 0) {
    return 'No conversation history.';
  }

  const topics = memory.topics.length > 0
    ? `Topics discussed: ${memory.topics.join(', ')}.`
    : '';

  const turnCount = memory.entries.length;
  const duration = Math.round(
    (memory.lastActivity.getTime() - memory.startedAt.getTime()) / 60000
  );

  return `${turnCount} messages over ${duration} minutes. ${topics}`;
}

/**
 * Clear short-term memory for a session
 */
export function clearShortTermMemory(sessionId: string): void {
  shortTermStore.delete(sessionId);
}

// ============================================================
// LONG-TERM MEMORY (Persistent Facts)
// ============================================================

/**
 * Store a long-term memory
 */
export function storeLongTermMemory(
  userId: string,
  content: string,
  type: MemoryType,
  options: {
    importance?: MemoryImportance;
    tags?: string[];
    metadata?: Record<string, unknown>;
    category?: string;
    expiresAt?: Date;
  } = {}
): LongTermMemory {
  const entry: LongTermMemory = {
    id: generateId(),
    userId,
    type,
    content,
    importance: options.importance || 'medium',
    tags: options.tags || [],
    metadata: options.metadata,
    category: options.category || 'general',
    createdAt: new Date(),
    updatedAt: new Date(),
    accessCount: 0,
    lastAccessedAt: new Date(),
    expiresAt: options.expiresAt,
    relationships: [],
    verificationStatus: 'unverified',
  };

  const userMemories = longTermStore.get(userId) || [];
  userMemories.push(entry);
  longTermStore.set(userId, userMemories);

  return entry;
}

/**
 * Search long-term memories
 */
export function searchMemories(query: MemoryQuery): MemorySearchResult[] {
  const userMemories = longTermStore.get(query.userId) || [];
  const results: MemorySearchResult[] = [];

  for (const entry of userMemories) {
    // Filter by type
    if (query.types && !query.types.includes(entry.type)) {
      continue;
    }

    // Filter by importance
    if (query.minImportance) {
      const importanceLevels: MemoryImportance[] = ['low', 'medium', 'high', 'critical'];
      const minLevel = importanceLevels.indexOf(query.minImportance);
      const entryLevel = importanceLevels.indexOf(entry.importance);
      if (entryLevel < minLevel) continue;
    }

    // Filter by date range
    if (query.dateRange) {
      if (entry.createdAt < query.dateRange.start || entry.createdAt > query.dateRange.end) {
        continue;
      }
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      const hasMatchingTag = query.tags.some(tag => entry.tags.includes(tag));
      if (!hasMatchingTag) continue;
    }

    // Calculate relevance score
    let relevanceScore = 0.5;
    let matchType: 'exact' | 'semantic' | 'tag' = 'tag';

    // Text matching
    if (query.query) {
      const queryLower = query.query.toLowerCase();
      const contentLower = entry.content.toLowerCase();

      if (contentLower.includes(queryLower)) {
        relevanceScore = 1.0;
        matchType = 'exact';
      } else {
        // Simple word overlap scoring
        const queryWords = queryLower.split(/\s+/);
        const contentWords = contentLower.split(/\s+/);
        const overlap = queryWords.filter(w => contentWords.includes(w)).length;
        relevanceScore = overlap / queryWords.length;
        matchType = 'semantic';
      }
    }

    // Boost by importance
    const importanceBoost: Record<MemoryImportance, number> = {
      low: 0,
      medium: 0.1,
      high: 0.2,
      critical: 0.3,
    };
    relevanceScore += importanceBoost[entry.importance];

    // Boost by recency
    const ageMs = Date.now() - entry.createdAt.getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    if (ageDays < 1) relevanceScore += 0.1;
    else if (ageDays < 7) relevanceScore += 0.05;

    results.push({
      entry,
      relevanceScore: Math.min(1, relevanceScore),
      matchType,
    });

    // Update access count
    entry.accessCount++;
    entry.lastAccessedAt = new Date();
  }

  // Sort by relevance and limit
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return results.slice(0, query.limit || 10);
}

/**
 * Get memories relevant to a query
 */
export function getRelevantMemories(
  userId: string,
  query: string,
  limit: number = 5
): MemoryEntry[] {
  const results = searchMemories({
    userId,
    query,
    limit,
  });

  return results.map(r => r.entry);
}

/**
 * Delete a memory
 */
export function deleteMemory(userId: string, memoryId: string): boolean {
  const userMemories = longTermStore.get(userId);
  if (!userMemories) return false;

  const index = userMemories.findIndex(m => m.id === memoryId);
  if (index === -1) return false;

  userMemories.splice(index, 1);
  return true;
}

// ============================================================
// USER PREFERENCES
// ============================================================

/**
 * Get user preferences
 */
export function getUserPreferences(userId: string): UserPreferences {
  let prefs = preferencesStore.get(userId);

  if (!prefs) {
    prefs = {
      userId,
      communicationStyle: 'concise',
      responseLength: 'medium',
      preferredVoice: 'nova',
      speechSpeed: 1.0,
      theme: 'dark',
      dashboardLayout: ['status', 'weather', 'calendar', 'tasks'],
      defaultAgent: 'personality',
      agentPersonality: 'friendly',
      memoryRetention: 'month',
      shareAnalytics: false,
      custom: {},
      updatedAt: new Date(),
    };
    preferencesStore.set(userId, prefs);
  }

  return prefs;
}

/**
 * Update user preferences
 */
export function updateUserPreferences(
  userId: string,
  updates: Partial<UserPreferences>
): UserPreferences {
  const prefs = getUserPreferences(userId);
  
  Object.assign(prefs, updates, { updatedAt: new Date() });
  preferencesStore.set(userId, prefs);

  return prefs;
}

// ============================================================
// ENTITY EXTRACTION
// ============================================================

/**
 * Simple entity extraction from text
 * In production, this would use NER models
 */
function extractEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const lowerText = text.toLowerCase();

  // Time patterns
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)?/gi,
    /(\d{1,2})\s*(am|pm)/gi,
    /(morning|afternoon|evening|night|noon|midnight)/gi,
    /(today|tomorrow|yesterday|next week|this week)/gi,
  ];

  for (const pattern of timePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        entities.push({
          type: 'time',
          value: match,
          confidence: 0.8,
        });
      }
    }
  }

  // Date patterns
  const datePatterns = [
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/gi,
    /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g,
  ];

  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        entities.push({
          type: 'date',
          value: match,
          confidence: 0.8,
        });
      }
    }
  }

  // Task indicators
  const taskIndicators = [
    'remind me',
    'don\'t forget',
    'need to',
    'have to',
    'should',
    'must',
    'todo',
    'task',
  ];

  for (const indicator of taskIndicators) {
    if (lowerText.includes(indicator)) {
      entities.push({
        type: 'task',
        value: text,
        confidence: 0.6,
        context: indicator,
      });
      break;
    }
  }

  // Preference indicators
  const preferenceIndicators = [
    'i like',
    'i prefer',
    'i love',
    'i hate',
    'i don\'t like',
    'favorite',
    'always',
    'never',
  ];

  for (const indicator of preferenceIndicators) {
    if (lowerText.includes(indicator)) {
      entities.push({
        type: 'preference',
        value: text,
        confidence: 0.7,
        context: indicator,
      });
      break;
    }
  }

  return entities;
}

/**
 * Maybe promote conversation entry to long-term memory
 */
function maybePromoteToLongTerm(userId: string, entry: ConversationMemory): void {
  if (!entry.entities || entry.entities.length === 0) return;

  // Promote preferences and tasks
  const importantEntities = entry.entities.filter(
    e => e.type === 'preference' || e.type === 'task'
  );

  for (const entity of importantEntities) {
    // Map entity type to memory type
    const memoryType: MemoryType = entity.type === 'preference' ? 'preference' : 'task';
    
    storeLongTermMemory(userId, entry.content, memoryType, {
      importance: entity.confidence > 0.7 ? 'high' : 'medium',
      tags: [entity.type, entity.context || ''].filter(Boolean),
      metadata: {
        originalEntity: entity,
        source: 'conversation',
      },
    });
  }
}

// ============================================================
// MEMORY CONTEXT FOR AGENTS
// ============================================================

/**
 * Build memory context for agent prompts
 */
export function buildMemoryContext(userId: string, sessionId: string): string {
  const lines: string[] = [];

  // Get recent conversation
  const recentConversation = getConversationContext(sessionId, 5);
  if (recentConversation.length > 0) {
    lines.push('## Recent Conversation');
    for (const entry of recentConversation) {
      lines.push(`- ${entry.role}: ${entry.content.slice(0, 100)}${entry.content.length > 100 ? '...' : ''}`);
    }
    lines.push('');
  }

  // Get relevant long-term memories
  const relevantMemories = searchMemories({
    userId,
    types: ['preference', 'fact'],
    minImportance: 'medium',
    limit: 5,
  });

  if (relevantMemories.length > 0) {
    lines.push('## User Context');
    for (const result of relevantMemories) {
      lines.push(`- ${result.entry.content}`);
    }
    lines.push('');
  }

  // Get user preferences
  const prefs = getUserPreferences(userId);
  lines.push('## User Preferences');
  lines.push(`- Communication style: ${prefs.communicationStyle}`);
  lines.push(`- Response length: ${prefs.responseLength}`);
  lines.push('');

  return lines.join('\n');
}
