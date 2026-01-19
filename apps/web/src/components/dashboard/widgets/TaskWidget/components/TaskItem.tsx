'use client';

import { motion } from 'framer-motion';
import { CheckSquare, Square, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimisticAction } from '@/components/shared/OptimisticAction';
import { formatDate } from '../utils';
import type { Task } from '../types';

interface TaskItemProps {
  task: Task;
  index: number;
  onToggle: (task: Task) => Promise<void>;
  onDelete: (taskId: string) => void;
}

export function TaskItem({ task, index, onToggle, onDelete }: TaskItemProps) {
  return (
    <OptimisticAction
      data={task}
      optimisticUpdate={(current) => ({
        ...current,
        completed: !current.completed,
      })}
      serverAction={async (data) => {
        await onToggle(data);
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
                  optimisticTask.completed && 'line-through text-text-muted'
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
                    optimisticTask.priority === 'medium' && 'bg-warning',
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
              onClick={() => onDelete(optimisticTask.id)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus-ring rounded p-1"
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4 text-text-muted hover:text-danger transition-colors" />
            </button>
          </div>
        </motion.div>
      )}
    </OptimisticAction>
  );
}
