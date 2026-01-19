/**
 * Task API validation schemas
 * Aligned with Kanban board statuses: backlog, todo, in_progress, review, done
 */
import { z } from 'zod';

export const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export const taskStatusEnum = z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(5000).optional(),
  dueDate: z.string().datetime().optional(),
  priority: taskPriorityEnum.default('medium'),
  status: taskStatusEnum.default('todo'),
  tags: z.array(z.string().max(50)).max(10).optional(),
  projectId: z.string().optional(),
  parentTaskId: z.string().optional(),
  sortOrder: z.number().optional(),
  estimatedMinutes: z.number().min(1).max(9999).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: taskPriorityEnum.optional(),
  status: taskStatusEnum.optional(),
  tags: z.array(z.string().max(50)).max(10).optional().nullable(),
  projectId: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  estimatedMinutes: z.number().min(1).max(9999).optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});

export const taskQuerySchema = z.object({
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  projectId: z.string().optional(),
  parentTaskId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
