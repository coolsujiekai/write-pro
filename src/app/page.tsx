'use client';

import { useArticleStore } from '@/stores/article-store';
import { useStyleMemoryStore } from '@/stores/style-memory-store';
import { useRouter } from 'next/navigation';
import { PHASES } from '@/lib/workflow/types';
import { useState, useEffect, useMemo } from 'react';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { Navbar } from '@/components/ui/Navbar';
import { ArticleDetail } from '@/components/ui/ArticleDetail';

export default function HomePage() {
  const articles = useArticleStore((s) => s.articles);
  const createArticle = useArticleStore((s) => s.createArticle);
  const loadFromServer = useArticleStore((s) => s.loadFromServer);
  const deleteArticle = useArticleStore((s) => s.deleteArticle);
  const loadStyleMemory = useStyleMemoryStore((s) => s.loadFromServer);
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const filteredArticles = useMemo(() => {
    let result = [...articles].reverse();
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.content.replace(/<[^>]*>/g, '').toLowerCase().includes(q)
      );
    }
    if (platformFilter !== 'all') {
      result = result.filter((a) => a.platform === platformFilter);
    }
    return result;
  }, [articles, searchQuery, platformFilter]);

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
    <div className="flex flex-1 flex-col bg-[var(--background)]">
      <Navbar
        actions={
          <>
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
          </>
        }
      />

      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        {articles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--muted-foreground)] text-lg mb-4">还没有文章</p>
            <p className="text-[var(--muted-foreground)] text-sm">点击「新建文章」开始你的第一篇创作</p>
          </div>
        ) : (
          <>
            {/* 搜索与过滤 */}
            <div className="flex items-center gap-3 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索文章标题或内容..."
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-transparent placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
              />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="all">全部平台</option>
                <option value="wechat">公众号</option>
                <option value="xiaohongshu">小红书</option>
                <option value="zhihu">知乎</option>
              </select>
              <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                {filteredArticles.length}/{articles.length} 篇
              </span>
            </div>

            <div className="flex gap-6">
              {/* 左侧：文章列表 */}
              <div className="flex-1 space-y-3">
                {filteredArticles.length === 0 ? (
                  <p className="text-center text-sm text-[var(--muted-foreground)] py-8">
                    没有匹配的文章
                  </p>
                ) : (
                  filteredArticles.map((article) => (
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
                  ))
                )}
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
          </>
        )}
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

