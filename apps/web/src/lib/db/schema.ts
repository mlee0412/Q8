/**
 * RxDB Schema Definitions
 * Must match Supabase table structures for proper sync
 */

import type { RxJsonSchema } from 'rxdb';

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
 * Tasks Schema
 */
export const taskSchema: RxJsonSchema<{
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
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
    text: {
      type: 'string',
      maxLength: 1000,
    },
    completed: {
      type: 'boolean',
      default: false,
    },
    priority: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    due_date: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    created_at: {
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
  required: ['id', 'userId', 'text', 'completed', 'priority', 'created_at', 'updatedAt'],
  indexes: ['userId', 'completed', 'created_at'],
};
