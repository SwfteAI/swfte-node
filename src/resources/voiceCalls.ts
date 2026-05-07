import { V2Resource } from './_base';

/** A voice call record. */
export interface VoiceCall {
  callSid: string;
  parentCallSid?: string;
  direction?: 'INBOUND' | 'OUTBOUND';
  status?: string;
  fromNumber?: string;
  toNumber?: string;
  agentId?: string;
  chatflowId?: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  recordingUrl?: string;
  [key: string]: unknown;
}

/** Filter params for listing calls. */
export interface ListVoiceCallsParams {
  fromDate?: string;
  toDate?: string;
  status?: string;
  direction?: string;
  agentId?: string;
  chatflowId?: string;
  page?: number;
  size?: number;
}

/** A transcript turn. */
export interface VoiceTranscriptTurn {
  speaker: 'AGENT' | 'CALLER' | 'SYSTEM';
  text: string;
  startMs?: number;
  endMs?: number;
  confidence?: number;
}

/** Per-turn audit row (latency, model, tokens, cost). */
export interface VoiceAuditEvent {
  turnIndex: number;
  type: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/**
 * Voice Calls — inspect inbound and outbound voice conversations.
 */
export class VoiceCalls extends V2Resource {
  list(params?: ListVoiceCallsParams): Promise<VoiceCall[] | { calls: VoiceCall[] }> {
    return this.request('GET', '/v2/voice/calls', undefined, params as Record<string, unknown>);
  }

  inProgress(): Promise<VoiceCall[]> {
    return this.request('GET', '/v2/voice/calls/in-progress');
  }

  get(callSid: string): Promise<VoiceCall> {
    return this.request('GET', `/v2/voice/calls/${encodeURIComponent(callSid)}`);
  }

  transcript(callSid: string): Promise<{ turns: VoiceTranscriptTurn[] }> {
    return this.request('GET', `/v2/voice/calls/${encodeURIComponent(callSid)}/transcript`);
  }

  recording(callSid: string): Promise<{ url: string; expiresAt?: string }> {
    return this.request('GET', `/v2/voice/calls/${encodeURIComponent(callSid)}/recording`);
  }

  audit(callSid: string): Promise<{ events: VoiceAuditEvent[] }> {
    return this.request('GET', `/v2/voice/calls/${encodeURIComponent(callSid)}/audit`);
  }

  /** All calls associated with a single chatflow. */
  forChatflow(chatflowId: string, params?: ListVoiceCallsParams): Promise<VoiceCall[] | { calls: VoiceCall[] }> {
    return this.request(
      'GET',
      `/v2/chatflows/${encodeURIComponent(chatflowId)}/calls`,
      undefined,
      params as Record<string, unknown>
    );
  }
}
