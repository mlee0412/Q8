# Q8 System Architecture

## Overview

Q8 is built on a **Local-First, Multi-Agent Swarm** architecture that combines the speed of local data storage with the intelligence of multiple specialized AI models.

## Core Architecture Principles

### 1. Local-First Data Layer

**Philosophy:** The UI never waits for the server.

```
User Action → RxDB (IndexedDB) → Instant UI Update
                ↓
         Background Sync
                ↓
         Supabase (Postgres)
```

**Benefits:**
- Zero latency interactions
- Offline functionality
- Optimistic UI updates
- Background synchronization

### 2. Multi-Agent Swarm

**Philosophy:** One assistant, many specialized brains.

```
User Request → Orchestrator (GPT-5.1)
                    ↓
         ┌──────────┼──────────┐
         ↓          ↓          ↓
    Dev Agent  Research  Secretary
   (Claude 4.5) (Perplexity) (Gemini)
```

**Key Components:**
- **Orchestrator**: Routes requests to specialists
- **Sub-Agents**: Domain-specific AI models
- **Tool Layer**: MCP servers for external integrations

### 3. Tool Protocol Integration

**Philosophy:** All capabilities exposed via standardized MCP.

```
Agent → MCP Client → MCP Server → External Service
                                      ↓
                              (GitHub/Gmail/Spotify)
```

## System Layers

### Frontend Layer

**Tech Stack:**
- Next.js 15 (App Router, RSC)
- React 19 (Server Actions, useOptimistic)
- Tailwind v4 (Glassmorphism)
- RxDB (Local Database)

**Responsibilities:**
- Render UI with zero latency
- Manage local state in RxDB
- Display optimistic updates
- Sync in background

**Key Files:**
- `apps/web/src/app/` - App Router pages
- `apps/web/src/components/` - React components
- `apps/web/src/lib/db/` - RxDB configuration

### Agent Layer

**Tech Stack:**
- OpenAI Agents SDK
- LiteLLM (Multi-provider routing)
- Custom orchestration logic

**Responsibilities:**
- Route user requests to specialists
- Coordinate multi-agent workflows
- Maintain conversation context
- Execute tool calls

**Key Files:**
- `apps/web/src/lib/agents/index.ts` - Orchestrator
- `apps/web/src/lib/agents/sub-agents/` - Specialist agents
- `apps/web/src/lib/agents/model_factory.ts` - Model routing

### Data Layer

**Tech Stack:**
- RxDB (Client-side)
- Supabase (Server-side)
- PostgreSQL + pgvector

**Responsibilities:**
- Store user data locally
- Sync with remote database
- Provide vector search (RAG)
- Enforce Row Level Security

**Key Files:**
- `apps/web/src/lib/db/schema.ts` - RxDB schemas
- `apps/web/src/lib/sync/` - Sync logic
- `infra/supabase/schema.sql` - Database schema

### Tool Layer

**Tech Stack:**
- Model Context Protocol (MCP)
- Express.js servers
- API clients (Octokit, Google APIs, etc.)

**Responsibilities:**
- Expose external services as tools
- Standardize tool interfaces
- Handle authentication
- Execute actions

**Key Files:**
- `apps/web/src/lib/mcp/` - MCP client
- `apps/mcp-servers/` - MCP server implementations

## Data Flow Diagrams

### User Interaction Flow

```
1. User types message in UI
   ↓
2. Message saved to RxDB (instant)
   ↓
3. UI updates immediately
   ↓
4. Background: Sync to Supabase
   ↓
5. Message sent to Orchestrator
   ↓
6. Orchestrator routes to specialist
   ↓
7. Specialist uses MCP tools
   ↓
8. Response saved to RxDB
   ↓
9. UI updates with response
   ↓
10. Background: Sync response to Supabase
```

### Agent Routing Flow

