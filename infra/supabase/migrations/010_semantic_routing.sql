-- Migration: Semantic Vector Routing (Phase 3)
-- Enables intelligent agent routing via embedding similarity search
-- Improves routing accuracy through learned examples

-- ============================================================
-- Routing Examples Table
-- Stores training examples for vector-based routing decisions
-- ============================================================

CREATE TABLE IF NOT EXISTS routing_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The example query/message
  query TEXT NOT NULL,

  -- Target agent for this query
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'coder', 'researcher', 'secretary', 'home', 'finance', 'personality', 'orchestrator'
  )),

  -- Vector embedding for similarity search
  embedding vector(1536),

  -- Source of this example
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual',        -- Manually added by developers
    'feedback',      -- From user correction/feedback
    'telemetry',     -- From successful routing telemetry
    'synthetic'      -- Generated synthetically
  )),

  -- Confidence/quality score (0-1)
  quality_score DECIMAL(3,2) DEFAULT 1.0,

  -- Whether this example is active for routing
  is_active BOOLEAN DEFAULT true,

  -- Additional metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_routing_examples_embedding ON routing_examples
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE embedding IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_routing_examples_agent ON routing_examples(agent_type);
CREATE INDEX IF NOT EXISTS idx_routing_examples_active ON routing_examples(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_routing_examples_source ON routing_examples(source);

-- Updated at trigger
CREATE TRIGGER update_routing_examples_updated_at
    BEFORE UPDATE ON routing_examples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Routing Feedback Table
-- Captures user corrections for continuous learning
-- ============================================================

-- Drop existing table if it has incompatible schema (from earlier migrations)
DROP TABLE IF EXISTS routing_feedback CASCADE;

CREATE TABLE routing_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Reference to original routing
  user_id TEXT NOT NULL,
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,

  -- Original routing decision
  original_query TEXT NOT NULL,
  selected_agent TEXT NOT NULL,
  routing_confidence DECIMAL(3,2),
  routing_source TEXT,

  -- Feedback
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'correct',       -- User confirmed routing was correct
    'incorrect',     -- User indicated wrong agent was selected
    'improved',      -- User selected a better agent
    'tool_failure',  -- Agent failed to use correct tools
    'slow'           -- Response was too slow
  )),

  -- If incorrect/improved, what should it have been?
  correct_agent TEXT,

  -- User's explanation (optional)
  user_comment TEXT,

  -- Whether this has been processed into a training example
  processed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routing_feedback_user ON routing_feedback(user_id);
CREATE INDEX idx_routing_feedback_unprocessed ON routing_feedback(processed) WHERE processed = false;
CREATE INDEX idx_routing_feedback_type ON routing_feedback(feedback_type);

-- RLS for routing_feedback
ALTER TABLE routing_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own feedback" ON routing_feedback;
CREATE POLICY "Users can view their own feedback"
    ON routing_feedback FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create their own feedback" ON routing_feedback;
CREATE POLICY "Users can create their own feedback"
    ON routing_feedback FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Service role can manage all feedback
DROP POLICY IF EXISTS "Service role can manage all feedback" ON routing_feedback;
CREATE POLICY "Service role can manage all feedback"
    ON routing_feedback FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Semantic Routing Function
-- Finds similar routing examples via vector search
-- ============================================================

