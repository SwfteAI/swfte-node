/**
 * X-Swfte-Callsite (code map CONTRACT §6) against a real local HTTP server.
 *
 * Every artifact-invoking method (workflows.invoke / invokeAndWait / execute,
 * agents.chat, chatflows.startSession) sends the header only for a valid
 * explicit `callsite` option, or under opt-in stack capture outside production
 * when the caller map has an id for the calling line. Default: no header.
 *
 * The stack-capture tests call the SDK from small caller modules written to a
 * temp dir (and loaded with Node's own `require`, not the test transformer, so
 * their stack frames carry the real file paths and lines the caller map is
 * keyed by).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import * as http from 'http';
import type { AddressInfo } from 'net';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createRequire } from 'module';
import { SwfteClient } from '../../src/client';
import { _resetCallsiteState, CALLSITE_HEADER, isValidCallsiteId } from '../../src/callsite';

const H = CALLSITE_HEADER.toLowerCase();
const ID_A = 'cs_aaaaaaaaaaaaaaaaaaaaaaa1';
const ID_B = 'cs_bbbbbbbbbbbbbbbbbbbbbbb2';
const ID_HELPER = 'cs_cccccccccccccccccccccc03';
const ID_EXPLICIT = 'cs_0123456789abcdef01234567';
const ID_CHAT = 'cs_ddddddddddddddddddddddd4';
const ID_SESSION = 'cs_eeeeeeeeeeeeeeeeeeeeeee5';
const ID_EXEC = 'cs_fffffffffffffffffffffff6';

interface Captured {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
}

let server: http.Server;
let base = '';
const seen: Captured[] = [];

function respond(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = req.url || '';
  let status = 200;
  let body: unknown = {};
  if (req.method === 'POST' && /\/v2\/workflows\/[^/]+\/invoke$/.test(url)) {
    status = 202;
    body = { executionId: 'ex_1', status: 'PENDING' };
  } else if (req.method === 'GET' && /\/v2\/workflows\/executions\/[^/]+\/status$/.test(url)) {
    body = { execution: { executionId: 'ex_1', status: 'SUCCEEDED', outputData: { ok: true } } };
  } else if (req.method === 'POST' && /\/v2\/workflows\/[^/]+\/execute(\?.*)?$/.test(url)) {
    body = { id: 'ex_2', workflowId: 'wf_1', status: 'PENDING' };
  } else if (req.method === 'POST' && /\/v1\/agents\/[^/]+\/chat\/[^/]+$/.test(url)) {
    body = { content: 'hello', conversationId: 'c_1' };
  } else if (req.method === 'POST' && /\/v2\/chatflows\/[^/]+\/sessions$/.test(url)) {
    body = { sessionId: 's_1', chatflowId: 'cf_1' };
  } else {
    status = 404;
    body = { error: `unexpected ${req.method} ${url}` };
  }
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

beforeAll(async () => {
  server = http.createServer((req, res) => {
    seen.push({ method: req.method || '', url: req.url || '', headers: req.headers });
    req.resume();
    req.on('end', () => respond(req, res));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function client(): SwfteClient {
  // Real fetch: this file does not import tests/setup, so global fetch is Node's.
  return new SwfteClient({ apiKey: 'test-key', apiBaseUrl: base, maxRetries: 1 });
}

/** The captured requests whose path matches, in order. */
function reqs(re: RegExp): Captured[] {
  return seen.filter((r) => re.test(r.url));
}
const INVOKE = /\/invoke$/;
const STATUS = /\/status$/;
const EXECUTE = /\/execute(\?|$)/;
const CHAT = /\/chat\//;
const SESSION = /\/sessions$/;

// ---- caller modules --------------------------------------------------------

let dir = '';
let callersFile = '';
/** file basename -> marker -> 1-based line of the SDK call carrying that marker. */
const lines: Record<string, Record<string, number>> = {};
type Mod = Record<string, (c: SwfteClient, o?: Record<string, unknown>) => Promise<unknown>>;
const mods: Record<string, Mod> = {};

// Node's own CommonJS loader (not the test transformer), so frames keep the real temp paths.
const nativeRequire = createRequire(__filename);

