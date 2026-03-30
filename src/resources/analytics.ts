/**
 * Swfte Enterprise Analytics - JavaScript SDK
 *
 * Comprehensive analytics for LLM applications with enterprise-grade features:
 * - ML-Powered Classification
 * - Real-time Streaming Analytics
 * - Team Analytics
 * - Anomaly Detection
 * - A/B Testing
 * - Compliance Reporting
 * - Cost Optimization
 * - Custom Metrics & Dashboards
 */

import type { SwfteClient } from '../client';

// ============================================================================
// Core Types
// ============================================================================

export interface PromptInsight {
  id: string;
  agentId: string;
  sanitizedPrompt: string;
  sanitizedResponse?: string;
  intent: 'QUESTION' | 'COMMAND' | 'REQUEST' | 'CREATIVE' | 'COMPLAINT' | 'FEEDBACK';
  topic: 'CODING' | 'WRITING' | 'DATA' | 'EDUCATION' | 'SUPPORT' | 'BUSINESS' | 'HEALTH' | 'GENERAL';
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'FRUSTRATED';
  complexity: number;
  piiTypesDetected: string[];
  piiCount: number;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  provider?: string;
  model?: string;
  wasStreaming?: boolean;
  createdAt?: string;
  workspaceId?: string;
  userId?: string;
  conversationId?: string;
  sessionId?: string;
  // Enterprise fields
  confidenceScores?: Record<string, number>;
  customDimensions?: Record<string, unknown>;
  abTestVariant?: string;
  traceId?: string;
}

export interface PromptPatternSummary {
  totalPrompts: number;
  intentDistribution: Record<string, number>;
  topicDistribution: Record<string, number>;
  sentimentDistribution: Record<string, number>;
  frustrationRate: number;
  avgComplexity: number;
  totalPiiDetected: number;
  avgLatencyMs: number;
  avgTokensPerPrompt: number;
  avgResponseTokens: number;
  avgEstimatedCostUsd: number;
  streamingRate: number;
  errorRate: number;
  // Enterprise fields
  uniqueUsers?: number;
  uniqueSessions?: number;
  satisfactionScore?: number;
  resolutionRate?: number;
  modelDistribution?: Record<string, number>;
  percentiles?: Record<string, Record<string, number>>;
}

export interface TrendingTopic {
  topic: string;
  count: number;
  percentage: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  changeFromPrevious: number;
  velocity?: number;
  forecastNextPeriod?: number;
  relatedTopics?: string[];
}

export interface PIITestResult {
  originalText: string;
  sanitizedText: string;
  piiTypesDetected: string[];
  piiCount: number;
  detections: Array<{ type: string; placeholder: string }>;
  riskScore?: number;
  complianceFlags?: string[];
}

export interface ConversationMessage {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
  tokens?: number;
  latencyMs?: number;
  sentiment?: string;
  intent?: string;
}

export interface ConversationHistory {
  id: string;
  agentId: string;
  messages: ConversationMessage[];
  messageCount: number;
  active: boolean;
  createdAt: string;
  lastModifiedAt: string;
  conversationType: string;
  participants: string[];
  totalTokens?: number;
  totalCostUsd?: number;
  resolutionStatus?: string;
  satisfactionRating?: number;
  escalated?: boolean;
  tags?: string[];
}

// ============================================================================
// Enterprise Types
// ============================================================================

export interface TeamMember {
  userId: string;
  name?: string;
  email?: string;
  totalPrompts: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  frustrationRate: number;
  mostUsedAgents: string[];
  lastActive?: string;
}

export interface TeamSummary {
  teamId: string;
  totalMembers: number;
  totalPrompts: number;
  totalCostUsd: number;
  avgCostPerUser: number;
  avgLatencyMs: number;
  frustrationRate: number;
  topUsers: TeamMember[];
  costTrend: 'UP' | 'DOWN' | 'STABLE';
  usageTrend: 'UP' | 'DOWN' | 'STABLE';
}

export interface Anomaly {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviationPercent: number;
  affectedAgents: string[];
  affectedUsers: string[];
  autoResolved: boolean;
  resolvedAt?: string;
  rootCause?: string;
  recommendations: string[];
}

