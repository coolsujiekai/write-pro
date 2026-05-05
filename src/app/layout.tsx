import type { Metadata } from 'next';
import './globals.css';
import { Footer } from '@/components/ui/Footer';

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
      <body className="antialiased flex min-h-screen flex-col">
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
