# **🚀 Q8: The Omni-Model Personal Assistant**

**Local-First. Multi-Model. Flawless.**  
Q8 is a state-of-the-art personal assistant dashboard that combines zero-latency local interaction with a federated swarm of specialized AI agents. It orchestrates the world's best models (GPT-5.1, Claude 3.5, Gemini 3.0, Perplexity) to handle coding, research, and life management seamlessly.

## **🚀 Core Philosophy**

* **Zero Latency:** The UI is "Local-First" (RxDB). Interactions happen instantly; sync happens in the background.  
* **The Swarm:** One assistant, many brains. A central orchestrator routes tasks to specialized sub-agents (Coder, Researcher, Secretary).  
* **Unified Tools:** Everything connects via the **Model Context Protocol (MCP)**—from GitHub and Supabase to Spotify and Home Assistant.

## **🏗️ Architecture**

graph TD  
    User \--\>|WebRTC Voice| Orchestrator\[GPT-5.1 Orchestrator\]  
    User \--\>|Instant UI| Dashboard\[Next.js 15 Glass UI\]  
      
    subgraph "The Swarm"  
        Orchestrator \--\>|Code| Coder\[Claude 3.5 Sonnet\]  
        Orchestrator \--\>|Search| Researcher\[Perplexity Sonar\]  
        Orchestrator \--\>|Docs| Secretary\[Gemini 3.0 Pro\]  
    end  
      
    subgraph "Tool Layer (MCP)"  
        Coder \--\> GitHub  
        Coder \--\> Supabase  
        Researcher \--\> WebSearch  
        Secretary \--\> GSuite  
    end

## **🛠️ Tech Stack**

* **Frontend:** Next.js 15.5 (App Router), React 19, Tailwind v4  
* **State:** RxDB (IndexedDB/OPFS), TanStack Query  
* **AI:** OpenAI Agents SDK, LiteLLM, OpenAI Realtime API (WebRTC)  
* **Backend:** Supabase (Postgres \+ pgvector), Edge Functions  
* **Protocol:** Model Context Protocol (MCP)

## **⚡ Getting Started**

### **Prerequisites**

* Node.js 20+  
* pnpm  
* Docker (optional, for local MCP servers)

### **Installation**

1. **Clone the repository:**  
   git clone https://github.com/mlee0412/q8.git  
   cd q8

2. **Install dependencies:**  
   pnpm install

3. Set up Environment:  
   Copy .env.local.example to .env.local and populate your API keys.  
   cp apps/web/.env.local.example apps/web/.env.local

4. **Start Development Server:**  
   pnpm dev

## **📜 Developer Constitution**

This project follows strict development protocols defined in [CLAUDE\_CONSTITUTION.md](https://www.google.com/search?q=CLAUDE_CONSTITUTION.md).

* **Local-First Truth:** UI never waits for the server.  
* **Strict Types:** No any.  
* **Documentation First:** Verify latest APIs before implementation.

## **🗺️ Roadmap**

* \[ \] **Phase 1:** Foundation (RxDB \+ Supabase Sync)  
* \[ \] **Phase 2:** Glass/Bento UI System  
* \[ \] **Phase 3:** Agent Swarm Logic  
* \[ \] **Phase 4:** MCP Tool Integrations  
* \[ \] **Phase 5:** Real-Time Voice & RAG

*Built with the assistance of Claude 3.5 Sonnet & OpenAI o1.*