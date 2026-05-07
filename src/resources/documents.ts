import { V2Resource } from './_base';

/** A document inside a dataset. */
export interface Document {
  id: string;
  datasetId: string;
  name: string;
  source?: string;
  status?: string;
  enabled?: boolean;
  segmentCount?: number;
  fileId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** A single retrieval-ready text segment. */
export interface DocumentSegment {
  id: string;
  documentId: string;
  index: number;
  content: string;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
}

/** Per-document spec when creating in batch. */
export interface DocumentInput {
  name: string;
  source: 'INLINE' | 'FILE' | 'URL';
  content?: string;
  fileId?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

/** Create-documents request. */
export interface CreateDocumentsParams {
  documents: DocumentInput[];
  processingMode?: 'AUTO' | 'CUSTOM';
}

/** Batch update entry. */
export interface DocumentBatchUpdateEntry {
  id: string;
  enabled?: boolean;
  name?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Documents — chunked, embedded, and indexed leaves of a dataset.
 */
export class Documents extends V2Resource {
  private docPath(datasetId: string, suffix = ''): string {
    return `/api/v2/datasets/${encodeURIComponent(datasetId)}/documents${suffix}`;
  }

  create(datasetId: string, params: CreateDocumentsParams): Promise<{ documents: Document[] }> {
    return this.request('POST', this.docPath(datasetId), params);
  }

  list(datasetId: string, params?: { page?: number; size?: number }): Promise<Document[] | { documents: Document[] }> {
    return this.request('GET', this.docPath(datasetId), undefined, params as Record<string, unknown>);
  }

  get(datasetId: string, documentId: string): Promise<Document> {
    return this.request('GET', this.docPath(datasetId, `/${encodeURIComponent(documentId)}`));
  }

  update(datasetId: string, documentId: string, params: Partial<Document>): Promise<Document> {
    return this.request('PUT', this.docPath(datasetId, `/${encodeURIComponent(documentId)}`), params);
  }

  delete(datasetId: string, documentId: string): Promise<void> {
    return this.request<void>('DELETE', this.docPath(datasetId, `/${encodeURIComponent(documentId)}`));
  }

  segments(datasetId: string, documentId: string): Promise<DocumentSegment[]> {
    return this.request('GET', this.docPath(datasetId, `/${encodeURIComponent(documentId)}/segments`));
  }

  retry(datasetId: string, documentId: string): Promise<Document> {
    return this.request('POST', this.docPath(datasetId, `/${encodeURIComponent(documentId)}/retry`));
  }

  pause(datasetId: string, documentId: string): Promise<Document> {
    return this.request('POST', this.docPath(datasetId, `/${encodeURIComponent(documentId)}/pause`));
  }

  resume(datasetId: string, documentId: string): Promise<Document> {
    return this.request('POST', this.docPath(datasetId, `/${encodeURIComponent(documentId)}/resume`));
  }

  processingStatus(datasetId: string): Promise<{ pending: number; running: number; failed: number }> {
    return this.request('GET', this.docPath(datasetId, '/processing-status'));
  }

  batchUpdate(datasetId: string, entries: DocumentBatchUpdateEntry[]): Promise<{ batchId: string }> {
    return this.request('PATCH', this.docPath(datasetId, '/batch'), { entries });
  }

  batchStatus(datasetId: string, batchId: string): Promise<{ status: string; processed: number; total: number }> {
    return this.request(
      'GET',
      this.docPath(datasetId, `/batch/${encodeURIComponent(batchId)}/status`)
    );
  }
}
