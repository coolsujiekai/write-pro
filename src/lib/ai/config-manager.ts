import { readFile, writeFile, access, copyFile } from 'fs/promises';
import { join } from 'path';

export type AIProvider = 'mimo' | 'deepseek' | 'kimi' | 'openai';

export type ModelTier = 'light' | 'standard';

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  models: Record<ModelTier, string>;
}

export interface AIConfig {
  defaultProvider: AIProvider;
  providers: Record<AIProvider, ProviderConfig>;
}

const CONFIG_PATH = join(process.cwd(), 'src/lib/ai/config.json');
const DEFAULT_PATH = join(process.cwd(), 'src/lib/ai/config.default.json');

async function readDefaults(): Promise<AIConfig> {
  try {
    const raw = await readFile(DEFAULT_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      defaultProvider: 'mimo',
      providers: {
        mimo: { apiKey: '', baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1', models: { light: 'mimo-v2.5-mini', standard: 'mimo-v2.5-pro' } },
        deepseek: { apiKey: '', baseUrl: 'https://api.deepseek.com/v1', models: { light: 'deepseek-chat', standard: 'deepseek-reasoner' } },
        kimi: { apiKey: '', baseUrl: 'https://api.moonshot.cn/v1', models: { light: 'moonshot-v1-8k', standard: 'moonshot-v1-32k' } },
        openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1', models: { light: 'gpt-4o-mini', standard: 'gpt-4o' } },
      },
    };
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readConfig(): Promise<AIConfig> {
  const defaults = await readDefaults();

  if (!(await fileExists(CONFIG_PATH))) {
    await writeFile(CONFIG_PATH, JSON.stringify(defaults, null, 2) + '\n');
    return defaults;
  }

  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    // 新格式：有 providers 字段
    if (parsed.providers) {
      const merged: AIConfig = {
        defaultProvider: parsed.defaultProvider ?? defaults.defaultProvider,
        providers: { ...defaults.providers },
      };
      for (const p of Object.keys(defaults.providers) as AIProvider[]) {
        if (parsed.providers[p]) {
          merged.providers[p] = {
            ...defaults.providers[p],
            ...parsed.providers[p],
            models: { ...defaults.providers[p].models, ...parsed.providers[p]?.models },
          };
        }
      }
      return merged;
    }

    // 旧格式兼容
    const migrated: AIConfig = { ...defaults };
    const oldProviders: Record<string, { apiKey?: string; baseUrl?: string; model?: string }> = parsed;
    for (const key of ['mimo', 'deepseek', 'kimi', 'openai'] as const) {
      if (oldProviders[key]?.apiKey) {
        migrated.providers[key].apiKey = oldProviders[key].apiKey ?? '';
        migrated.providers[key].baseUrl = oldProviders[key].baseUrl ?? migrated.providers[key].baseUrl;
        if (oldProviders[key].model) {
          migrated.providers[key].models.standard = oldProviders[key].model!;
        }
      }
    }
    return migrated;
  } catch {
    return defaults;
  }
}

export async function writeConfig(config: AIConfig): Promise<void> {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}
