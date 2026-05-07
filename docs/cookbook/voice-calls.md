# Voice Calls

Inspect inbound and outbound voice conversations — list active calls, fetch full transcripts and recordings, and pull per-turn audit trails.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// List recent calls (filter by date, status, chatflow, agent)
const calls = await client.voiceCalls.list({
  fromDate: '2026-04-01',
  status: 'COMPLETED',
});

// In-progress calls (real-time monitoring)
const live = await client.voiceCalls.inProgress();

// Single call detail
const call = await client.voiceCalls.get('CAxxxxxxxxxxxxxxxx'); // replace with your own (Twilio call SID)

// Transcript and recording (signed URL)
const transcript = await client.voiceCalls.transcript(call.callSid);
const recording = await client.voiceCalls.recording(call.callSid);

// Per-turn audit (latency, model used, tokens, cost)
const audit = await client.voiceCalls.audit(call.callSid);

// All calls for a given chatflow
const chatflowCalls = await client.voiceCalls.forChatflow('cf_onboarding'); // replace with your own
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