export interface ABTestResult {
  testId: string;
  testName: string;
  variantA: string;
  variantB: string;
  status: 'RUNNING' | 'COMPLETED' | 'STOPPED';
  startedAt: string;
  endedAt?: string;
  variantAPrompts: number;
  variantBPrompts: number;
  variantAMetrics: Record<string, number>;
  variantBMetrics: Record<string, number>;
  winner?: string;
  confidence: number;
  statisticalSignificance: boolean;
  lift?: number;
}

export interface ComplianceReport {
  reportId: string;
  framework: 'SOC2' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'CCPA';
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  overallScore: number;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
  findings: Array<Record<string, unknown>>;
  recommendations: string[];
  dataRetentionCompliant: boolean;
  piiHandlingCompliant: boolean;
  accessControlCompliant: boolean;
  auditLogCompliant: boolean;
  encryptionCompliant: boolean;
}

export interface CostRecommendation {
  id: string;
  category: 'MODEL_SWITCH' | 'CACHING' | 'PROMPT_OPTIMIZATION' | 'BATCH_PROCESSING';
  title: string;
  description: string;
  estimatedSavingsUsd: number;
  estimatedSavingsPercent: number;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  implementationSteps: string[];
  affectedAgents: string[];
}

export interface ModelBenchmark {
  model: string;
  provider: string;
  totalRequests: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  avgCostPerRequest: number;
  qualityScore?: number;
  tasksExcelsAt: string[];
}

export interface UserJourney {
  userId: string;
  currentStage: string;
  firstInteraction: string;
  lastInteraction: string;
  totalSessions: number;
  totalPrompts: number;
  totalCostUsd: number;
  stageProgression: Array<Record<string, unknown>>;
  conversionEvents: Array<Record<string, unknown>>;
  churnRisk: number;
  lifetimeValue: number;
  satisfactionTrend: 'UP' | 'DOWN' | 'STABLE';
}

export interface RAGMetrics {
  agentId: string;
  period: string;
  totalQueries: number;
  retrievalAccuracy: number;
  answerRelevance: number;
  faithfulness: number;
  contextPrecision: number;
  contextRecall: number;
  answerCorrectness: number;
  latencyRetrievalMs: number;
  latencyGenerationMs: number;
  fallbackRate: number;
  noAnswerRate: number;
}

export interface UsageForecast {
  metric: string;
  granularity: string;
  predictions: Array<{
    timestamp: string;
    value: number;
    lowerBound?: number;
    upperBound?: number;
  }>;
  confidenceInterval: number;
  modelType: string;
  mape: number;
}

export interface BudgetForecast {
  currentSpendUsd: number;
  projectedDailyUsd: number;
  projectedMonthlyUsd: number;
  daysUntilBudgetExceeded?: number;
  recommendedDailyLimit: number;
  costByCategory: Record<string, number>;
  trend: 'UP' | 'DOWN' | 'STABLE';
  confidence: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  conditions: Array<{
    metric: string;
    operator: string;
    threshold: number;
    durationSeconds: number;
  }>;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  enabled: boolean;
  notificationChannels: string[];
  labels: Record<string, string>;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  status: 'FIRING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'MUTED';
  severity: string;
  firedAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
}

export interface RealtimeEvent {
  eventType: string;
  timestamp: string;
  agentId?: string;
  workspaceId?: string;
  userId?: string;
  data: Record<string, unknown>;
  severity?: string;
  requiresAction: boolean;
}

export interface CustomMetric {
  id: string;
  name: string;
  description: string;
  type: 'COUNTER' | 'GAUGE' | 'HISTOGRAM' | 'RATE' | 'COMPUTED';
  unit: string;
  formula?: string;
  dimensions: string[];
  enabled: boolean;
}

export interface CustomDashboard {
  id: string;
  name: string;
  description: string;
  widgets: Array<{
    id: string;
    type: string;
    title: string;
    metrics: string[];
    dimensions: string[];
    position: { x: number; y: number; w: number; h: number };
  }>;
  isShared: boolean;
}

