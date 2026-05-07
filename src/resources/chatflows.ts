import { V2Resource } from './_base';

/** A field captured by a chatflow (form-style step). */
export interface ChatFlowField {
  id: string;
  label: string;
  fieldType: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: Record<string, unknown>;
  [key: string]: unknown;
}

/** A chatflow definition. */
export interface ChatFlow {
  id: string;
  name: string;
  description?: string;
  workspaceId?: string;
  fields?: ChatFlowField[];
  status?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Parameters to create a chatflow. */
export interface CreateChatFlowParams {
  name: string;
  description?: string;
  fields?: ChatFlowField[];
  [key: string]: unknown;
}

/** Validation result. */
export interface ChatFlowValidationResult {
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
  warnings?: Array<{ path: string; message: string }>;
}

/** Session summary. */
export interface ChatFlowSession {
  sessionId: string;
  chatflowId: string;
  channel?: string;
  status?: string;
  startedAt?: string;
  completedAt?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Aggregate stats. */
export interface ChatFlowStats {
  totalSessions?: number;
  completedSessions?: number;
  abandonedSessions?: number;
  averageCompletionMs?: number;
  [key: string]: unknown;
}

/** A chatflow version. */
export interface ChatFlowVersion {
  version: number;
  status?: string;
  note?: string;
  createdAt?: string;
}

/** ChatFlow builder helper namespace. */
class ChatFlowBuilder extends V2Resource {
  fieldTypes(): Promise<Array<{ value: string; label: string }>> {
    return this.request('GET', '/v2/chatflows/builder/field-types');
  }

  actionTypes(): Promise<Array<{ value: string; label: string }>> {
    return this.request('GET', '/v2/chatflows/builder/action-types');
  }

  pressStrategies(): Promise<Array<{ value: string; label: string }>> {
    return this.request('GET', '/v2/chatflows/builder/press-strategies');
  }

  templates(): Promise<Array<{ id: string; name: string }>> {
    return this.request('GET', '/v2/chatflows/builder/templates');
  }

  fromTemplate(templateId: string, params?: Record<string, unknown>): Promise<ChatFlow> {
    return this.request(
      'POST',
      `/v2/chatflows/builder/from-template/${encodeURIComponent(templateId)}`,
      params || {}
    );
  }

  fromTemplateDynamic(templateId: string, params: Record<string, unknown>): Promise<ChatFlow> {
    return this.request(
      'POST',
      `/v2/chatflows/builder/from-template/${encodeURIComponent(templateId)}/dynamic`,
      params
    );
  }

  previewPrompt(templateId: string, params: Record<string, unknown>): Promise<{ prompt: string }> {
    return this.request(
      'POST',
      `/v2/chatflows/builder/from-template/${encodeURIComponent(templateId)}/preview-prompt`,
      params
    );
  }

  regeneratePrompt(chatflowId: string, params?: Record<string, unknown>): Promise<{ prompt: string }> {
    return this.request(
      'POST',
      `/v2/chatflows/builder/${encodeURIComponent(chatflowId)}/regenerate-prompt`,
      params || {}
    );
  }

  preview(draft: Record<string, unknown>): Promise<{ messages: unknown[] }> {
    return this.request('POST', '/v2/chatflows/builder/preview', draft);
  }

  test(chatflowId: string, params?: Record<string, unknown>): Promise<{ runId: string }> {
    return this.request('POST', `/v2/chatflows/builder/${encodeURIComponent(chatflowId)}/test`, params || {});
  }

  export(chatflowId: string): Promise<unknown> {
    return this.request('GET', `/v2/chatflows/builder/${encodeURIComponent(chatflowId)}/export`);
  }

  import(json: unknown): Promise<ChatFlow> {
    return this.request('POST', '/v2/chatflows/builder/import', json);
  }

  previewVoice(params: Record<string, unknown>): Promise<{ audioUrl?: string }> {
    return this.request('POST', '/v2/chatflows/builder/preview-voice', params);
  }
}

/** ChatFlow versioning helper namespace. */
class ChatFlowVersions extends V2Resource {
  list(chatflowId: string): Promise<ChatFlowVersion[]> {
    return this.request('GET', `/v2/chatflows/${encodeURIComponent(chatflowId)}/versions`);
  }

