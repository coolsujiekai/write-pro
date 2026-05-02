import { readConfig, type AIProvider, type ProviderConfig } from './config-manager';

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
}

export interface AIResponse {
  content: string;
}

function resolveProvider(requested?: AIProvider): { provider: AIProvider; config: ProviderConfig } {
  const config = readConfig();

  // 优先用请求指定的 provider
  if (requested && config[requested].apiKey) {
    return { provider: requested, config: config[requested] };
  }

  // 回退：找第一个有 key 的 provider
  for (const p of ['mimo', 'anthropic', 'openai'] as AIProvider[]) {
    if (config[p].apiKey) {
      return { provider: p, config: config[p] };
    }
  }

  // 最后回退到环境变量
  if (process.env.MIMO_API_KEY) {
    return {
      provider: 'mimo',
      config: {
        apiKey: process.env.MIMO_API_KEY,
        baseUrl: process.env.MIMO_BASE_URL ?? 'https://token-plan-cn.xiaomimimo.com/v1',
        model: process.env.MIMO_MODEL ?? 'mimo-v2.5-pro',
      },
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      config: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
      },
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      config: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      },
    };
  }

  throw new Error('未配置 AI API Key。请在设置中配置 API Key。');
}

export async function chat(request: AIRequest): Promise<AIResponse> {
  const { provider, config } = resolveProvider(request.provider);

  if (provider === 'mimo') {
    return chatOpenAICompatible(config, request);
  }
  if (provider === 'anthropic') {
    return chatAnthropic(config, request);
  }
  return chatOpenAICompatible(config, request);
}

async function chatAnthropic(config: ProviderConfig, request: AIRequest): Promise<AIResponse> {
  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: request.maxTokens ?? 4000,
      system: request.system,
      messages: request.messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  return { content: data.content[0].text };
}

async function chatOpenAICompatible(config: ProviderConfig, request: AIRequest): Promise<AIResponse> {
  const messages = [];
  if (request.system) {
    messages.push({ role: 'system', content: request.system });
  }
  messages.push(...request.messages);

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: request.maxTokens ?? 4000,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${config.model}): ${error}`);
  }

  const data = await response.json();
  return { content: data.choices[0].message.content };
}
