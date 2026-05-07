import { V2Resource } from './_base';

/** MCP transport types. */
export type McpTransport = 'STDIO' | 'STREAMABLE_HTTP' | 'SSE' | 'WEBSOCKET';

/** Connect-server params. */
export interface McpConnectParams {
  name: string;
  transport: McpTransport;
  url?: string;
  command?: string;
  args?: string[];
  authToken?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/** A connected MCP server. */
export interface McpServer {
  providerId: string;
  name: string;
  transport: McpTransport;
  status?: string;
  toolCount?: number;
  url?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/** A single tool surfaced by an MCP server. */
export interface McpTool {
  toolId: string;
  providerId: string;
  name: string;
  description?: string;
  schema?: Record<string, unknown>;
}

/** Single tool invocation. */
export interface McpExecuteParams {
  input: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/** Batch execute envelope. */
export interface McpBatchExecuteEntry {
  toolId: string;
  input: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/** Tool result. */
export interface McpToolResult {
  toolId: string;
  status: 'OK' | 'ERROR';
  output?: unknown;
  error?: string;
  durationMs?: number;
}

/**
 * MCP (Model Context Protocol) — connect external MCP servers and execute their
 * tools, individually or in batches.
 */
export class Mcp extends V2Resource {
  connect(params: McpConnectParams): Promise<McpServer> {
    return this.request('POST', '/api/v2/mcp/servers/connect', params);
  }

  listServers(): Promise<McpServer[]> {
    return this.request('GET', '/api/v2/mcp/servers');
  }

  disconnect(providerId: string): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/api/v2/mcp/servers/${encodeURIComponent(providerId)}`
    );
  }

  listTools(params?: { providerId?: string }): Promise<McpTool[]> {
    return this.request('GET', '/api/v2/mcp/tools', undefined, params as Record<string, unknown>);
  }

  toolSchema(toolId: string): Promise<{ schema: Record<string, unknown> }> {
    return this.request('GET', `/api/v2/mcp/tools/${encodeURIComponent(toolId)}/schema`);
  }

  toolStatus(toolId: string): Promise<{ status: string; lastChecked?: string }> {
    return this.request('GET', `/api/v2/mcp/tools/${encodeURIComponent(toolId)}/status`);
  }

  executeTool(toolId: string, input: Record<string, unknown>, metadata?: Record<string, unknown>): Promise<McpToolResult> {
    return this.request('POST', `/api/v2/mcp/tools/${encodeURIComponent(toolId)}/execute`, {
      input,
      metadata,
    });
  }

  batchExecute(entries: McpBatchExecuteEntry[]): Promise<{ results: McpToolResult[] }> {
    return this.request('POST', '/api/v2/mcp/tools/batch-execute', { entries });
  }

  analytics(params?: { days?: number; providerId?: string }): Promise<unknown> {
    return this.request('GET', '/api/v2/mcp/analytics', undefined, params as Record<string, unknown>);
  }

  healthCheck(): Promise<{ healthy: boolean; details?: unknown }> {
    return this.request('POST', '/api/v2/mcp/health-check');
  }
}
