import { V2Resource } from './_base';

/** Predicate that triggers a routing fail-over. */
export interface RoutingPredicate {
  kind: 'INPUT_TOKENS_GT' | 'COST_USD_GT' | 'LATENCY_MS_GT' | 'ERROR_RATE_GT' | string;
  value: number;
}

/** A routing rule. */
export interface RoutingRule {
  ruleId: string;
  name: string;
  matchModel: string;
  fallbackModel: string;
  predicate: RoutingPredicate;
  enabled: boolean;
  workspaceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Create-rule params. */
export interface CreateRoutingRuleParams {
  name: string;
  matchModel: string;
  fallbackModel: string;
  predicate: RoutingPredicate;
  enabled?: boolean;
}

/** A spend cap. */
export interface UsageCap {
  capId?: string;
  scope: 'WORKSPACE' | 'MODEL';
  modelId?: string;
  monthlyUsdCap?: number;
  dailyUsdCap?: number;
  hardStop?: boolean;
  notifyAtPct?: number[];
  workspaceId?: string;
}

/** Workspace-cap setter params. */
export interface WorkspaceCapParams {
  monthlyUsdCap?: number;
  dailyUsdCap?: number;
  hardStop?: boolean;
  notifyAtPct?: number[];
}

/** Per-model cap params. */
export interface ModelCapParams {
  monthlyUsdCap?: number;
  dailyUsdCap?: number;
  hardStop?: boolean;
}

/** Usage stats query params. */
export interface UsageStatsParams {
  groupBy?: 'MODEL' | 'AGENT' | 'CHATFLOW' | 'DAY';
  days?: number;
  fromDate?: string;
  toDate?: string;
}

/** Scaling configuration for a self-hosted deployment. */
export interface ScalingConfig {
  deploymentId: string;
  minReplicas: number;
  maxReplicas: number;
  scaleToZeroAfterSeconds?: number;
  targetUtilization?: number;
  [key: string]: unknown;
}

/**
 * Cost Control — routing rules, usage caps, live stats, and autoscaling.
 */
export class CostControl extends V2Resource {
  // ---- Routing rules ----
  listRoutingRules(): Promise<RoutingRule[]> {
    return this.request('GET', '/v2/cost-control/routing-rules');
  }

  createRoutingRule(params: CreateRoutingRuleParams): Promise<RoutingRule> {
    return this.request('POST', '/v2/cost-control/routing-rules', params);
  }

  getRoutingRule(ruleId: string): Promise<RoutingRule> {
    return this.request('GET', `/v2/cost-control/routing-rules/${encodeURIComponent(ruleId)}`);
  }

  updateRoutingRule(ruleId: string, params: Partial<RoutingRule>): Promise<RoutingRule> {
    return this.request('PUT', `/v2/cost-control/routing-rules/${encodeURIComponent(ruleId)}`, params);
  }

  deleteRoutingRule(ruleId: string): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/v2/cost-control/routing-rules/${encodeURIComponent(ruleId)}`
    );
  }

  toggleRoutingRule(ruleId: string, enabled: boolean): Promise<RoutingRule> {
    return this.request(
      'PATCH',
      `/v2/cost-control/routing-rules/${encodeURIComponent(ruleId)}/toggle`,
      { enabled }
    );
  }

  // ---- Caps ----
  listUsageCaps(): Promise<UsageCap[]> {
    return this.request('GET', '/v2/cost-control/usage-caps');
  }

  setWorkspaceCap(params: WorkspaceCapParams): Promise<UsageCap> {
    return this.request('PUT', '/v2/cost-control/usage-caps/workspace', params);
  }

  setModelCap(modelId: string, params: ModelCapParams): Promise<UsageCap> {
    return this.request(
      'PUT',
      `/v2/cost-control/usage-caps/model/${encodeURIComponent(modelId)}`,
      params
    );
  }

  deleteUsageCap(capId: string): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/v2/cost-control/usage-caps/${encodeURIComponent(capId)}`
    );
  }

  // ---- Stats / scaling ----
  usageStats(params?: UsageStatsParams): Promise<unknown> {
    return this.request(
      'GET',
      '/v2/cost-control/usage-stats',
      undefined,
      params as Record<string, unknown>
    );
  }

  scaling(deploymentId: string): Promise<ScalingConfig> {
    return this.request('GET', `/v2/cost-control/scaling/${encodeURIComponent(deploymentId)}`);
  }
}
