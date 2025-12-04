/**
 * Shared database schemas using Zod
 * Ensures RxDB and Supabase stay in sync
 */

import { z } from 'zod';

export const chatMessageSchema = z.object({
  id: z.string(),
  userId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  agentName: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const userPreferencesSchema = z.object({
  id: z.string(),
  userId: z.string(),
  theme: z.string().default('dark'),
  dashboardLayout: z.record(z.unknown()).optional(),
  preferredAgent: z.string().optional(),
  updatedAt: z.string().datetime(),
});

export const deviceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  type: z.string(),
  state: z.string(),
  attributes: z.record(z.unknown()).optional(),
  updatedAt: z.string().datetime(),
});

export const knowledgeBaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type Device = z.infer<typeof deviceSchema>;
export type KnowledgeBase = z.infer<typeof knowledgeBaseSchema>;
