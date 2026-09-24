import type { SwfteClient } from '../client';
import {
  APIError,
  InvalidRequestError,
  WorkflowExecutionError,
  WorkflowTimeoutError,
  WorkflowPausedError,
} from '../errors';

/**
 * Execution status enum
 */
export type ExecutionStatus = 
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'SUCCESS'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'CANCELED';

/** Statuses that mean the run finished successfully (the backend has used all three spellings). */
export const SUCCESS_STATUSES: readonly string[] = ['SUCCESS', 'SUCCEEDED', 'COMPLETED'];
/** Statuses that mean the run finished unsuccessfully. */
export const FAILURE_STATUSES: readonly string[] = ['FAILED', 'ERROR', 'TIMEOUT', 'TIMED_OUT'];
/**
 * Statuses that mean the run is waiting for a person (a HUMAN_INPUT gate) or an
 * external event. agents-service reports `PAUSED`; other surfaces spell it
 * `WAITING_FOR_INPUT` / `AWAITING_HUMAN`. Not terminal, but polling will not
 * move it on by itself, so waiting for it only burns the timeout (BT-N5).
 */
export const PAUSED_STATUSES: readonly string[] = ['PAUSED', 'WAITING_FOR_INPUT', 'WAITING', 'AWAITING_INPUT', 'AWAITING_HUMAN', 'AWAITING_APPROVAL'];

/** Statuses that mean the run was cancelled (both spellings). */
export const CANCELLED_STATUSES: readonly string[] = ['CANCELLED', 'CANCELED'];

/** Where an execution status sits: still running, or which terminal outcome. */
export type ExecutionOutcome = 'running' | 'paused' | 'succeeded' | 'failed' | 'cancelled';

/** Classify a raw execution status string (case-insensitive). Unknown or missing -> `running`. */
export function classifyExecutionStatus(status: string | null | undefined): ExecutionOutcome {
  const s = (status || '').toUpperCase();
  if (SUCCESS_STATUSES.includes(s)) return 'succeeded';
  if (FAILURE_STATUSES.includes(s)) return 'failed';
  if (CANCELLED_STATUSES.includes(s)) return 'cancelled';
  if (PAUSED_STATUSES.includes(s)) return 'paused';
  return 'running';
}

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
 * Response of `POST /v2/workflows/{id}/invoke` (HTTP 202): the run was accepted.
 */
export interface WorkflowInvokeResponse {
  executionId: string;
  workflowId?: string;
  /** Usually `PENDING`. */
  status?: string;
  message?: string;
  billing?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Response of `GET /v2/workflows/executions/{executionId}/status`, normalised.
 *
 * The server nests the record under `execution`; the SDK lifts `executionId`,
 * `status` (upper-cased), `workflowId`, `outputs` and `error` to the top level
 * and keeps everything else as returned.
 */
export interface WorkflowExecutionStatus {
  executionId: string;
  status: ExecutionStatus | string;
  workflowId?: string;
  /** 0..100 when the server reports it. */
  progress?: number;
  /** The raw execution record. */
  execution?: Record<string, unknown>;
  nodeExecutions?: Array<Record<string, unknown>>;
  /** Final outputs (`execution.outputData`) once the run has finished. */
  outputs?: unknown;
  /** Failure message when the run failed. */
  error?: string;
  /** Set by invokeAndWait / waitForCompletion: true when the run stopped to wait for input (see waitingFor). */
  paused?: boolean;
  /** Set by invokeAndWait / waitForCompletion: how the wait ended. */
  outcome?: ExecutionOutcome;
  /** When paused: the node(s) waiting (typically a HUMAN_INPUT gate), from nodeExecutions. */
  waitingFor?: PausedNode[];
  [key: string]: unknown;
}

/**
 * Options for {@link Workflows.invokeAndWait}.
 */
/** A node the paused run is waiting on. */
export interface PausedNode {
  nodeId: string;
  nodeType?: string;
  status: string;
  /** e.g. `HumanInputRequired`. */
  reason?: string;
}

export interface InvokeAndWaitOptions {
  /** Give up after this long (client side; the run keeps going). Default 300000 (5 min). */
  timeoutMs?: number;
  /** Delay between status polls. Default 2000. */
  pollIntervalMs?: number;
  /**
   * A run that pauses for human input (PAUSED / WAITING_FOR_INPUT) resolves at once with
   * `paused: true`, `waitingFor` and the executionId to resume later. true: reject with
   * WorkflowPausedError instead. Default false.
   */
  throwOnPause?: boolean;
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
 * // Production: run the PUBLISHED version and wait for it
 * const result = await client.workflows.invokeAndWait(workflow.id, { message: 'Hello' });
 * console.log(result.status, result.outputs);
 *
 * // Studio-style test run of the current (draft) definition
 * const execution = await client.workflows.execute(workflow.id, { message: 'Hello' });
 * const done = await client.workflows.waitForCompletion(execution.executionId!);
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
    const base = this.client.apiBaseUrl;
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
      ...params,
      name: params.name,
      nodes: params.nodes,
      edges: params.edges || [],
      description: params.description,
      active: params.active ?? true,
      variables: params.variables || {},
      workspaceId: this.client.workspaceId,
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
      ...params,
      name: params.name,
      nodes: params.nodes,
      edges: params.edges || [],
    };

