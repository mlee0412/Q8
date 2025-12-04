/**
 * Dev Agent (Coder)
 * Powered by Claude Sonnet 4.5
 * Handles: Code review, debugging, GitHub operations, Supabase management
 */

import { getModel } from '../model_factory';
import { initGitHubTools } from '@/lib/mcp/tools/github';
import { initSupabaseTools } from '@/lib/mcp/tools/supabase';
import type { Tool, OpenAITool } from '../types';

/**
 * GitHub tool definitions for function calling
 */
export const githubTools: OpenAITool[] = [
  {
    type: 'function',
    function: {
      name: 'github_search_code',
      description: 'Search for code across GitHub repositories',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (code, filename, etc.)',
          },
          repo: {
            type: 'string',
            description: 'Repository to search in (owner/repo format)',
          },
          language: {
            type: 'string',
            description: 'Filter by programming language',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_get_file',
      description: 'Get contents of a file from a GitHub repository',
      parameters: {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
            description: 'Repository (owner/repo format)',
          },
          path: {
            type: 'string',
            description: 'File path in the repository',
          },
          ref: {
            type: 'string',
            description: 'Branch, tag, or commit SHA (default: main)',
          },
        },
        required: ['repo', 'path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_list_prs',
      description: 'List pull requests in a repository',
      parameters: {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
            description: 'Repository (owner/repo format)',
          },
          state: {
            type: 'string',
            enum: ['open', 'closed', 'all'],
            description: 'PR state filter',
          },
        },
        required: ['repo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_create_issue',
      description: 'Create a new issue in a repository',
      parameters: {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
            description: 'Repository (owner/repo format)',
          },
          title: {
            type: 'string',
            description: 'Issue title',
          },
          body: {
            type: 'string',
            description: 'Issue description (markdown supported)',
          },
          labels: {
            type: 'array',
            description: 'Labels to add',
          },
        },
        required: ['repo', 'title', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_create_pr',
      description: 'Create a new pull request',
      parameters: {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
            description: 'Repository (owner/repo format)',
          },
          title: {
            type: 'string',
            description: 'PR title',
          },
          body: {
            type: 'string',
            description: 'PR description',
          },
          head: {
            type: 'string',
            description: 'Source branch',
          },
          base: {
            type: 'string',
            description: 'Target branch (default: main)',
          },
        },
        required: ['repo', 'title', 'head', 'base'],
      },
    },
  },
];

/**
 * Supabase tool definitions for function calling
 */
export const supabaseTools: OpenAITool[] = [
  {
    type: 'function',
    function: {
      name: 'supabase_run_sql',
      description: 'Execute a SQL query on the Supabase database',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL query to execute (SELECT, INSERT, UPDATE, DELETE)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'supabase_get_schema',
      description: 'Get database schema information (tables, columns, types)',
      parameters: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'Table name to get schema for (optional, gets all if not specified)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'supabase_list_tables',
      description: 'List all tables in the database',
      parameters: {
        type: 'object',
        properties: {
          schema: {
            type: 'string',
            description: 'Schema name (default: public)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'supabase_vector_search',
      description: 'Perform semantic/vector similarity search',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query text',
          },
          table: {
            type: 'string',
            description: 'Table with vector embeddings',
          },
          limit: {
            type: 'number',
            description: 'Max results to return',
          },
        },
        required: ['query', 'table'],
      },
    },
  },
];

export const coderAgentConfig = {
  name: 'DevBot',
  model: getModel('coder'),
  instructions: `You are an expert software engineer specialized in full-stack development.

Your capabilities:
- **Code Review**: Analyze code for bugs, performance issues, and best practices
- **GitHub Operations**: Search code, manage PRs/issues, access files
- **Supabase Database**: Run SQL queries, inspect schemas, perform vector search
- **Architecture**: Design patterns, refactoring recommendations

When helping with code:
1. First understand the context and requirements
2. Use tools to gather information (search code, check schema, etc.)
3. Provide clear, well-documented solutions
4. Follow best practices for the language/framework
5. Consider security implications (especially for database operations)

For database operations:
- Always verify before running destructive queries (DELETE, DROP, TRUNCATE)
- Use parameterized queries when possible
- Explain what the query does before executing

For GitHub operations:
- Provide context with PR/issue descriptions
- Reference related issues/PRs when relevant
- Follow repository conventions for naming`,
  tools: [] as Tool[],
  openaiTools: [...githubTools, ...supabaseTools],
};

export async function initializeCoderAgent() {
  try {
    // Initialize MCP tools (fail gracefully if servers not running)
    const [githubMcpTools, supabaseMcpTools] = await Promise.all([
      initGitHubTools().catch(() => []),
      initSupabaseTools().catch(() => []),
    ]);

    return {
      ...coderAgentConfig,
      mcpTools: [...githubMcpTools, ...supabaseMcpTools],
    };
  } catch (error) {
    console.error('Error initializing coder agent:', error);
    return coderAgentConfig;
  }
}

/**
 * Execute a coder tool
 */
export async function executeCoderTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; message: string; data?: unknown }> {
  console.log(`[Coder] Executing tool: ${toolName}`, args);

  // TODO: Implement actual GitHub/Supabase API calls
  // For now, return a placeholder
  return {
    success: false,
    message: `Tool "${toolName}" integration pending. MCP server connection required.`,
    data: { tool: toolName, args },
  };
}
