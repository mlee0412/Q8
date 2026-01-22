/**
 * RxDB Schema Definitions
 * Must match Supabase table structures for proper sync
 */

import type { RxJsonSchema } from 'rxdb';

/**
 * Users Schema - For offline access to current user data
 */
export const usersSchema: RxJsonSchema<{
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  updated_at: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    email: {
      type: 'string',
      maxLength: 255,
    },
    full_name: {
      type: 'string',
      maxLength: 255,
    },
    avatar_url: {
      type: 'string',
      maxLength: 500,
    },
    role: {
      type: 'string',
      maxLength: 50,
      default: 'user',
    },
    created_at: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'email', 'role', 'created_at', 'updated_at'],
  indexes: ['email'],
};

/**
 * Chat Messages Schema
 */
export const chatMessageSchema: RxJsonSchema<{
  id: string;
  userId: string;
  role: 'user' | 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality';
  content: string;
  agent_name?: string;
  avatar?: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  conversation_id: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    role: {
      type: 'string',
      enum: ['user', 'orchestrator', 'coder', 'researcher', 'secretary', 'personality'],
    },
    content: {
      type: 'string',
    },
    agent_name: {
      type: 'string',
      maxLength: 100,
    },
    avatar: {
      type: 'string',
      maxLength: 500,
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    status: {
      type: 'string',
      enum: ['sending', 'sent', 'error'],
    },
    conversation_id: {
      type: 'string',
      maxLength: 100,
    },
  },
  required: ['id', 'userId', 'role', 'content', 'timestamp', 'conversation_id'],
  indexes: ['userId', 'conversation_id', 'timestamp'],
};

/**
 * User Preferences Schema
 */
export const userPreferencesSchema: RxJsonSchema<{
  id: string;
  userId: string;
  theme: string;
  dashboardLayout?: Record<string, unknown>;
  preferredAgent?: string;
  updatedAt: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    theme: {
      type: 'string',
      default: 'dark',
      maxLength: 50,
    },
    dashboardLayout: {
      type: 'object',
    },
    preferredAgent: {
      type: 'string',
      maxLength: 100,
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'userId', 'updatedAt'],
  indexes: ['userId'],
};

/**
 * Devices/Integrations Schema
 */
export const deviceSchema: RxJsonSchema<{
  id: string;
  userId: string;
  name: string;
  type: string;
  state: string;
  attributes?: Record<string, unknown>;
  updatedAt: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    name: {
      type: 'string',
      maxLength: 200,
    },
    type: {
      type: 'string',
      maxLength: 100,
    },
    state: {
      type: 'string',
      maxLength: 100,
    },
    attributes: {
      type: 'object',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'userId', 'name', 'type', 'state', 'updatedAt'],
  indexes: ['userId', 'type'],
};

/**
 * Knowledge Base (RAG) Schema
 */
export const knowledgeBaseSchema: RxJsonSchema<{
  id: string;
  userId: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    content: {
      type: 'string',
    },
    embedding: {
      type: 'array',
      items: {
        type: 'number',
      },
    },
    metadata: {
      type: 'object',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'userId', 'content', 'createdAt'],
  indexes: ['userId', 'createdAt'],
};

/**
 * GitHub Pull Requests Schema
 */
export const githubPRSchema: RxJsonSchema<{
  id: string;
  userId: string;
  number: number;
  title: string;
  status: string;
  author: string;
  repo: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    number: {
      type: 'number',
    },
    title: {
      type: 'string',
      maxLength: 500,
    },
    status: {
      type: 'string',
      maxLength: 50,
    },
    author: {
      type: 'string',
      maxLength: 200,
    },
    repo: {
      type: 'string',
      maxLength: 200,
    },
    url: {
      type: 'string',
      maxLength: 500,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'userId', 'number', 'title', 'status', 'author', 'repo', 'url', 'createdAt', 'updatedAt'],
  indexes: ['userId', 'status', 'repo'],
};

/**
 * Calendar Events Schema
 */
