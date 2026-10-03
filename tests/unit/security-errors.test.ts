import { describe, expect, it } from 'vitest';
import { inspect } from 'node:util';
import { SwfteClient } from '../../src/client';
import { APIError, AuthenticationError, InvalidRequestError, RateLimitError, RequestTimeoutError,
  WorkflowExecutionError, WorkflowPausedError, WorkflowTimeoutError } from '../../src/errors';

const KEY = 'opaque-review-"-\\-/-space fixture';
const echo = (key = KEY) => ({ message: `backend refused ${key}`, safe: 'retry in Studio',
  nested: { [key]: [key, 7, false, null] } });
const fetcher = (run: (input: string, init?: RequestInit) => Promise<Response>) =>
  run as unknown as typeof fetch;
const client = (fetch: typeof fetch, key = KEY) => new SwfteClient({ apiKey: key, fetch, maxRetries: 0 });
const response = (value: unknown, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json', ...headers },
});

async function failure(run: () => Promise<unknown>): Promise<any> {
  try { await run(); } catch (error) { return error; }
  throw new Error('positive request unexpectedly succeeded');
}

function privateError(error: unknown, key = KEY) {
  for (const output of [String(error), inspect(error, { depth: 12, showHidden: true, getters: true }), JSON.stringify(error)]) {
    expect(output).not.toContain(key);
    expect(output).not.toContain(encodeURIComponent(key));
    expect(output).not.toContain(encodeURIComponent(key).toLowerCase());
    expect(output).not.toContain(JSON.stringify(key).slice(1, -1));
  }
}

