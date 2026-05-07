# Audit

Every action across your workspace is recorded and queryable — useful for compliance, security review, and debugging.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Filterable event stream
const events = await client.audit.listEvents({
  fromDate: '2026-04-01T00:00:00Z',
  toDate: '2026-05-07T23:59:59Z',
  actorId: 'usr_dejanm', // replace with your own
  actionType: 'AGENT_UPDATE',
  page: 1,
  size: 100,
});

// All events tied to a single resource
const resourceEvents = await client.audit.resourceEvents('AGENT', 'ag_lead_qualifier'); // replace with your own

// "What did I do this week?" — limited to events authored by the caller
const mine = await client.audit.myEvents({ days: 7 });

// Export to CSV/JSON for SIEM ingestion
const exported = await client.audit.export({
  format: 'CSV',
  fromDate: '2026-04-01',
  toDate: '2026-04-30',
});
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
