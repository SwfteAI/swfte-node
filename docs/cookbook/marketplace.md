# Marketplace

Browse public modules, install them into your workspace in one click, and manage your installations.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Browse
const publications = await client.marketplace.list({
  category: 'support',
  page: 1,
  size: 20,
});

// Detail
const pub = await client.marketplace.get('pub_support_starter'); // replace with your own
console.log(pub.name, pub.author, pub.priceCents);

// Install (returns the new local resource IDs)
const installation = await client.marketplace.install('pub_support_starter', {
  acceptPaid: false,
});

// List my installations
const installs = await client.marketplace.listInstallations();

// Uninstall
await client.marketplace.uninstall(installation.installationId);
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
