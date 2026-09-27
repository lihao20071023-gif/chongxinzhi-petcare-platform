'use client';

import { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Database, LockKeyhole, Save, ShieldCheck } from 'lucide-react';
import type { SystemSetting } from '@/lib/types';
import { Button, EmptyState, Field, LoadingState, SectionHeader } from './ui';

type Safety = { noDiagnosis: boolean; noMedicationChange: boolean; urgentEscalation: boolean; requireKnowledgeSources: boolean; message: string };
type Reminders = { missedTaskHours: number; consecutiveMissedTasks: number; weightChangePercent: number; waterChangePercent: number; vomitingUrgentCount: number; orangeReviewHours: number; yellowReviewHours: number; doctorReviewUrgent: boolean };
const safetyDefault: Safety = { noDiagnosis: true, noMedicationChange: true, urgentEscalation: true, requireKnowledgeSources: true, message: 'AI不独立诊断、不新增或调整药物；异常情况必须建议联系兽医或及时就医。' };
const reminderDefault: Reminders = { missedTaskHours: 2, consecutiveMissedTasks: 2, weightChangePercent: 5, waterChangePercent: 50, vomitingUrgentCount: 3, orangeReviewHours: 4, yellowReviewHours: 24, doctorReviewUrgent: true };

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description: string }) {
  return <label className="toggle-row"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>;
}

function LockedRule({ label, description }: { label: string; description: string }) {
  return <div className="locked-rule"><span><LockKeyhole size={17}/></span><div><strong>{label}</strong><small>{description}</small></div><b><CheckCircle2 size={15}/>强制生效</b></div>;
}

export function SettingsView({ items, loading, error, onSave }: { items: SystemSetting[]; loading: boolean; error: string; onSave: (safety: Safety, reminders: Reminders) => Promise<void> }) {
  const [safety, setSafety] = useState<Safety>(safetyDefault);
  const [reminders, setReminders] = useState<Reminders>(reminderDefault);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const safetyValue = items.find((item) => item.key === 'ai_safety_rules')?.value as Partial<Safety> | undefined;
    const reminderValue = items.find((item) => item.key === 'reminder_rules')?.value as Partial<Reminders> | undefined;
    setSafety({ ...safetyDefault, ...safetyValue, noDiagnosis: true, noMedicationChange: true, urgentEscalation: true, requireKnowledgeSources: true });
    setReminders({ ...reminderDefault, ...reminderValue });
  }, [items]);
  async function save() { setBusy(true); try { await onSave({ ...safety, noDiagnosis: true, noMedicationChange: true, urgentEscalation: true, requireKnowledgeSources: true }, reminders); } finally { setBusy(false); } }
  if (loading) return <LoadingState />;
  if (error) return <EmptyState title="规则读取失败" description={error} />;
  return <>
    <SectionHeader title="规则与提醒" description="安全底线不可关闭；这里只允许调整提醒时间、处理时限和趋势阈值。" action={<Button onClick={save} disabled={busy}><Save size={17}/>{busy ? '保存中…' : '保存可调参数'}</Button>} />
    <div className="settings-layout">
      <section className="settings-panel"><header><span><ShieldCheck /></span><div><h3>AI安全底线</h3><p>这是产品责任边界，不是普通功能开关。</p></div></header>
        <LockedRule label="AI不得独立诊断" description="只解释资料、整理趋势和进行风险分流。"/>
        <LockedRule label="AI不得增药、停药或改剂量" description="用药变化必须来自有资质的主治医生。"/>
        <LockedRule label="危险信号必须优先建议就医" description="红色风险不等待AI或线上医生回复。"/>
        <LockedRule label="医疗回答必须引用已审核知识" description="没有可靠依据时必须明确说资料不足。"/>
        <p className="mandatory-copy">固定提示：{safety.message}</p>
      </section>
      <section className="settings-panel"><header><span><BellRing /></span><div><h3>护理提醒与处理时限</h3><p>阈值触发复核提醒，不用于确诊或自动修改方案。</p></div></header>
        <div className="number-grid">
          <Field label="任务超时提醒（小时）"><input type="number" min="1" max="24" value={reminders.missedTaskHours} onChange={(e) => setReminders({ ...reminders, missedTaskHours: Number(e.target.value) })}/></Field>
          <Field label="连续漏打卡次数"><input type="number" min="1" max="10" value={reminders.consecutiveMissedTasks} onChange={(e) => setReminders({ ...reminders, consecutiveMissedTasks: Number(e.target.value) })}/></Field>
          <Field label="橙色风险复核（小时）"><input type="number" min="1" max="24" value={reminders.orangeReviewHours} onChange={(e) => setReminders({ ...reminders, orangeReviewHours: Number(e.target.value) })}/></Field>
          <Field label="黄色风险复核（小时）"><input type="number" min="1" max="72" value={reminders.yellowReviewHours} onChange={(e) => setReminders({ ...reminders, yellowReviewHours: Number(e.target.value) })}/></Field>
          <Field label="体重变化提醒（%）"><input type="number" min="1" max="30" value={reminders.weightChangePercent} onChange={(e) => setReminders({ ...reminders, weightChangePercent: Number(e.target.value) })}/></Field>
          <Field label="饮水变化提醒（%）"><input type="number" min="10" max="200" value={reminders.waterChangePercent} onChange={(e) => setReminders({ ...reminders, waterChangePercent: Number(e.target.value) })}/></Field>
          <Field label="呕吐紧急提醒次数"><input type="number" min="1" max="10" value={reminders.vomitingUrgentCount} onChange={(e) => setReminders({ ...reminders, vomitingUrgentCount: Number(e.target.value) })}/></Field>
        </div>
        <Toggle checked={reminders.doctorReviewUrgent} onChange={(value) => setReminders({ ...reminders, doctorReviewUrgent: value })} label="风险提醒进入医生复核队列" description="AI只生成摘要，医生查看原始记录后决策。"/>
      </section>
      <section className="settings-panel settings-wide"><header><span><Database /></span><div><h3>数据权限底线</h3><p>保护宠主、宠物、医院和医生，不能通过前端配置关闭。</p></div></header><div className="governance-grid">
        <LockedRule label="宠主授权后医院才能查看病例" description="医院只能查看本院获得授权的宠物资料。"/>
        <LockedRule label="撤回授权后停止新增访问" description="历史医疗记录按诊疗留存要求处理。"/>
        <LockedRule label="方案、审核和修改必须留痕" description="记录操作者、时间、对象和修改原因。"/>
        <LockedRule label="不得出售宠物原始健康数据" description="合作只能使用获得授权且满足用途限制的数据。"/>
      </div></section>
    </div>
  </>;
}
