# Cost Control

Set per-workspace and per-model usage caps, define routing rules to fail-over to cheaper models, and configure autoscaling for self-hosted GPU deployments.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// Routing rules — automatically downgrade or fail-over by predicate
const rule = await client.costControl.createRoutingRule({
  name: 'Downgrade on long context',
  matchModel: 'openai:gpt-4',
  fallbackModel: 'openai:gpt-4o-mini',
  predicate: { kind: 'INPUT_TOKENS_GT', value: 64000 },
  enabled: true,
});

const rules = await client.costControl.listRoutingRules();
const got = await client.costControl.getRoutingRule(rule.ruleId);
await client.costControl.updateRoutingRule(rule.ruleId, { ...got, enabled: false });
await client.costControl.toggleRoutingRule(rule.ruleId, true);
await client.costControl.deleteRoutingRule(rule.ruleId);

// Usage caps
const caps = await client.costControl.listUsageCaps();
await client.costControl.setWorkspaceCap({ monthlyUsdCap: 500, hardStop: false });
await client.costControl.setModelCap('openai:gpt-4', { dailyUsdCap: 50 });
await client.costControl.deleteUsageCap('cap_xyz');

// Live usage stats
const stats = await client.costControl.usageStats({ groupBy: 'MODEL', days: 30 });

// Scaling config for a self-hosted deployment
const scaling = await client.costControl.scaling('deploy_llama3_8b'); // replace with your own
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
