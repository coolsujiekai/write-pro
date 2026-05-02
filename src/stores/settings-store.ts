'use client';

import { create } from 'zustand';

export type AIProvider = 'mimo' | 'anthropic' | 'openai';

interface ProviderConfig {
  baseUrl: string;
  model: string;
}

const DEFAULTS: Record<AIProvider, ProviderConfig> = {
  mimo: { baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1', model: 'mimo-v2.5-pro' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
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
    return {
      provider: parsed.provider ?? 'mimo',
      configs: {
        mimo: { ...DEFAULTS.mimo, ...parsed.configs?.mimo },
        anthropic: { ...DEFAULTS.anthropic, ...parsed.configs?.anthropic },
        openai: { ...DEFAULTS.openai, ...parsed.configs?.openai },
      },
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
    const configs = {
      ...get().configs,
      [provider]: { ...get().configs[provider], ...config },
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