```
User: "Check my latest PR"
   ↓
Orchestrator analyzes intent
   ↓
Classifies as: CODE_TASK
   ↓
Transfers to: Dev Agent (Claude 4.5)
   ↓
Dev Agent uses: github_list_prs tool
   ↓
MCP Client calls: GitHub MCP Server
   ↓
GitHub API returns: PR data
   ↓
Dev Agent formats response
   ↓
Orchestrator speaks: "Your PR #123 passed all tests"
```

### Sync Flow

```
Local Change (RxDB)
   ↓
Change detected by sync listener
   ↓
Batch changes (debounced)
   ↓
POST to /api/sync/push
   ↓
Supabase validates & stores
   ↓
Supabase Realtime notifies other devices
   ↓
Other devices pull changes
   ↓
All devices in sync
```

## Deployment Architecture

### Development

```
Developer Machine
├── Next.js Dev Server (port 3000)
├── Local Supabase (Docker)
├── MCP Servers (ports 3001-3003)
└── RxDB (Browser IndexedDB)
```

### Production

```
Vercel Edge
├── Next.js App (SSR + RSC)
├── API Routes
└── Edge Functions

Supabase Cloud
├── PostgreSQL + pgvector
├── Realtime subscriptions
├── Auth
└── Storage

Railway / Cloud Run
├── GitHub MCP Server
├── Google MCP Server
└── Spotify MCP Server
```

## Security Architecture

### Authentication

- Supabase Auth (SSR-safe)
- Session-based encryption for RxDB
- JWT tokens for API access

### Authorization

- Row Level Security (RLS) in Supabase
- User can only access their own data
- MCP servers validate API keys

### Data Privacy

- Local encryption in RxDB
- End-to-end encryption for sensitive data
- No data sharing between users

## Scalability Considerations

### Horizontal Scaling

- MCP servers run as independent microservices
- Can scale each service independently
- Load balancing for high traffic

### Data Scaling

- RxDB handles millions of local documents
- Supabase scales with PostgreSQL
- Vector search optimized with HNSW indexes

### Agent Scaling

- Multiple concurrent agent conversations
- Streaming responses for better UX
- Rate limiting per user/model

## Performance Optimizations

### Frontend

- React Server Components reduce client JS
- Incremental Static Regeneration (ISR)
- Edge caching for static assets
- Image optimization with Next.js Image

### Database

- Indexed queries in RxDB
- PostgreSQL indexes on frequently queried fields
- Connection pooling in Supabase
- Vector index for fast semantic search

### Agents

- Model selection based on task complexity
- Response caching for common queries
- Parallel tool execution where possible
- Streaming responses for long operations

## Monitoring & Observability

### Logging

- Structured logging with Winston/Pino
- Error tracking with Sentry
- Agent conversation logs

### Metrics

- RxDB sync latency
- Agent response times
- API success rates
- Database query performance

### Tracing

- End-to-end request tracing
- Agent handoff tracking
- MCP tool execution traces

## Technology Stack Summary

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 15, React 19, Tailwind v4 |
| **State** | RxDB, TanStack Query |
| **Agents** | OpenAI Agents SDK, LiteLLM |
| **Database** | Supabase, PostgreSQL, pgvector |
| **Tools** | MCP, Express.js |
| **Infrastructure** | Vercel, Railway, Docker |
| **AI Models** | GPT-5.1, Claude 4.5, Gemini 3.0, Perplexity, Grok 4.1 |

## Design Patterns

### Local-First Pattern

- Optimistic updates
- Conflict resolution
- Background sync
- Offline support

### Multi-Agent Pattern

- Orchestrator-specialist hierarchy
- Intent classification
- Context passing
- Response synthesis

### Tool Pattern

- Standardized interfaces (MCP)
- Authentication abstraction
- Error handling
- Result transformation

## Next Steps

- See [Agent Swarm Architecture](./agent-swarm.md) for agent details
- See [Database Architecture](./database-architecture.md) for data layer
- See [MCP Integration](./mcp-integration.md) for tool layer
