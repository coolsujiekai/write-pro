import { memo } from 'react';

const CURRENT_YEAR = new Date().getFullYear();

export const Footer = memo(function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)] px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Write Pro</h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              从素材到定稿的完整创作流程
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
        <div className="mt-8 border-t border-[var(--border)] pt-4">
          <p className="text-xs text-[var(--muted-foreground)]">
            &copy; {CURRENT_YEAR} Write Pro. Built with Next.js.
          </p>
        </div>
      </div>
    </footer>
  );
});
