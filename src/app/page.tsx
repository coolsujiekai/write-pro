'use client';

import { useArticleStore } from '@/stores/article-store';
import { useStyleMemoryStore } from '@/stores/style-memory-store';
import { useRouter } from 'next/navigation';
import { PHASES } from '@/lib/workflow/types';
import { useState, useEffect } from 'react';
import { SettingsModal } from '@/components/ui/SettingsModal';
import type { Article } from '@/lib/workflow/types';

export default function HomePage() {
  const { articles, createArticle, loadFromServer, deleteArticle } = useArticleStore();
  const { loadFromServer: loadStyleMemory } = useStyleMemoryStore();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    loadFromServer();
    loadStyleMemory();
  }, [loadFromServer, loadStyleMemory]);

  const handleCreate = () => {
    const article = createArticle();
    router.push(`/write/${article.id}`);
  };

  const handleExportMD = async (id: string) => {
    try {
      const res = await fetch('/api/articles/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${articles.find((a) => a.id === id)?.title || '未命名'}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('导出失败');
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} 小时前`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} 天前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const detailArticle = detailId ? articles.find((a) => a.id === detailId) : null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <h1 className="text-xl font-bold">Write Pro</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              ⚙ 设置
            </button>
            <button
              onClick={handleCreate}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white hover:bg-[var(--primary-light)] transition-colors"
            >
              新建文章
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {articles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--muted-foreground)] text-lg mb-4">还没有文章</p>
            <p className="text-[var(--muted-foreground)] text-sm">点击「新建文章」开始你的第一篇创作</p>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* 左侧：文章列表 */}
            <div className="flex-1 space-y-3">
              {[...articles].reverse().map((article) => (
                <div
                  key={article.id}
                  onClick={() => setDetailId(detailId === article.id ? null : article.id)}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    detailId === article.id
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                      : 'border-[var(--border)] hover:border-[var(--primary)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-medium">{article.title || '未命名文章'}</h2>
                    <span className="text-xs text-[var(--muted-foreground)]">{formatDate(article.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                      {PHASES[article.currentPhase - 1].name}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {article.platform === 'wechat' ? '公众号' : article.platform === 'xiaohongshu' ? '小红书' : '知乎'}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">{article.content.length} 字</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 右侧：详情面板 */}
            {detailArticle && (
              <div className="w-80 shrink-0">
                <ArticleDetail
                  article={detailArticle}
                  onEdit={() => router.push(`/write/${detailArticle.id}`)}
                  onExport={() => handleExportMD(detailArticle.id)}
                  onDelete={() => {
                    if (confirm('确定删除？')) {
                      deleteArticle(detailArticle.id);
                      setDetailId(null);
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function ArticleDetail({
  article,
  onEdit,
  onExport,
  onDelete,
}: {
  article: Article;
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-4 space-y-4 sticky top-8">
      <h3 className="font-medium text-sm">{article.title || '未命名文章'}</h3>

      {/* 基本信息 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[var(--muted-foreground)]">阶段</span>
          <p>{PHASES[article.currentPhase - 1].name}</p>
        </div>
        <div>
          <span className="text-[var(--muted-foreground)]">平台</span>
          <p>{article.platform === 'wechat' ? '公众号' : article.platform === 'xiaohongshu' ? '小红书' : '知乎'}</p>
        </div>
        <div>
          <span className="text-[var(--muted-foreground)]">字数</span>
          <p>{article.content.length}</p>
        </div>
        <div>
          <span className="text-[var(--muted-foreground)]">素材</span>
          <p>{article.materials.length} 条</p>
        </div>
      </div>

      {/* 主题 */}
      {article.theme && (
        <div className="text-xs">
          <span className="text-[var(--muted-foreground)]">主题</span>
          <p className="mt-1">{article.theme.oneSentence}</p>
          {article.theme.coreMessage && (
            <p className="text-[var(--muted-foreground)] mt-1">核心：{article.theme.coreMessage}</p>
          )}
        </div>
      )}

      {/* 采访摘要 */}
      {article.interviews.length > 0 && (
        <div className="text-xs">
          <span className="text-[var(--muted-foreground)]">采访记录 ({article.interviews.length} 条)</span>
          <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
            {article.interviews.slice(0, 3).map((i) => (
              <div key={i.id} className="border-l-2 border-[var(--border)] pl-2">
                <p className="text-[var(--muted-foreground)]">{i.question}</p>
                <p>{i.answer.slice(0, 50)}{i.answer.length > 50 ? '...' : ''}</p>
              </div>
            ))}
            {article.interviews.length > 3 && (
              <p className="text-[var(--muted-foreground)]">还有 {article.interviews.length - 3} 条...</p>
            )}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 rounded bg-[var(--primary)] px-3 py-1.5 text-xs text-white"
        >
          继续编辑
        </button>
        <button
          onClick={onExport}
          className="rounded border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
        >
          导出 MD
        </button>
        <button
          onClick={onDelete}
          className="rounded border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
        >
          删除
        </button>
      </div>
    </div>
  );
}
