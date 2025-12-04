# Agent Swarm Architecture

## Overview

Q8's intelligence comes from a **federated swarm** of specialized AI agents, each powered by the best model for its domain. The user interacts with a single Orchestrator, which delegates tasks to specialist sub-agents.

## Design Philosophy

### One Interface, Many Specialists

```
User perception: One unified "Q8" assistant
Reality: 5+ specialized models working together
```

**Benefits:**
- Best model for each task type
- Consistent personality despite model diversity
- Scalable to new capabilities
- Cost optimization per task

## Agent Hierarchy

### Orchestrator (GPT-5.1)

**Role:** Primary router and conversation manager

**Capabilities:**
- Intent classification
- Task routing
- Context management
- Response synthesis
- Voice interaction (WebRTC)

**Routing Logic:**
```typescript
if (task involves code/github/database) → Dev Agent
if (task needs web search/facts) → Research Agent
if (task is email/calendar/docs) → Secretary Agent
if (task is home automation) → Home Agent
if (task is casual chat) → Personality Agent
```

**Configuration:**
- Model: `gpt-5.1-preview`
- Temperature: 0.7
- Max tokens: 4096
- Tools: Agent transfer functions

### Dev Agent (Claude Sonnet 4.5)

**Role:** Software development and technical operations

**Capabilities:**
- Code review and debugging
- GitHub repository management
- Supabase database operations
- Architecture recommendations
- Documentation generation

**Tools:**
- `github_search_code`
- `github_get_file`
- `github_create_pr`
- `github_create_issue`
- `supabase_run_sql`
- `supabase_get_schema`

**Configuration:**
- Model: `claude-sonnet-4.5`
- Context: 200K tokens
- Temperature: 0.3 (precise)
- System prompt: "Expert software engineer..."

### Research Agent (Perplexity Sonar Pro)

**Role:** Real-time information retrieval and fact-checking

**Capabilities:**
- Web search with citations
- Current events and news
- Fact verification
- Academic research
- Competitive analysis

**Tools:**
- `web_search`
- `extract_citations`
- `verify_facts`

**Configuration:**
- Model: `sonar-pro`
- Search depth: Deep
- Citation required: true
- Recency bias: 30 days

### Secretary Agent (Gemini 3.0 Pro)

**Role:** Personal productivity and organization

**Capabilities:**
- Email management (Gmail)
- Calendar scheduling
- Document handling (Google Drive)
- YouTube content management
- Task organization

**Tools:**
- `gmail_list_messages`
- `gmail_send_message`
- `calendar_list_events`
- `calendar_create_event`
- `drive_search_files`
- `youtube_search`

**Configuration:**
- Model: `gemini-3.0-pro-preview`
- Context: 2M tokens (massive)
- Temperature: 0.5
- System prompt: "Professional secretary..."

### Personality Agent (Grok 4.1)

**Role:** Engaging conversation and creative tasks

**Capabilities:**
- Casual chat
- Creative writing
- Brainstorming
- Witty responses
- Cultural references

**Configuration:**
- Model: `grok-4.1-fast`
- Temperature: 0.9 (creative)
- Personality: Witty, helpful
- Tone: Friendly but professional

### Home Agent (GPT-4 Turbo)

**Role:** Smart home and IoT control

**Capabilities:**
- Home Assistant integration
- Device control
- Automation management
- Sensor monitoring

**Tools:**
- `hass_toggle_light`
- `hass_set_climate`
- `hass_get_state`

**Configuration:**
- Model: `gpt-4-turbo-preview`
- Temperature: 0.2 (precise)
- System prompt: "Home automation expert..."

## Agent Communication Protocol

### Handoff Mechanism

**OpenAI Agents SDK Pattern:**
```typescript
// Orchestrator definition
const orchestrator = new Agent({
  name: "Q8",
  model: "gpt-5.1-preview",
  instructions: "Route tasks to specialists...",
  handoffs: [devAgent, researchAgent, secretaryAgent, ...]
});

// Transfer function
function transfer_to_coder() {
  return {
    agent: devAgent,
    context: { originalRequest, userContext }
  };
}
```

### Context Passing

When transferring between agents:
```typescript
{
  userId: "user-123",
  sessionId: "session-456",
  originalRequest: "Check my latest PR",
  conversationHistory: [...],
  userPreferences: {...},
  currentTime: "2024-01-15T10:30:00Z",
  location: { lat, long },
  weather: { temp, condition }
}
```

### Response Synthesis

Orchestrator synthesizes sub-agent responses:
```
User: "Check my PR and summarize the changes"
   ↓
Orchestrator → Dev Agent (silent)
   ↓
Dev Agent: [Detailed technical analysis]
   ↓
Orchestrator synthesizes: "Your PR #123 adds authentication middleware.
All tests passed, and the code review is positive. Ready to merge."
```

