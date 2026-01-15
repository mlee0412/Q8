'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  MoreHorizontal,
  Archive,
  Trash2,
  Edit3,
  Check,
  X,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useThreads } from '@/hooks/useThreads';
import type { ThreadWithCount } from '@/lib/supabase/types';

interface ThreadSidebarProps {
  userId: string;
  currentThreadId?: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  className?: string;
}

/**
 * ThreadSidebar Component
 * 
 * Displays list of chat threads with search, create, and management options
 */
export function ThreadSidebar({
  userId,
  currentThreadId,
  onThreadSelect,
  onNewThread,
  className,
}: ThreadSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const {
    threads,
    isLoading,
    createThread,
    updateThread,
    archiveThread,
    deleteThread,
  } = useThreads({ userId });

  // Filter threads by search
  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      thread.title?.toLowerCase().includes(query) ||
      thread.last_message_preview?.toLowerCase().includes(query)
    );
  });

  // Group threads by date
  const groupedThreads = groupThreadsByDate(filteredThreads);

  // Handle new thread creation
  const handleNewThread = async () => {
    const thread = await createThread();
    if (thread) {
      onNewThread();
      onThreadSelect(thread.id);
    }
  };

  // Handle thread rename
  const handleStartEdit = (thread: ThreadWithCount) => {
    setEditingThreadId(thread.id);
    setEditTitle(thread.title || 'Untitled');
  };

  const handleSaveEdit = async () => {
    if (editingThreadId && editTitle.trim()) {
      await updateThread(editingThreadId, { title: editTitle.trim() });
    }
    setEditingThreadId(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingThreadId(null);
    setEditTitle('');
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-3 border-b border-border-subtle space-y-2">
        <button
          onClick={handleNewThread}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-neon-primary/90 hover:bg-neon-primary text-white text-sm font-medium transition-colors focus-ring"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-surface-2 border border-border-subtle focus:border-neon-primary/50 focus:outline-none transition-colors placeholder:text-text-muted/70"
          />
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin" role="list" aria-label="Conversation threads">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <MessageCircle className="h-6 w-6 text-text-muted/50 mb-2" />
            <p className="text-xs text-text-muted">
              {searchQuery ? 'No matches' : 'No conversations'}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {Object.entries(groupedThreads).map(([group, groupThreads]) => (
              <div key={group}>
                <div className="px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider">
                  {group}
                </div>
                {groupThreads.map((thread) => (
                  <ThreadItem
                    key={thread.id}
                    thread={thread}
                    isActive={thread.id === currentThreadId}
                    isEditing={thread.id === editingThreadId}
                    editTitle={editTitle}
                    menuOpen={thread.id === menuOpenId}
                    onSelect={() => onThreadSelect(thread.id)}
                    onEditStart={() => handleStartEdit(thread)}
                    onEditChange={setEditTitle}
                    onEditSave={handleSaveEdit}
                    onEditCancel={handleCancelEdit}
                    onMenuToggle={() => setMenuOpenId(menuOpenId === thread.id ? null : thread.id)}
                    onArchive={() => {
                      archiveThread(thread.id);
                      setMenuOpenId(null);
                    }}
                    onDelete={() => {
                      deleteThread(thread.id);
                      setMenuOpenId(null);
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual thread item
 */
function ThreadItem({
  thread,
  isActive,
  isEditing,
  editTitle,
  menuOpen,
  onSelect,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onMenuToggle,
  onArchive,
  onDelete,
}: {
  thread: ThreadWithCount;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  menuOpen: boolean;
  onSelect: () => void;
  onEditStart: () => void;
  onEditChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onMenuToggle: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className={cn(
          'w-full px-4 py-3 text-left transition-colors focus-ring',
          'hover:bg-surface-3',
          isActive && 'bg-neon-primary/10 border-r-2 border-neon-primary'
        )}
      >
        {isEditing ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEditSave();
                if (e.key === 'Escape') onEditCancel();
              }}
              className="flex-1 px-2 py-1 text-sm rounded bg-surface-2 border border-border-subtle focus:border-neon-primary/50 focus:outline-none text-text-primary"
              autoFocus
            />
            <button onClick={onEditSave} className="p-1 hover:text-neon-accent focus-ring rounded">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={onEditCancel} className="p-1 hover:text-danger focus-ring rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate pr-2 text-text-primary">
                {thread.title || 'New Conversation'}
              </span>
              <span className="text-xs text-text-muted flex-shrink-0">
                {formatRelativeTime(thread.last_message_at)}
              </span>
            </div>
            {thread.last_message_preview && (
              <p className="text-xs text-text-muted truncate mt-1">
                {thread.last_message_preview}
              </p>
            )}
          </>
        )}
      </button>

      {/* Menu button */}
      {!isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenuToggle();
          }}
          aria-label="Thread options"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded focus-ring',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'hover:bg-surface-3',
            menuOpen && 'opacity-100'
          )}
        >
          <MoreHorizontal className="h-4 w-4 text-text-muted" />
        </button>
      )}

      {/* Dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            role="menu"
            aria-label="Thread actions"
            className="absolute right-2 top-full mt-1 z-50 surface-matte rounded-lg shadow-lg py-1 min-w-[140px]"
          >
            <button
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onEditStart();
                onMenuToggle();
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-surface-3 flex items-center gap-2 text-text-primary focus-ring"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
              Rename
            </button>
            <button
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-surface-3 flex items-center gap-2 text-text-primary focus-ring"
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              Archive
            </button>
            <button
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-surface-3 flex items-center gap-2 text-danger focus-ring"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Group threads by relative date
 */
function groupThreadsByDate(threads: ThreadWithCount[]): Record<string, ThreadWithCount[]> {
  const groups: Record<string, ThreadWithCount[]> = {};
  const now = new Date();

  for (const thread of threads) {
    const date = new Date(thread.last_message_at);
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    let group: string;
    if (diffDays === 0) {
      group = 'Today';
    } else if (diffDays === 1) {
      group = 'Yesterday';
    } else if (diffDays < 7) {
      group = 'This Week';
    } else if (diffDays < 30) {
      group = 'This Month';
    } else {
      group = 'Older';
    }

    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group]!.push(thread);
  }

  return groups;
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

ThreadSidebar.displayName = 'ThreadSidebar';
