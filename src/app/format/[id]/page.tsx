'use client';

import { useArticleStore } from '@/stores/article-store';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatForWechat } from '@/lib/format/platforms/wechat';
import { formatForXiaohongshu } from '@/lib/format/platforms/xiaohongshu';
import { formatForZhihu } from '@/lib/format/platforms/zhihu';
import type { Platform } from '@/lib/workflow/types';
import { PlatformSelector } from '@/components/ui/PlatformSelector';

export default function FormatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { articles, setCurrentArticle } = useArticleStore();
  const [platform, setPlatform] = useState<Platform>('wechat');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCurrentArticle(id);
  }, [id, setCurrentArticle]);

  const article = articles.find((a) => a.id === id);

  if (!article) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-[var(--muted-foreground)]">文章不存在</p>
      </div>
    );
  }

  const renderPreview = () => {
    if (!article.content) {
      return <p className="text-[var(--muted-foreground)]">暂无内容</p>;
    }

    switch (platform) {
      case 'wechat':
        return (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: formatForWechat(article.content) }}
          />
        );
      case 'xiaohongshu': {
        const xhs = formatForXiaohongshu(article.content);
        return (
          <div className="space-y-4">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: xhs.html }}
            />
            <div className="rounded-lg bg-[var(--muted)] p-4">
              <p className="text-sm font-medium mb-2">标签建议：</p>
              <div className="flex flex-wrap gap-2">
                {xhs.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs text-white">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-sm">
                <p className="font-medium">封面文案：</p>
                <p className="text-[var(--muted-foreground)]">{xhs.coverText.title}</p>
              </div>
            </div>
          </div>
        );
      }
      case 'zhihu':
        return (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: formatForZhihu(article.content) }}
          />
        );
    }
  };

  const getHtmlForCopy = (): string => {
    if (!article.content) return '';
    switch (platform) {
      case 'wechat':
        return formatForWechat(article.content);
      case 'xiaohongshu':
        return formatForXiaohongshu(article.content).html;
      case 'zhihu':
        return formatForZhihu(article.content);
    }
  };

  const handleCopy = async () => {
    const html = getHtmlForCopy();
    const blob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([article.content], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': blob,
        'text/plain': textBlob,
      }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/write/${id}`)}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ← 返回编辑
          </button>
          <h1 className="text-lg font-medium">{article.title || '排版预览'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <PlatformSelector value={platform} onChange={setPlatform} />
          <button
            onClick={handleCopy}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white hover:bg-[var(--primary-light)] transition-colors"
          >
            {copied ? '已复制 ✓' : '一键复制'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl rounded-lg border border-[var(--border)] bg-white p-8 shadow-sm">
          {renderPreview()}
        </div>
      </main>
    </div>
  );
}
