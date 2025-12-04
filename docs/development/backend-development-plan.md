# **Q8 Backend Development Plan (The "Swarm Brain")**

**Focus:** Multi-Agent Orchestration (LiteLLM), MCP Tooling, and Data Sync.

## **1\. Directory Structure (apps/web/src/lib)**

apps/web/src/lib/  
├── agents/                  \# The "Swarm" Configuration  
│   ├── index.ts             \# Orchestrator Entry Point (GPT-5.1)  
│   ├── sub-agents/  
│   │   ├── coder.ts         \# Claude Sonnet 4.5 Agent  
│   │   ├── researcher.ts    \# Perplexity Sonar Pro Agent  
│   │   ├── secretary.ts     \# Gemini 3.0 Pro Agent  
│   │   ├── personality.ts   \# Grok 4.1 Agent  
│   │   └── home.ts          \# IoT Agent  
│   └── model\_factory.ts     \# LiteLLM Adapter  
│  
├── mcp/                     \# MCP Client Logic  
│   ├── client.ts            \# Connects to MCP Servers  
│   └── tools/               \# Auto-generated tool definitions  
│  
├── db/  
│   ├── supabase.ts          \# Server-side Supabase Admin  
│   └── vector.ts            \# RAG Logic (Embeddings)  
│  
└── sync/                    \# Replication Logic  
    ├── pull.ts              \# Fetch changes from Supabase  
    └── push.ts              \# Push local changes to Supabase

## **2\. The Agent Swarm Implementation**

### **A. Model Factory (LiteLLM Adapter)**

This creates the correct model instance for each agent using the OpenAI SDK's interface, bridging to specialized models.

// lib/agents/model\_factory.ts  
import { OpenAIChatModel } from 'ai-agents-sdk'; 

export function getModel(agentType: 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality') {  
  switch (agentType) {  
    case 'orchestrator':  
      return new OpenAIChatModel({ model: 'gpt-5.1-preview' });  
    case 'coder':  
      // Routes to Anthropic via LiteLLM  
      return new OpenAIChatModel({   
        model: 'claude-sonnet-4.5',   
        baseURL: '\[https://api.anthropic.com/v1\](https://api.anthropic.com/v1)'   
      });  
    case 'researcher':  
      // Routes to Perplexity via LiteLLM  
      return new OpenAIChatModel({   
        model: 'sonar-pro',  
        baseURL: '\[https://api.perplexity.ai\](https://api.perplexity.ai)'  
      });  
    case 'secretary':  
       // Routes to Google via LiteLLM  
      return new OpenAIChatModel({  
         model: 'gemini-3.0-pro-preview',  
         baseURL: '\[https://generativelanguage.googleapis.com/v1beta/openai\](https://generativelanguage.googleapis.com/v1beta/openai)'  
      });  
    case 'personality':  
      // Routes to xAI via LiteLLM  
      return new OpenAIChatModel({  
         model: 'grok-4.1-fast',  
         baseURL: '\[https://api.x.ai/v1\](https://api.x.ai/v1)'  
      });  
  }  
}

### **B. Orchestrator Definition**

The main router that handles the user conversation.

// lib/agents/index.ts  
import { Agent } from '@openai/agents';  
import { coderAgent } from './sub-agents/coder';  
import { researcherAgent } from './sub-agents/researcher';  
import { secretaryAgent } from './sub-agents/secretary';  
import { personalityAgent } from './sub-agents/personality';

export const orchestrator \= new Agent({  
  name: "Q8",  
  model: getModel('orchestrator'),  
  instructions: \`  
    You are Q8, the user's primary assistant.  
    Your job is to route tasks to your sub-agents.  
      
    \- If code/dev task: Call 'transfer\_to\_coder'.  
    \- If search/fact task: Call 'transfer\_to\_researcher'.  
    \- If personal/calendar/docs task: Call 'transfer\_to\_secretary'.  
    \- If casual chat: Call 'transfer\_to\_personality'.  
      
    Do not attempt to solve these tasks yourself. Route them immediately.  
  \`,  
  handoffs: \[coderAgent, researcherAgent, secretaryAgent, personalityAgent\]  
});

## **3\. MCP Tool Integration (Server-Side)**

We will run MCP servers as "Micro-services" or import them directly if they are Node.js compatible.

### **A. GitHub MCP Integration**

We'll wrap the standard GitHub MCP server tools for the Coder agent.

// lib/agents/sub-agents/coder.ts  
import { Agent } from '@openai/agents';  
import { GitHubMCPClient } from '@/lib/mcp/github';

const githubTools \= await GitHubMCPClient.getTools();   
// Returns: \[{ name: 'create\_issue', ... }, { name: 'get\_pr', ... }\]

export const coderAgent \= new Agent({  
  name: "DevBot",  
  model: getModel('coder'), // Claude Sonnet 4.5  
  instructions: "You are an expert software engineer. Use GitHub tools to manage the repo.",  
  tools: githubTools  
});

## **4\. Data Synchronization (The Sync Engine)**

This is the bridge between the Local RxDB and the Postgres Backend.

### **A. Supabase Schema (infra/supabase/schema.sql)**

\-- Standard Tables  
create table devices (  
  id text primary key,  
  name text,  
  state text,  
  attributes jsonb,  
  updated\_at timestamptz default now()  
);

\-- Vector Store for RAG  
create extension vector;  
create table knowledge\_base (  
  id uuid primary key default gen\_random\_uuid(),  
  content text,  
  embedding vector(1536), \-- GPT-4o/5 embedding size  
  metadata jsonb  
);

\-- Enable Realtime  
alter publication supabase\_realtime add table devices;

### **B. Sync API Routes (Next.js)**

// app/api/sync/pull/route.ts  
// Called by Client RxDB to fetch changes  
export async function GET(req: Request) {  
  const { lastPulledAt } \= getQueryParams(req);  
  const { data } \= await supabase  
    .from('devices')  
    .select('\*')  
    .gt('updated\_at', lastPulledAt);  
    
  return Response.json({ documents: data });  
}

This plan ensures the backend is intelligent (Swarm), standardized (MCP), and persistent (Supabase).