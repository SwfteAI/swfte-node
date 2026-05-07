# Files

Upload, download, preview, and manage workspace files. Files can be promoted into datasets, attached to agents, or used as MCP tool inputs.

```typescript
import Swfte from '@swfte/sdk';
import { readFileSync } from 'fs';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Discover server-side limits and accepted MIME types
const cfg = await client.files.config();
console.log(`Max upload size: ${cfg.maxBytes}`);

// Upload single
const file = await client.files.upload({
  name: 'pricing.pdf',
  contentType: 'application/pdf',
  data: readFileSync('./pricing.pdf'),
});

// Upload many
const batch = await client.files.uploadBatch([
  { name: 'a.txt', contentType: 'text/plain', data: 'hello' },
  { name: 'b.txt', contentType: 'text/plain', data: 'world' },
]);

// List, get, preview, download
const all = await client.files.list();
const meta = await client.files.get(file.id);
const preview = await client.files.preview(file.id);
const bytes = await client.files.download(file.id);

// Track usage (eg. attach to a dataset)
await client.files.updateUsage(file.id, {
  usage: 'DATASET',
  resourceId: 'ds_product_docs', // replace with your own
});

// Cleanup orphaned files
await client.files.cleanup();

// Delete
await client.files.delete(file.id);
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
