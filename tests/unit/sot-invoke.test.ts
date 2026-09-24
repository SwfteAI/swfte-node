/**
 * agents.chat, workflows.invoke / getExecutionStatus / invokeAndWait, catalog.*
 *
 * Asserts the exact method, URL (agents-service base, not the gateway) and body
 * of every call, plus error mapping and polling termination.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SwfteClient, deriveApiBaseUrl } from '../../src/client';
import {
  APIError,
  AuthenticationError,
  InvalidRequestError,
  RateLimitError,
  WorkflowExecutionError,
  WorkflowTimeoutError,
} from '../../src/errors';
import { classifyExecutionStatus, PAUSED_STATUSES } from '../../src/resources/workflows';
import { WorkflowPausedError } from '../../src/errors';
import { createMockResponse, mockFetch, mockData } from '../setup';

const API = 'https://api.swfte.com/agents';

function call(i: number): { url: string; init: RequestInit; body: unknown } {
  const [url, init] = mockFetch.mock.calls[i] as [string, RequestInit];
  return { url, init, body: init.body ? JSON.parse(init.body as string) : undefined };
}

function headersOf(init: RequestInit): Record<string, string> {
  return init.headers as Record<string, string>;
}

function statusBody(status: string, extra: Record<string, unknown> = {}) {
  return {
    execution: { executionId: 'ex_1', workflowId: 'wf_1', status, ...extra },
    nodeExecutions: [],
    progress: status === 'RUNNING' ? 50 : 100,
  };
}

describe('base URL resolution', () => {
  afterEach(() => {
    delete process.env.SWFTE_API_BASE_URL;
  });

  it('derives the agents-service root from the default gateway URL', () => {
    const c = new SwfteClient({ apiKey: mockData.apiKey });
    expect(c.baseUrl).toBe('https://api.swfte.com/agents/v2/gateway');
    expect(c.apiBaseUrl).toBe(API);
  });

  it('strips /v1/gateway and /v2/gateway (with or without trailing slash)', () => {
    expect(deriveApiBaseUrl('http://localhost:8080/v2/gateway')).toBe('http://localhost:8080');
    expect(deriveApiBaseUrl('https://x.test/agents/v1/gateway/')).toBe('https://x.test/agents');
    expect(deriveApiBaseUrl('https://proxy.test/agents')).toBe('https://proxy.test/agents');
  });

  it('honours an explicit apiBaseUrl over the derived one', () => {
    const c = new SwfteClient({ apiKey: mockData.apiKey, apiBaseUrl: 'http://localhost:8080/' });
    expect(c.apiBaseUrl).toBe('http://localhost:8080');
    expect(c.baseUrl).toBe('https://api.swfte.com/agents/v2/gateway');
  });

  it('reads SWFTE_API_BASE_URL when no apiBaseUrl is passed', () => {
    process.env.SWFTE_API_BASE_URL = 'https://staging.test/agents';
    const c = new SwfteClient({ apiKey: mockData.apiKey });
    expect(c.apiBaseUrl).toBe('https://staging.test/agents');
  });

  it('existing resources follow apiBaseUrl too', async () => {
    const c = new SwfteClient({ apiKey: mockData.apiKey, apiBaseUrl: 'http://local:1' });
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'wf_1', name: 'x' }));
    await c.workflows.get('wf_1');
    expect(call(0).url).toBe('http://local:1/v2/workflows/wf_1');
  });
});

describe('agents.chat', () => {
  let client: SwfteClient;
  beforeEach(() => {
    mockFetch.mockReset();
    client = new SwfteClient({ apiKey: 'pat_abc', workspaceId: 'ws_9' });
  });

  it('POSTs {message} to /v1/agents/{id}/chat/{userId} with auth + workspace headers', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ response: 'Hi there', conversationId: 'conv_1', agentId: 'ag_1' })
    );
    const reply = await client.agents.chat('ag_1', 'Hello', { userId: 'user-42' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const { url, init, body } = call(0);
    expect(url).toBe(`${API}/v1/agents/ag_1/chat/user-42`);
    expect(init.method).toBe('POST');
    expect(body).toEqual({ message: 'Hello' });
    expect(headersOf(init).Authorization).toBe('Bearer pat_abc');
    expect(headersOf(init)['X-Workspace-ID']).toBe('ws_9');
    expect(reply.response).toBe('Hi there');
    expect(reply.conversationId).toBe('conv_1');
  });

  it('defaults userId to "sdk-user" and forwards conversationId', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ response: 'again', conversationId: 'conv_1' }));
    await client.agents.chat('ag_1', 'More', { conversationId: 'conv_1' });
    const { url, body } = call(0);
    expect(url).toBe(`${API}/v1/agents/ag_1/chat/sdk-user`);
    expect(body).toEqual({ message: 'More', conversationId: 'conv_1' });
  });

  it('normalises a `content` reply into `response`', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ content: 'from content', conversationId: 'c' }));
    const reply = await client.agents.chat('ag_1', 'x');
    expect(reply.response).toBe('from content');
    expect(reply.content).toBe('from content');
  });

  it('URL-encodes path segments', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ response: 'ok' }));
    await client.agents.chat('ag/1', 'x', { userId: 'a b@c' });
    expect(call(0).url).toBe(`${API}/v1/agents/ag%2F1/chat/a%20b%40c`);
  });

  it('maps errors and does not retry', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'AGENT_EXECUTION_FAILED' }, { status: 503 }));
    const err = await client.agents.chat('ag_1', 'x').catch(e => e);
    expect(err).toBeInstanceOf(APIError);
    expect(err.status).toBe(503);
    expect(err.body).toEqual({ error: 'AGENT_EXECUTION_FAILED' });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockFetch.mockResolvedValueOnce(createMockResponse({}, { status: 401 }));
    await expect(client.agents.chat('ag_1', 'x')).rejects.toBeInstanceOf(AuthenticationError);
    mockFetch.mockResolvedValueOnce(createMockResponse({}, { status: 429 }));
    await expect(client.agents.chat('ag_1', 'x')).rejects.toBeInstanceOf(RateLimitError);
  });

  it('rejects an empty message without calling the API', async () => {
    await expect(client.agents.chat('ag_1', '')).rejects.toBeInstanceOf(InvalidRequestError);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('workflows.invoke / getExecutionStatus / invokeAndWait', () => {
  let client: SwfteClient;
  beforeEach(() => {
    mockFetch.mockReset();
    client = new SwfteClient({ apiKey: 'sk-swfte-k' });
  });

  it('invoke POSTs the inputs to /v2/workflows/{id}/invoke', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ executionId: 'ex_1', workflowId: 'wf_1', status: 'PENDING' }, { status: 202 })
    );
    const res = await client.workflows.invoke('wf_1', { topic: 'x', n: 2 });
    const { url, init, body } = call(0);
    expect(url).toBe(`${API}/v2/workflows/wf_1/invoke`);
    expect(init.method).toBe('POST');
    expect(body).toEqual({ topic: 'x', n: 2 });
    expect(headersOf(init).Authorization).toBe('Bearer sk-swfte-k');
    expect(res.executionId).toBe('ex_1');
  });

  it('invoke sends {} when no inputs are given', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ executionId: 'ex_1' }, { status: 202 }));
    await client.workflows.invoke('wf_1');
    expect(call(0).body).toEqual({});
  });

  it('invoke surfaces 409 (never published) as APIError and does not retry', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ error: 'PUBLISHED_SNAPSHOT_UNAVAILABLE' }, { status: 409 })
    );
    const err = await client.workflows.invoke('wf_1', {}).catch(e => e);
    expect(err).toBeInstanceOf(APIError);
    expect(err.status).toBe(409);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('invoke rejects a response without executionId', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'PENDING' }, { status: 202 }));
    await expect(client.workflows.invoke('wf_1')).rejects.toBeInstanceOf(APIError);
  });

  it('getExecutionStatus GETs the status path and lifts the nested record', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse(statusBody('success', { outputData: { answer: 42 } }))
    );
    const st = await client.workflows.getExecutionStatus('ex_1');
    const { url, init } = call(0);
    expect(url).toBe(`${API}/v2/workflows/executions/ex_1/status`);
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(st.status).toBe('SUCCESS');
    expect(st.executionId).toBe('ex_1');
    expect(st.workflowId).toBe('wf_1');
    expect(st.outputs).toEqual({ answer: 42 });
    expect(st.progress).toBe(100);
  });

  it('classifies both success spellings and both cancel spellings', () => {
    for (const s of ['SUCCESS', 'SUCCEEDED', 'COMPLETED', 'succeeded']) {
      expect(classifyExecutionStatus(s)).toBe('succeeded');
    }
    for (const s of ['FAILED', 'TIMEOUT', 'ERROR']) expect(classifyExecutionStatus(s)).toBe('failed');
    for (const s of ['CANCELLED', 'CANCELED']) expect(classifyExecutionStatus(s)).toBe('cancelled');
    for (const s of ['PENDING', 'RUNNING', '', undefined]) {
      expect(classifyExecutionStatus(s)).toBe('running');
    }
  });

  it('invokeAndWait polls until SUCCEEDED and returns the final status', async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ executionId: 'ex_1' }, { status: 202 }))
      .mockResolvedValueOnce(createMockResponse(statusBody('PENDING')))
      .mockResolvedValueOnce(createMockResponse(statusBody('RUNNING')))
      .mockResolvedValueOnce(createMockResponse(statusBody('SUCCEEDED', { outputData: { ok: true } })));

    const done = await client.workflows.invokeAndWait('wf_1', { a: 1 }, { pollIntervalMs: 1, timeoutMs: 5000 });
    expect(done.status).toBe('SUCCEEDED');
    expect(done.outputs).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(call(0).url).toBe(`${API}/v2/workflows/wf_1/invoke`);
    expect(call(0).body).toEqual({ a: 1 });
    for (const i of [1, 2, 3]) {
      expect(call(i).url).toBe(`${API}/v2/workflows/executions/ex_1/status`);
      expect(call(i).init.method).toBe('GET');
    }
  });

  it('invokeAndWait throws WorkflowExecutionError on FAILED with the error message', async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ executionId: 'ex_1' }, { status: 202 }))
      .mockResolvedValueOnce(
        createMockResponse(statusBody('FAILED', { errorInfo: { message: 'node llm_1 exploded' } }))
      );
    const err = await client.workflows
      .invokeAndWait('wf_1', {}, { pollIntervalMs: 1 })
      .catch(e => e);
    expect(err).toBeInstanceOf(WorkflowExecutionError);
    expect(err.status).toBe('FAILED');
    expect(err.executionId).toBe('ex_1');
    expect(err.message).toContain('node llm_1 exploded');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('invokeAndWait throws WorkflowExecutionError on CANCELED', async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ executionId: 'ex_1' }, { status: 202 }))
      .mockResolvedValueOnce(createMockResponse(statusBody('CANCELED')));
    const err = await client.workflows.invokeAndWait('wf_1', {}, { pollIntervalMs: 1 }).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowExecutionError);
    expect(err.status).toBe('CANCELED');
  });

  it('invokeAndWait stops at the deadline with WorkflowTimeoutError', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ executionId: 'ex_1' }, { status: 202 }));
    mockFetch.mockImplementation(async () => createMockResponse(statusBody('RUNNING')));
    const started = Date.now();
    const err = await client.workflows
      .invokeAndWait('wf_1', {}, { timeoutMs: 60, pollIntervalMs: 10 })
      .catch(e => e);
    expect(err).toBeInstanceOf(WorkflowTimeoutError);
    expect(err.executionId).toBe('ex_1');
    expect(Date.now() - started).toBeLessThan(2000);
    // Polled at least once, and a bounded number of times.
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockFetch.mock.calls.length).toBeLessThan(20);
  });

  it('invokeAndWait with timeoutMs 0 still polls once', async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ executionId: 'ex_1' }, { status: 202 }))
      .mockResolvedValueOnce(createMockResponse(statusBody('SUCCESS')));
    const done = await client.workflows.invokeAndWait('wf_1', {}, { timeoutMs: 0 });
    expect(done.status).toBe('SUCCESS');
  });

  it('a status poll error propagates instead of looping', async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ executionId: 'ex_1' }, { status: 202 }))
      .mockResolvedValueOnce(createMockResponse({ error: 'nope' }, { status: 404 }));
    const err = await client.workflows.invokeAndWait('wf_1', {}, { pollIntervalMs: 1 }).catch(e => e);
    expect(err).toBeInstanceOf(APIError);
    expect(err.status).toBe(404);
  });

  it('execute() still targets the draft /execute path', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ executionId: 'ex_2' }));
    await client.workflows.execute('wf_1', { a: 1 });
    expect(call(0).url).toBe(`${API}/v2/workflows/wf_1/execute`);
  });
});

describe('catalog', () => {
  let client: SwfteClient;
  beforeEach(() => {
    mockFetch.mockReset();
    client = new SwfteClient({ apiKey: 'pat_x', workspaceId: 'ws_1' });
  });

  it('search GETs /v2/catalog/search with comma-joined kinds and skips empty params', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ items: [{ catalogRef: 'workflow:wf_1' }], nextCursor: 'c2', degraded: ['jev_rerank'] })
    );
    const res = await client.catalog.search({
      q: 'invoice triage',
      kinds: ['workflow', 'agent'],
      scope: 'all',
      minEvidence: 'corroborated',
      limit: 5,
    });
    const { url, init } = call(0);
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    const u = new URL(url);
    expect(`${u.origin}${u.pathname}`).toBe(`${API}/v2/catalog/search`);
    expect(Object.fromEntries(u.searchParams)).toEqual({
      q: 'invoice triage',
      kinds: 'workflow,agent',
      scope: 'all',
      minEvidence: 'corroborated',
      limit: '5',
    });
    expect(res.items).toHaveLength(1);
    expect(res.nextCursor).toBe('c2');
    expect(res.degraded).toEqual(['jev_rerank']);
  });

  it('search with no params hits the bare path and fills defaults', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}));
    const res = await client.catalog.search();
    expect(call(0).url).toBe(`${API}/v2/catalog/search`);
    expect(res).toEqual({ items: [], nextCursor: null, degraded: [] });
  });

  it('get GETs /v2/catalog/{kind}/{id}', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ catalogRef: 'mcp-server:m 1' }));
    await client.catalog.get('mcp-server', 'm 1');
    expect(call(0).url).toBe(`${API}/v2/catalog/mcp-server/m%201`);
    expect(call(0).init.method).toBe('GET');
  });

  it('contract GETs /v2/catalog/{kind}/{id}/contract', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        catalogRef: 'workflow:wf_1',
        invoke: { method: 'POST', path: '/v2/workflows/wf_1/invoke', auth: 'pat', async: true, statusPath: '/v2/workflows/executions/{executionId}/status' },
      })
    );
    const c = await client.catalog.contract('workflow', 'wf_1');
    expect(call(0).url).toBe(`${API}/v2/catalog/workflow/wf_1/contract`);
    expect(headersOf(call(0).init)['X-Workspace-ID']).toBe('ws_1');
    expect(c.invoke.path).toBe('/v2/workflows/wf_1/invoke');
  });

  it('404 maps to APIError', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'not found' }, { status: 404 }));
    const err = await client.catalog.get('workflow', 'nope').catch(e => e);
    expect(err).toBeInstanceOf(APIError);
    expect(err.status).toBe(404);
  });
});

/* ── battle-test regressions (BATTLE_TEST.md N5, N12, N13) ─────────────── */

