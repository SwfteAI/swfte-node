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
  AgentWizard: () => AgentWizard,
  Agents: () => Agents,
  Audio: () => Audio,
  Audit: () => Audit,
  AuthenticationError: () => AuthenticationError,
  Chat: () => Chat,
  ChatFlows: () => ChatFlows,
  Completions: () => Completions,
  ConversationsV2: () => ConversationsV2,
  CostControl: () => CostControl,
  Datasets: () => Datasets,
  Deployments: () => Deployments,
  Documents: () => Documents,
  Embeddings: () => Embeddings,
  Files: () => Files,
  Images: () => Images,
  InvalidRequestError: () => InvalidRequestError,
  Marketplace: () => Marketplace,
  Mcp: () => Mcp,
  Models: () => Models,
  Modules: () => Modules,
  Rag: () => Rag,
  RateLimitError: () => RateLimitError,
  Speech: () => Speech,
  Swfte: () => client_default,
  SwfteClient: () => SwfteClient,
  SwfteError: () => SwfteError,
  Transcriptions: () => Transcriptions,
  VoiceCalls: () => VoiceCalls,
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
      ...params,
      name: params.name,
      nodes: params.nodes,
      edges: params.edges || [],
      description: params.description,
      active: params.active ?? true,
      variables: params.variables || {},
      workspaceId: this.client.workspaceId
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
      ...params,
      name: params.name,
      nodes: params.nodes,
      edges: params.edges || []
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

