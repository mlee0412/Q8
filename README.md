# 🚀 Q8: The Omni-Model Personal Assistant

**Local-First. Multi-Model. Flawless.**

Q8 is a state-of-the-art personal assistant dashboard that combines zero-latency local interaction with a federated swarm of specialized AI agents. It orchestrates the world's best models (GPT-5.1, Claude 3.5, Gemini 3.0, Perplexity) to handle coding, research, and life management seamlessly.

## 🚀 Core Philosophy

- **Zero Latency:** The UI is "Local-First" (RxDB). Interactions happen instantly; sync happens in the background.
- **The Swarm:** One assistant, many brains. A central orchestrator routes tasks to specialized sub-agents (Coder, Researcher, Secretary).
- **Unified Tools:** Everything connects via the **Model Context Protocol (MCP)**—from GitHub and Supabase to Spotify and Home Assistant.

## 🛠️ Tech Stack

- **Frontend:** Next.js 15.5 (App Router), React 19, Tailwind v4
- **State:** RxDB (IndexedDB/OPFS), TanStack Query
- **AI:** OpenAI Agents SDK, LiteLLM, OpenAI Realtime API (WebRTC)
- **Backend:** Supabase (Postgres + pgvector), Edge Functions
- **Protocol:** Model Context Protocol (MCP)

## ⚡ Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (optional, for local MCP servers)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mlee0412/q8.git
   cd q8
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up Environment:**
   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   # Edit .env.local and add your API keys
   ```

4. **Start Development Server:**
   ```bash
   pnpm dev
   ```

## 📜 Developer Guide

See [CLAUDE.md](./CLAUDE.md) for comprehensive development guidelines and architecture documentation.

## 🗺️ Roadmap

- [ ] **Phase 1:** Foundation (RxDB + Supabase Sync)
- [ ] **Phase 2:** Glass/Bento UI System
- [ ] **Phase 3:** Agent Swarm Logic
- [ ] **Phase 4:** MCP Tool Integrations
- [ ] **Phase 5:** Real-Time Voice & RAG

*Built with the assistance of Claude 3.5 Sonnet & OpenAI o1.*
