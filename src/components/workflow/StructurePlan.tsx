'use client';

import { useState } from 'react';
import type { Article } from '@/lib/workflow/types';
import { useArticleStore } from '@/stores/article-store';

interface StructurePlanProps {
  article: Article;
}

export function StructurePlan({ article }: StructurePlanProps) {
  const { setPhase, updateContent } = useArticleStore();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const applyTemplate = (template: string) => {
    setSelectedTemplate(template);
    const theme = article.theme;
    const materials = article.materials.map((m) => m.content).join('\n\n');

    let content = '';
    switch (template) {
      case 'story':
        content = `# ${theme?.oneSentence ?? '标题'}

> ${theme?.coreMessage ?? ''}

## 开头：一个场景

<!-- 用具体画面切入，让读者身临其境 -->

## 转折：发现与思考

<!-- 从场景引出观点 -->

${materials ? `### 素材\n\n${materials}\n\n` : ''}
## 深入：为什么这很重要

<!-- 论述核心观点 -->

## 结尾：回到开头

<!-- 回扣开头的场景，升华主题 -->
`;
        break;
      case 'list':
        content = `# ${theme?.oneSentence ?? '标题'}

> ${theme?.coreMessage ?? ''}

## 引言

<!-- 用一句话抓住读者 -->

## 第一点

<!-- 观点 + 故事/例子 -->

## 第二点

<!-- 观点 + 故事/例子 -->

## 第三点

<!-- 观点 + 故事/例子 -->

${materials ? `### 素材\n\n${materials}\n\n` : ''}
## 总结

<!-- 一句话收尾 -->
`;
        break;
      case 'argument':
        content = `# ${theme?.oneSentence ?? '标题'}

> ${theme?.coreMessage ?? ''}

## 提出问题

<!-- 读者面临什么困惑？ -->

## 分析原因

<!-- 为什么会这样？ -->

${materials ? `### 素材\n\n${materials}\n\n` : ''}
## 给出方案

<!-- 你建议怎么做？ -->

## 结尾

<!-- 留下思考 -->
`;
        break;
    }

    updateContent(article.id, content);
  };

  const templateCards = [
    { key: 'story', icon: '📖', name: '故事型', desc: '场景开头 → 转折 → 深入 → 回扣开头', fit: '个人经历、感悟、叙事类文章' },
    { key: 'list', icon: '📝', name: '清单型', desc: '引言 → 三个要点 → 总结', fit: '干货分享、方法论、推荐类文章' },
    { key: 'argument', icon: '💡', name: '论述型', desc: '提出问题 → 分析原因 → 给出方案', fit: '观点输出、问题分析、建议类文章' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-green-50 border border-green-200 p-4">
        <p className="text-sm text-green-900 leading-relaxed">
          主题确定了，现在来搭骨架。有了结构，写起来才不会散。
        </p>
        <p className="text-sm text-green-800 mt-2 leading-relaxed">
          选一个适合你内容的结构模板，编辑器会自动生成文章框架，你可以在里面自由修改。
        </p>
      </div>

      {article.theme && (
        <div className="rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">当前主题</p>
          <p className="text-sm font-medium">{article.theme.oneSentence}</p>
          {article.theme.coreMessage && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">核心：{article.theme.coreMessage}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-medium text-[var(--muted-foreground)]">选择结构模板</h3>

        {templateCards.map((t) => (
          <button
            key={t.key}
            onClick={() => applyTemplate(t.key)}
            className={`w-full text-left rounded-lg border p-4 transition-colors ${
              selectedTemplate === t.key
                ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]'
                : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--muted)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{t.icon}</span>
              <p className="text-sm font-medium">{t.name}</p>
              {selectedTemplate === t.key && (
                <span className="ml-auto text-xs text-[var(--primary)]">✓ 已选</span>
              )}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">{t.desc}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">适合：{t.fit}</p>
          </button>
        ))}
      </div>

      <button
        onClick={() => setPhase(article.id, 5)}
        disabled={!selectedTemplate}
        className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        结构确定，开始写初稿 →
      </button>
    </div>
  );
}
