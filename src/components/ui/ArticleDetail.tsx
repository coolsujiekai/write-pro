import { memo } from 'react';
import type { Article } from '@/lib/workflow/types';
import { PHASES } from '@/lib/workflow/types';

interface ArticleDetailProps {
  article: Article;
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export const ArticleDetail = memo(function ArticleDetail({
  article,
  onEdit,
  onExport,
  onDelete,
}: ArticleDetailProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-4 space-y-4 sticky top-8">
      <h3 className="font-medium text-sm">{article.title || '未命名文章'}</h3>

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

      {article.theme && (
        <div className="text-xs">
          <span className="text-[var(--muted-foreground)]">主题</span>
          <p className="mt-1">{article.theme.oneSentence}</p>
          {article.theme.coreMessage && (
            <p className="text-[var(--muted-foreground)] mt-1">核心：{article.theme.coreMessage}</p>
          )}
        </div>
      )}

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
});
