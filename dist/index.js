"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  APIError: () => APIError,
  Agents: () => Agents,
  Audio: () => Audio,
  AuthenticationError: () => AuthenticationError,
  Chat: () => Chat,
  Completions: () => Completions,
  Deployments: () => Deployments,
  Embeddings: () => Embeddings,
  Images: () => Images,
  InvalidRequestError: () => InvalidRequestError,
  Models: () => Models,
  RateLimitError: () => RateLimitError,
  Speech: () => Speech,
  Swfte: () => client_default,
  SwfteClient: () => SwfteClient,
  SwfteError: () => SwfteError,
  Transcriptions: () => Transcriptions,
  Workflows: () => Workflows,
  default: () => client_default
});
module.exports = __toCommonJS(index_exports);

// src/resources/chat.ts
var Completions = class {
  constructor(client) {
    this.client = client;
  }
  async create(params) {
    if (params.stream) {
      return this.createStream(params);
    }
    return this.client.request("POST", "/chat/completions", params);
  }
  /**
   * Create a streaming chat completion.
   */
  async createStream(params) {
    const response = await this.client.request(
      "POST",
      "/chat/completions/stream",
      params,
      { stream: true }
    );
    return this.parseStream(response);
  }
  /**
   * Parse SSE stream into chunks.
   */
  async *parseStream(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(5).trimStart();
            if (data === "[DONE]") {
              return;
            }
            try {
              yield JSON.parse(data);
            } catch {
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
};
var Chat = class {
  constructor(client) {
    this.completions = new Completions(client);
  }
};

// src/resources/images.ts
var Images = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Generate images from a text prompt.
   *
   * @example
   * ```typescript
   * const response = await client.images.generate({
   *   model: 'openai:dall-e-3',
   *   prompt: 'A sunset over mountains',
   *   size: '1024x1024'
   * });
   * console.log(response.data[0].url);
   * ```
   */
  async generate(params) {
    return this.client.request(
      "POST",
      "/images/generations",
      params,
      { timeout: this.client.timeout * 3 }
    );
  }
  /**
   * Edit an image using a prompt.
   */
  async edit(params) {
    const formData = new FormData();
    formData.append("model", params.model);
    formData.append("image", params.image);
    formData.append("prompt", params.prompt);
    if (params.mask) {
      formData.append("mask", params.mask);
    }
    if (params.n) {
      formData.append("n", params.n.toString());
    }
    if (params.size) {
      formData.append("size", params.size);
    }
    const response = await fetch(`${this.client.baseUrl}/images/edits`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.client.apiKey}`
      },
      body: formData
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  }
};

// src/resources/embeddings.ts
var Embeddings = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Create embeddings for the input text(s).
   *
   * @example
   * ```typescript
   * const response = await client.embeddings.create({
   *   model: 'openai:text-embedding-3-small',
   *   input: 'The quick brown fox jumps over the lazy dog'
   * });
   * console.log(response.data[0].embedding.length);
   * ```
   */
  async create(params) {
    return this.client.request("POST", "/embeddings", params);
  }
};

// src/resources/audio.ts
var Transcriptions = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Transcribe audio to text.
   *
   * @example
   * ```typescript
   * const file = await fs.readFile('audio.mp3');
   * const result = await client.audio.transcriptions.create({
   *   model: 'openai:whisper-1',
   *   file: new Blob([file])
   * });
   * console.log(result.text);
   * ```
   */
  async create(params) {
    const formData = new FormData();
    formData.append("model", params.model);
    const blob = params.file instanceof Blob ? params.file : new Blob([params.file], { type: "audio/mpeg" });
    formData.append("file", blob, "audio.mp3");
    if (params.language) {
      formData.append("language", params.language);
    }
    if (params.prompt) {
      formData.append("prompt", params.prompt);
    }
    if (params.response_format) {
      formData.append("response_format", params.response_format);
    }
    if (params.temperature !== void 0) {
      formData.append("temperature", params.temperature.toString());
    }
    const response = await fetch(`${this.client.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.client.apiKey}`
      },
      body: formData
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    if (params.response_format === "json" || !params.response_format) {
      return response.json();
    }
    return { text: await response.text() };
  }
};
var Speech = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Generate speech from text.
   *
   * @example
   * ```typescript
   * const audio = await client.audio.speech.create({
   *   model: 'openai:tts-1',
   *   input: 'Hello world!',
   *   voice: 'nova'
   * });
   * // audio is an ArrayBuffer
   * ```
   */
  async create(params) {
    const response = await fetch(`${this.client.baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.client.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.arrayBuffer();
  }
};
var Audio = class {
  constructor(client) {
    this.transcriptions = new Transcriptions(client);
    this.speech = new Speech(client);
  }
};

// src/resources/models.ts
var Models = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * List available models.
   *
   * @example
   * ```typescript
   * const models = await client.models.list();
   * for (const model of models.data) {
   *   console.log(`${model.id} - ${model.owned_by}`);
   * }
   * ```
   */
  async list() {
    const response = await this.client.request(
      "GET",
      "/models"
    );
    return "data" in response ? response.data : response.models;
  }
  /**
   * Retrieve a specific model.
   */
  async retrieve(modelId) {
    return this.client.request("GET", `/models/${modelId}`);
  }
};

// src/resources/agents.ts
var Agents = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get the base URL for agent endpoints.
   */
  getBaseUrl() {
    let base = this.client.baseUrl;
    if (base.includes("/gateway")) {
      base = base.replace("/v2/gateway", "").replace("/v1/gateway", "");
    }
    return `${base}/v1/agents`;
  }
  /**
   * Get the V2 base URL for agent endpoints.
   */
  getV2BaseUrl() {
    let base = this.client.baseUrl;
    if (base.includes("/gateway")) {
      base = base.replace("/v2/gateway", "").replace("/v1/gateway", "");
    }
    return `${base}/v2/agents`;
  }
  /**
   * Make a request to the agent API.
   */
  async makeRequest(method, url, body) {
    const headers = this.client.getHeaders();
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return void 0;
    }
    return response.json();
  }
  /**
   * Create a new agent.
   */
  async create(params) {
    const payload = {
      agentName: params.name,
      description: params.description,
      systemPrompt: params.systemPrompt,
      provider: params.provider || "OPENAI",
      model: params.model || "gpt-4",
      temperature: params.temperature ?? 0.7,
      maxTokens: params.maxTokens ?? 2048,
      mode: params.mode || "agent-chat",
      ...params
    };
    return this.makeRequest("POST", this.getBaseUrl(), payload);
  }
  /**
   * Get an agent by ID.
   */
  async get(agentId) {
    return this.makeRequest("GET", `${this.getBaseUrl()}/${agentId}`);
  }
  /**
   * Update an existing agent.
   */
  async update(agentId, params) {
    const current = await this.get(agentId);
    const payload = { ...current, ...params };
    if (params.name !== void 0) {
      payload.agentName = params.name;
    }
    if (params.systemPrompt !== void 0) {
      payload.systemPrompt = params.systemPrompt;
    }
    if (params.maxTokens !== void 0) {
      payload.maxTokens = params.maxTokens;
    }
    return this.makeRequest("PUT", `${this.getBaseUrl()}/${agentId}`, payload);
  }
  /**
   * Partially update an agent using PATCH.
   */
  async patch(agentId, updates) {
    return this.makeRequest("PATCH", `${this.getV2BaseUrl()}/${agentId}`, updates);
  }
  /**
   * Delete an agent.
   */
  async delete(agentId) {
    await this.makeRequest("DELETE", `${this.getBaseUrl()}/${agentId}`);
  }
  /**
   * List all agents.
   */
  async list(page = 1, size = 20) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const response = await this.makeRequest(
      "GET",
      `${this.getBaseUrl()}?${params}`
    );
    return response.agents || [];
  }
  /**
   * Get available input/output types.
   */
  async getIOTypes() {
    return this.makeRequest("GET", `${this.getBaseUrl()}/io-types`);
  }
  /**
   * Get available model options for a provider.
   */
  async getModelOptions(provider) {
    return this.makeRequest(
      "GET",
      `${this.getBaseUrl()}/models/${provider.toUpperCase()}`
    );
  }
  /**
   * Associate a workflow with an agent.
   */
  async associateWorkflow(agentId, workflowId) {
    return this.makeRequest(
      "POST",
      `${this.getV2BaseUrl()}/${agentId}/workflow`,
      { workflowId }
    );
  }
  /**
   * Update agent avatar configuration.
   */
  async updateAvatar(agentId, avatarConfig) {
    return this.makeRequest(
      "PATCH",
      `${this.getV2BaseUrl()}/${agentId}/avatar`,
      avatarConfig
    );
  }
  /**
   * Get system agents.
   */
  async getSystemAgents() {
    return this.makeRequest("GET", `${this.getBaseUrl()}/system`);
  }
};

