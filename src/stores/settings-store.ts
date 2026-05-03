'use client';

import { create } from 'zustand';

export type AIProvider = 'mimo' | 'deepseek' | 'kimi' | 'openai';
export type ModelTier = 'light' | 'standard';

interface ProviderConfig {
  baseUrl: string;
  models: Record<ModelTier, string>;
}

const DEFAULTS: Record<AIProvider, ProviderConfig> = {
  mimo: { baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1', models: { light: 'mimo-v2.5-mini', standard: 'mimo-v2.5-pro' } },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', models: { light: 'deepseek-chat', standard: 'deepseek-reasoner' } },
  kimi: { baseUrl: 'https://api.moonshot.cn/v1', models: { light: 'moonshot-v1-8k', standard: 'moonshot-v1-32k' } },
  openai: { baseUrl: 'https://api.openai.com/v1', models: { light: 'gpt-4o-mini', standard: 'gpt-4o' } },
};

interface SettingsState {
  provider: AIProvider;
  configs: Record<AIProvider, ProviderConfig>;
  setProvider: (provider: AIProvider) => void;
  setConfig: (provider: AIProvider, config: Partial<ProviderConfig>) => void;
  loadFromStorage: () => void;
}

function loadState(): Partial<SettingsState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('write-pro-settings');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const configs = { ...DEFAULTS };
    if (parsed.configs) {
      for (const p of Object.keys(DEFAULTS) as AIProvider[]) {
        if (parsed.configs[p]) {
          configs[p] = {
            baseUrl: parsed.configs[p].baseUrl ?? DEFAULTS[p].baseUrl,
            models: { ...DEFAULTS[p].models, ...parsed.configs[p]?.models },
          };
        }
      }
    }
    return {
      provider: parsed.provider ?? 'mimo',
      configs,
    };
  } catch {
    return {};
  }
}

function saveState(state: Pick<SettingsState, 'provider' | 'configs'>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('write-pro-settings', JSON.stringify({
    provider: state.provider,
    configs: state.configs,
  }));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  provider: 'mimo',
  configs: { ...DEFAULTS },

  setProvider: (provider) => {
    set({ provider });
    saveState({ provider, configs: get().configs });
  },

  setConfig: (provider, config) => {
    const existing = get().configs[provider];
    const configs = {
      ...get().configs,
      [provider]: {
        ...existing,
        ...config,
        models: config.models ? { ...existing.models, ...config.models } : existing.models,
      },
    };
    set({ configs });
    saveState({ provider: get().provider, configs });
  },

  loadFromStorage: () => {
    const saved = loadState();
    if (saved.provider || saved.configs) {
      set({
        provider: saved.provider ?? 'mimo',
        configs: saved.configs ?? { ...DEFAULTS },
      });
    }
  },
}));
