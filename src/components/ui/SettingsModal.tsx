'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type AIProvider } from '@/stores/settings-store';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  mimo: 'MiMo',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
};

const PROVIDER_DESCRIPTIONS: Record<AIProvider, string> = {
  mimo: '小米 MiMo 推理模型',
  anthropic: 'Claude 系列模型',
  openai: 'GPT 系列模型',
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { provider, configs, setProvider, setConfig, loadFromStorage } = useSettingsStore();
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<AIProvider, string>>({ mimo: '', anthropic: '', openai: '' });
  const [serverConfig, setServerConfig] = useState<Record<string, { hasKey: boolean; baseUrl: string; model: string }> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      loadFromStorage();
      fetchServerConfig();
    }
  }, [open, loadFromStorage]);

  const fetchServerConfig = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        setServerConfig(await res.json());
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async (p: AIProvider) => {
    setSaving(true);
    setMessage('');
    try {
      const key = apiKeyInputs[p];
      const body: Record<string, string> = { provider: p };
      if (key) body.apiKey = key;
      if (configs[p].baseUrl) body.baseUrl = configs[p].baseUrl;
      if (configs[p].model) body.model = configs[p].model;

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
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-3">
          {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((p) => {
            const isActive = provider === p;
            const cfg = configs[p];
            const serverCfg = serverConfig?.[p];

            return (
              <div
                key={p}
                className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                  isActive
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                    : 'border-[var(--border)] hover:border-[var(--muted-foreground)]'
                }`}
                onClick={() => setProvider(p)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium">{PROVIDER_LABELS[p]}</span>
                    <span className="text-xs text-[var(--muted-foreground)] ml-2">{PROVIDER_DESCRIPTIONS[p]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {serverCfg?.hasKey && (
                      <span className="text-xs text-green-600">Key 已配置</span>
                    )}
                    {isActive && (
                      <span className="text-xs text-[var(--primary)] font-medium">当前使用</span>
                    )}
                  </div>
                </div>

                {/* 展开配置 */}
                {isActive && (
                  <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
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
                    <div>
                      <label className="block text-xs text-[var(--muted-foreground)] mb-1">模型名称</label>
                      <input
                        type="text"
                        value={cfg.model}
                        onChange={(e) => setConfig(p, { model: e.target.value })}
                        className="w-full rounded border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm focus:border-[var(--primary)] focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleSave(p)}
                      disabled={saving}
                      className="mt-2 w-full rounded bg-[var(--primary)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

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