// ============================================================================
// Analytics Class
// ============================================================================

export class Analytics {
  private client: SwfteClient;
  private _prompts?: PromptAnalytics;
  private _pii?: PIIAnalytics;
  private _conversations?: ConversationAnalytics;
  private _enterprise?: EnterpriseAnalytics;
  private _realtime?: RealtimeAnalytics;
  private _alerts?: AlertManager;
  private _custom?: CustomMetrics;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  get prompts(): PromptAnalytics {
    if (!this._prompts) {
      this._prompts = new PromptAnalytics(this.client);
    }
    return this._prompts;
  }

  get pii(): PIIAnalytics {
    if (!this._pii) {
      this._pii = new PIIAnalytics(this.client);
    }
    return this._pii;
  }

  get conversations(): ConversationAnalytics {
    if (!this._conversations) {
      this._conversations = new ConversationAnalytics(this.client);
    }
    return this._conversations;
  }

  /** Enterprise analytics features */
  get enterprise(): EnterpriseAnalytics {
    if (!this._enterprise) {
      this._enterprise = new EnterpriseAnalytics(this.client);
    }
    return this._enterprise;
  }

  /** Real-time streaming analytics */
  get realtime(): RealtimeAnalytics {
    if (!this._realtime) {
      this._realtime = new RealtimeAnalytics(this.client);
    }
    return this._realtime;
  }

  /** Alert management */
  get alerts(): AlertManager {
    if (!this._alerts) {
      this._alerts = new AlertManager(this.client);
    }
    return this._alerts;
  }

  /** Custom metrics and dashboards */
  get custom(): CustomMetrics {
    if (!this._custom) {
      this._custom = new CustomMetrics(this.client);
    }
    return this._custom;
  }
}

// ============================================================================
// Prompt Analytics
// ============================================================================

export class PromptAnalytics {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async summary(
    agentId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      includePercentiles?: boolean;
    }
  ): Promise<PromptPatternSummary> {
    const url = new URL(`${this.getBaseUrl()}/v1/analytics/prompts/agents/${agentId}/summary`);
    if (options?.startDate) url.searchParams.set('startDate', options.startDate);
    if (options?.endDate) url.searchParams.set('endDate', options.endDate);
    if (options?.includePercentiles) url.searchParams.set('includePercentiles', 'true');

    const response = await fetch(url.toString(), { headers: this.client.getHeaders() });
    if (!response.ok) throw new Error(`Failed to fetch summary: ${response.statusText}`);
    const data = await response.json();
    return data.summary as PromptPatternSummary;
  }

  async insights(
    agentId: string,
    options?: {
      limit?: number;
      intent?: string;
      topic?: string;
      sentiment?: string;
      hasPii?: boolean;
      userId?: string;
      model?: string;
    }
  ): Promise<PromptInsight[]> {
    const url = new URL(`${this.getBaseUrl()}/v1/analytics/prompts/agents/${agentId}/insights`);
    if (options?.limit) url.searchParams.set('limit', options.limit.toString());
    if (options?.intent) url.searchParams.set('intent', options.intent);
    if (options?.topic) url.searchParams.set('topic', options.topic);
    if (options?.sentiment) url.searchParams.set('sentiment', options.sentiment);
    if (options?.hasPii !== undefined) url.searchParams.set('hasPii', options.hasPii.toString());
    if (options?.userId) url.searchParams.set('userId', options.userId);
    if (options?.model) url.searchParams.set('model', options.model);

    const response = await fetch(url.toString(), { headers: this.client.getHeaders() });
    if (!response.ok) throw new Error(`Failed to fetch insights: ${response.statusText}`);
    const data = await response.json();
    return data.insights as PromptInsight[];
  }

  async trending(
    workspaceId: string,
    options?: { limit?: number; days?: number; includeForecast?: boolean }
  ): Promise<TrendingTopic[]> {
    const url = new URL(`${this.getBaseUrl()}/v1/analytics/prompts/workspaces/${workspaceId}/trending`);
    if (options?.limit) url.searchParams.set('limit', options.limit.toString());
    if (options?.days) url.searchParams.set('days', options.days.toString());
    if (options?.includeForecast) url.searchParams.set('includeForecast', 'true');

    const response = await fetch(url.toString(), { headers: this.client.getHeaders() });
    if (!response.ok) throw new Error(`Failed to fetch trending: ${response.statusText}`);
    const data = await response.json();
    return data.trendingTopics as TrendingTopic[];
  }
}

