# Getting Started with Q8

## Welcome

This guide will help you get Q8 up and running on your local machine in less than 15 minutes.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **pnpm 9+** - Install with `npm install -g pnpm`
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com) (free)
- **API Keys** (at minimum, OpenAI for basic functionality)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/mlee0412/q8.git
cd q8
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies across the monorepo.

### 3. Set Up Environment Variables

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Edit `apps/web/.env.local` and add at minimum:

```env
# Required for basic functionality
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

**Getting API Keys:**
- **OpenAI:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Supabase:** Create project → Settings → API

### 4. Initialize Supabase

**Option A: Use Supabase Cloud (Recommended for beginners)**

1. Create a project at [supabase.com](https://supabase.com)
2. Run the schema SQL:
   ```bash
   # Copy the contents of infra/supabase/schema.sql
   # Paste into Supabase SQL Editor and run
   ```

**Option B: Use Local Supabase (Docker required)**

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Apply schema
supabase db reset
```

### 5. Start Development Server

```bash
pnpm dev
```

Visit http://localhost:3000 - you should see the Q8 dashboard!

## Verify Installation

### 1. Check TypeScript

```bash
pnpm turbo typecheck
```

Should output: `✓ No type errors found`

### 2. Check Build

```bash
pnpm turbo build --filter=@q8/web
```

Should complete successfully.

### 3. Test Database Connection

Open http://localhost:3000 and check browser console for:
```
[RxDB] Database initialized
[Sync] Connected to Supabase
```

## What's Next?

### Learn the Architecture

1. **Read [System Architecture](../architecture/system-architecture.md)**
   - Understand the local-first design
   - Learn about the agent swarm
   - See how MCP works

2. **Review [Agent Swarm](../architecture/agent-swarm.md)**
   - Understand the Orchestrator
   - Learn about specialist agents
   - See routing logic

### Start Developing

1. **Follow Development Protocols**
   - Read [Constitution & Protocols](../development/constitution-and-protocols.md)
   - Review [Backend Plan](../development/backend-development-plan.md)
   - Review [Frontend Plan](../development/frontend-development-plan.md)

2. **Use Claude Code**
   - See [CLAUDE.md](../../CLAUDE.md) for guidance
   - Run quality gates before committing
   - Follow the strict type safety rules

### Add Integrations

1. **Set Up Additional API Keys**
   ```env
   # For Dev Agent
   ANTHROPIC_API_KEY="sk-ant-..."
   GITHUB_PERSONAL_ACCESS_TOKEN="ghp_..."

   # For Research Agent
   PERPLEXITY_API_KEY="pplx-..."

   # For Secretary Agent
   GOOGLE_GENERATIVE_AI_KEY="AIza..."
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```

2. **Start MCP Servers**
   ```bash
   # Start GitHub MCP Server
   cd apps/mcp-servers/github
   pnpm install
   pnpm dev
   ```

## Common Issues

### Port Already in Use

If port 3000 is taken:
```bash
pnpm dev -- -p 3001
```

### RxDB Not Initializing

Clear browser storage:
1. Open DevTools (F12)
2. Application → Storage → Clear Site Data
3. Refresh page

### Supabase Connection Failed

Verify environment variables:
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Both should output values (not empty).

### TypeScript Errors

Regenerate Supabase types:
```bash
supabase gen types typescript --local > apps/web/src/lib/db/supabase-types.ts
```

## Development Workflow

### Making Changes

1. Create feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make changes

3. Run quality gates:
   ```bash
   pnpm turbo typecheck
   pnpm turbo build --filter=@q8/web
   ```

4. Commit and push:
   ```bash
   git add .
   git commit -m "feat: add my feature"
   git push origin feature/my-feature
   ```

### Testing

```bash
# Run all tests
pnpm turbo test

# Run specific test
pnpm test -- path/to/test.spec.ts

# Watch mode
pnpm test -- --watch
```

### Storybook (Component Development)

```bash
pnpm storybook
```

Visit http://localhost:6006

## Project Structure Overview

```
q8/
├── apps/
│   ├── web/              # Main Next.js app
│   └── mcp-servers/      # Tool integrations
├── packages/             # Shared code
├── infra/                # Infrastructure
└── docs/                 # You are here!
```

## Getting Help

1. **Documentation:** Check `docs/` for guides
2. **CLAUDE.md:** For Claude Code users
3. **SETUP.md:** Detailed setup instructions
4. **Issues:** GitHub issues for bugs

## Next Steps

Choose your path:

**🏗️ I want to understand the architecture:**
→ Read [System Architecture](../architecture/system-architecture.md)

**💻 I want to start coding:**
→ Review [Development Protocols](../development/constitution-and-protocols.md)

**🔧 I want to add integrations:**
→ See [Creating MCP Servers](./creating-mcp-servers.md)

**🎨 I want to customize the UI:**
→ Check [UI/UX Specifications](../specifications/ui-ux-specs.md)

**🚀 I want to deploy:**
→ Follow [Deployment Guide](./deployment.md)

Welcome to Q8! 🎉
