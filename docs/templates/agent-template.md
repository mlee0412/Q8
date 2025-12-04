# Agent Template

Use this template when creating a new specialist agent for Q8.

## Agent Name: [Your Agent Name]

### Overview
Brief description of what this agent does and why it's needed.

### Configuration

```typescript
// apps/web/src/lib/agents/sub-agents/[agent-name].ts

import { getModel } from '../model_factory';
import type { Tool } from '../types';

export const [agentName]AgentConfig = {
  name: '[Agent Display Name]',
  model: getModel('[model-type]'), // Add to model_factory.ts first
  instructions: `You are a [description] specialist.

Your capabilities:
- [Capability 1]
- [Capability 2]
- [Capability 3]

[Additional context and guidelines]`,
  tools: [] as Tool[], // Will be populated with MCP tools
};

export async function initialize[AgentName]Agent() {
  // TODO: Initialize relevant MCP tools
  return [agentName]AgentConfig;
}
```

### Model Configuration

Add to `apps/web/src/lib/agents/model_factory.ts`:

```typescript
case '[agent-type]':
  return {
    model: '[model-id]',
    baseURL: '[api-base-url]',
    apiKey: process.env.[API_KEY_NAME],
  };
```

### Environment Variables

Add to `apps/web/.env.local.example`:

```env
# [Agent Name]
[API_KEY_NAME]=""  # Description and where to get it
```

### Orchestrator Integration

Update `apps/web/src/lib/agents/index.ts`:

```typescript
import { initialize[AgentName]Agent } from './sub-agents/[agent-name]';

export async function initializeOrchestrator() {
  // ... existing agents
  const [agentName]Agent = await initialize[AgentName]Agent();

  return {
    ...orchestratorConfig,
    subAgents: {
      // ... existing agents
      [agentName]: [agentName]Agent,
    },
  };
}
```

Update orchestrator instructions:

```typescript
Routing Rules:
- [Description of when to use this agent] → Transfer to [Agent Name]
```

### MCP Tools

#### Required Tools

List the MCP tools this agent needs:

1. **[tool_name]** - Description
   - Input: `{ param1: type, param2: type }`
   - Output: `ReturnType`

2. **[tool_name_2]** - Description
   - Input: `{ param1: type }`
   - Output: `ReturnType`

#### Tool Implementation

If creating new MCP tools, add to appropriate MCP server or create new one.

### Capabilities

List specific capabilities:

- [ ] [Capability 1 description]
- [ ] [Capability 2 description]
- [ ] [Capability 3 description]

### Routing Logic

When should the orchestrator transfer to this agent?

**Keywords:** [keyword1, keyword2, keyword3]

**Example Requests:**
- "Can you [example request 1]?"
- "I need help with [example request 2]"
- "[Example request 3]"

### Example Conversation Flow

```
User: "[Example user request]"
   ↓
Orchestrator classifies as: [CATEGORY]
   ↓
Transfers to: [Agent Name]
   ↓
[Agent Name] uses: [tool_name]
   ↓
MCP Server returns: [data]
   ↓
[Agent Name] formats response
   ↓
Orchestrator speaks: "[Example response]"
```

### Configuration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Model | [model-id] | AI model used |
| Temperature | [0.0-2.0] | Creativity level |
| Max Tokens | [number] | Response length limit |
| Context Window | [number] | Input size limit |

### Testing Checklist

- [ ] Model configuration added to `model_factory.ts`
- [ ] Agent file created in `sub-agents/`
- [ ] Orchestrator integration complete
- [ ] Environment variables documented
- [ ] MCP tools connected (if any)
- [ ] Routing logic tested
- [ ] Example conversations work
- [ ] Error handling implemented
- [ ] Documentation updated

### Performance Considerations

- **Expected response time:** [X seconds]
- **Token usage:** [Estimated tokens per request]
- **Cost per request:** [Estimated cost]
- **Caching strategy:** [How responses are cached]

### Monitoring

Metrics to track:
- Request count
- Average response time
- Success rate
- Error types
- Cost per request
- User satisfaction

### Future Improvements

- [ ] [Potential improvement 1]
- [ ] [Potential improvement 2]
- [ ] [Potential improvement 3]

### Related Documentation

- [System Architecture](../architecture/system-architecture.md)
- [Agent Swarm](../architecture/agent-swarm.md)
- [MCP Integration](../architecture/mcp-integration.md)

---

**Created by:** [Your Name]
**Date:** [YYYY-MM-DD]
**Status:** [Planning/In Development/Active/Deprecated]
