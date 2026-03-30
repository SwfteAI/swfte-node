/**
 * Swfte SDK - TypeScript/JavaScript client for the Swfte AI Gateway
 *
 * A unified gateway to access all AI providers (OpenAI, Anthropic, Google, etc.)
 * and self-hosted models through a single API.
 *
 * @example
 * ```typescript
 * import Swfte from 'swfte-sdk';
 *
 * const client = new Swfte({ apiKey: 'sk-swfte-...' });
 *
 * const response = await client.chat.completions.create({
 *   model: 'openai:gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 *
 * console.log(response.choices[0].message.content);
 * ```
 */

export { default, default as Swfte, SwfteClient } from './client';
export * from './types';
export * from './errors';
export { Chat, Completions } from './resources/chat';
export { Images } from './resources/images';
export { Embeddings } from './resources/embeddings';
export { Audio, Transcriptions, Speech } from './resources/audio';
export { Models } from './resources/models';
export {
  Agents,
  type Agent,
  type CreateAgentParams,
  type UpdateAgentParams,
  type AgentListResponse
} from './resources/agents';
export {
  Deployments,
  type Deployment,
  type DeploymentState,
  type CreateDeploymentParams,
  type DeploymentListResponse
} from './resources/deployments';
export {
  Workflows,
  type Workflow,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowExecution,
  type ExecutionStatus,
  type CreateWorkflowParams,
  type UpdateWorkflowParams,
  type ValidationResult,
  type WorkflowListResponse,
  type WorkflowAnalytics
} from './resources/workflows';