// ============================================================================
// PII Analytics
// ============================================================================

export class PIIAnalytics {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async test(text: string, complianceMode?: string): Promise<PIITestResult> {
    const response = await fetch(`${this.getBaseUrl()}/v1/analytics/prompts/pii/test`, {
      method: 'POST',
      headers: this.client.getHeaders(),
      body: JSON.stringify({ text, complianceMode }),
    });
    if (!response.ok) throw new Error(`PII test failed: ${response.statusText}`);
    const data = await response.json();
    return data.result as PIITestResult;
  }

  async check(text: string): Promise<boolean> {
    const response = await fetch(`${this.getBaseUrl()}/v1/analytics/prompts/pii/check`, {
      method: 'POST',
      headers: this.client.getHeaders(),
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error(`PII check failed: ${response.statusText}`);
    const data = await response.json();
    return data.containsPII;
  }
}

// ============================================================================
// Conversation Analytics
// ============================================================================

export class ConversationAnalytics {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async get(conversationId: string): Promise<ConversationHistory> {
    const response = await fetch(`${this.getBaseUrl()}/v1/conversations/${conversationId}`, {
      headers: this.client.getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to fetch conversation: ${response.statusText}`);
    return await response.json() as ConversationHistory;
  }

  async search(options: {
    workspaceId: string;
    query?: string;
    agentId?: string;
    userId?: string;
    tags?: string[];
    limit?: number;
  }): Promise<ConversationHistory[]> {
    const url = new URL(`${this.getBaseUrl()}/v1/conversations/search`);
    url.searchParams.set('workspaceId', options.workspaceId);
    if (options.query) url.searchParams.set('query', options.query);
    if (options.agentId) url.searchParams.set('agentId', options.agentId);
    if (options.userId) url.searchParams.set('userId', options.userId);
    if (options.tags) url.searchParams.set('tags', options.tags.join(','));
    if (options.limit) url.searchParams.set('limit', options.limit.toString());

    const response = await fetch(url.toString(), { headers: this.client.getHeaders() });
    if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
    const data = await response.json();
    return data.conversations as ConversationHistory[];
  }
}

// ============================================================================
// Enterprise Analytics
// ============================================================================

export class EnterpriseAnalytics {
  private client: SwfteClient;
  private _teams?: TeamAnalytics;
  private _anomalies?: AnomalyDetection;
  private _abTesting?: ABTestingAnalytics;
  private _compliance?: ComplianceReporting;
  private _costOptimization?: CostOptimizationAnalytics;
  private _modelComparison?: ModelComparisonAnalytics;
  private _userJourneys?: UserJourneyAnalytics;
  private _ragQuality?: RAGQualityAnalytics;
  private _forecasting?: ForecastingAnalytics;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  get teams(): TeamAnalytics {
    if (!this._teams) this._teams = new TeamAnalytics(this.client);
    return this._teams;
  }

  get anomalies(): AnomalyDetection {
    if (!this._anomalies) this._anomalies = new AnomalyDetection(this.client);
    return this._anomalies;
  }

  get abTesting(): ABTestingAnalytics {
    if (!this._abTesting) this._abTesting = new ABTestingAnalytics(this.client);
    return this._abTesting;
  }

  get compliance(): ComplianceReporting {
    if (!this._compliance) this._compliance = new ComplianceReporting(this.client);
    return this._compliance;
  }

  get costOptimization(): CostOptimizationAnalytics {
    if (!this._costOptimization) this._costOptimization = new CostOptimizationAnalytics(this.client);
    return this._costOptimization;
  }

  get modelComparison(): ModelComparisonAnalytics {
    if (!this._modelComparison) this._modelComparison = new ModelComparisonAnalytics(this.client);
    return this._modelComparison;
  }

  get userJourneys(): UserJourneyAnalytics {
    if (!this._userJourneys) this._userJourneys = new UserJourneyAnalytics(this.client);
    return this._userJourneys;
  }

  get ragQuality(): RAGQualityAnalytics {
    if (!this._ragQuality) this._ragQuality = new RAGQualityAnalytics(this.client);
    return this._ragQuality;
  }

  get forecasting(): ForecastingAnalytics {
    if (!this._forecasting) this._forecasting = new ForecastingAnalytics(this.client);
    return this._forecasting;
  }
}

// ============================================================================
// Enterprise Sub-modules
// ============================================================================

export class TeamAnalytics {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async summary(teamId: string): Promise<TeamSummary> {
    const response = await fetch(
      `${this.getBaseUrl()}/v1/analytics/enterprise/teams/${teamId}/summary`,
      { headers: this.client.getHeaders() }
    );
    if (!response.ok) throw new Error(`Failed to fetch team summary: ${response.statusText}`);
    return await response.json() as TeamSummary;
  }

  async members(teamId: string, options?: { limit?: number }): Promise<TeamMember[]> {
    const url = new URL(`${this.getBaseUrl()}/v1/analytics/enterprise/teams/${teamId}/members`);
    if (options?.limit) url.searchParams.set('limit', options.limit.toString());
    const response = await fetch(url.toString(), { headers: this.client.getHeaders() });
    if (!response.ok) throw new Error(`Failed to fetch members: ${response.statusText}`);
    const data = await response.json();
    return data.members as TeamMember[];
  }
}

export class AnomalyDetection {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async detect(options: {
    workspaceId?: string;
    agentId?: string;
    lookbackHours?: number;
    sensitivity?: 'low' | 'medium' | 'high';
  }): Promise<Anomaly[]> {
    const url = new URL(`${this.getBaseUrl()}/v1/analytics/enterprise/anomalies/detect`);
    if (options.workspaceId) url.searchParams.set('workspaceId', options.workspaceId);
    if (options.agentId) url.searchParams.set('agentId', options.agentId);
    if (options.lookbackHours) url.searchParams.set('lookbackHours', options.lookbackHours.toString());
    if (options.sensitivity) url.searchParams.set('sensitivity', options.sensitivity);

    const response = await fetch(url.toString(), { headers: this.client.getHeaders() });
    if (!response.ok) throw new Error(`Failed to detect anomalies: ${response.statusText}`);
    const data = await response.json();
    return data.anomalies as Anomaly[];
  }
}

export class ABTestingAnalytics {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async createTest(options: {
    name: string;
    agentId: string;
    variantAConfig: Record<string, unknown>;
    variantBConfig: Record<string, unknown>;
    trafficSplit?: number;
    metrics?: string[];
  }): Promise<ABTestResult> {
    const response = await fetch(`${this.getBaseUrl()}/v1/analytics/enterprise/ab-tests`, {
      method: 'POST',
      headers: this.client.getHeaders(),
      body: JSON.stringify(options),
    });
    if (!response.ok) throw new Error(`Failed to create test: ${response.statusText}`);
    return await response.json() as ABTestResult;
  }

  async getResult(testId: string): Promise<ABTestResult> {
    const response = await fetch(
      `${this.getBaseUrl()}/v1/analytics/enterprise/ab-tests/${testId}`,
      { headers: this.client.getHeaders() }
    );
    if (!response.ok) throw new Error(`Failed to get test result: ${response.statusText}`);
    return await response.json() as ABTestResult;
  }
}

export class ComplianceReporting {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async generateReport(framework: string, workspaceId?: string): Promise<ComplianceReport> {
    const response = await fetch(`${this.getBaseUrl()}/v1/analytics/enterprise/compliance/report`, {
      method: 'POST',
      headers: this.client.getHeaders(),
      body: JSON.stringify({ framework, workspaceId }),
    });
    if (!response.ok) throw new Error(`Failed to generate report: ${response.statusText}`);
    return await response.json() as ComplianceReport;
  }
}

export class CostOptimizationAnalytics {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async getRecommendations(workspaceId: string): Promise<CostRecommendation[]> {
    const response = await fetch(
      `${this.getBaseUrl()}/v1/analytics/enterprise/cost/recommendations?workspaceId=${workspaceId}`,
      { headers: this.client.getHeaders() }
    );
    if (!response.ok) throw new Error(`Failed to get recommendations: ${response.statusText}`);
    const data = await response.json();
    return data.recommendations as CostRecommendation[];
  }
}

export class ModelComparisonAnalytics {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async benchmark(workspaceId: string, models?: string[]): Promise<ModelBenchmark[]> {
    const url = new URL(`${this.getBaseUrl()}/v1/analytics/enterprise/models/benchmark`);
    url.searchParams.set('workspaceId', workspaceId);
    if (models) url.searchParams.set('models', models.join(','));

    const response = await fetch(url.toString(), { headers: this.client.getHeaders() });
    if (!response.ok) throw new Error(`Failed to benchmark: ${response.statusText}`);
    const data = await response.json();
    return data.benchmarks as ModelBenchmark[];
  }
}

export class UserJourneyAnalytics {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async getJourney(userId: string): Promise<UserJourney> {
    const response = await fetch(
      `${this.getBaseUrl()}/v1/analytics/enterprise/journeys/${userId}`,
      { headers: this.client.getHeaders() }
    );
    if (!response.ok) throw new Error(`Failed to get journey: ${response.statusText}`);
    return await response.json() as UserJourney;
  }

  async churnPrediction(workspaceId: string, threshold?: number): Promise<Array<Record<string, unknown>>> {
    const url = new URL(`${this.getBaseUrl()}/v1/analytics/enterprise/journeys/churn-risk`);
    url.searchParams.set('workspaceId', workspaceId);
    if (threshold) url.searchParams.set('threshold', threshold.toString());

    const response = await fetch(url.toString(), { headers: this.client.getHeaders() });
    if (!response.ok) throw new Error(`Failed to predict churn: ${response.statusText}`);
    const data = await response.json();
    return data.atRiskUsers;
  }
}

export class RAGQualityAnalytics {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async getMetrics(agentId: string): Promise<RAGMetrics> {
    const response = await fetch(
      `${this.getBaseUrl()}/v1/analytics/enterprise/rag/${agentId}/metrics`,
      { headers: this.client.getHeaders() }
    );
    if (!response.ok) throw new Error(`Failed to get RAG metrics: ${response.statusText}`);
    return await response.json() as RAGMetrics;
  }
}

export class ForecastingAnalytics {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async predictUsage(workspaceId: string, metric?: string, horizonDays?: number): Promise<UsageForecast> {
    const url = new URL(`${this.getBaseUrl()}/v1/analytics/enterprise/forecasting/usage`);
    url.searchParams.set('workspaceId', workspaceId);
    if (metric) url.searchParams.set('metric', metric);
    if (horizonDays) url.searchParams.set('horizonDays', horizonDays.toString());

    const response = await fetch(url.toString(), { headers: this.client.getHeaders() });
    if (!response.ok) throw new Error(`Failed to predict usage: ${response.statusText}`);
    return await response.json() as UsageForecast;
  }

  async forecastBudget(workspaceId: string): Promise<BudgetForecast> {
    const response = await fetch(
      `${this.getBaseUrl()}/v1/analytics/enterprise/forecasting/budget?workspaceId=${workspaceId}`,
      { headers: this.client.getHeaders() }
    );
    if (!response.ok) throw new Error(`Failed to forecast budget: ${response.statusText}`);
    return await response.json() as BudgetForecast;
  }
}

// ============================================================================
// Real-time Analytics
// ============================================================================

export class RealtimeAnalytics {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  /** Subscribe to real-time events */
  subscribe(
    eventTypes: string[],
    callback: (event: RealtimeEvent) => void,
    options?: { agentId?: string; workspaceId?: string }
  ): { start: () => void; stop: () => void } {
    let running = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const url = new URL(`${this.getBaseUrl()}/v1/analytics/realtime/events`);
        url.searchParams.set('eventTypes', eventTypes.join(','));
        if (options?.agentId) url.searchParams.set('agentId', options.agentId);
        if (options?.workspaceId) url.searchParams.set('workspaceId', options.workspaceId);

        const response = await fetch(url.toString(), { headers: this.client.getHeaders() });
        if (response.ok) {
          const data = await response.json();
          for (const event of data.events || []) {
            callback(event as RealtimeEvent);
          }
        }
      } catch (e) {
        // Ignore polling errors
      }
    };

    return {
      start: () => {
        if (!running) {
          running = true;
          poll();
          intervalId = setInterval(poll, 2000);
        }
      },
      stop: () => {
        running = false;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      },
    };
  }
}

// ============================================================================
// Alert Manager
// ============================================================================

export class AlertManager {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async createRule(options: {
    name: string;
    conditions: Array<{ metric: string; operator: string; threshold: number; durationSeconds?: number }>;
    severity: string;
    notificationChannels?: string[];
  }): Promise<AlertRule> {
    const response = await fetch(`${this.getBaseUrl()}/v1/analytics/alerts/rules`, {
      method: 'POST',
      headers: this.client.getHeaders(),
      body: JSON.stringify(options),
    });
    if (!response.ok) throw new Error(`Failed to create rule: ${response.statusText}`);
    return await response.json() as AlertRule;
  }

  async listActive(workspaceId?: string): Promise<Alert[]> {
    const url = new URL(`${this.getBaseUrl()}/v1/analytics/alerts/active`);
    if (workspaceId) url.searchParams.set('workspaceId', workspaceId);

    const response = await fetch(url.toString(), { headers: this.client.getHeaders() });
    if (!response.ok) throw new Error(`Failed to list alerts: ${response.statusText}`);
    const data = await response.json();
    return data.alerts as Alert[];
  }

  async acknowledge(alertId: string, user: string, comment?: string): Promise<Alert> {
    const response = await fetch(`${this.getBaseUrl()}/v1/analytics/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: this.client.getHeaders(),
      body: JSON.stringify({ user, comment }),
    });
    if (!response.ok) throw new Error(`Failed to acknowledge: ${response.statusText}`);
    return await response.json() as Alert;
  }
}

// ============================================================================
// Custom Metrics
// ============================================================================

export class CustomMetrics {
  constructor(private client: SwfteClient) {}

  private getBaseUrl(): string {
    return this.client.baseUrl.replace('/v2/gateway', '').replace('/v1/gateway', '');
  }

  async createMetric(options: {
    name: string;
    description: string;
    type: string;
    unit?: string;
    formula?: string;
  }): Promise<CustomMetric> {
    const response = await fetch(`${this.getBaseUrl()}/v1/analytics/custom/metrics`, {
      method: 'POST',
      headers: this.client.getHeaders(),
      body: JSON.stringify(options),
    });
    if (!response.ok) throw new Error(`Failed to create metric: ${response.statusText}`);
    return await response.json() as CustomMetric;
  }

  async createDashboard(options: {
    name: string;
    description?: string;
    isShared?: boolean;
  }): Promise<CustomDashboard> {
    const response = await fetch(`${this.getBaseUrl()}/v1/analytics/custom/dashboards`, {
      method: 'POST',
      headers: this.client.getHeaders(),
      body: JSON.stringify(options),
    });
    if (!response.ok) throw new Error(`Failed to create dashboard: ${response.statusText}`);
    return await response.json() as CustomDashboard;
  }

  async query(options: {
    metrics: string[];
    timeRange?: string;
    dimensions?: string[];
  }): Promise<Array<{ metric: string; value: number; timestamp: string }>> {
    const response = await fetch(`${this.getBaseUrl()}/v1/analytics/custom/query`, {
      method: 'POST',
      headers: this.client.getHeaders(),
      body: JSON.stringify(options),
    });
    if (!response.ok) throw new Error(`Failed to query metrics: ${response.statusText}`);
    const data = await response.json();
    return data.values;
  }
}
