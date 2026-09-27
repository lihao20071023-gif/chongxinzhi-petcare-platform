'use client';

import { Activity, BookOpenCheck, Building2, ClipboardCheck, FileHeart, UsersRound } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardData } from '@/lib/types';
import { EmptyState, LoadingState, SectionHeader } from './ui';

function Metric({ label, value, unit, icon: Icon, hint }: { label: string; value: number; unit?: string; icon: typeof UsersRound; hint?: string }) {
  return <article className="metric"><div className="metric-icon"><Icon size={21} /></div><div><span>{label}</span><strong>{value.toLocaleString('zh-CN')}{unit}</strong>{hint ? <small title={hint}>口径说明可查看</small> : <small>来自真实数据库</small>}</div></article>;
}

export function DashboardView({ data, loading, error, onNavigate }: { data: DashboardData | null; loading: boolean; error: string; onNavigate: (view: 'knowledge' | 'hospitals') => void }) {
  if (loading) return <LoadingState />;
  if (error || !data) return <EmptyState title="暂时无法读取数据看板" description={error || '请检查API和数据库配置。'} />;
  return <>
    <SectionHeader title="数据看板" description="这里只展示真实业务数据，不使用演示数字。" />
    <section className="metrics-row">
      <Metric label="用户数" value={data.metrics.users} icon={UsersRound} />
      <Metric label="日活" value={data.metrics.dailyActiveUsers} icon={Activity} hint={data.metricDefinitions.dailyActiveUsers} />
      <Metric label="病例数" value={data.metrics.cases} icon={FileHeart} />
      <Metric label="打卡完成率" value={data.metrics.checkinCompletionRate} unit="%" icon={ClipboardCheck} hint={data.metricDefinitions.checkinCompletionRate} />
    </section>
    <section className="dashboard-grid">
      <article className="chart-panel">
        <div className="panel-title"><div><h3>近14天活跃用户趋势</h3><p>按每天产生认证API访问的去重用户统计</p></div></div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.activitySeries} margin={{ top: 12, right: 16, bottom: 0, left: -20 }}>
              <defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0c9a78" stopOpacity={0.2} /><stop offset="100%" stopColor="#0c9a78" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#e6eeeb" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tick={{ fontSize: 12, fill: '#73847f' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#73847f' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [`${value}人`, '活跃用户']} labelFormatter={(label) => `日期 ${label}`} />
              <Area type="monotone" dataKey="value" stroke="#0c9a78" strokeWidth={2.5} fill="url(#activityFill)" activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>
      <article className="pending-panel">
        <div className="panel-title"><div><h3>待处理事项</h3><p>优先完成资质与内容审核</p></div></div>
        <button onClick={() => onNavigate('hospitals')}><span className="pending-icon"><Building2 /></span><span><strong>待审核医院</strong><small>医生与医院入驻申请</small></span><b>{data.pending.hospitals}</b></button>
        <button onClick={() => onNavigate('knowledge')}><span className="pending-icon"><BookOpenCheck /></span><span><strong>知识库待复核</strong><small>草稿和待审核条目</small></span><b>{data.pending.knowledge}</b></button>
      </article>
    </section>
  </>;
}
