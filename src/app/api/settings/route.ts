import { NextResponse } from 'next/server';
import { readConfig, writeConfig, type AIProvider } from '@/lib/ai/config-manager';

const VALID_PROVIDERS: AIProvider[] = ['mimo', 'deepseek', 'kimi', 'openai'];

export async function GET() {
  const config = await readConfig();
  // 脱敏：只返回 key 是否已配置，不返回实际值
  const masked: Record<string, { hasKey: boolean; baseUrl: string; models: { light: string; standard: string } }> = {};
  for (const [provider, cfg] of Object.entries(config.providers)) {
    masked[provider] = {
      hasKey: cfg.apiKey.length > 0,
      baseUrl: cfg.baseUrl,
      models: cfg.models,
    };
  }
  return NextResponse.json({ defaultProvider: config.defaultProvider, providers: masked });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, apiKey, baseUrl, models } = body;

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: '无效的 provider' }, { status: 400 });
    }

    const config = await readConfig();
    const p = provider as AIProvider;

    config.providers[p] = {
      apiKey: apiKey ?? config.providers[p].apiKey,
      baseUrl: baseUrl ?? config.providers[p].baseUrl,
      models: {
        light: models?.light ?? config.providers[p].models.light,
        standard: models?.standard ?? config.providers[p].models.standard,
      },
    };

    if (body.defaultProvider && VALID_PROVIDERS.includes(body.defaultProvider)) {
      config.defaultProvider = body.defaultProvider;
    }

    await writeConfig(config);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
