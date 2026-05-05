'use client';

import { useArticleStore } from '@/stores/article-store';
import { useStyleMemoryStore } from '@/stores/style-memory-store';
import { useParams } from 'next/navigation';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { WorkflowPanel } from '@/components/workflow/WorkflowPanel';
import { PlatformSelector } from '@/components/ui/PlatformSelector';
import { useEffect, useState } from 'react';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Navbar } from '@/components/ui/Navbar';

export default function WritePage() {
  const { id } = useParams<{ id: string }>();
  const articles = useArticleStore((s) => s.articles);
  const currentArticle = useArticleStore((s) => s.currentArticle);
  const setCurrentArticle = useArticleStore((s) => s.setCurrentArticle);
  const updateContent = useArticleStore((s) => s.updateContent);
  const updateTitle = useArticleStore((s) => s.updateTitle);
  const setPlatform = useArticleStore((s) => s.setPlatform);
  const loadFromServer = useArticleStore((s) => s.loadFromServer);
  const loadStyleMemory = useStyleMemoryStore((s) => s.loadFromServer);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    loadFromServer();
    loadStyleMemory();
    if (!currentArticle || currentArticle.id !== id) {
      setCurrentArticle(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const article = articles.find((a) => a.id === id);

  if (!article) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-[var(--muted-foreground)]">文章不存在</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <ErrorBoundary>
      <Navbar
        backTo="/"
        title=""
        actions={
          <>
            <input
              type="text"
              value={article.title}
              onChange={(e) => updateTitle(article.id, e.target.value)}
              placeholder="文章标题..."
              className="border-none bg-transparent text-lg font-medium focus:outline-none w-48"
            />
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              ⚙
            </button>
            <PlatformSelector
              value={article.platform}
              onChange={(p) => setPlatform(article.id, p)}
            />
            <span className="text-xs text-[var(--muted-foreground)]">
              {article.content.length} 字
            </span>
          </>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        <WorkflowPanel article={article} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            <TiptapEditor
              content={article.content}
              onUpdate={(content) => updateContent(article.id, content)}
              placeholder="开始写作..."
            />
          </div>
        </main>
      </div>

      </ErrorBoundary>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
