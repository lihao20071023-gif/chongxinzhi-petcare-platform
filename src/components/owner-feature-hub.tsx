'use client';

import { useEffect, useState } from 'react';
import {
  Activity, AlarmClock, AlertTriangle, ArrowLeft, Bluetooth, Bot, Building2, Camera,
  ChevronRight, ClipboardCheck, FileText, HeartPulse, HelpCircle, History, Hospital,
  LayoutGrid, LockKeyhole, PawPrint, Settings2, ShoppingBag, Sparkles, Stethoscope,
  Syringe, Target, UserRound, Utensils,
} from 'lucide-react';
import type { Tab } from './app-shell';
import { navigateToFeature, type FeatureDestination } from '@/lib/app-navigation';

type GroupId = 'daily' | 'medical' | 'hospital' | 'services';
type FeatureItem = {
  label: string;
  description: string;
  Icon: typeof Activity;
  target?: FeatureDestination;
  tab?: Tab;
  action?: 'export' | 'portal';
};

const groups: Array<{ id: GroupId; title: string; description: string; Icon: typeof Activity; tone: string; items: FeatureItem[] }> = [
  {
    id: 'daily', title: '每日护理', description: '今天要做、要记、要提醒的内容', Icon: ClipboardCheck, tone: 'green',
    items: [
      { label: '今日护理方案', description: '查看医生签署并发布的每日任务', Icon: ClipboardCheck, tab: 'care' },
      { label: '健康监测与打卡', description: '记录精神、食欲、饮水、排尿和体重', Icon: HeartPulse, tab: 'monitor' },
      { label: '用药与复查提醒', description: '查看时间表、日历和提醒设置', Icon: AlarmClock, target: 'reminders' },
      { label: 'AI管家', description: '解释护理问题、整理变化；不诊断、不改药', Icon: Bot, tab: 'ai' },
      { label: '长期健康档案', description: '查询每次记录与连续趋势', Icon: History, tab: 'monitor' },
    ],
  },
  {
    id: 'medical', title: '检查与专病', description: '报告、饮食和专病护理工具', Icon: Stethoscope, tone: 'blue',
    items: [
      { label: '检查与出院资料', description: '上传并查询化验单、出院单和复查结果', Icon: FileText, target: 'report' },
      { label: '胰岛素与血糖记录', description: '记录医生处方剂量、注射时间和血糖', Icon: Syringe, target: 'insulin' },
      { label: '粮食标签核对', description: '拍摄包装和营养标签，辅助护理核对', Icon: Camera, target: 'food' },
      { label: '慢病护理知识', description: '查询已审核知识和资料来源', Icon: Sparkles, tab: 'knowledge' },
      { label: '专病试点中心', description: '病例入组、医生审核和复诊结果闭环', Icon: Target, target: 'disease-pilot' },
    ],
  },
  {
    id: 'hospital', title: '医院与就医', description: '找医院、授权协同和紧急就医', Icon: Hospital, tone: 'red',
    items: [
      { label: '医院护理协同', description: '向授权医院提交家庭记录和复诊资料', Icon: Stethoscope, target: 'care-network' },
      { label: '按病情匹配医院', description: '按地区、专长和真实服务能力查找医院', Icon: Building2, target: 'hospital-match' },
      { label: '24小时急症就医', description: '查看已核验的急诊能力和接诊状态', Icon: AlertTriangle, target: 'emergency-hospital' },
      { label: '帮助与问题反馈', description: '提交使用问题并查询处理状态', Icon: HelpCircle, target: 'support' },
    ],
  },
  {
    id: 'services', title: '档案与服务', description: '宠物档案、设备、商城和系统工具', Icon: LayoutGrid, tone: 'amber',
    items: [
      { label: '宠物健康档案', description: '查看、切换或新增宠物档案', Icon: PawPrint, tab: 'profile' },
      { label: '编辑宠物资料', description: '更新基础信息、疾病、医院和医生', Icon: Settings2, target: 'settings' },
      { label: '身份与数据授权', description: '管理宠主、医院和医生的数据权限', Icon: LockKeyhole, target: 'roles' },
      { label: '智能设备', description: '登记和连接真实健康监测设备', Icon: Bluetooth, target: 'hardware' },
      { label: '护理用品商城', description: '查看开发者真实发布的商品', Icon: ShoppingBag, tab: 'marketplace' },
      { label: '导出健康报告', description: '导出当前宠物已保存的真实记录', Icon: FileText, action: 'export' },
      { label: '宠馨智系统入口', description: '返回宠主端、医生端和管理后台总入口', Icon: UserRound, action: 'portal' },
    ],
  },
];

export function OwnerFeatureHub({ setTab }: { setTab: (tab: Tab) => void }) {
  const [selected, setSelected] = useState<GroupId | null>(null);
  const current = groups.find((group) => group.id === selected) || null;

  useEffect(() => {
    const saved = window.localStorage.getItem('petcare-feature-group');
    if (groups.some((group) => group.id === saved)) setSelected(saved as GroupId);
  }, []);

  function open(item: FeatureItem) {
    if (item.tab) { setTab(item.tab); return; }
    if (item.target) { navigateToFeature(item.target); return; }
    if (item.action === 'export') { window.dispatchEvent(new Event('petcare:export-health-report')); return; }
    if (item.action === 'portal') window.location.href = 'portal.html';
  }

  function choose(group: GroupId) {
    window.localStorage.setItem('petcare-feature-group', group);
    setSelected(group);
  }

  if (current) return <div className="owner-feature-hub">
    <button className="feature-back" onClick={() => setSelected(null)}><ArrowLeft size={17}/>全部功能</button>
    <header className={`feature-group-head ${current.tone}`}><span><current.Icon size={23}/></span><div><h1>{current.title}</h1><p>{current.description}</p></div></header>
    <div className="feature-item-list">{current.items.map((item) => <button key={item.label} onClick={() => open(item)} className="feature-item-row"><span className={`feature-item-icon ${current.tone}`}><item.Icon size={20}/></span><span className="min-w-0 flex-1"><b>{item.label}</b><small>{item.description}</small></span><ChevronRight size={17}/></button>)}</div>
  </div>;

  return <div className="owner-feature-hub">
    <header className="feature-hub-title"><h1>全部功能</h1><p>先选要做的事情，再进入对应页面；不再把所有表单堆在首页。</p></header>
    <div className="feature-group-grid">{groups.map((group) => <button key={group.id} onClick={() => choose(group.id)} className={`feature-group-card ${group.tone}`}><span className="feature-group-icon"><group.Icon size={23}/></span><span className="min-w-0 flex-1"><b>{group.title}</b><small>{group.description}</small><em>{group.items.map((item) => item.label).slice(0, 3).join(' · ')}等</em></span><ChevronRight size={18}/></button>)}</div>
  </div>;
}
