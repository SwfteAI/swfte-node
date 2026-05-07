# Modules

Modules bundle agents, workflows, and tools into reusable, versioned units that can be published and installed across workspaces.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Create
const module = await client.modules.create({
  name: 'Onboarding Pack',
  description: 'A chatflow + 2 agents + 1 workflow for SaaS onboarding',
});

// List, get, update, delete
const all = await client.modules.list();
const fetched = await client.modules.get(module.id);
await client.modules.update(module.id, { description: 'Updated bundle.' });

// Add resources to the module
await client.modules.addResource(module.id, {
  resourceType: 'AGENT',
  resourceId: 'ag_lead_qualifier', // replace with your own
});
await client.modules.addResource(module.id, {
  resourceType: 'CHATFLOW',
  resourceId: 'cf_onboarding', // replace with your own
});

// Remove a resource
await client.modules.removeResource(module.id, 'res_xyz');

// Build the module (generates a deployable artifact)
const build = await client.modules.build(module.id, { strategy: 'FULL' });
const progress = await client.modules.buildProgress(module.id);

// Versions
const versions = await client.modules.listVersions(module.id);
const v1 = await client.modules.getVersion(module.id, 1);
const qa = await client.modules.versionQa(module.id, 1);

// Impact (what would change in a target workspace)
const impact = await client.modules.impact(module.id);

await client.modules.delete(module.id);
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
