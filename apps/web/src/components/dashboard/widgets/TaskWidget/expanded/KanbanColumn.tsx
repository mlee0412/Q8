'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KANBAN_COLUMNS } from '../constants';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus, KanbanColumnProps } from '../types';

interface SortableTaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

export function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onAddTask,
  isOver,
}: KanbanColumnProps) {
  const column = KANBAN_COLUMNS.find((c) => c.id === status);
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const { setNodeRef } = useDroppable({
    id: status,
  });

  if (!column) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] rounded-xl',
        'bg-white/5 border border-white/10',
        isOver && 'ring-2 ring-neon-primary/50 bg-neon-primary/5'
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center justify-between p-3 border-b border-white/10',
          column.bgColor
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{column.icon}</span>
          <h3 className={cn('font-medium text-sm', column.color)}>
            {column.title}
          </h3>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              'bg-white/10 text-white/70'
            )}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask?.(status)}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          aria-label={`Add task to ${column.title}`}
        >
          <Plus className="h-4 w-4 text-white/50 hover:text-white" />
        </button>
      </div>

      {/* Tasks Container */}
      <div className="flex-1 p-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-300px)]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={onTaskClick}
              />
            ))}
          </div>
        </SortableContext>

        {/* Empty State */}
        {tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-32 text-white/30"
          >
            <p className="text-sm">No tasks</p>
            <button
              onClick={() => onAddTask?.(status)}
              className="mt-2 text-xs text-neon-primary/70 hover:text-neon-primary"
            >
              + Add a task
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

KanbanColumn.displayName = 'KanbanColumn';
