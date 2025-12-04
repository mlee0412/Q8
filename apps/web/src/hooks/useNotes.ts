/**
 * useNotes Hook
 * Manage notes with real-time updates across devices
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Note, NoteFolder, NoteUpdate } from '@/lib/supabase/types';

interface UseNotesOptions {
  userId: string;
  folderId?: string | null;
  includeArchived?: boolean;
  limit?: number;
}

interface UseNotesReturn {
  notes: Note[];
  folders: (NoteFolder & { note_count: number })[];
  isLoading: boolean;
  error: string | null;
  currentNote: Note | null;
  // Note operations
  createNote: (options?: CreateNoteOptions) => Promise<Note | null>;
  updateNote: (noteId: string, updates: Partial<NoteUpdate>) => Promise<void>;
  deleteNote: (noteId: string, hard?: boolean) => Promise<void>;
  selectNote: (noteId: string | null) => Promise<void>;
  pinNote: (noteId: string, pinned: boolean) => Promise<void>;
  archiveNote: (noteId: string) => Promise<void>;
  addQuickComment: (noteId: string, comment: string) => Promise<void>;
  // Folder operations
  createFolder: (name: string, options?: CreateFolderOptions) => Promise<NoteFolder | null>;
  deleteFolder: (folderId: string) => Promise<void>;
  // Search
  searchNotes: (query: string, semantic?: boolean) => Promise<Note[]>;
  // Daily note
  getOrCreateDailyNote: (date?: Date) => Promise<Note | null>;
  // Utilities
  refreshNotes: () => Promise<void>;
  refreshFolders: () => Promise<void>;
  stats: {
    total: number;
    pinned: number;
    archived: number;
  };
}

interface CreateNoteOptions {
  title?: string;
  content?: string;
  folderId?: string;
  tags?: string[];
  isDaily?: boolean;
  dailyDate?: string;
}

interface CreateFolderOptions {
  icon?: string;
  color?: string;
  parentId?: string;
}

export function useNotes(options: UseNotesOptions): UseNotesReturn {
  const { userId, folderId, includeArchived = false, limit = 100 } = options;

  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<(NoteFolder & { note_count: number })[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch notes from API
   */
  const fetchNotes = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId,
        includeArchived: includeArchived.toString(),
        limit: limit.toString(),
      });

      if (folderId !== undefined) {
        params.append('folderId', folderId || 'null');
      }

      const response = await fetch(`/api/notes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch notes');

      const data = await response.json();
      setNotes(data.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, folderId, includeArchived, limit]);

  /**
   * Fetch folders from API
   */
  const fetchFolders = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/notes/folders?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch folders');

      const data = await response.json();
      setFolders(data.folders || []);
    } catch (err) {
      console.error('Failed to fetch folders:', err);
    }
  }, [userId]);

  /**
   * Create a new note
   */
  const createNote = useCallback(async (createOptions?: CreateNoteOptions): Promise<Note | null> => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: createOptions?.title,
          content: createOptions?.content || '',
          folderId: createOptions?.folderId || folderId,
          tags: createOptions?.tags,
          isDaily: createOptions?.isDaily,
          dailyDate: createOptions?.dailyDate,
        }),
      });

      if (!response.ok) throw new Error('Failed to create note');

      const data = await response.json();
      const newNote = data.note;

      // Don't add duplicate if it was an existing daily note
      if (!data.existing) {
        setNotes((prev) => [newNote, ...prev]);
      }
      
      setCurrentNote(newNote);
      return newNote;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [userId, folderId]);

  /**
   * Update a note
   */
  const updateNote = useCallback(async (noteId: string, updates: Partial<NoteUpdate>) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updates.title,
          content: updates.content,
          contentJson: updates.content_json,
          folderId: updates.folder_id,
          isPinned: updates.is_pinned,
          isArchived: updates.is_archived,
          isLocked: updates.is_locked,
          color: updates.color,
          tags: updates.tags,
          aiSummary: updates.ai_summary,
          aiActionItems: updates.ai_action_items,
        }),
      });

      if (!response.ok) throw new Error('Failed to update note');

      const data = await response.json();

      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, ...data.note } : n))
      );

      if (currentNote?.id === noteId) {
        setCurrentNote((prev) => (prev ? { ...prev, ...data.note } : prev));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [currentNote?.id]);

  /**
   * Delete a note
   */
  const deleteNote = useCallback(async (noteId: string, hard = false) => {
    try {
      const response = await fetch(`/api/notes/${noteId}?hard=${hard}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete note');

      if (hard) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } else {
        // Soft delete - mark as archived
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId ? { ...n, is_archived: true } : n
          )
        );
        if (!includeArchived) {
          setNotes((prev) => prev.filter((n) => n.id !== noteId));
        }
      }

      if (currentNote?.id === noteId) {
        setCurrentNote(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [currentNote?.id, includeArchived]);

  /**
   * Select a note
   */
  const selectNote = useCallback(async (noteId: string | null) => {
    if (!noteId) {
      setCurrentNote(null);
      return;
    }

    // First check if we have it in the list
    const existing = notes.find((n) => n.id === noteId);
    if (existing) {
      setCurrentNote(existing);
      return;
    }

    // Otherwise fetch it
    try {
      const response = await fetch(`/api/notes/${noteId}`);
      if (!response.ok) throw new Error('Failed to load note');

      const data = await response.json();
      setCurrentNote(data.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [notes]);

  /**
   * Pin/unpin a note
   */
  const pinNote = useCallback(async (noteId: string, pinned: boolean) => {
    await updateNote(noteId, { is_pinned: pinned });
  }, [updateNote]);

  /**
   * Archive a note
   */
  const archiveNote = useCallback(async (noteId: string) => {
    await deleteNote(noteId, false);
  }, [deleteNote]);

  /**
   * Add a quick comment to a note (appends with timestamp)
   */
  const addQuickComment = useCallback(async (noteId: string, comment: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const commentLine = `\n\n[${timestamp}] ${comment}`;
    const newContent = note.content + commentLine;
    
    await updateNote(noteId, { content: newContent });
  }, [notes, updateNote]);

  /**
   * Create a folder
   */
  const createFolder = useCallback(async (
    name: string,
    createOptions?: CreateFolderOptions
  ): Promise<NoteFolder | null> => {
    try {
      const response = await fetch('/api/notes/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name,
          icon: createOptions?.icon,
          color: createOptions?.color,
          parentId: createOptions?.parentId,
        }),
      });

      if (!response.ok) throw new Error('Failed to create folder');

      const data = await response.json();
      setFolders((prev) => [...prev, { ...data.folder, note_count: 0 }]);
      return data.folder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [userId]);

  /**
   * Delete a folder
   */
  const deleteFolder = useCallback(async (deleteFolderId: string) => {
    try {
      const response = await fetch(`/api/notes/folders?id=${deleteFolderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete folder');

      setFolders((prev) => prev.filter((f) => f.id !== deleteFolderId));
      
      // Move notes from deleted folder to root in local state
      setNotes((prev) =>
        prev.map((n) =>
          n.folder_id === deleteFolderId ? { ...n, folder_id: null } : n
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  /**
   * Search notes
   */
  const searchNotes = useCallback(async (query: string, semantic = false): Promise<Note[]> => {
    try {
      const response = await fetch('/api/notes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          query,
          semantic,
          limit: 20,
        }),
      });

      if (!response.ok) throw new Error('Failed to search notes');

      const data = await response.json();
      return data.notes || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, [userId]);

  /**
   * Get logical date for daily note (day starts at 5 AM)
   * Before 5 AM = previous day's date
   * Uses local timezone to avoid UTC conversion issues
   */
  const getLogicalDate = useCallback((date: Date = new Date()): string => {
    const hours = date.getHours();
    const targetDate = new Date(date);
    
    // Before 5 AM, use previous day
    if (hours < 5) {
      targetDate.setDate(targetDate.getDate() - 1);
    }
    
    // Use local date formatting to avoid timezone issues
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  /**
   * Get or create today's daily note (day starts at 5 AM)
   */
  const getOrCreateDailyNote = useCallback(async (date?: Date): Promise<Note | null> => {
    const dateStr = getLogicalDate(date || new Date());

    // Check if we have it locally
    const existing = notes.find(
      (n) => n.is_daily && n.daily_date === dateStr
    );
    if (existing) {
      setCurrentNote(existing);
      return existing;
    }

    // Create new daily note (or get existing from server)
    return createNote({
      isDaily: true,
      dailyDate: dateStr,
    });
  }, [notes, createNote, getLogicalDate]);

  /**
   * Refresh notes
   */
  const refreshNotes = useCallback(async () => {
    await fetchNotes();
  }, [fetchNotes]);

  /**
   * Refresh folders
   */
  const refreshFolders = useCallback(async () => {
    await fetchFolders();
  }, [fetchFolders]);

  /**
   * Calculate stats
   */
  const stats = useMemo(() => ({
    total: notes.filter((n) => !n.is_archived).length,
    pinned: notes.filter((n) => n.is_pinned && !n.is_archived).length,
    archived: notes.filter((n) => n.is_archived).length,
  }), [notes]);

  // Initial fetch
  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, [fetchNotes, fetchFolders]);

  // Real-time subscription for notes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNote = payload.new as Note;
            setNotes((prev) => {
              if (prev.some((n) => n.id === newNote.id)) return prev;
              return [newNote, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedNote = payload.new as Note;
            setNotes((prev) =>
              prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
            );
            if (currentNote?.id === updatedNote.id) {
              setCurrentNote(updatedNote);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setNotes((prev) => prev.filter((n) => n.id !== deletedId));
            if (currentNote?.id === deletedId) {
              setCurrentNote(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, currentNote?.id]);

  // Real-time subscription for folders
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('folders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_folders',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refetch folders on any change
          fetchFolders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchFolders]);

  return {
    notes,
    folders,
    isLoading,
    error,
    currentNote,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
    pinNote,
    archiveNote,
    addQuickComment,
    createFolder,
    deleteFolder,
    searchNotes,
    getOrCreateDailyNote,
    refreshNotes,
    refreshFolders,
    stats,
  };
}
