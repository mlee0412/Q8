'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Edit3,
  Check,
  X,
  Archive,
  Trash2,
  MoreVertical,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Thread } from '@/lib/supabase/types';

interface ThreadHeaderProps {
  thread: Thread | null;
  onUpdateTitle: (title: string) => Promise<void>;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onRegenerateTitle: () => Promise<void>;
  className?: string;
}

/**
 * ThreadHeader Component
 * 
 * Displays current thread title with edit and action options
 */
export function ThreadHeader({
  thread,
  onUpdateTitle,
  onArchive,
  onDelete,
  onRegenerateTitle,
  className,
}: ThreadHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!thread) {
    return (
      <div className={cn('px-4 py-3 border-b border-border-subtle', className)}>
        <h2 className="text-lg font-semibold text-text-muted">New Conversation</h2>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditTitle(thread.title || 'Untitled');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editTitle.trim()) {
      await onUpdateTitle(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle('');
  };

  const handleRegenerateTitle = async () => {
    setIsRegenerating(true);
    setShowMenu(false);
    try {
      await onRegenerateTitle();
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className={cn('flex items-center justify-between px-4 py-3 border-b border-border-subtle', className)}>
      {/* Title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              className="flex-1 px-3 py-1.5 text-lg font-semibold rounded-lg bg-surface-2 border border-border-subtle focus:border-neon-primary/50 focus:outline-none"
              autoFocus
            />
            <Button variant="ghost" size="sm" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-neon-accent" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              <X className="h-4 w-4 text-danger" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {thread.title || 'New Conversation'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEdit}
              className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 relative">
        {/* Regenerate title button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerateTitle}
          disabled={isRegenerating}
          title="Regenerate title"
        >
          <RefreshCw className={cn('h-4 w-4', isRegenerating && 'animate-spin')} />
        </Button>

        {/* More menu */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMenu(!showMenu)}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>

        {/* Dropdown menu */}
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full mt-1 z-50 surface-matte rounded-lg shadow-lg py-1 min-w-[160px]"
            >
              <button
                onClick={() => {
                  handleStartEdit();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-3 flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Rename
              </button>
              <button
                onClick={handleRegenerateTitle}
                disabled={isRegenerating}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-3 flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={cn('h-4 w-4', isRegenerating && 'animate-spin')} />
                Regenerate Title
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-3 flex items-center gap-2"
                onClick={() => {
                  // Copy share link (placeholder)
                  navigator.clipboard.writeText(`${window.location.origin}/chat/${thread.id}`);
                  setShowMenu(false);
                }}
              >
                <Share2 className="h-4 w-4" />
                Copy Link
              </button>
              <div className="my-1 border-t border-border-subtle" />
              <button
                onClick={() => {
                  onArchive();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-3 flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-3 flex items-center gap-2 text-danger"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

ThreadHeader.displayName = 'ThreadHeader';
