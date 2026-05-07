# ChatFlows

Build conversational forms — onboarding, lead-qualification, support intake, surveys — with field extraction, validation, branching, multi-channel delivery (web, WhatsApp, voice), versioning, and publishing.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Create
const flow = await client.chatflows.create({
  name: 'Lead Qualification',
  description: 'Capture name, company, and budget',
  fields: [
    { id: 'name', label: 'Your name', fieldType: 'TEXT', required: true },
    { id: 'company', label: 'Company', fieldType: 'TEXT', required: true },
    { id: 'budget', label: 'Monthly budget (USD)', fieldType: 'NUMBER' },
  ],
});

// List, get
const flows = await client.chatflows.list();
const fetched = await client.chatflows.get(flow.id);

// Update
const updated = await client.chatflows.update(flow.id, {
  ...fetched,
  description: 'Updated: now branches on budget tier.',
});

// Validate definition before publish
const validation = await client.chatflows.validate(flow.id);
if (!validation.valid) console.error(validation.errors);

// Builder helpers
const fieldTypes = await client.chatflows.builder.fieldTypes();
const actionTypes = await client.chatflows.builder.actionTypes();
const builderTemplates = await client.chatflows.builder.templates();

// Sessions
const session = await client.chatflows.startSession(flow.id, { channel: 'web' });
const sessions = await client.chatflows.listSessions(flow.id);
const stats = await client.chatflows.stats(flow.id);
const sessionDetail = await client.chatflows.getSession(session.sessionId);

// Versioning
const version = await client.chatflows.versions.create(flow.id, { note: 'first stable' });
const versions = await client.chatflows.versions.list(flow.id);
await client.chatflows.versions.promote(flow.id, version.version);

// Publish to the marketplace
await client.chatflows.publish(flow.id, { visibility: 'WORKSPACE' });
const published = await client.chatflows.getPublished(flow.id);

// Deploy / undeploy
await client.chatflows.deploy(flow.id);
await client.chatflows.undeploy(flow.id);

// Cleanup
await client.chatflows.delete(flow.id);
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
