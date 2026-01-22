import { type ExtendedAgentType } from './types';
import { homeAssistantTools, executeHomeAssistantTool } from '../home-tools';
import { financeAdvisorConfig, executeFinanceAdvisorTool } from '../sub-agents/finance-advisor';
import { coderAgentConfig, executeCoderTool } from '../sub-agents/coder';
import { secretaryAgentConfig, executeGoogleTool } from '../sub-agents/secretary';
import { researcherAgentConfig } from '../sub-agents/researcher';
import { executeDefaultTool, defaultTools } from '../tools/default-tools';
import { imageTools, executeImageTool } from '../tools';
import { logger } from '@/lib/logger';
import type { ToolResult } from '../types';
import { TOOL_TIMEOUTS, DEFAULT_TOOL_TIMEOUT, CONFIRMATION_REQUIRED_TOOLS } from './constants';

/**
 * Get tools for an agent
 * Each agent has a specific set of tools available for function calling
 */
export function getAgentTools(agent: ExtendedAgentType): Array<{
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  switch (agent) {
    case 'home':
      return homeAssistantTools;
    case 'finance':
      return financeAdvisorConfig.openaiTools;
    case 'coder':
      return coderAgentConfig.openaiTools;
    case 'secretary':
      return secretaryAgentConfig.openaiTools;
    case 'researcher':
      return researcherAgentConfig.openaiTools;
    case 'imagegen':
      return imageTools;
    case 'personality':
      return defaultTools;
    default:
      return defaultTools;
  }
}

/**
 * Check if a tool requires user confirmation
 */
export function requiresConfirmation(toolName: string, args: Record<string, unknown>): boolean {
  if (CONFIRMATION_REQUIRED_TOOLS.has(toolName)) {
    // Special case: SQL only needs confirmation for destructive operations
    if (toolName === 'supabase_run_sql') {
      const query = (args.query as string || '').toUpperCase();
      return /\b(DELETE|DROP|TRUNCATE|ALTER|UPDATE)\b/.test(query);
    }
    return true;
  }
  return false;
}

/**
 * Classify error type for better error handling
 */
function classifyError(error: unknown): { code: string; recoverable: boolean } {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('timed out')) {
    return { code: 'TIMEOUT', recoverable: true };
  }
  if (message.includes('Failed to fetch') || message.includes('ECONNREFUSED')) {
    return { code: 'CONNECTION_ERROR', recoverable: true };
  }
  if (message.includes('not found') || message.includes('404')) {
    return { code: 'NOT_FOUND', recoverable: false };
  }
  if (message.includes('Unauthorized') || message.includes('401') || message.includes('403')) {
    return { code: 'AUTH_ERROR', recoverable: false };
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return { code: 'RATE_LIMITED', recoverable: true };
  }
  if (message.includes('Validation') || message.includes('Invalid')) {
    return { code: 'VALIDATION_ERROR', recoverable: false };
  }

  return { code: 'UNKNOWN_ERROR', recoverable: false };
}

/**
 * Execute a promise with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  toolName: string
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Tool '${toolName}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

/**
 * Execute a tool for an agent with timeout and error boundaries
 */
export async function executeAgentTool(
  agent: ExtendedAgentType,
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  const startTime = Date.now();
  const timeout = TOOL_TIMEOUTS[toolName] ?? DEFAULT_TOOL_TIMEOUT;
  const traceId = `${agent}-${toolName}-${Date.now()}`;

  logger.info('[ToolExecution] Starting', {
    agent,
    tool: toolName,
    traceId,
    timeout,
  });

  try {
    const executorPromise = (async (): Promise<ToolResult> => {
      switch (agent) {
        case 'home':
          return executeHomeAssistantTool(toolName, args);
        case 'finance':
          return executeFinanceAdvisorTool(toolName, args, userId);
        case 'coder':
          return executeCoderTool(toolName, args);
        case 'secretary':
          return executeGoogleTool(toolName, args);
        case 'imagegen':
          return executeImageTool(toolName, args);
        case 'researcher':
        case 'personality':
        default:
          return executeDefaultTool(toolName, args);
      }
    })();

    const result = await withTimeout(executorPromise, timeout, toolName);
    const durationMs = Date.now() - startTime;

    logger.info('[ToolExecution] Completed', {
      agent,
      tool: toolName,
      traceId,
      success: result.success,
      durationMs,
    });

    return {
      ...result,
      meta: {
        ...result.meta,
        durationMs,
        source: agent,
        traceId,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const { code, recoverable } = classifyError(error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('[ToolExecution] Failed', {
      agent,
      tool: toolName,
      traceId,
      errorCode: code,
      recoverable,
      durationMs,
      error: errorMessage,
    });

    return {
      success: false,
      message: `Tool '${toolName}' failed: ${errorMessage}`,
      error: {
        code,
        details: error instanceof Error ? error.stack : undefined,
      },
      meta: {
        durationMs,
        source: agent,
        traceId,
      },
    };
  }
}
