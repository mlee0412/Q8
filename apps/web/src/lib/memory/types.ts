/**
 * Memory System Types
 * Types for short-term, long-term, and semantic memory
 */

/**
 * Memory entry types
 */
export type MemoryType = 
  | 'conversation'    // Recent conversation turns
  | 'fact'            // User facts/preferences
  | 'event'           // Calendar events, reminders
  | 'task'            // Tasks, todos
  | 'preference'      // User preferences
  | 'interaction'     // Notable interactions
  | 'context';        // Contextual information

/**
 * Memory importance levels
 */
export type MemoryImportance = 'low' | 'medium' | 'high' | 'critical';

/**
 * Base memory entry
 */
export interface MemoryEntry {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  metadata?: Record<string, unknown>;
  importance: MemoryImportance;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  accessCount: number;
  lastAccessedAt: Date;
  embedding?: number[];
  tags: string[];
  source?: string;
}

/**
 * Short-term memory (conversation context)
 */
export interface ShortTermMemory {
  sessionId: string;
  userId: string;
  entries: ConversationMemory[];
  summary?: string;
  topics: string[];
  startedAt: Date;
  lastActivity: Date;
}

/**
 * Conversation memory entry
 */
export interface ConversationMemory {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
  timestamp: Date;
  toolsUsed?: string[];
  entities?: ExtractedEntity[];
}

/**
 * Extracted entity from conversation
 */
export interface ExtractedEntity {
  type: 'person' | 'place' | 'date' | 'time' | 'event' | 'preference' | 'task' | 'other';
  value: string;
  confidence: number;
  context?: string;
}

/**
 * Long-term memory (persistent facts)
 */
export interface LongTermMemory extends MemoryEntry {
  category: string;
  relationships: MemoryRelationship[];
  verificationStatus: 'unverified' | 'verified' | 'outdated';
}

/**
 * Relationship between memories
 */
export interface MemoryRelationship {
  targetId: string;
  type: 'related' | 'contradicts' | 'supports' | 'supersedes';
  strength: number;
}

/**
 * User preferences
 */
export interface UserPreferences {
  userId: string;
  
  // Communication style
  communicationStyle: 'concise' | 'detailed' | 'casual' | 'formal';
  responseLength: 'short' | 'medium' | 'long';
  
  // Voice preferences
  preferredVoice: string;
  speechSpeed: number;
  
  // UI preferences
  theme: 'light' | 'dark' | 'system';
  dashboardLayout: string[];
  
  // Agent preferences
  defaultAgent: string;
  agentPersonality: 'professional' | 'friendly' | 'witty';
  
  // Privacy
  memoryRetention: 'session' | 'week' | 'month' | 'forever';
  shareAnalytics: boolean;
  
  // Custom preferences
  custom: Record<string, unknown>;
  
  updatedAt: Date;
}

/**
 * Memory search query
 */
export interface MemoryQuery {
  userId: string;
  query?: string;
  types?: MemoryType[];
  tags?: string[];
  minImportance?: MemoryImportance;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  useSemanticSearch?: boolean;
}

/**
 * Memory search result
 */
export interface MemorySearchResult {
  entry: MemoryEntry;
  relevanceScore: number;
  matchType: 'exact' | 'semantic' | 'tag';
}

/**
 * Proactive suggestion
 */
export interface ProactiveSuggestion {
  id: string;
  type: 'reminder' | 'recommendation' | 'follow-up' | 'alert' | 'tip';
  title: string;
  description: string;
  action?: {
    type: 'message' | 'navigate' | 'execute';
    payload: string;
  };
  priority: 'low' | 'medium' | 'high';
  context: string;
  expiresAt?: Date;
  dismissed: boolean;
  createdAt: Date;
}

/**
 * Context for generating suggestions
 */
export interface SuggestionContext {
  currentTime: Date;
  dayOfWeek: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  weather?: {
    temp: number;
    condition: string;
  };
  recentTopics: string[];
  pendingTasks: number;
  upcomingEvents: number;
  lastInteraction?: Date;
}
