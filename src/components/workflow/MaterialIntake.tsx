'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Article, Material } from '@/lib/workflow/types';
import { getPhaseDefinition } from '@/lib/workflow/types';
import { useArticleStore } from '@/stores/article-store';
import type { LibraryIndex } from '@/lib/library/types';

interface MaterialIntakeProps {
  article: Article;
  onMatchedItemsChange?: (items: LibraryIndex[]) => void;
}

interface Recommendation {
  index: LibraryIndex;
  reason: string;
  preview?: string;
}

export function MaterialIntake({ article, onMatchedItemsChange }: MaterialIntakeProps) {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const addMaterial = useArticleStore((s) => s.addMaterial);
  const removeMaterial = useArticleStore((s) => s.removeMaterial);
  const setPhase = useArticleStore((s) => s.setPhase);

  // Auto-recommend when materials change
  const triggerRecommend = useCallback(async (materials: Material[]) => {
    if (materials.length === 0) {
      setRecommendations([]);
      onMatchedItemsChange?.([]);
      return;
    }

    setIsRecommending(true);
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recommend-materials',
          materials: materials.map((m) => m.content),
        }),
      });
      if (!res.ok) throw new Error('推荐失败');
      const data = await res.json();
      setRecommendations(data.items ?? []);
      onMatchedItemsChange?.(data.items?.map((r: Recommendation) => r.index) ?? []);
    } catch {
      // Silent fail — recommendations are optional
    } finally {
      setIsRecommending(false);
    }
  }, [onMatchedItemsChange]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerRecommend(article.materials);
    }, 2000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [article.materials, triggerRecommend]);

  const handleAdd = () => {
    if (!input.trim()) return;
    addMaterial(article.id, input.trim(), 'text');
    setInput('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/library?q=${encodeURIComponent(searchQuery.trim())}`);
      if (!res.ok) throw new Error('搜索失败');
      const data = await res.json();
      setSearchResults(data.items ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addRecommendation = (rec: Recommendation) => {
    const text = rec.preview
      ? `【${rec.index.title}】${rec.index.author ? ` — ${rec.index.author}` : ''}\n${rec.preview}`
      : rec.index.title;
    addMaterial(article.id, text, 'text');
    // Remove from recommendations
    setRecommendations((prev) => prev.filter((r) => r.index.id !== rec.index.id));
  };

  const addSearchResult = (item: LibraryIndex) => {
    addMaterial(article.id, `【${item.title}】${item.author ? ` — ${item.author}` : ''}`, 'text');
  };

  // Filter out already-added recommendations
  const existingContents = new Set(article.materials.map((m) => m.content));
  const filteredRecommendations = recommendations.filter(
    (r) => !existingContents.has(r.preview ?? r.index.title),
  );

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-900 leading-relaxed">
          {getPhaseDefinition(1)?.startMessage.split('\n')[0] ?? '我们来收集素材'}
        </p>
        <p className="text-sm text-blue-800 mt-2 leading-relaxed">
          你可以直接粘贴你的书摘、金句、想法，或者描述你想写的话题。不用整理，有多少给多少。
        </p>
      </div>

      {/* Input */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="粘贴或输入素材...（Enter 添加，Shift+Enter 换行）"
          className="w-full rounded-lg border border-[var(--border)] bg-transparent p-3 pr-20 text-sm focus:border-[var(--primary)] focus:outline-none resize-none"
          rows={3}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="absolute right-2 bottom-2 rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          添加
        </button>
      </div>

      {/* Auto recommendations */}
      {(isRecommending || filteredRecommendations.length > 0) && (
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[var(--muted-foreground)]">
              {isRecommending ? '正在从知识库匹配...' : '知识库推荐'}
            </span>
          </div>

          {isRecommending && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded border border-[var(--border)] animate-pulse bg-[var(--muted)]" />
              ))}
            </div>
          )}

          {!isRecommending && filteredRecommendations.length > 0 && (
            <div className="space-y-1.5">
              {filteredRecommendations.map((rec) => (
                <div
                  key={rec.index.id}
                  className="group rounded border border-[var(--border)] p-2 flex items-start gap-2 hover:border-[var(--primary)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-1.5 py-0.5 rounded shrink-0">
                        {rec.index.category}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {rec.index.title}
                      </span>
                      {rec.index.author && (
                        <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                          {rec.index.author}
                        </span>
                      )}
                    </div>
                    {rec.reason && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{rec.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => addRecommendation(rec)}
                    className="text-xs text-[var(--primary)] hover:underline shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    添加
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual search (collapsible) */}
      <div className="border-t border-[var(--border)] pt-3">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          {showSearch ? '收起搜索' : '🔍 手动搜索知识库'}
        </button>

        {showSearch && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="搜索书名或作者..."
                className="flex-1 rounded border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm focus:border-[var(--primary)] focus:outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-50 shrink-0"
              >
                {isSearching ? '搜索中...' : '搜索'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1.5">
                {searchResults.map((item) => {
                  const idx = item as unknown as LibraryIndex;
                  return (
                    <div key={idx.id} className="group rounded border border-[var(--border)] p-2 flex items-start gap-2">
                      <div className="flex-1">
                        <span className="text-sm font-medium">{idx.title}</span>
                        {idx.author && <span className="text-xs text-[var(--muted-foreground)] ml-2">{idx.author}</span>}
                      </div>
                      <button
                        onClick={() => addSearchResult(idx)}
                        className="text-xs text-[var(--primary)] hover:underline shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        添加
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Existing materials */}
      {article.materials.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">已收集 {article.materials.length} 条素材</h3>
          </div>
          {article.materials.map((m, i) => (
            <div
              key={m.id}
              className="group rounded-lg border border-[var(--border)] p-3 text-sm hover:border-[var(--primary)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-[var(--muted-foreground)] shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="flex-1 whitespace-pre-wrap">{m.content}</p>
                <button
                  onClick={() => removeMaterial(article.id, m.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 shrink-0 transition-opacity"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setPhase(article.id, 2)}
          disabled={article.materials.length === 0}
          className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          素材收集完毕，开始采访 →
        </button>
        <button
          onClick={() => setPhase(article.id, 2)}
          className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
        >
          跳过
        </button>
      </div>
    </div>
  );
}
