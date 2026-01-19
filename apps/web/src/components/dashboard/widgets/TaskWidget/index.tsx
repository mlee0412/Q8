'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Plus, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskItem, AddTaskInput, EmptyState } from './components';
import { useTaskData, useTaskMutations } from './hooks';
import { TaskCommandCenter } from './expanded';
import type { Task, TaskWidgetProps } from './types';

/**
 * Task Management Widget
 *
 * Displays quick tasks and reminders with completion tracking.
 * Expands into a full Kanban board for detailed task management.
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
  const [isExpanded, setIsExpanded] = useState(false);

  const { tasks, isLoading: isFetching, taskCounts } = useTaskData({
    filters: showCompleted ? undefined : { status: ['backlog', 'todo', 'in_progress', 'review'] },
    limit: maxItems,
    parentTaskId: null,
  });

  const { createTask, toggleTaskStatus, deleteTask } = useTaskMutations();

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;

    await createTask({
      title: newTaskText.trim(),
      status: 'todo',
      priority: 'medium',
    });

    setNewTaskText('');
    setIsAddingTask(false);
  };

  const handleToggleTask = async (task: Task) => {
    await toggleTaskStatus(task);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const incompleteTasks = tasks?.filter((t) => t.status !== 'done') || [];

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
    <>
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
          <button
            className="btn-icon btn-icon-sm focus-ring"
            onClick={toggleExpanded}
            aria-label="Expand to Kanban board"
          >
            <Maximize2 className="h-4 w-4" />
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
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}
    </motion.div>

      {/* Expanded TaskCommandCenter - Portal to body */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isExpanded && (
              <TaskCommandCenter onClose={toggleExpanded} />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

TaskWidget.displayName = 'TaskWidget';

export default TaskWidget;
