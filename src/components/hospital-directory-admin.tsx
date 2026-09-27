'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Ban, Building2, CheckCircle2, Megaphone, PauseCircle, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import {
  HOSPITAL_DIRECTORY_UPDATED_EVENT,
  loadHospitalDirectory,
  reviewHospitalDirectoryEntry,
  reviewHospitalPromotion,
  setHospitalPromotion,
  type HospitalDirectoryEntry,
} from '@/lib/hospital-directory';

type Filter = 'all' | 'self_submitted' | 'verified' | 'rejected';
const statusText = { self_submitted: '待审核', verified: '已核验', rejected: '未通过' } as const;

export function HospitalDirectoryAdmin() {
  const [entries, setEntries] = useState<HospitalDirectoryEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');

  const reload = () => setEntries(loadHospitalDirectory());
  useEffect(() => {
    reload();
    window.addEventListener(HOSPITAL_DIRECTORY_UPDATED_EVENT, reload);
    return () => window.removeEventListener(HOSPITAL_DIRECTORY_UPDATED_EVENT, reload);
  }, []);

  const shown = useMemo(() => entries.filter(item => filter === 'all' || item.sourceStatus === filter), [entries, filter]);
  const pendingProfiles = entries.filter(item => item.sourceStatus === 'self_submitted').length;
  const pendingAds = entries.filter(item => item.promotion?.reviewStatus === 'pending').length;

  const reviewProfile = (entry: HospitalDirectoryEntry, approved: boolean) => {
    if (approved && (!entry.legalEntityName || !entry.animalDiagnosisLicenseNo || !entry.address || !entry.specialties.length || !entry.supportedSpecies.length)) {
      setNotice('不能通过：证照主体、动物诊疗许可证号、地址、接诊动物和擅长方向不完整。');
      return;
    }
    if (!approved && !note.trim()) {
      setNotice('驳回时请填写可执行的原因。');
      return;
    }
    reviewHospitalDirectoryEntry(entry.id, { status: approved ? 'verified' : 'rejected', reason: approved ? undefined : note.trim(), reviewerNote: note.trim() || undefined });
    setNote('');
    setNotice(approved ? `已将“${entry.name}”标记为已核验，宠主端可查询。` : `已驳回“${entry.name}”，宠主端不会展示。`);
  };

  const reviewAd = (entry: HospitalDirectoryEntry, approved: boolean) => {
    if (entry.sourceStatus !== 'verified') {
      setNotice('医院公开资料未核验，不能通过广告。');
      return;
    }
    if (!approved && !note.trim()) {
      setNotice('驳回广告时请填写原因。');
      return;
    }
    reviewHospitalPromotion(entry.id, approved, note.trim() || undefined);
    setNote('');
    setNotice(approved ? '广告已通过本机流程审核。正式投放仍需合同、计费、合规终审和服务器发布。' : '广告已驳回，不会展示。');
  };

  const pauseAd = (entry: HospitalDirectoryEntry) => {
    if (!entry.promotion) return;
    setHospitalPromotion(entry.id, { ...entry.promotion, active: false, reviewStatus: 'paused', reviewNote: note.trim() || '平台暂停' });
    setNote('');
    setNotice(`已暂停“${entry.name}”的广告展示。`);
  };

  return <section id="hospital-directory-review" className="mt-6 scroll-mt-20 rounded-2xl border border-[#dfe7e2] bg-white p-5 shadow-[0_12px_36px_rgba(39,73,57,.06)]">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2"><ShieldCheck size={19} className="text-[#2b7054]"/><h2 className="font-bold">医院目录与广告审核</h2></div><p className="mt-1.5 text-sm leading-6 text-[#6d7d74]">先核验机构资质和特色证据，再决定是否对宠主公开；广告独立审核。</p></div>
      <div className="flex gap-2"><span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900">医院待审 {pendingProfiles}</span><span className="rounded-full bg-[#fff0d4] px-3 py-1.5 text-xs font-semibold text-[#8a5e19]">广告待审 {pendingAds}</span><button onClick={reload} title="刷新" className="grid size-8 place-items-center rounded-full border"><RefreshCw size={14}/></button></div>
    </div>

    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><Ban className="mr-1.5 inline" size={15}/>这是本机流程原型，点击“通过”不代表真实资质核验。正式版必须核对证照原件、发证机关、有效期、诊疗范围与分支地址，并保留操作日志。</div>

    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl bg-[#f3f7f5] p-3 text-xs leading-5"><b className="block text-[#2b7054]">1. 打开一条待审资料</b><span className="text-[#6d7d74]">点击医院名称右侧“审核”展开详情。</span></div>
      <div className="rounded-xl bg-[#f3f7f5] p-3 text-xs leading-5"><b className="block text-[#2b7054]">2. 核验证照与能力</b><span className="text-[#6d7d74]">对照原件、有效期、地址和服务证据填写备注。</span></div>
      <div className="rounded-xl bg-[#f3f7f5] p-3 text-xs leading-5"><b className="block text-[#2b7054]">3. 决定公开状态</b><span className="text-[#6d7d74]">通过后宠主可查；驳回或撤销后立即隐藏。</span></div>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">{([['all','全部'],['self_submitted','待审核'],['verified','已核验'],['rejected','未通过']] as const).map(([id,label]) => <button key={id} onClick={() => setFilter(id)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${filter === id ? 'bg-[#287656] text-white' : 'border bg-white text-[#607168]'}`}>{label}</button>)}</div>

    {shown.length === 0 ? <div className="mt-5 grid min-h-44 place-items-center rounded-xl border border-dashed text-center text-sm text-[#718078]"><div><Building2 className="mx-auto mb-3 text-[#8ca698]"/><b className="block text-[#40574b]">没有可审核的医院资料</b><span className="mt-1 block">医院端保存真实资料后会出现在这里。</span></div></div> : <div className="mt-5 space-y-3">{shown.map(entry => {
      const open = openId === entry.id;
      return <article key={entry.id} className="overflow-hidden rounded-xl border border-[#e0e8e3]">
        <button onClick={() => { setOpenId(open ? null : entry.id); setNote(''); }} className="flex w-full items-start gap-3 p-4 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f3ec] text-[#287052]"><Building2 size={19}/></span>
          <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><b>{entry.name}</b><Status status={entry.sourceStatus}/>{entry.promotion && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0d4] px-2 py-1 text-[11px] font-semibold text-[#8a5e19]"><Megaphone size={12}/>广告 {adStatus(entry)}</span>}</span><small className="mt-1 block text-[#74827a]">{entry.city} · {entry.district} · {entry.address || '地址未填'}</small></span>
          <span className="text-xs text-[#718078]">{open ? '收起' : '审核'}</span>
        </button>
        {open && <div className="border-t bg-[#fafcfb] p-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <Fact label="证照主体" value={entry.legalEntityName}/><Fact label="动物诊疗许可证号" value={entry.animalDiagnosisLicenseNo}/><Fact label="许可范围 / 有效期" value={[entry.licenseScope, entry.licenseExpiresOn].filter(Boolean).join(' · ')}/><Fact label="联系方式" value={entry.contactPhone}/><Fact label="营业时间" value={entry.businessHours}/><Fact label="急诊能力" value={entry.emergencyCapability}/><Fact label="擅长方向" value={entry.specialties.join('、')}/><Fact label="病种能力" value={entry.diseaseCapabilities.join('、')}/><Fact label="能力证据" value={entry.specialtyEvidence}/>
          </div>
          <label className="mt-4 block text-xs font-semibold text-[#52675b]">审核备注 / 驳回原因<textarea value={note} onChange={event => setNote(event.target.value)} rows={2} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" placeholder="记录核验依据或需要补齐的材料"/></label>
          {entry.sourceStatus !== 'verified' && <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => reviewProfile(entry, true)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#287656] px-4 py-2.5 text-sm font-semibold text-white"><CheckCircle2 size={16}/>通过并公开</button><button onClick={() => reviewProfile(entry, false)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700"><XCircle size={16}/>驳回资料</button></div>}
          {entry.sourceStatus === 'verified' && <div className="mt-3 flex flex-wrap items-center gap-2"><p className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-800"><BadgeCheck size={15}/>宠主端仅能看到此类已核验记录</p><button onClick={() => reviewProfile(entry, false)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700">撤销公开并退回修改</button><span className="text-[11px] text-[#7a8981]">撤销时请先填写原因，确认后宠主端立即隐藏。</span></div>}

          {entry.promotion && <div className="mt-5 rounded-xl border border-[#e6ce9b] bg-[#fffaf0] p-4">
            <div className="flex flex-wrap items-center gap-2"><b className="text-sm">广告素材审核</b><span className="rounded border border-[#9b6b20] bg-white px-2 py-0.5 text-[11px] font-bold text-[#754b0d]">广告</span></div>
            <p className="mt-2 text-sm font-semibold text-[#604b25]">{entry.promotion.title || '未填标题'}</p><p className="mt-1 text-xs leading-5 text-[#776747]">{entry.promotion.disclosure || '未填文案'}</p><p className="mt-2 text-[11px] text-[#8a7650]">投放区域：{entry.city}{entry.promotion.targetDistrict ? ` · ${entry.promotion.targetDistrict}` : ' · 全市'}；自然匹配排序不受广告影响。</p>
            {entry.promotion.reviewStatus === 'pending' && <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => reviewAd(entry, true)} className="rounded-xl bg-[#8c641f] px-4 py-2 text-xs font-semibold text-white">通过广告</button><button onClick={() => reviewAd(entry, false)} className="rounded-xl border border-[#d5b878] bg-white px-4 py-2 text-xs font-semibold text-[#79591d]">驳回广告</button></div>}
            {entry.promotion.active && <button onClick={() => pauseAd(entry)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#d5b878] bg-white px-4 py-2 text-xs font-semibold text-[#79591d]"><PauseCircle size={14}/>暂停广告</button>}
          </div>}
        </div>}
      </article>;
    })}</div>}
    {notice && <div className="mt-4 rounded-xl bg-[#eef7f2] p-3 text-sm leading-6 text-[#426451]">{notice}</div>}
  </section>;
}

function Fact({ label, value }: { label: string; value?: string }) { return <div className="rounded-lg border bg-white p-3"><span className="text-[11px] text-[#7b8981]">{label}</span><p className="mt-1 break-words font-medium text-[#40564b]">{value || '未填写'}</p></div>; }
function Status({ status }: { status: HospitalDirectoryEntry['sourceStatus'] }) { const tone = status === 'verified' ? 'bg-green-100 text-green-800' : status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'; return <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tone}`}>{statusText[status]}</span>; }
function adStatus(entry: HospitalDirectoryEntry) { const status = entry.promotion?.reviewStatus; return status === 'approved' ? '已投放' : status === 'pending' ? '待审' : status === 'rejected' ? '已驳回' : status === 'paused' ? '已暂停' : '草稿'; }
