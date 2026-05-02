'use client';

import { useState, useRef } from 'react';
import type { Article } from '@/lib/workflow/types';
import { useArticleStore } from '@/stores/article-store';

interface MaterialIntakeProps {
  article: Article;
}

export function MaterialIntake({ article }: MaterialIntakeProps) {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addMaterial, removeMaterial, setPhase } = useArticleStore();

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

  return (
    <div className="space-y-4">
      {/* 编辑对话 */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-900 leading-relaxed">
          你好，我是你的写作助手。我们先来收集素材。
        </p>
        <p className="text-sm text-blue-800 mt-2 leading-relaxed">
          你可以直接粘贴你的书摘、金句、想法，或者描述你想写的话题。不用整理，有多少给多少。
        </p>
      </div>

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
