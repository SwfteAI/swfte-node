# RAG (Advanced)

Hybrid search, reranking, custom vocabularies, and retrieval-strategy selection. Use these endpoints when you need finer control than the default agent-side retrieval.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Discover available models and strategies
const embedModels = await client.rag.embeddingModels();
const rerankers = await client.rag.rerankerModels();
const strategies = await client.rag.strategies();
const config = await client.rag.config();

// Hybrid (vector + BM25) search across one or more datasets
const hits = await client.rag.search({
  query: 'How do I rotate API keys?',
  datasetIds: ['ds_product_docs'], // replace with your own
  topK: 10,
  strategy: 'HYBRID',
});

// Rerank for precision
const reranked = await client.rag.rerank({
  query: 'How do I rotate API keys?',
  documents: hits.results.map((h) => h.text),
  model: 'cohere:rerank-v3',
  topN: 5,
});

// Maintain BM25 vocabulary for the workspace
const stats = await client.rag.vocabularyStats();
await client.rag.buildVocabulary({ datasetIds: ['ds_product_docs'] });
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
