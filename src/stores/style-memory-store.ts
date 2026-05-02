'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StyleInsight } from '@/lib/workflow/style-types';
export type { StyleInsight };

interface StyleMemoryState {
  insights: StyleInsight[];
  addInsight: (insight: StyleInsight) => void;
  getLatestInsights: (count?: number) => StyleInsight[];
  getStylePrompt: () => string;
  loadFromServer: () => Promise<void>;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSync(insights: StyleInsight[]) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch('/api/style-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insights }),
    }).catch(() => { /* silent */ });
  }, 1000);
}

export const useStyleMemoryStore = create<StyleMemoryState>()(
  persist(
    (set, get) => ({
      insights: [],

      addInsight: (insight) => {
        set((state) => {
          // 同一篇文章不重复添加
          const filtered = state.insights.filter((i) => i.articleId !== insight.articleId);
          const next = [...filtered, insight];
          debouncedSync(next);
          return { insights: next };
        });
      },

      getLatestInsights: (count = 3) => {
        const all = get().insights;
        return all.slice(-count);
      },

      getStylePrompt: () => {
        const insights = get().insights;
        if (insights.length === 0) return '';

        const recent = insights.slice(-3);

        const vocabLines = recent.map((i) => i.vocabProfile).filter(Boolean);
        const toneLines = recent.map((i) => i.toneProfile).filter(Boolean);
        const rhythmLines = recent.map((i) => i.rhythmProfile).filter(Boolean);
        const phrases = recent.flatMap((i) => i.signaturePhrases.split('、')).filter(Boolean).slice(0, 8);
        const antiPatterns = recent.flatMap((i) => i.antiPatterns.split('、')).filter(Boolean).slice(0, 6);

        const sections: string[] = [];

        if (vocabLines.length > 0) {
          sections.push(`【用词】${vocabLines.join('；')}`);
        }
        if (toneLines.length > 0) {
          sections.push(`【语气】${toneLines.join('；')}`);
        }
        if (rhythmLines.length > 0) {
          sections.push(`【节奏】${rhythmLines.join('；')}`);
        }
        if (phrases.length > 0) {
          sections.push(`【标志表达】${phrases.join('、')}`);
        }
        if (antiPatterns.length > 0) {
          sections.push(`【禁止使用】${antiPatterns.join('、')}`);
        }

        return `## 作者风格记忆（必须严格遵循）

${sections.join('\n')}

写作要求：
- 用词、语气、节奏必须匹配上面的画像
- 适当使用标志表达，但不要堆砌
- 绝对禁止使用上面列出的禁止表达`;
      },

      loadFromServer: async () => {
        try {
          const res = await fetch('/api/style-memory');
          if (!res.ok) return;
          const serverInsights: StyleInsight[] = await res.json();
          if (!Array.isArray(serverInsights) || serverInsights.length === 0) return;

          const local = get().insights;

          // 合并：按 articleId 去重，取更新的
          const merged = new Map<string, StyleInsight>();
          for (const item of local) {
            merged.set(item.articleId, item);
          }
          for (const item of serverInsights) {
            const existing = merged.get(item.articleId);
            if (!existing || new Date(item.analyzedAt).getTime() > new Date(existing.analyzedAt).getTime()) {
              merged.set(item.articleId, item);
            }
          }

          const next = [...merged.values()].sort(
            (a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime()
          );

          set({ insights: next });
        } catch {
          // 服务端不可用时用 localStorage 数据
        }
      },
    }),
    {
      name: 'write-pro-style-memory',
    }
  )
);
