/**
 * Notes Tools for AI Agents
 * Tools that allow agents to search, read, and create notes
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * OpenAI function definitions for notes tools
 */
export const noteTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_notes',
      description: 'Search through the user\'s notes to find relevant information. Use this when the user asks about something they may have written down, or to retrieve context from their notes.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant notes',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
            default: 5,
          },
          semantic: {
            type: 'boolean',
            description: 'Whether to use semantic (AI-powered) search instead of text matching',
            default: false,
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_todays_note',
      description: 'Get or create the user\'s daily note for today. The daily note contains the date header and sections for focus, notes, completed tasks, ideas, and links.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_note',
      description: 'Create a new note for the user. Use this when the user wants to save information, create a reminder, or jot down an idea.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Optional title for the note',
          },
          content: {
            type: 'string',
            description: 'The content of the note. Can use markdown formatting.',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional tags to categorize the note',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_daily_note',
      description: 'Add content to today\'s daily note. Use this to append information, tasks, or ideas to the user\'s daily note.',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            enum: ['focus', 'notes', 'completed', 'ideas', 'links'],
            description: 'Which section to add the content to',
          },
          content: {
            type: 'string',
            description: 'The content to add to the section',
          },
        },
        required: ['section', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_notes',
      description: 'Get a list of the user\'s most recently updated notes. Use this to provide context about what the user has been working on.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of notes to return (default: 5)',
            default: 5,
          },
          includePinned: {
            type: 'boolean',
            description: 'Whether to include pinned notes first',
            default: true,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'summarize_notes',
      description: 'Get an AI-generated summary of the user\'s notes. Use this to provide a quick overview of what the user has been documenting.',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['today', 'week', 'month'],
            description: 'The timeframe to summarize notes from',
            default: 'today',
          },
        },
        required: [],
      },
    },
  },
];

/**
 * Tool execution handlers
 * These functions are called when an agent uses a notes tool
 */
export interface NotesToolContext {
  userId: string;
  baseUrl?: string;
}

/**
 * Execute a notes tool
 */
