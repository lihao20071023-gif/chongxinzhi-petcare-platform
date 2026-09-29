import type { Metadata } from 'next';
import { GuidedCareExperience } from '@/components/guided-care-experience';

export const metadata: Metadata = {
  title: '宠馨智 · 真实护理闭环体验',
  description: '按宠主真实使用顺序体验建档、授权、医生方案、护理执行、健康记录、异常回传和复诊验证。',
};

export default function ExperiencePage() {
  return <GuidedCareExperience />;
}
