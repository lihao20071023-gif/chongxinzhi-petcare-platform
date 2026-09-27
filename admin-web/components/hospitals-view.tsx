'use client';

import { useMemo, useState } from 'react';
import { Building2, Check, Eye, Search, X } from 'lucide-react';
import type { Hospital, HospitalApplication } from '@/lib/types';
import { Button, Drawer, EmptyState, Field, LoadingState, SectionHeader, Status, TableShell } from './ui';

export function HospitalsView({ items, applications, loading, error, onReviewApplication, onUpdateHospital }: { items: Hospital[]; applications: HospitalApplication[]; loading: boolean; error: string; onReviewApplication: (id: string, approve: boolean, note: string) => Promise<void>; onUpdateHospital: (id: string, value: { status?: string; moderationStatus?: string; isPublished?: boolean; note?: string }) => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'applications' | 'hospitals'>('applications');
  const [application, setApplication] = useState<HospitalApplication | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = applications.filter((item) => item.status === 'pending');
  const filteredHospitals = useMemo(() => items.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query.toLowerCase())), [items, query]);

  async function review(approve: boolean) {
    if (!application) return;
    setBusy(true);
    try { await onReviewApplication(application.id, approve, note); setApplication(null); setNote(''); } finally { setBusy(false); }
  }

  return <>
    <SectionHeader title="医院管理" description="审核真实资质、查看入驻数据；未审核医院不会出现在宠主端。" />
    <div className="subnav"><button className={tab === 'applications' ? 'active' : ''} onClick={() => setTab('applications')}>入驻审核 <b>{pending.length}</b></button><button className={tab === 'hospitals' ? 'active' : ''} onClick={() => setTab('hospitals')}>医院列表 <b>{items.length}</b></button></div>
    {tab === 'hospitals' ? <div className="toolbar"><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索医院名称、城市或专长" /></label></div> : null}
    {loading ? <LoadingState /> : error ? <EmptyState title="医院数据读取失败" description={error} /> : tab === 'applications' ? (
      !pending.length ? <EmptyState title="当前没有待审核申请" description="新的医生或医院入驻申请会显示在这里。" /> : <TableShell><table><thead><tr><th>申请机构</th><th>申请人</th><th>执业证号</th><th>联系电话</th><th>申请时间</th><th>状态</th><th>操作</th></tr></thead><tbody>{pending.map((item) => <tr key={item.id}><td><strong>{item.organization_name}</strong><small>{item.requested_hospital?.address || '选择已有医院'}</small></td><td>{item.legal_name}</td><td>{item.license_no}</td><td>{item.phone}</td><td>{new Date(item.created_at).toLocaleString('zh-CN')}</td><td><Status value={item.status} /></td><td><div className="row-actions"><button onClick={() => { setApplication(item); setNote(''); }}><Eye size={15} />审核</button></div></td></tr>)}</tbody></table></TableShell>
    ) : !filteredHospitals.length ? <EmptyState title="还没有医院数据" description="医院通过入驻审核后会显示在这里。" /> : <TableShell><table><thead><tr><th>医院</th><th>地区</th><th>擅长方向</th><th>医生</th><th>病例</th><th>公开资料</th><th>状态</th><th>操作</th></tr></thead><tbody>{filteredHospitals.map((item) => <tr key={item.id}><td><strong>{item.profile?.display_name || item.name}</strong><small>{item.code}</small></td><td>{item.profile ? `${item.profile.city} ${item.profile.district}` : (item.address || '未完善')}</td><td>{item.profile?.specialties?.join('、') || '未填写'}</td><td>{item.doctorCount}</td><td>{item.caseCount}</td><td><Status value={item.profile?.moderation_status || 'self_submitted'} /></td><td><Status value={item.status} /></td><td><div className="row-actions"><button onClick={() => { setHospital(item); setNote(''); }}><Eye size={15} />查看</button></div></td></tr>)}</tbody></table></TableShell>}
    {application ? <Drawer title="审核入驻申请" description="审核执业兽医资格和医院归属，所有决定都会记录。" onClose={() => setApplication(null)} footer={<><Button variant="danger" disabled={busy} onClick={() => review(false)}><X size={16} />不通过</Button><Button disabled={busy} onClick={() => review(true)}><Check size={16} />通过并绑定</Button></>}>
      <div className="detail-list"><div><span>机构名称</span><strong>{application.organization_name}</strong></div><div><span>申请医生</span><strong>{application.legal_name}</strong></div><div><span>执业证号</span><strong>{application.license_no}</strong></div><div><span>联系电话</span><strong>{application.phone}</strong></div><div><span>新建医院地址</span><strong>{application.requested_hospital?.address || '绑定已有医院'}</strong></div><div><span>证明文件</span><strong>{application.credential_paths?.length ? `${application.credential_paths.length}份（需在私有存储中核验）` : '未上传'}</strong></div></div>
      <Field label="审核意见"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="写明通过依据或驳回原因" /></Field>
    </Drawer> : null}
    {hospital ? <Drawer title={hospital.profile?.display_name || hospital.name} description="查看真实入驻与使用数据，控制公开资料状态。" onClose={() => setHospital(null)} footer={<Button variant="secondary" onClick={() => setHospital(null)}>关闭</Button>}>
      <div className="hospital-hero"><span><Building2 /></span><div><h3>{hospital.name}</h3><p>{hospital.address || '尚未完善地址'}</p></div></div>
      <div className="detail-list"><div><span>医生数量</span><strong>{hospital.doctorCount}</strong></div><div><span>病例数量</span><strong>{hospital.caseCount}</strong></div><div><span>医院状态</span><Status value={hospital.status} /></div><div><span>资质审核</span><Status value={hospital.profile?.moderation_status || 'self_submitted'} /></div><div><span>诊疗许可证</span><strong>{hospital.profile?.animal_diagnosis_license_no || '尚未提交公开资料'}</strong></div></div>
      <Field label="状态调整说明"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="写明核验依据或暂停原因" /></Field>
      <div className="drawer-actions-row"><Button variant="secondary" onClick={() => onUpdateHospital(hospital.id, { status: 'suspended', moderationStatus: 'suspended', note })}>暂停展示</Button><Button onClick={() => onUpdateHospital(hospital.id, { status: 'active', moderationStatus: 'verified', isPublished: true, note })}>核验并发布</Button></div>
    </Drawer> : null}
  </>;
}
