/**
 * Deep Thinker Worker
 *
 * Background job processor for complex, long-running agent tasks.
 * Works in tandem with Fast Talker: Fast Talker provides instant responses,
 * Deep Thinker processes the heavy lifting in the background.
 *
 * Features:
 * - Atomic job claiming (prevents duplicate processing)
 * - Automatic retries with exponential backoff
 * - Stale job recovery (handles worker crashes)
 * - Tool execution tracking
 * - Realtime notifications via Supabase
 */

import { processMessage } from '../orchestration/service';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { ExtendedAgentType, RoutingDecision } from '../orchestration/types';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentJob {
  id: string;
  user_id: string;
  thread_id: string | null;
  trigger_type: 'user_message' | 'cron' | 'webhook' | 'follow_up' | 'system';
  agent_type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  input_message: string;
  input_context: {
    routing?: RoutingDecision;
    userProfile?: {
      name?: string;
      timezone?: string;
      communicationStyle?: 'concise' | 'detailed';
    };
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  retry_count: number;
  max_retries: number;
  scheduled_for: string;
  timeout_at: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkerConfig {
  /** Worker identifier for logging */
  workerId?: string;
  /** Agent types this worker can process (null = all) */
  agentTypes?: ExtendedAgentType[];
  /** Maximum jobs to process in one batch */
  batchSize?: number;
  /** Maximum concurrent job processing */
  concurrency?: number;
  /** Polling interval in ms (for continuous mode) */
  pollIntervalMs?: number;
}

export interface WorkerResult {
  processed: number;
  succeeded: number;
  failed: number;
  jobs: Array<{
    jobId: string;
    status: 'completed' | 'failed' | 'timeout';
    durationMs: number;
    error?: string;
  }>;
}

// =============================================================================
// JOB CLAIM
// =============================================================================

/**
 * Claim the next pending job atomically
 * Uses Postgres FOR UPDATE SKIP LOCKED to prevent race conditions
 */
async function claimNextJob(
  agentTypes?: ExtendedAgentType[],
  workerId?: string
): Promise<AgentJob | null> {
  const { data, error } = await supabaseAdmin.rpc('claim_next_job', {
    p_agent_types: agentTypes ?? null,
    p_worker_id: workerId ?? null,
  });

  if (error) {
    logger.error('[DeepThinker] Failed to claim job', { error });
    return null;
  }

  // claim_next_job returns a single row or null
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  // Handle both single object and array response
  const job = Array.isArray(data) ? data[0] : data;

  if (!job?.id) {
    return null;
  }

  logger.info('[DeepThinker] Job claimed', {
    jobId: job.id,
    agentType: job.agent_type,
    priority: job.priority,
    workerId,
  });

  return job as AgentJob;
}

/**
 * Mark a job as completed
 */
async function completeJob(
  jobId: string,
  outputContent: string,
  outputMetadata?: Record<string, unknown>,
  toolExecutions?: Array<{ tool: string; success: boolean; duration: number }>
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('complete_job', {
    p_job_id: jobId,
    p_output_content: outputContent,
    p_output_metadata: outputMetadata ?? null,
    p_tool_executions: toolExecutions ?? null,
  });

  if (error) {
    logger.error('[DeepThinker] Failed to complete job', { jobId, error });
    throw new Error(`Failed to complete job: ${error.message}`);
  }

  logger.info('[DeepThinker] Job completed', { jobId });
}

/**
 * Mark a job as failed (will retry if under max_retries)
 */
async function failJob(
  jobId: string,
  errorMessage: string,
  errorCode: string = 'UNKNOWN'
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('fail_job', {
    p_job_id: jobId,
    p_error_message: errorMessage,
    p_error_code: errorCode,
  });

  if (error) {
    logger.error('[DeepThinker] Failed to mark job as failed', { jobId, error });
    throw new Error(`Failed to mark job as failed: ${error.message}`);
  }

  logger.warn('[DeepThinker] Job failed', { jobId, errorMessage, errorCode });
}

/**
 * Clean up stale processing jobs (worker crash recovery)
 */
export async function cleanupStaleJobs(
  staleThresholdMinutes: number = 5
): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('cleanup_stale_jobs', {
    p_stale_threshold: `${staleThresholdMinutes} minutes`,
  });

  if (error) {
    logger.error('[DeepThinker] Failed to cleanup stale jobs', { error });
    return 0;
  }

  const count = data ?? 0;

  if (count > 0) {
    logger.info('[DeepThinker] Cleaned up stale jobs', { count });
  }

  return count;
}

// =============================================================================
// JOB PROCESSING
// =============================================================================

/**
 * Process a single job through the orchestration system
 */
async function processJob(job: AgentJob): Promise<{
  success: boolean;
  content?: string;
  error?: string;
  toolExecutions?: Array<{ tool: string; success: boolean; duration: number }>;
}> {
  const startTime = Date.now();

  try {
    // Extract context from job
    const { routing, userProfile } = job.input_context;

    // Ensure we have a thread_id
    let threadId = job.thread_id;

    if (!threadId) {
      // Create a new thread for this job
      const { data: newThread, error } = await supabaseAdmin
        .from('threads')
        .insert({ user_id: job.user_id })
        .select('id')
        .single();

      if (error || !newThread) {
        throw new Error('Failed to create thread for job');
      }

      threadId = newThread.id;

      // Update job with thread_id
      await supabaseAdmin
        .from('agent_jobs')
        .update({ thread_id: threadId })
        .eq('id', job.id);
    }

    // Process through orchestration service
    const response = await processMessage({
      message: job.input_message,
      userId: job.user_id,
      threadId: threadId ?? undefined, // Convert null to undefined
      userProfile,
      forceAgent: routing?.agent,
      showToolExecutions: true,
    });

    // Extract tool executions for metrics
    const toolExecutions = response.toolExecutions?.map((t) => ({
      tool: t.tool,
      success: t.success ?? true, // Default to true if not specified
      duration: t.duration ?? 0,
    })) ?? [];

    const durationMs = Date.now() - startTime;

    logger.info('[DeepThinker] Job processed successfully', {
      jobId: job.id,
      durationMs,
      toolsUsed: toolExecutions.length,
    });

    // Mark the fast_response as having received follow-up
    await supabaseAdmin
      .from('fast_responses')
      .update({ follow_up_arrived: true })
      .eq('job_id', job.id);

    return {
      success: true,
      content: response.content,
      toolExecutions,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('[DeepThinker] Job processing failed', {
      jobId: job.id,
      durationMs,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// =============================================================================
// WORKER
// =============================================================================

/**
 * Process a batch of pending jobs
 * Returns after processing up to batchSize jobs
 */
export async function processBatch(config: WorkerConfig = {}): Promise<WorkerResult> {
  const {
    workerId = `worker-${Date.now()}`,
    agentTypes,
    batchSize = 10,
    concurrency = 3,
  } = config;

  const result: WorkerResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    jobs: [],
  };

  logger.info('[DeepThinker] Starting batch processing', {
    workerId,
    agentTypes,
    batchSize,
    concurrency,
  });

  // Clean up any stale jobs first
  await cleanupStaleJobs();

  // Process jobs in batches with concurrency control
  const activeJobs: Promise<void>[] = [];

  while (result.processed < batchSize) {
    // Wait if we're at max concurrency
    if (activeJobs.length >= concurrency) {
      await Promise.race(activeJobs);
      // Remove completed promises
      const stillRunning = activeJobs.filter((p) => {
        let done = false;
        p.then(() => { done = true; }).catch(() => { done = true; });
        return !done;
      });
      activeJobs.length = 0;
      activeJobs.push(...stillRunning);
    }

    // Claim next job
    const job = await claimNextJob(agentTypes, workerId);

    if (!job) {
      // No more jobs available
      break;
    }

    result.processed++;

    // Process job asynchronously
    const jobPromise = (async () => {
      const startTime = Date.now();

      try {
        const jobResult = await processJob(job);
        const durationMs = Date.now() - startTime;

        if (jobResult.success) {
          await completeJob(
            job.id,
            jobResult.content || '',
            { durationMs },
            jobResult.toolExecutions
          );

          result.succeeded++;
          result.jobs.push({
            jobId: job.id,
            status: 'completed',
            durationMs,
          });
        } else {
          await failJob(job.id, jobResult.error || 'Unknown error', 'PROCESSING_ERROR');

          result.failed++;
          result.jobs.push({
            jobId: job.id,
            status: 'failed',
            durationMs,
            error: jobResult.error,
          });
        }
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await failJob(job.id, errorMessage, 'WORKER_ERROR');

        result.failed++;
        result.jobs.push({
          jobId: job.id,
          status: 'failed',
          durationMs,
          error: errorMessage,
        });
      }
    })();

    activeJobs.push(jobPromise);
  }

  // Wait for all remaining jobs to complete
  await Promise.all(activeJobs);

  logger.info('[DeepThinker] Batch processing complete', {
    workerId,
    processed: result.processed,
    succeeded: result.succeeded,
    failed: result.failed,
  });

  return result;
}

/**
 * Run the worker continuously (for standalone worker service)
 * Polls for new jobs at the specified interval
 */
export async function runContinuously(config: WorkerConfig = {}): Promise<never> {
  const { pollIntervalMs = 5000, ...batchConfig } = config;

  logger.info('[DeepThinker] Starting continuous worker', {
    pollIntervalMs,
    ...batchConfig,
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await processBatch(batchConfig);

      // If we processed jobs, immediately check for more
      if (result.processed > 0) {
        continue;
      }

      // No jobs available, wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    } catch (error) {
      logger.error('[DeepThinker] Worker error', { error });

      // Wait before retrying after error
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs * 2));
    }
  }
}

/**
 * Process a specific job by ID (for testing/manual processing)
 */
export async function processJobById(jobId: string): Promise<WorkerResult> {
  // Fetch and claim the specific job
  const { data: job, error } = await supabaseAdmin
    .from('agent_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('status', 'pending')
    .single();

  if (error || !job) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      jobs: [{
        jobId,
        status: 'failed',
        durationMs: 0,
        error: error?.message || 'Job not found or not in pending status',
      }],
    };
  }

  // Mark as processing
  await supabaseAdmin
    .from('agent_jobs')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  const startTime = Date.now();
  const result = await processJob(job as AgentJob);
  const durationMs = Date.now() - startTime;

  if (result.success) {
    await completeJob(jobId, result.content || '', { durationMs }, result.toolExecutions);

    return {
      processed: 1,
      succeeded: 1,
      failed: 0,
      jobs: [{ jobId, status: 'completed', durationMs }],
    };
  } else {
    await failJob(jobId, result.error || 'Unknown error', 'PROCESSING_ERROR');

    return {
      processed: 1,
      succeeded: 0,
      failed: 1,
      jobs: [{ jobId, status: 'failed', durationMs, error: result.error }],
    };
  }
}

/**
 * Get job queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  byAgent: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  const [statusCounts, agentCounts, priorityCounts] = await Promise.all([
    supabaseAdmin
      .from('agent_jobs')
      .select('status', { count: 'exact', head: false })
      .in('status', ['pending', 'processing', 'completed', 'failed']),

    supabaseAdmin
      .from('agent_jobs')
      .select('agent_type, status')
      .eq('status', 'pending'),

    supabaseAdmin
      .from('agent_jobs')
      .select('priority, status')
      .eq('status', 'pending'),
  ]);

  // Count statuses
  const statusMap: Record<string, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  if (statusCounts.data) {
    for (const row of statusCounts.data) {
      const status = (row as { status: string }).status;
      statusMap[status] = (statusMap[status] || 0) + 1;
    }
  }

  // Count by agent
  const byAgent: Record<string, number> = {};
  if (agentCounts.data) {
    for (const row of agentCounts.data) {
      const agentType = (row as { agent_type: string }).agent_type;
      byAgent[agentType] = (byAgent[agentType] || 0) + 1;
    }
  }

  // Count by priority
  const byPriority: Record<string, number> = {};
  if (priorityCounts.data) {
    for (const row of priorityCounts.data) {
      const priority = (row as { priority: string }).priority;
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    }
  }

  return {
    pending: statusMap.pending ?? 0,
    processing: statusMap.processing ?? 0,
    completed: statusMap.completed ?? 0,
    failed: statusMap.failed ?? 0,
    byAgent,
    byPriority,
  };
}