function writeModule(name: string, src: string[]): void {
  lines[name] = {};
  src.forEach((l, i) => {
    const m = /\/\/ @(\w+)$/.exec(l);
    if (m) lines[name][m[1]] = i + 1;
  });
  fs.writeFileSync(path.join(dir, name), src.join('\n') + '\n');
}

function writeCallerMap(entries: Record<string, string>, extra: Record<string, unknown> = {}): void {
  fs.writeFileSync(callersFile, JSON.stringify({ version: 1, root: dir, entries, ...extra }));
}

beforeAll(async () => {
  dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'swfte-callsite-')));
  fs.mkdirSync(path.join(dir, 'app'));
  callersFile = path.join(dir, 'callers.json');
  writeModule('app/caller-a.cjs', [
    '// caller A: runs the published workflow and waits for it',
    'exports.run = function (client, opts = {}) {',
    "  return client.workflows.invokeAndWait('wf_1', { from: 'a' }, { pollIntervalMs: 0, ...opts }); // @run",
    '}',
    'exports.chat = function (client, opts = {}) {',
    "  return client.agents.chat('ag_1', 'hi', opts); // @chat",
    '}',
    'exports.session = function (client) {',
    "  return client.chatflows.startSession('cf_1', { channel: 'web' }); // @session",
    '}',
    'exports.execute = function (client) {',
    "  return client.workflows.execute('wf_1', {}, true); // @execute",
    '}',
  ]);
  writeModule('app/caller-b.cjs', [
    '// caller B: a different file, and a different line, calling the same SDK method',
    '',
    '',
    'exports.run = async function (client, opts = {}) {',
    '  const unrelated = 1 + 1;',
    "  return client.workflows.invokeAndWait('wf_1', { from: 'b', unrelated }, { pollIntervalMs: 0, ...opts }); // @run",
    '}',
  ]);
  writeModule('app/helper.cjs', [
    '// a user-side helper that both C and D go through',
    'exports.start = function (client) {',
    "  return client.workflows.invoke('wf_1', {}); // @invoke",
    '}',
  ]);
  writeModule('app/caller-c.cjs', [
    "const { start } = require('./helper.cjs');",
    'exports.run = (client) => start(client); // @run',
  ]);
  writeModule('app/caller-d.cjs', [
    "const { start } = require('./helper.cjs');",
    '',
    'exports.run = (client) => start(client); // @run',
  ]);
  for (const name of Object.keys(lines)) {
    mods[name] = nativeRequire(path.join(dir, name)) as Mod;
  }
});

afterAll(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

const key = (name: string, marker: string): string => `${name}:${lines[name][marker]}`;

// ---- env -------------------------------------------------------------------

const ENV_KEYS = ['SWFTE_CALLSITE_STACK', 'NODE_ENV', 'SWFTE_CODEMAP_CALLERS'] as const;
let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  seen.length = 0;
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  delete process.env.SWFTE_CALLSITE_STACK;
  process.env.NODE_ENV = 'test';
  process.env.SWFTE_CODEMAP_CALLERS = callersFile;
  _resetCallsiteState();
  writeCallerMap({
    [key('app/caller-a.cjs', 'run')]: ID_A,
    [key('app/caller-a.cjs', 'chat')]: ID_CHAT,
    [key('app/caller-a.cjs', 'session')]: ID_SESSION,
    [key('app/caller-a.cjs', 'execute')]: ID_EXEC,
    [key('app/caller-b.cjs', 'run')]: ID_B,
    [key('app/helper.cjs', 'invoke')]: ID_HELPER,
  });
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.restoreAllMocks();
});

async function callEveryMethod(c: SwfteClient, opts?: { callsite?: string }): Promise<void> {
  await c.workflows.invoke('wf_1', { x: 1 }, opts);
  await c.workflows.invokeAndWait('wf_1', { x: 1 }, { pollIntervalMs: 0, ...opts });
  await c.workflows.execute('wf_1', { x: 1 }, { ...opts });
  await c.agents.chat('ag_1', 'hi', { ...opts });
  await c.chatflows.startSession('cf_1', { channel: 'web' }, opts);
}

// ---- tests -----------------------------------------------------------------

