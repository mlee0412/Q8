# AGENTS.md

This file guides agentic coding assistants working in this repository.
It summarizes how to build/test, and how to follow the project’s code style.

## Repository Overview

- Monorepo managed by Turborepo + pnpm workspaces.
- Primary app: `apps/web` (Next.js App Router, React 19).
- Shared packages: `packages/db-schema`, `packages/types`.
- MCP microservices: `apps/mcp-servers/*`.
- Local-first UI: RxDB is the UI source of truth.

## Environment Prerequisites

- Node.js >= 20
- pnpm >= 9
- Copy env: `cp apps/web/.env.local.example apps/web/.env.local`

## Core Commands (Root)

- Dev (all apps): `pnpm dev`
- Build (all): `pnpm build`
- Typecheck (all): `pnpm typecheck`
- Lint (all): `pnpm lint`
- Test (all): `pnpm test`
- Format (prettier): `pnpm format`
- Storybook: `pnpm storybook`

## Web App Commands (`@q8/web`)

- Dev: `pnpm --filter @q8/web dev`
- Build: `pnpm --filter @q8/web build`
- Start (prod): `pnpm --filter @q8/web start`
- Lint: `pnpm --filter @q8/web lint`
- Typecheck: `pnpm --filter @q8/web typecheck`
- Tests (Vitest): `pnpm --filter @q8/web test`
- Watch tests: `pnpm --filter @q8/web test:watch`
- Storybook: `pnpm --filter @q8/web storybook`

## Single Test Examples

- Vitest single file:
  - `pnpm --filter @q8/web test -- path/to/test.spec.ts`
- Vitest single test by name:
  - `pnpm --filter @q8/web test -- -t "test name"`
- Turbo single package build/test:
  - `pnpm turbo build --filter=@q8/web`
  - `pnpm turbo test --filter=@q8/web -- path/to/test.spec.ts`

## MCP Servers (examples)

- GitHub MCP dev: `pnpm --filter @q8/mcp-github dev`
- GitHub MCP build: `pnpm --filter @q8/mcp-github build`

## Required Quality Gates (from CLAUDE.md)

Run these before declaring work complete:

1. `pnpm turbo typecheck`
2. `pnpm turbo build --filter=@q8/web`
3. `pnpm test -- run`
4. `pnpm playwright test --project=chromium`

## Code Style: TypeScript & React

- Use TypeScript strict mode; avoid `any` entirely.
- Prefer `import type { ... }` for type-only imports.
- Use semicolons and single quotes.
- Use 2-space indentation.
- Prefer named exports; default exports only for Next.js page/layout where idiomatic.
- Keep functions small and pure; avoid side effects in render.
- Use React hooks naming: `useXyz` and store in `src/hooks/`.
- For client components, add `'use client'` at the top only when needed.

## Imports & Module Boundaries

- Order imports: external libs → internal `@/` aliases → relative paths.
- Use `@/` aliases for web app paths (configured in `apps/web/tsconfig.json`).
- Avoid deep relative paths like `../../..` in `apps/web`.

## Naming Conventions

- Components: `PascalCase` file names + exported component.
- Hooks: `useCamelCase`.
- Utilities: `camelCase` functions, `kebab-case` file names if shared utils.
- Types/interfaces: `PascalCase` with meaningful suffix (`Config`, `State`, `Payload`).

## Error Handling & Logging

- Use `try/catch` around async boundaries (API routes, agent calls, IO).
- Log errors with context (feature + action), then return a typed response.
- Do not swallow errors silently; surface user-safe messages.

## Data & State Architecture

- UI reads from RxDB; do not query Supabase directly in components.
- Use optimistic UI patterns (`useOptimistic`) for instant updates.
- Sync logic lives in `apps/web/src/lib/sync/` (`pull.ts`, `push.ts`).
- RxDB schemas in `apps/web/src/lib/db/` must align with Supabase SQL.

## Next.js & API Routes

- API routes live under `apps/web/src/app/api/*/route.ts`.
- Use typed request/response payloads and Zod where applicable.
- Avoid using Node-only APIs in edge runtimes unless configured.

## Testing Guidelines

- Mock LLM responses in tests (no real API calls).
- Prefer Vitest for unit tests; add tests only where patterns exist.
- Use Playwright only for UI/Auth/Navigation changes.

## Formatting

- Prettier is the standard formatter; run `pnpm format`.
- Keep JSX props aligned and readable; avoid overly long lines.

## Security & Secrets

- Never commit `.env` or secrets.
- Any new environment variables must be documented in `apps/web/.env.local.example`.

## Documentation & Comments

- Prefer self-documenting code over inline comments.
- Only add inline comments for non-obvious business logic.

## Cursor/Copilot Rules

- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` found.

## Notes for Agents

- Follow the Local-First architecture rules in CLAUDE.md.
- Keep changes minimal and scoped to the task.
- Run the quality gates when work is complete.
