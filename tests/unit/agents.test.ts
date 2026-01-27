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

      const response = await client.agents.list();

      expect(response.agents).toHaveLength(2);
      expect(response.agents[0].id).toBe('agent-123');
    });

    it('should list agents with pagination', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        ...mockData.agentList,
        page: 1,
        size: 10,
      }));

      await client.agents.list({ page: 1, size: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/page=1.*size=10|size=10.*page=1/),
        expect.any(Object)
      );
    });

    it('should return empty list when no agents', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        agents: [],
        total: 0,
        page: 0,
        size: 20,
      }));

      const response = await client.agents.list();

      expect(response.agents).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update an agent', async () => {
      const updatedAgent = { ...mockData.agent, name: 'Updated Agent' };
      mockFetch.mockResolvedValueOnce(createMockResponse(updatedAgent));

      const agent = await client.agents.update('agent-123', {
        name: 'Updated Agent',
      });

      expect(agent.name).toBe('Updated Agent');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents/agent-123'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should support partial updates', async () => {
      const updatedAgent = { ...mockData.agent, description: 'New description' };
      mockFetch.mockResolvedValueOnce(createMockResponse(updatedAgent));

      await client.agents.update('agent-123', {
        description: 'New description',
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.description).toBe('New description');
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

  describe('execute', () => {
    it('should execute an agent', async () => {
      const executeResponse = {
        response: 'Hello! How can I help you today?',
        conversationId: 'conv-123',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(executeResponse));

      const result = await client.agents.execute('agent-123', {
        message: 'Hello!',
      });

      expect(result.response).toBe('Hello! How can I help you today?');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents/agent-123/execute'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should execute with conversation ID', async () => {
      const executeResponse = {
        response: 'I remember our conversation.',
        conversationId: 'conv-123',
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(executeResponse));

      await client.agents.execute('agent-123', {
        message: 'Continue our chat',
        conversationId: 'conv-123',
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.conversationId).toBe('conv-123');
    });

    it('should execute with context', async () => {
      const executeResponse = { response: 'Based on the context...' };
      mockFetch.mockResolvedValueOnce(createMockResponse(executeResponse));

      await client.agents.execute('agent-123', {
        message: 'What can you tell me?',
        context: { key: 'value', data: [1, 2, 3] },
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.context).toEqual({ key: 'value', data: [1, 2, 3] });
    });
  });

  describe('verify', () => {
    it('should verify an agent', async () => {
      const verifiedAgent = { ...mockData.agent, verified: true };
      mockFetch.mockResolvedValueOnce(createMockResponse(verifiedAgent));

      const agent = await client.agents.verify('agent-123');

      expect(agent.verified).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents/agent-123/verify'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('clone', () => {
    it('should clone an agent', async () => {
      const clonedAgent = { ...mockData.agent, id: 'agent-456', name: 'Cloned Agent' };
      mockFetch.mockResolvedValueOnce(createMockResponse(clonedAgent));

      const agent = await client.agents.clone('agent-123', 'Cloned Agent');

      expect(agent.id).not.toBe('agent-123');
      expect(agent.name).toBe('Cloned Agent');
    });
  });

  describe('toggleActive', () => {
    it('should toggle agent active status', async () => {
      const inactiveAgent = { ...mockData.agent, active: false };
      mockFetch.mockResolvedValueOnce(createMockResponse(inactiveAgent));

      const agent = await client.agents.toggleActive('agent-123', false);

      expect(agent.active).toBe(false);
    });
  });

  describe('search', () => {
    it('should search agents', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData.agentList));

      const response = await client.agents.search('test');

      expect(response.agents).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search'),
        expect.any(Object)
      );
    });

    it('should search with pagination', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData.agentList));

      await client.agents.search('test', { page: 0, size: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/query=test/),
        expect.any(Object)
      );
    });
  });

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