## Agent Selection Strategy

### Intent Classification

```typescript
function classifyIntent(message: string): AgentType {
  const codeKeywords = ['code', 'bug', 'github', 'pr', 'commit'];
  const searchKeywords = ['search', 'find', 'what is', 'research'];
  const productivityKeywords = ['email', 'calendar', 'schedule', 'meeting'];

  // Use GPT-5.1 for complex classification
  // Fall back to keyword matching for speed
}
```

### Multi-Agent Workflows

**Example: Complex Research Task**

```
User: "Research React Server Components and create a summary doc in Google Drive"
   ↓
Orchestrator classifies: RESEARCH + PRODUCTIVITY
   ↓
Step 1: Transfer to Research Agent
        → Web search for RSC information
        → Compile findings with citations
   ↓
Step 2: Transfer to Secretary Agent
        → Format as Google Doc
        → Upload to Drive
        → Return link
   ↓
Orchestrator: "I've created a comprehensive summary of React Server Components
in your Drive. Here's the link: [url]"
```

## Model Factory Pattern

**Implementation:** `apps/web/src/lib/agents/model_factory.ts`

```typescript
export function getModel(agentType: AgentType): ModelConfig {
  switch (agentType) {
    case 'orchestrator':
      return { model: 'gpt-5.1-preview', apiKey: process.env.OPENAI_API_KEY };

    case 'coder':
      return {
        model: 'claude-sonnet-4.5',
        baseURL: 'https://api.anthropic.com/v1',
        apiKey: process.env.ANTHROPIC_API_KEY
      };

    // ... other agents
  }
}
```

**Benefits:**
- Centralized model configuration
- Easy to swap models
- Environment-based configuration
- Type-safe model selection

## Personality Consistency

### Unified Voice

Despite using different models, Q8 maintains consistency:

**Techniques:**
1. **System Prompts:** All agents instructed to be "helpful, professional Q8"
2. **Response Filtering:** Orchestrator can modify sub-agent responses
3. **Tone Guidelines:** Consistent style across agents
4. **User Preferences:** Remember user's preferred interaction style

### Example System Prompts

**Orchestrator:**
```
You are Q8, a hyper-intelligent personal assistant.
Maintain a helpful, professional tone.
When delegating to specialists, synthesize their responses naturally.
Never expose the internal agent architecture to the user.
```

**Dev Agent:**
```
You are Q8's development specialist.
Provide clear, well-documented technical advice.
Use the same helpful tone as the main Q8 assistant.
```

## Error Handling

### Graceful Degradation

```typescript
try {
  const response = await devAgent.execute(task);
} catch (error) {
  // Fall back to orchestrator
  return orchestrator.handleDirectly(task);
}
```

### Timeout Management

- Each agent has max execution time
- Long-running tasks use streaming
- User sees progress indicators

### Tool Failure Recovery

```typescript
if (githubTool.fails()) {
  // Try alternative approach
  // Or inform user of limitation
  return "GitHub is currently unavailable. I'll retry shortly.";
}
```

## Performance Optimization

### Parallel Execution

```typescript
// Independent tasks run in parallel
const [emails, events] = await Promise.all([
  secretaryAgent.execute({ task: 'list emails' }),
  secretaryAgent.execute({ task: 'list calendar' })
]);
```

### Response Streaming

```typescript
// Stream responses for better UX
for await (const chunk of agent.stream(message)) {
  updateUI(chunk);
}
```

### Caching

- Common queries cached
- Tool results cached (with TTL)
- Context reused within session

## Monitoring

### Agent Metrics

Track per-agent:
- Request count
- Average response time
- Success rate
- Cost per request
- Error types

### User Analytics

- Which agents used most
- Task completion rates
- User satisfaction scores
- Handoff efficiency

## Future Expansion

### Adding New Agents

1. Create agent config in `sub-agents/`
2. Add to `model_factory.ts`
3. Register in orchestrator handoffs
4. Define routing logic
5. Add monitoring

### Planned Agents

- **Financial Agent:** Banking, investments, budgeting
- **Health Agent:** Fitness tracking, nutrition
- **Learning Agent:** Educational content, skill development
- **Travel Agent:** Trip planning, booking

## Best Practices

1. **Single Responsibility:** Each agent has clear domain
2. **Minimal Handoffs:** Avoid unnecessary transfers
3. **Context Preservation:** Pass relevant context only
4. **Response Quality:** Sub-agents should be thorough
5. **User-Centric:** Always optimize for user experience

## See Also

- [System Architecture](./system-architecture.md)
- [MCP Integration](./mcp-integration.md)
- [Agent Specifications](../specifications/agent-specs.md)
