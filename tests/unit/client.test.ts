/**
 * Unit tests for SwfteClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SwfteClient, SwfteConfig } from '../../src/client';
import { AuthenticationError, SwfteError } from '../../src/errors';
import { createMockResponse, mockFetch, mockData } from '../setup';

describe('SwfteClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Clear environment variables
    delete process.env.SWFTE_API_KEY;
    delete process.env.SWFTE_WORKSPACE_ID;
  });

  describe('initialization', () => {
    it('should initialize with API key', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });

      expect(client.apiKey).toBe(mockData.apiKey);
      expect(client.baseUrl).toBe('https://api.swfte.com/v2/gateway');
      expect(client.timeout).toBe(60000);
      expect(client.maxRetries).toBe(3);
    });

    it('should read API key from environment variable', () => {
      process.env.SWFTE_API_KEY = 'sk-swfte-env-key';

      const client = new SwfteClient({ apiKey: '' });

      expect(client.apiKey).toBe('sk-swfte-env-key');
    });

    it('should throw AuthenticationError when API key is missing', () => {
      expect(() => new SwfteClient({} as SwfteConfig)).toThrow(AuthenticationError);
      expect(() => new SwfteClient({} as SwfteConfig)).toThrow('API key is required');
    });

    it('should accept custom base URL', () => {
      const client = new SwfteClient({
        apiKey: mockData.apiKey,
        baseUrl: mockData.baseUrl,
      });

      expect(client.baseUrl).toBe(mockData.baseUrl);
    });

    it('should strip trailing slash from base URL', () => {
      const client = new SwfteClient({
        apiKey: mockData.apiKey,
        baseUrl: 'https://api.test.swfte.com/v1/gateway/',
      });

      expect(client.baseUrl).not.toMatch(/\/$/);
    });

    it('should accept custom timeout', () => {
      const client = new SwfteClient({
        apiKey: mockData.apiKey,
        timeout: 120000,
      });

      expect(client.timeout).toBe(120000);
    });

    it('should accept custom max retries', () => {
      const client = new SwfteClient({
        apiKey: mockData.apiKey,
        maxRetries: 5,
      });

      expect(client.maxRetries).toBe(5);
    });

    it('should accept workspace ID', () => {
      const client = new SwfteClient({
        apiKey: mockData.apiKey,
        workspaceId: mockData.workspaceId,
      });

      expect(client.workspaceId).toBe(mockData.workspaceId);
    });

    it('should read workspace ID from environment variable', () => {
      process.env.SWFTE_WORKSPACE_ID = 'ws-env-12345';

      const client = new SwfteClient({ apiKey: mockData.apiKey });

      expect(client.workspaceId).toBe('ws-env-12345');
    });

    it('should accept custom fetch implementation', () => {
      const customFetch = vi.fn();
      const client = new SwfteClient({
        apiKey: mockData.apiKey,
        fetch: customFetch,
      });

      expect(client).toBeDefined();
    });
  });

  describe('getHeaders', () => {
    it('should include Authorization header', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });

      const headers = client.getHeaders();

      expect(headers.Authorization).toBe(`Bearer ${mockData.apiKey}`);
    });

    it('should include Content-Type header', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });

      const headers = client.getHeaders();

      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include User-Agent header', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });

      const headers = client.getHeaders();

      expect(headers['User-Agent']).toMatch(/swfte-js/);
    });

    it('should include X-Workspace-ID when workspace ID is set', () => {
      const client = new SwfteClient({
        apiKey: mockData.apiKey,
        workspaceId: mockData.workspaceId,
      });

      const headers = client.getHeaders();

      expect(headers['X-Workspace-ID']).toBe(mockData.workspaceId);
    });

    it('should not include X-Workspace-ID when not set', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });

      const headers = client.getHeaders();

      expect(headers['X-Workspace-ID']).toBeUndefined();
    });
  });

  describe('request', () => {
    it('should make GET request successfully', async () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      const responseData = { data: 'test' };
      mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

      const result = await client.request('GET', '/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(responseData);
    });

    it('should make POST request with body', async () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      const requestBody = { message: 'hello' };
      const responseData = { reply: 'world' };
      mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

      await client.request('POST', '/test', requestBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should throw AuthenticationError on 401 response', async () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Unauthorized' }, { status: 401 }));

      await expect(client.request('GET', '/test')).rejects.toThrow(AuthenticationError);
    });

    it('should throw SwfteError on non-ok response', async () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Server Error' }, { status: 500 }));

      await expect(client.request('GET', '/test')).rejects.toThrow(SwfteError);
    });

    it('should retry on failure', async () => {
      const client = new SwfteClient({
        apiKey: mockData.apiKey,
        maxRetries: 3,
      });

      // First two attempts fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      const result = await client.request('GET', '/test');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('should throw after max retries exceeded', async () => {
      const client = new SwfteClient({
        apiKey: mockData.apiKey,
        maxRetries: 2,
      });

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.request('GET', '/test')).rejects.toThrow('Network error');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on AuthenticationError', async () => {
      const client = new SwfteClient({
        apiKey: mockData.apiKey,
        maxRetries: 3,
      });

      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Unauthorized' }, { status: 401 }));

      await expect(client.request('GET', '/test')).rejects.toThrow(AuthenticationError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout', async () => {
      vi.useFakeTimers();

      const client = new SwfteClient({
        apiKey: mockData.apiKey,
        timeout: 1000,
      });

      // Mock a slow response
      mockFetch.mockImplementation(() => new Promise((resolve) => {
        setTimeout(() => resolve(createMockResponse({})), 2000);
      }));

      const requestPromise = client.request('GET', '/test', undefined, { timeout: 1000 });

      // Fast-forward time
      vi.advanceTimersByTime(1500);

      // The abort should trigger
      await expect(requestPromise).rejects.toThrow();

      vi.useRealTimers();
    });
  });

  describe('resource accessors', () => {
    it('should have chat property', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      expect(client.chat).toBeDefined();
    });

    it('should have agents property', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      expect(client.agents).toBeDefined();
    });

    it('should have workflows property', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      expect(client.workflows).toBeDefined();
    });

    it('should have deployments property', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      expect(client.deployments).toBeDefined();
    });

    it('should have models property', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      expect(client.models).toBeDefined();
    });

    it('should have images property', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      expect(client.images).toBeDefined();
    });

    it('should have embeddings property', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      expect(client.embeddings).toBeDefined();
    });

    it('should have audio property', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      expect(client.audio).toBeDefined();
    });

    it('should have secrets property', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      expect(client.secrets).toBeDefined();
    });

    it('should have conversations property', () => {
      const client = new SwfteClient({ apiKey: mockData.apiKey });
      expect(client.conversations).toBeDefined();
    });
  });
});