CREATE OR REPLACE FUNCTION search_routing_examples(
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 5,
  p_min_similarity DECIMAL DEFAULT 0.7
) RETURNS TABLE (
  agent_type TEXT,
  similarity DECIMAL,
  query TEXT,
  quality_score DECIMAL,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.agent_type,
    (1 - (re.embedding <=> p_query_embedding))::DECIMAL AS similarity,
    re.query,
    re.quality_score,
    re.source
  FROM routing_examples re
  WHERE re.embedding IS NOT NULL
    AND re.is_active = true
    AND (1 - (re.embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY re.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Aggregate Routing Scores Function
-- Aggregates multiple example matches into agent confidence scores
-- ============================================================

CREATE OR REPLACE FUNCTION aggregate_routing_scores(
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_min_similarity DECIMAL DEFAULT 0.6
) RETURNS TABLE (
  agent_type TEXT,
  confidence DECIMAL,
  match_count INTEGER,
  avg_similarity DECIMAL,
  avg_quality DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH matches AS (
    SELECT
      re.agent_type,
      (1 - (re.embedding <=> p_query_embedding)) AS similarity,
      re.quality_score
    FROM routing_examples re
    WHERE re.embedding IS NOT NULL
      AND re.is_active = true
      AND (1 - (re.embedding <=> p_query_embedding)) >= p_min_similarity
    ORDER BY re.embedding <=> p_query_embedding
    LIMIT p_limit
  ),
  agent_scores AS (
    SELECT
      m.agent_type,
      COUNT(*)::INTEGER AS match_count,
      AVG(m.similarity) AS avg_sim,
      AVG(m.quality_score) AS avg_qual,
      SUM(m.similarity * m.quality_score) AS weighted_sum
    FROM matches m
    GROUP BY m.agent_type
  )
  SELECT
    a.agent_type,
    -- Confidence formula: weighted sum normalized by total matches
    (a.weighted_sum / NULLIF(a.match_count, 0))::DECIMAL AS confidence,
    a.match_count,
    a.avg_sim::DECIMAL,
    a.avg_qual::DECIMAL
  FROM agent_scores a
  ORDER BY (a.weighted_sum / NULLIF(a.match_count, 0)) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Process Feedback into Training Examples
-- Converts user feedback into new routing examples
-- ============================================================

CREATE OR REPLACE FUNCTION process_routing_feedback(
  p_feedback_id UUID,
  p_embedding vector(1536)
) RETURNS UUID AS $$
DECLARE
  v_feedback routing_feedback;
  v_example_id UUID;
BEGIN
  -- Get the feedback record
  SELECT * INTO v_feedback FROM routing_feedback WHERE id = p_feedback_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback not found: %', p_feedback_id;
  END IF;

  IF v_feedback.processed THEN
    RAISE EXCEPTION 'Feedback already processed: %', p_feedback_id;
  END IF;

  -- Only process incorrect/improved feedback with correct_agent specified
  IF v_feedback.feedback_type IN ('incorrect', 'improved') AND v_feedback.correct_agent IS NOT NULL THEN
    -- Insert new routing example
    INSERT INTO routing_examples (query, agent_type, embedding, source, quality_score, metadata)
    VALUES (
      v_feedback.original_query,
      v_feedback.correct_agent,
      p_embedding,
      'feedback',
      0.9, -- Slightly lower quality for feedback-derived examples
      jsonb_build_object(
        'feedback_id', v_feedback.id,
        'original_agent', v_feedback.selected_agent,
        'user_comment', v_feedback.user_comment
      )
    )
    RETURNING id INTO v_example_id;
  ELSIF v_feedback.feedback_type = 'correct' THEN
    -- Correct feedback - create high-quality example
    INSERT INTO routing_examples (query, agent_type, embedding, source, quality_score, metadata)
    VALUES (
      v_feedback.original_query,
      v_feedback.selected_agent,
      p_embedding,
      'telemetry',
      1.0,
      jsonb_build_object('feedback_id', v_feedback.id, 'confirmed_correct', true)
    )
    RETURNING id INTO v_example_id;
  END IF;

  -- Mark feedback as processed
  UPDATE routing_feedback SET processed = true WHERE id = p_feedback_id;

  RETURN v_example_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Seed Initial Routing Examples
-- High-quality examples for each agent type
-- ============================================================

-- Note: Embeddings will be populated by the application
-- These are placeholder records that will be updated with embeddings

INSERT INTO routing_examples (query, agent_type, source, quality_score) VALUES
-- Coder examples
('Can you review this pull request?', 'coder', 'manual', 1.0),
('Fix the bug in the authentication module', 'coder', 'manual', 1.0),
('Write a function to parse JSON data', 'coder', 'manual', 1.0),
('Debug why the API is returning 500 errors', 'coder', 'manual', 1.0),
('Refactor this code to use async/await', 'coder', 'manual', 1.0),
('Check the GitHub issues for this repo', 'coder', 'manual', 1.0),
('Create a new branch for the feature', 'coder', 'manual', 1.0),
('Run the SQL migration script', 'coder', 'manual', 1.0),
('Explain how this algorithm works', 'coder', 'manual', 1.0),
('Optimize the database query performance', 'coder', 'manual', 1.0),

-- Researcher examples
('What are the latest developments in AI?', 'researcher', 'manual', 1.0),
('Find information about climate change', 'researcher', 'manual', 1.0),
('Search for recent news about Tesla', 'researcher', 'manual', 1.0),
('What is the capital of France?', 'researcher', 'manual', 1.0),
('Look up the definition of epistemology', 'researcher', 'manual', 1.0),
('Compare React and Vue frameworks', 'researcher', 'manual', 1.0),
('Research the history of the internet', 'researcher', 'manual', 1.0),
('What happened in the news today?', 'researcher', 'manual', 1.0),
('Find academic papers on machine learning', 'researcher', 'manual', 1.0),
('Who won the Nobel Prize this year?', 'researcher', 'manual', 1.0),

-- Secretary examples
('Schedule a meeting for tomorrow at 2pm', 'secretary', 'manual', 1.0),
('Check my calendar for next week', 'secretary', 'manual', 1.0),
('Send an email to John about the project', 'secretary', 'manual', 1.0),
('What meetings do I have today?', 'secretary', 'manual', 1.0),
('Create a calendar event for the team standup', 'secretary', 'manual', 1.0),
('Find the document in my Google Drive', 'secretary', 'manual', 1.0),
('Cancel my 3pm appointment', 'secretary', 'manual', 1.0),
('Draft an email to the client', 'secretary', 'manual', 1.0),
('Book a meeting room for Friday', 'secretary', 'manual', 1.0),
('Show me unread emails from this week', 'secretary', 'manual', 1.0),

-- Home examples
('Turn on the living room lights', 'home', 'manual', 1.0),
('Set the thermostat to 72 degrees', 'home', 'manual', 1.0),
('Lock all the doors', 'home', 'manual', 1.0),
('Dim the bedroom lights to 50%', 'home', 'manual', 1.0),
('What is the temperature inside?', 'home', 'manual', 1.0),
('Turn off all the lights', 'home', 'manual', 1.0),
('Activate movie night scene', 'home', 'manual', 1.0),
('Is the garage door closed?', 'home', 'manual', 1.0),
('Set the AC to cooling mode', 'home', 'manual', 1.0),
('Close the blinds in the office', 'home', 'manual', 1.0),

-- Finance examples
('What is my current account balance?', 'finance', 'manual', 1.0),
('How much did I spend on food this month?', 'finance', 'manual', 1.0),
('Show me my upcoming bills', 'finance', 'manual', 1.0),
('Can I afford to buy a new laptop?', 'finance', 'manual', 1.0),
('What subscriptions am I paying for?', 'finance', 'manual', 1.0),
('Track my spending for last week', 'finance', 'manual', 1.0),
('What is my net worth?', 'finance', 'manual', 1.0),
('Compare my income vs expenses', 'finance', 'manual', 1.0),
('How much am I saving each month?', 'finance', 'manual', 1.0),
('Project my wealth in 5 years', 'finance', 'manual', 1.0),

-- Personality examples
('Hello, how are you?', 'personality', 'manual', 1.0),
('Tell me a joke', 'personality', 'manual', 1.0),
('What do you think about AI?', 'personality', 'manual', 1.0),
('I am feeling sad today', 'personality', 'manual', 1.0),
('Can you help me brainstorm ideas?', 'personality', 'manual', 1.0),
('Write a short poem about the ocean', 'personality', 'manual', 1.0),
('What should I do this weekend?', 'personality', 'manual', 1.0),
('Thanks for your help!', 'personality', 'manual', 1.0),
('Good morning!', 'personality', 'manual', 1.0),
('I need some advice', 'personality', 'manual', 1.0)

ON CONFLICT DO NOTHING;

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE routing_examples IS 'Training examples for semantic vector-based agent routing. Each example maps a query to an agent type via embedding similarity.';
COMMENT ON TABLE routing_feedback IS 'User feedback on routing decisions for continuous learning and improvement.';
COMMENT ON FUNCTION search_routing_examples IS 'Performs vector similarity search to find matching routing examples.';
COMMENT ON FUNCTION aggregate_routing_scores IS 'Aggregates multiple example matches into confidence scores per agent.';
COMMENT ON FUNCTION process_routing_feedback IS 'Converts user feedback into new training examples with embeddings.';
