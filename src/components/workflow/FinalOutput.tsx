'use client';

import { useState, useEffect } from 'react';
import type { Article } from '@/lib/workflow/types';
import { useArticleStore } from '@/stores/article-store';
import { useStyleMemoryStore, type StyleInsight } from '@/stores/style-memory-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';

interface FinalOutputProps {
  article: Article;
}

export function FinalOutput({ article }: FinalOutputProps) {
  const { setPhase } = useArticleStore();
  const { addInsight, insights } = useStyleMemoryStore();
  const provider = useSettingsStore((s) => s.provider);
  const router = useRouter();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [changes, setChanges] = useState<{ type: string; ai: string; user: string }[]>([]);
  const [result, setResult] = useState<{
    vocabProfile?: string;
    toneProfile?: string;
    rhythmProfile?: string;
    vocabInsight?: string;
    toneInsight?: string;
    rhythmInsight?: string;
    signaturePhrases: string;
    antiPatterns: string;
    summary: string;
  } | null>(null);
  const [error, setError] = useState('');

  const wordCount = article.content.replace(/<[^>]*>/g, '').length;
  const hasAiDraft = article.aiDraft && article.aiDraft.length > 0;

  // 进入 Phase 8 时自动分析
  useEffect(() => {
    if (article.currentPhase === 8 && !analyzed && !isAnalyzing && !result) {
      runAnalysis();
    }
  }, [article.currentPhase, analyzed, isAnalyzing, result]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError('');

    try {
      // 有 AI 初稿 → 对比分析；没有 → 全文分析
      const action = hasAiDiff() ? 'analyze-diff' : 'analyze-style';
      const payload = hasAiDiff()
        ? { action: 'analyze-diff', data: { aiDraft: article.aiDraft, userVersion: article.content, title: article.title || '未命名' } }
        : { action: 'analyze-style', data: { content: article.content, title: article.title || '未命名' } };

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-AI-Provider': provider },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: '分析失败' }));
        throw new Error(errData.error || '分析失败');
      }

      const data = await res.json();

      if (action === 'analyze-diff') {
        setIsDiffMode(true);
        setChanges(data.changes ?? []);
      }

      setResult(data);

      // 存入记忆
      const insight: StyleInsight = {
        id: nanoid(),
        articleId: article.id,
        articleTitle: article.title || '未命名',
        analyzedAt: new Date().toISOString(),
        vocabProfile: data.vocabInsight ?? data.vocabProfile ?? '',
        toneProfile: data.toneInsight ?? data.toneProfile ?? '',
        rhythmProfile: data.rhythmInsight ?? data.rhythmProfile ?? '',
        signaturePhrases: data.signaturePhrases ?? '',
        antiPatterns: data.antiPatterns ?? '',
        summary: data.summary ?? '',
      };
      addInsight(insight);
      setAnalyzed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '风格分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  function hasAiDiff(): boolean {
    return !!(hasAiDraft && article.content.replace(/<[^>]*>/g, '').length > 50);
  }

  if (article.currentPhase === 7) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-900 leading-relaxed">
            定稿了！{wordCount} 字，写得不错。
          </p>
          <p className="text-sm text-green-800 mt-2 leading-relaxed">
            你可以去排版页面做多平台适配，或者直接完成这次写作。
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)]">这次写作</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[var(--muted-foreground)]">字数</span>
              <span className="float-right font-medium">{wordCount}</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">素材</span>
              <span className="float-right font-medium">{article.materials.length} 条</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">采访</span>
              <span className="float-right font-medium">{article.interviews.length} 题</span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">平台</span>
              <span className="float-right font-medium">
                {article.platform === 'wechat' ? '公众号' : article.platform === 'xiaohongshu' ? '小红书' : '知乎'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push(`/format/${article.id}`)}
          className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm text-white"
        >
          前往排版 →
        </button>

        <button
          onClick={() => setPhase(article.id, 8)}
          className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
        >
          跳过排版，完成写作
        </button>
      </div>
    );
  }

  // Phase 8: 学习记忆
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-sm font-medium text-green-900">写作完成！</p>
        <p className="text-sm text-green-800 mt-1">
          这次写了 {wordCount} 字，用了 {article.materials.length} 条素材，做了 {article.interviews.length} 题采访。
        </p>
      </div>

      {/* 风格分析 */}
      <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {isDiffMode ? '对比学习' : '风格学习'}
          </h3>
          <div className="flex items-center gap-2">
            {isDiffMode && analyzed && (
              <span className="text-xs text-blue-600">AI初稿 vs 你的修改</span>
            )}
            {isAnalyzing && (
              <span className="text-xs text-blue-600 animate-pulse">分析中...</span>
            )}
            {analyzed && (
              <span className="text-xs text-green-600">✓ 已记住</span>
            )}
          </div>
        </div>

        {isAnalyzing && (
          <div className="space-y-2">
            <div className="h-3 rounded bg-[var(--muted)] animate-pulse w-3/4" />
            <div className="h-3 rounded bg-[var(--muted)] animate-pulse w-1/2" />
            <div className="h-3 rounded bg-[var(--muted)] animate-pulse w-2/3" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-red-500">{error}</p>
            <button onClick={runAnalysis} className="text-xs text-blue-600 hover:underline">
              重试
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="rounded bg-blue-50 border border-blue-100 p-2">
              <p className="text-xs text-blue-900 font-medium">{result.summary}</p>
            </div>

            {/* 对比模式：展示具体修改 */}
            {isDiffMode && changes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--muted-foreground)] font-medium">你的修改</span>
                {changes.map((c, i) => (
                  <div key={i} className="text-xs border-l-2 pl-2 border-blue-300">
                    {c.type === 'replace' && (
                      <>
                        <p className="text-red-400 line-through">{c.ai}</p>
                        <p className="text-green-600">{c.user}</p>
                      </>
                    )}
                    {c.type === 'delete' && (
                      <p className="text-red-400 line-through">删：{c.ai}</p>
                    )}
                    {c.type === 'add' && (
                      <p className="text-green-600">加：{c.user}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 提炼的风格信号 */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[var(--muted-foreground)] font-medium">用词</span>
                <p className="text-[var(--foreground)] mt-0.5">{result.vocabInsight ?? result.vocabProfile}</p>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] font-medium">语气</span>
                <p className="text-[var(--foreground)] mt-0.5">{result.toneInsight ?? result.toneProfile}</p>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] font-medium">节奏</span>
                <p className="text-[var(--foreground)] mt-0.5">{result.rhythmInsight ?? result.rhythmProfile}</p>
              </div>
            </div>

            {result.signaturePhrases && (
              <div className="text-xs">
                <span className="text-[var(--muted-foreground)] font-medium">标志表达</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.signaturePhrases.split('、').map((p: string, i: number) => (
                    <span key={i} className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[var(--foreground)]">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.antiPatterns && (
              <div className="text-xs">
                <span className="text-[var(--muted-foreground)] font-medium">不用什么</span>
                <p className="text-red-500 mt-0.5">{result.antiPatterns}</p>
              </div>
            )}
          </div>
        )}

        {analyzed && (
          <p className="text-xs text-[var(--muted-foreground)]">
            已累计学习 {insights.length} 篇文章的风格。下次写作时 AI 会参考这些风格记忆。
          </p>
        )}
      </div>

      <button
        onClick={() => router.push('/')}
        className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm text-white"
      >
        返回首页
      </button>
    </div>
  );
}
