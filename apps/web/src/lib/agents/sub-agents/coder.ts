/**
 * Dev Agent (Coder)
 * Powered by Claude Opus 4.5 (claude-opus-4-5-20251101)
 * Handles: Code review, debugging, GitHub operations, Supabase management
 * 
 * Enhanced capabilities (Jan 2026):
 * - Extended thinking for complex architectural decisions
 * - Vision analysis for code screenshots and diagrams
 * - 1M token context window with context-1m-2025-08-07 beta
 */

import { getModel } from '../model_factory';
import {
  initGitHubTools,
  searchCode,
  getFileContent,
  createIssue,
  createPR,
  listPRs,
  triggerWorkflow,
} from '@/lib/mcp/tools/github';
import {
  initSupabaseTools,
  runSQL,
  getSchema,
  vectorSearch,
} from '@/lib/mcp/tools/supabase';
import { mcpClient } from '@/lib/mcp/client';
import { MCP_CONFIG } from '@/lib/mcp/config';
import { logger } from '@/lib/logger';
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
  instructions: `You are an expert software engineer powered by Claude Opus 4.5 with extended thinking capabilities.

Your capabilities:
- **Extended Thinking**: Use deep reasoning for complex architectural decisions and debugging
- **Vision Analysis**: Analyze code screenshots, architecture diagrams, UI mockups, and error screenshots
- **Code Review**: Analyze code for bugs, performance issues, and best practices
- **GitHub Operations**: Search code, manage PRs/issues, access files
- **Supabase Database**: Run SQL queries, inspect schemas, perform vector search
- **Architecture**: Design patterns, refactoring recommendations

When helping with code:
1. First understand the context and requirements
2. Use tools to gather information (search code, check schema, etc.)
3. For complex problems, take time to think through the solution systematically
4. Provide clear, well-documented solutions
5. Follow best practices for the language/framework
6. Consider security implications (especially for database operations)

For database operations:
- Always verify before running destructive queries (DELETE, DROP, TRUNCATE)
- Use parameterized queries when possible
- Explain what the query does before executing

For GitHub operations:
- Provide context with PR/issue descriptions
- Reference related issues/PRs when relevant
- Follow repository conventions for naming

For image/screenshot analysis:
- When shown code screenshots, extract and analyze the code
- When shown architecture diagrams, explain the structure and suggest improvements
- When shown error screenshots, diagnose the issue and provide solutions`,
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
    logger.error('Error initializing coder agent', { error });
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
  try {
    let result: unknown;

    switch (toolName) {
      // GitHub Tools
      case 'github_search_code':
        result = await searchCode(
          args.query as string,
          args.repo as string | undefined
        );
        break;

      case 'github_get_file':
        result = await getFileContent(
          args.repo as string,
          args.path as string,
          args.ref as string | undefined
        );
        break;

      case 'github_list_prs':
        result = await listPRs(
          args.repo as string,
          args.state as 'open' | 'closed' | 'all' | undefined
        );
        break;

      case 'github_create_issue':
        result = await createIssue(
          args.repo as string,
          args.title as string,
          args.body as string
        );
        break;

      case 'github_create_pr':
        result = await createPR(
          args.repo as string,
          args.title as string,
          args.head as string,
          args.base as string,
          args.body as string | undefined
        );
        break;

      case 'github_trigger_workflow':
        result = await triggerWorkflow(
          args.repo as string,
          args.workflowId as string,
          args.ref as string
        );
        break;

      // Supabase Tools
      case 'supabase_run_sql':
        result = await runSQL(args.query as string);
        break;

      case 'supabase_get_schema':
        result = await getSchema(args.table as string | undefined);
        break;

      case 'supabase_list_tables':
        result = await mcpClient.executeTool('supabase_list_tables', args);
        break;

      case 'supabase_vector_search':
        result = await vectorSearch(
          args.query as string,
          args.table as string,
          args.limit as number | undefined
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
      const serverUrl = toolName.startsWith('github_') ? MCP_CONFIG.github.url() : MCP_CONFIG.supabase.url();
      return {
        success: false,
        message: `MCP server not available. Please ensure the server is running at ${serverUrl}.`,
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
