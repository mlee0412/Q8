/**
 * Shared TypeScript types for Q8 monorepo
 */

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentName?: string;
  timestamp: Date;
}

export interface Agent {
  name: string;
  model: string;
  capabilities: string[];
}

export type AgentType = 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality' | 'home';
