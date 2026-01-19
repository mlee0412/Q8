/**
 * QuickNotesWidget Types
 */

export interface QuickNotesWidgetProps {
  userId: string;
  maxDisplay?: number;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}

export interface NoteItemProps {
  note: {
    id: string;
    title: string | null;
    content: string;
    is_pinned: boolean;
    is_daily: boolean;
    is_archived: boolean;
    ai_summary?: string | null;
    updated_at: string;
  };
  isExpanded: boolean;
  isQuickCommentActive: boolean;
  quickCommentText: string;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onQuickCommentStart: () => void;
  onQuickCommentChange: (text: string) => void;
  onQuickCommentSubmit: () => void;
  onQuickCommentCancel: () => void;
}

export interface WidgetHeaderProps {
  onOpenDailyNote: () => void;
  onOpenPanel: () => void;
  onNewNote: () => void;
}
