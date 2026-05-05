'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  title?: string;
  actions?: React.ReactNode;
  backTo?: string;
}

export const Navbar = memo(function Navbar({ title, actions, backTo }: NavbarProps) {
  const router = useRouter();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-6 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {backTo && (
          <button
            onClick={() => router.push(backTo)}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            ← 返回
          </button>
        )}
        <h1
          onClick={() => !backTo && router.push('/')}
          className={`text-lg font-semibold tracking-tight ${backTo ? '' : 'cursor-pointer'}`}
        >
          {title || 'Write Pro'}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </nav>
  );
});
