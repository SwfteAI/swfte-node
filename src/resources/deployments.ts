import type { SwfteClient } from '../client';

/**
 * Deployment state enum
 */
export type DeploymentState = 
  | 'PENDING'
  | 'STARTING'
  | 'RUNNING'
  | 'STOPPING'
  | 'STOPPED'
  | 'FAILED'
  | 'TERMINATED';

/**
 * Deployment interface
 */
export interface Deployment {
  id: string;
  modelName: string;
  modelType: string;
  state: DeploymentState;
  workspaceId?: string;
  environment?: string;
  podId?: string;
  runpodInstanceId?: string;
  endpointUrl?: string;
  healthCheckUrl?: string;
  statusMessage?: string;
  enabled?: boolean;
  parameters?: Record<string, string>;
  servingFramework?: string;
  createdAt?: string;
  updatedAt?: string;
  lastHealthCheck?: string;
}

/**
 * Deployment creation parameters
 */
export interface CreateDeploymentParams {
  modelName: string;
  modelType?: string;
  useSpot?: boolean;
  gpuType?: string;
  maxModelLen?: number;
  gpuMemoryUtilization?: number;
  containerDiskSize?: number;
  [key: string]: unknown;
}

/**
 * Health status interface
 */
export interface HealthStatus {
  healthy: boolean;
  status: string;
  message?: string;
  lastCheck?: string;
}

/**
 * Deployment list response
 */
