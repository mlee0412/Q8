/**
 * Google Workspace MCP Tool Definitions
 * Wrappers for Gmail, Calendar, Drive, YouTube
 */

import { mcpClient } from '../client';

export const GOOGLE_MCP_URL = process.env.GOOGLE_MCP_URL || 'http://localhost:3002';

/**
 * Initialize Google Workspace MCP tools
 */
export async function initGoogleTools() {
  await mcpClient.registerServer('google', GOOGLE_MCP_URL);
  return mcpClient.getServerTools('google');
}

/**
 * Gmail tools
 */

export async function listEmails(maxResults?: number, query?: string) {
  return mcpClient.executeTool('gmail_list_messages', { maxResults, query });
}

export async function sendEmail(to: string, subject: string, body: string) {
  return mcpClient.executeTool('gmail_send_message', { to, subject, body });
}

/**
 * Calendar tools
 */

export async function listCalendarEvents(
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string
) {
  return mcpClient.executeTool('calendar_list_events', { calendarId, timeMin, timeMax });
}

export async function createCalendarEvent(
  summary: string,
  start: string,
  end: string,
  description?: string
) {
  return mcpClient.executeTool('calendar_create_event', { summary, start, end, description });
}

/**
 * Drive tools
 */

export async function searchDrive(query: string, mimeType?: string) {
  return mcpClient.executeTool('drive_search_files', { query, mimeType });
}

export async function getDriveFile(fileId: string) {
  return mcpClient.executeTool('drive_get_file', { fileId });
}

/**
 * YouTube tools
 */

export async function searchYouTube(query: string, maxResults?: number) {
  return mcpClient.executeTool('youtube_search', { query, maxResults });
}
