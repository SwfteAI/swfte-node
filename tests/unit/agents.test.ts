/**
 * Unit tests for Agents resource
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SwfteClient } from '../../src/client';
import { Agents, Agent } from '../../src/resources/agents';
import { createMockResponse, mockFetch, mockData } from '../setup';

describe('Agents', () => {
  let client: SwfteClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new SwfteClient({ apiKey: mockData.apiKey });
  });

  describe('create', () => {
    it('should create an agent successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData.agent));

      const agent = await client.agents.create({
        name: 'Test Agent',
        description: 'A test agent',
        systemPrompt: 'You are a helpful assistant.',
        provider: 'openai',
        model: 'gpt-4',
      });

      expect(agent.id).toBe(mockData.agent.id);
      expect(agent.name).toBe(mockData.agent.name);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should send correct payload', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData.agent));

      await client.agents.create({
        name: 'Test Agent',
        description: 'Test description',
        systemPrompt: 'You are helpful.',
        provider: 'anthropic',
        model: 'claude-3-opus',
        temperature: 0.5,
        maxTokens: 1000,
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.name).toBe('Test Agent');
      expect(body.description).toBe('Test description');
      expect(body.provider).toBe('anthropic');
      expect(body.model).toBe('claude-3-opus');
      expect(body.temperature).toBe(0.5);
      expect(body.maxTokens).toBe(1000);
    });

    it('should create agent with minimal parameters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData.agent));

      const agent = await client.agents.create({ name: 'Minimal Agent' });

      expect(agent).toBeDefined();
    });
  });

  describe('get', () => {
    it('should get an agent by ID', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData.agent));

      const agent = await client.agents.get('agent-123');

      expect(agent.id).toBe('agent-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents/agent-123'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should throw on agent not found', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Agent not found' },
        { status: 404 }
      ));

      await expect(client.agents.get('nonexistent')).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should list agents', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData.agentList));

      const agents = await client.agents.list();

      expect(agents).toHaveLength(2);
      expect(agents[0].id).toBe('agent-123');
    });

    it('should list agents with pagination', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData.agentList));

      await client.agents.list(1, 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/page=1.*size=10|size=10.*page=1/),
        expect.any(Object)
      );
    });

    it('should return empty list when no agents', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ agents: [], totalItems: 0 }));

      const agents = await client.agents.list();

      expect(agents).toHaveLength(0);
    });
  });

  describe('update', () => {
    // update() reads the current agent, merges the changes and PUTs the whole record.
    it('should update an agent', async () => {
      const updatedAgent = { ...mockData.agent, name: 'Updated Agent' };
      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockData.agent))
        .mockResolvedValueOnce(createMockResponse(updatedAgent));

      const agent = await client.agents.update('agent-123', { name: 'Updated Agent' });

      expect(agent.name).toBe('Updated Agent');
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/agents/agent-123'),
        expect.objectContaining({ method: 'PUT' })
      );
      expect(JSON.parse(mockFetch.mock.calls[1][1].body).agentName).toBe('Updated Agent');
    });

    it('should support partial updates', async () => {
      const updatedAgent = { ...mockData.agent, description: 'New description' };
      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockData.agent))
        .mockResolvedValueOnce(createMockResponse(updatedAgent));

      await client.agents.update('agent-123', { description: 'New description' });

      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.description).toBe('New description');
      expect(body.id).toBe(mockData.agent.id);
    });
  });

  describe('delete', () => {
    it('should delete an agent', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.agents.delete('agent-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents/agent-123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  // execute/verify/clone/toggleActive/search were never part of the Agents
  // resource; these tests described an API that did not exist. Talking to an
  // agent is agents.chat() — covered in sot-invoke.test.ts.

  describe('getModelOptions', () => {
    it('should get model options for a provider', async () => {
      const modelOptions = [
        { id: 'gpt-4', name: 'GPT-4', contextLength: 8192 },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextLength: 4096 },
      ];
      mockFetch.mockResolvedValueOnce(createMockResponse(modelOptions));

      const options = await client.agents.getModelOptions('openai');

      expect(options).toHaveLength(2);
      expect(options[0].id).toBe('gpt-4');
    });
  });

  describe('getIOTypes', () => {
    it('should get input/output types', async () => {
      const ioTypes = {
        inputTypes: [
          { value: 'TEXT', label: 'Text' },
          { value: 'IMAGE', label: 'Image' },
        ],
        outputTypes: [
          { value: 'TEXT', label: 'Text' },
          { value: 'JSON', label: 'JSON' },
        ],
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(ioTypes));

      const types = await client.agents.getIOTypes();

      expect(types.inputTypes).toHaveLength(2);
      expect(types.outputTypes).toHaveLength(2);
    });
  });
});
