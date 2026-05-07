# Agents

Create, manage, and run production-grade agents with tool calling, knowledge bases, conversation memory, and persona A/B testing.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Create
const agent = await client.agents.create({
  name: 'Research Assistant',
  description: 'Summarises long documents and extracts key facts.',
  systemPrompt: 'You are a meticulous research assistant.',
  provider: 'OPENAI',
  model: 'gpt-4',
  temperature: 0.4,
});

// List
const agents = await client.agents.list(1, 20);
console.log(`Workspace has ${agents.length} agents`);

// Get
const fetched = await client.agents.get(agent.id);

// Update (PATCH — partial)
const updated = await client.agents.patch(agent.id, {
  description: 'Updated: now also drafts executive summaries.',
  temperature: 0.3,
});

// Associate a workflow
await client.agents.associateWorkflow(agent.id, 'wf_summary_v1'); // replace with your own

// Update avatar
await client.agents.updateAvatar(agent.id, {
  type: 'initials',
  backgroundColor: '#5b6cf2',
});

// Delete
await client.agents.delete(agent.id);
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
