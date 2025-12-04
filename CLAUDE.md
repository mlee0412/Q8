# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Q8** is a local-first, multi-model AI personal assistant dashboard that orchestrates specialized AI agents (GPT-5.1, Claude 3.5/4.5, Gemini 3.0, Perplexity, Grok 4.1) via a federated swarm architecture. Core philosophy: "Local Speed, Global Intelligence."

**Key Principles:**
- **Local-First:** UI reads from RxDB (IndexedDB), never waits for server responses
- **Zero Latency:** Optimistic UI updates, background sync to Supabase
- **Multi-Model Swarm:** Orchestrator routes tasks to specialized sub-agents
- **Tool Protocol:** All external capabilities exposed via Model Context Protocol (MCP)

## Tech Stack

**Frontend:**
- Next.js 15.5/16 (App Router, React Server Components)
- React 19.2 (Server Actions, useOptimistic, React Compiler)
- Tailwind CSS v4 (Glassmorphism design system)
- RxDB (IndexedDB) - Single source of truth for UI state

**Backend & AI:**
- OpenAI Agents SDK v2.0+ (orchestration layer)
- LiteLLM (multi-provider routing)
- Supabase (Postgres + Auth + pgvector + Realtime)
- Model Context Protocol (MCP) for tool integrations

**Infrastructure:**
- Turbo monorepo with pnpm
- Vercel (deployment)
- Railway (Python MCP servers if needed)

## Architecture

### The Swarm (Multi-Agent System)

**Orchestrator (GPT-5.1):** Main router, handles voice (WebRTC), delegates to specialists
- Routes coding tasks → Dev Agent (Claude Sonnet 4.5)
- Routes search/research → Research Agent (Perplexity Sonar Pro)
- Routes docs/calendar/email → Secretary Agent (Gemini 3.0 Pro)
- Routes casual chat → Personality Agent (Grok 4.1)

**MCP Tool Layer:** GitHub, Supabase, Google Workspace, Spotify, Home Assistant, Square

### Data Flow

```
User → Glass UI (React 19)
     ↓
RxDB (Local IndexedDB) ← instant updates
     ↓ (background sync)
Supabase (Postgres + pgvector)
     ↓
Agents SDK → Sub-Agents → MCP Tools
```

## Directory Structure

```
q8/
├── apps/
│   ├── web/                      # Next.js 15/16 PWA
│   │   ├── src/
│   │   │   ├── app/              # App Router pages
│   │   │   ├── components/       # React components
│   │   │   │   ├── ui/           # Shadcn primitives
│   │   │   │   ├── dashboard/    # Bento grid & widgets
│   │   │   │   ├── voice/        # WebRTC voice interface
│   │   │   │   └── shared/       # AI buttons, shared logic
│   │   │   ├── hooks/            # useRxDB, useRealtimeAgent, etc.
│   │   │   └── lib/
│   │   │       ├── agents/       # Swarm configuration
│   │   │       │   ├── index.ts  # Orchestrator entry point
│   │   │       │   ├── sub-agents/  # Coder, researcher, secretary, etc.
│   │   │       │   └── model_factory.ts  # LiteLLM adapter
│   │   │       ├── mcp/          # MCP client logic
│   │   │       ├── db/           # RxDB schema & Supabase admin
│   │   │       └── sync/         # Replication logic (pull/push)
│   │   └── public/
│   └── mcp-servers/              # Standalone MCP microservices
│       ├── github/
│       ├── google/
│       └── spotify/
├── packages/
│   ├── db-schema/                # Shared JSON schemas
│   ├── ui/                       # Design system & Tailwind config
│   ├── ai-config/                # Prompts & model configurations
│   └── types/                    # TypeScript interfaces
├── infra/
│   ├── supabase/                 # SQL migrations, RLS policies
│   └── docker/                   # Local dev environment
└── turbo.json
```

## Development Commands

### Setup
```bash
# Install dependencies
pnpm install

# Setup environment
cp apps/web/.env.local.example apps/web/.env.local
# Then populate API keys (see Environment Variables section)

# Start development server
pnpm dev
```

### Build & Quality Gates
```bash
# Type checking (MUST pass before committing)
pnpm turbo typecheck

# Build verification
pnpm turbo build --filter=@q8/web

# Unit tests (for agents, RxDB, MCP clients)
pnpm test -- run

# E2E tests (for UI/Auth/Navigation changes)
pnpm playwright test --project=chromium
```

### Development Workflow
```bash
# Run single test file
pnpm test -- path/to/test.spec.ts

# Watch mode for tests
pnpm test -- --watch

# Storybook for component development
pnpm storybook
```

## Critical Development Rules

### Quality Gates (MANDATORY)
Before marking any task complete, you **MUST** run:
1. `pnpm turbo typecheck` - Must have 0 errors
2. `pnpm turbo build --filter=@q8/web` - Must succeed
3. `pnpm test -- run` - For logic changes (agents, RxDB, MCP)
4. `pnpm playwright test --project=chromium` - For UI/Auth/Navigation changes

