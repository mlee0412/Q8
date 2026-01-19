'use client';

import { useCallback } from 'react';
import { useRxDB } from '@/hooks/useRxDB';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { pushChanges } from '@/lib/sync/push';
import type { Task, TaskStatus, TaskPriority } from '../types';

interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  tags?: string[];
  projectId?: string;
  parentTaskId?: string;
  estimatedMinutes?: number;
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  tags?: string[];
  projectId?: string | null;
  parentTaskId?: string | null;
  sortOrder?: number;
  estimatedMinutes?: number | null;
  completedAt?: string | null;
}

export function useTaskMutations() {
  const { db, isLoading: dbLoading } = useRxDB();
  const { userId, isLoading: authLoading } = useAuth();

  const isReady = !dbLoading && !authLoading && !!db && !!userId;

  // Helper to sync tasks to Supabase after mutations
  const syncTasks = useCallback(async () => {
    if (!db) return;
    try {
      await pushChanges(db, 'tasks');
      logger.debug('Tasks synced to Supabase');
    } catch (error) {
      logger.error('Failed to sync tasks to Supabase', { error });
    }
  }, [db]);

  const createTask = useCallback(
    async (input: CreateTaskInput): Promise<Task | null> => {
      if (!db || !userId) {
        logger.error('Cannot create task: db or userId missing', { 
          hasDb: !!db, 
          hasUserId: !!userId,
          dbLoading,
          authLoading 
        });
        return null;
      }

      try {
        const now = new Date().toISOString();
        const maxSortOrder = await db.tasks
          .find()
          .where('userId')
          .eq(userId)
          .where('status')
          .eq(input.status || 'todo')
          .exec()
          .then((docs) =>
            docs.reduce((max, doc) => Math.max(max, doc.sortOrder || 0), 0)
          );

        const newTask: Task = {
          id: crypto.randomUUID(),
          userId,
          title: input.title,
          description: input.description,
          status: input.status || 'todo',
          priority: input.priority || 'medium',
          dueDate: input.dueDate,
          tags: input.tags || [],
          projectId: input.projectId,
          parentTaskId: input.parentTaskId,
          sortOrder: maxSortOrder + 1000,
          estimatedMinutes: input.estimatedMinutes,
          createdAt: now,
          updatedAt: now,
        };

        await db.tasks.insert(newTask);
        logger.info('Task created', { taskId: newTask.id });
        
        // Sync to Supabase
        syncTasks();
        
        return newTask;
      } catch (error) {
        logger.error('Failed to create task', { error });
        return null;
      }
    },
    [db, userId, dbLoading, authLoading, syncTasks]
  );

  const updateTask = useCallback(
    async (taskId: string, updates: UpdateTaskInput): Promise<Task | null> => {
      if (!db) {
        logger.error('Cannot update task: db missing');
        return null;
      }

      try {
        const doc = await db.tasks.findOne(taskId).exec();
        if (!doc) {
          logger.error('Task not found', { taskId });
          return null;
        }

        const updateData: Record<string, unknown> = {
          updatedAt: new Date().toISOString(),
        };

        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description || undefined;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.priority !== undefined) updateData.priority = updates.priority;
        if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate || undefined;
        if (updates.tags !== undefined) updateData.tags = updates.tags;
        if (updates.projectId !== undefined) updateData.projectId = updates.projectId || undefined;
        if (updates.parentTaskId !== undefined) updateData.parentTaskId = updates.parentTaskId || undefined;
        if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
        if (updates.estimatedMinutes !== undefined) updateData.estimatedMinutes = updates.estimatedMinutes || undefined;

        if (updates.status === 'done' && doc.status !== 'done') {
          updateData.completedAt = new Date().toISOString();
        } else if (updates.status && updates.status !== 'done' && doc.status === 'done') {
          updateData.completedAt = undefined;
        }

        await doc.patch(updateData);
        logger.info('Task updated', { taskId });
        
        // Sync to Supabase
        syncTasks();
        
        return doc.toJSON() as Task;
      } catch (error) {
        logger.error('Failed to update task', { error, taskId });
        return null;
      }
    },
    [db, syncTasks]
  );

  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      if (!db) {
        logger.error('Cannot delete task: db missing');
        return false;
      }

      try {
        const doc = await db.tasks.findOne(taskId).exec();
        if (doc) {
          await doc.remove();
          logger.info('Task deleted', { taskId });
          
          // Sync to Supabase
          syncTasks();
          
          return true;
        }
        return false;
      } catch (error) {
        logger.error('Failed to delete task', { error, taskId });
        return false;
      }
    },
    [db, syncTasks]
  );

  const rebalanceSortOrders = useCallback(
    async (tasks: Task[], _status: TaskStatus) => {
      if (!db) return;

      const sortedTasks = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
      for (let i = 0; i < sortedTasks.length; i++) {
        const task = sortedTasks[i];
        if (task) {
          const doc = await db.tasks.findOne(task.id).exec();
          if (doc) {
            await doc.patch({ sortOrder: (i + 1) * 1000 });
          }
        }
      }
    },
    [db]
  );

  const moveTask = useCallback(
    async (
      taskId: string,
      newStatus: TaskStatus,
      newIndex: number,
      tasksInColumn: Task[]
    ): Promise<boolean> => {
      if (!db) {
        logger.error('Cannot move task: db missing');
        return false;
      }

      try {
        let newSortOrder: number;

        if (tasksInColumn.length === 0) {
          newSortOrder = 1000;
        } else if (newIndex === 0) {
          const firstTask = tasksInColumn[0];
          newSortOrder = firstTask ? firstTask.sortOrder - 1000 : 1000;
        } else if (newIndex >= tasksInColumn.length) {
          const lastTask = tasksInColumn[tasksInColumn.length - 1];
          newSortOrder = lastTask ? lastTask.sortOrder + 1000 : 1000;
        } else {
          const prevTask = tasksInColumn[newIndex - 1];
          const nextTask = tasksInColumn[newIndex];
          const prevOrder = prevTask?.sortOrder ?? 0;
          const nextOrder = nextTask?.sortOrder ?? prevOrder + 2000;
          newSortOrder = Math.floor((prevOrder + nextOrder) / 2);

          if (newSortOrder === prevOrder || newSortOrder === nextOrder) {
            await rebalanceSortOrders(tasksInColumn, newStatus);
            newSortOrder = (newIndex + 1) * 1000;
          }
        }

        const doc = await db.tasks.findOne(taskId).exec();
        if (!doc) return false;

        const updateData: Record<string, unknown> = {
          status: newStatus,
          sortOrder: newSortOrder,
          updatedAt: new Date().toISOString(),
        };

        if (newStatus === 'done' && doc.status !== 'done') {
          updateData.completedAt = new Date().toISOString();
        } else if (newStatus !== 'done' && doc.status === 'done') {
          updateData.completedAt = undefined;
        }

        await doc.patch(updateData);
        logger.info('Task moved', { taskId, newStatus, newIndex });
        
        // Sync to Supabase
        syncTasks();
        
        return true;
      } catch (error) {
        logger.error('Failed to move task', { error, taskId });
        return false;
      }
    },
    [db, rebalanceSortOrders, syncTasks]
  );

  const toggleTaskStatus = useCallback(
    async (task: Task): Promise<Task | null> => {
      const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
      return updateTask(task.id, { status: newStatus });
    },
    [updateTask]
  );

  const bulkUpdateStatus = useCallback(
    async (taskIds: string[], status: TaskStatus): Promise<boolean> => {
      if (!db) return false;

      try {
        const now = new Date().toISOString();
        for (const taskId of taskIds) {
          const doc = await db.tasks.findOne(taskId).exec();
          if (doc) {
            const updateData: Partial<Task> = {
              status,
              updatedAt: now,
            };
            if (status === 'done') {
              updateData.completedAt = now;
            } else {
              updateData.completedAt = undefined;
            }
            await doc.patch(updateData);
          }
        }
        logger.info('Bulk status update', { count: taskIds.length, status });
        
        // Sync to Supabase
        syncTasks();
        
        return true;
      } catch (error) {
        logger.error('Failed bulk status update', { error });
        return false;
      }
    },
    [db, syncTasks]
  );

  const bulkDelete = useCallback(
    async (taskIds: string[]): Promise<boolean> => {
      if (!db) return false;

      try {
        for (const taskId of taskIds) {
          const doc = await db.tasks.findOne(taskId).exec();
          if (doc) {
            await doc.remove();
          }
        }
        logger.info('Bulk delete', { count: taskIds.length });
        
        // Sync to Supabase
        syncTasks();
        
        return true;
      } catch (error) {
        logger.error('Failed bulk delete', { error });
        return false;
      }
    },
    [db, syncTasks]
  );

  return {
    isReady,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    toggleTaskStatus,
    bulkUpdateStatus,
    bulkDelete,
  };
}
