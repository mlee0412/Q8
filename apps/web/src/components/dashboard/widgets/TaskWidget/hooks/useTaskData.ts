'use client';

import { useMemo } from 'react';
import { useRxQuery } from '@/hooks/useRxDB';
import { useAuth } from '@/hooks/useAuth';
import type { Task, TaskFilters, TaskStatus } from '../types';

interface UseTaskDataOptions {
  filters?: TaskFilters;
  limit?: number;
  parentTaskId?: string | null;
}

interface UseTaskDataReturn {
  tasks: Task[];
  tasksByStatus: Record<TaskStatus, Task[]>;
  isLoading: boolean;
  error: Error | null;
  taskCounts: {
    all: number;
    today: number;
    overdue: number;
    thisWeek: number;
    byStatus: Record<TaskStatus, number>;
  };
}

export function useTaskData(options: UseTaskDataOptions = {}): UseTaskDataReturn {
  const { filters, limit, parentTaskId } = options;
  const { userId } = useAuth();

  const { data: rawTasks, isLoading } = useRxQuery<Task>(
    'tasks',
    (collection) => {
      let query = collection.find().where('userId').eq(userId || '');

      if (parentTaskId === null) {
        query = query.where('parentTaskId').eq(undefined);
      } else if (parentTaskId) {
        query = query.where('parentTaskId').eq(parentTaskId);
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.where('status').in(filters.status);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.where('priority').in(filters.priority);
      }

      if (filters?.projectId) {
        query = query.where('projectId').eq(filters.projectId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      return query.sort({ sortOrder: 'asc' });
    }
  );

  const tasks = useMemo(() => {
    if (!rawTasks) return [];

    let filtered = [...rawTasks];

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.tags && filters.tags.length > 0) {
      filtered = filtered.filter((task) =>
        filters.tags!.some((tag) => task.tags?.includes(tag))
      );
    }

    if (filters?.dueDateRange) {
      const { start, end } = filters.dueDateRange;
      filtered = filtered.filter((task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        if (start && dueDate < new Date(start)) return false;
        if (end && dueDate > new Date(end)) return false;
        return true;
      });
    }

    return filtered;
  }, [rawTasks, filters]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return grouped;
  }, [tasks]);

  const taskCounts = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(today);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const activeTasks = tasks.filter((t) => t.status !== 'done');

    return {
      all: tasks.length,
      today: activeTasks.filter((task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate < endOfToday;
      }).length,
      overdue: activeTasks.filter((task) => {
        if (!task.dueDate) return false;
        return new Date(task.dueDate) < today;
      }).length,
      thisWeek: activeTasks.filter((task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate < endOfWeek;
      }).length,
      byStatus: {
        backlog: tasksByStatus.backlog.length,
        todo: tasksByStatus.todo.length,
        in_progress: tasksByStatus.in_progress.length,
        review: tasksByStatus.review.length,
        done: tasksByStatus.done.length,
      },
    };
  }, [tasks, tasksByStatus]);

  return {
    tasks,
    tasksByStatus,
    isLoading,
    error: null,
    taskCounts,
  };
}

export function useSubtasks(parentTaskId: string) {
  return useTaskData({ parentTaskId });
}
