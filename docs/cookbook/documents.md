# Documents

Documents are the leaves of a dataset — chunked, embedded, and indexed for retrieval. Supports batch ingest, processing-status streaming, and pause/resume.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

const datasetId = 'ds_product_docs'; // replace with your own

// Create from inline content or pre-uploaded file IDs
const created = await client.documents.create(datasetId, {
  documents: [
    { name: 'Quickstart', content: 'Welcome to Swfte. To get started…', source: 'INLINE' },
    { name: 'Pricing', fileId: 'file_pricing_pdf', source: 'FILE' },
  ],
});

// List
const docs = await client.documents.list(datasetId);

// Get a single document and its segments (chunks)
const doc = await client.documents.get(datasetId, created.documents[0].id);
const segments = await client.documents.segments(datasetId, doc.id);

// Update metadata
await client.documents.update(datasetId, doc.id, {
  name: 'Quickstart (v2)',
});

// Pause / resume long-running ingestion
await client.documents.pause(datasetId, doc.id);
await client.documents.resume(datasetId, doc.id);

// Retry on failure
await client.documents.retry(datasetId, doc.id);

// Batch update + monitor
const batch = await client.documents.batchUpdate(datasetId, [
  { id: doc.id, enabled: true },
]);
const batchStatus = await client.documents.batchStatus(datasetId, batch.batchId);

// Processing status (overall)
const processing = await client.documents.processingStatus(datasetId);

// Delete
await client.documents.delete(datasetId, doc.id);
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