export async function executeNotesTool(
  toolName: string,
  args: Record<string, unknown>,
  context: NotesToolContext
): Promise<unknown> {
  const { userId, baseUrl = '' } = context;

  switch (toolName) {
    case 'search_notes': {
      const { query, limit = 5, semantic = false } = args as {
        query: string;
        limit?: number;
        semantic?: boolean;
      };

      const response = await fetch(`${baseUrl}/api/notes/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, query, limit, semantic }),
      });

      if (!response.ok) {
        throw new Error('Failed to search notes');
      }

      const data = await response.json();
      return {
        notes: data.notes.map((note: { id: string; title: string; content: string; tags: string[] }) => ({
          id: note.id,
          title: note.title,
          preview: note.content.slice(0, 200),
          tags: note.tags,
        })),
        count: data.notes.length,
      };
    }

    case 'get_todays_note': {
      // Create or get today's daily note
      const response = await fetch(`${baseUrl}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          isDaily: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get daily note');
      }

      const data = await response.json();
      return {
        id: data.note.id,
        title: data.note.title,
        content: data.note.content,
        isNew: !data.existing,
      };
    }

    case 'create_note': {
      const { title, content, tags } = args as {
        title?: string;
        content: string;
        tags?: string[];
      };

      const response = await fetch(`${baseUrl}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          content,
          tags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      const data = await response.json();
      return {
        success: true,
        id: data.note.id,
        title: data.note.title || 'Untitled',
      };
    }

    case 'add_to_daily_note': {
      const { section, content } = args as {
        section: 'focus' | 'notes' | 'completed' | 'ideas' | 'links';
        content: string;
      };

      // First get today's daily note
      const getResponse = await fetch(`${baseUrl}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          isDaily: true,
        }),
      });

      if (!getResponse.ok) {
        throw new Error('Failed to get daily note');
      }

      const dailyNote = await getResponse.json();
      const noteId = dailyNote.note.id;
      let currentContent = dailyNote.note.content;

      // Find the section and append content
      const sectionHeaders: Record<string, string> = {
        focus: "## 📋 Today's Focus",
        notes: '## 📝 Notes',
        completed: '## ✅ Completed',
        ideas: '## 💡 Ideas',
        links: '## 🔗 Links & References',
      };

      const sectionHeader = sectionHeaders[section];
      if (!sectionHeader) {
        throw new Error(`Invalid section: ${section}`);
      }
      const sectionIndex = currentContent.indexOf(sectionHeader);

      if (sectionIndex !== -1) {
        // Find the next section or end of content
        const afterSection = currentContent.slice(sectionIndex + sectionHeader.length);
        const nextSectionMatch = afterSection.match(/\n## /);
        const insertPosition = nextSectionMatch
          ? sectionIndex + sectionHeader.length + (nextSectionMatch.index ?? afterSection.length)
          : currentContent.length;

        // Format the new content
        const formattedContent = section === 'focus' || section === 'completed'
          ? `\n- [ ] ${content}`
          : `\n${content}`;

        currentContent =
          currentContent.slice(0, insertPosition) +
          formattedContent +
          currentContent.slice(insertPosition);
      }

      // Update the note
      const updateResponse = await fetch(`${baseUrl}/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentContent }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update daily note');
      }

      return {
        success: true,
        section,
        message: `Added to ${section} section`,
      };
    }

    case 'get_recent_notes': {
      const { limit = 5, includePinned = true } = args as {
        limit?: number;
        includePinned?: boolean;
      };

      const params = new URLSearchParams({
        userId,
        limit: limit.toString(),
      });

      const response = await fetch(`${baseUrl}/api/notes?${params}`);

      if (!response.ok) {
        throw new Error('Failed to get recent notes');
      }

      const data = await response.json();
      let notes = data.notes;

      if (includePinned) {
        notes = notes.sort((a: { is_pinned: boolean }, b: { is_pinned: boolean }) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          return 0;
        });
      }

      return {
        notes: notes.slice(0, limit).map((note: { id: string; title: string; content: string; is_pinned: boolean; updated_at: string }) => ({
          id: note.id,
          title: note.title || 'Untitled',
          preview: note.content.slice(0, 100),
          isPinned: note.is_pinned,
          updatedAt: note.updated_at,
        })),
      };
    }

    case 'summarize_notes': {
      const { timeframe = 'today' } = args as {
        timeframe?: 'today' | 'week' | 'month';
      };

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.setHours(0, 0, 0, 0));
      }

      const params = new URLSearchParams({
        userId,
        limit: '50',
      });

      const response = await fetch(`${baseUrl}/api/notes?${params}`);

      if (!response.ok) {
        throw new Error('Failed to get notes for summary');
      }

      const data = await response.json();
      const recentNotes = data.notes.filter(
        (note: { updated_at: string }) => new Date(note.updated_at) >= startDate
      );

      // Create a simple summary
      const totalNotes = recentNotes.length;
      const dailyNotes = recentNotes.filter((n: { is_daily: boolean }) => n.is_daily).length;
      const pinnedNotes = recentNotes.filter((n: { is_pinned: boolean }) => n.is_pinned).length;

      return {
        timeframe,
        summary: {
          totalNotes,
          dailyNotes,
          pinnedNotes,
          titles: recentNotes.slice(0, 5).map((n: { title: string }) => n.title || 'Untitled'),
        },
      };
    }

    default:
      throw new Error(`Unknown notes tool: ${toolName}`);
  }
}

/**
 * Get note context for agent system prompts
 * This provides relevant note information to the agent
 */
export async function getNoteContextForAgent(
  userId: string,
  baseUrl = ''
): Promise<string> {
  try {
    // Get today's daily note if it exists
    const dailyResponse = await fetch(`${baseUrl}/api/notes?userId=${userId}&dailyOnly=true&limit=1`);
    const dailyData = dailyResponse.ok ? await dailyResponse.json() : { notes: [] };
    const todayNote = dailyData.notes[0];

    // Get recent notes
    const recentResponse = await fetch(`${baseUrl}/api/notes?userId=${userId}&limit=5`);
    const recentData = recentResponse.ok ? await recentResponse.json() : { notes: [] };

    const lines: string[] = ['### User Notes Context'];

    if (todayNote) {
      lines.push('');
      lines.push("**Today's Daily Note:**");
      lines.push(todayNote.content.slice(0, 500));
      if (todayNote.content.length > 500) {
        lines.push('... (truncated)');
      }
    }

    if (recentData.notes.length > 0) {
      lines.push('');
      lines.push('**Recent Notes:**');
      recentData.notes.slice(0, 3).forEach((note: { title: string; content: string }) => {
        lines.push(`- ${note.title || 'Untitled'}: ${note.content.slice(0, 80)}...`);
      });
    }

    return lines.join('\n');
  } catch (error) {
    console.error('Failed to get note context:', error);
    return '';
  }
}
