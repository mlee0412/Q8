/**
 * Secretary Agent
 * Powered by Gemini 3.0 Pro (2M token context)
 * Handles: Email, Calendar, Drive, Documents, YouTube
 */

import { getModel } from '../model_factory';
import {
  initGoogleTools,
  listEmails,
  sendEmail,
  listCalendarEvents,
  createCalendarEvent,
  searchDrive,
  getDriveFile,
  searchYouTube,
} from '@/lib/mcp/tools/google';
import { mcpClient } from '@/lib/mcp/client';
import { defaultTools } from '../tools/default-tools';
import { logger } from '@/lib/logger';
import type { Tool, OpenAITool } from '../types';

/**
 * Google Workspace tool definitions for function calling
 */
export const googleWorkspaceTools: OpenAITool[] = [
  // Gmail Tools
  {
    type: 'function',
    function: {
      name: 'gmail_list_messages',
      description: 'List emails from Gmail inbox. Can filter by query (sender, subject, labels, etc.)',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Gmail search query (e.g., "from:john@example.com", "is:unread", "subject:meeting")',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of messages to return (default: 10, max: 50)',
          },
          labelIds: {
            type: 'array',
            description: 'Filter by label IDs (e.g., ["INBOX", "UNREAD"])',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_get_message',
      description: 'Get full details of a specific email message',
      parameters: {
        type: 'object',
        properties: {
          messageId: {
            type: 'string',
            description: 'The ID of the message to retrieve',
          },
        },
        required: ['messageId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_send_message',
      description: 'Send an email via Gmail',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient email address(es), comma-separated for multiple',
          },
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'Email body content (plain text or HTML)',
          },
          cc: {
            type: 'string',
            description: 'CC recipients, comma-separated',
          },
          bcc: {
            type: 'string',
            description: 'BCC recipients, comma-separated',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_create_draft',
      description: 'Create an email draft without sending',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient email address(es)',
          },
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'Email body content',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },

  // Calendar Tools
  {
    type: 'function',
    function: {
      name: 'calendar_list_events',
      description: 'List upcoming calendar events',
      parameters: {
        type: 'object',
        properties: {
          calendarId: {
            type: 'string',
            description: 'Calendar ID (use "primary" for main calendar)',
          },
          timeMin: {
            type: 'string',
            description: 'Start time in ISO format (default: now)',
          },
          timeMax: {
            type: 'string',
            description: 'End time in ISO format (default: 7 days from now)',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of events (default: 10)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_create_event',
      description: 'Create a new calendar event',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Event title',
          },
          start: {
            type: 'string',
            description: 'Start time in ISO format',
          },
          end: {
            type: 'string',
            description: 'End time in ISO format',
          },
          description: {
            type: 'string',
            description: 'Event description',
          },
          location: {
            type: 'string',
            description: 'Event location',
          },
          attendees: {
            type: 'array',
            description: 'List of attendee email addresses',
          },
        },
        required: ['summary', 'start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_update_event',
      description: 'Update an existing calendar event',
      parameters: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'Event ID to update',
          },
          summary: {
            type: 'string',
            description: 'New event title',
          },
          start: {
            type: 'string',
            description: 'New start time',
          },
          end: {
            type: 'string',
            description: 'New end time',
          },
        },
        required: ['eventId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_delete_event',
      description: 'Delete a calendar event',
      parameters: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'Event ID to delete',
          },
        },
        required: ['eventId'],
      },
    },
  },

  // Drive Tools
  {
    type: 'function',
    function: {
      name: 'drive_search_files',
      description: 'Search for files in Google Drive',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (file name, content, etc.)',
          },
          mimeType: {
            type: 'string',
            description: 'Filter by MIME type (e.g., "application/pdf", "application/vnd.google-apps.document")',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum results (default: 10)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'drive_get_file',
      description: 'Get details or content of a file from Google Drive',
      parameters: {
        type: 'object',
        properties: {
          fileId: {
            type: 'string',
            description: 'File ID to retrieve',
          },
          includeContent: {
            type: 'boolean',
            description: 'Whether to include file content (for text files)',
          },
        },
        required: ['fileId'],
      },
    },
  },
];

