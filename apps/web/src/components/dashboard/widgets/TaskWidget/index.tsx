'use client';

import { useState } from 'react';
import { useRxQuery, useRxDB } from '@/hooks/useRxDB';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { TaskItem, AddTaskInput, EmptyState } from './components';
import type { Task, TaskWidgetProps } from './types';

/**
 * Task Management Widget
 *
 * Displays quick tasks and reminders with completion tracking
 * and AI-powered task suggestions.
 */
export function TaskWidget({
  maxItems = 5,
  showCompleted = false,
  colSpan = 2,
  rowSpan = 2,
  className,
}: TaskWidgetProps) {
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const { db } = useRxDB();
  const { userId } = useAuth();

  // Fetch tasks from RxDB
  const { data: tasks, isLoading: isFetching } = useRxQuery<Task>(
    'tasks',
    (collection) => {
      let query = collection.find().where('userId').eq(userId || '');

      if (!showCompleted) {
        query = query.where('completed').eq(false);
      }

      return query.limit(maxItems).sort({ created_at: 'desc' });
    }
  );

  const handleAddTask = async () => {
    if (!newTaskText.trim() || !db || !userId) return;

    try {
      const now = new Date().toISOString();
      await db.tasks.insert({
        id: crypto.randomUUID(),
        userId,
        text: newTaskText.trim(),
        completed: false,
        priority: 'medium',
        created_at: now,
        updatedAt: now,
      });

      setNewTaskText('');
      setIsAddingTask(false);
    } catch (error) {
      logger.error('Failed to add task', { error });
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    if (!db || !userId) return;

    try {
      const doc = await db.tasks.findOne(task.id).exec();
      if (doc) {
        await doc.patch({
          completed: !task.completed,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to toggle task', { error });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!db) return;

    try {
      const doc = await db.tasks.findOne(taskId).exec();
      if (doc) {
        await doc.remove();
      }
    } catch (error) {
      logger.error('Failed to delete task', { error });
    }
  };

  const incompleteTasks = tasks?.filter((t) => !t.completed) || [];

  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

  const rowSpanClasses: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'surface-matte p-4 flex flex-col overflow-hidden w-full',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {/* Header */}
      <div className="widget-header mb-4">
        <div className="widget-header-title">
          <CheckSquare className="h-4 w-4 text-neon-primary" />
          <h3 className="text-heading text-sm">Tasks</h3>
        </div>
        <div className="flex items-center gap-2">
          {incompleteTasks.length > 0 && (
            <span className="text-caption">{incompleteTasks.length} pending</span>
          )}
          <button
            className="btn-icon btn-icon-sm focus-ring"
            onClick={() => setIsAddingTask(true)}
            aria-label="Add task"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Add Task Input */}
      <AnimatePresence>
        {isAddingTask && (
          <AddTaskInput
            value={newTaskText}
            onChange={setNewTaskText}
            onSubmit={handleAddTask}
            onCancel={() => setIsAddingTask(false)}
          />
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isFetching && (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-neon-primary/50 border-t-neon-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isFetching && (!tasks || tasks.length === 0) && (
        <EmptyState onAddTask={() => setIsAddingTask(true)} />
      )}

      {/* Task List */}
      {!isFetching && tasks && tasks.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
          {tasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              index={index}
              onToggle={toggleTaskCompletion}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

TaskWidget.displayName = 'TaskWidget';

export default TaskWidget;