export const calendarEventSchema: RxJsonSchema<{
  id: string;
  userId: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  meeting_url?: string;
  attendees_count?: number;
  color?: string;
  calendar_name: string;
  createdAt: string;
  updatedAt: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    title: {
      type: 'string',
      maxLength: 500,
    },
    start_time: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    end_time: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    location: {
      type: 'string',
      maxLength: 300,
    },
    meeting_url: {
      type: 'string',
      maxLength: 500,
    },
    attendees_count: {
      type: 'number',
    },
    color: {
      type: 'string',
      maxLength: 50,
    },
    calendar_name: {
      type: 'string',
      maxLength: 200,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'userId', 'title', 'start_time', 'end_time', 'calendar_name', 'createdAt', 'updatedAt'],
  indexes: ['userId', 'start_time', 'calendar_name'],
};

/**
 * Tasks Schema - Enhanced for Kanban board task management
 */
export const taskSchema: RxJsonSchema<{
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  tags?: string[];
  projectId?: string;
  parentTaskId?: string;
  sortOrder: number;
  estimatedMinutes?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}> = {
  version: 3,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    title: {
      type: 'string',
      maxLength: 500,
    },
    description: {
      type: 'string',
      maxLength: 5000,
    },
    status: {
      type: 'string',
      enum: ['backlog', 'todo', 'in_progress', 'review', 'done'],
      default: 'todo',
      maxLength: 20,
    },
    priority: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      maxLength: 10,
    },
    dueDate: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 50,
      },
      maxItems: 10,
    },
    projectId: {
      type: 'string',
      maxLength: 100,
    },
    parentTaskId: {
      type: 'string',
      maxLength: 100,
    },
    sortOrder: {
      type: 'number',
      default: 0,
      minimum: -9999999,
      maximum: 9999999,
      multipleOf: 1,
    },
    estimatedMinutes: {
      type: 'number',
    },
    completedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'userId', 'title', 'status', 'priority', 'sortOrder', 'createdAt', 'updatedAt'],
  indexes: ['userId', 'status', 'priority', 'dueDate', 'projectId', 'parentTaskId', 'sortOrder'],
};

/**
 * Notes Schema - Rich text notes with folders, daily notes, and AI features
 * Matches Supabase notes table for real-time sync
 */
export const notesSchema: RxJsonSchema<{
  id: string;
  userId: string;
  title?: string;
  content: string;
  contentJson?: Record<string, unknown>;
  folderId?: string;
  isPinned: boolean;
  isArchived: boolean;
  isLocked: boolean;
  isDaily: boolean;
  dailyDate?: string;
  color?: string;
  tags: string[];
  wordCount: number;
  aiSummary?: string;
  aiActionItems?: Array<{
    id: string;
    task: string;
    completed: boolean;
    dueDate?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  lastEditedAt: string;
  archivedAt?: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    title: {
      type: 'string',
      maxLength: 500,
    },
    content: {
      type: 'string',
    },
    contentJson: {
      type: 'object',
    },
    folderId: {
      type: 'string',
      maxLength: 100,
    },
    isPinned: {
      type: 'boolean',
      default: false,
    },
    isArchived: {
      type: 'boolean',
      default: false,
    },
    isLocked: {
      type: 'boolean',
      default: false,
    },
    isDaily: {
      type: 'boolean',
      default: false,
    },
    dailyDate: {
      type: 'string',
      format: 'date',
      maxLength: 20,
    },
    color: {
      type: 'string',
      maxLength: 50,
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 50,
      },
      default: [],
    },
    wordCount: {
      type: 'number',
      default: 0,
    },
    aiSummary: {
      type: 'string',
    },
    aiActionItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          task: { type: 'string' },
          completed: { type: 'boolean' },
          dueDate: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    lastEditedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    archivedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'userId', 'content', 'isPinned', 'isArchived', 'isLocked', 'isDaily', 'tags', 'wordCount', 'createdAt', 'updatedAt', 'lastEditedAt'],
  indexes: ['userId', 'folderId', 'isPinned', 'isDaily', 'dailyDate', 'updatedAt'],
};

/**
 * Note Folders Schema - Hierarchical folder organization for notes
 * Matches Supabase note_folders table for real-time sync
 */
