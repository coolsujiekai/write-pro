'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type AIProvider, type ModelTier, type SearchProvider } from '@/stores/settings-store';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  mimo: 'MiMo',
  deepseek: 'DeepSeek',
  kimi: 'Kimi (月之暗面)',
  openai: 'OpenAI',
};

const PROVIDER_DESCRIPTIONS: Record<AIProvider, string> = {
  mimo: '小米 MiMo 推理模型',
  deepseek: 'DeepSeek V3 / R1',
  kimi: '月之暗面 Moonshot',
  openai: 'GPT 系列模型',
};

interface ServerProviderInfo {
  hasKey: boolean;
  baseUrl: string;
  models: { light: string; standard: string };
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const provider = useSettingsStore((s) => s.provider);
  const configs = useSettingsStore((s) => s.configs);
  const search = useSettingsStore((s) => s.search);
  const setProvider = useSettingsStore((s) => s.setProvider);
  const setConfig = useSettingsStore((s) => s.setConfig);
  const setSearch = useSettingsStore((s) => s.setSearch);
  const loadFromStorage = useSettingsStore((s) => s.loadFromStorage);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<AIProvider, string>>({ mimo: '', deepseek: '', kimi: '', openai: '' });
  const [serverProviders, setServerProviders] = useState<Record<string, ServerProviderInfo> | null>(null);
  const [searchApiKeyInput, setSearchApiKeyInput] = useState('');
  const [searchProviderSelect, setSearchProviderSelect] = useState<SearchProvider>(search.provider);
  const [serverSearch, setServerSearch] = useState<{ provider: string; hasKey: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchServerConfig = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setServerProviders(data.providers ?? data);
        setServerSearch(data.search ?? null);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (open) {
      loadFromStorage();
      void (async () => {
        await fetchServerConfig();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async (p: AIProvider) => {
    setSaving(true);
    setMessage('');
    try {
      const key = apiKeyInputs[p];
      const cfg = configs[p];
      const body: Record<string, unknown> = { provider: p };
      if (key) body.apiKey = key;
      if (cfg.baseUrl) body.baseUrl = cfg.baseUrl;
      body.models = cfg.models;

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? '保存失败');
      }

      setApiKeyInputs((prev) => ({ ...prev, [p]: '' }));
      setMessage(`${PROVIDER_LABELS[p]} 配置已保存`);
      await fetchServerConfig();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSearch = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchProvider: searchProviderSelect, searchApiKey: searchApiKeyInput || undefined }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? '保存失败');
      }

      setSearch({ provider: searchProviderSelect, apiKey: searchApiKeyInput || search.apiKey });
      setSearchApiKeyInput('');
      setMessage('搜索配置已保存');
      await fetchServerConfig();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleModelChange = (p: AIProvider, tier: ModelTier, value: string) => {
    setConfig(p, { models: { ...configs[p].models, [tier]: value } });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-[var(--background)] border border-[var(--border)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h2 className="text-sm font-semibold">AI 模型设置</h2>
          <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
          {/* 快速模型切换 */}
          <div className="rounded-lg border border-[var(--border)] p-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">当前 AI 模型</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AIProvider)}
              className="w-full rounded border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
            >
              {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((p) => (
                <option key={p} value={p} disabled={!serverProviders?.[p]?.hasKey}>
                  {PROVIDER_LABELS[p]} — {PROVIDER_DESCRIPTIONS[p]}
                  {serverProviders?.[p]?.hasKey ? '' : ' (未配置 Key)'}
                </option>
              ))}
            </select>
          </div>

          {/* AI 模型密钥配置 */}
          <div>
            <h3 className="text-xs font-medium text-[var(--muted-foreground)] mb-2">AI 模型密钥</h3>
            <div className="space-y-2">
          {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((p) => {
            const isActive = provider === p;
            const cfg = configs[p];
            const serverCfg = serverProviders?.[p];

            return (
              <div
                key={p}
                className={`rounded-lg border p-3 ${
                  isActive
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                    : 'border-[var(--border)] hover:border-[var(--muted-foreground)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium">{PROVIDER_LABELS[p]}</span>
                    <span className="text-xs text-[var(--muted-foreground)] ml-2">{PROVIDER_DESCRIPTIONS[p]}</span>
                  </div>
                  {serverCfg?.hasKey && (
                    <span className="text-xs text-green-600">Key 已配置</span>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1">API Key</label>
                    <input
                      type="password"
                      value={apiKeyInputs[p]}
                      onChange={(e) => setApiKeyInputs((prev) => ({ ...prev, [p]: e.target.value }))}
                      placeholder={serverCfg?.hasKey ? '••••••（已配置，留空不修改）' : '输入 API Key...'}
                      className="w-full rounded border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1">Base URL</label>
                    <input
                      type="text"
                      value={cfg.baseUrl}
                      onChange={(e) => setConfig(p, { baseUrl: e.target.value })}
                      className="w-full rounded border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-[var(--muted-foreground)] mb-1">轻量模型 (Light)</label>
                      <input
                        type="text"
                        value={cfg.models.light}
                        onChange={(e) => handleModelChange(p, 'light', e.target.value)}
                        placeholder="用于简单任务"
                        className="w-full rounded border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs focus:border-[var(--primary)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--muted-foreground)] mb-1">主力模型 (Standard)</label>
                      <input
                        type="text"
                        value={cfg.models.standard}
                        onChange={(e) => handleModelChange(p, 'standard', e.target.value)}
                        placeholder="用于生成和润色"
                        className="w-full rounded border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs focus:border-[var(--primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleSave(p)}
                    disabled={saving}
                    className="w-full rounded bg-[var(--primary)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            );
          })}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-[var(--border)] pt-4">
            <h3 className="text-xs font-medium text-[var(--muted-foreground)] mb-2">搜索配置</h3>
            <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">搜索服务</span>
                {serverSearch?.hasKey && (
                  <span className="text-xs text-green-600">Key 已配置</span>
                )}
              </div>
              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">提供商</label>
                <select
                  value={searchProviderSelect}
                  onChange={(e) => setSearchProviderSelect(e.target.value as SearchProvider)}
                  className="w-full rounded border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                >
                  <option value="tavily">Tavily（国际搜索，免费 1000次/月）</option>
                  <option value="bocha">博查 Bocha（中文搜索，质量更好）</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">API Key</label>
                <input
                  type="password"
                  value={searchApiKeyInput}
                  onChange={(e) => setSearchApiKeyInput(e.target.value)}
                  placeholder={serverSearch?.hasKey ? '••••••（已配置，留空不修改）' : '输入搜索 API Key...'}
                  className="w-full rounded border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
              <button
                onClick={handleSaveSearch}
                disabled={saving}
                className="w-full rounded bg-[var(--primary)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存搜索配置'}
              </button>
            </div>
          </div>

          {message && (
            <p className={`text-xs text-center ${message.includes('失败') || message.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
