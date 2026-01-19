'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, Tag, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIORITY_CONFIG, KANBAN_COLUMNS, ESTIMATED_TIME_OPTIONS } from '../constants';
import type { TaskFormProps, TaskStatus, TaskPriority } from '../types';

export function TaskForm({
  task,
  onSubmit,
  onCancel,
  isLoading,
}: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'todo');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate?.split('T')[0] || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(
    task?.estimatedMinutes
  );
  const [tags, setTags] = useState<string[]>(task?.tags || []);
  const [newTag, setNewTag] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      estimatedMinutes,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-surface-1 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded hover:bg-white/10 text-white/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-sm text-white/50 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              required
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-neon-primary outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-white/50 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-neon-primary outline-none resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {KANBAN_COLUMNS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setStatus(col.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm transition-all',
                    status === col.id
                      ? `${col.bgColor} ${col.color} ring-1 ${col.borderColor}`
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  )}
                >
                  {col.icon} {col.title}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
              <Flag className="h-4 w-4" />
              Priority
            </label>
            <div className="flex gap-2">
              {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => {
                const config = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm transition-all',
                      priority === p
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
          <div>
            <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neon-primary outline-none"
            />
          </div>

          {/* Time Estimate */}
          <div>
            <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
              <Clock className="h-4 w-4" />
              Time Estimate
            </label>
            <div className="flex flex-wrap gap-2">
              {ESTIMATED_TIME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setEstimatedMinutes(
                      estimatedMinutes === option.value ? undefined : option.value
                    )
                  }
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm transition-all',
                    estimatedMinutes === option.value
                      ? 'bg-neon-primary/20 text-neon-primary ring-1 ring-neon-primary/30'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-2 text-sm text-white/50 mb-2">
              <Tag className="h-4 w-4" />
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm bg-white/10 text-white/70"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:border-neon-primary outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="px-3 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || isLoading}
            className="px-4 py-2 bg-neon-primary text-white text-sm font-medium rounded-lg hover:bg-neon-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

TaskForm.displayName = 'TaskForm';
