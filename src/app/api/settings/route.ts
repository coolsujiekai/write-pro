import { NextResponse } from 'next/server';
import { readConfig, writeConfig, type AIProvider } from '@/lib/ai/config-manager';

export async function GET() {
  const config = readConfig();
  // 脱敏：只返回 key 是否已配置，不返回实际值
  const masked: Record<string, { hasKey: boolean; baseUrl: string; model: string }> = {};
  for (const [provider, cfg] of Object.entries(config)) {
    masked[provider] = {
      hasKey: cfg.apiKey.length > 0,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
    };
  }
  return NextResponse.json(masked);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, apiKey, baseUrl, model } = body;

    if (!provider || !['mimo', 'anthropic', 'openai'].includes(provider)) {
      return NextResponse.json({ error: '无效的 provider' }, { status: 400 });
    }

    const p = provider as AIProvider;
    const config = readConfig();
    config[p] = {
      apiKey: apiKey ?? config[p].apiKey,
      baseUrl: baseUrl ?? config[p].baseUrl,
      model: model ?? config[p].model,
    };
    writeConfig(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
