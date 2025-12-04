# **🚀 Q8: The Omni-Model Personal Assistant**

**Master Build Specification**

Version: 3.0.0 (Project: Q8)  
Core Philosophy: "Local Speed, Global Intelligence."  
Architecture: Local-First (RxDB) \+ Multi-Agent Swarm (LiteLLM) \+ Tool Protocol (MCP).  
Target Date: November 2025

## **1\. The Architecture: "The Hive"**

Q8 moves away from a single LLM loop to a **Federated Swarm Architecture**. The user speaks to an **Orchestrator**, which delegates tasks to specialized "Sub-Agents" running on the best models for the job (Gemini 3.0, Claude 4.5, Grok 4.1), all connected via a high-speed local data layer.

### **1.1 High-Level Data Flow**

graph TD  
    %% Frontend Layer (Local-First)  
    User((User)) \<--\>|WebRTC Audio| VoiceClient\[WebRTC Voice Client\]  
    User \<--\>|0ms Interaction| UI\[Glass Bento UI\]  
    UI \<--\>|Reactivity| RxDB\[(RxDB Local DB)\]  
      
    %% The "Brain" (Server-Side / Edge)  
    subgraph "The Intelligence Swarm (Next.js API)"  
        VoiceClient \--\>|Text/Audio| Orchestrator\[Orchestrator\<br/\>(GPT-5.1-Preview)\]  
          
        Orchestrator \--\>|Coding| DevAgent\[Dev Agent\<br/\>(Claude Sonnet 4.5)\]  
        Orchestrator \--\>|Search| ResearchAgent\[Research Agent\<br/\>(Perplexity Sonar Pro)\]  
        Orchestrator \--\>|Tasks| Secretary\[Secretary Agent\<br/\>(Gemini 3.0 Pro)\]  
        Orchestrator \--\>|Chat| Grok\[Personality Agent\<br/\>(Grok 4.1 Fast)\]  
    end  
      
    %% The "Hands" (MCP Tool Layer)  
    subgraph "Tool Protocol (MCP Servers)"  
        DevAgent \--\>|MCP| GitHub\[GitHub Integration\]  
        DevAgent \--\>|MCP| SupabaseTool\[Supabase Management\]  
        Secretary \--\>|MCP| GSuite\[Google Workspace\]  
        Secretary \--\>|MCP| Square\[Square Payments\]  
        Orchestrator \--\>|MCP| Spotify\[Spotify Control\]  
        Orchestrator \--\>|MCP| HA\[Home Assistant\]  
    end

    %% Synchronization  
    RxDB \<--\>|Replication| SupabaseDB\[(Supabase Postgres)\]  
    SupabaseDB \<--\>|Vector Search| RAG\[Knowledge Base\]

## **2\. The Tech Stack (Locked \- Nov 2025 Standards)**

### **Frontend (The "Glass Console")**

* **Framework:** **Next.js 16** (Stable) \- Using new use cache directives and Turbopack stable.  
* **Core:** **React 19.2** (Actions, Compiler, useOptimistic).  
* **State & Sync:** **RxDB** (IndexedDB wrapper).  
  * *Role:* The "Single Source of Truth" for the UI. Eliminates loading spinners.  
* **Styling:** **Tailwind CSS v4** \+ **Shadcn/ui** (Custom "Glass" Theme).  
* **Voice:** **OpenAI Realtime API** (WebRTC) via useRealtimeAgent hook.

### **Backend & AI (The "Swarm")**

* **Orchestration:** **OpenAI Agents SDK** (v2.0+).  
* **Model Gateway:** **LiteLLM** (Routes generic SDK calls to Anthropic, Google, Perplexity, xAI).  
* **Tooling:** **Model Context Protocol (MCP)**.  
* **Database:** **Supabase** (Postgres \+ Auth \+ pgvector).  
* **Infrastructure:** **Vercel** (Web/API) \+ **Railway** (Python MCP Servers if needed).

### **Target Models (Confirmed Availability)**

| Agent Role | Model ID | Provider | Capabilities |
| :---- | :---- | :---- | :---- |
| **Orchestrator** | gpt-5.1-preview | OpenAI | Routing, Voice, Reasoning |
| **Coding** | claude-3-5-sonnet-20241022 (or claude-sonnet-4.5 if access) | Anthropic | Long-context coding, Refactoring |
| **Secretary** | gemini-3.0-pro-preview | Google | 1M+ Context, Native GSuite RAG |
| **Research** | sonar-pro | Perplexity | Live Web Search, Factuality |
| **Personality** | grok-4.1-fast | xAI | Witty chat, "Fun" mode |

## **3\. Monorepo File Structure**

Designed for scalability and separation of concerns.

