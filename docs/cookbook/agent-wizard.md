# Agent Wizard

Generate fully-configured agents from a single natural-language prompt — system prompt, model selection, suggested tools, and knowledge bases all included.

```typescript
import Swfte from '@swfte/sdk';

const client = new Swfte({
  apiKey: process.env.SWFTE_API_KEY!,
  workspaceId: 'ws_demo_0001', // replace with your own
});

// 1. List templates
const templates = await client.agentWizard.listTemplates();
const types = await client.agentWizard.listAgentTypes();
const providers = await client.agentWizard.listProviders();

// 2. Generate from a freeform prompt
const draft = await client.agentWizard.generate({
  prompt: 'An onboarding assistant that guides new SaaS users through setup',
  agentType: 'CONVERSATIONAL',
});

// 3. Refine the draft
const refined = await client.agentWizard.refine({
  draftId: draft.draftId,
  feedback: 'Make the tone friendlier and add a step to ask for the user role.',
});

// 4. Persist as a real agent
const agent = await client.agentWizard.create({ draftId: refined.draftId });

// 5. Link MCP tools and knowledge
await client.agentWizard.linkTools(agent.id, ['tool_lookup_user', 'tool_send_email']); // replace with your own
await client.agentWizard.linkKnowledge(agent.id, ['ds_onboarding_kb']); // replace with your own

// Or — one shot from a template
const fromTemplate = await client.agentWizard.fromTemplate('customer-support', {
  industry: 'saas',
});

console.log(`Generated agent ${agent.id}`);
```

Full reference at [swfte.com/developers](https://www.swfte.com/developers).
