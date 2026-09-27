import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: '宠馨智', description: '宠物慢性病 AI 健康管家' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
