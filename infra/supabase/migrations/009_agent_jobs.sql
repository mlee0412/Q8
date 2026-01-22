-- Migration: Agent Jobs System (Phase 2 - Decoupled Swarm)
-- Enables background processing for Deep Thinker tasks
-- Supports: user messages, cron schedules, webhook triggers

-- ============================================================
-- Threads Table (conversation containers)
-- ============================================================

CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_last_message ON threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_archived ON threads(user_id, is_archived);

DROP TRIGGER IF EXISTS update_threads_updated_at ON threads;
CREATE TRIGGER update_threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for threads
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own threads" ON threads;
CREATE POLICY "Users can view their own threads"
  ON threads FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create their own threads" ON threads;
CREATE POLICY "Users can create their own threads"
  ON threads FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own threads" ON threads;
CREATE POLICY "Users can update their own threads"
  ON threads FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own threads" ON threads;
CREATE POLICY "Users can delete their own threads"
  ON threads FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================================
-- Update chat_messages to reference threads
-- ============================================================

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES threads(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at);

-- ============================================================
-- Agent Jobs Table
-- Background tasks for Deep Thinker processing
-- ============================================================

CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE job_trigger AS ENUM ('user_message', 'cron', 'webhook', 'follow_up', 'system');
CREATE TYPE job_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE IF NOT EXISTS agent_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Ownership
  user_id TEXT NOT NULL,
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,

  -- Job details
  trigger_type job_trigger NOT NULL DEFAULT 'user_message',
  agent_type TEXT NOT NULL,
  priority job_priority NOT NULL DEFAULT 'normal',

  -- Input/Output
  input_message TEXT NOT NULL,
  input_context JSONB DEFAULT '{}',
  output_content TEXT,
  output_metadata JSONB,

  -- Status tracking
  status job_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(), -- For scheduled/cron jobs
  timeout_at TIMESTAMPTZ, -- Job expiration

  -- Tool executions during job
  tool_executions JSONB DEFAULT '[]',

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for efficient job processing
CREATE INDEX IF NOT EXISTS idx_agent_jobs_user ON agent_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_thread ON agent_jobs(thread_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_pending ON agent_jobs(status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_jobs_processing ON agent_jobs(status, started_at)
  WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_agent_jobs_priority ON agent_jobs(priority DESC, created_at);

-- RLS for agent_jobs
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own jobs" ON agent_jobs;
CREATE POLICY "Users can view their own jobs"
  ON agent_jobs FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create their own jobs" ON agent_jobs;
CREATE POLICY "Users can create their own jobs"
  ON agent_jobs FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own jobs" ON agent_jobs;
CREATE POLICY "Users can update their own jobs"
  ON agent_jobs FOR UPDATE USING (auth.uid()::text = user_id);

-- Service role can manage all jobs (for background workers)
DROP POLICY IF EXISTS "Service role can manage all jobs" ON agent_jobs;
CREATE POLICY "Service role can manage all jobs"
  ON agent_jobs FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Functions for Job Management
-- ============================================================

-- Claim next pending job (atomic operation)
CREATE OR REPLACE FUNCTION claim_next_job(
  p_agent_types TEXT[] DEFAULT NULL,
  p_worker_id TEXT DEFAULT NULL
) RETURNS agent_jobs AS $$
DECLARE
  v_job agent_jobs;
BEGIN
  -- Select and lock the next pending job
  SELECT * INTO v_job
  FROM agent_jobs
  WHERE status = 'pending'
    AND scheduled_for <= NOW()
    AND (timeout_at IS NULL OR timeout_at > NOW())
    AND (p_agent_types IS NULL OR agent_type = ANY(p_agent_types))
  ORDER BY
    CASE priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_job.id IS NOT NULL THEN
    -- Mark as processing
    UPDATE agent_jobs
    SET status = 'processing',
        started_at = NOW(),
        metadata = metadata || jsonb_build_object('worker_id', p_worker_id)
    WHERE id = v_job.id;

    -- Refresh to get updated record
    SELECT * INTO v_job FROM agent_jobs WHERE id = v_job.id;
  END IF;

  RETURN v_job;
END;
$$ LANGUAGE plpgsql;

-- Complete a job
CREATE OR REPLACE FUNCTION complete_job(
  p_job_id UUID,
  p_output_content TEXT,
  p_output_metadata JSONB DEFAULT NULL,
  p_tool_executions JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE agent_jobs
  SET status = 'completed',
      completed_at = NOW(),
      output_content = p_output_content,
      output_metadata = COALESCE(p_output_metadata, output_metadata),
      tool_executions = COALESCE(p_tool_executions, tool_executions)
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Fail a job
CREATE OR REPLACE FUNCTION fail_job(
  p_job_id UUID,
  p_error_message TEXT,
  p_error_code TEXT DEFAULT 'UNKNOWN'
) RETURNS VOID AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
BEGIN
  SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
  FROM agent_jobs WHERE id = p_job_id;

  IF v_retry_count < v_max_retries THEN
    -- Schedule retry with exponential backoff
    UPDATE agent_jobs
    SET status = 'pending',
        retry_count = retry_count + 1,
        scheduled_for = NOW() + (INTERVAL '1 minute' * POWER(2, retry_count)),
        error_message = p_error_message,
        error_code = p_error_code,
        started_at = NULL
    WHERE id = p_job_id;
  ELSE
    -- Mark as permanently failed
    UPDATE agent_jobs
    SET status = 'failed',
        completed_at = NOW(),
        error_message = p_error_message,
        error_code = p_error_code
    WHERE id = p_job_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Clean up stale processing jobs (for worker crashes)
CREATE OR REPLACE FUNCTION cleanup_stale_jobs(
  p_stale_threshold INTERVAL DEFAULT INTERVAL '5 minutes'
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE agent_jobs
  SET status = 'pending',
      started_at = NULL,
      error_message = 'Worker timeout - job requeued'
  WHERE status = 'processing'
    AND started_at < NOW() - p_stale_threshold;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Fast Talker Response Table (cached quick responses)
-- ============================================================

CREATE TABLE IF NOT EXISTS fast_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  job_id UUID REFERENCES agent_jobs(id) ON DELETE SET NULL,

  -- The fast response content
  content TEXT NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('acknowledgment', 'clarification', 'preview', 'action_preview')),

  -- Whether deep response has arrived
  has_follow_up BOOLEAN NOT NULL DEFAULT true,
  follow_up_arrived BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fast_responses_thread ON fast_responses(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fast_responses_job ON fast_responses(job_id);

ALTER TABLE fast_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own fast responses" ON fast_responses;
CREATE POLICY "Users can view their own fast responses"
  ON fast_responses FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create their own fast responses" ON fast_responses;
CREATE POLICY "Users can create their own fast responses"
  ON fast_responses FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- ============================================================
-- Enable Realtime for new tables
-- ============================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE threads;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE agent_jobs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE fast_responses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE agent_jobs IS 'Background jobs for Deep Thinker agent processing. Supports user messages, scheduled tasks, and webhooks.';
COMMENT ON TABLE fast_responses IS 'Cached fast responses (acknowledgments, clarifications) while waiting for deep processing.';
COMMENT ON FUNCTION claim_next_job IS 'Atomically claim the next available job for processing. Uses SKIP LOCKED for concurrent workers.';
COMMENT ON FUNCTION complete_job IS 'Mark a job as successfully completed with output.';
COMMENT ON FUNCTION fail_job IS 'Mark a job as failed, with automatic retry if under max_retries.';
COMMENT ON FUNCTION cleanup_stale_jobs IS 'Requeue jobs that have been processing too long (worker crash recovery).';