  get(chatflowId: string, version: number | string): Promise<ChatFlowVersion> {
    return this.request('GET', `/v2/chatflows/${encodeURIComponent(chatflowId)}/versions/${version}`);
  }

  create(chatflowId: string, params?: { note?: string }): Promise<ChatFlowVersion> {
    return this.request('POST', `/v2/chatflows/${encodeURIComponent(chatflowId)}/versions`, params || {});
  }

  promote(chatflowId: string, version: number | string): Promise<ChatFlowVersion> {
    return this.request(
      'POST',
      `/v2/chatflows/${encodeURIComponent(chatflowId)}/versions/${version}/promote`
    );
  }

  archive(chatflowId: string, version: number | string): Promise<ChatFlowVersion> {
    return this.request(
      'POST',
      `/v2/chatflows/${encodeURIComponent(chatflowId)}/versions/${version}/archive`
    );
  }
}

/**
 * ChatFlows — conversational forms with field extraction, branching,
 * versioning, multi-channel delivery, and marketplace publication.
 */
export class ChatFlows extends V2Resource {
  /** Builder helpers. */
  readonly builder: ChatFlowBuilder;
  /** Version management. */
  readonly versions: ChatFlowVersions;

  constructor(client: ConstructorParameters<typeof V2Resource>[0]) {
    super(client);
    this.builder = new ChatFlowBuilder(client);
    this.versions = new ChatFlowVersions(client);
  }

  create(params: CreateChatFlowParams): Promise<ChatFlow> {
    return this.request('POST', '/v2/chatflows', params);
  }

  get(id: string): Promise<ChatFlow> {
    return this.request('GET', `/v2/chatflows/${encodeURIComponent(id)}`);
  }

  list(params?: { page?: number; size?: number; status?: string }): Promise<ChatFlow[] | { chatflows: ChatFlow[] }> {
    return this.request('GET', '/v2/chatflows', undefined, params as Record<string, unknown>);
  }

  update(id: string, params: Partial<ChatFlow>): Promise<ChatFlow> {
    return this.request('PUT', `/v2/chatflows/${encodeURIComponent(id)}`, params);
  }

  delete(id: string): Promise<void> {
    return this.request<void>('DELETE', `/v2/chatflows/${encodeURIComponent(id)}`);
  }

  validate(id: string): Promise<ChatFlowValidationResult> {
    return this.request('POST', `/v2/chatflows/${encodeURIComponent(id)}/validate`);
  }

  deploy(id: string): Promise<{ status: string }> {
    return this.request('POST', `/v2/chatflows/${encodeURIComponent(id)}/deploy`);
  }

  undeploy(id: string): Promise<{ status: string }> {
    return this.request('POST', `/v2/chatflows/${encodeURIComponent(id)}/undeploy`);
  }

  /** Start a session against a chatflow. */
  startSession(id: string, params?: { channel?: string; metadata?: Record<string, unknown> }): Promise<ChatFlowSession> {
    return this.request('POST', `/v2/chatflows/${encodeURIComponent(id)}/sessions`, params || {});
  }

  listSessions(id: string, params?: { page?: number; size?: number; status?: string }): Promise<ChatFlowSession[]> {
    return this.request(
      'GET',
      `/v2/chatflows/${encodeURIComponent(id)}/sessions`,
      undefined,
      params as Record<string, unknown>
    );
  }

  stats(id: string): Promise<ChatFlowStats> {
    return this.request('GET', `/v2/chatflows/${encodeURIComponent(id)}/stats`);
  }

  getSession(sessionId: string): Promise<ChatFlowSession> {
    return this.request('GET', `/v2/chatflows/sessions/${encodeURIComponent(sessionId)}`);
  }

  /** Publish to the workspace or organisation marketplace. */
  publish(id: string, params?: { visibility?: string; price?: number }): Promise<{ publicationId: string }> {
    return this.request('POST', `/v2/chatflows/${encodeURIComponent(id)}/publish`, params || {});
  }

  getPublished(id: string): Promise<unknown> {
    return this.request('GET', `/v2/chatflows/${encodeURIComponent(id)}/published`);
  }
}