// src/resources/_base.ts
var V2Resource = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Resolve the workspace-service host from the configured baseUrl.
   *
   * Strips any `/v1/gateway` or `/v2/gateway` suffix so the resource module
   * can build absolute paths under `/v2/...` or `/api/v2/...`.
   */
  host() {
    let base = this.client.baseUrl;
    if (base.includes("/gateway")) {
      base = base.replace("/v2/gateway", "").replace("/v1/gateway", "");
    }
    return base.replace(/\/$/, "");
  }
  url(path) {
    if (path.startsWith("http")) return path;
    return `${this.host()}${path.startsWith("/") ? "" : "/"}${path}`;
  }
  qs(params) {
    if (!params) return "";
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === void 0 || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v) usp.append(k, String(item));
      } else {
        usp.append(k, String(v));
      }
    }
    const s = usp.toString();
    return s ? `?${s}` : "";
  }
  async request(method, path, body, query) {
    const headers = this.client.getHeaders();
    const fullUrl = this.url(path) + this.qs(query);
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} - ${errorBody}`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return void 0;
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    if (contentType.startsWith("text/")) {
      return await response.text();
    }
    return await response.arrayBuffer();
  }
};

// src/resources/conversationsV2.ts
var ConversationsV2 = class extends V2Resource {
  initiate(params) {
    return this.request("POST", "/v2/conversations/initiate", params);
  }
  get(conversationId) {
    return this.request("GET", `/v2/conversations/${encodeURIComponent(conversationId)}`);
  }
  list(params) {
    return this.request("GET", "/v2/conversations", void 0, params);
  }
  terminate(conversationId, reason) {
    return this.request(
      "POST",
      `/v2/conversations/${encodeURIComponent(conversationId)}/terminate`,
      reason ? { reason } : {}
    );
  }
  transcript(conversationId) {
    return this.request("GET", `/v2/conversations/${encodeURIComponent(conversationId)}/transcript`);
  }
  recording(conversationId) {
    return this.request("GET", `/v2/conversations/${encodeURIComponent(conversationId)}/recording`);
  }
  scheduledRetries() {
    return this.request("GET", "/v2/conversations/scheduled-retries");
  }
  cancelRetries(conversationId) {
    return this.request(
      "POST",
      `/v2/conversations/${encodeURIComponent(conversationId)}/cancel-retries`
    );
  }
};

// src/resources/agentWizard.ts
var AgentWizard = class extends V2Resource {
  /** Generate a draft agent from a freeform prompt. */
  generate(params) {
    return this.request("POST", "/v2/agents/wizard/generate", params);
  }
  /** Quick generate — skips review and persists immediately. */
  quick(params) {
    return this.request("POST", "/v2/agents/wizard/quick", params);
  }
  /** Submit the draft for an automated review pass. */
  review(draftId) {
    return this.request("POST", "/v2/agents/wizard/review", { draftId });
  }
  /** Refine a draft using user feedback. */
  refine(params) {
    return this.request("POST", "/v2/agents/wizard/refine", params);
  }
  /** Persist a draft as a real agent. */
  create(params) {
    return this.request(
      "POST",
      "/v2/agents/wizard/create",
      params
    );
  }
  /** Link MCP tools to an existing agent. */
  linkTools(agentId, toolIds) {
    return this.request("POST", "/v2/agents/wizard/link-tools", { agentId, toolIds });
  }
  /** Link knowledge bases (datasets) to an agent. */
  linkKnowledge(agentId, datasetIds) {
    return this.request("POST", "/v2/agents/wizard/link-knowledge", { agentId, datasetIds });
  }
  /** List agent templates. */
  listTemplates() {
    return this.request("GET", "/v2/agents/wizard/templates");
  }
  /** Get a single template by name. */
  getTemplate(name) {
    return this.request("GET", `/v2/agents/wizard/templates/${encodeURIComponent(name)}`);
  }
  /** List supported agent types. */
  listAgentTypes() {
    return this.request("GET", "/v2/agents/wizard/agent-types");
  }
  /** List available providers. */
  listProviders() {
    return this.request("GET", "/v2/agents/wizard/providers");
  }
  /** Create an agent from a named template. */
  fromTemplate(templateName, params) {
    return this.request(
      "POST",
      `/v2/agents/wizard/from-template/${encodeURIComponent(templateName)}`,
      params || {}
    );
  }
};

// src/resources/chatflows.ts
var ChatFlowBuilder = class extends V2Resource {
  fieldTypes() {
    return this.request("GET", "/v2/chatflows/builder/field-types");
  }
  actionTypes() {
    return this.request("GET", "/v2/chatflows/builder/action-types");
  }
  pressStrategies() {
    return this.request("GET", "/v2/chatflows/builder/press-strategies");
  }
  templates() {
    return this.request("GET", "/v2/chatflows/builder/templates");
  }
  fromTemplate(templateId, params) {
    return this.request(
      "POST",
      `/v2/chatflows/builder/from-template/${encodeURIComponent(templateId)}`,
      params || {}
    );
  }
  fromTemplateDynamic(templateId, params) {
    return this.request(
      "POST",
      `/v2/chatflows/builder/from-template/${encodeURIComponent(templateId)}/dynamic`,
      params
    );
  }
  previewPrompt(templateId, params) {
    return this.request(
      "POST",
      `/v2/chatflows/builder/from-template/${encodeURIComponent(templateId)}/preview-prompt`,
      params
    );
  }
  regeneratePrompt(chatflowId, params) {
    return this.request(
      "POST",
      `/v2/chatflows/builder/${encodeURIComponent(chatflowId)}/regenerate-prompt`,
      params || {}
    );
  }
  preview(draft) {
    return this.request("POST", "/v2/chatflows/builder/preview", draft);
  }
  test(chatflowId, params) {
    return this.request("POST", `/v2/chatflows/builder/${encodeURIComponent(chatflowId)}/test`, params || {});
  }
  export(chatflowId) {
    return this.request("GET", `/v2/chatflows/builder/${encodeURIComponent(chatflowId)}/export`);
  }
  import(json) {
    return this.request("POST", "/v2/chatflows/builder/import", json);
  }
  previewVoice(params) {
    return this.request("POST", "/v2/chatflows/builder/preview-voice", params);
  }
};
var ChatFlowVersions = class extends V2Resource {
  list(chatflowId) {
    return this.request("GET", `/v2/chatflows/${encodeURIComponent(chatflowId)}/versions`);
  }
  get(chatflowId, version) {
    return this.request("GET", `/v2/chatflows/${encodeURIComponent(chatflowId)}/versions/${version}`);
  }
  create(chatflowId, params) {
    return this.request("POST", `/v2/chatflows/${encodeURIComponent(chatflowId)}/versions`, params || {});
  }
  promote(chatflowId, version) {
    return this.request(
      "POST",
      `/v2/chatflows/${encodeURIComponent(chatflowId)}/versions/${version}/promote`
    );
  }
  archive(chatflowId, version) {
    return this.request(
      "POST",
      `/v2/chatflows/${encodeURIComponent(chatflowId)}/versions/${version}/archive`
    );
  }
};
var ChatFlows = class extends V2Resource {
  constructor(client) {
    super(client);
    this.builder = new ChatFlowBuilder(client);
    this.versions = new ChatFlowVersions(client);
  }
  create(params) {
    return this.request("POST", "/v2/chatflows", params);
  }
  get(id) {
    return this.request("GET", `/v2/chatflows/${encodeURIComponent(id)}`);
  }
  list(params) {
    return this.request("GET", "/v2/chatflows", void 0, params);
  }
  update(id, params) {
    return this.request("PUT", `/v2/chatflows/${encodeURIComponent(id)}`, params);
  }
  delete(id) {
    return this.request("DELETE", `/v2/chatflows/${encodeURIComponent(id)}`);
  }
  validate(id) {
    return this.request("POST", `/v2/chatflows/${encodeURIComponent(id)}/validate`);
  }
  deploy(id) {
    return this.request("POST", `/v2/chatflows/${encodeURIComponent(id)}/deploy`);
  }
  undeploy(id) {
    return this.request("POST", `/v2/chatflows/${encodeURIComponent(id)}/undeploy`);
  }
  /** Start a session against a chatflow. */
  startSession(id, params) {
    return this.request("POST", `/v2/chatflows/${encodeURIComponent(id)}/sessions`, params || {});
  }
  listSessions(id, params) {
    return this.request(
      "GET",
      `/v2/chatflows/${encodeURIComponent(id)}/sessions`,
      void 0,
      params
    );
  }
  stats(id) {
    return this.request("GET", `/v2/chatflows/${encodeURIComponent(id)}/stats`);
  }
  getSession(sessionId) {
    return this.request("GET", `/v2/chatflows/sessions/${encodeURIComponent(sessionId)}`);
  }
  /** Publish to the workspace or organisation marketplace. */
  publish(id, params) {
    return this.request("POST", `/v2/chatflows/${encodeURIComponent(id)}/publish`, params || {});
  }
  getPublished(id) {
    return this.request("GET", `/v2/chatflows/${encodeURIComponent(id)}/published`);
  }
};

// src/resources/datasets.ts
var Datasets = class extends V2Resource {
  list(params) {
    return this.request("GET", "/api/v2/datasets", void 0, params);
  }
  create(params) {
    return this.request("POST", "/api/v2/datasets", params);
  }
  get(id) {
    return this.request("GET", `/api/v2/datasets/${encodeURIComponent(id)}`);
  }
  update(id, params) {
    return this.request("PUT", `/api/v2/datasets/${encodeURIComponent(id)}`, params);
  }
  delete(id) {
    return this.request("DELETE", `/api/v2/datasets/${encodeURIComponent(id)}`);
  }
  /** Check whether the dataset is referenced by any agent/chatflow/workflow. */
  useCheck(id) {
    return this.request("GET", `/api/v2/datasets/${encodeURIComponent(id)}/use-check`);
  }
  /** Toggle whether external API callers can query this dataset. */
  setApiAccess(id, status) {
    return this.request(
      "POST",
      `/api/v2/datasets/${encodeURIComponent(id)}/api-access/${encodeURIComponent(status)}`
    );
  }
};

// src/resources/documents.ts
var Documents = class extends V2Resource {
  docPath(datasetId, suffix = "") {
    return `/api/v2/datasets/${encodeURIComponent(datasetId)}/documents${suffix}`;
  }
  create(datasetId, params) {
    return this.request("POST", this.docPath(datasetId), params);
  }
  list(datasetId, params) {
    return this.request("GET", this.docPath(datasetId), void 0, params);
  }
  get(datasetId, documentId) {
    return this.request("GET", this.docPath(datasetId, `/${encodeURIComponent(documentId)}`));
  }
  update(datasetId, documentId, params) {
    return this.request("PUT", this.docPath(datasetId, `/${encodeURIComponent(documentId)}`), params);
  }
  delete(datasetId, documentId) {
    return this.request("DELETE", this.docPath(datasetId, `/${encodeURIComponent(documentId)}`));
  }
  segments(datasetId, documentId) {
    return this.request("GET", this.docPath(datasetId, `/${encodeURIComponent(documentId)}/segments`));
  }
  retry(datasetId, documentId) {
    return this.request("POST", this.docPath(datasetId, `/${encodeURIComponent(documentId)}/retry`));
  }
  pause(datasetId, documentId) {
    return this.request("POST", this.docPath(datasetId, `/${encodeURIComponent(documentId)}/pause`));
  }
  resume(datasetId, documentId) {
    return this.request("POST", this.docPath(datasetId, `/${encodeURIComponent(documentId)}/resume`));
  }
  processingStatus(datasetId) {
    return this.request("GET", this.docPath(datasetId, "/processing-status"));
  }
  batchUpdate(datasetId, entries) {
    return this.request("PATCH", this.docPath(datasetId, "/batch"), { entries });
  }
  batchStatus(datasetId, batchId) {
    return this.request(
      "GET",
      this.docPath(datasetId, `/batch/${encodeURIComponent(batchId)}/status`)
    );
  }
};

// src/resources/files.ts
function toBlob(data, contentType) {
  if (data instanceof Blob) return data;
  if (typeof data === "string") return new Blob([data], { type: contentType });
  if (data instanceof Uint8Array) {
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    return new Blob([buf], { type: contentType });
  }
  return new Blob([data], { type: contentType });
}
var Files = class extends V2Resource {
  config() {
    return this.request("GET", "/api/v2/files/config");
  }
  /**
   * Upload a single file.
   *
   * Sends a multipart/form-data POST and bypasses the JSON-only `request`
   * helper because file uploads need their own Content-Type.
   */
  async upload(params) {
    const form = new FormData();
    form.append("file", toBlob(params.data, params.contentType), params.name);
    if (params.metadata) form.append("metadata", JSON.stringify(params.metadata));
    const headers = { ...this.client.getHeaders() };
    delete headers["Content-Type"];
    const response = await fetch(this.url("/api/v2/files/upload"), {
      method: "POST",
      headers,
      body: form
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error: ${response.status} - ${body}`);
    }
    return await response.json();
  }
  /** Upload several files in one call. */
  async uploadBatch(items) {
    const form = new FormData();
    for (const item of items) {
      form.append("files", toBlob(item.data, item.contentType), item.name);
    }
    const headers = { ...this.client.getHeaders() };
    delete headers["Content-Type"];
    const response = await fetch(this.url("/api/v2/files/upload-batch"), {
      method: "POST",
      headers,
      body: form
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error: ${response.status} - ${body}`);
    }
    return await response.json();
  }
  list(params) {
    return this.request("GET", "/api/v2/files", void 0, params);
  }
  get(id) {
    return this.request("GET", `/api/v2/files/${encodeURIComponent(id)}`);
  }
  download(id) {
    return this.request("GET", `/api/v2/files/${encodeURIComponent(id)}/download`);
  }
  preview(id) {
    return this.request("GET", `/api/v2/files/${encodeURIComponent(id)}/preview`);
  }
  delete(id) {
    return this.request("DELETE", `/api/v2/files/${encodeURIComponent(id)}`);
  }
  updateUsage(id, params) {
    return this.request("PUT", `/api/v2/files/${encodeURIComponent(id)}/usage`, params);
  }
  cleanup() {
    return this.request("POST", "/api/v2/files/cleanup");
  }
};

// src/resources/rag.ts
var Rag = class extends V2Resource {
  search(params) {
    return this.request("POST", "/v2/rag/search", params);
  }
  rerank(params) {
    return this.request("POST", "/v2/rag/rerank", params);
  }
  embeddingModels() {
    return this.request("GET", "/v2/rag/models/embeddings");
  }
  rerankerModels() {
    return this.request("GET", "/v2/rag/models/rerankers");
  }
  strategies() {
    return this.request("GET", "/v2/rag/strategies");
  }
  config() {
    return this.request("GET", "/v2/rag/config");
  }
  buildVocabulary(params) {
    return this.request("POST", "/v2/rag/vocabulary/build", params || {});
  }
  vocabularyStats() {
    return this.request("GET", "/v2/rag/vocabulary/stats");
  }
};

// src/resources/mcp.ts
var Mcp = class extends V2Resource {
  connect(params) {
    return this.request("POST", "/api/v2/mcp/servers/connect", params);
  }
  listServers() {
    return this.request("GET", "/api/v2/mcp/servers");
  }
  disconnect(providerId) {
    return this.request(
      "DELETE",
      `/api/v2/mcp/servers/${encodeURIComponent(providerId)}`
    );
  }
  listTools(params) {
    return this.request("GET", "/api/v2/mcp/tools", void 0, params);
  }
  toolSchema(toolId) {
    return this.request("GET", `/api/v2/mcp/tools/${encodeURIComponent(toolId)}/schema`);
  }
  toolStatus(toolId) {
    return this.request("GET", `/api/v2/mcp/tools/${encodeURIComponent(toolId)}/status`);
  }
  executeTool(toolId, input, metadata) {
    return this.request("POST", `/api/v2/mcp/tools/${encodeURIComponent(toolId)}/execute`, {
      input,
      metadata
    });
  }
  batchExecute(entries) {
    return this.request("POST", "/api/v2/mcp/tools/batch-execute", { entries });
  }
  analytics(params) {
    return this.request("GET", "/api/v2/mcp/analytics", void 0, params);
  }
  healthCheck() {
    return this.request("POST", "/api/v2/mcp/health-check");
  }
};

// src/resources/modules.ts
var Modules = class extends V2Resource {
  list(params) {
    return this.request("GET", "/v2/modules", void 0, params);
  }
  create(params) {
    return this.request("POST", "/v2/modules", params);
  }
  get(id) {
    return this.request("GET", `/v2/modules/${encodeURIComponent(id)}`);
  }
  update(id, params) {
    return this.request("PUT", `/v2/modules/${encodeURIComponent(id)}`, params);
  }
  delete(id) {
    return this.request("DELETE", `/v2/modules/${encodeURIComponent(id)}`);
  }
  addResource(id, resource) {
    return this.request("POST", `/v2/modules/${encodeURIComponent(id)}/resources`, resource);
  }
  removeResource(id, resourceId) {
    return this.request(
      "DELETE",
      `/v2/modules/${encodeURIComponent(id)}/resources/${encodeURIComponent(resourceId)}`
    );
  }
  build(id, params) {
    return this.request("POST", `/v2/modules/${encodeURIComponent(id)}/build`, params || {});
  }
  /** Returns the SSE URL for build progress; consumer is responsible for the EventSource. */
  buildProgress(id) {
    return this.request("GET", `/v2/modules/${encodeURIComponent(id)}/build/progress`);
  }
  listVersions(id) {
    return this.request("GET", `/v2/modules/${encodeURIComponent(id)}/versions`);
  }
  getVersion(id, version) {
    return this.request("GET", `/v2/modules/${encodeURIComponent(id)}/versions/${version}`);
  }
  versionQa(id, version) {
    return this.request("GET", `/v2/modules/${encodeURIComponent(id)}/versions/${version}/qa`);
  }
  impact(id) {
    return this.request("GET", `/v2/modules/${encodeURIComponent(id)}/impact`);
  }
};

// src/resources/marketplace.ts
var Marketplace = class extends V2Resource {
  list(params) {
    return this.request("GET", "/v2/marketplace", void 0, params);
  }
  get(publicationId) {
    return this.request("GET", `/v2/marketplace/${encodeURIComponent(publicationId)}`);
  }
  install(publicationId, params) {
    return this.request(
      "POST",
      `/v2/marketplace/${encodeURIComponent(publicationId)}/install`,
      params || {}
    );
  }
  listInstallations() {
    return this.request("GET", "/v2/marketplace/installations");
  }
  uninstall(installationId) {
    return this.request(
      "DELETE",
      `/v2/marketplace/installations/${encodeURIComponent(installationId)}`
    );
  }
};

// src/resources/voiceCalls.ts
var VoiceCalls = class extends V2Resource {
  list(params) {
    return this.request("GET", "/v2/voice/calls", void 0, params);
  }
  inProgress() {
    return this.request("GET", "/v2/voice/calls/in-progress");
  }
  get(callSid) {
    return this.request("GET", `/v2/voice/calls/${encodeURIComponent(callSid)}`);
  }
  transcript(callSid) {
    return this.request("GET", `/v2/voice/calls/${encodeURIComponent(callSid)}/transcript`);
  }
  recording(callSid) {
    return this.request("GET", `/v2/voice/calls/${encodeURIComponent(callSid)}/recording`);
  }
  audit(callSid) {
    return this.request("GET", `/v2/voice/calls/${encodeURIComponent(callSid)}/audit`);
  }
  /** All calls associated with a single chatflow. */
  forChatflow(chatflowId, params) {
    return this.request(
      "GET",
      `/v2/chatflows/${encodeURIComponent(chatflowId)}/calls`,
      void 0,
      params
    );
  }
};

// src/resources/audit.ts
var Audit = class extends V2Resource {
  listEvents(params) {
    return this.request("GET", "/v2/audit/events", void 0, params);
  }
  resourceEvents(resourceType, resourceId, params) {
    return this.request(
      "GET",
      `/v2/audit/events/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}`,
      void 0,
      params
    );
  }
  myEvents(params) {
    return this.request("GET", "/v2/audit/events/me", void 0, params);
  }
  export(params) {
    return this.request(
      "GET",
      "/v2/audit/export",
      void 0,
      params
    );
  }
};

// src/resources/costControl.ts
var CostControl = class extends V2Resource {
  // ---- Routing rules ----
  listRoutingRules() {
    return this.request("GET", "/v2/cost-control/routing-rules");
  }
  createRoutingRule(params) {
    return this.request("POST", "/v2/cost-control/routing-rules", params);
  }
  getRoutingRule(ruleId) {
    return this.request("GET", `/v2/cost-control/routing-rules/${encodeURIComponent(ruleId)}`);
  }
  updateRoutingRule(ruleId, params) {
    return this.request("PUT", `/v2/cost-control/routing-rules/${encodeURIComponent(ruleId)}`, params);
  }
  deleteRoutingRule(ruleId) {
    return this.request(
      "DELETE",
      `/v2/cost-control/routing-rules/${encodeURIComponent(ruleId)}`
    );
  }
  toggleRoutingRule(ruleId, enabled) {
    return this.request(
      "PATCH",
      `/v2/cost-control/routing-rules/${encodeURIComponent(ruleId)}/toggle`,
      { enabled }
    );
  }
  // ---- Caps ----
  listUsageCaps() {
    return this.request("GET", "/v2/cost-control/usage-caps");
  }
  setWorkspaceCap(params) {
    return this.request("PUT", "/v2/cost-control/usage-caps/workspace", params);
  }
  setModelCap(modelId, params) {
    return this.request(
      "PUT",
      `/v2/cost-control/usage-caps/model/${encodeURIComponent(modelId)}`,
      params
    );
  }
  deleteUsageCap(capId) {
    return this.request(
      "DELETE",
      `/v2/cost-control/usage-caps/${encodeURIComponent(capId)}`
    );
  }
  // ---- Stats / scaling ----
  usageStats(params) {
    return this.request(
      "GET",
      "/v2/cost-control/usage-stats",
      void 0,
      params
    );
  }
  scaling(deploymentId) {
    return this.request("GET", `/v2/cost-control/scaling/${encodeURIComponent(deploymentId)}`);
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
    this.conversationsV2 = new ConversationsV2(this);
    this.agentWizard = new AgentWizard(this);
    this.chatflows = new ChatFlows(this);
    this.datasets = new Datasets(this);
    this.documents = new Documents(this);
    this.files = new Files(this);
    this.rag = new Rag(this);
    this.mcp = new Mcp(this);
    this.modules = new Modules(this);
    this.marketplace = new Marketplace(this);
    this.voiceCalls = new VoiceCalls(this);
    this.audit = new Audit(this);
    this.costControl = new CostControl(this);
  }
  /**
   * Get default headers for API requests.
   */
  getHeaders() {
    const headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "swfte-js/1.1.0"
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
  AgentWizard,
  Agents,
  Audio,
  Audit,
  AuthenticationError,
  Chat,
  ChatFlows,
  Completions,
  ConversationsV2,
  CostControl,
  Datasets,
  Deployments,
  Documents,
  Embeddings,
  Files,
  Images,
  InvalidRequestError,
  Marketplace,
  Mcp,
  Models,
  Modules,
  Rag,
  RateLimitError,
  Speech,
  Swfte,
  SwfteClient,
  SwfteError,
  Transcriptions,
  VoiceCalls,
  Workflows
});
