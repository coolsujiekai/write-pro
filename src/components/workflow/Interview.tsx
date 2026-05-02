'use client';

import { useState, useEffect } from 'react';
import type { Article } from '@/lib/workflow/types';
import { useArticleStore } from '@/stores/article-store';
import { useSettingsStore } from '@/stores/settings-store';

interface InterviewProps {
  article: Article;
}

export function Interview({ article }: InterviewProps) {
  const [answer, setAnswer] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { addInterviewEntry, setPhase } = useArticleStore();
  const provider = useSettingsStore((s) => s.provider);

  const answeredCount = article.interviews.length;
  const round = Math.min(Math.floor(answeredCount / 2) + 1, 4);

  const roundLabels: Record<number, string> = {
    1: '打开话题',
    2: '追问细节',
    3: '挖深度',
    4: '定位',
  };

  // 获取 AI 问题
  const fetchQuestion = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-AI-Provider': provider },
        body: JSON.stringify({
          action: 'interview',
          data: {
            materials: article.materials.map((m) => m.content),
            previousAnswers: article.interviews.flatMap((i) => [`Q: ${i.question}`, `A: ${i.answer}`]),
            round,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '获取问题失败');
      }

      const data = await response.json();
      setCurrentQuestion(data.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取问题失败');
      // 回退到默认问题
      setCurrentQuestion(getDefaultQuestion(round, answeredCount));
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载第一个问题
  useEffect(() => {
    if (!currentQuestion && answeredCount === 0) {
      fetchQuestion();
    }
  }, []);

  const handleSubmit = async () => {
    if (!answer.trim() || !currentQuestion) return;
    addInterviewEntry(article.id, round, currentQuestion, answer.trim());
    setAnswer('');

    // 获取下一个问题
    if (answeredCount + 1 < 8) {
      await fetchQuestion();
    }
  };

  const isDone = answeredCount >= 8;

  return (
    <div className="space-y-4">
      {/* 编辑开场 */}
      {answeredCount === 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-900 leading-relaxed">
            好的，我们来聊聊。我会根据你的素材问你问题，帮你把想法理清楚。
          </p>
          <p className="text-sm text-amber-800 mt-2 leading-relaxed">
            不用想太多，想到什么说什么。说"跳过"就跳过。
          </p>
        </div>
      )}

      {/* 素材回顾 */}
      {article.materials.length > 0 && (
        <details className="rounded-lg border border-[var(--border)]">
          <summary className="px-3 py-2 text-xs text-[var(--muted-foreground)] cursor-pointer hover:bg-[var(--muted)]">
            📋 查看已收集的 {article.materials.length} 条素材
          </summary>
          <div className="px-3 pb-3 space-y-2 max-h-40 overflow-y-auto">
            {article.materials.map((m) => (
              <p key={m.id} className="text-xs text-[var(--muted-foreground)] border-l-2 border-[var(--border)] pl-2">
                {m.content.slice(0, 100)}{m.content.length > 100 ? '...' : ''}
              </p>
            ))}
          </div>
        </details>
      )}

      {/* 进度 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--muted-foreground)]">
            第 {round} 轮 · {roundLabels[round] ?? '采访'}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {answeredCount} / 8 题
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((r) => (
            <div
              key={r}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                r < round ? 'bg-green-400' : r === round ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 当前问题 */}
      {!isDone && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          {isLoading ? (
            <p className="text-sm text-amber-700 animate-pulse">正在思考问题...</p>
          ) : error ? (
            <div>
              <p className="text-sm text-amber-900 font-medium leading-relaxed">{currentQuestion}</p>
              <p className="text-xs text-red-500 mt-1">AI 连接失败，使用默认问题</p>
            </div>
          ) : (
            <p className="text-sm text-amber-900 font-medium leading-relaxed">{currentQuestion}</p>
          )}
          <p className="text-xs text-amber-700 mt-2">
            按 ⌘+Enter 提交
          </p>
        </div>
      )}

      {/* 回答输入 */}
      {!isDone && (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="说说你的想法..."
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-3 text-sm focus:border-[var(--primary)] focus:outline-none resize-none"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || isLoading}
              className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {answeredCount >= 7 ? '完成采访' : '回答'}
            </button>
            <button
              onClick={fetchQuestion}
              disabled={isLoading}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
            >
              换个问题
            </button>
            <button
              onClick={() => {
                if (answeredCount >= 4) {
                  setPhase(article.id, 3);
                }
              }}
              disabled={answeredCount < 4}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
            >
              跳过
            </button>
          </div>
        </>
      )}

      {/* 采访记录 */}
      {article.interviews.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)]">采访记录</h3>
          {article.interviews.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-[var(--border)] p-3 text-sm"
            >
              <p className="text-[var(--muted-foreground)] text-xs mb-1">Q: {entry.question}</p>
              <p className="text-[var(--foreground)]">{entry.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* 完成采访 */}
      {(isDone || answeredCount >= 4) && (
        <>
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-900 leading-relaxed">
              采访到这里，信息够写初稿了。我们来确定文章的主题。
            </p>
          </div>
          <button
            onClick={() => setPhase(article.id, 3)}
            className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm text-white"
          >
            确定主题 →
          </button>
        </>
      )}
    </div>
  );
}

function getDefaultQuestion(round: number, count: number): string {
  const defaults: Record<number, string[]> = {
    1: ['你最想让读者知道的是什么？', '这些素材里，最触动你的是哪个点？'],
    2: ['你说的这个点，能举个你自己的例子吗？', '有没有一个具体的场景或画面？'],
    3: ['你有没有不同意这个观点的地方？', '这和你之前的认知有什么冲突？'],
    4: ['你希望读者看完有什么感受？', '这篇文章最想传达的一句话是什么？'],
  };
  const questions = defaults[round] ?? defaults[1];
  return questions[count % questions.length];
}
