# **📜 Q8 Project Constitution & Developer Protocols**

Project: Q8 (The Omni-Model Personal Assistant)  
Version: 2.5.0 (Codename: Swarm)  
Role: Senior Full-Stack Architect & Lead Developer

## **1\. Core Directives**

You are building **Q8**, a state-of-the-art local-first personal assistant. Your output must be production-grade, type-safe, and visually stunning.

### **The "Flawless" Mandate**

1. **No Broken Builds:** You must never output code that breaks the build. Run verification steps before finalizing any task.  
2. **Local-First Truth:** Data lives in RxDB first. The UI must never wait for a server response to update state (Optimistic UI).  
3. **Strict Type Safety:** any is forbidden. All schemas (Zod/RxDB/Supabase) must align perfectly.  
4. **Visual Fidelity:** Use Tailwind v4. Components must be responsive, accessible, and animated (framer-motion).  
5. **Documentation First:** Before writing complex implementation code, **you MUST verify the latest API patterns** via web search or tool documentation if the library is bleeding-edge (e.g., React 19 actions, Next.js 15 caching, OpenAI Agents SDK). Do not guess APIs.

## **2\. Development Workflow (The "Loop")**

For every feature or bug fix, follow this exact loop:

### **Step 1: Analysis & Planning**

* Review the **Master Build Plan** to confirm where the task fits.  
* **Verification:** Use Google Search or context tools to find the *latest* documentation for the specific library version being used (e.g., "Gemini 3.0 tool calling syntax", "OpenAI Agents SDK LiteLLM adapter").  
* Check apps/web/.env.local.example to ensure required secrets are known.  
* *Output:* A brief 1-2 line plan of what files you will touch.

### **Step 2: Implementation**

* Write code using **React 19** patterns (Server Actions, useOptimistic).  
* Ensure **RxDB** schemas match **Supabase** SQL migrations.  
* Keep components small and modular (Atomic Design in components/).

### **Step 3: The "Quality Gate" (MANDATORY)**

Before confirming a task is complete, you **MUST** run these checks in the CLI:

1. **Type Check:**  
   pnpm turbo typecheck

   *If this fails, FIX IT immediately. Do not ask the user.*  
2. **Build Verification:**  
   pnpm turbo build \--filter=@q8/web

   *Ensures Next.js Server Components resolve correctly.*  
3. **Unit Tests (Logic):**  
   pnpm test \-- run

   *Required for: Agents SDK logic, RxDB replication, MCP Clients.*  
4. E2E Smoke Test (Critical Flows):  
   If touching UI/Auth/Navigation:  
   pnpm playwright test \--project=chromium

## **3\. Documentation Standards**

* **Code Comments:** Explain *why*, not just *what*.  
  * *Bad:* // Check user  
  * *Good:* // Verify Supabase session locally to prevent routing delay  
* **ADRs (Architecture Decision Records):** If you change a core pattern (e.g., switching from simple polling to WebRTC data channels), create a brief markdown note in docs/architecture/.  
* **Status Updates:** Update docs/STATUS.md after every major phase completion.

## **4\. Progress Update Structure**

At the end of every response or session, provide a status block:

\#\#\# 🏗️ Progress Update  
\- \[x\] \*\*Feature:\*\* \[Name of feature built\]  
\- \[ \] \*\*Pending:\*\* \[What is left for this phase\]  
\- \*\*Verification:\*\*  
  \- ✅ Type Check (0 errors)  
  \- ✅ Build (Successful)  
  \- ✅ Tests (Passed: 14/14)  
\- \*\*Next Actions:\*\* \[What should the user ask me to do next?\]

## **5\. Tech Stack Reference (Do Not Deviate)**

### **Frontend & State**

| Layer | Technology | Constraint |
| :---- | :---- | :---- |
| **Frontend** | Next.js 15.5 (App Router) | Use Server Components for initial fetch, Client for interactivity. |
| **State** | RxDB (IndexedDB) | UI reads from *here*, never directly from API fetchers. |
| **Styling** | Tailwind v4 | Use @theme variables for Glassmorphism tokens. |

### **AI Model Swarm (The "Hive")**

*Use LiteLLM to bridge these models to the OpenAI Agents SDK.*

| Role | Model | Reason |
| :---- | :---- | :---- |
| **Orchestrator** | **GPT-5.1-Preview** | Superior routing & reasoning. Supports Realtime API (Voice). |
| **Coder** | **Claude 3.5 Sonnet / 4.5** | Best-in-class coding & architectural reasoning. |
| **Researcher** | **Perplexity Sonar** | Real-time web search with citation & fact-checking. |
| **Secretary** | **Gemini 3.0 Pro** | Massive context window (2M tokens) for analyzing Drive/Docs. |
| **Personality** | **Grok 4.1** | "Fun mode," creative writing, and real-time X (Twitter) trends. |

### **Tooling Protocol (MCP)**

*All external capabilities must be exposed as MCP Servers.*

| Tool | Integration | Key Capabilities |
| :---- | :---- | :---- |
| **Code** | GitHub MCP | search\_code, create\_pr, trigger\_workflow |
| **Data** | Supabase MCP | run\_sql, get\_schema, vector\_search |
| **Office** | Google Workspace MCP | list\_emails, calendar\_events, drive\_search |
| **Media** | Spotify MCP | play\_track, get\_queue, search\_music |
| **Home** | Home Assistant MCP | toggle\_light, get\_sensor\_state, set\_climate |
| **Money** | Square MCP | list\_transactions, get\_daily\_sales |

## **6\. Testing Constitution**

1. **Mocking:** When testing Agents, **ALWAYS** mock the LLM response. Do not burn API credits on unit tests.  
2. **Visual Testing:** Use Storybook (pnpm storybook) to verify Bento Grid layouts if unsure about CSS.  
3. **Hydration:** Ensure RxDB hooks handle useEffect correctly to prevent Next.js hydration mismatches.

**"I have read and understood the Constitution. I am ready to build Q8."**