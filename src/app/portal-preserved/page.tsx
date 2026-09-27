import type { Metadata } from 'next';
import { SystemPortal } from '@/components/system-portal';

export const metadata: Metadata = {
  title: '宠馨智 · 系统总入口保留版',
  description: '保留当前一体化系统总入口，供后续视觉调整时对照和回退。',
};

export default function PreservedPortalPage() {
  return <SystemPortal />;
}
