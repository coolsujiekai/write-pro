'use client';

import { useState } from 'react';
import type { Article } from '@/lib/workflow/types';
import { useArticleStore } from '@/stores/article-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useStyleMemoryStore } from '@/stores/style-memory-store';

interface DraftReviewProps {
  article: Article;
}

type GenerateStep = 'idle' | 'generating' | 'polishing' | 'done';

export function DraftReview({ article }: DraftReviewProps) {
  const { setPhase, updateContent, setAiDraft } = useArticleStore();
  const provider = useSettingsStore((s) => s.provider);
  const getStylePrompt = useStyleMemoryStore((s) => s.getStylePrompt);
  const [step, setStep] = useState<GenerateStep>('idle');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ score: number; issues: { text: string; suggestion: string }[]; summary: string } | null>(null);
  const [error, setError] = useState('');
  const [polishSummary, setPolishSummary] = useState('');

  const wordCount = article.content.replace(/<[^>]*>/g, '').length;

  const generateAndPolish = async () => {
    setError('');
    setPolishSummary('');

    try {
      // 第一步：生成初稿
      setStep('generating');
      const genRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-AI-Provider': provider },
        body: JSON.stringify({
          action: 'generate-draft',
          data: {
            title: article.title,
            theme: article.theme,
            materials: article.materials.map((m) => m.content),
            interviews: article.interviews.map((i) => ({ q: i.question, a: i.answer })),
            structure: article.content,
            platform: article.platform,
            stylePrompt: getStylePrompt(),
          },
        }),
      });

      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || '生成初稿失败');
      }

      const genData = await genRes.json();
      const rawDraft = genData.draft;

      // 第二步：自动打磨去 AI 味
      setStep('polishing');
      const polRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-AI-Provider': provider },
        body: JSON.stringify({
          action: 'polish-draft',
          data: {
            content: rawDraft,
            platform: article.platform,
          },
        }),
      });

      if (!polRes.ok) {
        // 打磨失败就用原始初稿
        const { markdownToHtml } = await import('@/lib/format/markdown-to-html');
        const html = markdownToHtml(rawDraft);
        updateContent(article.id, html);
        setAiDraft(article.id, html);
        setPolishSummary('打磨步骤跳过，使用原始初稿');
        setStep('done');
        return;
      }

      const polData = await polRes.json();
      const { markdownToHtml } = await import('@/lib/format/markdown-to-html');
      const html = markdownToHtml(polData.draft);
      updateContent(article.id, html);
      setAiDraft(article.id, html);
      setPolishSummary('已自动去除 AI 味，初稿已就绪');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
      setStep('idle');
    }
  };

  const checkAI = async () => {
    setIsChecking(true);
    setError('');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-AI-Provider': provider },
        body: JSON.stringify({
          action: 'check-ai',
          data: { content: article.content.replace(/<[^>]*>/g, '') },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '检查失败');
      }

      const data = await response.json();
      setCheckResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查失败');
    } finally {
      setIsChecking(false);
    }
  };

  if (article.currentPhase === 5) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
          <p className="text-sm text-orange-900 leading-relaxed">
            骨架搭好了。你可以自己写，也可以让 AI 帮你生成初稿。
          </p>
          <p className="text-sm text-orange-800 mt-2 leading-relaxed">
            AI 会先生成初稿，再自动打磨去除 AI 味，然后交给你修改。
          </p>
        </div>

        {/* AI 生成按钮 / 进度 */}
        {step === 'idle' && (
          <button
            onClick={generateAndPolish}
            className="w-full rounded-lg border border-dashed border-orange-300 px-4 py-3 text-sm text-orange-700 hover:bg-orange-50"
          >
            ✨ 让 AI 帮我生成初稿
          </button>
        )}

        {step === 'generating' && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-sm text-orange-800">正在生成初稿...</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-orange-200 overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-orange-400 animate-pulse" />
            </div>
          </div>
        )}

        {step === 'polishing' && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-sm text-blue-800">初稿生成完毕，正在打磨去 AI 味...</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-blue-200 overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-blue-400 animate-pulse" />
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm text-green-800">✓ {polishSummary}</p>
            <p className="text-xs text-green-700 mt-1">初稿已写入编辑器，你可以直接修改。</p>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="rounded-lg border border-[var(--border)] p-3">
          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span>当前字数</span>
            <span className="font-medium text-[var(--foreground)]">{wordCount} 字</span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)]">写作小贴士</h3>
          <ul className="text-xs text-[var(--muted-foreground)] space-y-1.5">
            <li>• 像说话一样写，读出来不别扭才算及格</li>
            <li>• 一句话超过 30 个字就该拆</li>
            <li>• 具体不要抽象 — &quot;我很感动&quot;不如&quot;我鼻子一酸&quot;</li>
            <li>• 长短句交替，不要全是长句或短句</li>
          </ul>
        </div>

        <button
          onClick={() => setPhase(article.id, 6)}
          disabled={wordCount < 50}
          className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          初稿写好了，开始修改 →
        </button>
      </div>
    );
  }

  // Phase 6: 修改
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
        <p className="text-sm text-yellow-900 leading-relaxed">
          初稿写完了，现在来打磨。好文章是改出来的。
        </p>
        <p className="text-sm text-yellow-800 mt-2 leading-relaxed">
          在编辑器里直接改。也可以让 AI 再检查一遍有没有残留的 AI 味。
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] p-3">
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>当前字数</span>
          <span className="font-medium text-[var(--foreground)]">{wordCount} 字</span>
        </div>
      </div>

      {/* AI 检查按钮 */}
      <button
        onClick={checkAI}
        disabled={isChecking || wordCount < 50}
        className="w-full rounded-lg border border-dashed border-yellow-300 px-4 py-3 text-sm text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
      >
        {isChecking ? '正在检查...' : '🔍 让 AI 再检查一遍 AI 味'}
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* 检查结果 */}
      {checkResult && (
        <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">检查结果</h3>
            <span className={`text-sm font-bold ${
              checkResult.score >= 80 ? 'text-green-600' : checkResult.score >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {checkResult.score} 分
            </span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">{checkResult.summary}</p>
          {checkResult.issues.length > 0 && (
            <div className="space-y-2">
              {checkResult.issues.map((issue, i) => (
                <div key={i} className="text-xs border-l-2 border-red-300 pl-2">
                  <p className="text-red-600">✗ {issue.text}</p>
                  <p className="text-green-600">→ {issue.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-medium text-[var(--muted-foreground)]">手动检查清单</h3>
        <div className="space-y-1.5">
          {[
            { check: '有没有"首先...其次...最后..."？', fix: '改成自然过渡' },
            { check: '有没有"值得一提的是"？', fix: '直接删掉' },
            { check: '有没有"在这个快节奏的时代"？', fix: '换成具体场景' },
            { check: '读起来像真人说的话吗？', fix: '大声读一遍' },
          ].map((item) => (
            <div key={item.check} className="flex items-start gap-2 text-xs">
              <span className="text-red-400 mt-0.5">✗</span>
              <div>
                <p className="text-[var(--foreground)]">{item.check}</p>
                <p className="text-[var(--muted-foreground)]">→ {item.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setPhase(article.id, 7)}
        className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm text-white"
      >
        修改完成，定稿 →
      </button>
    </div>
  );
}
