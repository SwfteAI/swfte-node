# Workflows

Durable DAG execution with LLM, HTTP, tool, condition, loop, and human-in-the-loop nodes. Manual, scheduled, and webhook triggers; export as JSON, Docker bundle, or executable.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Create
const workflow = await client.workflows.create({
  name: 'Daily News Summariser',
  nodes: [
    { id: 'start', type: 'TRIGGER', config: { triggerType: 'SCHEDULE', cron: '0 8 * * *' } },
    { id: 'fetch', type: 'HTTP', config: { url: 'https://news.example/api' } },
    { id: 'llm', type: 'LLM', config: { model: 'openai:gpt-4', prompt: 'Summarise: {{fetch.body}}' } },
    { id: 'end', type: 'END', config: {} },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'fetch' },
    { id: 'e2', source: 'fetch', target: 'llm' },
    { id: 'e3', source: 'llm', target: 'end' },
  ],
});

// List, get
const all = await client.workflows.list();
const fetched = await client.workflows.get(workflow.id);

// Update / patch
await client.workflows.update(workflow.id, { ...fetched, name: 'Renamed Pipeline' });

// Clone
const clone = await client.workflows.clone(workflow.id, 'Daily News Summariser (copy)');

// Validate JSON before saving
await client.workflows.validateJson({ nodes: fetched.nodes, edges: fetched.edges });

// Execute
const execution = await client.workflows.execute(workflow.id, { topic: 'AI infrastructure' });
const status = await client.workflows.getExecutionStatus(execution.executionId);

// Export
const json = await client.workflows.export(workflow.id);
const docker = await client.workflows.exportDocker(workflow.id);
const exe = await client.workflows.exportExecutable(workflow.id);

// Import
const imported = await client.workflows.import(json);

// Delete
await client.workflows.delete(clone.id);
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
