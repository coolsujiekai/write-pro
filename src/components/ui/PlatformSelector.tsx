'use client';

import { memo } from 'react';
import type { Platform } from '@/lib/workflow/types';

interface PlatformSelectorProps {
  value: Platform;
  onChange: (platform: Platform) => void;
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'wechat', label: '公众号' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'zhihu', label: '知乎' },
];

export const PlatformSelector = memo(function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  return (
    <div className="flex rounded-lg border border-[var(--border)]">
      {PLATFORMS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1 text-xs transition-colors ${
            value === p.value
              ? 'bg-[var(--primary)] text-white'
              : 'hover:bg-[var(--muted)]'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
});
