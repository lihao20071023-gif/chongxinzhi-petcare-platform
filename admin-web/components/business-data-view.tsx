'use client';

import { useMemo } from 'react';
import { Activity, Archive, ClipboardCheck, FileHeart, FileText, LockKeyhole, PawPrint, ShieldCheck, Stethoscope, UserRoundCheck } from 'lucide-react';
import { collectLocalBusinessData } from '@/lib/local-admin';
import { SectionHeader, Status, TableShell } from './ui';

const domains = [
  { name: '账号与角色', source: '微信授权/管理员创建', purpose: '登录、角色路由和权限判断', access: '本人；平台管理员按职责', required: true },
  { name: '宠物健康档案', source: '宠主填写/医院授权同步', purpose: '个体化护理、病例关联和连续随访', access: '宠主；获得授权的本院医生', required: true },
  { name: '医生签署护理方案', source: '主治医生创建和签署', purpose: '生成每日任务并保留版本', access: '宠主；本院医生；审计管理员', required: true },
  { name: '每日打卡与症状', source: '宠主/家庭成员/设备', purpose: '比较7/14/30天趋势和发现风险', access: '宠主；获得授权的本院医生', required: true },
  { name: '检查报告与出院资料', source: '宠主上传/医院同步', purpose: '复查对比和护理效果验证', access: '宠主；授权医生', required: false },
  { name: '授权与撤回记录', source: '宠主主动操作', purpose: '决定医院可查看的数据范围', access: '宠主；平台审计', required: true },
  { name: '操作与审核日志', source: '系统自动记录', purpose: '追溯方案、消息、审核和数据修改', access: '平台管理员；合规审计', required: true }
];

function Metric({ icon: Icon, label, value }: { icon: typeof PawPrint; label: string; value: number }) {
  return <article className="business-metric"><Icon size={19}/><span>{label}</span><strong>{value}</strong></article>;
}

export function BusinessDataView({ localMode }: { localMode: boolean }) {
  const data = useMemo(() => collectLocalBusinessData(), []);
  return <>
    <SectionHeader title="业务与数据" description="明确收集什么、为什么收集、谁能查看；没有明确用途的数据不采集。" />
    <div className="mode-notice"><Archive size={18}/><div><strong>{localMode ? '当前显示本机真实记录' : '当前页面尚未连接云端统计接口'}</strong><p>{localMode ? '这些数字来自当前浏览器内宠主端、医生端已经保存的记录，不是演示数字。正式部署后由统一API读取数据库。' : '云端上线后，本页必须改由管理API返回脱敏汇总，浏览器不得直接读取全库。'}</p></div></div>
    <section className="business-metrics">
      <Metric icon={UserRoundCheck} label="本机宠主" value={data.owners}/><Metric icon={PawPrint} label="宠物档案" value={data.petCount}/><Metric icon={Activity} label="健康打卡" value={data.checkins}/><Metric icon={FileText} label="症状记录" value={data.symptomLogs}/><Metric icon={FileHeart} label="检查报告" value={data.reports}/><Metric icon={Stethoscope} label="签署方案" value={data.carePlans}/><Metric icon={ClipboardCheck} label="任务完成" value={data.completions}/><Metric icon={ShieldCheck} label="风险提醒" value={data.alerts}/>
    </section>
    <section className="data-section"><header><LockKeyhole/><div><h3>数据收集清单与权限</h3><p>必要数据、可选数据和访问范围必须对宠主清晰可见。</p></div></header><TableShell><table><thead><tr><th>数据类别</th><th>数据来源</th><th>使用目的</th><th>可查看角色</th><th>必要性</th></tr></thead><tbody>{domains.map((item) => <tr key={item.name}><td><strong>{item.name}</strong></td><td>{item.source}</td><td>{item.purpose}</td><td>{item.access}</td><td><Status value={item.required ? 'required' : 'optional'}/></td></tr>)}</tbody></table></TableShell></section>
    <section className="data-section"><header><PawPrint/><div><h3>当前本机宠物档案</h3><p>只列出当前浏览器真实保存的数据，不填充示例宠物。</p></div></header>{data.pets.length ? <TableShell><table><thead><tr><th>宠物</th><th>物种</th><th>疾病</th><th>阶段</th><th>医院授权</th></tr></thead><tbody>{data.pets.map((pet) => <tr key={pet.id}><td><strong>{pet.name}</strong><small>{pet.id}</small></td><td>{pet.species}</td><td>{pet.disease}</td><td>{pet.stage}</td><td><Status value={pet.authorization}/></td></tr>)}</tbody></table></TableShell> : <div className="data-empty">当前浏览器还没有宠物档案。</div>}</section>
  </>;
}
