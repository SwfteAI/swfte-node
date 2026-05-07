import { V2Resource } from './_base';

/** A composable module bundling agents, workflows, chatflows, and tools. */
export interface Module {
  id: string;
  name: string;
  description?: string;
  workspaceId?: string;
  status?: string;
  latestVersion?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Create-module params. */
export interface CreateModuleParams {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
}

/** A resource attached to a module. */
export interface ModuleResource {
  resourceId: string;
  resourceType: 'AGENT' | 'CHATFLOW' | 'WORKFLOW' | 'DATASET' | 'TOOL';
  metadata?: Record<string, unknown>;
}

/** Build a module into a deployable artifact. */
export interface ModuleBuildParams {
  strategy?: 'FULL' | 'INCREMENTAL';
  includeQa?: boolean;
}

/** A module version. */
export interface ModuleVersion {
  version: number;
  status?: string;
  manifest?: Record<string, unknown>;
  createdAt?: string;
}

/** Impact report. */
export interface ModuleImpactReport {
  affectedAgents: string[];
  affectedChatflows: string[];
  affectedWorkflows: string[];
  warnings: string[];
}

/**
 * Modules — bundle agents/workflows/chatflows into reusable, versioned units.
 */
export class Modules extends V2Resource {
  list(params?: { page?: number; size?: number }): Promise<Module[] | { modules: Module[] }> {
    return this.request('GET', '/v2/modules', undefined, params as Record<string, unknown>);
  }

  create(params: CreateModuleParams): Promise<Module> {
    return this.request('POST', '/v2/modules', params);
  }

  get(id: string): Promise<Module> {
    return this.request('GET', `/v2/modules/${encodeURIComponent(id)}`);
  }

  update(id: string, params: Partial<Module>): Promise<Module> {
    return this.request('PUT', `/v2/modules/${encodeURIComponent(id)}`, params);
  }

  delete(id: string): Promise<void> {
    return this.request<void>('DELETE', `/v2/modules/${encodeURIComponent(id)}`);
  }

  addResource(id: string, resource: ModuleResource): Promise<Module> {
    return this.request('POST', `/v2/modules/${encodeURIComponent(id)}/resources`, resource);
  }

  removeResource(id: string, resourceId: string): Promise<Module> {
    return this.request<Module>(
      'DELETE',
      `/v2/modules/${encodeURIComponent(id)}/resources/${encodeURIComponent(resourceId)}`
    );
  }

  build(id: string, params?: ModuleBuildParams): Promise<{ buildId: string; status: string }> {
    return this.request('POST', `/v2/modules/${encodeURIComponent(id)}/build`, params || {});
  }

  /** Returns the SSE URL for build progress; consumer is responsible for the EventSource. */
  buildProgress(id: string): Promise<{ url: string } | unknown> {
    return this.request('GET', `/v2/modules/${encodeURIComponent(id)}/build/progress`);
  }

  listVersions(id: string): Promise<ModuleVersion[]> {
    return this.request('GET', `/v2/modules/${encodeURIComponent(id)}/versions`);
  }

  getVersion(id: string, version: number | string): Promise<ModuleVersion> {
    return this.request('GET', `/v2/modules/${encodeURIComponent(id)}/versions/${version}`);
  }

  versionQa(id: string, version: number | string): Promise<{ tests: unknown[] }> {
    return this.request('GET', `/v2/modules/${encodeURIComponent(id)}/versions/${version}/qa`);
  }

  impact(id: string): Promise<ModuleImpactReport> {
    return this.request('GET', `/v2/modules/${encodeURIComponent(id)}/impact`);
  }
}
