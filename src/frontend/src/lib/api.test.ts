import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getAuthToken, setAuthToken, clearAuthToken, apiFetch } from './api';

describe('API & Auth Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('correctly sets, gets, and clears auth tokens in localStorage', () => {
    expect(getAuthToken()).toBeNull();
    setAuthToken('test-jwt-token');
    expect(getAuthToken()).toBe('test-jwt-token');
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it('attaches Bearer token in Authorization header when present', async () => {
    setAuthToken('my-secret-token');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiFetch<any>('/api/v1/persons');
    expect(result).toEqual({ data: [] });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toContain('/api/v1/persons');
    expect(callArgs[1].headers['Authorization']).toBe('Bearer my-secret-token');
    expect(callArgs[1].headers['Content-Type']).toBe('application/json');
  });

  it('throws standard error message when API responds with non-200', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid person payload' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/api/v1/persons')).rejects.toThrow('Invalid person payload');
  });

  it('clears token on 401 Unauthorized response', async () => {
    setAuthToken('expired-token');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Token expired' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/api/v1/persons')).rejects.toThrow();
    expect(getAuthToken()).toBeNull();
  });
});
