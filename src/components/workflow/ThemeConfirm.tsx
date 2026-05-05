'use client';

import { useState } from 'react';
import type { Article, ThemeConfirmation } from '@/lib/workflow/types';
import { useArticleStore } from '@/stores/article-store';
import { useSettingsStore } from '@/stores/settings-store';
import { Feedback } from '@/components/ui/Feedback';

interface ThemeConfirmProps {
  article: Article;
}

export function ThemeConfirm({ article }: ThemeConfirmProps) {
  const setTheme = useArticleStore((s) => s.setTheme);
  const setPhase = useArticleStore((s) => s.setPhase);
  const updateContent = useArticleStore((s) => s.updateContent);
  const provider = useSettingsStore((s) => s.provider);
  const [theme, setThemeLocal] = useState<ThemeConfirmation>(
    article.theme ?? { oneSentence: '', readerValue: '', coreMessage: '' }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const suggestTheme = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-AI-Provider': provider },
        body: JSON.stringify({
          action: 'suggest-theme',
          data: {
            materials: article.materials.map((m) => m.content),
            interviews: article.interviews.map((i) => ({ q: i.question, a: i.answer })),
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'AI 建议失败');
      }

      const data = await response.json();
      setThemeLocal(data.theme);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 建议失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    setTheme(article.id, theme);
    const skeleton = generateSkeleton(article, theme);
    updateContent(article.id, skeleton);
    setPhase(article.id, 4);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
        <p className="text-sm text-purple-900 leading-relaxed">
          采访完了，信息很丰富。现在我们来明确主题。
        </p>
        <p className="text-sm text-purple-800 mt-2 leading-relaxed">
          很多人忽略这一步，直接开始写，结果写到一半就散了。主题清楚了，后面才不会跑偏。
        </p>
      </div>

      {/* 采访回顾 */}
      {article.interviews.length > 0 && (
        <details className="rounded-lg border border-[var(--border)]">
          <summary className="px-3 py-2 text-xs text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--muted)]">
            📋 查看采访记录
          </summary>
          <div className="px-3 pb-3 space-y-2 max-h-40 overflow-y-auto">
            {article.interviews.map((entry) => (
              <div key={entry.id} className="text-xs border-l-2 border-[var(--border)] pl-2">
                <p className="text-[var(--muted-foreground)]">{entry.question}</p>
                <p className="text-[var(--foreground)]">{entry.answer}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* AI 建议按钮 */}
      <button
        onClick={suggestTheme}
        disabled={isLoading || article.interviews.length === 0}
        className="w-full rounded-lg border border-dashed border-purple-300 px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '正在分析素材和采访...' : '✨ 让 AI 帮我建议主题'}
      </button>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {theme.oneSentence && (
        <div className="flex items-center justify-end">
          <Feedback articleId={article.id} target="theme" />
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            这篇文章到底讲什么？
          </label>
          <p className="text-xs text-[var(--muted-foreground)] mb-2">
            用一句话概括主题。比如：&ldquo;读书不是为了记住，是为了改变思维方式。&rdquo;
          </p>
          <input
            type="text"
            value={theme.oneSentence}
            onChange={(e) => setThemeLocal({ ...theme, oneSentence: e.target.value })}
            placeholder="一句话概括..."
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-3 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            读者为什么要看？
          </label>
          <p className="text-xs text-[var(--muted-foreground)] mb-2">
            这篇文章对读者有什么价值？看完能得到什么？
          </p>
          <input
            type="text"
            value={theme.readerValue}
            onChange={(e) => setThemeLocal({ ...theme, readerValue: e.target.value })}
            placeholder="读者看完能得到..."
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-3 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            最想传达的一句话
          </label>
          <p className="text-xs text-[var(--muted-foreground)] mb-2">
            读者看完应该记住什么？这句话就是文章的灵魂。
          </p>
          <input
            type="text"
            value={theme.coreMessage}
            onChange={(e) => setThemeLocal({ ...theme, coreMessage: e.target.value })}
            placeholder="读者应该记住..."
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-3 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={!theme.oneSentence || !theme.coreMessage}
        className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        确认主题，规划结构 →
      </button>
    </div>
  );
}

function generateSkeleton(article: Article, theme: ThemeConfirmation): string {
  const materialLines = article.materials.map((m) => m.content).join('\n\n');
  const interviewLines = article.interviews.map((i) => `> ${i.answer}`).join('\n\n');

  return `# ${theme.oneSentence}

> ${theme.coreMessage}

---

## 开头

<!-- 用一个场景或故事切入，吸引读者 -->

## 主体

<!-- 用以下素材展开论述 -->

${materialLines ? `### 素材参考\n\n${materialLines}\n\n` : ''}
${interviewLines ? `### 采访金句\n\n${interviewLines}\n\n` : ''}

## 结尾

<!-- 回扣主题，留给读者思考空间 -->

---

**读者价值：** ${theme.readerValue}
`;
}
