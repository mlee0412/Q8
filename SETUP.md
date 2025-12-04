# Q8 Setup Guide

Complete setup instructions for the Q8 Omni-Model Personal Assistant.

## Prerequisites

- **Node.js** 20+ and **pnpm** 9+
- **Docker** (optional, for local MCP servers)
- **Supabase** account and project
- API keys for AI providers (OpenAI, Anthropic, Google, Perplexity, xAI)

## Initial Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Configuration

Copy the environment template and fill in your API keys:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Edit `apps/web/.env.local` and add your keys:

```env
# AI Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_GENERATIVE_AI_KEY="AIza..."
PERPLEXITY_API_KEY="pplx-..."
XAI_API_KEY="xai-..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Integrations
GITHUB_PERSONAL_ACCESS_TOKEN="ghp_..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
SPOTIFY_CLIENT_ID="..."
SPOTIFY_CLIENT_SECRET="..."
```

### 3. Supabase Setup

#### Local Development

```bash
# Start Supabase locally
supabase start

# Apply schema
supabase db reset

# Generate types
supabase gen types typescript --local > apps/web/src/lib/db/supabase-types.ts
```

#### Production

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Generate types
supabase gen types typescript --linked > apps/web/src/lib/db/supabase-types.ts
```

### 4. Start Development

```bash
# Start the Next.js app
pnpm dev
```

The app will be available at http://localhost:3000

## MCP Servers (Optional)

### Local Development (without Docker)

Start each MCP server individually:

```bash
# Terminal 1: GitHub MCP
cd apps/mcp-servers/github
pnpm install
pnpm dev

# Terminal 2: Google MCP
cd apps/mcp-servers/google
pnpm install
pnpm dev

# Terminal 3: Spotify MCP
cd apps/mcp-servers/spotify
pnpm install
pnpm dev
```

### With Docker

```bash
cd infra/docker
docker-compose up -d
```

## Verification

### 1. Check Build

```bash
pnpm turbo build
```

Should complete without errors.

### 2. Type Check

```bash
pnpm turbo typecheck
```

Should show 0 type errors.

### 3. Test Database Connection

Visit http://localhost:3000 and check the browser console for database initialization logs.

## Next Steps

1. **Phase 1**: Verify RxDB + Supabase sync is working
2. **Phase 2**: Customize the Bento Grid dashboard layout
3. **Phase 3**: Connect the agent swarm with OpenAI Agents SDK
4. **Phase 4**: Implement MCP tool integrations
5. **Phase 5**: Add voice interface with WebRTC

## Troubleshooting

### Database Issues

If RxDB fails to initialize:
```bash
# Clear browser storage
# Open DevTools → Application → Clear Storage
```

### Type Errors

```bash
# Regenerate Supabase types
supabase gen types typescript --local > apps/web/src/lib/db/supabase-types.ts

# Rebuild
pnpm turbo typecheck
```

### MCP Server Connection

Check MCP servers are running:
```bash
curl http://localhost:3001/tools  # GitHub
curl http://localhost:3002/tools  # Google
curl http://localhost:3003/tools  # Spotify
```

## Development Workflow

1. Make changes to code
2. Run `pnpm turbo typecheck` before committing
3. Run `pnpm turbo build` to verify production build
4. Create feature branch: `git checkout -b feature/your-feature`
5. Commit and push: `git push origin feature/your-feature`

## Resources

- [Next.js 15 Docs](https://nextjs.org/docs)
- [RxDB Documentation](https://rxdb.info/)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI Agents SDK](https://github.com/openai/swarm)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## Support

See [CLAUDE.md](./CLAUDE.md) for detailed development guidelines and architecture documentation.