describe('X-Swfte-Callsite', () => {
  it('opt-out: sends no header from any method, even from mapped lines, when stack capture is off', async () => {
    const c = client();
    await callEveryMethod(c);
    const a = mods['app/caller-a.cjs'];
    await a.run(c);
    await a.chat(c);
    await a.session(c);
    await a.execute(c);
    await mods['app/caller-b.cjs'].run(c);
    expect(seen.length).toBe(13);
    for (const r of seen) expect(r.headers).not.toHaveProperty(H);
  });

  it('sends an explicit callsite on every method family, and only on the invoke of invokeAndWait', async () => {
    const c = client();
    await callEveryMethod(c, { callsite: ID_EXPLICIT });
    expect(reqs(INVOKE).map((r) => r.headers[H])).toEqual([ID_EXPLICIT, ID_EXPLICIT]);
    expect(reqs(EXECUTE).map((r) => r.headers[H])).toEqual([ID_EXPLICIT]);
    expect(reqs(CHAT).map((r) => r.headers[H])).toEqual([ID_EXPLICIT]);
    expect(reqs(SESSION).map((r) => r.headers[H])).toEqual([ID_EXPLICIT]);
    expect(reqs(STATUS).length).toBeGreaterThan(0);
    for (const r of reqs(STATUS)) expect(r.headers).not.toHaveProperty(H);
  });

  it('keeps the legacy call shapes working (execute boolean, no options)', async () => {
    const c = client();
    await c.workflows.execute('wf_1', { x: 1 }, true);
    await c.workflows.execute('wf_1', { x: 1 }, { skipValidation: true, callsite: ID_EXPLICIT });
    await c.workflows.execute('wf_1');
    await c.workflows.invoke('wf_1');
    await c.agents.chat('ag_1', 'hi');
    await c.chatflows.startSession('cf_1');
    const ex = reqs(EXECUTE);
    expect(ex.map((r) => r.url.endsWith('?skipValidation=true'))).toEqual([true, true, false]);
    expect(ex.map((r) => r.headers[H])).toEqual([undefined, ID_EXPLICIT, undefined]);
    expect(seen.length).toBe(6);
  });

  it('never sends an invalid id, and an invalid explicit id does not fall back to the stack', async () => {
    const invalid = [
      'cs_0123456789ABCDEF01234567', // upper case
      'cs_0123456789abcdef0123456', // 23 hex
      'cs_0123456789abcdef012345678', // 25 hex
      'cs_0123456789abcdef0123456g',
      'cs_0123456789abcdef01234567\r\nX-Evil: 1',
      ' cs_0123456789abcdef01234567',
      '',
      'xyz',
    ];
    for (const id of invalid) expect(isValidCallsiteId(id)).toBe(false);
    const c = client();
    for (const id of invalid) await callEveryMethod(c, { callsite: id });
    expect(seen.length).toBe(invalid.length * 6);
    for (const r of seen) expect(r.headers).not.toHaveProperty(H);

    // Stack capture on and the calling line is mapped, but the explicit id is invalid: still nothing.
    process.env.SWFTE_CALLSITE_STACK = '1';
    seen.length = 0;
    await mods['app/caller-a.cjs'].run(c, { callsite: 'cs_nothex' });
    expect(reqs(INVOKE)[0].headers).not.toHaveProperty(H);
    // A map entry that is itself not a valid id is not sent either.
    writeCallerMap({ [key('app/caller-a.cjs', 'run')]: 'cs_TOO-SHORT' });
    seen.length = 0;
    await mods['app/caller-a.cjs'].run(c);
    expect(reqs(INVOKE)[0].headers).not.toHaveProperty(H);
  });

  it('stack capture: two callers in two files calling the same SDK method send two different ids', async () => {
    process.env.SWFTE_CALLSITE_STACK = '1';
    const c = client();
    await mods['app/caller-a.cjs'].run(c);
    await mods['app/caller-b.cjs'].run(c);
    await mods['app/caller-a.cjs'].run(c);
    expect(reqs(INVOKE).map((r) => r.headers[H])).toEqual([ID_A, ID_B, ID_A]);
    for (const r of reqs(STATUS)) expect(r.headers).not.toHaveProperty(H);
  });

  it('stack capture: resolves agents.chat, chatflows.startSession and workflows.execute by their own lines', async () => {
    process.env.SWFTE_CALLSITE_STACK = '1';
    const c = client();
    const a = mods['app/caller-a.cjs'];
    await a.chat(c);
    await a.session(c);
    await a.execute(c);
    expect(reqs(CHAT)[0].headers[H]).toBe(ID_CHAT);
    expect(reqs(SESSION)[0].headers[H]).toBe(ID_SESSION);
    expect(reqs(EXECUTE)[0].headers[H]).toBe(ID_EXEC);
    // A line that is not in the map (this test file) sends nothing.
    seen.length = 0;
    await callEveryMethod(c);
    for (const r of seen) expect(r.headers).not.toHaveProperty(H);
  });

  it('stack capture: the id is the first frame outside the SDK, so a shared user helper is one site', async () => {
    process.env.SWFTE_CALLSITE_STACK = '1';
    const c = client();
    await mods['app/caller-c.cjs'].run(c);
    await mods['app/caller-d.cjs'].run(c);
    expect(reqs(INVOKE).map((r) => r.headers[H])).toEqual([ID_HELPER, ID_HELPER]);
  });

  it('production refuses stack capture with one warning, but honours an explicit id', async () => {
    process.env.SWFTE_CALLSITE_STACK = '1';
    process.env.NODE_ENV = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = client();
    await mods['app/caller-a.cjs'].run(c);
    await mods['app/caller-b.cjs'].run(c);
    await mods['app/caller-a.cjs'].chat(c);
    for (const r of seen) expect(r.headers).not.toHaveProperty(H);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('NODE_ENV=production');

    seen.length = 0;
    await mods['app/caller-a.cjs'].run(c, { callsite: ID_EXPLICIT });
    await mods['app/caller-a.cjs'].chat(c, { callsite: ID_EXPLICIT });
    expect(reqs(INVOKE)[0].headers[H]).toBe(ID_EXPLICIT);
    expect(reqs(CHAT)[0].headers[H]).toBe(ID_EXPLICIT);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('an explicit id wins over stack capture', async () => {
    process.env.SWFTE_CALLSITE_STACK = '1';
    const c = client();
    await mods['app/caller-a.cjs'].run(c, { callsite: ID_EXPLICIT });
    await mods['app/caller-a.cjs'].chat(c, { callsite: ID_EXPLICIT });
    expect(reqs(INVOKE)[0].headers[H]).toBe(ID_EXPLICIT);
    expect(reqs(CHAT)[0].headers[H]).toBe(ID_EXPLICIT);
  });

  it('a missing, malformed or foreign-root caller map sends no header', async () => {
    process.env.SWFTE_CALLSITE_STACK = '1';
    const c = client();
    const run = () => mods['app/caller-a.cjs'].run(c);

    process.env.SWFTE_CODEMAP_CALLERS = path.join(dir, 'does-not-exist.json');
    await run();
    // Default location (<cwd>/.swfte/codemap/callers.json) is used when the env var is unset;
    // the SDK worktree has none.
    delete process.env.SWFTE_CODEMAP_CALLERS;
    expect(fs.existsSync(path.join(process.cwd(), '.swfte', 'codemap', 'callers.json'))).toBe(false);
    await run();

    process.env.SWFTE_CODEMAP_CALLERS = callersFile;
    fs.writeFileSync(callersFile, '{ not json');
    await run();
    writeCallerMap({ [key('app/caller-a.cjs', 'run')]: ID_A }, { version: 2 });
    await run();
    // Root elsewhere: the caller's file is not under it, so its path cannot match.
    fs.writeFileSync(
      callersFile,
      JSON.stringify({ version: 1, root: path.join(dir, 'app', 'nested'), entries: { [key('app/caller-a.cjs', 'run')]: ID_A } })
    );
    await run();

    expect(reqs(INVOKE).length).toBe(5);
    for (const r of seen) expect(r.headers).not.toHaveProperty(H);

    // Sanity: the same call with a good map does send.
    writeCallerMap({ [key('app/caller-a.cjs', 'run')]: ID_A });
    seen.length = 0;
    await run();
    expect(reqs(INVOKE)[0].headers[H]).toBe(ID_A);
  });
});
