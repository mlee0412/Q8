'use client';

import { Edit3, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskInputProps } from '../types';

export function TaskInput({
  currentTask,
  isEditing,
  editValue,
  isRunning,
  onEditStart,
  onEditChange,
  onEditSubmit,
  onEditCancel,
}: TaskInputProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          placeholder="What are you focusing on?"
          autoFocus
          className="flex-1 px-2 py-1.5 bg-surface-2 border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-neon-primary/50 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEditSubmit();
            if (e.key === 'Escape') onEditCancel();
          }}
        />
        <button
          className="btn-icon btn-icon-sm focus-ring"
          onClick={onEditSubmit}
          aria-label="Confirm task"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          className="btn-icon btn-icon-sm focus-ring"
          onClick={onEditCancel}
          aria-label="Cancel"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (!isRunning) onEditStart();
      }}
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-md text-center',
        !isRunning && 'cursor-pointer hover:bg-surface-3 transition-colors'
      )}
    >
      {currentTask ? (
        <>
          <span className="text-body text-sm font-medium truncate flex-1">
            {currentTask}
          </span>
          {!isRunning && <Edit3 className="h-3 w-3 text-text-muted" />}
        </>
      ) : (
        <span className="text-sm text-text-muted flex-1">
          Click to set focus task...
        </span>
      )}
    </div>
  );
}