### Type Safety
- `any` is **forbidden**
- All schemas (Zod/RxDB/Supabase) must align perfectly
- Use strict TypeScript configuration

### Local-First Architecture
- UI components **must** read from RxDB, never directly from API
- Use `useOptimistic` for instant UI updates
- Background sync happens via `lib/sync/pull.ts` and `push.ts`
- RxDB schemas in `lib/db/` must match Supabase tables in `infra/supabase/schema.sql`

### Documentation-First for Bleeding-Edge APIs
Before implementing with React 19, Next.js 15/16, OpenAI Agents SDK, or other cutting-edge libraries:
1. Search for latest API documentation
2. Verify syntax/patterns (don't guess based on older versions)
3. Check compatibility with current stack versions

### Agent Implementation Patterns
```typescript
// Always use model factory for consistency
import { getModel } from '@/lib/agents/model_factory';

// Agent definitions in lib/agents/sub-agents/
export const coderAgent = new Agent({
  name: "DevBot",
  model: getModel('coder'),  // Routes to Claude Sonnet 4.5 via LiteLLM
  instructions: "Expert software engineer...",
  tools: githubTools
});

// Orchestrator delegates via handoffs
orchestrator.handoffs = [coderAgent, researcherAgent, secretaryAgent];
```

### MCP Tool Integration
```typescript
// MCP clients in lib/mcp/
import { GitHubMCPClient } from '@/lib/mcp/github';

const githubTools = await GitHubMCPClient.getTools();
// Returns: [{ name: 'create_issue', ... }, { name: 'get_pr', ... }]
```

### Testing
- **Mock LLM responses** in tests - never burn API credits on unit tests
- Visual testing via Storybook for Bento Grid layouts
- RxDB hooks must handle `useEffect` correctly to prevent Next.js hydration mismatches

## Environment Variables

Required API keys in `apps/web/.env.local`:

**AI Providers:**
```bash
OPENAI_API_KEY=""           # GPT-5.1 & Realtime API
ANTHROPIC_API_KEY=""        # Claude 4.5 (Dev Agent)
GOOGLE_GENERATIVE_AI_KEY="" # Gemini 3.0 (Secretary)
PERPLEXITY_API_KEY=""       # Sonar Pro (Research)
XAI_API_KEY=""              # Grok 4.1 (Personality)
```

**Infrastructure:**
```bash
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_ACCESS_TOKEN=""
SUPABASE_PROJECT_ID=""
```

**Tool Integrations:**
```bash
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_PERSONAL_ACCESS_TOKEN=""  # Repo, Workflow, User scopes
SPOTIFY_CLIENT_ID=""
SPOTIFY_CLIENT_SECRET=""
SQUARE_ACCESS_TOKEN=""
HASS_TOKEN=""
HASS_URL=""
OPENWEATHER_API_KEY=""
```

## Design System

**Glassmorphism Theme (Tailwind v4):**
- Glass panels: `backdrop-blur-[24px]`, semi-transparent backgrounds
- Custom tokens: `--color-glass-bg`, `--color-glass-border`, `--blur-glass`
- Neon accents: Electric purple (`--color-neon-primary`), Cyber green (`--color-neon-accent`)
- All components use Shadcn/ui base + custom glass styling

## Common Patterns

### RxDB Query Hook
```typescript
import { useRxData } from 'rxdb-hooks';

const { result: prs } = useRxData('github_prs',
  q => q.find().where('status').eq('open')
);
```

### AI Button for Context-Aware Actions
```typescript
<AIButton
  context={{ repo: "q8-app", pr: 42 }}
  prompt="Summarize the changes in this PR"
/>
```

### Voice Interface (WebRTC)
```typescript
const { isConnected, isSpeaking, audioStream } = useRealtimeAgent();
```

## Success Criteria

1. **Instant UI:** Dashboard loads from RxDB in <100ms, even offline
2. **Intelligent Routing:** "Check my latest PR" → Claude 4.5 → GitHub MCP → accurate response
3. **Multi-Model Coordination:** Single user query can trigger multiple sub-agents transparently
4. **Voice Integration:** Natural conversation via WebRTC with GPT-5.1
5. **Unified Personality:** Despite 5 different models, user perceives one consistent "Q8" persona

## Phase Roadmap

- [ ] **Phase 1:** RxDB + Supabase sync foundation
- [ ] **Phase 2:** Glass/Bento UI system with Tailwind v4
- [ ] **Phase 3:** Agent swarm logic (Orchestrator + Sub-agents)
- [ ] **Phase 4:** MCP tool integrations (GitHub, Google, Spotify, etc.)
- [ ] **Phase 5:** Real-time voice (WebRTC) & RAG (pgvector)

## Notes

- Built as Turbo monorepo for scalability
- All MCP servers can run as microservices or imported directly (Node.js compatible)
- Use `framer-motion` for animations, `lucide-react` for icons
- Supabase Realtime enabled for live data sync
- pgvector extension for RAG/embeddings (1536 dimensions for GPT-4/5 embeddings)
