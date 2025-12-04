/**
 * Supabase Database Types
 * Types for threads, messages, and memories
 */

export type MemoryType = 'fact' | 'preference' | 'task' | 'event' | 'relationship';
export type MemoryImportance = 'low' | 'medium' | 'high' | 'critical';
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Thread (conversation) record
 */
export interface Thread {
  id: string;
  user_id: string;
  title: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  is_archived: boolean;
  metadata: Record<string, unknown>;
}

/**
 * Chat message record
 */
export interface ChatMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  agent_name: string | null;
  tool_executions: ToolExecution[];
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Tool execution tracking
 */
export interface ToolExecution {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed';
  result?: unknown;
  duration?: number;
}

/**
 * Agent memory record
 */
export interface AgentMemory {
  id: string;
  user_id: string;
  content: string;
  memory_type: MemoryType;
  importance: MemoryImportance;
  source_thread_id: string | null;
  embedding: number[] | null;
  tags: string[];
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  access_count: number;
  last_accessed_at: string | null;
}

/**
 * Memory search result
 */
export interface MemorySearchResult {
  id: string;
  content: string;
  memory_type: MemoryType;
  importance: MemoryImportance;
  tags: string[];
  similarity: number;
  created_at: string;
}

/**
 * Thread with message count
 */
export interface ThreadWithCount extends Thread {
  message_count?: number;
  last_message_preview?: string;
}

/**
 * Insert types (without auto-generated fields)
 */
export interface ThreadInsert {
  user_id: string;
  title?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ChatMessageInsert {
  thread_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  agent_name?: string;
  tool_executions?: ToolExecution[];
  metadata?: Record<string, unknown>;
}

export interface AgentMemoryInsert {
  user_id: string;
  content: string;
  memory_type: MemoryType;
  importance?: MemoryImportance;
  source_thread_id?: string;
  embedding?: number[] | null;
  tags?: string[];
  expires_at?: string;
}

/**
 * Update types
 */
export interface ThreadUpdate {
  title?: string;
  summary?: string;
  is_archived?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AgentMemoryUpdate {
  content?: string;
  memory_type?: MemoryType;
  importance?: MemoryImportance;
  tags?: string[];
  expires_at?: string | null;
}

// ============================================================
// NOTES TYPES
// ============================================================

/**
 * Tiptap/ProseMirror JSON content type
 */
export interface JSONContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: {
    type: string;
    attrs?: Record<string, unknown>;
  }[];
  text?: string;
}

/**
 * Action item extracted from notes
 */
export interface ActionItem {
  id: string;
  task: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
}

/**
 * Note record
 */
export interface Note {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  content_json: JSONContent | null;
  folder_id: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  is_locked: boolean;
  is_daily: boolean;
  daily_date: string | null;
  color: string | null;
  tags: string[];
  word_count: number;
  ai_summary: string | null;
  ai_action_items: ActionItem[] | null;
  created_at: string;
  updated_at: string;
  last_edited_at: string;
  archived_at: string | null;
}

/**
 * Note folder record
 */
export interface NoteFolder {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Note attachment record
 */
export interface NoteAttachment {
  id: string;
  note_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

/**
 * Note with folder info
 */
export interface NoteWithFolder extends Note {
  folder?: NoteFolder | null;
}

/**
 * Note search result
 */
export interface NoteSearchResult {
  id: string;
  title: string | null;
  content: string;
  tags: string[];
  similarity: number;
}

/**
 * Insert types for notes
 */
export interface NoteInsert {
  user_id: string;
  title?: string | null;
  content?: string;
  content_json?: JSONContent | null;
  folder_id?: string | null;
  is_pinned?: boolean;
  is_daily?: boolean;
  daily_date?: string | null;
  color?: string | null;
  tags?: string[];
}

export interface NoteFolderInsert {
  user_id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  parent_id?: string | null;
  sort_order?: number;
}

/**
 * Update types for notes
 */
export interface NoteUpdate {
  title?: string | null;
  content?: string;
  content_json?: JSONContent | null;
  folder_id?: string | null;
  is_pinned?: boolean;
  is_archived?: boolean;
  is_locked?: boolean;
  color?: string | null;
  tags?: string[];
  word_count?: number;
  ai_summary?: string | null;
  ai_action_items?: ActionItem[] | null;
  last_edited_at?: string;
  archived_at?: string | null;
}

export interface NoteFolderUpdate {
  name?: string;
  icon?: string | null;
  color?: string | null;
  parent_id?: string | null;
  sort_order?: number;
}
