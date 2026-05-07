import { V2Resource } from './_base';

/** Knowledge base / dataset record. */
export interface Dataset {
  id: string;
  name: string;
  description?: string;
  embeddingModel?: string;
  workspaceId?: string;
  documentCount?: number;
  createdAt?: string;
  updatedAt?: string;
  apiAccess?: string;
  [key: string]: unknown;
}

/** Parameters to create a dataset. */
export interface CreateDatasetParams {
  name: string;
  description?: string;
  embeddingModel?: string;
  retrievalStrategy?: string;
  [key: string]: unknown;
}

/** Result of a dataset usage check. */
export interface DatasetUsageReport {
  datasetId: string;
  agents: string[];
  chatflows: string[];
  workflows: string[];
  inUse: boolean;
}

/** Toggleable API access state. */
export type DatasetApiAccessStatus = 'enabled' | 'disabled';

/**
 * Datasets — logical knowledge bases agents retrieve from.
 */
export class Datasets extends V2Resource {
  list(params?: { page?: number; size?: number; query?: string }): Promise<Dataset[] | { datasets: Dataset[] }> {
    return this.request('GET', '/api/v2/datasets', undefined, params as Record<string, unknown>);
  }

  create(params: CreateDatasetParams): Promise<Dataset> {
    return this.request('POST', '/api/v2/datasets', params);
  }

  get(id: string): Promise<Dataset> {
    return this.request('GET', `/api/v2/datasets/${encodeURIComponent(id)}`);
  }

  update(id: string, params: Partial<Dataset>): Promise<Dataset> {
    return this.request('PUT', `/api/v2/datasets/${encodeURIComponent(id)}`, params);
  }

  delete(id: string): Promise<void> {
    return this.request<void>('DELETE', `/api/v2/datasets/${encodeURIComponent(id)}`);
  }

  /** Check whether the dataset is referenced by any agent/chatflow/workflow. */
  useCheck(id: string): Promise<DatasetUsageReport> {
    return this.request('GET', `/api/v2/datasets/${encodeURIComponent(id)}/use-check`);
  }

  /** Toggle whether external API callers can query this dataset. */
  setApiAccess(id: string, status: DatasetApiAccessStatus): Promise<Dataset> {
    return this.request(
      'POST',
      `/api/v2/datasets/${encodeURIComponent(id)}/api-access/${encodeURIComponent(status)}`
    );
  }
}
