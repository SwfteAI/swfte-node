import type { SwfteClient } from '../client';
import { InvalidRequestError } from '../errors';

/** Artifact kinds known to the catalog (wire values). */
export type CatalogKind =
  | 'workflow'
  | 'agent'
  | 'chatflow'
  | 'widget'
  | 'application'
  | 'mcp-server'
  | 'model'
  | 'module'
  | 'solution';

export type CatalogScope = 'workspace' | 'public' | 'all';

/** Evidence levels, weakest to strongest (plus the two degraded states). */
export type EvidenceLevel =
  | 'unmeasured'
  | 'observed'
  | 'corroborated'
  | 'validated'
  | 'verified'
  | 'stale'
  | 'disputed';

export interface Facet {
  key: 'domain' | 'capability' | 'industry' | 'pattern' | 'risk' | string;
  value: string;
  /** 0..1, or null when a human set it. */
  confidence: number | null;
  status: 'PROPOSED' | 'CONFIRMED' | 'DISPUTED' | string;
  source: 'jev' | 'human' | 'rule' | string;
}

export interface EvidenceSummary {
  level: EvidenceLevel | string;
  runs: { total: number; succeeded: number; failed: number };
  successRate: number | null;
  lastRunAt: string | null;
  evals: number;
  reviews: { approve: number; reject: number };
  /** Why the level is what it is. */
  reasons: string[];
}

export interface CatalogEntrySummary {
  /** `"<kind>:<id>"` */
  catalogRef: string;
  kind: CatalogKind | string;
  id: string;
  workspaceId: string | null;
  scope: 'workspace' | 'public' | string;
  name: string;
  description: string | null;
  source: string;
  listingId: string | null;
  facets: Facet[];
  evidence: EvidenceSummary;
  updatedAt: string;
  shapeHash: string | null;
}

export interface CatalogReview {
  id: string;
  verdict: 'approve' | 'reject' | string;
  role: 'builder' | 'domain_expert' | string;
  note: string;
  reviewerId: string;
  at: string;
}

export interface CatalogEntryDetail extends CatalogEntrySummary {
  rationale: Record<string, unknown> | null;
  evidenceRecords: Array<{
    type: 'execution' | 'eval' | 'outcome' | 'review' | string;
    refId: string;
    status: string;
    at: string;
  }>;
  dependencies: Array<{ catalogRef: string; relation: string }>;
  reviews: CatalogReview[];
}

export interface CatalogContract {
  catalogRef: string;
  invoke: {
    method: string;
    path: string;
    auth: 'pat' | 'api_key' | 'public' | string;
    async: boolean;
    statusPath: string | null;
  };
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  snippets: { curl: string; typescript: string; python: string; mcp: string };
  embed: { html: string } | null;
}

export interface CatalogSearchParams {
  /** Free-text query. */
  q?: string;
  /** Restrict to these kinds (sent comma-separated). */
  kinds?: Array<CatalogKind | string> | string;
  scope?: CatalogScope;
  domain?: string;
  capability?: string;
  industry?: string;
  /** Only entries at or above this evidence level. */
  minEvidence?: EvidenceLevel | string;
  /** Page size (server default 20). */
  limit?: number;
  /** `nextCursor` from the previous page. */
  cursor?: string;
}

export interface CatalogSearchResponse {
  items: CatalogEntrySummary[];
  nextCursor: string | null;
  /** Subsystems that were unavailable (e.g. `"jev_rerank"`); the search still answered. */
  degraded: string[];
}

/**
 * Catalog API — find proven artifacts across kinds, read their evidence and
 * the contract for calling them.
 *
 * @example
 * ```typescript
 * const { items } = await client.catalog.search({ q: 'invoice', kinds: ['workflow'], minEvidence: 'corroborated' });
 * const detail = await client.catalog.get('workflow', items[0].id);
 * const contract = await client.catalog.contract('workflow', items[0].id);
 * console.log(contract.invoke.method, contract.invoke.path);
 * ```
 */
export class Catalog {
  private readonly client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /** `GET /v2/catalog/search` */
  async search(params: CatalogSearchParams = {}): Promise<CatalogSearchResponse> {
    const res = await this.client.apiRequest<Partial<CatalogSearchResponse> | null>(
      'GET',
      '/v2/catalog/search',
      {
        query: {
          q: params.q,
          kinds: params.kinds,
          scope: params.scope,
          domain: params.domain,
          capability: params.capability,
          industry: params.industry,
          minEvidence: params.minEvidence,
          limit: params.limit,
          cursor: params.cursor,
        },
      }
    );
    return {
      items: res?.items ?? [],
      nextCursor: res?.nextCursor ?? null,
      degraded: res?.degraded ?? [],
    };
  }

  /** `GET /v2/catalog/{kind}/{id}` */
  async get(kind: CatalogKind | string, id: string): Promise<CatalogEntryDetail> {
    return this.client.apiRequest<CatalogEntryDetail>('GET', entryPath(kind, id));
  }

  /** `GET /v2/catalog/{kind}/{id}/contract` */
  async contract(kind: CatalogKind | string, id: string): Promise<CatalogContract> {
    return this.client.apiRequest<CatalogContract>('GET', `${entryPath(kind, id)}/contract`);
  }
}

function entryPath(kind: string, id: string): string {
  if (!kind) throw new InvalidRequestError('kind is required');
  if (!id) throw new InvalidRequestError('id is required');
  return `/v2/catalog/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`;
}