describe('BT-N5 invokeAndWait on a human-in-the-loop workflow returns early, typed as paused', () => {
  let client: SwfteClient;
  beforeEach(() => {
    client = new SwfteClient({ apiKey: mockData.apiKey });
  });

  it('PAUSED / WAITING_FOR_INPUT classify as paused, not running', () => {
    for (const s of ['PAUSED', 'WAITING_FOR_INPUT', 'AWAITING_HUMAN', 'awaiting_input', 'WAITING']) {
      expect(classifyExecutionStatus(s)).toBe('paused');
    }
    expect(PAUSED_STATUSES).toContain('WAITING_FOR_INPUT');
  });

  it('returns promptly with paused:true and the waiting node instead of burning the timeout (WAITING_FOR_INPUT)', async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ executionId: 'ex_1' }, { status: 202 }))
      .mockResolvedValueOnce(createMockResponse(statusBody('RUNNING')))
      .mockResolvedValueOnce(
        createMockResponse({
          ...statusBody('WAITING_FOR_INPUT'),
          nodeExecutions: [
            { nodeId: 'start', nodeType: 'START', status: 'SUCCEEDED' },
            { nodeId: 'approve_1', nodeType: 'HUMAN_INPUT', status: 'PAUSED', pauseReason: 'HumanInputRequired' },
          ],
        })
      );
    const started = Date.now();
    const res = await client.workflows.invokeAndWait('wf_1', {}, { pollIntervalMs: 1, timeoutMs: 300000 });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(res.paused).toBe(true);
    expect(res.outcome).toBe('paused');
    expect(res.status).toBe('WAITING_FOR_INPUT');
    expect(res.executionId).toBe('ex_1');
    expect(res.waitingFor).toEqual([{ nodeId: 'approve_1', nodeType: 'HUMAN_INPUT', status: 'PAUSED', reason: 'HumanInputRequired' }]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('the backend spelling PAUSED is paused too; a success carries paused:false', async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ executionId: 'ex_1' }, { status: 202 }))
      .mockResolvedValueOnce(createMockResponse(statusBody('PAUSED')));
    const res = await client.workflows.invokeAndWait('wf_1', {}, { pollIntervalMs: 1 });
    expect(res.paused).toBe(true);
    expect(res.waitingFor).toEqual([]);

    mockFetch
      .mockResolvedValueOnce(createMockResponse({ executionId: 'ex_2' }, { status: 202 }))
      .mockResolvedValueOnce(createMockResponse(statusBody('SUCCEEDED')));
    const ok = await client.workflows.invokeAndWait('wf_1', {}, { pollIntervalMs: 1 });
    expect(ok.paused).toBe(false);
    expect(ok.outcome).toBe('succeeded');
  });

  it('throwOnPause: true raises WorkflowPausedError carrying the executionId', async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ executionId: 'ex_1' }, { status: 202 }))
      .mockResolvedValueOnce(createMockResponse(statusBody('WAITING_FOR_INPUT')));
    const err = await client.workflows.invokeAndWait('wf_1', {}, { pollIntervalMs: 1, throwOnPause: true }).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowPausedError);
    expect(err.executionId).toBe('ex_1');
    expect(err.status).toBe('WAITING_FOR_INPUT');
  });

  it('waitForCompletion returns early on a pause too', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(statusBody('PAUSED')));
    const res = await client.workflows.waitForCompletion('ex_1', 300000, 1);
    expect(res.paused).toBe(true);
  });
});

describe('BT-N12 agent chat prefers the canonical content over legacy response', () => {
  it('content wins when both are present', async () => {
    const client = new SwfteClient({ apiKey: mockData.apiKey });
    mockFetch.mockResolvedValueOnce(createMockResponse({ content: 'A', response: 'B', conversationId: 'c' }));
    const reply = await client.agents.chat('ag_1', 'hi');
    expect(reply.response).toBe('A');
    expect(reply.content).toBe('A');
  });
});

describe('BT-N13 deriveApiBaseUrl strips a bare trailing /gateway like the Python SDK', () => {
  it('https://x/agents/gateway -> https://x/agents', () => {
    expect(deriveApiBaseUrl('https://x/agents/gateway')).toBe('https://x/agents');
    expect(deriveApiBaseUrl('https://x/agents/gateway/')).toBe('https://x/agents');
    expect(deriveApiBaseUrl('https://x/gateways')).toBe('https://x/gateways');
  });
});
