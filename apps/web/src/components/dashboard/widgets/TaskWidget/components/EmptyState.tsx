'use client';

import { CheckSquare, Plus } from 'lucide-react';

interface EmptyStateProps {
  onAddTask: () => void;
}

export function EmptyState({ onAddTask }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <CheckSquare className="empty-state-icon" />
      <p className="empty-state-title">No tasks</p>
      <button onClick={onAddTask} className="btn-ghost mt-2 text-sm">
        <Plus className="h-4 w-4 mr-2" />
        Add your first task
      </button>
    </div>
  );
}
