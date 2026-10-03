/**
 * Per-call-site runtime attribution (code map CONTRACT §6).
 *
 * An artifact-invoking call (workflow invoke/execute, agent chat, chatflow
 * session start) may carry `X-Swfte-Callsite: cs_<24 hex>` so Swfte can tie
 * the run back to the line of your code that started it. The header is sent
 * only when:
 *
 *  1. the call is given a valid `callsite` option (what `swfte scan --tag`
 *     writes into your code), or
 *  2. no `callsite` option is given, opt-in stack capture is on
 *     (`SWFTE_CALLSITE_STACK=1`), the runtime is not production
 *     (`NODE_ENV=production` refuses, with one warning), and the local caller
 *     map written by `swfte scan` has an id for the first stack frame outside
 *     this SDK.
 *
 * Otherwise nothing is sent. Invalid ids are never sent. Only the opaque id
 * leaves the machine: the caller map is read locally and never uploaded.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/** The request header that carries a call-site id. */
export const CALLSITE_HEADER = 'X-Swfte-Callsite';

/** The only accepted call-site id shape. */
export const CALLSITE_ID_PATTERN = /^cs_[0-9a-f]{24}$/;

/** Trailing options accepted by every artifact-invoking method. */
export interface CallsiteOptions {
  /**
   * Call-site id (`cs_` + 24 lowercase hex), normally inserted by `swfte scan --tag`.
   * Sent as `X-Swfte-Callsite`. An invalid value is dropped (no header), never sent.
   * Takes precedence over stack capture.
   */
  callsite?: string;
}

/** True when `id` is a well-formed call-site id. */
export function isValidCallsiteId(id: unknown): id is string {
  return typeof id === 'string' && id.length === 27 && CALLSITE_ID_PATTERN.test(id);
}

interface CallerMap {
  root: string;
  entries: Record<string, string>;
}

let productionWarned = false;
let mapCache: { file: string; stamp: string; map: CallerMap | null } | undefined;

/** @internal Test hook: forget the one-time production warning and the cached caller map. */
export function _resetCallsiteState(): void {
  productionWarned = false;
  mapCache = undefined;
}

/**
 * The header to add to an artifact-invoking request, or `{}`.
 *
 * Must be called synchronously at the start of the public SDK method (before
 * any `await`) so the caller's frame is still on the stack.
 */
export function callsiteHeaders(options?: CallsiteOptions | null): Record<string, string> {
  const id = resolveCallsite(options);
  return id ? { [CALLSITE_HEADER]: id } : {};
}

/** Resolve the call-site id for one call; `undefined` means send no header. */
export function resolveCallsite(options?: CallsiteOptions | null): string | undefined {
  // An explicit option always wins, and an invalid one is dropped without falling back.
  if (options && options.callsite !== undefined) {
    return isValidCallsiteId(options.callsite) ? options.callsite : undefined;
  }
  const env = typeof process !== 'undefined' ? process.env : undefined;
  if (!env || env.SWFTE_CALLSITE_STACK !== '1') return undefined;
  if (env.NODE_ENV === 'production') {
    if (!productionWarned) {
      productionWarned = true;
      console.warn(
        '[swfte] SWFTE_CALLSITE_STACK=1 is ignored because NODE_ENV=production; ' +
          'stack capture is for development and staging only. Explicit `callsite` options are still sent.'
      );
    }
    return undefined;
  }
  try {
    const map = loadCallerMap(env.SWFTE_CODEMAP_CALLERS || path.join(process.cwd(), '.swfte', 'codemap', 'callers.json'));
    if (!map) return undefined;
    const frame = firstCallerFrame();
    if (!frame) return undefined;
    const rel = path.relative(map.root, frame.file);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return undefined;
    const id = map.entries[`${rel.split(path.sep).join('/')}:${frame.line}`];
    return isValidCallsiteId(id) ? id : undefined;
  } catch {
    // Attribution is best effort: it must never break the call it annotates.
    return undefined;
  }
}

function loadCallerMap(file: string): CallerMap | null {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return null;
  }
  const stamp = `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
  if (mapCache && mapCache.file === file && mapCache.stamp === stamp) return mapCache.map;
  let map: CallerMap | null = null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    const entries = raw && raw.entries;
    if (
      raw &&
      raw.version === 1 &&
      typeof raw.root === 'string' &&
      path.isAbsolute(raw.root) &&
      entries &&
      typeof entries === 'object' &&
      !Array.isArray(entries)
    ) {
      map = { root: raw.root, entries: entries as Record<string, string> };
    }
  } catch {
    map = null;
  }
  mapCache = { file, stamp, map };
  return map;
}

interface Frame {
  file: string;
  line: number;
}

/** `(file:line:col)` or bare `file:line:col` at the end of a V8 stack line. */
const FRAME_RE = /\(?([^()\s][^()]*?):(\d+):(\d+)\)?$/;

function parseFrame(line: string): Frame | null {
  const m = FRAME_RE.exec(line.trim().replace(/^at\s+/, ''));
  if (!m) return null;
  let file = m[1].replace(/^async\s+/, '');
  if (file.startsWith('file://')) {
    try {
      file = fileURLToPath(file);
    } catch {
      return null;
    }
  }
  // Skip node internals, eval frames, <anonymous> and anything that is not a real file.
  if (!path.isAbsolute(file)) return null;
  return { file, line: Number(m[2]) };
}

function stackLines(): string[] {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 64;
  try {
    return String(new Error().stack || '').split('\n').slice(1);
  } finally {
    Error.stackTraceLimit = limit;
  }
}

/**
 * The directory holding this SDK's own code: `src/` from source, `dist/` from
 * the published bundle. Every frame under it belongs to the SDK.
 */
const SDK_DIR: string | null = (() => {
  try {
    for (const l of stackLines()) {
      const f = parseFrame(l);
      if (f) return path.dirname(f.file) + path.sep;
    }
  } catch {
    // no stack available
  }
  return null;
})();

function firstCallerFrame(): Frame | null {
  if (!SDK_DIR) return null;
  for (const l of stackLines()) {
    const f = parseFrame(l);
    if (!f) continue;
    if (f.file.startsWith(SDK_DIR)) continue;
    if (f.file.includes(`${path.sep}node_modules${path.sep}@swfte${path.sep}sdk${path.sep}`)) continue;
    return f;
  }
  return null;
}
