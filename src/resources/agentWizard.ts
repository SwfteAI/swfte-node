import { V2Resource } from './_base';

/** A wizard-generated agent draft, prior to persistence. */
export interface AgentDraft {
  draftId: string;
  agentName?: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
  suggestedTools?: string[];
  suggestedKnowledge?: string[];
  [key: string]: unknown;
}

/** Parameters for `generate` — produces a reviewable draft. */
export interface AgentWizardGenerateParams {
  prompt: string;
  agentType?: string;
  provider?: string;
  model?: string;
  [key: string]: unknown;
}

/** Parameters for `refine`. */
export interface AgentWizardRefineParams {
  draftId: string;
  feedback: string;
}

/** Parameters for `create`. */
export interface AgentWizardCreateParams {
  draftId: string;
}

/** Wizard template summary. */
export interface AgentWizardTemplate {
  name: string;
  label?: string;
  description?: string;
  agentType?: string;
}

/**
 * Agent Wizard — generate fully-configured agents from natural-language prompts.
 *
 * @example
 * ```typescript
 * const draft = await client.agentWizard.generate({ prompt: 'Onboarding bot' });
 * const agent = await client.agentWizard.create({ draftId: draft.draftId });
 * ```
 */
export class AgentWizard extends V2Resource {
  /** Generate a draft agent from a freeform prompt. */
  generate(params: AgentWizardGenerateParams): Promise<AgentDraft> {
    return this.request<AgentDraft>('POST', '/v2/agents/wizard/generate', params);
  }

  /** Quick generate — skips review and persists immediately. */
  quick(params: AgentWizardGenerateParams): Promise<AgentDraft> {
    return this.request<AgentDraft>('POST', '/v2/agents/wizard/quick', params);
  }

  /** Submit the draft for an automated review pass. */
  review(draftId: string): Promise<AgentDraft> {
    return this.request<AgentDraft>('POST', '/v2/agents/wizard/review', { draftId });
  }

  /** Refine a draft using user feedback. */
  refine(params: AgentWizardRefineParams): Promise<AgentDraft> {
    return this.request<AgentDraft>('POST', '/v2/agents/wizard/refine', params);
  }

  /** Persist a draft as a real agent. */
  create(params: AgentWizardCreateParams): Promise<{ id: string; agentName: string } & Record<string, unknown>> {
    return this.request<{ id: string; agentName: string } & Record<string, unknown>>(
      'POST',
      '/v2/agents/wizard/create',
      params
    );
  }

  /** Link MCP tools to an existing agent. */
  linkTools(agentId: string, toolIds: string[]): Promise<unknown> {
    return this.request<unknown>('POST', '/v2/agents/wizard/link-tools', { agentId, toolIds });
  }

  /** Link knowledge bases (datasets) to an agent. */
  linkKnowledge(agentId: string, datasetIds: string[]): Promise<unknown> {
    return this.request<unknown>('POST', '/v2/agents/wizard/link-knowledge', { agentId, datasetIds });
  }

  /** List agent templates. */
  listTemplates(): Promise<AgentWizardTemplate[]> {
    return this.request<AgentWizardTemplate[]>('GET', '/v2/agents/wizard/templates');
  }

  /** Get a single template by name. */
  getTemplate(name: string): Promise<AgentWizardTemplate> {
    return this.request<AgentWizardTemplate>('GET', `/v2/agents/wizard/templates/${encodeURIComponent(name)}`);
  }

  /** List supported agent types. */
  listAgentTypes(): Promise<Array<{ value: string; label: string }>> {
    return this.request<Array<{ value: string; label: string }>>('GET', '/v2/agents/wizard/agent-types');
  }

  /** List available providers. */
  listProviders(): Promise<Array<{ value: string; label: string }>> {
    return this.request<Array<{ value: string; label: string }>>('GET', '/v2/agents/wizard/providers');
  }

  /** Create an agent from a named template. */
  fromTemplate(templateName: string, params?: Record<string, unknown>): Promise<AgentDraft> {
    return this.request<AgentDraft>(
      'POST',
      `/v2/agents/wizard/from-template/${encodeURIComponent(templateName)}`,
      params || {}
    );
  }
}
