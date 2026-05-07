# MCP (Model Context Protocol)

Connect external MCP servers, discover tools, and execute them — individually or in batches — with full audit and analytics.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Connect an MCP server
const server = await client.mcp.connect({
  name: 'GitHub MCP',
  transport: 'STREAMABLE_HTTP',
  url: 'https://mcp.example.com/github',
  authToken: 'tk_demo_github', // replace with your own
});

// List
const servers = await client.mcp.listServers();
const tools = await client.mcp.listTools();

// Inspect a tool
const schema = await client.mcp.toolSchema('tool_create_issue'); // replace with your own
const status = await client.mcp.toolStatus('tool_create_issue');

// Execute a single tool
const result = await client.mcp.executeTool('tool_create_issue', {
  repo: 'acme/widgets',
  title: 'Investigate flaky test',
  body: 'See run #4321',
});

// Batch execute (parallel)
const batch = await client.mcp.batchExecute([
  { toolId: 'tool_create_issue', input: { repo: 'acme/a', title: 'A' } },
  { toolId: 'tool_create_issue', input: { repo: 'acme/b', title: 'B' } },
]);

// Health check + analytics
await client.mcp.healthCheck();
const analytics = await client.mcp.analytics({ days: 7 });

// Disconnect
await client.mcp.disconnect(server.providerId);
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
