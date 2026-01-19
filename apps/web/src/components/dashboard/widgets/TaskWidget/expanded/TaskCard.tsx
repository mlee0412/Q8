'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Tag, MoreHorizontal, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIORITY_CONFIG } from '../constants';
import { formatDate } from '../utils';
import type { TaskCardProps } from '../types';

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(
  ({ task, onClick, isDragging, isOverlay }, ref) => {
    const priorityConfig = PRIORITY_CONFIG[task.priority];
    const isOverdue =
      task.dueDate &&
      new Date(task.dueDate) < new Date() &&
      task.status !== 'done';

    return (
      <motion.div
        ref={ref}
        layout={!isOverlay}
        initial={isOverlay ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={!isDragging ? { scale: 1.02 } : undefined}
        onClick={() => onClick?.(task)}
        className={cn(
          'group relative rounded-lg border p-3 cursor-pointer transition-all',
          'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10',
          isDragging && 'opacity-50 ring-2 ring-neon-primary shadow-lg',
          isOverlay && 'shadow-2xl rotate-3 scale-105',
          task.status === 'done' && 'opacity-60'
        )}
      >
        {/* Drag Handle */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab">
          <GripVertical className="h-4 w-4 text-white/40" />
        </div>

        {/* Priority Indicator */}
        <div
          className={cn(
            'absolute top-0 left-0 w-1 h-full rounded-l-lg',
            task.priority === 'urgent' && 'bg-red-500',
            task.priority === 'high' && 'bg-orange-500',
            task.priority === 'medium' && 'bg-blue-500',
            task.priority === 'low' && 'bg-slate-500'
          )}
        />

        {/* Content */}
        <div className="pl-2">
          {/* Title */}
          <h4
            className={cn(
              'text-sm font-medium text-white line-clamp-2',
              task.status === 'done' && 'line-through text-white/50'
            )}
          >
            {task.title}
          </h4>

          {/* Description Preview */}
          {task.description && (
            <p className="text-xs text-white/50 mt-1 line-clamp-1">
              {task.description}
            </p>
          )}

          {/* Metadata Row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Priority Badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
                priorityConfig.bgColor,
                priorityConfig.color
              )}
            >
              <span>{priorityConfig.icon}</span>
              <span className="hidden sm:inline">{priorityConfig.label}</span>
            </span>

            {/* Due Date */}
            {task.dueDate && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs',
                  isOverdue ? 'text-red-400' : 'text-white/50'
                )}
              >
                <Calendar className="h-3 w-3" />
                {formatDate(task.dueDate)}
              </span>
            )}

            {/* Time Estimate */}
            {task.estimatedMinutes && (
              <span className="inline-flex items-center gap-1 text-xs text-white/50">
                <Clock className="h-3 w-3" />
                {task.estimatedMinutes >= 60
                  ? `${Math.floor(task.estimatedMinutes / 60)}h`
                  : `${task.estimatedMinutes}m`}
              </span>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-white/10 text-white/70"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="text-xs text-white/40">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* More Actions */}
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
        >
          <MoreHorizontal className="h-4 w-4 text-white/50" />
        </button>
      </motion.div>
    );
  }
);

TaskCard.displayName = 'TaskCard';
