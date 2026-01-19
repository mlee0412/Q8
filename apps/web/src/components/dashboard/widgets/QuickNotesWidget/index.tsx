'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNotes } from '@/hooks/useNotes';
import { NotesPanel } from './expanded';
import { WidgetHeader, NoteItem, EmptyState } from './components';
import type { QuickNotesWidgetProps } from './types';

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

  const handleNewNote = () => {
    setInitialNoteId(undefined);
    setInitialTemplate('blank');
    setIsPanelOpen(true);
  };

  const handleOpenDailyNote = async () => {
    await getOrCreateDailyNote();
    setInitialTemplate('daily');
    setIsPanelOpen(true);
  };

  const handleEditNote = (noteId: string) => {
    setInitialNoteId(noteId);
    setInitialTemplate(undefined);
    setIsPanelOpen(true);
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNoteApi(noteId, true);
    setExpandedNoteId(null);
  };

  const toggleExpand = (noteId: string) => {
    setExpandedNoteId(expandedNoteId === noteId ? null : noteId);
    setQuickCommentNoteId(null);
    setQuickCommentText('');
  };

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

  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

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
        <WidgetHeader
          onOpenDailyNote={handleOpenDailyNote}
          onOpenPanel={() => setIsPanelOpen(true)}
          onNewNote={handleNewNote}
        />

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="h-6 w-6 border-2 border-neon-primary/50 border-t-neon-primary rounded-full animate-spin" />
            </div>
          ) : displayNotes.length === 0 ? (
            <EmptyState onNewNote={handleNewNote} />
          ) : (
            <AnimatePresence>
              {displayNotes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <NoteItem
                    note={note}
                    isExpanded={expandedNoteId === note.id}
                    isQuickCommentActive={quickCommentNoteId === note.id}
                    quickCommentText={quickCommentText}
                    onToggleExpand={() => toggleExpand(note.id)}
                    onEdit={() => handleEditNote(note.id)}
                    onDelete={() => handleDeleteNote(note.id)}
                    onQuickCommentStart={() => setQuickCommentNoteId(note.id)}
                    onQuickCommentChange={setQuickCommentText}
                    onQuickCommentSubmit={() => handleQuickComment(note.id)}
                    onQuickCommentCancel={() => {
                      setQuickCommentNoteId(null);
                      setQuickCommentText('');
                    }}
                  />
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

QuickNotesWidget.displayName = 'QuickNotesWidget';

export default QuickNotesWidget;
