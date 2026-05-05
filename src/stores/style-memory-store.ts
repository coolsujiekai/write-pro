'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StyleInsight, CrossArticlePatterns } from '@/lib/workflow/style-types';
import { MAX_INSIGHTS, getAgeWeight } from '@/lib/workflow/style-types';
export type { StyleInsight };

interface StyleMemoryState {
  insights: StyleInsight[];

  addInsight: (insight: StyleInsight) => void;
  getLatestInsights: (count?: number) => StyleInsight[];
  getStylePrompt: () => string;
  getCrossArticlePatterns: () => CrossArticlePatterns;
  loadFromServer: () => Promise<void>;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isDirty = false;

function debouncedSync(insights: StyleInsight[]) {
  isDirty = true;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch('/api/style-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insights }),
    }).catch(() => { /* silent */ })
      .finally(() => { isDirty = false; });
  }, 1000);
}

/** beforeunload 兜底：仅在写作用页用 sendBeacon 同步最终数据 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (!isDirty) return;
    if (!window.location.pathname.startsWith('/write/')) return;
    const raw = localStorage.getItem('write-pro-style-memory');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const insights = parsed?.state?.insights ?? [];
        if (insights.length > 0) {
          navigator.sendBeacon('/api/style-memory', JSON.stringify({ insights }));
        }
      } catch { /* ignore */ }
    }
  });
}

/** 分词：中文顿号分隔 */
function splitPhrases(s: string): string[] {
  return s.split('、').map((p) => p.trim()).filter(Boolean);
}

function detectCrossArticlePatterns(insights: StyleInsight[]): CrossArticlePatterns {
  const antiCounts = new Map<string, number>();
  const phraseCounts = new Map<string, number>();

  for (const ins of insights) {
    for (const p of splitPhrases(ins.antiPatterns)) {
      antiCounts.set(p, (antiCounts.get(p) ?? 0) + 1);
    }
    for (const p of splitPhrases(ins.signaturePhrases)) {
      phraseCounts.set(p, (phraseCounts.get(p) ?? 0) + 1);
    }
  }

  const ironRules = [...antiCounts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([p]) => p);

  const hallmarks = [...phraseCounts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([p]) => p);

  // 风格漂移检测：最近 3 篇 vs 更早 3 篇的 summary 对比
  let driftWarning: string | null = null;
  if (insights.length >= 6) {
    const recent = insights.slice(-3);
    const older = insights.slice(0, 3);
    const recentSummaries = recent.map((i) => i.summary).filter(Boolean);
    const olderSummaries = older.map((i) => i.summary).filter(Boolean);
    // 简单启发式：如果所有 summary 都不同且无重叠关键词
    const recentWords = new Set(recentSummaries.flatMap((s) => s.split(/[，,、\s]+/)));
    const olderWords = new Set(olderSummaries.flatMap((s) => s.split(/[，,、\s]+/)));
    const overlap = [...recentWords].filter((w) => olderWords.has(w)).length;
    if (overlap <= 1 && recentWords.size > 0 && olderWords.size > 0) {
      driftWarning = '最近风格与早期有明显变化，建议确认风格偏好是否需要更新';
    }
  }

  return { ironRules, hallmarks, driftWarning };
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
          // 超出容量淘汰最旧的
          if (next.length > MAX_INSIGHTS) {
            next.splice(0, next.length - MAX_INSIGHTS);
          }
          debouncedSync(next);
          return { insights: next };
        });
      },

      getLatestInsights: (count = 5) => {
        const all = get().insights;
        return all.slice(-count);
      },

      getStylePrompt: () => {
        const insights = get().insights;
        if (insights.length === 0) return '';

        // 倒序排列（最新在前）
        const reversed = [...insights].reverse();
        const total = reversed.length;

        const sections: string[] = [];

        // 加权聚合 vocabProfile
        const vocabLines: string[] = [];
        const toneLines: string[] = [];
        const rhythmLines: string[] = [];
        const phraseMap = new Map<string, number>(); // phrase → accumulated weight
        const antiMap = new Map<string, number>();

        for (let i = 0; i < total; i++) {
          const { weight } = getAgeWeight(i, total);
          if (reversed[i].vocabProfile) {
            vocabLines.push(`${reversed[i].vocabProfile}(权重${weight})`);
          }
          if (reversed[i].toneProfile) {
            toneLines.push(`${reversed[i].toneProfile}(权重${weight})`);
          }
          if (reversed[i].rhythmProfile) {
            rhythmLines.push(`${reversed[i].rhythmProfile}(权重${weight})`);
          }
          for (const p of splitPhrases(reversed[i].signaturePhrases)) {
            phraseMap.set(p, (phraseMap.get(p) ?? 0) + weight);
          }
          for (const p of splitPhrases(reversed[i].antiPatterns)) {
            antiMap.set(p, (antiMap.get(p) ?? 0) + weight);
          }
        }

        if (vocabLines.length > 0) {
          sections.push(`【用词】${vocabLines.join('；')}`);
        }
        if (toneLines.length > 0) {
          sections.push(`【语气】${toneLines.join('；')}`);
        }
        if (rhythmLines.length > 0) {
          sections.push(`【节奏】${rhythmLines.join('；')}`);
        }

        // 加权排序：高频短语优先
        const topPhrases = [...phraseMap.entries()]
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8)
          .map(([p]) => p);
        if (topPhrases.length > 0) {
          sections.push(`【标志表达】${topPhrases.join('、')}`);
        }

        const topAnti = [...antiMap.entries()]
          .sort(([, a], [, b]) => b - a)
          .slice(0, 6)
          .map(([p]) => p);
        if (topAnti.length > 0) {
          sections.push(`【禁止使用】${topAnti.join('、')}`);
        }

        // 交叉模式：铁律和烙印
        const patterns = detectCrossArticlePatterns(insights);
        if (patterns.ironRules.length > 0) {
          sections.push(`【强制禁止 — 跨文章铁律】${patterns.ironRules.join('、')} — 绝对不能出现`);
        }
        if (patterns.hallmarks.length > 0) {
          sections.push(`【必须使用 — 风格烙印】${patterns.hallmarks.join('、')} — 适当融入`);
        }

        return `## 作者风格记忆（必须严格遵循）

${sections.join('\n')}

写作要求：
- 用词、语气、节奏必须匹配上面的画像（高权重优先）
- 适当使用标志表达，但不要堆砌
- 绝对禁止使用上面列出的禁止表达和铁律`;
      },

      getCrossArticlePatterns: () => {
        return detectCrossArticlePatterns(get().insights);
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
