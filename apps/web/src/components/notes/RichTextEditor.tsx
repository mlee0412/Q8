'use client';

/**
 * RichTextEditor Component
 * Full-featured Tiptap editor with working toolbar and interactive checkboxes
 */

import { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { motion } from 'framer-motion';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
  Code,
  Link as LinkIcon,
  Quote,
  Minus,
  Sparkles,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Note } from '@/lib/supabase/types';

interface RichTextEditorProps {
  note: Note;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  autoFocus?: boolean;
}

export function RichTextEditor({
  note,
  onContentChange,
  onTitleChange,
  autoFocus = true,
}: RichTextEditorProps) {
  // Initialize Tiptap editor
  const editor = useEditor({
    immediatelyRender: false, // Required for SSR/Next.js to avoid hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-neon-primary underline cursor-pointer',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
    ],
    content: convertMarkdownToHTML(note.content),
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-full px-6 py-4',
      },
    },
    onUpdate: ({ editor }) => {
      // Convert HTML back to markdown-like format for storage
      const markdown = convertHTMLToMarkdown(editor.getHTML());
      onContentChange(markdown);
    },
    autofocus: autoFocus ? 'end' : false,
  });

  // Update editor content when note changes
  useEffect(() => {
    if (editor && note.content !== convertHTMLToMarkdown(editor.getHTML())) {
      editor.commands.setContent(convertMarkdownToHTML(note.content));
    }
  }, [note.id]); // Only on note change, not content change

  // Toolbar button component
  const ToolbarButton = ({
    onClick,
    isActive,
    title,
    children,
  }: {
    onClick: () => void;
    isActive?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', isActive && 'bg-white/20 text-neon-primary')}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  // Insert link handler
  const handleInsertLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/10 bg-white/5 flex-wrap">
        {/* History */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <div className="h-6 w-px bg-white/20 mx-1" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="h-6 w-px bg-white/20 mx-1" />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (⌘B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (⌘I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <div className="h-6 w-px bg-white/20 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Checklist"
        >
          <CheckSquare className="h-4 w-4" />
        </ToolbarButton>

        <div className="h-6 w-px bg-white/20 mx-1" />

        {/* Block elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleInsertLink} isActive={editor.isActive('link')} title="Link (⌘K)">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <div className="h-6 w-px bg-white/20 mx-2" />

        {/* AI Tools */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-neon-primary"
          title="AI Assist (coming soon)"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-xs">AI</span>
        </Button>
      </div>

      {/* Title Input */}
      <div className="px-6 pt-6">
        <input
          type="text"
          defaultValue={note.title || ''}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Note title..."
          className="w-full text-2xl font-bold bg-transparent border-0 focus:ring-0 focus:outline-none text-white placeholder:text-white/30"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 text-xs text-white/50">
        <div className="flex items-center gap-4">
          <span>{editor.storage.characterCount?.words?.() || countWords(note.content)} words</span>
          <span>{editor.storage.characterCount?.characters?.() || note.content.length} characters</span>
        </div>
        <span>Last edited {new Date(note.last_edited_at).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

/**
 * Convert simple markdown to HTML for Tiptap
 */
function convertMarkdownToHTML(markdown: string): string {
  if (!markdown) return '<p></p>';
  
  let html = markdown
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Task lists (must come before regular lists)
    .replace(/^- \[x\] (.+)$/gm, '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span>$1</span></label></li></ul>')
    .replace(/^- \[ \] (.+)$/gm, '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span>$1</span></label></li></ul>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Block quotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Lists (simple bullet points)
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Wrap paragraphs
    .split('\n\n')
    .map(block => {
      if (block.startsWith('<')) return block;
      if (block.trim()) return `<p>${block}</p>`;
      return '';
    })
    .join('');

  return html || '<p></p>';
}

/**
 * Convert Tiptap HTML back to markdown for storage
 */
function convertHTMLToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return '';
  
  return html
    // Headers
    .replace(/<h1>(.+?)<\/h1>/g, '# $1\n')
    .replace(/<h2>(.+?)<\/h2>/g, '## $1\n')
    .replace(/<h3>(.+?)<\/h3>/g, '### $1\n')
    // Task items
    .replace(/<li data-type="taskItem" data-checked="true"[^>]*>.*?<span>(.+?)<\/span>.*?<\/li>/g, '- [x] $1\n')
    .replace(/<li data-type="taskItem" data-checked="false"[^>]*>.*?<span>(.+?)<\/span>.*?<\/li>/g, '- [ ] $1\n')
    // Bold and italic
    .replace(/<strong>(.+?)<\/strong>/g, '**$1**')
    .replace(/<em>(.+?)<\/em>/g, '*$1*')
    // Code
    .replace(/<code>(.+?)<\/code>/g, '`$1`')
    // Links
    .replace(/<a href="(.+?)">(.+?)<\/a>/g, '[$2]($1)')
    // Block quotes
    .replace(/<blockquote>(.+?)<\/blockquote>/g, '> $1\n')
    // Horizontal rule
    .replace(/<hr\s*\/?>/g, '---\n')
    // List items
    .replace(/<li>(.+?)<\/li>/g, '- $1\n')
    // Paragraphs
    .replace(/<p>(.+?)<\/p>/g, '$1\n\n')
    // Clean up task list wrappers
    .replace(/<ul data-type="taskList">|<\/ul>/g, '')
    // Clean up other HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Simple word counter
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

RichTextEditor.displayName = 'RichTextEditor';
