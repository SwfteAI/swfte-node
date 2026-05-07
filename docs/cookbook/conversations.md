# Conversations

Initiate, monitor, and terminate live conversations across channels — including outbound voice calls and inbound webchat — with full transcripts and recordings.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Initiate
const conv = await client.conversationsV2.initiate({
  agentId: 'ag_lead_qualifier', // replace with your own
  channel: 'VOICE',
  to: '+15551234567',
  metadata: { campaign: 'spring_promo' },
});

// Status
const status = await client.conversationsV2.get(conv.conversationId);

// List
const recent = await client.conversationsV2.list({ limit: 50 });

// Transcript and recording
const transcript = await client.conversationsV2.transcript(conv.conversationId);
const recording = await client.conversationsV2.recording(conv.conversationId);

// Scheduled retries (for failed outbound calls)
const retries = await client.conversationsV2.scheduledRetries();
await client.conversationsV2.cancelRetries(conv.conversationId);

// Terminate
await client.conversationsV2.terminate(conv.conversationId);
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
