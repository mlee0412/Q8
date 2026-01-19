'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Pin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Pencil,
  MessageSquarePlus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime, getQuickSummary } from '../utils';
import type { NoteItemProps } from '../types';

export function NoteItem({
  note,
  isExpanded,
  isQuickCommentActive,
  quickCommentText,
  onToggleExpand,
  onEdit,
  onDelete,
  onQuickCommentStart,
  onQuickCommentChange,
  onQuickCommentSubmit,
  onQuickCommentCancel,
}: NoteItemProps) {
  return (
    <div
      className={cn(
        'rounded-md overflow-hidden transition-all',
        note.is_pinned && 'ring-1 ring-neon-primary/30',
        isExpanded ? 'bg-surface-3' : 'hover:bg-surface-3/50'
      )}
    >
      {/* Compact View - Title + Timestamp */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-3 py-2 text-left focus-ring rounded-md"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {note.is_pinned && (
            <Pin className="h-3 w-3 text-neon-primary flex-shrink-0" />
          )}
          {note.is_daily && (
            <Calendar className="h-3 w-3 text-neon-primary flex-shrink-0" />
          )}
          <span className="text-body text-sm font-medium truncate">
            {note.title || 'Untitled'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-text-muted">
            {formatRelativeTime(note.updated_at)}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-text-muted" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* AI Summary */}
              <div className="p-2 rounded-md bg-surface-2 border border-border-subtle">
                <div className="flex items-center gap-1.5 text-xs text-neon-primary mb-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Summary</span>
                </div>
                <p className="text-xs text-text-secondary line-clamp-3">
                  {note.ai_summary ?? getQuickSummary(note.content)}
                </p>
              </div>

              {/* Quick Comment Input */}
              {isQuickCommentActive ? (
                <div className="space-y-2">
                  <textarea
                    value={quickCommentText}
                    onChange={(e) => onQuickCommentChange(e.target.value)}
                    placeholder="Add a quick comment..."
                    autoFocus
                    className="w-full px-2 py-1.5 text-xs bg-surface-2 border border-border-subtle rounded-md text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-neon-primary/50 focus:outline-none resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) {
                        onQuickCommentSubmit();
                      }
                      if (e.key === 'Escape') {
                        onQuickCommentCancel();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-1">
                    <button
                      className="btn-ghost h-6 text-xs"
                      onClick={onQuickCommentCancel}
                    >
                      Cancel
                    </button>
                    <button
                      className="h-6 px-2 text-xs font-medium bg-neon-primary text-white rounded-md hover:bg-neon-primary/90 transition-colors focus-ring"
                      onClick={onQuickCommentSubmit}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                /* Action Buttons */
                <div className="flex items-center gap-2">
                  <button
                    className="btn-ghost h-7 text-xs flex-1"
                    onClick={onEdit}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </button>
                  <button
                    className="btn-ghost h-7 text-xs flex-1"
                    onClick={onQuickCommentStart}
                  >
                    <MessageSquarePlus className="h-3 w-3 mr-1" />
                    Comment
                  </button>
                  <button
                    className="btn-ghost h-7 text-xs text-danger hover:bg-danger/10"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
