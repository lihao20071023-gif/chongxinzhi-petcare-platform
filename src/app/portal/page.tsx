import type { Metadata } from 'next';
import { SystemPortal } from '@/components/system-portal';

export const metadata: Metadata = {
  title: '宠馨智 · 一体化系统入口',
  description: '一个微信小程序、一个Web管理后台、一个统一API和一套共享数据库',
};

export default function PortalPage() {
  return <SystemPortal />;
}
