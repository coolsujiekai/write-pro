'use client';

import { useState, memo } from 'react';
import { useArticleStore } from '@/stores/article-store';

interface FeedbackProps {
  articleId: string;
  target: string; // 'interview' | 'theme' | 'draft' | 'check-ai'
}

const DISSATISFY_REASONS = ['太AI味', '偏离主题', '太短/太长', '结构不好', '语气不对'];

export const Feedback = memo(function Feedback({ articleId, target }: FeedbackProps) {
  const [rating, setRating] = useState<'good' | 'bad' | null>(null);
  const [showReasons, setShowReasons] = useState(false);
  const addFeedback = useArticleStore((s) => s.addFeedback);

  const handleRate = (r: 'good' | 'bad') => {
    setRating(r);
    if (r === 'good') {
      addFeedback(articleId, target, 'good');
    } else {
      setShowReasons(true);
    }
  };

  const handleReason = (reason: string) => {
    addFeedback(articleId, target, 'bad', reason);
    setShowReasons(false);
  };

  if (rating === 'good') {
    return <span className="text-xs text-green-500">👍 已反馈</span>;
  }

  if (rating === 'bad' && !showReasons) {
    return <span className="text-xs text-amber-500">👎 已反馈</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      {!rating && (
        <>
          <button
            onClick={() => handleRate('good')}
            className="text-xs hover:scale-110 transition-transform"
            title="不错"
          >
            👍
          </button>
          <button
            onClick={() => handleRate('bad')}
            className="text-xs hover:scale-110 transition-transform"
            title="不满意"
          >
            👎
          </button>
        </>
      )}
      {showReasons && (
        <span className="inline-flex flex-wrap gap-1 ml-1">
          {DISSATISFY_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => handleReason(r)}
              className="text-xs rounded-full border border-[var(--border)] px-2 py-0.5 hover:bg-[var(--muted)]"
            >
              {r}
            </button>
          ))}
        </span>
      )}
    </span>
  );
});