export interface DeploymentListResponse {
  deployments: Deployment[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Image generation parameters
 */
export interface ImageGenerationParams {
  model: string;
  prompt: string;
  size?: string;
  n?: number;
  quality?: string;
  style?: string;
  negativePrompt?: string;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
}

/**
 * Image generation response
 */
export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

/**
 * Monitoring statistics
 */
export interface MonitoringStats {
  totalActive: number;
  healthy: number;
  unhealthy: number;
  failed: number;
  healthPercentage: string;
}

/**
 * Recovery statistics
 */
export interface RecoveryStats {
  totalTrackedDeployments: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  exhaustedAttempts: number;
  successRate: string;
}

/**
 * Deployments resource for RunPod GPU model deployments.
 *
 * @example
 * ```typescript
 * const client = new Swfte({ apiKey: 'sk-swfte-...' });
 *
 * // Deploy a model
 * const deployment = await client.deployments.create({
 *   modelName: 'meta-llama/Llama-3.2-8B-Instruct',
 *   modelType: 'chat',
 *   useSpot: true
 * });
 *
 * // Wait for deployment to be ready
 * const ready = await client.deployments.waitForReady(deployment.id);
 *
 * // Terminate deployment
 * await client.deployments.terminate(deployment.id);
 * ```
 */
export class Deployments {
  private client: SwfteClient;

  constructor(client: SwfteClient) {
    this.client = client;
  }

  /**
   * Get the base URL for deployment endpoints.
   */
  private getBaseUrl(): string {
    let base = this.client.baseUrl;
    if (base.includes('/gateway')) {
      base = base.replace('/v1/gateway', '');
    }
    return `${base}/v1/inference`;
  }

  /**
   * Make a request to the deployment API.
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
   * Deploy a model on RunPod GPU infrastructure.
   */
  async create(params: CreateDeploymentParams): Promise<Deployment> {
    const parameters: Record<string, string> = {
      use_spot: String(params.useSpot ?? true),
      gpu_type: params.gpuType || 'NVIDIA RTX A5000',
      gpu_memory_utilization: String(params.gpuMemoryUtilization ?? 0.9),
    };

    if (params.maxModelLen !== undefined) {
      parameters.max_model_len = String(params.maxModelLen);
    }
    if (params.containerDiskSize !== undefined) {
      parameters.container_disk_size = String(params.containerDiskSize);
    }

    // Add any additional parameters
    Object.entries(params).forEach(([key, value]) => {
      if (!['modelName', 'modelType', 'useSpot', 'gpuType', 'maxModelLen', 'gpuMemoryUtilization', 'containerDiskSize'].includes(key)) {
        parameters[key] = String(value);
      }
    });

    const payload = {
      modelName: params.modelName,
      modelType: params.modelType || 'chat',
      parameters,
    };

    return this.makeRequest<Deployment>('POST', `${this.getBaseUrl()}/models/deploy`, payload);
  }

  /**
   * Get deployment details.
   */
  async get(deploymentId: string): Promise<Deployment> {
    return this.makeRequest<Deployment>('GET', `${this.getBaseUrl()}/deployments/${deploymentId}`);
  }

  /**
   * List all deployments.
   */
  async list(page: number = 0, size: number = 20): Promise<Deployment[]> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const response = await this.makeRequest<DeploymentListResponse>(
      'GET',
      `${this.getBaseUrl()}/deployments?${params}`
    );
    return response.deployments || [];
  }

  /**
   * Check deployment health.
   */
  async health(deploymentId: string): Promise<HealthStatus> {
    return this.makeRequest<HealthStatus>('GET', `${this.getBaseUrl()}/deployments/${deploymentId}/health`);
  }

  /**
   * Terminate a deployment.
   */
  async terminate(deploymentId: string): Promise<void> {
    await this.makeRequest<void>('DELETE', `${this.getBaseUrl()}/deployments/${deploymentId}`);
  }

  /**
   * Stop a running deployment pod.
   */
  async stop(deploymentId: string): Promise<{ message: string; status: string }> {
    return this.makeRequest('POST', `${this.getBaseUrl()}/deployments/${deploymentId}/stop`);
  }

  /**
   * Start a stopped deployment pod.
   */
  async start(deploymentId: string): Promise<{ message: string; status: string }> {
    return this.makeRequest('POST', `${this.getBaseUrl()}/deployments/${deploymentId}/start`);
  }

  /**
   * Restart a deployment pod.
   */
  async restart(deploymentId: string): Promise<{ message: string; status: string }> {
    return this.makeRequest('POST', `${this.getBaseUrl()}/deployments/${deploymentId}/restart`);
  }

  /**
   * Wait for a deployment to become ready.
   */
  async waitForReady(
    deploymentId: string,
    timeout: number = 600000,
    pollInterval: number = 30000
  ): Promise<Deployment> {
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout) {
        throw new Error(`Deployment ${deploymentId} did not become ready within ${timeout}ms`);
      }

      const deployment = await this.get(deploymentId);

      if (deployment.state === 'RUNNING') {
        return deployment;
      } else if (deployment.state === 'FAILED') {
        throw new Error(`Deployment ${deploymentId} failed: ${deployment.statusMessage}`);
      } else if (['TERMINATED', 'STOPPED'].includes(deployment.state)) {
        throw new Error(`Deployment ${deploymentId} was terminated or stopped`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Get deployment uptime metrics.
   */
  async getUptime(deploymentId: string): Promise<{ uptimePercentage: number; uptimeHistory: unknown }> {
    return this.makeRequest('GET', `${this.getBaseUrl()}/deployments/${deploymentId}/uptime`);
  }

  /**
   * Get circuit breaker status for a deployment.
   */
  async getCircuitBreaker(deploymentId: string): Promise<{
    circuitBreaker: unknown;
    requestQueue: unknown;
  }> {
    return this.makeRequest('GET', `${this.getBaseUrl()}/deployments/${deploymentId}/circuit-breaker`);
  }

  /**
   * Reset circuit breaker for a deployment.
   */
  async resetCircuitBreaker(deploymentId: string): Promise<{ message: string; status: string }> {
    return this.makeRequest('POST', `${this.getBaseUrl()}/deployments/${deploymentId}/circuit-breaker/reset`);
  }

  /**
   * Trigger recovery for a deployment.
   */
  async triggerRecovery(deploymentId: string): Promise<{ message: string; status: string }> {
    return this.makeRequest('POST', `${this.getBaseUrl()}/deployments/${deploymentId}/recover`);
  }

  /**
   * Get health monitoring statistics.
   */
  async getMonitoringHealth(): Promise<MonitoringStats> {
    return this.makeRequest('GET', `${this.getBaseUrl()}/monitoring/health`);
  }

  /**
   * Get auto-recovery statistics.
   */
  async getMonitoringRecovery(): Promise<RecoveryStats> {
    return this.makeRequest('GET', `${this.getBaseUrl()}/monitoring/recovery`);
  }

  /**
   * Get comprehensive monitoring dashboard data.
   */
  async getMonitoringDashboard(): Promise<{
    health: MonitoringStats;
    recovery: RecoveryStats;
    timestamp: string;
  }> {
    return this.makeRequest('GET', `${this.getBaseUrl()}/monitoring/dashboard`);
  }

  /**
   * Generate images using a deployed image generation model.
   */
  async generateImage(params: ImageGenerationParams): Promise<ImageGenerationResponse> {
    const payload: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
      size: params.size || '1024x1024',
      n: params.n || 1,
      quality: params.quality || 'standard',
      style: params.style || 'vivid',
    };

    if (params.negativePrompt) {
      payload.negative_prompt = params.negativePrompt;
    }
    if (params.steps !== undefined) {
      payload.steps = params.steps;
    }
    if (params.guidanceScale !== undefined) {
      payload.guidance_scale = params.guidanceScale;
    }
    if (params.seed !== undefined) {
      payload.seed = params.seed;
    }

    return this.makeRequest('POST', `${this.getBaseUrl()}/images/generate`, payload);
  }
}







