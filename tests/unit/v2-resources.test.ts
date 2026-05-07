/**
 * Unit tests for the V2 resource clients (chatflows, datasets, documents,
 * files, rag, mcp, modules, marketplace, voice calls, audit, cost control,
 * agent wizard, conversations V2).
 *
 * These tests mock global fetch (configured in tests/setup.ts) and assert that
 * each resource calls the expected URL + HTTP method + body.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SwfteClient } from '../../src/client';
import { createMockResponse, mockFetch, mockData } from '../setup';

function lastCallUrl(): string {
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1][0] as string;
}

function lastCallInit(): RequestInit {
  const calls = mockFetch.mock.calls;
  return calls[calls.length - 1][1] as RequestInit;
}

function lastCallBody(): unknown {
  const init = lastCallInit();
  if (!init.body) return undefined;
  return JSON.parse(init.body as string);
}

describe('V2 resource clients', () => {
  let client: SwfteClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new SwfteClient({
      apiKey: mockData.apiKey,
      workspaceId: mockData.workspaceId,
    });
  });

  // ------------------------------------------------------------------
  // ChatFlows
  // ------------------------------------------------------------------
  describe('chatflows', () => {
    it('create posts to /v2/chatflows', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'cf_1', name: 'Lead' }));
      const flow = await client.chatflows.create({ name: 'Lead' });

      expect(flow.id).toBe('cf_1');
      expect(lastCallUrl()).toMatch(/\/v2\/chatflows$/);
      expect(lastCallInit().method).toBe('POST');
      expect(lastCallBody()).toEqual({ name: 'Lead' });
    });

    it('get fetches by id', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'cf_1', name: 'Lead' }));
      await client.chatflows.get('cf_1');
      expect(lastCallUrl()).toContain('/v2/chatflows/cf_1');
      expect(lastCallInit().method).toBe('GET');
    });

    it('update sends PUT with body', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'cf_1', name: 'New' }));
      await client.chatflows.update('cf_1', { name: 'New' });
      expect(lastCallInit().method).toBe('PUT');
      expect(lastCallBody()).toEqual({ name: 'New' });
    });

    it('delete sends DELETE', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, { status: 204 }));
      await client.chatflows.delete('cf_1');
      expect(lastCallInit().method).toBe('DELETE');
    });

    it('validate posts to validate endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ valid: true }));
      const r = await client.chatflows.validate('cf_1');
      expect(r.valid).toBe(true);
      expect(lastCallUrl()).toContain('/v2/chatflows/cf_1/validate');
    });

    it('builder.fieldTypes hits builder/field-types', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([{ value: 'TEXT', label: 'Text' }]));
      await client.chatflows.builder.fieldTypes();
      expect(lastCallUrl()).toContain('/v2/chatflows/builder/field-types');
    });

    it('versions.create POSTs to versions endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ version: 1 }));
      await client.chatflows.versions.create('cf_1', { note: 'first' });
      expect(lastCallUrl()).toContain('/v2/chatflows/cf_1/versions');
      expect(lastCallInit().method).toBe('POST');
    });

    it('publish targets /publish', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ publicationId: 'pub_1' }));
      await client.chatflows.publish('cf_1', { visibility: 'WORKSPACE' });
      expect(lastCallUrl()).toContain('/v2/chatflows/cf_1/publish');
    });

    it('startSession posts to /sessions', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ sessionId: 's1' }));
      await client.chatflows.startSession('cf_1', { channel: 'web' });
      expect(lastCallUrl()).toContain('/v2/chatflows/cf_1/sessions');
      expect(lastCallInit().method).toBe('POST');
    });
  });

  // ------------------------------------------------------------------
  // Agent Wizard
  // ------------------------------------------------------------------
  describe('agentWizard', () => {
    it('generate posts a prompt', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ draftId: 'dr_1' }));
      const draft = await client.agentWizard.generate({ prompt: 'Onboarding bot' });

      expect(draft.draftId).toBe('dr_1');
      expect(lastCallUrl()).toContain('/v2/agents/wizard/generate');
      expect(lastCallBody()).toEqual({ prompt: 'Onboarding bot' });
    });

    it('listTemplates is GET', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([{ name: 'support' }]));
      await client.agentWizard.listTemplates();
      expect(lastCallUrl()).toContain('/v2/agents/wizard/templates');
      expect(lastCallInit().method).toBe('GET');
    });

    it('linkTools POSTs the link payload', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ ok: true }));
      await client.agentWizard.linkTools('ag_1', ['tool_a', 'tool_b']);
      expect(lastCallUrl()).toContain('/v2/agents/wizard/link-tools');
      expect(lastCallBody()).toEqual({ agentId: 'ag_1', toolIds: ['tool_a', 'tool_b'] });
    });

    it('fromTemplate URL-encodes the template name', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ draftId: 'dr_2' }));
      await client.agentWizard.fromTemplate('customer support');
      expect(lastCallUrl()).toContain('/v2/agents/wizard/from-template/customer%20support');
    });
  });

  // ------------------------------------------------------------------
  // Datasets
  // ------------------------------------------------------------------
  describe('datasets', () => {
    it('list hits GET /api/v2/datasets', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([{ id: 'ds_1', name: 'KB' }]));
      await client.datasets.list();
      expect(lastCallUrl()).toContain('/api/v2/datasets');
      expect(lastCallInit().method).toBe('GET');
    });

    it('useCheck hits use-check endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ inUse: true, agents: [], chatflows: [], workflows: [] }));
      await client.datasets.useCheck('ds_1');
      expect(lastCallUrl()).toContain('/api/v2/datasets/ds_1/use-check');
    });

    it('setApiAccess pathifies the status', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'ds_1', apiAccess: 'enabled' }));
      await client.datasets.setApiAccess('ds_1', 'enabled');
      expect(lastCallUrl()).toContain('/api/v2/datasets/ds_1/api-access/enabled');
      expect(lastCallInit().method).toBe('POST');
    });
  });

  // ------------------------------------------------------------------
  // Documents
  // ------------------------------------------------------------------
  describe('documents', () => {
    it('create posts batch to documents endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ documents: [{ id: 'd1' }] }));
      await client.documents.create('ds_1', {
        documents: [{ name: 'a', source: 'INLINE', content: 'hi' }],
      });
      expect(lastCallUrl()).toContain('/api/v2/datasets/ds_1/documents');
      expect(lastCallInit().method).toBe('POST');
    });

    it('segments fetches /segments', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.documents.segments('ds_1', 'd1');
      expect(lastCallUrl()).toContain('/api/v2/datasets/ds_1/documents/d1/segments');
    });

    it('batchUpdate sends PATCH on /batch', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ batchId: 'b1' }));
      await client.documents.batchUpdate('ds_1', [{ id: 'd1', enabled: true }]);
      expect(lastCallUrl()).toContain('/api/v2/datasets/ds_1/documents/batch');
      expect(lastCallInit().method).toBe('PATCH');
    });
  });

  // ------------------------------------------------------------------
  // Files
  // ------------------------------------------------------------------
  describe('files', () => {
    it('config GETs the upload config', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ maxBytes: 1000, allowedContentTypes: [] }));
      await client.files.config();
      expect(lastCallUrl()).toContain('/api/v2/files/config');
    });

    it('list paginates', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.files.list({ page: 1, size: 25 });
      expect(lastCallUrl()).toMatch(/page=1/);
      expect(lastCallUrl()).toMatch(/size=25/);
    });

    it('upload sends multipart FormData', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'f1', name: 'a.txt' }));
      await client.files.upload({ name: 'a.txt', contentType: 'text/plain', data: 'hello' });
      expect(lastCallUrl()).toContain('/api/v2/files/upload');
      expect(lastCallInit().method).toBe('POST');
      expect(lastCallInit().body).toBeInstanceOf(FormData);
    });

    it('updateUsage uses PUT', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'f1' }));
      await client.files.updateUsage('f1', { usage: 'DATASET', resourceId: 'ds_1' });
      expect(lastCallUrl()).toContain('/api/v2/files/f1/usage');
      expect(lastCallInit().method).toBe('PUT');
    });
  });

  // ------------------------------------------------------------------
  // RAG
  // ------------------------------------------------------------------
  describe('rag', () => {
    it('search posts the query', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ results: [], strategy: 'HYBRID' }));
      await client.rag.search({ query: 'hello', datasetIds: ['ds_1'], topK: 3 });

      expect(lastCallUrl()).toContain('/v2/rag/search');
      expect(lastCallBody()).toEqual({ query: 'hello', datasetIds: ['ds_1'], topK: 3 });
    });

    it('rerank posts documents', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ results: [], model: 'cohere:rerank-v3' }));
      await client.rag.rerank({ query: 'q', documents: ['a', 'b'], topN: 1 });
      expect(lastCallUrl()).toContain('/v2/rag/rerank');
    });

    it('embeddingModels GETs models endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.rag.embeddingModels();
      expect(lastCallUrl()).toContain('/v2/rag/models/embeddings');
    });

    it('buildVocabulary POSTs', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ jobId: 'j1' }));
      await client.rag.buildVocabulary({ datasetIds: ['ds_1'] });
      expect(lastCallUrl()).toContain('/v2/rag/vocabulary/build');
      expect(lastCallInit().method).toBe('POST');
    });
  });

  // ------------------------------------------------------------------
  // MCP
  // ------------------------------------------------------------------
  describe('mcp', () => {
    it('connect posts a server config', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ providerId: 'p1', name: 'GitHub MCP', transport: 'STREAMABLE_HTTP' }));
      await client.mcp.connect({ name: 'GitHub MCP', transport: 'STREAMABLE_HTTP', url: 'https://m.example' });
      expect(lastCallUrl()).toContain('/api/v2/mcp/servers/connect');
      expect((lastCallBody() as Record<string, unknown>).name).toBe('GitHub MCP');
    });

    it('disconnect deletes by providerId', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, { status: 204 }));
      await client.mcp.disconnect('p1');
      expect(lastCallUrl()).toContain('/api/v2/mcp/servers/p1');
      expect(lastCallInit().method).toBe('DELETE');
    });

    it('executeTool posts input under /execute', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ toolId: 't1', status: 'OK', output: { ok: true } }));
      await client.mcp.executeTool('t1', { arg: 1 });
      expect(lastCallUrl()).toContain('/api/v2/mcp/tools/t1/execute');
      expect((lastCallBody() as Record<string, unknown>).input).toEqual({ arg: 1 });
    });

    it('batchExecute hits batch-execute', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ results: [] }));
      await client.mcp.batchExecute([{ toolId: 't1', input: {} }]);
      expect(lastCallUrl()).toContain('/api/v2/mcp/tools/batch-execute');
    });
  });

  // ------------------------------------------------------------------
  // Modules
  // ------------------------------------------------------------------
  describe('modules', () => {
    it('addResource posts to /resources', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'mod_1' }));
      await client.modules.addResource('mod_1', { resourceType: 'AGENT', resourceId: 'ag_1' });
      expect(lastCallUrl()).toContain('/v2/modules/mod_1/resources');
      expect((lastCallBody() as Record<string, unknown>).resourceType).toBe('AGENT');
    });

    it('build posts the strategy', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ buildId: 'b1', status: 'PENDING' }));
      await client.modules.build('mod_1', { strategy: 'FULL' });
      expect(lastCallUrl()).toContain('/v2/modules/mod_1/build');
    });

    it('versionQa GETs the qa endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ tests: [] }));
      await client.modules.versionQa('mod_1', 2);
      expect(lastCallUrl()).toContain('/v2/modules/mod_1/versions/2/qa');
    });
  });

  // ------------------------------------------------------------------
  // Marketplace
  // ------------------------------------------------------------------
  describe('marketplace', () => {
    it('list passes query string', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.marketplace.list({ category: 'support', page: 1, size: 10 });
      expect(lastCallUrl()).toMatch(/category=support/);
      expect(lastCallUrl()).toMatch(/size=10/);
    });

    it('install posts under publication', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ installationId: 'ins_1', publicationId: 'pub_1', installedAt: 'x' }));
      await client.marketplace.install('pub_1');
      expect(lastCallUrl()).toContain('/v2/marketplace/pub_1/install');
      expect(lastCallInit().method).toBe('POST');
    });

    it('uninstall deletes by id', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, { status: 204 }));
      await client.marketplace.uninstall('ins_1');
      expect(lastCallUrl()).toContain('/v2/marketplace/installations/ins_1');
      expect(lastCallInit().method).toBe('DELETE');
    });
  });

  // ------------------------------------------------------------------
  // Voice Calls
  // ------------------------------------------------------------------
  describe('voiceCalls', () => {
    it('inProgress GETs the live endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.voiceCalls.inProgress();
      expect(lastCallUrl()).toContain('/v2/voice/calls/in-progress');
    });

    it('transcript hits the per-call transcript URL', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ turns: [] }));
      await client.voiceCalls.transcript('CA1');
      expect(lastCallUrl()).toContain('/v2/voice/calls/CA1/transcript');
    });

    it('forChatflow scopes to a chatflow', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.voiceCalls.forChatflow('cf_1', { status: 'COMPLETED' });
      expect(lastCallUrl()).toContain('/v2/chatflows/cf_1/calls');
      expect(lastCallUrl()).toMatch(/status=COMPLETED/);
    });
  });

  // ------------------------------------------------------------------
  // Audit
  // ------------------------------------------------------------------
  describe('audit', () => {
    it('listEvents builds a query string', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ events: [] }));
      await client.audit.listEvents({ actorId: 'u1', actionType: 'AGENT_UPDATE' });
      expect(lastCallUrl()).toContain('/v2/audit/events');
      expect(lastCallUrl()).toMatch(/actorId=u1/);
      expect(lastCallUrl()).toMatch(/actionType=AGENT_UPDATE/);
    });

    it('resourceEvents nests path segments', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ events: [] }));
      await client.audit.resourceEvents('AGENT', 'ag_1');
      expect(lastCallUrl()).toContain('/v2/audit/events/AGENT/ag_1');
    });

    it('myEvents hits /me', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ events: [] }));
      await client.audit.myEvents({ days: 7 });
      expect(lastCallUrl()).toContain('/v2/audit/events/me');
    });
  });

  // ------------------------------------------------------------------
  // Cost Control
  // ------------------------------------------------------------------
  describe('costControl', () => {
    it('createRoutingRule posts the rule', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ruleId: 'r1', name: 'Down', matchModel: 'a', fallbackModel: 'b', predicate: { kind: 'COST_USD_GT', value: 1 }, enabled: true,
      }));
      await client.costControl.createRoutingRule({
        name: 'Down', matchModel: 'a', fallbackModel: 'b', predicate: { kind: 'COST_USD_GT', value: 1 },
      });
      expect(lastCallUrl()).toContain('/v2/cost-control/routing-rules');
      expect(lastCallInit().method).toBe('POST');
    });

    it('toggleRoutingRule patches with enabled flag', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ruleId: 'r1', name: '', matchModel: '', fallbackModel: '', predicate: { kind: 'COST_USD_GT', value: 0 }, enabled: false,
      }));
      await client.costControl.toggleRoutingRule('r1', false);
      expect(lastCallUrl()).toContain('/v2/cost-control/routing-rules/r1/toggle');
      expect(lastCallInit().method).toBe('PATCH');
      expect(lastCallBody()).toEqual({ enabled: false });
    });

    it('setWorkspaceCap PUTs to /workspace', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ scope: 'WORKSPACE' }));
      await client.costControl.setWorkspaceCap({ monthlyUsdCap: 500 });
      expect(lastCallUrl()).toContain('/v2/cost-control/usage-caps/workspace');
      expect(lastCallInit().method).toBe('PUT');
    });

    it('setModelCap embeds model id in the path', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ scope: 'MODEL' }));
      await client.costControl.setModelCap('openai:gpt-4', { dailyUsdCap: 50 });
      expect(lastCallUrl()).toContain('/v2/cost-control/usage-caps/model/openai%3Agpt-4');
    });

    it('scaling fetches per-deployment config', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ deploymentId: 'd1', minReplicas: 0, maxReplicas: 1 }));
      await client.costControl.scaling('d1');
      expect(lastCallUrl()).toContain('/v2/cost-control/scaling/d1');
    });
  });

  // ------------------------------------------------------------------
  // Conversations V2
  // ------------------------------------------------------------------
  describe('conversationsV2', () => {
    it('initiate posts payload', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ conversationId: 'c1', status: 'STARTING' }));
      await client.conversationsV2.initiate({ channel: 'VOICE', to: '+15551234567' });
      expect(lastCallUrl()).toContain('/v2/conversations/initiate');
      expect((lastCallBody() as Record<string, unknown>).channel).toBe('VOICE');
    });

    it('terminate hits /terminate', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ conversationId: 'c1', status: 'TERMINATED' }));
      await client.conversationsV2.terminate('c1', 'manual');
      expect(lastCallUrl()).toContain('/v2/conversations/c1/terminate');
      expect(lastCallBody()).toEqual({ reason: 'manual' });
    });

    it('cancelRetries hits /cancel-retries', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ cancelled: 2 }));
      await client.conversationsV2.cancelRetries('c1');
      expect(lastCallUrl()).toContain('/v2/conversations/c1/cancel-retries');
      expect(lastCallInit().method).toBe('POST');
    });
  });

  // ------------------------------------------------------------------
  // Auth header propagation
  // ------------------------------------------------------------------
  describe('auth headers', () => {
    it('includes Authorization and Workspace headers on every V2 call', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));
      await client.audit.listEvents();

      const init = lastCallInit();
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Bearer ${mockData.apiKey}`);
      expect(headers['X-Workspace-ID']).toBe(mockData.workspaceId);
    });
  });
});
