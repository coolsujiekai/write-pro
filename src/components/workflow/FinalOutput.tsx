'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Article } from '@/lib/workflow/types';
import { useArticleStore } from '@/stores/article-store';
import { useStyleMemoryStore, type StyleInsight } from '@/stores/style-memory-store';
import { useSettingsStore } from '@/stores/settings-store';
import { calculateQualityMetrics } from '@/lib/quality/metrics';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';

interface FinalOutputProps {
  article: Article;
}

export function FinalOutput({ article }: FinalOutputProps) {
  const setPhase = useArticleStore((s) => s.setPhase);
  const setStyleAnalysis = useArticleStore((s) => s.setStyleAnalysis);
  const addInsight = useStyleMemoryStore((s) => s.addInsight);
  const insights = useStyleMemoryStore((s) => s.insights);
  const provider = useSettingsStore((s) => s.provider);
  const router = useRouter();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const wordCount = article.content.replace(/<[^>]*>/g, '').length;
  const hasAiDraft = article.aiDraft && article.aiDraft.length > 0;

  const qualityMetrics = useMemo(() => {
    if (!hasAiDraft || wordCount === 0) return null;
    return calculateQualityMetrics(article.aiDraft!, article.content);
  }, [article.aiDraft, article.content, hasAiDraft, wordCount]);

  // 已有缓存分析结果 → 直接使用；否则触发分析
  const cached = article.styleAnalysis;

  function hasAiDiff(): boolean {
    return !!(hasAiDraft && article.content.replace(/<[^>]*>/g, '').length > 50);
  }

  const doAnalysis = async () => {
    try {
      // 构建已有风格上下文，让 AI 在此基础上深化
      const recentInsights = insights.slice(-3);
      const existingStyle = recentInsights.length > 0
        ? recentInsights.map((i) =>
            `[${i.articleTitle}] 用词:${i.vocabProfile} 语气:${i.toneProfile} 节奏:${i.rhythmProfile} 标志:${i.signaturePhrases} 禁用:${i.antiPatterns}`
          ).join('\n')
        : undefined;

      const action = hasAiDiff() ? 'analyze-diff' : 'analyze-style';
      const payload = action === 'analyze-diff'
        ? { action: 'analyze-diff', data: { aiDraft: article.aiDraft, userVersion: article.content, title: article.title || '未命名', existingStyle } }
        : { action: 'analyze-style', data: { content: article.content, title: article.title || '未命名', existingStyle } };

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

      // 构建分析结果
      const analysisResult = {
        analyzedAt: new Date().toISOString(),
        isDiffMode: action === 'analyze-diff',
        changes: data.changes ?? [],
        vocabProfile: data.vocabInsight ?? data.vocabProfile ?? '',
        toneProfile: data.toneInsight ?? data.toneProfile ?? '',
        rhythmProfile: data.rhythmInsight ?? data.rhythmProfile ?? '',
        signaturePhrases: data.signaturePhrases ?? '',
        antiPatterns: data.antiPatterns ?? '',
        summary: data.summary ?? '',
      };

      // 持久化到文章（通过 debouncedSync 落盘）
      setStyleAnalysis(article.id, analysisResult);

      // 同时写入全局风格记忆
      const insight: StyleInsight = {
        id: nanoid(),
        articleId: article.id,
        articleTitle: article.title || '未命名',
        analyzedAt: analysisResult.analyzedAt,
        vocabProfile: analysisResult.vocabProfile,
        toneProfile: analysisResult.toneProfile,
        rhythmProfile: analysisResult.rhythmProfile,
        signaturePhrases: analysisResult.signaturePhrases,
        antiPatterns: analysisResult.antiPatterns,
        summary: analysisResult.summary,
      };
      addInsight(insight);
    } catch (err) {
      setError(err instanceof Error ? err.message : '风格分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (article.currentPhase === 8 && !cached && !isAnalyzing) {
      void (async () => {
        setIsAnalyzing(true);
        setError('');
        setStyleAnalysis(article.id, null);
        await doAnalysis();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.currentPhase]);

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

          {qualityMetrics && (
            <div className="border-t border-[var(--border)] pt-2 space-y-1">
              <h3 className="text-xs font-medium text-[var(--muted-foreground)]">AI 对比</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <QualityStat label="采纳率" value={qualityMetrics.adoptionRate} higherIsBetter />
                <QualityStat label="修改率" value={qualityMetrics.editRate} />
                <QualityStat label="重写率" value={qualityMetrics.rewriteRate} />
              </div>
            </div>
          )}
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
            {cached?.isDiffMode ? '对比学习' : '风格学习'}
          </h3>
          <div className="flex items-center gap-2">
            {cached?.isDiffMode && cached && (
              <span className="text-xs text-blue-600">AI初稿 vs 你的修改</span>
            )}
            {isAnalyzing && (
              <span className="text-xs text-blue-600 animate-pulse">分析中...</span>
            )}
            {cached && !isAnalyzing && (
              <span className="text-xs text-green-600">✓ 已记住</span>
            )}
            {!isAnalyzing && (
              <button
                onClick={async () => {
                  setIsAnalyzing(true);
                  setError('');
                  setStyleAnalysis(article.id, null);
                  await doAnalysis();
                }}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline"
              >
                重新分析
              </button>
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
            <button onClick={async () => { setIsAnalyzing(true); setError(''); await doAnalysis(); }} className="text-xs text-blue-600 hover:underline">
              重试
            </button>
          </div>
        )}

        {cached && (
          <div className="space-y-3">
            <div className="rounded bg-blue-50 border border-blue-100 p-2">
              <p className="text-xs text-blue-900 font-medium">{cached.summary}</p>
            </div>

            {/* 对比模式：展示具体修改 */}
            {cached.isDiffMode && cached.changes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--muted-foreground)] font-medium">你的修改</span>
                {cached.changes.map((c, i) => (
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
                <p className="text-[var(--foreground)] mt-0.5">{cached.vocabProfile}</p>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] font-medium">语气</span>
                <p className="text-[var(--foreground)] mt-0.5">{cached.toneProfile}</p>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)] font-medium">节奏</span>
                <p className="text-[var(--foreground)] mt-0.5">{cached.rhythmProfile}</p>
              </div>
            </div>

            {cached.signaturePhrases && (
              <div className="text-xs">
                <span className="text-[var(--muted-foreground)] font-medium">标志表达</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cached.signaturePhrases.split('、').map((p: string, i: number) => (
                    <span key={i} className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[var(--foreground)]">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {cached.antiPatterns && (
              <div className="text-xs">
                <span className="text-[var(--muted-foreground)] font-medium">不用什么</span>
                <p className="text-red-500 mt-0.5">{cached.antiPatterns}</p>
              </div>
            )}
          </div>
        )}

        {cached && (
          <p className="text-xs text-[var(--muted-foreground)]">
            已累计学习 {insights.length} 篇文章的风格。下次写作时 AI 会参考这些风格记忆。
          </p>
        )}
      </div>

      {qualityMetrics && (
        <div className="rounded-lg border border-[var(--border)] p-4 space-y-2">
          <h3 className="text-sm font-medium">AI 质量报告</h3>
          <div className="grid grid-cols-3 gap-3">
            <QualityStat label="采纳率" value={qualityMetrics.adoptionRate} higherIsBetter />
            <QualityStat label="修改率" value={qualityMetrics.editRate} />
            <QualityStat label="重写率" value={qualityMetrics.rewriteRate} />
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            AI 初稿 {qualityMetrics.aiCharCount} 字，最终版 {qualityMetrics.userCharCount} 字。
            采纳率越高说明 AI 越懂你的风格。
          </p>
        </div>
      )}

      <button
        onClick={() => router.push('/')}
        className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm text-white"
      >
        返回首页
      </button>
    </div>
  );
}

function QualityStat({ label, value, higherIsBetter }: { label: string; value: number; higherIsBetter?: boolean }) {
  const pct = Math.round(value * 100);
  const isGood = higherIsBetter ? pct >= 60 : pct <= 30;
  const color = isGood ? 'text-green-600' : value > 0 ? 'text-amber-600' : 'text-[var(--muted-foreground)]';
  return (
    <div className="text-center">
      <span className={`text-lg font-bold ${color}`}>{pct}%</span>
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}
