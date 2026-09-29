import type { Metadata } from 'next';
import { VisualStyleAnalysis } from '@/components/visual-style-analysis';

export const metadata: Metadata = {
  title: '宠馨智 · 视觉风格分析',
  description: '基于同类产品截图提取的视觉特征与宠馨智项目适配评估。',
};

export default function VisualAnalysisPage() {
  return <VisualStyleAnalysis />;
}
