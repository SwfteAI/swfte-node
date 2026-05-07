# Datasets

A dataset is a logical knowledge base — a container for documents that agents can retrieve from at runtime.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Create
const dataset = await client.datasets.create({
  name: 'Product Documentation',
  description: 'Public-facing product docs',
  embeddingModel: 'openai:text-embedding-3-small',
});

// List, get, update
const all = await client.datasets.list();
const fetched = await client.datasets.get(dataset.id);
const updated = await client.datasets.update(dataset.id, {
  description: 'Updated: now includes API reference.',
});

// Check usage before deletion
const usage = await client.datasets.useCheck(dataset.id);
console.log(`Used by ${usage.agents.length} agents, ${usage.chatflows.length} chatflows`);

// Toggle public API access
await client.datasets.setApiAccess(dataset.id, 'enabled');

// Delete
await client.datasets.delete(dataset.id);
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
