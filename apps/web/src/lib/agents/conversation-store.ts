/**
 * Conversation Store
 * In-memory conversation history for agent context
 */

import type { AgentMessage } from './types';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent?: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// In-memory store (can be replaced with Redis/DB later)
const conversations = new Map<string, Conversation>();

// Max messages to keep in context (to avoid token limits)
const MAX_CONTEXT_MESSAGES = 20;

/**
 * Get or create a conversation
 */
export function getConversation(sessionId: string): Conversation {
  let conversation = conversations.get(sessionId);
  
  if (!conversation) {
    conversation = {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    conversations.set(sessionId, conversation);
  }
  
  return conversation;
}

/**
 * Add a message to conversation history
 */
export function addMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  agent?: string
): void {
  const conversation = getConversation(sessionId);
  
  conversation.messages.push({
    role,
    content,
    agent,
    timestamp: new Date(),
  });
  
  // Trim to max context size
  if (conversation.messages.length > MAX_CONTEXT_MESSAGES) {
    conversation.messages = conversation.messages.slice(-MAX_CONTEXT_MESSAGES);
  }
  
  conversation.updatedAt = new Date();
}

/**
 * Get conversation history formatted for LLM
 */
export function getConversationHistory(
  sessionId: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const conversation = getConversation(sessionId);
  
  return conversation.messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));
}

/**
 * Clear conversation history
 */
export function clearConversation(sessionId: string): void {
  conversations.delete(sessionId);
}

/**
 * Get all active conversations (for debugging)
 */
export function getAllConversations(): Map<string, Conversation> {
  return conversations;
}
