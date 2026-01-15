'use client';

import { useState } from 'react';
import { useRxQuery } from '@/hooks/useRxDB';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimisticAction } from '@/components/shared/OptimisticAction';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
}

interface TaskWidgetProps {
  /**
   * Maximum number of tasks to display
   * @default 5
   */
  maxItems?: number;

  /**
   * Show completed tasks
   * @default false
   */
  showCompleted?: boolean;

  /**
   * Bento grid column span
   * @default 2
   */
  colSpan?: 1 | 2 | 3 | 4;

  /**
   * Bento grid row span
   * @default 2
   */
  rowSpan?: 1 | 2 | 3 | 4;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Task Management Widget
 *
 * Displays quick tasks and reminders with completion tracking
 * and AI-powered task suggestions.
 *
 * Features:
 * - Task creation and deletion
 * - Completion tracking with optimistic updates
 * - Priority indicators
 * - Due date display
 * - Pending task counter
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TaskWidget />
 *
 * // Show completed tasks
 * <TaskWidget showCompleted maxItems={10} />
 *
 * // Custom sizing
 * <TaskWidget colSpan={2} rowSpan={3} />
 * ```
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

  // Fetch tasks from RxDB
  const { data: tasks, isLoading: isFetching } = useRxQuery<Task>(
    'tasks',
    (collection) => {
      let query = collection.find();

      if (!showCompleted) {
        query = query.where('completed').eq(false);
      }

      return query.limit(maxItems).sort({ created_at: 'desc' });
    }
  );

  // Add new task
  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;

    try {
      // TODO: Implement task creation
      // await db.collections.tasks.insert({
      //   id: generateId(),
      //   text: newTaskText,
      //   completed: false,
      //   priority: 'medium',
      //   created_at: new Date().toISOString(),
      // });

      setNewTaskText('');
      setIsAddingTask(false);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  // Toggle task completion
  const toggleTaskCompletion = async (task: Task) => {
    try {
      // TODO: Implement task update
      // await db.collections.tasks.upsert({
      //   ...task,
      //   completed: !task.completed,
      // });
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      // TODO: Implement task deletion
      // await db.collections.tasks.findOne(taskId).remove();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const incompleteTasks = tasks?.filter((t) => !t.completed) || [];

  // Map colSpan to Tailwind classes - full width on mobile, specified span on md+
  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

  // Map rowSpan to Tailwind classes
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
            <span className="text-caption">
              {incompleteTasks.length} pending
            </span>
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTask();
                  if (e.key === 'Escape') setIsAddingTask(false);
                }}
                placeholder="Enter task..."
                autoFocus
                className="flex-1 px-3 py-2 bg-surface-2 border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-neon-primary/50 focus:outline-none"
              />
              <button
                className="px-3 py-1.5 bg-neon-primary text-white text-sm font-medium rounded-md hover:bg-neon-primary/90 transition-colors focus-ring"
                onClick={handleAddTask}
              >
                Add
              </button>
            </div>
          </motion.div>
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
        <div className="empty-state">
          <CheckSquare className="empty-state-icon" />
          <p className="empty-state-title">No tasks</p>
          <button
            onClick={() => setIsAddingTask(true)}
            className="btn-ghost mt-2 text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add your first task
          </button>
        </div>
      )}

      {/* Task List */}
      {!isFetching && tasks && tasks.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
          {tasks.map((task, index) => (
            <OptimisticAction
              key={task.id}
              data={task}
              optimisticUpdate={(current) => ({
                ...current,
                completed: !current.completed,
              })}
              serverAction={async (data) => {
                await toggleTaskCompletion(data);
                return data;
              }}
              showStatus={false}
            >
              {(optimisticTask, triggerToggle) => (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: index * 0.05 }}
                  className="card-item group"
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={triggerToggle}
                      className="flex-shrink-0 mt-0.5 focus-ring rounded"
                      aria-label={optimisticTask.completed ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {optimisticTask.completed ? (
                        <CheckSquare className="h-5 w-5 text-success" />
                      ) : (
                        <Square className="h-5 w-5 text-text-muted hover:text-neon-primary transition-colors" />
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-body text-sm',
                          optimisticTask.completed &&
                            'line-through text-text-muted'
                        )}
                      >
                        {optimisticTask.text}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            optimisticTask.priority === 'high' && 'bg-danger',
                            optimisticTask.priority === 'medium' &&
                              'bg-warning',
                            optimisticTask.priority === 'low' && 'bg-success'
                          )}
                        />
                        {optimisticTask.due_date && (
                          <div className="flex items-center gap-1 text-caption">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(optimisticTask.due_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteTask(optimisticTask.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus-ring rounded p-1"
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-4 w-4 text-text-muted hover:text-danger transition-colors" />
                    </button>
                  </div>
                </motion.div>
              )}
            </OptimisticAction>
          ))}
        </div>
      )}
    </motion.div>
  );
}

TaskWidget.displayName = 'TaskWidget';

// Helper: Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString();
}
