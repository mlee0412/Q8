-- Migration: Documents & Knowledge Base (Phase 4)
-- Enables file uploads with RAG capabilities via pgvector
-- Supports both per-conversation and global knowledge base usage

-- ============================================================
-- Documents Table
-- Stores file metadata and processing status
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Owner
  user_id TEXT NOT NULL,

  -- File metadata
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,

  -- Storage location (Supabase Storage path)
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'documents',

  -- File type classification
  file_type TEXT NOT NULL CHECK (file_type IN (
    'pdf',
    'docx',
    'doc',
    'txt',
    'md',
    'csv',
    'json',
    'xlsx',
    'xls',
    'code',      -- Source code files
    'image',     -- For future OCR support
    'other'
  )),

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Uploaded, not processed
    'processing',   -- Currently being parsed/embedded
    'ready',        -- Fully processed and searchable
    'error',        -- Processing failed
    'archived'      -- Soft deleted
  )),
  processing_error TEXT,

  -- Scope: where this document is available
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN (
    'conversation',  -- Only available in specific thread
    'global'         -- Available to all agents across all conversations
  )),
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,

  -- Extracted metadata
  metadata JSONB DEFAULT '{}',
  -- Example: { "pages": 10, "language": "en", "title": "...", "author": "..." }

  -- Statistics
  chunk_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_scope ON documents(scope);
CREATE INDEX IF NOT EXISTS idx_documents_thread ON documents(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Document Chunks Table
-- Stores parsed content chunks with embeddings for RAG
-- ============================================================

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parent document
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Chunk content
  content TEXT NOT NULL,

  -- Position within document
  chunk_index INTEGER NOT NULL,

  -- For code files: additional context
  chunk_type TEXT DEFAULT 'text' CHECK (chunk_type IN (
    'text',           -- Regular text content
    'code',           -- Source code
    'table',          -- Extracted table data
    'heading',        -- Section heading
    'metadata'        -- Document metadata/frontmatter
  )),

  -- Source location (for citations)
  source_page INTEGER,           -- PDF page number
  source_line_start INTEGER,     -- Code line start
  source_line_end INTEGER,       -- Code line end

  -- Vector embedding for semantic search
  embedding vector(1536),

  -- Token count for context budgeting
  token_count INTEGER,

  -- Additional chunk metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_type ON document_chunks(chunk_type);

-- ============================================================
-- Semantic Search Function
-- Search across document chunks with filtering
-- ============================================================

CREATE OR REPLACE FUNCTION search_documents(
  p_user_id TEXT,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_min_similarity DECIMAL DEFAULT 0.7,
  p_scope TEXT DEFAULT NULL,           -- 'conversation' or 'global' or NULL for all
  p_thread_id UUID DEFAULT NULL,       -- Filter to specific thread
  p_file_types TEXT[] DEFAULT NULL     -- Filter by file types
) RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_name TEXT,
  file_type TEXT,
  content TEXT,
  chunk_type TEXT,
  source_page INTEGER,
  similarity DECIMAL,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    d.id AS document_id,
    d.name AS document_name,
    d.file_type,
    dc.content,
    dc.chunk_type,
    dc.source_page,
    (1 - (dc.embedding <=> p_query_embedding))::DECIMAL AS similarity,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE d.user_id = p_user_id
    AND d.status = 'ready'
    AND dc.embedding IS NOT NULL
    AND (1 - (dc.embedding <=> p_query_embedding)) >= p_min_similarity
    AND (p_scope IS NULL OR d.scope = p_scope)
    AND (p_thread_id IS NULL OR d.thread_id = p_thread_id OR d.scope = 'global')
    AND (p_file_types IS NULL OR d.file_type = ANY(p_file_types))
  ORDER BY dc.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Get Context for Conversation
-- Retrieves relevant document chunks for a conversation
-- ============================================================

CREATE OR REPLACE FUNCTION get_conversation_context(
  p_user_id TEXT,
  p_thread_id UUID,
  p_query_embedding vector(1536),
  p_max_tokens INTEGER DEFAULT 4000,
  p_min_similarity DECIMAL DEFAULT 0.6
) RETURNS TABLE (
  chunk_id UUID,
  document_name TEXT,
  content TEXT,
  similarity DECIMAL,
  cumulative_tokens INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_chunks AS (
    SELECT
      dc.id,
      d.name,
      dc.content,
      (1 - (dc.embedding <=> p_query_embedding))::DECIMAL AS sim,
      dc.token_count,
      ROW_NUMBER() OVER (ORDER BY dc.embedding <=> p_query_embedding) AS rn
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.user_id = p_user_id
      AND d.status = 'ready'
      AND dc.embedding IS NOT NULL
      AND (1 - (dc.embedding <=> p_query_embedding)) >= p_min_similarity
      AND (d.scope = 'global' OR d.thread_id = p_thread_id)
  ),
  with_cumulative AS (
    SELECT
      rc.*,
      SUM(COALESCE(rc.token_count, 100)) OVER (ORDER BY rc.rn) AS cum_tokens
    FROM ranked_chunks rc
  )
  SELECT
    wc.id AS chunk_id,
    wc.name AS document_name,
    wc.content,
    wc.sim AS similarity,
    wc.cum_tokens::INTEGER AS cumulative_tokens
  FROM with_cumulative wc
  WHERE wc.cum_tokens <= p_max_tokens
  ORDER BY wc.rn;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Documents policies
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
CREATE POLICY "Users can view their own documents"
    ON documents FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
CREATE POLICY "Users can create their own documents"
    ON documents FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
CREATE POLICY "Users can update their own documents"
    ON documents FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
CREATE POLICY "Users can delete their own documents"
    ON documents FOR DELETE USING (auth.uid()::text = user_id);

-- Service role can manage all documents
DROP POLICY IF EXISTS "Service role can manage all documents" ON documents;
CREATE POLICY "Service role can manage all documents"
    ON documents FOR ALL USING (auth.role() = 'service_role');

-- Document chunks policies (inherit from parent document)
DROP POLICY IF EXISTS "Users can view their document chunks" ON document_chunks;
CREATE POLICY "Users can view their document chunks"
    ON document_chunks FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND d.user_id = auth.uid()::text
    ));

DROP POLICY IF EXISTS "Service role can manage all chunks" ON document_chunks;
CREATE POLICY "Service role can manage all chunks"
    ON document_chunks FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Storage Bucket Setup (run manually or via Supabase dashboard)
-- ============================================================

-- Note: Storage bucket creation is done via Supabase dashboard or API
-- Bucket name: 'documents'
-- Settings:
--   - Public: false (private bucket)
--   - File size limit: 50MB
--   - Allowed MIME types: application/pdf, application/msword,
--     application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--     text/plain, text/markdown, text/csv, application/json,
--     application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE documents IS 'Stores uploaded file metadata and processing status for the knowledge base system.';
COMMENT ON TABLE document_chunks IS 'Stores parsed and chunked document content with vector embeddings for RAG.';
COMMENT ON FUNCTION search_documents IS 'Semantic search across document chunks with filtering by scope, thread, and file type.';
COMMENT ON FUNCTION get_conversation_context IS 'Retrieves relevant document context for a conversation with token budgeting.';