q8/  
├── apps/  
│   ├── web/                    \# Main Next.js 16 PWA  
│   │   ├── src/  
│   │   │   ├── app/            \# App Router (Dashboard, Chat, Settings)  
│   │   │   ├── components/     \# React 19 Components (BentoGrid, GlassCard)  
│   │   │   ├── hooks/          \# Local-first hooks (useRxQuery, useVoice)  
│   │   │   ├── lib/  
│   │   │   │   ├── agents/     \# The "Swarm" definitions (Orchestrator, Sub-agents)  
│   │   │   │   ├── rxdb/       \# Database schema & replication logic  
│   │   │   │   ├── mcp/        \# MCP Client to connect to tools  
│   │   │   │   └── webrtc/     \# Voice handling logic  
│   │   └── public/             \# Icons, sounds, manifests  
│   │  
│   └── mcp-servers/            \# Standalone MCP Servers (Microservices)  
│       ├── github/             \# GitHub tool logic  
│       ├── google/             \# Gmail/Calendar/Drive logic  
│       └── spotify/            \# Spotify logic  
│  
├── packages/  
│   ├── db-schema/              \# Shared JSON schemas for RxDB & Supabase  
│   ├── ui/                     \# Shared Design System (Tailwind config, Tokens)  
│   ├── ai-config/              \# Shared prompts & model configurations  
│   └── types/                  \# TypeScript interfaces (Agent, Tool, Event)  
│  
├── infra/  
│   ├── supabase/               \# SQL Migrations, RLS Policies, Vector setup  
│   └── docker/                 \# Local dev environment (HA Mock, MCP hosts)  
│  
└── turbo.json                  \# Build pipeline

## **4\. Development Roadmap & Implementation Details**

### **Phase 1: The Foundation (Week 1\)**

**Goal:** A local-first app that syncs data instantly.

1. **Scaffold:** Init Turbo repo with Next.js 16\.  
2. **Database (Supabase):**  
   * Enable pgvector.  
   * Create tables: devices, chats, memories, user\_preferences.  
3. **Local DB (RxDB):**  
   * Install rxdb \+ pouchdb-adapter-idb.  
   * Create replication.ts: Syncs local RxDB with Supabase Realtime.  
4. **Auth:** Implement Supabase Auth (SSR) and ensure RxDB encrypts data with the user's session key.

### **Phase 2: The "Bento" UI System (Week 2\)**

**Goal:** Visually stunning, customizable dashboard.

1. **Glass Theme:** Define Tailwind v4 variables (--glass-bg, \--glass-border, \--neon-accent).  
2. **BentoGrid:** Build a grid component using react-grid-layout or CSS Grid \+ framer-motion for drag-and-drop.  
3. **Smart Tiles:**  
   * *Standard:* 1x1 Icon Toggle.  
   * *Interactive:* 2x2 Spotify Player (Album art background).  
   * *Feed:* 2x4 Scrollable list (Gmail/GitHub notifications).  
   * *Developer:* 2x2 GitHub Status Tile (PRs/Builds).  
4. **AI Buttons:** Create a \<SparkleButton context={...} /\> component that floats over content to trigger context-aware actions.

### **Phase 3: The Agent Swarm (Week 3\)**

**Goal:** Multi-model intelligence.

1. **LiteLLM Config:** Set up lib/agents/model\_factory.ts to route:  
   * "coder" \-\> claude-sonnet-4.5 (Anthropic)  
   * "researcher" \-\> sonar-pro (Perplexity)  
   * "secretary" \-\> gemini-3.0-pro (Google)  
   * "personality" \-\> grok-4.1-fast (xAI)  
2. **Agents SDK:** Define the agents in lib/agents/\*.ts.  
   * *Orchestrator:* Has transfer\_to\_coder, transfer\_to\_researcher tools.  
3. **Handoff Logic:**  
   * User: "Fix the bug in my repo."  
   * Orchestrator: Calls transfer\_to\_coder.  
   * Dev Agent (Claude): Receives context, executes GitHub tools.

### **Phase 4: The Tool Layer (MCP) (Week 4\)**

**Goal:** Connect the agents to the real world.

1. **GitHub MCP:** Implement search\_issues, get\_file\_content, create\_pr, trigger\_workflow.  
2. **Google MCP:** Implement list\_emails (Gmail), calendar\_events (Cal), search\_drive (Drive), Youtube.  
3. **Supabase MCP:** Implement run\_sql, get\_schema.  
4. **Spotify/Square:** Implement standard REST wrappers exposed as MCP tools.  
5. **Context Injection:**  
   * On every request, inject: Current Time: {new Date()}, Location: {lat, long}, Weather: {temp} into the Orchestrator's system prompt.

### **Phase 5: Voice & Polish (Week 5\)**

**Goal:** "Jarvis-like" interaction.

1. **WebRTC:** Wire useRealtimeAgent to the frontend.  
2. **Audio Visualizer:** A canvas component drawing frequency bars in real-time.  
3. **Silent Relay:**  
   * Voice Input: "What's my next meeting?"  
   * Orchestrator (Silent): Calls Secretary Agent (Gemini).  
   * Secretary (Silent): Calls Google Calendar MCP \-\> Returns "Meeting with Team at 2 PM".  
   * Orchestrator (Voice): Speaks "You have a meeting with the team at 2 PM."