describe('credential-safe failure surfaces', () => {
  it('zeroAttemptsConfigurationMakesOneRealGet503Attempt', async () => {
    let calls = 0;
    const c = client(fetcher(async () => { calls++; return response({ error: 'safe outage' }, 503); }));
    const error = await failure(() => c.request('GET', '/models'));
    expect(error).toBeInstanceOf(APIError);
    expect(error.status).toBe(503);
    expect(calls).toBe(1);
  });

  it('httpErrorsRedactEscapedNestedCredentialsAndPreserveTypedStatus', async () => {
    for (const key of [KEY, 'r5X', '~']) {
      for (const status of [401, 403, 429, 500]) {
        let calls = 0;
        const c = client(fetcher(async () => { calls++; return response(echo(key), status, { 'retry-after': '7' }); }), key);
        const error = await failure(() => c.request('POST', '/chat/completions', {}));
        expect(error).toBeInstanceOf(status === 429 ? RateLimitError : status < 404 ? AuthenticationError : APIError);
        expect(error.status).toBe(status);
        expect(error.message).toContain('backend refused');
        expect(error.message).toContain('retry in Studio');
        if (status === 429) expect(error.retryAfter).toBe(7);
        if (status === 500) {
          expect(error.body.safe).toBe('retry in Studio');
          expect(error.body.nested['[REDACTED]']).toEqual(['[REDACTED]', 7, false, null]);
        }
        privateError(error, key);
        expect(calls).toBe(1);
      }
    }
  });

  it('plainTextHttpFailuresRedactCredentialWithoutDiscardingSafeDetail', async () => {
    const c = client(fetcher(async () => new Response(`safe plain detail ${KEY}`, { status: 409 })));
    const error = await failure(() => c.apiRequest('POST', '/v2/catalog/fixture'));
    expect(error).toBeInstanceOf(APIError);
    expect(error.status).toBe(409);
    expect(error.body).toContain('safe plain detail');
    privateError(error);
  });

  it('replacementMarkerNeverReintroducesLiteralCredentialValue', async () => {
    for (const key of ['E', '*']) {
      const c = client(fetcher(async () => response({ echo: key, safe: 'keep detail' }, 500)), key);
      const error = await failure(() => c.request('POST', '/fixture', {}));
      expect(error).toBeInstanceOf(APIError);
      expect(error.status).toBe(500);
      expect(error.body.echo).toBe(key === 'E' ? '*' : '[REDACTED]');
      expect(error.body.echo).not.toContain(key);
      expect(error.body.safe).toBe('keep detail');
    }
  });

  it('fetchAndParserFailuresPreserveTypeCauseAndDoNotMutateSharedError', async () => {
    const source = Object.assign(new TypeError(`fetch rejected ${KEY}`), { cause: new Error(`cause ${KEY}`),
      detail: echo(), status: 503 });
    const c = client(fetcher(async () => { throw source; }));
    const error = await failure(() => c.request('POST', '/chat/completions', {}));
    expect(error).toBeInstanceOf(TypeError);
    expect(error.name).toBe('TypeError');
    expect(error.cause).toBeInstanceOf(Error);
    expect(error.status).toBe(503);
    expect(error.detail.safe).toBe('retry in Studio');
    expect(source.message).toContain(KEY);
    expect(source.detail.nested[KEY][0]).toBe(KEY);
    privateError(error);
    for (const field of ['json', 'text'] as const) {
      const result = response({}, field === 'text' ? 500 : 200);
      Object.defineProperty(result, field, { value: async () => { throw new SyntaxError(`parser ${KEY}`); } });
      const parserError = await failure(() => client(fetcher(async () => result)).request('POST', '/chat/completions', {}));
      expect(parserError).toBeInstanceOf(SyntaxError);
      expect(parserError.message).toContain('parser');
      privateError(parserError);
    }
  });

  it('requestSerializationFailureIsPrivateAndMakesNoFetchCall', async () => {
    let calls = 0;
    const c = client(fetcher(async () => { calls++; return response({}); }));
    const body = { toJSON() { throw new TypeError(`cannot serialize ${KEY}`); } };
    const error = await failure(() => c.request('POST', '/chat/completions', body));
    expect(error).toBeInstanceOf(TypeError);
    expect(error.message).toContain('cannot serialize');
    expect(calls).toBe(0);
    privateError(error);
  });

  it('invalidRedirectAndDeadlineLabelsRedactEncodedCredentialPaths', async () => {
    const encoded = encodeURIComponent(KEY).replace(/%[0-9A-F]{2}/g, (part) => part.toLowerCase());
    const c = client(fetcher(async () => response({}, 307)));
    const invalid = await failure(() => c.apiRequest('GET', encoded));
    expect(invalid).toBeInstanceOf(InvalidRequestError);
    privateError(invalid);
    const outside = await failure(() => c.apiRequestUrl('GET', `https://outside.test/${encoded}`));
    expect(outside).toBeInstanceOf(InvalidRequestError);
    privateError(outside);
    const redirect = await failure(() => c.request('POST', `/${encoded}`, {}));
    expect(redirect).toBeInstanceOf(APIError);
    expect(redirect.status).toBe(307);
    privateError(redirect);
    const deadlineClient = new SwfteClient({ apiKey: KEY, maxRetries: 0, timeout: 15,
      fetch: fetcher(() => new Promise<Response>(() => undefined)) });
    const timeout = await failure(() => deadlineClient.request('GET', `/${encoded}`));
    expect(timeout).toBeInstanceOf(RequestTimeoutError);
    privateError(timeout);
  });

  it('streamReaderAndErrorFramesArePrivateButSuccessfulChunkIsUntouched', async () => {
    const broken = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new TypeError(`reader ${KEY}`)); } });
    const c = client(fetcher(async () => new Response(broken)));
    const stream = await c.chat.completions.create({ model: 'fixture', messages: [], stream: true });
    const error = await failure(async () => { for await (const chunk of stream) void chunk; });
    expect(error).toBeInstanceOf(TypeError);
    privateError(error);
    const errorFrame = client(fetcher(async () => new Response(`data: ${JSON.stringify({ error: echo() })}\n\n`)));
    const frames = await errorFrame.chat.completions.create({ model: 'fixture', messages: [], stream: true });
    const frameError = await failure(async () => { for await (const chunk of frames) void chunk; });
    expect(frameError).toBeInstanceOf(APIError);
    expect(frameError.body.error.safe).toBe('retry in Studio');
    privateError(frameError);
    const safe = { id: 'fixture', choices: [{ delta: { content: KEY }, index: 0 }] };
    const success = client(fetcher(async () => new Response(`data: ${JSON.stringify(safe)}\n\ndata: [DONE]\n\n`)));
    const values = [];
    for await (const value of await success.chat.completions.create({ model: 'fixture', messages: [], stream: true })) values.push(value);
    expect(values).toEqual([safe]);
  });

  it('workflowMalformedAndTerminalFailuresRedactTheirStructuredExecution', async () => {
    const malformed = await failure(() => client(fetcher(async () => response(echo(), 202))).workflows.invoke('fixture'));
    expect(malformed).toBeInstanceOf(APIError);
    expect(malformed.body.safe).toBe('retry in Studio');
    privateError(malformed);
    for (const status of ['FAILED', 'CANCELED', 'PAUSED', 'RUNNING']) {
      const body = { execution: { executionId: 'execution-1', status, errorInfo: echo(), outputData: echo() },
        nodeExecutions: [{ nodeId: KEY, nodeType: 'HUMAN_INPUT', status: 'PAUSED', pauseReason: KEY }] };
      let calls = 0;
      const staged = client(fetcher(async () => response(++calls === 1 ? { executionId: 'execution-1' } : body)));
      const terminal = await failure(() => staged.workflows.invokeAndWait('fixture', {}, { timeoutMs: 0, throwOnPause: true }));
      expect(terminal).toBeInstanceOf(status === 'PAUSED' ? WorkflowPausedError : status === 'RUNNING' ? WorkflowTimeoutError : WorkflowExecutionError);
      expect(terminal.executionId).toBe('execution-1');
      expect(calls).toBe(2);
      const detail = status === 'RUNNING' ? terminal.lastStatus : terminal.execution;
      expect(detail.outputs.safe).toBe('retry in Studio');
      privateError(terminal);
    }
  });

  it('deploymentFailuresRedactBackendMessageAndCallerIdentifier', async () => {
    const c = client(fetcher(async () => response({ state: 'FAILED', statusMessage: `capacity detail ${KEY}` })));
    const error = await failure(() => c.deployments.waitForReady(KEY, 1000, 0));
    expect(error.message).toContain('capacity detail');
    privateError(error);
  });

  it('ordinarySuccessfulSecretReadAndExplicitHeaderAccessStayCompatible', async () => {
    const value = { value: KEY, nested: echo() };
    const c = client(fetcher(async () => response(value)));
    expect(await c.apiRequest('GET', '/v2/secrets/fixture')).toEqual(value);
    expect(c.getHeaders().Authorization).toBe(`Bearer ${KEY}`);
  });
});
