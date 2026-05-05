import { describe, it, expect, vi, afterEach } from 'vitest';

describe('search-service', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('isSearchConfigured returns true when TAVILY_API_KEY is set', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'test-key');
    const { isSearchConfigured, clearSearchConfigCache } = await import('@/lib/search/search-service');
    clearSearchConfigCache();
    expect(await isSearchConfigured()).toBe(true);
  });

  it('isSearchConfigured returns false when no key is set', async () => {
    vi.stubEnv('TAVILY_API_KEY', '');
    vi.stubEnv('BOCHA_API_KEY', '');
    const { isSearchConfigured, clearSearchConfigCache } = await import('@/lib/search/search-service');
    clearSearchConfigCache();
    expect(await isSearchConfigured()).toBe(false);
  });

  it('search returns empty results when no API key configured', async () => {
    vi.stubEnv('TAVILY_API_KEY', '');
    vi.stubEnv('BOCHA_API_KEY', '');
    const { search, clearSearchConfigCache } = await import('@/lib/search/search-service');
    clearSearchConfigCache();
    const result = await search('test query');
    expect(result.results).toEqual([]);
  });

  it('search handles fetch errors gracefully', async () => {
    vi.stubEnv('TAVILY_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const { search, clearSearchConfigCache } = await import('@/lib/search/search-service');
    clearSearchConfigCache();
    const result = await search('test query');
    expect(result.results).toEqual([]);
  });
});
