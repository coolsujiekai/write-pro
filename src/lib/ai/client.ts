import { readConfig, type AIProvider, type ModelTier, type ProviderConfig } from './config-manager';

export type { AIProvider };

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  system?: string;
  maxTokens?: number;
  provider?: AIProvider;
  tier?: ModelTier;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
}

export interface AIStreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullContent: string) => void;
  onError: (error: Error) => void;
}

async function resolveProvider(requested?: AIProvider, tier: ModelTier = 'standard'): Promise<{ provider: AIProvider; config: ProviderConfig; model: string }> {
  const config = await readConfig();

  // 1. 请求指定的 provider
  if (requested && config.providers[requested]?.apiKey) {
    const p = config.providers[requested];
    return { provider: requested, config: p, model: p.models[tier] };
  }

  // 2. 默认 provider
  const defaultP = config.providers[config.defaultProvider];
  if (defaultP?.apiKey) {
    return { provider: config.defaultProvider, config: defaultP, model: defaultP.models[tier] };
  }

  // 3. 找第一个有 key 的 provider
  for (const p of Object.keys(config.providers) as AIProvider[]) {
    const pc = config.providers[p];
    if (pc.apiKey) {
      return { provider: p, config: pc, model: pc.models[tier] };
    }
  }

  // 4. 环境变量回退
  if (process.env.MIMO_API_KEY) {
    return {
      provider: 'mimo',
      config: { apiKey: process.env.MIMO_API_KEY, baseUrl: process.env.MIMO_BASE_URL ?? 'https://token-plan-cn.xiaomimimo.com/v1', models: { light: 'mimo-v2.5-mini', standard: 'mimo-v2.5-pro' } },
      model: process.env.MIMO_MODEL ?? 'mimo-v2.5-pro',
    };
  }
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      provider: 'deepseek',
      config: { apiKey: process.env.DEEPSEEK_API_KEY, baseUrl: 'https://api.deepseek.com/v1', models: { light: 'deepseek-chat', standard: 'deepseek-reasoner' } },
      model: 'deepseek-chat',
    };
  }
  if (process.env.KIMI_API_KEY) {
    return {
      provider: 'kimi',
      config: { apiKey: process.env.KIMI_API_KEY, baseUrl: 'https://api.moonshot.cn/v1', models: { light: 'moonshot-v1-8k', standard: 'moonshot-v1-32k' } },
      model: 'moonshot-v1-8k',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      config: { apiKey: process.env.OPENAI_API_KEY, baseUrl: 'https://api.openai.com/v1', models: { light: 'gpt-4o-mini', standard: 'gpt-4o' } },
      model: 'gpt-4o',
    };
  }

  throw new Error('未配置 AI API Key。请在设置中配置 API Key。');
}

/** 指数退避重试 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxRetries) break;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError ?? new Error('Unknown error');
}

export async function chat(request: AIRequest): Promise<AIResponse> {
  const { provider, config, model } = await resolveProvider(request.provider, request.tier);

  const messages: { role: string; content: string }[] = [];
  if (request.system) {
    messages.push({ role: 'system', content: request.system });
  }
  messages.push(...request.messages.map((m) => ({ role: m.role, content: m.content })));

  const body: Record<string, unknown> = {
    model,
    max_tokens: request.maxTokens ?? 4000,
    messages,
  };

  if (request.stream) {
    body.stream = true;
  }

  const doFetch = async (): Promise<AIResponse> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error (${model}): ${error}`);
      }

      const data = await response.json();
      return { content: data.choices[0].message.content };
    } finally {
      clearTimeout(timeout);
    }
  };

  return withRetry(doFetch);
}

/** 流式调用 AI，通过 callback 逐步返回 token */
export async function chatStream(request: AIRequest, callbacks: AIStreamCallbacks): Promise<void> {
  const { config, model } = await resolveProvider(request.provider, request.tier);

  const messages: { role: string; content: string }[] = [];
  if (request.system) {
    messages.push({ role: 'system', content: request.system });
  }
  messages.push(...request.messages.map((m) => ({ role: m.role, content: m.content })));

  const body = {
    model,
    max_tokens: request.maxTokens ?? 4000,
    messages,
    stream: true,
  };

  const doStream = async (): Promise<void> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error (${model}): ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              callbacks.onToken(delta);
            }
          } catch {
            // skip malformed SSE chunks
          }
        }
      }

      callbacks.onDone(fullContent);
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      clearTimeout(timeout);
    }
  };

  return withRetry(doStream);
}
