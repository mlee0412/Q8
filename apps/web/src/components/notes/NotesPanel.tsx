'use client';

/**
 * NotesPanel Component
 * Full-screen notes interface with sidebar, list, and editor
 * Uses React Portal to render outside parent container for true full-screen
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Search,
  FolderPlus,
  Pin,
  Trash2,
  Archive,
  Calendar,
  FileText,
  Folder,
  Clock,
  Hash,
  StickyNote,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNotes } from '@/hooks/useNotes';
import { RichTextEditor } from './RichTextEditor';
import type { Note } from '@/lib/supabase/types';

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialNoteId?: string;
  initialTemplate?: 'daily' | 'blank';
}

type SidebarView = 'all' | 'pinned' | 'daily' | 'archived' | 'folder';

/**
 * Format date for display
 */
function formatNoteDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Get preview text from note content
 */
function getPreview(content: string, maxLength = 80): string {
  const cleaned = content
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/- \[ \]/g, '☐')
    .replace(/- \[x\]/g, '☑')
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, 2)
    .join(' ');

  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + '...' : cleaned;
}

export function NotesPanel({
  isOpen,
  onClose,
  userId,
  initialNoteId,
  initialTemplate,
}: NotesPanelProps) {
  const {
    notes,
    folders,
    isLoading,
    currentNote,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
    pinNote,
    archiveNote,
    createFolder,
    searchNotes,
    getOrCreateDailyNote,
    stats,
  } = useNotes({ userId, includeArchived: true });

  const [sidebarView, setSidebarView] = useState<SidebarView>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notesListCollapsed, setNotesListCollapsed] = useState(false);

  // Track if mounted for Portal (SSR compatibility)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter notes based on current view
  const filteredNotes = searchResults ?? notes.filter((note) => {
    if (sidebarView === 'all') return !note.is_archived;
    if (sidebarView === 'pinned') return note.is_pinned && !note.is_archived;
    if (sidebarView === 'daily') return note.is_daily && !note.is_archived;
    if (sidebarView === 'archived') return note.is_archived;
    if (sidebarView === 'folder' && selectedFolderId) {
      return note.folder_id === selectedFolderId && !note.is_archived;
    }
    return !note.is_archived;
  });

  // Sort: pinned first, then by updated date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  // Handle initial template
  useEffect(() => {
    if (isOpen && initialTemplate === 'daily') {
      getOrCreateDailyNote();
    } else if (isOpen && initialNoteId) {
      selectNote(initialNoteId);
    }
  }, [isOpen, initialTemplate, initialNoteId, getOrCreateDailyNote, selectNote]);

  // Search handler with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchNotes(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchNotes]);

  const handleCreateNote = async () => {
    const note = await createNote({ title: '', content: '' });
    if (note) selectNote(note.id);
  };

  const handleCreateDailyNote = async () => {
    await getOrCreateDailyNote();
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName);
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const handleSelectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSidebarView('folder');
    setSearchResults(null);
    setSearchQuery('');
  };

  const handleNoteContentChange = useCallback(
    async (content: string) => {
      if (!currentNote) return;
      let title = currentNote.title;
      if (!title) {
        const firstLine = content.split('\n')[0]?.replace(/^#+\s*/, '').trim();
        if (firstLine) title = firstLine.slice(0, 100);
      }
      await updateNote(currentNote.id, { content, title });
    },
    [currentNote, updateNote]
  );

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const panelContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="notes-panel-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-black/90"
        >
          <motion.div
            key="notes-panel-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="flex flex-col w-full h-full bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/30"
          >
            {/* Top Header Bar */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30 backdrop-blur-sm">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back to Dashboard</span>
              </button>
              
              <div className="flex items-center gap-3">
                <StickyNote className="h-6 w-6 text-neon-primary" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                  Notes
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="neon" onClick={handleCreateNote}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Note
                </Button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar - Collapsible */}
              <aside className={cn(
                'border-r border-white/10 flex flex-col bg-black/20 transition-all duration-300',
                sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-60'
              )}>
                                {/* Search + Toggle */}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setSidebarCollapsed(true)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="Hide sidebar"
                    >
                      <PanelLeftClose className="h-4 w-4 text-white/50" />
                    </button>
                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Menu</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 rounded-lg border border-white/10 focus:ring-2 focus:ring-neon-primary/50 transition-all placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>

                {/* Today's Note Button */}
                <div className="px-3 pb-3">
                  <button
                    onClick={handleCreateDailyNote}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-neon-primary/20 via-purple-500/20 to-pink-500/20 border border-neon-primary/30 hover:border-neon-primary/50 transition-all group"
                  >
                    <div className="p-1.5 rounded-lg bg-neon-primary/20 group-hover:bg-neon-primary/30 transition-colors">
                      <Calendar className="h-4 w-4 text-neon-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-xs text-neon-primary">Today&apos;s Note</p>
                      <p className="text-[10px] text-white/60">
                        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-2 pb-3">
                  <div className="space-y-0.5">
                    {[
                      { id: 'all' as const, icon: FileText, label: 'All', count: stats.total },
                      { id: 'pinned' as const, icon: Pin, label: 'Pinned', count: stats.pinned },
                      { id: 'daily' as const, icon: Clock, label: 'Daily Notes', count: null },
                      { id: 'archived' as const, icon: Archive, label: 'Archived', count: stats.archived },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setSidebarView(item.id); setSearchResults(null); }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                          sidebarView === item.id && !searchResults
                            ? 'bg-white/15 text-white'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        <span className="text-xs">{item.label}</span>
                        {item.count !== null && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">
                            {item.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Folders */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between px-3 mb-1">
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Folders
                      </span>
                      <button
                        onClick={() => setShowNewFolderInput(true)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <FolderPlus className="h-4 w-4 text-white/50" />
                      </button>
                    </div>

                    {showNewFolderInput && (
                      <div className="px-2 mb-2">
                        <input
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Folder name..."
                          autoFocus
                          className="w-full px-3 py-2 text-sm bg-white/5 rounded-xl border border-white/10 focus:ring-2 focus:ring-neon-primary/50"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateFolder();
                            if (e.key === 'Escape') {
                              setShowNewFolderInput(false);
                              setNewFolderName('');
                            }
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-0.5">
                      {folders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => handleSelectFolder(folder.id)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                            sidebarView === 'folder' && selectedFolderId === folder.id
                              ? 'bg-white/15 text-white'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          )}
                        >
                          <Folder className="h-3.5 w-3.5" style={{ color: folder.color || undefined }} />
                          <span className="text-xs truncate flex-1 text-left">{folder.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">
                            {folder.note_count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </nav>
              </aside>

              {/* Sidebar Toggle when collapsed */}
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-2 border-r border-white/10 hover:bg-white/5 transition-colors"
                  title="Show sidebar"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              )}

              {/* Notes List - Collapsible */}
              <div className={cn(
                'border-r border-white/10 flex flex-col bg-black/10 transition-all duration-300',
                notesListCollapsed ? 'w-0 overflow-hidden' : 'w-64'
              )}>
                <div className="flex items-center justify-between p-3 border-b border-white/10">
                  <h2 className="font-semibold text-sm text-white/80 truncate">
                    {searchResults
                      ? `Results (${searchResults.length})`
                      : sidebarView === 'all' ? 'All Notes'
                      : sidebarView === 'pinned' ? 'Pinned'
                      : sidebarView === 'daily' ? 'Daily'
                      : sidebarView === 'archived' ? 'Archived'
                      : folders.find((f) => f.id === selectedFolderId)?.name || 'Notes'}
                  </h2>
                  <button
                    onClick={() => setNotesListCollapsed(true)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title="Hide notes list"
                  >
                    <PanelLeftClose className="h-3.5 w-3.5 text-white/50" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {isLoading || isSearching ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-neon-primary border-t-transparent" />
                    </div>
                  ) : sortedNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                      <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground mb-3">No notes yet</p>
                      <Button variant="ghost" size="sm" onClick={handleCreateNote}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create note
                      </Button>
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-0.5">
                      {sortedNotes.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => selectNote(note.id)}
                          className={cn(
                            'w-full p-2 rounded-lg text-left transition-all',
                            currentNote?.id === note.id
                              ? 'bg-neon-primary/20 border border-neon-primary/30'
                              : 'hover:bg-white/5'
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {note.is_pinned && <Pin className="h-2.5 w-2.5 text-neon-primary flex-shrink-0" />}
                            {note.is_daily && <Calendar className="h-2.5 w-2.5 text-neon-primary flex-shrink-0" />}
                            <h3 className="font-medium text-xs truncate flex-1 text-white">
                              {note.title || 'Untitled'}
                            </h3>
                          </div>
                          <p className="text-[10px] text-white/50 line-clamp-1 mb-1">
                            {getPreview(note.content, 50)}
                          </p>
                          <span className="text-[10px] text-white/40">{formatNoteDate(note.updated_at)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes List Toggle when collapsed */}
              {notesListCollapsed && (
                <button
                  onClick={() => setNotesListCollapsed(false)}
                  className="p-2 border-r border-white/10 hover:bg-white/5 transition-colors flex-shrink-0"
                  title="Show notes list"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              )}

              {/* Editor */}
              <main className="flex-1 flex flex-col bg-slate-800/30 min-w-0">
                {currentNote ? (
                  <>
                    {/* Editor Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <div className="flex items-center gap-3 min-w-0">
                        <h2 className="text-lg font-semibold truncate text-white">
                          {currentNote.title || 'Untitled'}
                        </h2>
                        {currentNote.is_daily && (
                          <span className="px-2 py-1 text-xs rounded-lg bg-neon-primary/20 text-neon-primary">
                            Daily Note
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => pinNote(currentNote.id, !currentNote.is_pinned)}
                        >
                          <Pin className={cn('h-4 w-4', currentNote.is_pinned && 'text-neon-primary fill-neon-primary')} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => archiveNote(currentNote.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => deleteNote(currentNote.id, true)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Editor */}
                    <div className="flex-1 overflow-hidden">
                      <RichTextEditor
                        key={currentNote.id}
                        note={currentNote}
                        onContentChange={handleNoteContentChange}
                        onTitleChange={(newTitle: string) => updateNote(currentNote.id, { title: newTitle })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-primary/20 to-purple-500/20 flex items-center justify-center mb-6">
                      <FileText className="h-12 w-12 text-neon-primary/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                      No note selected
                    </h3>
                    <p className="text-sm text-muted-foreground/70 mb-6 max-w-sm">
                      Select a note from the list to start editing, or create a new one
                    </p>
                    <div className="flex gap-3">
                      <Button variant="ghost" onClick={handleCreateNote}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Note
                      </Button>
                      <Button variant="neon" onClick={handleCreateDailyNote}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Today&apos;s Note
                      </Button>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render via Portal to escape parent container
  return createPortal(panelContent, document.body);
}

NotesPanel.displayName = 'NotesPanel';
