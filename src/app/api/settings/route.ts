import { NextResponse } from 'next/server';
import { readConfig, writeConfig, type AIProvider } from '@/lib/ai/config-manager';
import { z } from 'zod';

const VALID_PROVIDERS: AIProvider[] = ['mimo', 'deepseek', 'kimi', 'openai'];

export async function GET() {
  const config = await readConfig();
  const masked: Record<string, { hasKey: boolean; baseUrl: string; models: { light: string; standard: string } }> = {};
  for (const [provider, cfg] of Object.entries(config.providers)) {
    masked[provider] = {
      hasKey: cfg.apiKey.length > 0,
      baseUrl: cfg.baseUrl,
      models: cfg.models,
    };
  }
  return NextResponse.json({
    defaultProvider: config.defaultProvider,
    providers: masked,
    search: config.search ? { provider: config.search.provider, hasKey: config.search.apiKey.length > 0 } : null,
  });
}

const settingsSchema = z.object({
  provider: z.enum(['mimo', 'deepseek', 'kimi', 'openai']).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  models: z.object({
    light: z.string().optional(),
    standard: z.string().optional(),
  }).optional(),
  searchProvider: z.enum(['tavily', 'bocha']).optional(),
  searchApiKey: z.string().optional(),
  defaultProvider: z.enum(['mimo', 'deepseek', 'kimi', 'openai']).optional(),
});

export async function POST(request: Request) {
  try {
    const body = settingsSchema.parse(await request.json());
    const { provider, apiKey, baseUrl, models, searchProvider, searchApiKey, defaultProvider } = body;

    const config = await readConfig();

    // 搜索配置
    if (searchProvider || searchApiKey !== undefined) {
      config.search = {
        provider: (searchProvider as 'tavily' | 'bocha') ?? config.search?.provider ?? 'tavily',
        apiKey: searchApiKey ?? config.search?.apiKey ?? '',
      };
    }

    // 默认 model 切换
    if (defaultProvider && VALID_PROVIDERS.includes(defaultProvider)) {
      config.defaultProvider = defaultProvider;
    }

    // AI provider 配置
    if (provider && VALID_PROVIDERS.includes(provider)) {
      const p = provider as AIProvider;
      config.providers[p] = {
        apiKey: apiKey ?? config.providers[p].apiKey,
        baseUrl: baseUrl ?? config.providers[p].baseUrl,
        models: {
          light: models?.light ?? config.providers[p].models.light,
          standard: models?.standard ?? config.providers[p].models.standard,
        },
      };
    }

    await writeConfig(config);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '数据格式错误', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