    return this.makeRequest<ValidationResult>('POST', `${this.getBaseUrl()}/validate`, payload);
  }

  /**
   * Run the workflow's CURRENT (editable/draft) definition — Studio's test path.
   *
   * `POST /v2/workflows/{id}/execute`. The server refuses (409
   * `WORKFLOW_NOT_PUBLISHED`) a workflow that has never been published unless
   * the inputs carry `testingFlag: true`. For production calls prefer
   * {@link invoke}, which runs the published snapshot and so is unaffected by
   * unpublished edits.
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
   * Run the workflow's PUBLISHED snapshot — the production path.
   *
   * `POST /v2/workflows/{id}/invoke` with the inputs as the JSON body. The
   * server answers 202 with an `executionId` as soon as the run is queued; poll
   * {@link getExecutionStatus} or use {@link invokeAndWait}. A workflow that was
   * never published answers 409 (`PUBLISHED_SNAPSHOT_UNAVAILABLE`), surfaced as
   * an `APIError` with `status === 409`. `testingFlag` is rejected here (400).
   *
   * Not retried: a retry could start the run twice.
   */
  async invoke(
    workflowId: string,
    inputs: Record<string, unknown> = {}
  ): Promise<WorkflowInvokeResponse> {
    if (!workflowId) throw new InvalidRequestError('workflowId is required');
    const res = await this.client.apiRequest<WorkflowInvokeResponse | null>(
      'POST',
      `/v2/workflows/${encodeURIComponent(workflowId)}/invoke`,
      { body: inputs }
    );
    if (!res || typeof res !== 'object' || !res.executionId) {
      throw new APIError('Invoke response did not include an executionId', 502, res);
    }
    return res;
  }

  /**
   * Read the status of one execution.
   *
   * `GET /v2/workflows/executions/{executionId}/status`. See
   * {@link WorkflowExecutionStatus} for the normalised shape.
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecutionStatus> {
    if (!executionId) throw new InvalidRequestError('executionId is required');
    const raw = await this.client.apiRequest<Record<string, unknown> | null>(
      'GET',
      `/v2/workflows/executions/${encodeURIComponent(executionId)}/status`
    );
    return normaliseExecutionStatus(executionId, raw);
  }

  /**
   * Invoke the published workflow and poll until the run reaches a terminal status.
   *
   * Resolves with the final status when the run succeeds (`SUCCESS`, `SUCCEEDED`
   * or `COMPLETED`). Rejects with `WorkflowExecutionError` when it ends
   * `FAILED`/`TIMEOUT` or `CANCELLED`/`CANCELED` (the final status is on
   * `error.execution`). A run that stops for human input (`PAUSED`,
   * `WAITING_FOR_INPUT`, …) resolves at once with `paused: true`, `outcome:
   * 'paused'` and `waitingFor` (the gate node) — or rejects with
   * `WorkflowPausedError` when `throwOnPause` is set — instead of polling until
   * the timeout. Rejects with `WorkflowTimeoutError` when `timeoutMs` elapses
   * first — the run itself is not cancelled and can still be polled with
   * `error.executionId`.
   */
  async invokeAndWait(
    workflowId: string,
    inputs: Record<string, unknown> = {},
    options: InvokeAndWaitOptions = {}
  ): Promise<WorkflowExecutionStatus> {
    const { executionId } = await this.invoke(workflowId, inputs);
    return this.pollUntilTerminal(executionId, options.timeoutMs ?? 300000, options.pollIntervalMs ?? 2000, Boolean(options.throwOnPause));
  }

  private async pollUntilTerminal(
    executionId: string,
    timeoutMs: number,
    pollIntervalMs: number,
    throwOnPause = false
  ): Promise<WorkflowExecutionStatus> {
    const deadline = Date.now() + Math.max(0, timeoutMs);
    const interval = Math.max(0, pollIntervalMs);
    let last: WorkflowExecutionStatus | undefined;
    // Always poll at least once, even with timeoutMs = 0.
    for (;;) {
      last = await this.getExecutionStatus(executionId);
      const outcome = classifyExecutionStatus(last.status);
      if (outcome === 'succeeded') return { ...last, paused: false, outcome };
      if (outcome === 'paused') {
        // BT-N5: a human-in-the-loop run will not finish by being polled; hand it back now.
        const waitingFor = pausedNodes(last);
        if (throwOnPause) {
          throw new WorkflowPausedError(
            `Execution ${executionId} is waiting for input (${String(last.status)}${waitingFor.length ? ` at ${waitingFor.map(n => n.nodeId).join(', ')}` : ''})`,
            executionId,
            String(last.status),
            waitingFor,
            last
          );
        }
        return { ...last, paused: true, outcome, waitingFor };
      }
      if (outcome === 'failed') {
        throw new WorkflowExecutionError(
          `Execution ${executionId} ${String(last.status).toLowerCase()}${last.error ? `: ${last.error}` : ''}`,
          executionId,
          String(last.status),
          last
        );
      }
      if (outcome === 'cancelled') {
        throw new WorkflowExecutionError(
          `Execution ${executionId} was cancelled`,
          executionId,
          String(last.status),
          last
        );
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new WorkflowTimeoutError(
          `Execution ${executionId} did not finish within ${timeoutMs}ms (last status ${last.status || 'unknown'})`,
          executionId,
          last
        );
      }
      await new Promise(resolve => setTimeout(resolve, Math.min(interval, remaining)));
    }
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
   * Poll an existing execution (from {@link execute} or {@link invoke}) until it
   * finishes. Same terminal rules and errors as {@link invokeAndWait}.
   */
  async waitForCompletion(
    executionId: string,
    timeout: number = 300000,
    pollInterval: number = 5000
  ): Promise<WorkflowExecutionStatus> {
    return this.pollUntilTerminal(executionId, timeout, pollInterval);
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








function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

/** @internal Lift the nested execution record's key fields to the top level. */
/** The node executions a paused run is waiting on (status PAUSED/WAITING…, or a pauseReason). */
export function pausedNodes(status: WorkflowExecutionStatus): PausedNode[] {
  const list = Array.isArray(status.nodeExecutions) ? status.nodeExecutions : [];
  const out: PausedNode[] = [];
  for (const raw of list) {
    const n = asRecord(raw);
    if (!n) continue;
    const st = String(n.status ?? '').toUpperCase();
    const reason = n.pauseReason ?? asRecord(n.outputData)?.pauseReason;
    if (!PAUSED_STATUSES.includes(st) && !reason) continue;
    const id = n.nodeId ?? n.id;
    if (id === undefined || id === null) continue;
    out.push({
      nodeId: String(id),
      ...(n.nodeType ?? n.type ? { nodeType: String(n.nodeType ?? n.type) } : {}),
      status: st || 'PAUSED',
      ...(reason ? { reason: String(reason) } : {}),
    });
  }
  return out;
}

export function normaliseExecutionStatus(
  executionId: string,
  raw: Record<string, unknown> | null | undefined
): WorkflowExecutionStatus {
  const data = asRecord(raw) || {};
  const execution = asRecord(data.execution);
  const pick = (key: string): unknown => (data[key] !== undefined ? data[key] : execution?.[key]);
  const errorInfo = asRecord(execution?.errorInfo);
  const errorRaw =
    data.error ?? errorInfo?.message ?? errorInfo?.errorMessage ?? execution?.errorMessage ?? execution?.error;
  const status = pick('status');
  return {
    ...data,
    executionId: String(pick('executionId') ?? pick('id') ?? executionId),
    status: typeof status === 'string' ? status.toUpperCase() : 'UNKNOWN',
    workflowId: pick('workflowId') as string | undefined,
    outputs: data.outputs ?? execution?.outputData ?? execution?.outputs,
    error:
      errorRaw === undefined || errorRaw === null
        ? undefined
        : typeof errorRaw === 'string'
          ? errorRaw
          : JSON.stringify(errorRaw),
  };
}
