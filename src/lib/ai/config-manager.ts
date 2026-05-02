import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type AIProvider = 'mimo' | 'anthropic' | 'openai';

export type AIConfig = Record<AIProvider, ProviderConfig>;

const CONFIG_PATH = join(process.cwd(), 'src/lib/ai/config.json');

const DEFAULTS: AIConfig = {
  mimo: { apiKey: '', baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1', model: 'mimo-v2.5-pro' },
  anthropic: { apiKey: '', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
};

export function readConfig(): AIConfig {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      mimo: { ...DEFAULTS.mimo, ...parsed.mimo },
      anthropic: { ...DEFAULTS.anthropic, ...parsed.anthropic },
      openai: { ...DEFAULTS.openai, ...parsed.openai },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeConfig(config: AIConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}
