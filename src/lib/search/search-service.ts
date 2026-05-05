/** 搜索服务 — 支持 Tavily / Bocha，用于草稿前补充素材 */

import { readConfig } from '@/lib/ai/config-manager';

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface SearchResponse {
  answer?: string;
  results: SearchResult[];
}

type SearchProvider = 'tavily' | 'bocha';

interface SearchConfig {
  provider: SearchProvider;
  apiKey: string;
}

let cachedConfig: SearchConfig | null = null;

async function getSearchConfig(): Promise<SearchConfig> {
  if (cachedConfig) return cachedConfig;

  // 1. config.json（通过设置页面配置）
  try {
    const config = await readConfig();
    if (config.search?.apiKey) {
      cachedConfig = { provider: config.search.provider, apiKey: config.search.apiKey };
      return cachedConfig;
    }
  } catch { /* fall through */ }

  // 2. 环境变量回退
  const bochaKey = process.env.BOCHA_API_KEY;
  if (bochaKey) {
    cachedConfig = { provider: 'bocha', apiKey: bochaKey };
    return cachedConfig;
  }

  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    cachedConfig = { provider: 'tavily', apiKey: tavilyKey };
    return cachedConfig;
  }

  cachedConfig = { provider: 'tavily', apiKey: '' };
  return cachedConfig;
}

export function clearSearchConfigCache() {
  cachedConfig = null;
}

function buildTavilyBody(apiKey: string, query: string, maxResults: number) {
  return {
    api_key: apiKey,
    query,
    search_depth: 'basic' as const,
    include_answer: true,
    max_results: maxResults,
  };
}


/** 搜索互联网内容 */
export async function search(query: string, maxResults = 5): Promise<SearchResponse> {
  const cfg = await getSearchConfig();
  if (!cfg.apiKey) {
    return { results: [] };
  }

  try {
    if (cfg.provider === 'tavily') {
      return await searchTavily(cfg.apiKey, query, maxResults);
    }
    if (cfg.provider === 'bocha') {
      return await searchBocha(cfg.apiKey, query, maxResults);
    }
    return { results: [] };
  } catch {
    return { results: [] };
  }
}

async function searchTavily(apiKey: string, query: string, maxResults: number): Promise<SearchResponse> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildTavilyBody(apiKey, query, maxResults)),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return { results: [] };

  const data = await res.json();
  return {
    answer: data.answer,
    results: (data.results ?? []).map((r: { title: string; content: string; url: string }) => ({
      title: r.title,
      snippet: r.content,
      url: r.url,
    })),
  };
}

async function searchBocha(apiKey: string, query: string, count: number): Promise<SearchResponse> {
  const params = new URLSearchParams({ query, count: String(count), freshness: 'noLimit', summary: 'true' });
  const res = await fetch(`https://api.bochaai.com/v1/ai/search?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return { results: [] };

  const data = await res.json();
  return {
    answer: data.answer,
    results: (data.results ?? data.webpages ?? []).map((r: { title?: string; name?: string; snippet?: string; summary?: string; url?: string; link?: string }) => ({
      title: r.title ?? r.name ?? '',
      snippet: r.snippet ?? r.summary ?? '',
      url: r.url ?? r.link ?? '',
    })),
  };
}

/** 判断搜索是否已配置 */
export async function isSearchConfigured(): Promise<boolean> {
  const cfg = await getSearchConfig();
  return !!cfg.apiKey;
}
