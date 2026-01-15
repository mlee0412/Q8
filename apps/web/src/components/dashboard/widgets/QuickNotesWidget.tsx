'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StickyNote,
  Plus,
  Pin,
  Trash2,
  Calendar,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Pencil,
  MessageSquarePlus,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotes } from '@/hooks/useNotes';
import { NotesPanel } from '@/components/notes';

interface QuickNotesWidgetProps {
  userId: string;
  maxDisplay?: number;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * Format relative time for last edited
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Quick Notes Widget - Compact view with expand-to-edit pattern
 */
export function QuickNotesWidget({
  userId,
  maxDisplay = 5,
  colSpan = 1,
  rowSpan = 2,
  className,
}: QuickNotesWidgetProps) {
  const {
    notes,
    isLoading,
    deleteNote: deleteNoteApi,
    getOrCreateDailyNote,
    addQuickComment,
  } = useNotes({ userId, limit: 20 });

  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [initialNoteId, setInitialNoteId] = useState<string | undefined>();
  const [initialTemplate, setInitialTemplate] = useState<'daily' | 'blank' | undefined>();
  const [quickCommentNoteId, setQuickCommentNoteId] = useState<string | null>(null);
  const [quickCommentText, setQuickCommentText] = useState('');

  // Open NotesPanel for creating new note
  const handleNewNote = () => {
    setInitialNoteId(undefined);
    setInitialTemplate('blank');
    setIsPanelOpen(true);
  };

  // Open NotesPanel with Today's note
  const handleOpenDailyNote = async () => {
    await getOrCreateDailyNote();
    setInitialTemplate('daily');
    setIsPanelOpen(true);
  };

  // Open NotesPanel to edit specific note
  const handleEditNote = (noteId: string) => {
    setInitialNoteId(noteId);
    setInitialTemplate(undefined);
    setIsPanelOpen(true);
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    await deleteNoteApi(noteId, true);
    setExpandedNoteId(null);
  };

  // Toggle note expansion
  const toggleExpand = (noteId: string) => {
    setExpandedNoteId(expandedNoteId === noteId ? null : noteId);
    setQuickCommentNoteId(null);
    setQuickCommentText('');
  };

  // Submit quick comment
  const handleQuickComment = async (noteId: string) => {
    if (!quickCommentText.trim()) return;
    await addQuickComment(noteId, quickCommentText.trim());
    setQuickCommentText('');
    setQuickCommentNoteId(null);
  };

  // Sort: pinned first, then by date (only show non-archived)
  const displayNotes = notes
    .filter((n) => !n.is_archived)
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })
    .slice(0, maxDisplay);

  // Map colSpan to Tailwind classes - full width on mobile, specified span on md+
  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

  // Map rowSpan to Tailwind classes
  const rowSpanClasses: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'surface-matte p-4 flex flex-col overflow-hidden w-full',
          colSpanClasses[colSpan],
          rowSpanClasses[rowSpan],
          className
        )}
      >
        {/* Header */}
        <div className="widget-header mb-3">
          <div className="widget-header-title">
            <StickyNote className="h-4 w-4 text-neon-primary" />
            <h3 className="text-heading text-sm">Quick Notes</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="btn-icon btn-icon-sm focus-ring"
              onClick={handleOpenDailyNote}
              aria-label="Today's note"
            >
              <Calendar className="h-3.5 w-3.5" />
            </button>
            <button
              className="btn-icon btn-icon-sm focus-ring"
              onClick={() => setIsPanelOpen(true)}
              aria-label="Expand notes"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              className="btn-icon btn-icon-sm focus-ring"
              onClick={handleNewNote}
              aria-label="New note"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Notes List - Compact */}
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="h-6 w-6 border-2 border-neon-primary/50 border-t-neon-primary rounded-full animate-spin" />
            </div>
          ) : displayNotes.length === 0 ? (
            <div className="empty-state">
              <StickyNote className="empty-state-icon" />
              <p className="empty-state-title">No notes yet</p>
              <button
                onClick={handleNewNote}
                className="btn-ghost mt-2 text-sm"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create note
              </button>
            </div>
          ) : (
            <AnimatePresence>
              {displayNotes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    'rounded-md overflow-hidden transition-all',
                    note.is_pinned && 'ring-1 ring-neon-primary/30',
                    expandedNoteId === note.id ? 'bg-surface-3' : 'hover:bg-surface-3/50'
                  )}
                >
                  {/* Compact View - Title + Timestamp */}
                  <button
                    onClick={() => toggleExpand(note.id)}
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
                      {expandedNoteId === note.id ? (
                        <ChevronUp className="h-3.5 w-3.5 text-text-muted" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
                      )}
                    </div>
                  </button>

                  {/* Expanded View */}
                  <AnimatePresence>
                    {expandedNoteId === note.id && (
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
                              {note.ai_summary || getQuickSummary(note.content)}
                            </p>
                          </div>

                          {/* Quick Comment Input */}
                          {quickCommentNoteId === note.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={quickCommentText}
                                onChange={(e) => setQuickCommentText(e.target.value)}
                                placeholder="Add a quick comment..."
                                autoFocus
                                className="w-full px-2 py-1.5 text-xs bg-surface-2 border border-border-subtle rounded-md text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-neon-primary/50 focus:outline-none resize-none"
                                rows={2}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.metaKey) {
                                    handleQuickComment(note.id);
                                  }
                                  if (e.key === 'Escape') {
                                    setQuickCommentNoteId(null);
                                    setQuickCommentText('');
                                  }
                                }}
                              />
                              <div className="flex justify-end gap-1">
                                <button
                                  className="btn-ghost h-6 text-xs"
                                  onClick={() => {
                                    setQuickCommentNoteId(null);
                                    setQuickCommentText('');
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="h-6 px-2 text-xs font-medium bg-neon-primary text-white rounded-md hover:bg-neon-primary/90 transition-colors focus-ring"
                                  onClick={() => handleQuickComment(note.id)}
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
                                onClick={() => handleEditNote(note.id)}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </button>
                              <button
                                className="btn-ghost h-7 text-xs flex-1"
                                onClick={() => setQuickCommentNoteId(note.id)}
                              >
                                <MessageSquarePlus className="h-3 w-3 mr-1" />
                                Comment
                              </button>
                              <button
                                className="btn-ghost h-7 text-xs text-danger hover:bg-danger/10"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* View All Link */}
        {displayNotes.length > 0 && (
          <button
            onClick={() => setIsPanelOpen(true)}
            className="mt-2 text-xs text-center text-text-muted hover:text-text-primary transition-colors focus-ring rounded"
          >
            View all notes →
          </button>
        )}
      </motion.div>

      {/* Notes Panel */}
      <NotesPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        userId={userId}
        initialNoteId={initialNoteId}
        initialTemplate={initialTemplate}
      />
    </>
  );
}

/**
 * Generate a quick summary from note content (fallback if no AI summary)
 */
function getQuickSummary(content: string): string {
  const cleaned = content
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/- \[ \]/g, '☐')
    .replace(/- \[x\]/g, '☑')
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, 3)
    .join(' ');
  
  return cleaned.length > 120 ? cleaned.slice(0, 120) + '...' : cleaned || 'No content';
}

QuickNotesWidget.displayName = 'QuickNotesWidget';
