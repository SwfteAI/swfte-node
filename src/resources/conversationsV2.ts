import { V2Resource } from './_base';

/** Channel through which a conversation is established. */
export type ConversationChannel = 'WEB' | 'VOICE' | 'WHATSAPP' | 'TELEGRAM' | 'WEBCHAT' | 'API';

/** Initiate-conversation params. */
export interface InitiateConversationParams {
  agentId?: string;
  chatflowId?: string;
  channel: ConversationChannel;
  to?: string;
  from?: string;
  metadata?: Record<string, unknown>;
}

/** Live conversation status record. */
export interface ConversationStatus {
  conversationId: string;
  status: string;
  channel?: string;
  agentId?: string;
  chatflowId?: string;
  startedAt?: string;
  endedAt?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/** List filter params. */
export interface ListConversationsV2Params {
  status?: string;
  channel?: string;
  agentId?: string;
  chatflowId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  cursor?: string;
}

/** Transcript page. */
export interface ConversationTranscript {
  conversationId: string;
  turns: Array<{ speaker: string; text: string; timestamp?: string }>;
}

/** Recording reference. */
export interface ConversationRecording {
  url: string;
  expiresAt?: string;
  contentType?: string;
}

/** A scheduled retry attempt. */
export interface ScheduledRetry {
  conversationId: string;
  attempt: number;
  scheduledFor: string;
  reason?: string;
}

/**
 * Conversations (V2) — initiate, monitor, and terminate live conversations
 * across channels, including outbound voice campaigns with retries.
 *
 * Note: this namespace is exposed as `client.conversationsV2` to keep the
 * existing `client.conversations` (V1) namespace backward-compatible.
 */
export class ConversationsV2 extends V2Resource {
  initiate(params: InitiateConversationParams): Promise<ConversationStatus> {
    return this.request('POST', '/v2/conversations/initiate', params);
  }

  get(conversationId: string): Promise<ConversationStatus> {
    return this.request('GET', `/v2/conversations/${encodeURIComponent(conversationId)}`);
  }

  list(params?: ListConversationsV2Params): Promise<ConversationStatus[] | { conversations: ConversationStatus[] }> {
    return this.request('GET', '/v2/conversations', undefined, params as Record<string, unknown>);
  }

  terminate(conversationId: string, reason?: string): Promise<ConversationStatus> {
    return this.request(
      'POST',
      `/v2/conversations/${encodeURIComponent(conversationId)}/terminate`,
      reason ? { reason } : {}
    );
  }

  transcript(conversationId: string): Promise<ConversationTranscript> {
    return this.request('GET', `/v2/conversations/${encodeURIComponent(conversationId)}/transcript`);
  }

  recording(conversationId: string): Promise<ConversationRecording> {
    return this.request('GET', `/v2/conversations/${encodeURIComponent(conversationId)}/recording`);
  }

  scheduledRetries(): Promise<ScheduledRetry[]> {
    return this.request('GET', '/v2/conversations/scheduled-retries');
  }

  cancelRetries(conversationId: string): Promise<{ cancelled: number }> {
    return this.request(
      'POST',
      `/v2/conversations/${encodeURIComponent(conversationId)}/cancel-retries`
    );
  }
}
