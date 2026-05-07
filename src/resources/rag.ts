import { V2Resource } from './_base';

/** Hybrid-search request. */
export interface RagSearchParams {
  query: string;
  datasetIds: string[];
  topK?: number;
  strategy?: 'VECTOR' | 'BM25' | 'HYBRID';
  filters?: Record<string, unknown>;
  rerank?: boolean;
}

/** A single retrieval hit. */
export interface RagSearchHit {
  documentId: string;
  segmentId?: string;
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/** Search result envelope. */
export interface RagSearchResult {
  results: RagSearchHit[];
  strategy: string;
  tookMs?: number;
}

/** Rerank request. */
export interface RagRerankParams {
  query: string;
  documents: string[];
  model?: string;
  topN?: number;
}

/** Rerank result. */
export interface RagRerankResult {
  results: Array<{ index: number; document: string; score: number }>;
  model: string;
}

/** Description of a model usable for embeddings or reranking. */
export interface RagModel {
  id: string;
  provider: string;
  dimensions?: number;
  contextWindow?: number;
  label?: string;
}

/** Workspace-level RAG config. */
export interface RagConfig {
  defaultEmbeddingModel?: string;
  defaultReranker?: string;
  defaultStrategy?: string;
  bm25Enabled?: boolean;
  [key: string]: unknown;
}

/**
 * RAG (Advanced) — direct hybrid search, reranking, and vocabulary management.
 */
export class Rag extends V2Resource {
  search(params: RagSearchParams): Promise<RagSearchResult> {
    return this.request('POST', '/v2/rag/search', params);
  }

  rerank(params: RagRerankParams): Promise<RagRerankResult> {
    return this.request('POST', '/v2/rag/rerank', params);
  }

  embeddingModels(): Promise<RagModel[]> {
    return this.request('GET', '/v2/rag/models/embeddings');
  }

  rerankerModels(): Promise<RagModel[]> {
    return this.request('GET', '/v2/rag/models/rerankers');
  }

  strategies(): Promise<Array<{ value: string; label: string; description?: string }>> {
    return this.request('GET', '/v2/rag/strategies');
  }

  config(): Promise<RagConfig> {
    return this.request('GET', '/v2/rag/config');
  }

  buildVocabulary(params?: { datasetIds?: string[] }): Promise<{ jobId: string }> {
    return this.request('POST', '/v2/rag/vocabulary/build', params || {});
  }

  vocabularyStats(): Promise<{ termCount: number; documentCount: number; updatedAt?: string }> {
    return this.request('GET', '/v2/rag/vocabulary/stats');
  }
}
