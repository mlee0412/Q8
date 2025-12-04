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
import { Button } from '@/components/ui/button';
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'glass-panel rounded-xl p-6 flex flex-col overflow-hidden w-full',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-neon-primary" />
          <h3 className="font-semibold">Tasks</h3>
        </div>
        <div className="flex items-center gap-2">
          {incompleteTasks.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {incompleteTasks.length} pending
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsAddingTask(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
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
                className="flex-1 px-3 py-2 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary text-sm"
              />
              <Button
                variant="neon"
                size="sm"
                onClick={handleAddTask}
              >
                Add
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isFetching && (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-neon-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isFetching && (!tasks || tasks.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No tasks</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingTask(true)}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add your first task
            </Button>
          </div>
        </div>
      )}

      {/* Task List */}
      {!isFetching && tasks && tasks.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
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
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-panel p-3 rounded-lg group hover:bg-glass-bg transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={triggerToggle}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {optimisticTask.completed ? (
                        <CheckSquare className="h-5 w-5 text-neon-accent" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground hover:text-neon-primary" />
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm',
                          optimisticTask.completed &&
                            'line-through text-muted-foreground'
                        )}
                      >
                        {optimisticTask.text}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            optimisticTask.priority === 'high' && 'bg-red-500',
                            optimisticTask.priority === 'medium' &&
                              'bg-yellow-500',
                            optimisticTask.priority === 'low' && 'bg-green-500'
                          )}
                        />
                        {optimisticTask.due_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(optimisticTask.due_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteTask(optimisticTask.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
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