// src/resources/deployments.ts
var Deployments = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get the base URL for deployment endpoints.
   */
  getBaseUrl() {
    let base = this.client.baseUrl;
    if (base.includes("/gateway")) {
      base = base.replace("/v2/gateway", "").replace("/v1/gateway", "");
    }
    return `${base}/v1/inference`;
  }
  /**
   * Make a request to the deployment API.
   */
  async makeRequest(method, url, body) {
    const headers = this.client.getHeaders();
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return void 0;
    }
    return response.json();
  }
  /**
   * Deploy a model on RunPod GPU infrastructure.
   */
  async create(params) {
    const parameters = {
      use_spot: String(params.useSpot ?? true),
      gpu_type: params.gpuType || "NVIDIA RTX A5000",
      gpu_memory_utilization: String(params.gpuMemoryUtilization ?? 0.9)
    };
    if (params.maxModelLen !== void 0) {
      parameters.max_model_len = String(params.maxModelLen);
    }
    if (params.containerDiskSize !== void 0) {
      parameters.container_disk_size = String(params.containerDiskSize);
    }
    Object.entries(params).forEach(([key, value]) => {
      if (!["modelName", "modelType", "useSpot", "gpuType", "maxModelLen", "gpuMemoryUtilization", "containerDiskSize"].includes(key)) {
        parameters[key] = String(value);
      }
    });
    const payload = {
      modelName: params.modelName,
      modelType: params.modelType || "chat",
      parameters
    };
    return this.makeRequest("POST", `${this.getBaseUrl()}/models/deploy`, payload);
  }
  /**
   * Get deployment details.
   */
  async get(deploymentId) {
    return this.makeRequest("GET", `${this.getBaseUrl()}/deployments/${deploymentId}`);
  }
  /**
   * List all deployments.
   */
  async list(page = 0, size = 20) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const response = await this.makeRequest(
      "GET",
      `${this.getBaseUrl()}/deployments?${params}`
    );
    return response.deployments || [];
  }
  /**
   * Check deployment health.
   */
  async health(deploymentId) {
    return this.makeRequest("GET", `${this.getBaseUrl()}/deployments/${deploymentId}/health`);
  }
  /**
   * Terminate a deployment.
   */
  async terminate(deploymentId) {
    await this.makeRequest("DELETE", `${this.getBaseUrl()}/deployments/${deploymentId}`);
  }
  /**
   * Stop a running deployment pod.
   */
  async stop(deploymentId) {
    return this.makeRequest("POST", `${this.getBaseUrl()}/deployments/${deploymentId}/stop`);
  }
  /**
   * Start a stopped deployment pod.
   */
  async start(deploymentId) {
    return this.makeRequest("POST", `${this.getBaseUrl()}/deployments/${deploymentId}/start`);
  }
  /**
   * Restart a deployment pod.
   */
  async restart(deploymentId) {
    return this.makeRequest("POST", `${this.getBaseUrl()}/deployments/${deploymentId}/restart`);
  }
  /**
   * Wait for a deployment to become ready.
   */
  async waitForReady(deploymentId, timeout = 6e5, pollInterval = 3e4) {
    const startTime = Date.now();
    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout) {
        throw new Error(`Deployment ${deploymentId} did not become ready within ${timeout}ms`);
      }
      const deployment = await this.get(deploymentId);
      if (deployment.state === "RUNNING") {
        return deployment;
      } else if (deployment.state === "FAILED") {
        throw new Error(`Deployment ${deploymentId} failed: ${deployment.statusMessage}`);
      } else if (["TERMINATED", "STOPPED"].includes(deployment.state)) {
        throw new Error(`Deployment ${deploymentId} was terminated or stopped`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
  /**
   * Get deployment uptime metrics.
   */
  async getUptime(deploymentId) {
    return this.makeRequest("GET", `${this.getBaseUrl()}/deployments/${deploymentId}/uptime`);
  }
  /**
   * Get circuit breaker status for a deployment.
   */
  async getCircuitBreaker(deploymentId) {
    return this.makeRequest("GET", `${this.getBaseUrl()}/deployments/${deploymentId}/circuit-breaker`);
  }
  /**
   * Reset circuit breaker for a deployment.
   */
  async resetCircuitBreaker(deploymentId) {
    return this.makeRequest("POST", `${this.getBaseUrl()}/deployments/${deploymentId}/circuit-breaker/reset`);
  }
  /**
   * Trigger recovery for a deployment.
   */
  async triggerRecovery(deploymentId) {
    return this.makeRequest("POST", `${this.getBaseUrl()}/deployments/${deploymentId}/recover`);
  }
  /**
   * Get health monitoring statistics.
   */
  async getMonitoringHealth() {
    return this.makeRequest("GET", `${this.getBaseUrl()}/monitoring/health`);
  }
  /**
   * Get auto-recovery statistics.
   */
  async getMonitoringRecovery() {
    return this.makeRequest("GET", `${this.getBaseUrl()}/monitoring/recovery`);
  }
  /**
   * Get comprehensive monitoring dashboard data.
   */
  async getMonitoringDashboard() {
    return this.makeRequest("GET", `${this.getBaseUrl()}/monitoring/dashboard`);
  }
  /**
   * Generate images using a deployed image generation model.
   */
  async generateImage(params) {
    const payload = {
      model: params.model,
      prompt: params.prompt,
      size: params.size || "1024x1024",
      n: params.n || 1,
      quality: params.quality || "standard",
      style: params.style || "vivid"
    };
    if (params.negativePrompt) {
      payload.negative_prompt = params.negativePrompt;
    }
    if (params.steps !== void 0) {
      payload.steps = params.steps;
    }
    if (params.guidanceScale !== void 0) {
      payload.guidance_scale = params.guidanceScale;
    }
    if (params.seed !== void 0) {
      payload.seed = params.seed;
    }
    return this.makeRequest("POST", `${this.getBaseUrl()}/images/generate`, payload);
  }
};

// src/resources/workflows.ts
var Workflows = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get the base URL for workflow endpoints.
   */
  getBaseUrl() {
    let base = this.client.baseUrl;
    if (base.includes("/gateway")) {
      base = base.replace("/v2/gateway", "").replace("/v1/gateway", "");
    }
    return `${base}/v2/workflows`;
  }
  /**
   * Make a request to the workflow API.
   */
  async makeRequest(method, url, body) {
    const headers = this.client.getHeaders();
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return void 0;
    }
    return response.json();
  }
  /**
   * Create a new workflow.
   */
  async create(params) {
    const payload = {
      name: params.name,
      nodes: params.nodes,
      edges: params.edges || [],
      description: params.description,
      active: params.active ?? true,
      variables: params.variables || {},
      workspaceId: this.client.workspaceId,
      ...params
    };
    return this.makeRequest("POST", this.getBaseUrl(), payload);
  }
  /**
   * Get a workflow by ID.
   */
  async get(workflowId) {
    return this.makeRequest("GET", `${this.getBaseUrl()}/${workflowId}`);
  }
  /**
   * Update an existing workflow.
   */
  async update(workflowId, params) {
    const current = await this.get(workflowId);
    const payload = { ...current, ...params };
    return this.makeRequest("PUT", `${this.getBaseUrl()}/${workflowId}`, payload);
  }
  /**
   * Partially update a workflow.
   */
  async patch(workflowId, updates) {
    return this.makeRequest("PATCH", `${this.getBaseUrl()}/${workflowId}`, updates);
  }
  /**
   * Delete a workflow.
   */
  async delete(workflowId, force = false) {
    const url = force ? `${this.getBaseUrl()}/${workflowId}?force=true` : `${this.getBaseUrl()}/${workflowId}`;
    await this.makeRequest("DELETE", url);
  }
  /**
   * List all workflows.
   */
  async list(page = 0, size = 20, options) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (options?.status) {
      params.set("status", options.status);
    }
    if (options?.search) {
      params.set("search", options.search);
    }
    const response = await this.makeRequest(
      "GET",
      `${this.getBaseUrl()}?${params}`
    );
    return response.content || response.workflows || [];
  }
  /**
   * Validate a workflow definition.
   */
  async validate(params) {
    const payload = {
      name: params.name,
      nodes: params.nodes,
      edges: params.edges || [],
      ...params
    };
    return this.makeRequest("POST", `${this.getBaseUrl()}/validate`, payload);
  }
  /**
   * Execute a workflow.
   */
  async execute(workflowId, inputs, skipValidation = false) {
    const url = skipValidation ? `${this.getBaseUrl()}/${workflowId}/execute?skipValidation=true` : `${this.getBaseUrl()}/${workflowId}/execute`;
    return this.makeRequest("POST", url, inputs || {});
  }
  /**
   * Get execution status.
   */
  async getExecutionStatus(executionId) {
    return this.makeRequest(
      "GET",
      `${this.getBaseUrl()}/executions/${executionId}/status`
    );
  }
  /**
   * Pause a running execution.
   */
  async pauseExecution(executionId) {
    return this.makeRequest(
      "POST",
      `${this.getBaseUrl()}/executions/${executionId}/pause`
    );
  }
  /**
   * Resume a paused execution.
   */
  async resumeExecution(executionId) {
    return this.makeRequest(
      "POST",
      `${this.getBaseUrl()}/executions/${executionId}/resume`
    );
  }
  /**
   * Get execution history for a workflow.
   */
  async getExecutionHistory(workflowId) {
    const response = await this.makeRequest(
      "GET",
      `${this.getBaseUrl()}/${workflowId}/executions`
    );
    return Array.isArray(response) ? response : [];
  }
  /**
   * Wait for a workflow execution to complete.
   */
  async waitForCompletion(executionId, timeout = 3e5, pollInterval = 5e3) {
    const startTime = Date.now();
    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout) {
        throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
      }
      const execution = await this.getExecutionStatus(executionId);
      if (execution.status === "COMPLETED") {
        return execution;
      } else if (execution.status === "FAILED") {
        throw new Error(`Execution ${executionId} failed: ${execution.error}`);
      } else if (execution.status === "CANCELLED") {
        throw new Error(`Execution ${executionId} was cancelled`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
  /**
   * Clone a workflow.
   */
  async clone(workflowId, newName, includeHistory = false) {
    const params = new URLSearchParams({ newName, includeHistory: String(includeHistory) });
    return this.makeRequest("POST", `${this.getBaseUrl()}/${workflowId}/clone?${params}`);
  }
  /**
   * Export a workflow.
   */
  async export(workflowId, format = "json", includeMetadata = true) {
    const params = new URLSearchParams({ format, includeMetadata: String(includeMetadata) });
    return this.makeRequest(
      "GET",
      `${this.getBaseUrl()}/${workflowId}/export?${params}`
    );
  }
  /**
   * Get workflow analytics.
   */
  async getAnalytics(workflowId, days = 30, detailed = false) {
    const params = new URLSearchParams({ days: String(days), detailed: String(detailed) });
    return this.makeRequest(
      "GET",
      `${this.getBaseUrl()}/${workflowId}/analytics?${params}`
    );
  }
  /**
   * Search workflows.
   */
  async search(query, page = 0, size = 20) {
    const params = new URLSearchParams({ query, page: String(page), size: String(size) });
    const response = await this.makeRequest(
      "GET",
      `${this.getBaseUrl()}/search?${params}`
    );
    return response.content || [];
  }
  /**
   * Link an agent to a workflow.
   */
  async linkAgent(workflowId, agentId) {
    await this.makeRequest(
      "POST",
      `${this.getBaseUrl()}/${workflowId}/agent/${agentId}`
    );
  }
  /**
   * Unlink an agent from a workflow.
   */
  async unlinkAgent(workflowId, agentId) {
    await this.makeRequest(
      "DELETE",
      `${this.getBaseUrl()}/${workflowId}/agent/${agentId}`
    );
  }
};

// src/resources/secrets.ts
var Secrets = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get the base URL for secret endpoints.
   */
  getBaseUrl() {
    let base = this.client.baseUrl;
    if (base.includes("/gateway")) {
      base = base.replace("/v1/gateway", "").replace("/v2/gateway", "");
    }
    return `${base}/v1/secrets`;
  }
  /**
   * Make a request to the secrets API.
   */
  async makeRequest(method, url, body, params) {
    const headers = this.client.getHeaders();
    let fullUrl = url;
    if (params) {
      const searchParams = new URLSearchParams(params);
      fullUrl = `${url}?${searchParams}`;
    }
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return void 0;
    }
    return response.json();
  }
  /**
   * Create a new manual secret.
   */
  async create(params) {
    const payload = {
      name: params.name,
      value: params.value,
      description: params.description,
      category: params.category,
      environment: params.environment,
      toolId: params.toolId,
      expiresAt: params.expiresAt,
      metadata: params.metadata
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === void 0) {
        delete payload[key];
      }
    });
    return this.makeRequest("POST", this.getBaseUrl(), payload);
  }
  /**
   * Create an OAuth token secret.
   */
  async createOAuth(params) {
    const payload = {
      provider: params.provider,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      tokenType: params.tokenType || "Bearer",
      scope: params.scope,
      expiresIn: params.expiresIn,
      toolId: params.toolId,
      metadata: params.metadata
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === void 0) {
        delete payload[key];
      }
    });
    return this.makeRequest("POST", `${this.getBaseUrl()}/oauth`, payload);
  }
  /**
   * Create an MCP token secret.
   */
  async createMcp(params) {
    const payload = {
      toolId: params.toolId,
      token: params.token,
      tokenType: params.tokenType || "Bearer",
      scope: params.scope,
      expiresIn: params.expiresIn,
      metadata: params.metadata
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === void 0) {
        delete payload[key];
      }
    });
    return this.makeRequest("POST", `${this.getBaseUrl()}/mcp`, payload);
  }
  /**
   * Get a secret by ID.
   */
  async get(secretId) {
    return this.makeRequest("GET", `${this.getBaseUrl()}/${secretId}`);
  }
  /**
   * List secrets with optional filtering.
   */
  async list(params = {}) {
    const queryParams = {
      page: String(params.page ?? 0),
      size: String(params.size ?? 20)
    };
    if (params.environment) queryParams.environment = params.environment;
    if (params.toolId) queryParams.toolId = params.toolId;
    if (params.category) queryParams.category = params.category;
    if (params.status) queryParams.status = params.status;
    const response = await this.makeRequest(
      "GET",
      this.getBaseUrl(),
      void 0,
      queryParams
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.secrets || [];
  }
  /**
   * Update a secret.
   */
  async update(secretId, params) {
    const payload = { ...params };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === void 0) {
        delete payload[key];
      }
    });
    return this.makeRequest("PUT", `${this.getBaseUrl()}/${secretId}`, payload);
  }
  /**
   * Delete a secret.
   */
  async delete(secretId) {
    await this.makeRequest("DELETE", `${this.getBaseUrl()}/${secretId}`);
  }
  /**
   * Refresh an OAuth token.
   */
  async refreshOAuth(secretId) {
    return this.makeRequest("POST", `${this.getBaseUrl()}/${secretId}/refresh`);
  }
  /**
   * Revoke a secret.
   */
  async revoke(secretId) {
    return this.makeRequest("POST", `${this.getBaseUrl()}/${secretId}/revoke`);
  }
  /**
   * Get the actual secret value (decrypted).
   */
  async getValue(secretId) {
    const response = await this.makeRequest(
      "GET",
      `${this.getBaseUrl()}/${secretId}/value`
    );
    return response.value;
  }
  /**
   * Rotate a secret with a new value.
   */
  async rotate(secretId, newValue) {
    return this.makeRequest(
      "POST",
      `${this.getBaseUrl()}/${secretId}/rotate`,
      { value: newValue }
    );
  }
};

