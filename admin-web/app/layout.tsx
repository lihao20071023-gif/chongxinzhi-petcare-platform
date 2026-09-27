import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '宠馨智管理后台',
  description: '宠馨智平台管理员专用后台'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