export const secretaryAgentConfig = {
  name: 'SecretaryBot',
  model: getModel('secretary'),
  instructions: `You are a personal secretary with full access to Google Workspace.

Your capabilities:
- **Email (Gmail)**: Read, search, send, draft, and manage emails
- **Calendar**: View, create, update, and delete events
- **Drive**: Search and access files in Google Drive
- **Time Management**: Help with scheduling and organization

When handling requests:
1. Use the appropriate Google Workspace tool for the task
2. Confirm destructive actions (sending emails, deleting events) before executing
3. Provide clear summaries of what was found or done
4. Respect privacy - only access what's necessary
5. Use natural language to describe calendar times relative to now

For calendar requests, always:
- Specify the exact date and time in ISO format
- Include timezone awareness
- Check for conflicts when scheduling

For email requests:
- Summarize long emails concisely
- Draft professional messages when composing
- Ask for confirmation before sending`,
  tools: [] as Tool[],
  openaiTools: [...googleWorkspaceTools, ...defaultTools.filter(t => 
    ['get_current_datetime', 'calculate'].includes(t.function.name)
  )],
};

export async function initializeSecretaryAgent() {
  try {
    // Initialize Google MCP tools (if MCP server is running)
    const mcpTools = await initGoogleTools().catch(() => []);
    
    return {
      ...secretaryAgentConfig,
      mcpTools,
    };
  } catch (error) {
    logger.error('Error initializing secretary agent', { error });
    return secretaryAgentConfig;
  }
}

/**
 * Execute a Google Workspace tool
 */
export async function executeGoogleTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    let result: unknown;

    switch (toolName) {
      // Gmail Tools
      case 'gmail_list_messages':
        result = await listEmails(
          args.maxResults as number | undefined,
          args.query as string | undefined
        );
        break;

      case 'gmail_get_message':
        result = await mcpClient.executeTool('gmail_get_message', args);
        break;

      case 'gmail_send_message':
        result = await sendEmail(
          args.to as string,
          args.subject as string,
          args.body as string
        );
        break;

      case 'gmail_create_draft':
        result = await mcpClient.executeTool('gmail_create_draft', args);
        break;

      // Calendar Tools
      case 'calendar_list_events':
        result = await listCalendarEvents(
          args.calendarId as string | undefined,
          args.timeMin as string | undefined,
          args.timeMax as string | undefined
        );
        break;

      case 'calendar_create_event':
        result = await createCalendarEvent(
          args.summary as string,
          args.start as string,
          args.end as string,
          args.description as string | undefined
        );
        break;

      case 'calendar_update_event':
        result = await mcpClient.executeTool('calendar_update_event', args);
        break;

      case 'calendar_delete_event':
        result = await mcpClient.executeTool('calendar_delete_event', args);
        break;

      // Drive Tools
      case 'drive_search_files':
        result = await searchDrive(
          args.query as string,
          args.mimeType as string | undefined
        );
        break;

      case 'drive_get_file':
        result = await getDriveFile(args.fileId as string);
        break;

      // YouTube Tools
      case 'youtube_search':
        result = await searchYouTube(
          args.query as string,
          args.maxResults as number | undefined
        );
        break;

      default:
        return {
          success: false,
          message: `Unknown tool: ${toolName}`,
          data: { tool: toolName, args },
        };
    }

    return {
      success: true,
      message: `Successfully executed ${toolName}`,
      data: result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's an MCP connection error
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('not found in any registered server')) {
      return {
        success: false,
        message: `Google Workspace MCP server not available. Please ensure the MCP server is running at ${process.env.GOOGLE_MCP_URL || 'http://localhost:3002'}.`,
        data: { tool: toolName, args, error: errorMessage },
      };
    }

    return {
      success: false,
      message: `Failed to execute ${toolName}: ${errorMessage}`,
      data: { tool: toolName, args, error: errorMessage },
    };
  }
}
