# Supabase Setup

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Supabase project created at https://supabase.com

## Local Development

1. **Start Supabase locally:**
   ```bash
   supabase start
   ```

2. **Apply migrations:**
   ```bash
   supabase db reset
   ```

3. **Generate TypeScript types:**
   ```bash
   supabase gen types typescript --local > ../apps/web/src/lib/db/supabase-types.ts
   ```

## Production Deployment

1. **Link to your Supabase project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. **Push migrations:**
   ```bash
   supabase db push
   ```

3. **Generate production types:**
   ```bash
   supabase gen types typescript --linked > ../apps/web/src/lib/db/supabase-types.ts
   ```

## Schema Overview

### Tables

- **chat_messages**: Stores conversation history
- **user_preferences**: User settings and dashboard configuration
- **devices**: Connected devices and integrations
- **knowledge_base**: RAG storage with vector embeddings (pgvector)

### Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Auth handled by Supabase Auth

### Realtime

Realtime sync enabled for:
- chat_messages
- user_preferences
- devices

### Vector Search

The `match_knowledge` function provides semantic search capabilities:

```sql
SELECT * FROM match_knowledge(
  query_embedding := '[0.1, 0.2, ...]',  -- Your embedding vector
  match_threshold := 0.7,                 -- Minimum similarity
  match_count := 5,                       -- Number of results
  filter_user_id := 'user-uuid'           -- User filter
);
```

## Environment Variables

Required in your Supabase project:

- `OPENAI_API_KEY`: For embeddings generation
- `ANTHROPIC_API_KEY`: For agent operations
- `GOOGLE_GENERATIVE_AI_KEY`: For Gemini agent
