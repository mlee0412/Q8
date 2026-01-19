'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Minimize2,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { KanbanBoard } from './KanbanBoard';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TaskForm } from './TaskForm';
import { useTaskData, useTaskMutations } from '../hooks';
import { QUICK_FILTERS, VIEW_MODES } from '../constants';
import type { Task, TaskCommandCenterProps, TaskViewMode, TaskStatus, TaskFilters } from '../types';

export function TaskCommandCenter({
  onClose,
  initialViewMode = 'kanban',
}: TaskCommandCenterProps) {
  const [viewMode, setViewMode] = useState<TaskViewMode>(initialViewMode);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState('all');
  const [filters, setFilters] = useState<TaskFilters>({});

  const { tasks, tasksByStatus, isLoading, taskCounts } = useTaskData({
    filters: {
      ...filters,
      search: searchQuery || undefined,
    },
    parentTaskId: null,
  });

  const { createTask, isReady: mutationsReady } = useTaskMutations();

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
  }, []);

  const handleAddTask = useCallback((status: TaskStatus) => {
    setNewTaskStatus(status);
    setShowTaskForm(true);
  }, []);

  const handleCreateTask = useCallback(
    async (taskData: Partial<Task>) => {
      if (!mutationsReady) {
        logger.warn('Attempted to create task before mutations ready');
        return;
      }
      const result = await createTask({
        title: taskData.title || '',
        description: taskData.description,
        status: taskData.status || newTaskStatus,
        priority: taskData.priority || 'medium',
        dueDate: taskData.dueDate,
        tags: taskData.tags,
        estimatedMinutes: taskData.estimatedMinutes,
      });
      if (result) {
        setShowTaskForm(false);
      }
    },
    [createTask, newTaskStatus, mutationsReady]
  );

  const handleQuickFilterChange = useCallback((filterId: string) => {
    setActiveQuickFilter(filterId);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(today);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    switch (filterId) {
      case 'today':
        setFilters({
          dueDateRange: {
            start: today.toISOString(),
            end: endOfToday.toISOString(),
          },
        });
        break;
      case 'overdue':
        setFilters({
          dueDateRange: {
            end: today.toISOString(),
          },
          status: ['backlog', 'todo', 'in_progress', 'review'],
        });
        break;
      case 'thisWeek':
        setFilters({
          dueDateRange: {
            start: today.toISOString(),
            end: endOfWeek.toISOString(),
          },
        });
        break;
      case 'highPriority':
        setFilters({
          priority: ['high', 'urgent'],
        });
        break;
      default:
        setFilters({});
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-primary/5 via-transparent to-purple-500/5 pointer-events-none" />

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white"
        onClick={onClose}
      >
        <Minimize2 className="h-5 w-5" />
      </Button>

      <div className="relative h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-white/10">
          <div className="max-w-7xl mx-auto">
            {/* Title Row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Task Manager</h1>
                <p className="text-sm text-white/50 mt-1">
                  {taskCounts.all} tasks · {taskCounts.byStatus.done} completed
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Add Task Button */}
                <Button
                  onClick={() => handleAddTask('todo')}
                  className="bg-neon-primary hover:bg-neon-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </div>
            </div>

            {/* Toolbar Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:border-neon-primary/50 outline-none"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {QUICK_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleQuickFilterChange(filter.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all',
                      activeQuickFilter === filter.id
                        ? 'bg-neon-primary/20 text-neon-primary ring-1 ring-neon-primary/30'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <span>{filter.icon}</span>
                    {filter.label}
                    {filter.id === 'overdue' && taskCounts.overdue > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                        {taskCounts.overdue}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                {VIEW_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id as TaskViewMode)}
                    className={cn(
                      'p-2 rounded-md transition-all',
                      viewMode === mode.id
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:text-white'
                    )}
                    title={mode.label}
                  >
                    {mode.id === 'kanban' && <LayoutGrid className="h-4 w-4" />}
                    {mode.id === 'list' && <List className="h-4 w-4" />}
                    {mode.id === 'calendar' && <CalendarIcon className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 py-4">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-8 w-8 animate-spin text-neon-primary" />
              </div>
            )}

            {/* Kanban View */}
            {!isLoading && viewMode === 'kanban' && (
              <div className="h-full overflow-x-auto">
                <KanbanBoard
                  tasksByStatus={tasksByStatus}
                  onTaskClick={handleTaskClick}
                  onAddTask={handleAddTask}
                />
              </div>
            )}

            {/* List View */}
            {!isLoading && viewMode === 'list' && (
              <div className="h-full overflow-y-auto">
                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-white/40">
                      <p>No tasks found</p>
                      <button
                        onClick={() => handleAddTask('todo')}
                        className="mt-2 text-neon-primary hover:underline"
                      >
                        Create your first task
                      </button>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleTaskClick(task)}
                        className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                              task.priority === 'urgent' && 'bg-red-500',
                              task.priority === 'high' && 'bg-orange-500',
                              task.priority === 'medium' && 'bg-blue-500',
                              task.priority === 'low' && 'bg-slate-500'
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <h3
                              className={cn(
                                'font-medium text-white',
                                task.status === 'done' && 'line-through text-white/50'
                              )}
                            >
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-white/50 mt-1 line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs',
                              task.status === 'done' && 'bg-emerald-500/20 text-emerald-400',
                              task.status === 'in_progress' && 'bg-amber-500/20 text-amber-400',
                              task.status === 'todo' && 'bg-blue-500/20 text-blue-400',
                              task.status === 'backlog' && 'bg-slate-500/20 text-slate-400',
                              task.status === 'review' && 'bg-purple-500/20 text-purple-400'
                            )}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Calendar View Placeholder */}
            {!isLoading && viewMode === 'calendar' && (
              <div className="flex flex-col items-center justify-center h-full text-white/40">
                <CalendarIcon className="h-16 w-16 mb-4" />
                <p className="text-lg">Calendar View</p>
                <p className="text-sm mt-2">Coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Panel */}
      <AnimatePresence>
        {selectedTaskId && (
          <TaskDetailPanel
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            onDelete={() => setSelectedTaskId(null)}
          />
        )}
      </AnimatePresence>

      {/* Task Form Modal */}
      <AnimatePresence>
        {showTaskForm && (
          <TaskForm
            onSubmit={handleCreateTask}
            onCancel={() => setShowTaskForm(false)}
            isLoading={!mutationsReady}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

TaskCommandCenter.displayName = 'TaskCommandCenter';
