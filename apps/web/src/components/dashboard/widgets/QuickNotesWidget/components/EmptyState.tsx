'use client';

import { StickyNote, Plus } from 'lucide-react';

interface EmptyStateProps {
  onNewNote: () => void;
}

export function EmptyState({ onNewNote }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <StickyNote className="empty-state-icon" />
      <p className="empty-state-title">No notes yet</p>
      <button onClick={onNewNote} className="btn-ghost mt-2 text-sm">
        <Plus className="h-3 w-3 mr-1" />
        Create note
      </button>
    </div>
  );
}