// src/resources/conversations.ts
var Conversations = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get the base URL for conversation endpoints.
   */
  getBaseUrl() {
    let base = this.client.baseUrl;
    if (base.includes("/gateway")) {
      base = base.replace("/v1/gateway", "").replace("/v2/gateway", "");
    }
    return `${base}/v1/conversations`;
  }
  /**
   * Make a request to the conversations API.
   */
  async makeRequest(method, url, body, params) {
    const headers = this.client.getHeaders();
    let fullUrl = url;
    if (params) {
      const searchParams = new URLSearchParams(params);
      fullUrl = `${url}?${searchParams}`;
    }
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return void 0;
    }
    return response.json();
  }
  /**
   * Create a new conversation.
   */
  async create(params = {}) {
    const payload = { ...params };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === void 0) {
        delete payload[key];
      }
    });
    return this.makeRequest("POST", this.getBaseUrl(), payload);
  }
  /**
   * Get a conversation by ID.
   */
  async get(conversationId) {
    return this.makeRequest("GET", `${this.getBaseUrl()}/${conversationId}`);
  }
  /**
   * List conversations.
   */
  async list(params = {}) {
    const queryParams = {
      page: String(params.page ?? 0),
      size: String(params.size ?? 20)
    };
    if (params.agentId) queryParams.agentId = params.agentId;
    const response = await this.makeRequest(
      "GET",
      this.getBaseUrl(),
      void 0,
      queryParams
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.conversations || [];
  }
  /**
   * Update a conversation.
   */
  async update(conversationId, params) {
    const payload = { ...params };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === void 0) {
        delete payload[key];
      }
    });
    return this.makeRequest("PUT", `${this.getBaseUrl()}/${conversationId}`, payload);
  }
  /**
   * Delete a conversation.
   */
  async delete(conversationId) {
    await this.makeRequest("DELETE", `${this.getBaseUrl()}/${conversationId}`);
  }
  /**
   * Add a message to a conversation.
   */
  async addMessage(conversationId, params) {
    const payload = {
      role: params.role,
      content: params.content,
      name: params.name,
      toolCalls: params.toolCalls,
      toolCallId: params.toolCallId,
      metadata: params.metadata
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === void 0) {
        delete payload[key];
      }
    });
    return this.makeRequest(
      "POST",
      `${this.getBaseUrl()}/${conversationId}/messages`,
      payload
    );
  }
  /**
   * Get messages from a conversation with pagination.
   */
  async getMessages(conversationId, params = {}) {
    const queryParams = {
      limit: String(params.limit ?? 50),
      order: params.order || "desc"
    };
    if (params.beforeToken) queryParams.beforeToken = params.beforeToken;
    if (params.afterToken) queryParams.afterToken = params.afterToken;
    return this.makeRequest(
      "GET",
      `${this.getBaseUrl()}/${conversationId}/messages`,
      void 0,
      queryParams
    );
  }
  /**
   * Get a specific message.
   */
  async getMessage(conversationId, messageId) {
    return this.makeRequest(
      "GET",
      `${this.getBaseUrl()}/${conversationId}/messages/${messageId}`
    );
  }
  /**
   * Delete a message from a conversation.
   */
  async deleteMessage(conversationId, messageId) {
    await this.makeRequest(
      "DELETE",
      `${this.getBaseUrl()}/${conversationId}/messages/${messageId}`
    );
  }
  /**
   * Clear all messages from a conversation.
   */
  async clearMessages(conversationId) {
    await this.makeRequest(
      "POST",
      `${this.getBaseUrl()}/${conversationId}/messages/clear`
    );
  }
};

