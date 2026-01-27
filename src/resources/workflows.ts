import type { SwfteClient } from '../client';

/**
 * Execution status enum
 */
export type ExecutionStatus = 
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Workflow node interface
 */
export interface WorkflowNode {
  id: string;
  type: string;
  name?: string;
  position?: { x: number; y: number };
  config?: Record<string, unknown>;
}

/**
 * Workflow edge interface
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

/**
 * Workflow interface
 */
export interface Workflow {
  id: string;
  workflowId?: string;
  name: string;
  description?: string;
  workspaceId?: string;
  active?: boolean;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  variables?: Record<string, unknown>;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Workflow execution interface
 */
export interface WorkflowExecution {
  id: string;
  executionId?: string;
  workflowId: string;
  status: ExecutionStatus;
  progress?: number;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Workflow creation parameters
 */
export interface CreateWorkflowParams {
  name: string;
  nodes: WorkflowNode[];
  edges?: WorkflowEdge[];
  description?: string;
  active?: boolean;
  variables?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Workflow update parameters
 */
export interface UpdateWorkflowParams {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  active?: boolean;
  variables?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

/**
 * Workflow list response
 */
export interface WorkflowListResponse {
  content?: Workflow[];
  workflows?: Workflow[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Workflow analytics
 */
export interface WorkflowAnalytics {
  totalExecutions: number;
  avgDuration: number;
  successRate: number;
  [key: string]: unknown;
}

/**
 * Workflows resource for workflow management.
 *
 * @example
 * ```typescript
 * const client = new Swfte({ apiKey: 'sk-swfte-...' });
 *
 * // Create a workflow
 * const workflow = await client.workflows.create({
 *   name: 'My Workflow',
 *   nodes: [
 *     { id: 'start', type: 'TRIGGER', config: { triggerType: 'MANUAL' } },
 *     { id: 'llm', type: 'LLM', config: { model: 'gpt-4' } },
 *     { id: 'end', type: 'END', config: {} }
 *   ],
 *   edges: [
 *     { id: 'e1', source: 'start', target: 'llm' },
 *     { id: 'e2', source: 'llm', target: 'end' }
 *   ]
 * });
 *
 * // Execute workflow
 * const execution = await client.workflows.execute(workflow.id, { message: 'Hello' });
 *
 * // Wait for completion
 * const result = await client.workflows.waitForCompletion(execution.id);
 * ```
 */
export class Workflows {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * Get the base URL for workflow endpoints.
   */
  private getBaseUrl(): string {
    let base = this.client.baseUrl;
    if (base.includes('/gateway')) {
      base = base.replace('/v1/gateway', '');
    }
    return `${base}/v2/workflows`;
  }

  /**
   * Make a request to the workflow API.
   */
  private async makeRequest<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<T> {
    const headers = this.client.getHeaders();
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * Create a new workflow.
   */
  async create(params: CreateWorkflowParams): Promise<Workflow> {
    const payload = {
      name: params.name,
      nodes: params.nodes,
      edges: params.edges || [],
      description: params.description,
      active: params.active ?? true,
      variables: params.variables || {},
      workspaceId: this.client.workspaceId,
      ...params,
    };

    return this.makeRequest<Workflow>('POST', this.getBaseUrl(), payload);
  }

  /**
   * Get a workflow by ID.
   */
  async get(workflowId: string): Promise<Workflow> {
    return this.makeRequest<Workflow>('GET', `${this.getBaseUrl()}/${workflowId}`);
  }

  /**
   * Update an existing workflow.
   */
  async update(workflowId: string, params: UpdateWorkflowParams): Promise<Workflow> {
    const current = await this.get(workflowId);
    const payload = { ...current, ...params };

    return this.makeRequest<Workflow>('PUT', `${this.getBaseUrl()}/${workflowId}`, payload);
  }

  /**
   * Partially update a workflow.
   */
  async patch(workflowId: string, updates: Partial<Workflow>): Promise<Workflow> {
    return this.makeRequest<Workflow>('PATCH', `${this.getBaseUrl()}/${workflowId}`, updates);
  }

  /**
   * Delete a workflow.
   */
  async delete(workflowId: string, force: boolean = false): Promise<void> {
    const url = force 
      ? `${this.getBaseUrl()}/${workflowId}?force=true`
      : `${this.getBaseUrl()}/${workflowId}`;
    await this.makeRequest<void>('DELETE', url);
  }

  /**
   * List all workflows.
   */
  async list(
    page: number = 0,
    size: number = 20,
    options?: { status?: string; search?: string }
  ): Promise<Workflow[]> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (options?.status) {
      params.set('status', options.status);
    }
    if (options?.search) {
      params.set('search', options.search);
    }
    
    const response = await this.makeRequest<WorkflowListResponse>(
      'GET',
      `${this.getBaseUrl()}?${params}`
    );
    return response.content || response.workflows || [];
  }

  /**
   * Validate a workflow definition.
   */
  async validate(params: CreateWorkflowParams): Promise<ValidationResult> {
    const payload = {
      name: params.name,
      nodes: params.nodes,
      edges: params.edges || [],
      ...params,
    };

    return this.makeRequest<ValidationResult>('POST', `${this.getBaseUrl()}/validate`, payload);
  }

  /**
   * Execute a workflow.
   */
  async execute(
    workflowId: string,
    inputs?: Record<string, unknown>,
    skipValidation: boolean = false
  ): Promise<WorkflowExecution> {
    const url = skipValidation
      ? `${this.getBaseUrl()}/${workflowId}/execute?skipValidation=true`
      : `${this.getBaseUrl()}/${workflowId}/execute`;
    
    return this.makeRequest<WorkflowExecution>('POST', url, inputs || {});
  }

  /**
   * Get execution status.
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution> {
    return this.makeRequest<WorkflowExecution>(
      'GET',
      `${this.getBaseUrl()}/executions/${executionId}/status`
    );
  }

  /**
   * Pause a running execution.
   */
  async pauseExecution(executionId: string): Promise<WorkflowExecution> {
    return this.makeRequest<WorkflowExecution>(
      'POST',
      `${this.getBaseUrl()}/executions/${executionId}/pause`
    );
  }

  /**
   * Resume a paused execution.
   */
  async resumeExecution(executionId: string): Promise<WorkflowExecution> {
    return this.makeRequest<WorkflowExecution>(
      'POST',
      `${this.getBaseUrl()}/executions/${executionId}/resume`
    );
  }

  /**
   * Get execution history for a workflow.
   */
  async getExecutionHistory(workflowId: string): Promise<WorkflowExecution[]> {
    const response = await this.makeRequest<WorkflowExecution[]>(
      'GET',
      `${this.getBaseUrl()}/${workflowId}/executions`
    );
    return Array.isArray(response) ? response : [];
  }

  /**
   * Wait for a workflow execution to complete.
   */
  async waitForCompletion(
    executionId: string,
    timeout: number = 300000,
    pollInterval: number = 5000
  ): Promise<WorkflowExecution> {
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout) {
        throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
      }

      const execution = await this.getExecutionStatus(executionId);

      if (execution.status === 'COMPLETED') {
        return execution;
      } else if (execution.status === 'FAILED') {
        throw new Error(`Execution ${executionId} failed: ${execution.error}`);
      } else if (execution.status === 'CANCELLED') {
        throw new Error(`Execution ${executionId} was cancelled`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Clone a workflow.
   */
  async clone(
    workflowId: string,
    newName: string,
    includeHistory: boolean = false
  ): Promise<Workflow> {
    const params = new URLSearchParams({ newName, includeHistory: String(includeHistory) });
    return this.makeRequest<Workflow>('POST', `${this.getBaseUrl()}/${workflowId}/clone?${params}`);
  }

  /**
   * Export a workflow.
   */
  async export(
    workflowId: string,
    format: string = 'json',
    includeMetadata: boolean = true
  ): Promise<Record<string, unknown> | string> {
    const params = new URLSearchParams({ format, includeMetadata: String(includeMetadata) });
    return this.makeRequest<Record<string, unknown> | string>(
      'GET',
      `${this.getBaseUrl()}/${workflowId}/export?${params}`
    );
  }

  /**
   * Get workflow analytics.
   */
  async getAnalytics(
    workflowId: string,
    days: number = 30,
    detailed: boolean = false
  ): Promise<WorkflowAnalytics> {
    const params = new URLSearchParams({ days: String(days), detailed: String(detailed) });
    return this.makeRequest<WorkflowAnalytics>(
      'GET',
      `${this.getBaseUrl()}/${workflowId}/analytics?${params}`
    );
  }

  /**
   * Search workflows.
   */
  async search(query: string, page: number = 0, size: number = 20): Promise<Workflow[]> {
    const params = new URLSearchParams({ query, page: String(page), size: String(size) });
    const response = await this.makeRequest<WorkflowListResponse>(
      'GET',
      `${this.getBaseUrl()}/search?${params}`
    );
    return response.content || [];
  }

  /**
   * Link an agent to a workflow.
   */
  async linkAgent(workflowId: string, agentId: string): Promise<void> {
    await this.makeRequest<void>(
      'POST',
      `${this.getBaseUrl()}/${workflowId}/agent/${agentId}`
    );
  }

  /**
   * Unlink an agent from a workflow.
   */
  async unlinkAgent(workflowId: string, agentId: string): Promise<void> {
    await this.makeRequest<void>(
      'DELETE',
      `${this.getBaseUrl()}/${workflowId}/agent/${agentId}`
    );
  }
}







