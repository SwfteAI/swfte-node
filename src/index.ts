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

// V2 resources
export {
  AgentWizard,
  type AgentDraft,
  type AgentWizardGenerateParams,
  type AgentWizardRefineParams,
  type AgentWizardCreateParams,
  type AgentWizardTemplate,
} from './resources/agentWizard';

export {
  ChatFlows,
  type ChatFlow,
  type ChatFlowField,
  type CreateChatFlowParams,
  type ChatFlowValidationResult,
  type ChatFlowSession,
  type ChatFlowStats,
  type ChatFlowVersion,
} from './resources/chatflows';

export {
  Datasets,
  type Dataset,
  type CreateDatasetParams,
  type DatasetUsageReport,
  type DatasetApiAccessStatus,
} from './resources/datasets';

export {
  Documents,
  type Document,
  type DocumentSegment,
  type DocumentInput,
  type CreateDocumentsParams,
  type DocumentBatchUpdateEntry,
} from './resources/documents';

export {
  Files,
  type WorkspaceFile,
  type FilesConfig,
  type UploadFileParams,
  type UpdateUsageParams,
} from './resources/files';

export {
  Rag,
  type RagSearchParams,
  type RagSearchHit,
  type RagSearchResult,
  type RagRerankParams,
  type RagRerankResult,
  type RagModel,
  type RagConfig,
} from './resources/rag';

export {
  Mcp,
  type McpTransport,
  type McpConnectParams,
  type McpServer,
  type McpTool,
  type McpExecuteParams,
  type McpBatchExecuteEntry,
  type McpToolResult,
} from './resources/mcp';

export {
  Modules,
  type Module,
  type CreateModuleParams,
  type ModuleResource,
  type ModuleBuildParams,
  type ModuleVersion,
  type ModuleImpactReport,
} from './resources/modules';

export {
  Marketplace,
  type MarketplacePublication,
  type MarketplaceBrowseParams,
  type MarketplaceInstallParams,
  type MarketplaceInstallation,
} from './resources/marketplace';

export {
  VoiceCalls,
  type VoiceCall,
  type ListVoiceCallsParams,
  type VoiceTranscriptTurn,
  type VoiceAuditEvent,
} from './resources/voiceCalls';

export {
  Audit,
  type AuditEvent,
  type ListAuditEventsParams,
  type AuditEventPage,
  type AuditExportParams,
} from './resources/audit';

export {
  CostControl,
  type RoutingRule,
  type RoutingPredicate,
  type CreateRoutingRuleParams,
  type UsageCap,
  type WorkspaceCapParams,
  type ModelCapParams,
  type UsageStatsParams,
  type ScalingConfig,
} from './resources/costControl';

export {
  ConversationsV2,
  type ConversationChannel,
  type InitiateConversationParams,
  type ConversationStatus,
  type ListConversationsV2Params,
  type ConversationTranscript,
  type ConversationRecording,
  type ScheduledRetry,
} from './resources/conversationsV2';