// src/errors.ts
var SwfteError = class _SwfteError extends Error {
  constructor(message) {
    super(message);
    this.name = "SwfteError";
    Object.setPrototypeOf(this, _SwfteError.prototype);
  }
};
var AuthenticationError = class _AuthenticationError extends SwfteError {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, _AuthenticationError.prototype);
  }
};
var RateLimitError = class _RateLimitError extends SwfteError {
  constructor(message = "Rate limit exceeded") {
    super(message);
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, _RateLimitError.prototype);
  }
};
var APIError = class _APIError extends SwfteError {
  constructor(message, status = 500, body) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.body = body;
    Object.setPrototypeOf(this, _APIError.prototype);
  }
};
var InvalidRequestError = class _InvalidRequestError extends SwfteError {
  constructor(message = "Invalid request") {
    super(message);
    this.name = "InvalidRequestError";
    Object.setPrototypeOf(this, _InvalidRequestError.prototype);
  }
};

// src/client.ts
var SwfteClient = class {
  constructor(config) {
    const apiKey = config.apiKey || process.env.SWFTE_API_KEY;
    if (!apiKey) {
      throw new AuthenticationError(
        "API key is required. Pass apiKey in config or set SWFTE_API_KEY environment variable."
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (config.baseUrl || "https://api.swfte.com/v2/gateway").replace(/\/$/, "");
    this.timeout = config.timeout || 6e4;
    this.maxRetries = config.maxRetries || 3;
    this.workspaceId = config.workspaceId || process.env.SWFTE_WORKSPACE_ID;
    this._fetch = config.fetch || fetch;
    this.chat = new Chat(this);
    this.images = new Images(this);
    this.embeddings = new Embeddings(this);
    this.audio = new Audio(this);
    this.models = new Models(this);
    this.agents = new Agents(this);
    this.deployments = new Deployments(this);
    this.workflows = new Workflows(this);
    this.secrets = new Secrets(this);
    this.conversations = new Conversations(this);
  }
  /**
   * Get default headers for API requests.
   */
  getHeaders() {
    const headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "swfte-js/1.0.0"
    };
    if (this.workspaceId) {
      headers["X-Workspace-ID"] = this.workspaceId;
    }
    return headers;
  }
  /**
   * Make an HTTP request with retry logic.
   */
  async request(method, path, body, options) {
    const url = `${this.baseUrl}${path}`;
    const timeout = options?.timeout || this.timeout;
    let lastError = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await this._fetch(url, {
          method,
          headers: this.getHeaders(),
          body: body ? JSON.stringify(body) : void 0,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.status === 401) {
          throw new AuthenticationError("Invalid API key");
        }
        if (!response.ok) {
          const errorBody = await response.text();
          throw new SwfteError(`API error: ${response.status} - ${errorBody}`);
        }
        if (options?.stream) {
          return response.body;
        }
        return await response.json();
      } catch (error) {
        lastError = error;
        if (error instanceof AuthenticationError) {
          throw error;
        }
        if (attempt === this.maxRetries - 1) {
          throw lastError;
        }
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
    throw lastError || new SwfteError("Request failed");
  }
};
var client_default = SwfteClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APIError,
  Agents,
  Audio,
  AuthenticationError,
  Chat,
  Completions,
  Deployments,
  Embeddings,
  Images,
  InvalidRequestError,
  Models,
  RateLimitError,
  Speech,
  Swfte,
  SwfteClient,
  SwfteError,
  Transcriptions,
  Workflows
});
