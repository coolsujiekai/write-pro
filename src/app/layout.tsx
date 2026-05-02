import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Write Pro - 个人写作助手',
  description: '从素材到定稿的完整创作流程',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