## **5\. Logic & Wiring**

### **A. The "Orchestrator" Routing Logic**

The Orchestrator is the *only* agent the user speaks to directly.

// src/lib/agents/orchestrator.ts  
const orchestrator \= new Agent({  
  name: "Q8",  
  model: "gpt-5.1-preview", // Best for routing/reasoning  
  instructions: \`  
    You are Q8, a hyper-intelligent personal assistant.  
      
    Your Goal: Route user requests to the specialist best suited for the task.  
    \- Coding/GitHub/Supabase \-\> Transfer to Dev Agent (Claude Sonnet 4.5).  
    \- Search/Facts \-\> Transfer to Research Agent (Perplexity Sonar Pro).  
    \- Email/Calendar/Docs \-\> Transfer to Secretary (Gemini 3.0 Pro).  
    \- Home Control \-\> Transfer to Home Agent.  
    \- Casual Chat \-\> Transfer to Personality Agent (Grok 4.1).  
      
    Always maintain the persona of a helpful, witty assistant.  
    When a sub-agent returns an answer, synthesize it and speak it back naturally.  
  \`,  
  handoffs: \[devAgent, researchAgent, secretaryAgent, homeAgent, personalityAgent\]  
});

### **B. The "AI Button" Logic**

The AI Button is a bridge between the UI and the Agent.

// src/components/AIButton.tsx  
export const AIButton \= ({ context, prompt }) \=\> {  
  const { sendMessage } \= useUnifiedChat();  
    
  return (  
    \<button onClick={() \=\> sendMessage(prompt, { context })}\>  
      \<SparklesIcon className="text-neon-blue animate-pulse" /\>  
    \</button\>  
  );  
};

// Usage in GitHub Tile  
\<AIButton   
  context={{ repo: "q8-app", pr: 42 }}   
  prompt="Summarize the changes in this PR"   
/\>

## **6\. Environment Variables (Secrets)**

You will need to populate .env.local with these keys before starting.

### **AI Providers (The Brains)**

OPENAI\_API\_KEY="sk-..."               \# GPT-5.1 & Voice  
ANTHROPIC\_API\_KEY="sk-ant-..."        \# Claude 4.5 (Dev Agent)  
GOOGLE\_GENERATIVE\_AI\_KEY="AIza..."    \# Gemini 3.0 (Secretary)  
PERPLEXITY\_API\_KEY="pplx-..."         \# Sonar Pro (Research)  
XAI\_API\_KEY="xai-..."                 \# Grok 4.1 (Chat)

### **Infrastructure**

NEXT\_PUBLIC\_SUPABASE\_URL="https://..."  
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY="eyJ..."  
SUPABASE\_SERVICE\_ROLE\_KEY="eyJ..."    \# For MCP Server Access  
SUPABASE\_ACCESS\_TOKEN="sbp\_..."       \# For managing Supabase via MCP  
SUPABASE\_PROJECT\_ID="..."

### **Tool Integrations**

\# Google (Gmail, Drive, Calendar, YouTube)  
GOOGLE\_CLIENT\_ID="..."  
GOOGLE\_CLIENT\_SECRET="..."  
GOOGLE\_REDIRECT\_URI="http://localhost:3000/api/auth/callback/google"

\# GitHub (Dev Tools)  
GITHUB\_PERSONAL\_ACCESS\_TOKEN="ghp\_..." \# Repo, Workflow, User scopes

\# Spotify (Music)  
SPOTIFY\_CLIENT\_ID="..."  
SPOTIFY\_CLIENT\_SECRET="..."

\# Square (Payments)  
SQUARE\_ACCESS\_TOKEN="..."

\# Home Assistant (IoT)  
HASS\_TOKEN="..."  
HASS\_URL="\[https://ha.my-domain.com\](https://ha.my-domain.com)"

\# Weather  
OPENWEATHER\_API\_KEY="..."

## **7\. Success Criteria Checklist**

1. **Speed:** The dashboard loads instantly (from RxDB) even in Airplane mode.  
2. **Dev Intelligence:** Asking "Check my latest PR on the Q8 repo and tell me if the tests passed" triggers **Claude Sonnet 4.5**, uses **GitHub MCP**, and reports back accurately.  
3. **Deep Search:** Asking "Find the best sushi restaurants in Tokyo with availability tonight and add to my spreadsheet" uses **Perplexity Sonar Pro** (Search) and **Gemini 3.0** (Spreadsheet).  
4. **Knowledge:** Asking "Where is the PDF I uploaded last week?" uses **Supabase Vector Search** to find the file.  
5. **Voice:** Speaking "Play my 'Focus' playlist" triggers **Spotify** instantly via the Orchestrator.  
6. **Unified Identity:** Despite using 5 different AI models, the user perceives **one** consistent personality ("Q8").