export const noteFoldersSchema: RxJsonSchema<{
  id: string;
  userId: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    name: {
      type: 'string',
      maxLength: 200,
    },
    icon: {
      type: 'string',
      maxLength: 50,
    },
    color: {
      type: 'string',
      maxLength: 50,
    },
    parentId: {
      type: 'string',
      maxLength: 100,
    },
    sortOrder: {
      type: 'number',
      default: 0,
      multipleOf: 1,
      minimum: -9999999,
      maximum: 9999999,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'userId', 'name', 'sortOrder', 'createdAt', 'updatedAt'],
  indexes: ['userId', 'parentId', 'sortOrder'],
};

/**
 * Threads Schema - Chat conversation threads
 * Matches Supabase threads table for real-time sync
 */
export const threadsSchema: RxJsonSchema<{
  id: string;
  userId: string;
  title?: string;
  summary?: string;
  isArchived: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    title: {
      type: 'string',
      maxLength: 500,
    },
    summary: {
      type: 'string',
    },
    isArchived: {
      type: 'boolean',
      default: false,
    },
    metadata: {
      type: 'object',
      default: {},
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    lastMessageAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'userId', 'isArchived', 'metadata', 'createdAt', 'updatedAt', 'lastMessageAt'],
  indexes: ['userId', 'isArchived', 'lastMessageAt', 'updatedAt'],
};

/**
 * Agent Memories Schema - AI agent memory storage with embeddings
 * Matches Supabase agent_memories table for real-time sync
 */
export const agentMemoriesSchema: RxJsonSchema<{
  id: string;
  userId: string;
  content: string;
  memoryType: 'fact' | 'preference' | 'task' | 'event' | 'relationship';
  importance: 'low' | 'medium' | 'high' | 'critical';
  sourceThreadId?: string;
  sourceMessageId?: string;
  tags: string[];
  keywords: string[];
  expiresAt?: string;
  accessCount: number;
  lastAccessedAt?: string;
  decayFactor: number;
  verificationStatus: 'unverified' | 'verified' | 'contradicted';
  supersededBy?: string;
  provenance: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    content: {
      type: 'string',
    },
    memoryType: {
      type: 'string',
      enum: ['fact', 'preference', 'task', 'event', 'relationship'],
      maxLength: 20,
    },
    importance: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      maxLength: 20,
    },
    sourceThreadId: {
      type: 'string',
      maxLength: 100,
    },
    sourceMessageId: {
      type: 'string',
      maxLength: 100,
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 50,
      },
      default: [],
    },
    keywords: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 100,
      },
      default: [],
    },
    expiresAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    accessCount: {
      type: 'number',
      default: 0,
    },
    lastAccessedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    decayFactor: {
      type: 'number',
      default: 1.0,
    },
    verificationStatus: {
      type: 'string',
      enum: ['unverified', 'verified', 'contradicted'],
      default: 'unverified',
    },
    supersededBy: {
      type: 'string',
      maxLength: 100,
    },
    provenance: {
      type: 'object',
      default: {},
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'userId', 'content', 'memoryType', 'importance', 'tags', 'keywords', 'accessCount', 'decayFactor', 'verificationStatus', 'provenance', 'createdAt', 'updatedAt'],
  indexes: ['userId', 'memoryType', 'importance', 'sourceThreadId', 'updatedAt'],
};

/**
 * Sync Checkpoints Schema - Track sync state per collection
 * Local-only, used to track last sync timestamps
 */
export const syncCheckpointsSchema: RxJsonSchema<{
  id: string;
  userId: string;
  collectionName: string;
  lastPulledAt?: string;
  lastPushedAt?: string;
  serverVersion?: string;
  createdAt: string;
  updatedAt: string;
}> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 200,
    },
    userId: {
      type: 'string',
      maxLength: 100,
    },
    collectionName: {
      type: 'string',
      maxLength: 100,
    },
    lastPulledAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    lastPushedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    serverVersion: {
      type: 'string',
      maxLength: 100,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: ['id', 'userId', 'collectionName', 'createdAt', 'updatedAt'],
  indexes: ['userId', 'collectionName'],
};
