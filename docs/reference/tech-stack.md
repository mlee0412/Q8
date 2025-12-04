# Q8 Technology Stack

## Frontend

### Core Framework
- **Next.js 15.5/16** - React framework with App Router
- **React 19.2** - UI library with Server Components
- **TypeScript 5.4+** - Type-safe JavaScript

### Styling
- **Tailwind CSS v4** - Utility-first CSS framework
- **Framer Motion 11** - Animation library
- **Shadcn/ui** - Component library (with customizations)

### State Management
- **RxDB 15.24+** - Reactive local database
- **rxdb-hooks 5.0+** - React hooks for RxDB
- **TanStack Query** - Server state management

### UI Components
- **Lucide React** - Icon library
- **class-variance-authority** - Component variants
- **tailwind-merge** - Tailwind class merging
- **next-themes** - Theme management

## Backend & AI

### Agent Framework
- **OpenAI Agents SDK 2.0+** - Multi-agent orchestration
- **LiteLLM** - Multi-provider AI routing
- **OpenAI API** - GPT-5.1 for orchestrator

### AI Models
| Agent | Provider | Model | Version |
|-------|----------|-------|---------|
| Orchestrator | OpenAI | GPT-5.1-Preview | Latest |
| Dev Agent | Anthropic | Claude Sonnet 4.5 | Latest |
| Research Agent | Perplexity | Sonar Pro | Latest |
| Secretary Agent | Google | Gemini 3.0 Pro | Preview |
| Personality Agent | xAI | Grok 4.1 Fast | Latest |
| Home Agent | OpenAI | GPT-4 Turbo | Latest |

### Database
- **Supabase** - Backend-as-a-Service
- **PostgreSQL 15+** - Relational database
- **pgvector** - Vector similarity search extension

### Tool Protocol
- **Model Context Protocol (MCP) 0.5+** - Tool integration standard
- **Express.js 4.18+** - HTTP server for MCP servers

## Development Tools

### Monorepo
- **Turbo 2.0** - Build system
- **pnpm 9.1+** - Package manager
- **pnpm workspaces** - Monorepo management

### Code Quality
- **ESLint** - JavaScript linting
- **Prettier 3.2+** - Code formatting
- **TypeScript Compiler** - Type checking

### Testing
- **Vitest 1.2+** - Unit testing
- **@testing-library/react** - React component testing
- **Playwright** - E2E testing (optional)

### Development
- **tsx 4.7+** - TypeScript execution
- **Storybook 7.6+** - Component development

## Infrastructure

### Hosting
- **Vercel** - Next.js deployment (recommended)
- **Railway** - MCP server hosting (optional)
- **Supabase Cloud** - Database and auth

### CI/CD
- **GitHub Actions** - Automated workflows
- **Vercel Preview Deployments** - PR previews

### Monitoring
- **Vercel Analytics** - Web analytics
- **Sentry** - Error tracking (optional)
- **Supabase Logs** - Database monitoring

## External Services

### AI Providers
- **OpenAI** - GPT models and embeddings
- **Anthropic** - Claude models
- **Google AI** - Gemini models
- **Perplexity** - Search models
- **xAI** - Grok models

### Integrations
- **GitHub API** - Repository management
- **Google Workspace APIs** - Gmail, Calendar, Drive
- **Spotify API** - Music control
- **Square API** - Payment processing (optional)
- **Home Assistant API** - Smart home control (optional)

## Development Dependencies

### MCP Servers
- **@octokit/rest** - GitHub API client
- **googleapis** - Google APIs client
- **node-fetch** - HTTP client
- **dotenv** - Environment variables

### Database Tools
- **Supabase CLI** - Local development
- **pouchdb-adapter-idb** - RxDB IndexedDB adapter

## Version Requirements

### Minimum Versions
- Node.js: 20.0.0+
- pnpm: 9.0.0+
- TypeScript: 5.4.0+

### Browser Support
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions

### Platform Support
- macOS: 11+
- Windows: 10/11
- Linux: Modern distributions

## Package Versions Lock

### Core (Fixed)
```json
{
  "next": "^15.0.3",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "^5.4.5"
}
```

### Database (Fixed)
```json
{
  "rxdb": "^15.24.0",
  "@supabase/supabase-js": "^2.39.0"
}
```

### AI (Latest)
```json
{
  "openai": "^4.28.0",
  "ai": "^3.0.0"
}
```

## Recommended VS Code Extensions

- **ESLint** - dbaeumer.vscode-eslint
- **Prettier** - esbenp.prettier-vscode
- **Tailwind CSS IntelliSense** - bradlc.vscode-tailwindcss
- **TypeScript Error Translator** - mattpocock.ts-error-translator
- **Better Comments** - aaron-bond.better-comments

## Performance Benchmarks

### Build Times (Target)
- Development server start: <5 seconds
- Production build: <2 minutes
- Type check: <30 seconds

### Runtime Performance (Target)
- First Contentful Paint: <1.5s
- Time to Interactive: <3.5s
- RxDB query: <100ms
- Agent response (GPT-5.1): 1-3s
- Agent response (Claude): 2-5s

## Cost Estimates (Monthly)

### Free Tier
- Vercel: Free for personal projects
- Supabase: 500MB database, 2GB bandwidth
- GitHub Actions: 2,000 minutes

### Estimated AI Costs (Per 1000 users)
- GPT-5.1: ~$100-200
- Claude Sonnet: ~$150-300
- Gemini 3.0: ~$50-100
- Perplexity: ~$75-150
- Grok: ~$50-100

Total estimated: $425-850/month for 1000 active users

## Security

### Authentication
- Supabase Auth (JWT-based)
- OAuth 2.0 for Google/GitHub
- Session-based encryption for RxDB

### Data Protection
- HTTPS everywhere
- Row Level Security (RLS)
- API key encryption
- Client-side encryption for sensitive data

## Compliance

### Data Privacy
- GDPR compliant (with proper configuration)
- User data isolation via RLS
- Right to deletion support

### Accessibility
- WCAG 2.1 AA target
- Semantic HTML
- Keyboard navigation
- Screen reader support

## Upgrade Path

### Regular Updates
- Monthly: Minor version updates
- Quarterly: Feature updates
- Yearly: Major version migrations

### Breaking Changes
- Migration guides for major updates
- Backwards compatibility for 1 version
- Deprecation warnings 2 versions ahead
