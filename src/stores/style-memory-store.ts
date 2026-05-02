'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StyleInsight {
  id: string;
  articleId: string;
  articleTitle: string;
  analyzedAt: string;
  // 核心三维
  vocabProfile: string;    // 用词画像：偏口语/书面、爱用哪类词、避用哪类词
  toneProfile: string;     // 语气画像：冷/暖、硬/柔、正式/随意、有没有口头禅
  rhythmProfile: string;   // 节奏画像：长短句比例、段落密度、停顿习惯
  // 辅助
  signaturePhrases: string; // 标志性表达：这个作者反复用的词句或句式
  antiPatterns: string;     // 作者不用什么：绝对不会出现的表达
  summary: string;          // 一句话风格标签
}

interface StyleMemoryState {
  insights: StyleInsight[];
  addInsight: (insight: StyleInsight) => void;
  getLatestInsights: (count?: number) => StyleInsight[];
  getStylePrompt: () => string;
}

export const useStyleMemoryStore = create<StyleMemoryState>()(
  persist(
    (set, get) => ({
      insights: [],

      addInsight: (insight) => {
        set((state) => ({
          insights: [...state.insights, insight],
        }));
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
    }),
    {
      name: 'write-pro-style-memory',
    }
  )
);
