import { V2Resource } from './_base';

/** Workspace file metadata. */
export interface WorkspaceFile {
  id: string;
  name: string;
  contentType?: string;
  sizeBytes?: number;
  workspaceId?: string;
  uploadedBy?: string;
  usage?: string;
  resourceId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Server-side upload configuration. */
export interface FilesConfig {
  maxBytes: number;
  allowedContentTypes: string[];
  multipart?: { partSize: number };
}

/** Single-file upload params. */
export interface UploadFileParams {
  name: string;
  contentType: string;
  data: ArrayBuffer | Uint8Array | Blob | string;
  metadata?: Record<string, unknown>;
}

/** Track-usage update. */
export interface UpdateUsageParams {
  usage: 'DATASET' | 'AGENT' | 'CHATFLOW' | 'WORKFLOW' | 'NONE';
  resourceId?: string;
}

function toBlob(data: UploadFileParams['data'], contentType: string): Blob {
  if (data instanceof Blob) return data;
  if (typeof data === 'string') return new Blob([data], { type: contentType });
  if (data instanceof Uint8Array) {
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    return new Blob([buf], { type: contentType });
  }
  return new Blob([data], { type: contentType });
}

/**
 * Files — upload, download, preview, and track lifecycle of workspace files.
 */
export class Files extends V2Resource {
  config(): Promise<FilesConfig> {
    return this.request('GET', '/api/v2/files/config');
  }

  /**
   * Upload a single file.
   *
   * Sends a multipart/form-data POST and bypasses the JSON-only `request`
   * helper because file uploads need their own Content-Type.
   */
  async upload(params: UploadFileParams): Promise<WorkspaceFile> {
    const form = new FormData();
    form.append('file', toBlob(params.data, params.contentType), params.name);
    if (params.metadata) form.append('metadata', JSON.stringify(params.metadata));

    const headers = { ...this.client.getHeaders() };
    delete (headers as Record<string, string>)['Content-Type'];

    const response = await fetch(this.url('/api/v2/files/upload'), {
      method: 'POST',
      headers,
      body: form,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error: ${response.status} - ${body}`);
    }
    return (await response.json()) as WorkspaceFile;
  }

  /** Upload several files in one call. */
  async uploadBatch(items: UploadFileParams[]): Promise<{ files: WorkspaceFile[] }> {
    const form = new FormData();
    for (const item of items) {
      form.append('files', toBlob(item.data, item.contentType), item.name);
    }
    const headers = { ...this.client.getHeaders() };
    delete (headers as Record<string, string>)['Content-Type'];

    const response = await fetch(this.url('/api/v2/files/upload-batch'), {
      method: 'POST',
      headers,
      body: form,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error: ${response.status} - ${body}`);
    }
    return (await response.json()) as { files: WorkspaceFile[] };
  }

  list(params?: { page?: number; size?: number; query?: string }): Promise<WorkspaceFile[] | { files: WorkspaceFile[] }> {
    return this.request('GET', '/api/v2/files', undefined, params as Record<string, unknown>);
  }

  get(id: string): Promise<WorkspaceFile> {
    return this.request('GET', `/api/v2/files/${encodeURIComponent(id)}`);
  }

  download(id: string): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>('GET', `/api/v2/files/${encodeURIComponent(id)}/download`);
  }

  preview(id: string): Promise<{ url: string } | string> {
    return this.request('GET', `/api/v2/files/${encodeURIComponent(id)}/preview`);
  }

  delete(id: string): Promise<void> {
    return this.request<void>('DELETE', `/api/v2/files/${encodeURIComponent(id)}`);
  }

  updateUsage(id: string, params: UpdateUsageParams): Promise<WorkspaceFile> {
    return this.request('PUT', `/api/v2/files/${encodeURIComponent(id)}/usage`, params);
  }

  cleanup(): Promise<{ removed: number }> {
    return this.request('POST', '/api/v2/files/cleanup');
  }
}
