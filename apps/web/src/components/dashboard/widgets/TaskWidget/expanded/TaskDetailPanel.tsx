'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  Tag,
  Flag,
  Trash2,
  CheckCircle2,
  Circle,
  ListTodo,
  AlignLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRxDB } from '@/hooks/useRxDB';
import { useTaskMutations, useSubtasks } from '../hooks';
import { PRIORITY_CONFIG, STATUS_CONFIG, KANBAN_COLUMNS } from '../constants';
import { formatDate } from '../utils';
import type { Task, TaskDetailPanelProps, TaskStatus, TaskPriority } from '../types';

export function TaskDetailPanel({
  taskId,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailPanelProps) {
  const { db } = useRxDB();
  const { updateTask, deleteTask, createTask, toggleTaskStatus } = useTaskMutations();
  const { tasks: subtasks } = useSubtasks(taskId);

  const [task, setTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (!db) return;

    const subscription = db.tasks
      .findOne(taskId)
      .$.subscribe((doc) => {
        if (doc) {
          const taskData = doc.toJSON() as Task;
          setTask(taskData);
          setEditTitle(taskData.title);
          setEditDescription(taskData.description || '');
        }
      });

    return () => subscription.unsubscribe();
  }, [db, taskId]);

  const handleSave = async () => {
    if (!task) return;

    await updateTask(task.id, {
      title: editTitle,
      description: editDescription,
    });
    setIsEditing(false);
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    await updateTask(task.id, { status: newStatus });
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    if (!task) return;
    await updateTask(task.id, { priority: newPriority });
  };

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask(task.id);
    onDelete?.(task.id);
    onClose();
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || !task) return;

    await createTask({
      title: newSubtask.trim(),
      parentTaskId: task.id,
      status: 'todo',
      priority: task.priority,
    });
    setNewSubtask('');
  };

  const handleToggleSubtask = async (subtask: Task) => {
    await toggleTaskStatus(subtask);
  };

  if (!task) {
    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-surface-1 border-l border-white/10 shadow-2xl z-50"
      >
        <div className="flex items-center justify-center h-full">
          <div className="h-8 w-8 border-2 border-neon-primary/50 border-t-neon-primary rounded-full animate-spin" />
        </div>
      </motion.div>
    );
  }

  const completedSubtasks = subtasks.filter((s) => s.status === 'done').length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-full max-w-md bg-black/95 border-l border-white/10 shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStatusChange(task.status === 'done' ? 'todo' : 'done')}
            className="p-1 rounded hover:bg-white/10"
          >
            {task.status === 'done' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <Circle className="h-5 w-5 text-white/40" />
            )}
          </button>
          <span className={cn('text-sm', STATUS_CONFIG[task.status].color)}>
            {STATUS_CONFIG[task.status].label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="p-2 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-white/10 text-white/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100%-60px)] p-4 space-y-6">
        {/* Title */}
        <div>
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
              className="w-full text-lg font-semibold bg-transparent border-b border-white/20 focus:border-neon-primary outline-none text-white pb-1"
            />
          ) : (
            <h2
              onClick={() => setIsEditing(true)}
              className={cn(
                'text-lg font-semibold text-white cursor-pointer hover:text-neon-primary',
                task.status === 'done' && 'line-through text-white/50'
              )}
            >
              {task.title}
            </h2>
          )}
        </div>

        {/* Status Selector */}
        <div>
          <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
            <ListTodo className="h-4 w-4" />
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {KANBAN_COLUMNS.map((col) => (
              <button
                key={col.id}
                onClick={() => handleStatusChange(col.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-all',
                  task.status === col.id
                    ? `${col.bgColor} ${col.color} ring-1 ${col.borderColor}`
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                )}
              >
                {col.icon} {col.title}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Selector */}
        <div>
          <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
            <Flag className="h-4 w-4" />
            Priority
          </label>
          <div className="flex gap-2">
            {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((priority) => {
              const config = PRIORITY_CONFIG[priority];
              return (
                <button
                  key={priority}
                  onClick={() => handlePriorityChange(priority)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm transition-all',
                    task.priority === priority
                      ? `${config.bgColor} ${config.color} ring-1 ${config.borderColor}`
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  )}
                >
                  {config.icon} {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <div>
            <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </label>
            <p className="text-white">{formatDate(task.dueDate)}</p>
          </div>
        )}

        {/* Time Estimate */}
        {task.estimatedMinutes && (
          <div>
            <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
              <Clock className="h-4 w-4" />
              Time Estimate
            </label>
            <p className="text-white">
              {task.estimatedMinutes >= 60
                ? `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60}m`
                : `${task.estimatedMinutes} minutes`}
            </p>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div>
            <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
              <Tag className="h-4 w-4" />
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-lg text-sm bg-white/10 text-white/70"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
            <AlignLeft className="h-4 w-4" />
            Description
          </label>
          {isEditing ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onBlur={handleSave}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/30 focus:border-neon-primary outline-none resize-none"
              placeholder="Add a description..."
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="min-h-[80px] p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20"
            >
              {task.description ? (
                <p className="text-sm text-white/70 whitespace-pre-wrap">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-white/30">Click to add description...</p>
              )}
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div>
          <label className="flex items-center justify-between text-sm text-white/50 mb-2">
            <span className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Subtasks
            </span>
            {subtasks.length > 0 && (
              <span className="text-xs">
                {completedSubtasks}/{subtasks.length}
              </span>
            )}
          </label>

          {/* Progress Bar */}
          {subtasks.length > 0 && (
            <div className="h-1 bg-white/10 rounded-full mb-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${subtaskProgress}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          )}

          {/* Subtask List */}
          <div className="space-y-2 mb-3">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10"
              >
                <button
                  onClick={() => handleToggleSubtask(subtask)}
                  className="flex-shrink-0"
                >
                  {subtask.status === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4 text-white/40" />
                  )}
                </button>
                <span
                  className={cn(
                    'text-sm flex-1',
                    subtask.status === 'done'
                      ? 'line-through text-white/40'
                      : 'text-white/70'
                  )}
                >
                  {subtask.title}
                </span>
              </div>
            ))}
          </div>

          {/* Add Subtask Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
              placeholder="Add subtask..."
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:border-neon-primary outline-none"
            />
            <button
              onClick={handleAddSubtask}
              disabled={!newSubtask.trim()}
              className="px-3 py-2 bg-neon-primary/20 text-neon-primary rounded-lg text-sm hover:bg-neon-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>

        {/* Timestamps */}
        <div className="pt-4 border-t border-white/10 text-xs text-white/30 space-y-1">
          <p>Created: {new Date(task.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(task.updatedAt).toLocaleString()}</p>
          {task.completedAt && (
            <p>Completed: {new Date(task.completedAt).toLocaleString()}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

TaskDetailPanel.displayName = 'TaskDetailPanel';
