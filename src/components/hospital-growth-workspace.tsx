'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Building2, CheckCircle2, FileWarning, Megaphone, PhoneCall, RadioTower, Save, ShieldAlert } from 'lucide-react';
import {
  HOSPITAL_DIRECTORY_UPDATED_EVENT,
  loadHospitalDirectory,
  submitHospitalDirectoryEntry,
  submitHospitalPromotion,
  updateHospitalEmergencyAvailability,
  type HospitalDirectoryEntry,
  type HospitalEmergencyCapability,
  type HospitalEmergencyLiveState,
} from '@/lib/hospital-directory';

const CURRENT_PROFILE_KEY = 'petcare-current-hospital-directory-id';
const fieldClass = 'mt-1.5 w-full rounded-xl border border-[#d8e3dd] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4d8b6d]';
const splitList = (value: string) => [...new Set(value.split(/[，,、\n]/).map(item => item.trim()).filter(Boolean))];

type ProfileForm = {
  name: string;
  legalEntityName: string;
  licenseNo: string;
  licenseScope: string;
  licenseExpiresOn: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  businessHours: string;
  introduction: string;
  supportedSpecies: Array<'cat' | 'dog'>;
  specialties: string;
  specialtyEvidence: string;
  diseaseCapabilities: string;
  serviceCapabilities: string;
  equipmentCapabilities: string;
  emergencyCapability: HospitalEmergencyCapability;
  priceNote: string;
};

const emptyForm: ProfileForm = {
  name: '', legalEntityName: '', licenseNo: '', licenseScope: '', licenseExpiresOn: '', city: '', district: '', address: '', phone: '', businessHours: '', introduction: '', supportedSpecies: ['cat', 'dog'], specialties: '', specialtyEvidence: '', diseaseCapabilities: '', serviceCapabilities: '', equipmentCapabilities: '', emergencyCapability: 'none', priceNote: '',
};

function toForm(entry?: HospitalDirectoryEntry): ProfileForm {
  if (!entry) return emptyForm;
  return {
    name: entry.name,
    legalEntityName: entry.legalEntityName || '',
    licenseNo: entry.animalDiagnosisLicenseNo || '',
    licenseScope: entry.licenseScope || '',
    licenseExpiresOn: entry.licenseExpiresOn || '',
    city: entry.city,
    district: entry.district,
    address: entry.address || '',
    phone: entry.contactPhone || '',
    businessHours: entry.businessHours || '',
    introduction: entry.introduction || '',
    supportedSpecies: entry.supportedSpecies.length ? entry.supportedSpecies : ['cat', 'dog'],
    specialties: entry.specialties.join('、'),
    specialtyEvidence: entry.specialtyEvidence || '',
    diseaseCapabilities: entry.diseaseCapabilities.join('、'),
    serviceCapabilities: entry.serviceCapabilities.join('、'),
    equipmentCapabilities: entry.equipmentCapabilities.join('、'),
    emergencyCapability: entry.emergencyCapability,
    priceNote: entry.priceNote || '',
  };
}

export function HospitalGrowthWorkspace() {
  const [entry, setEntry] = useState<HospitalDirectoryEntry | undefined>();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [notice, setNotice] = useState('');
  const [ad, setAd] = useState({ title: '', disclosure: '', targetDistrict: '' });
  const [emergency, setEmergency] = useState<{ state: HospitalEmergencyLiveState; onDutyPhone: string; capabilities: string; note: string; validMinutes: number }>({ state: 'accepting', onDutyPhone: '', capabilities: '', note: '', validMinutes: 60 });

  useEffect(() => {
    const reload = () => {
      const id = window.localStorage.getItem(CURRENT_PROFILE_KEY);
      const current = loadHospitalDirectory().find(item => item.id === id);
      setEntry(current);
      if (current) {
        setForm(toForm(current));
        setAd({
          title: current.promotion?.title || '',
          disclosure: current.promotion?.disclosure || '',
          targetDistrict: current.promotion?.targetDistrict || '',
        });
        if (current.emergencyLiveStatus) setEmergency({
          state: current.emergencyLiveStatus.state,
          onDutyPhone: current.emergencyLiveStatus.onDutyPhone || current.contactPhone || '',
          capabilities: current.emergencyLiveStatus.capabilities.join('、'),
          note: current.emergencyLiveStatus.note || '',
          validMinutes: 60,
        });
      }
    };
    reload();
    window.addEventListener(HOSPITAL_DIRECTORY_UPDATED_EVENT, reload);
    return () => window.removeEventListener(HOSPITAL_DIRECTORY_UPDATED_EVENT, reload);
  }, []);

  const missing = useMemo(() => [
    !form.name && '医院展示名',
    !form.legalEntityName && '证照主体名称',
    !form.licenseNo && '动物诊疗许可证号',
    !form.city && '城市',
    !form.district && '区/县',
    !form.address && '详细地址',
    !form.phone && '联系电话',
    form.supportedSpecies.length === 0 && '接诊动物',
    splitList(form.specialties).length === 0 && '擅长方向',
    splitList(form.diseaseCapabilities).length === 0 && '病种能力',
  ].filter(Boolean) as string[], [form]);

  const update = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm(current => ({ ...current, [key]: value }));
  const toggleSpecies = (species: 'cat' | 'dog') => update('supportedSpecies', form.supportedSpecies.includes(species) ? form.supportedSpecies.filter(item => item !== species) : [...form.supportedSpecies, species]);

  const save = () => {
    if (missing.length) {
      setNotice(`请先补全：${missing.join('、')}。`);
      return;
    }
    const saved = submitHospitalDirectoryEntry({
      id: entry?.id,
      name: form.name,
      legalEntityName: form.legalEntityName,
      animalDiagnosisLicenseNo: form.licenseNo,
      licenseScope: form.licenseScope,
      licenseExpiresOn: form.licenseExpiresOn,
      city: form.city,
      district: form.district,
      address: form.address,
      contactPhone: form.phone,
      businessHours: form.businessHours,
      introduction: form.introduction,
      supportedSpecies: form.supportedSpecies,
      specialties: splitList(form.specialties),
      specialtyEvidence: form.specialtyEvidence,
      diseaseCapabilities: splitList(form.diseaseCapabilities),
      serviceCapabilities: splitList(form.serviceCapabilities),
      equipmentCapabilities: splitList(form.equipmentCapabilities),
      emergencyCapability: form.emergencyCapability,
      priceNote: form.priceNote,
    });
    window.localStorage.setItem(CURRENT_PROFILE_KEY, saved.id);
    setEntry(saved);
    setNotice('资料已存档并进入待审核。通过前不会出现在宠主端；已审核资料修改后也会重新待审。');
  };

  const saveEmergencyStatus = () => {
    if (!entry || entry.sourceStatus !== 'verified' || entry.emergencyCapability === 'none') {
      setNotice('请先完成医院资料审核，并核验医院具有急诊能力。');
      return;
    }
    if (emergency.state !== 'unavailable' && !emergency.onDutyPhone.trim()) {
      setNotice('更新为可接诊或接诊紧张时，必须填写当班急诊联系电话。');
      return;
    }
    const saved = updateHospitalEmergencyAvailability(entry.id, {
      state: emergency.state,
      onDutyPhone: emergency.onDutyPhone,
      capabilities: splitList(emergency.capabilities),
      note: emergency.note,
      validMinutes: emergency.validMinutes,
    });
    if (!saved) {
      setNotice('实时接诊状态没有保存，请检查医院审核状态和急诊能力。');
      return;
    }
    setEntry(saved);
    const validUntil = saved.emergencyLiveStatus ? new Date(saved.emergencyLiveStatus.validUntil).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    setNotice('实时急诊状态已保存，有效至 ' + validUntil + '。到期后宠主端会自动改为“实时状态未确认”。');
  };

  const requestAd = () => {
    if (!entry || entry.sourceStatus !== 'verified') {
      setNotice('只有已核验的医院才能提交广告申请。');
      return;
    }
    if (!ad.title.trim() || !ad.disclosure.trim()) {
      setNotice('请填写广告标题和展示文案。');
      return;
    }
    const saved = submitHospitalPromotion(entry.id, {
      title: ad.title,
      disclosure: ad.disclosure,
      targetDistrict: ad.targetDistrict,
      startsAt: undefined,
      endsAt: undefined,
      label: '广告',
    });
    setEntry(saved || entry);
    setNotice('广告申请已保存为待审核。当前静态版不扣费、不投放、不产生曝光数据。');
  };

  return <section className="mt-5 space-y-5" id="hospital-public-profile">
    <div className="rounded-2xl border border-[#cadfd4] bg-white shadow-[0_12px_36px_rgba(39,73,57,.05)]">
      <div className="flex flex-col gap-3 border-b border-[#e3ebe6] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e4f2ea] text-[#287052]"><Building2 size={21}/></span><div><h2 className="font-bold">医院公开资料与匹配能力</h2><p className="mt-1 text-sm leading-6 text-[#687970]">填写真实信息，审核后才可供宠主按地区和病种匹配。</p></div></div>
        <StatusBadge entry={entry}/>
      </div>
      <div className="p-5">
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><FileWarning className="mr-1.5 inline" size={15}/>当前只保存到本机用于流程验收。正式上线必须上传证照原件、平台人工核验并留存审核日志；在此填写证号不等于已通过资质审核。</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="医院展示名 *" value={form.name} onChange={value => update('name', value)}/>
          <Field label="营业执照主体名称 *" value={form.legalEntityName} onChange={value => update('legalEntityName', value)}/>
          <Field label="动物诊疗许可证号 *" value={form.licenseNo} onChange={value => update('licenseNo', value)}/>
          <Field label="许可诊疗范围" value={form.licenseScope} onChange={value => update('licenseScope', value)}/>
          <Field label="许可证有效期" value={form.licenseExpiresOn} type="date" onChange={value => update('licenseExpiresOn', value)}/>
          <Field label="联系电话 *" value={form.phone} type="tel" onChange={value => update('phone', value)}/>
          <Field label="城市 *" value={form.city} onChange={value => update('city', value)}/>
          <Field label="区 / 县 *" value={form.district} onChange={value => update('district', value)}/>
          <Field label="详细地址 *" value={form.address} onChange={value => update('address', value)}/>
          <Field label="营业时间" value={form.businessHours} placeholder="例如：09:00-21:00" onChange={value => update('businessHours', value)}/>
          <Field label="擅长方向 *" value={form.specialties} placeholder="用顿号分隔" onChange={value => update('specialties', value)}/>
          <Field label="病种能力 *" value={form.diseaseCapabilities} placeholder="例如：猫CKD、犬糖尿病" onChange={value => update('diseaseCapabilities', value)}/>
          <Field label="可提供服务" value={form.serviceCapabilities} placeholder="例如：腹部超声、住院" onChange={value => update('serviceCapabilities', value)}/>
          <Field label="设备能力" value={form.equipmentCapabilities} placeholder="例如：血液分析仪、透析" onChange={value => update('equipmentCapabilities', value)}/>
          <Field label="擅长能力证据" value={form.specialtyEvidence} placeholder="专科医生、设备、可核验培训等" onChange={value => update('specialtyEvidence', value)}/>
          <Field label="价格说明（不做低价保证）" value={form.priceNote} onChange={value => update('priceNote', value)}/>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-[#40564b]">接诊动物 *<div className="mt-2 flex gap-2">{([['cat','猫'],['dog','犬']] as const).map(([id,label]) => <button key={id} type="button" onClick={() => toggleSpecies(id)} className={`rounded-xl px-4 py-2 text-sm ${form.supportedSpecies.includes(id) ? 'bg-[#287656] font-semibold text-white' : 'border bg-white text-[#607168]'}`}>{label}</button>)}</div></label>
          <label className="text-sm font-semibold text-[#40564b]">急诊能力<select value={form.emergencyCapability} onChange={event => update('emergencyCapability', event.target.value as HospitalEmergencyCapability)} className={fieldClass}><option value="none">无登记急诊能力</option><option value="business_hours">营业时段接急诊</option><option value="24_hours">24 小时急诊</option></select></label>
        </div>
        <label className="mt-4 block text-sm font-semibold text-[#40564b]">医院介绍<textarea value={form.introduction} onChange={event => update('introduction', event.target.value)} rows={3} className={fieldClass} placeholder="只填写可以核验的特色，不写‘最好’‘第一’‘包治’等表述。"/></label>
        {missing.length > 0 && <p className="mt-4 text-xs leading-5 text-[#9a641c]">待补全：{missing.join('、')}</p>}
        <button onClick={save} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#287656] px-5 py-3 text-sm font-semibold text-white"><Save size={17}/>保存并提交审核</button>
      </div>
    </div>

    <div className="rounded-2xl border border-[#efb9b2] bg-[#fff7f5] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fbded9] text-[#a44840]"><RadioTower size={20}/></span><div><h2 className="font-bold text-[#713b36]">当前急诊接诊状态</h2><p className="mt-1 text-sm leading-6 text-[#805b56]">登记急诊能力不等于此刻能接诊。每个班次都要更新，过期后系统自动取消“当前可接”标识。</p></div></div>
        <span className="shrink-0 rounded-full border border-[#edc3bd] bg-white px-3 py-1.5 text-xs font-semibold text-[#8c4b44]">{entry?.emergencyLiveStatus ? liveStatusText(entry.emergencyLiveStatus.state) : '尚未更新'}</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold text-[#604a46]">此刻接诊状态<select value={emergency.state} onChange={event => setEmergency(current => ({ ...current, state: event.target.value as HospitalEmergencyLiveState }))} className={fieldClass}><option value="accepting">当前可接急诊</option><option value="limited">接诊紧张，必须先电话确认</option><option value="unavailable">暂时无法接诊</option></select></label>
        <Field label="当班急诊电话" value={emergency.onDutyPhone} type="tel" placeholder={entry?.contactPhone || '可接诊时必填'} onChange={value => setEmergency(current => ({ ...current, onDutyPhone: value }))}/>
        <label className="text-sm font-semibold text-[#604a46]">本次状态有效时间<select value={emergency.validMinutes} onChange={event => setEmergency(current => ({ ...current, validMinutes: Number(event.target.value) }))} className={fieldClass}><option value={30}>30分钟</option><option value={60}>60分钟</option><option value={120}>120分钟</option></select></label>
        <Field label="当班可处理能力" value={emergency.capabilities} placeholder="例如：吸氧、影像、住院" onChange={value => setEmergency(current => ({ ...current, capabilities: value }))}/>
      </div>
      <label className="mt-4 block text-sm font-semibold text-[#604a46]">当班限制或说明<textarea value={emergency.note} onChange={event => setEmergency(current => ({ ...current, note: event.target.value }))} rows={2} className={fieldClass} placeholder="例如：目前仅接猫犬；重症住院笼位紧张，请先电话描述情况。"/></label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={saveEmergencyStatus} disabled={!entry || entry.sourceStatus !== 'verified' || entry.emergencyCapability === 'none'} className="inline-flex items-center gap-2 rounded-xl bg-[#a54840] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#cbb4b0]"><PhoneCall size={17}/>更新本班接诊状态</button>
        <p className="text-xs leading-5 text-[#8a625d]">{entry?.emergencyLiveStatus ? '上次更新：' + new Date(entry.emergencyLiveStatus.updatedAt).toLocaleString('zh-CN', { hour12: false }) : '仅已核验且登记急诊能力的医院可公开状态。'}</p>
      </div>
    </div>

    <div className="rounded-2xl border border-[#e8d3a8] bg-[#fffaf0] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ffedc8] text-[#8b5e19]"><Megaphone size={20}/></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-[#59451f]">地区曝光申请</h2><span className="rounded border border-[#9b6b20] bg-white px-2 py-0.5 text-[11px] font-bold text-[#754b0d]">广告</span></div><p className="mt-1 text-sm leading-6 text-[#776747]">广告位与自然匹配结果分开；付费不增加匹配分，急诊模式不展示广告。</p></div></div><AdStatus entry={entry}/></div>
      <div className="mt-4 grid gap-4 md:grid-cols-3"><Field label="广告标题" value={ad.title} placeholder="例如：猫肾病复诊服务" onChange={value => setAd(current => ({ ...current, title: value }))}/><Field label="投放区域（选填）" value={ad.targetDistrict} placeholder={entry?.district || '例如：朝阳区'} onChange={value => setAd(current => ({ ...current, targetDistrict: value }))}/><Field label="展示文案" value={ad.disclosure} placeholder="只写可核验的服务特色" onChange={value => setAd(current => ({ ...current, disclosure: value }))}/></div>
      <div className="mt-4 rounded-xl bg-white p-3 text-xs leading-5 text-[#806a46]"><ShieldAlert className="mr-1.5 inline" size={15}/>禁止“全市第一”“最好”“100% 治愈”“包治”、虚构评价/预约量，以及超出许可范围的宣传。</div>
      <button onClick={requestAd} disabled={!entry || entry.sourceStatus !== 'verified'} className="mt-4 rounded-xl bg-[#8c641f] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#c9bda8]">提交广告审核</button>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{['曝光','查看详情','电话/导航','预约请求','到院核销'].map(label => <div key={label} className="rounded-xl border border-[#ead9b7] bg-white p-3"><b className="text-lg text-[#76613a]">—</b><p className="mt-1 text-[11px] text-[#8a7958]">{label}</p></div>)}</div>
      <p className="mt-2 text-[11px] leading-5 text-[#8a7958]">投放漏斗将由服务器防刷接口记录；当前不用本机点击数充当真实效果。</p>
    </div>

    {notice && <div className="rounded-xl border border-[#cfe1d7] bg-[#f3faf6] p-4 text-sm leading-6 text-[#426451]"><CheckCircle2 className="mr-2 inline text-[#287656]" size={17}/>{notice}</div>}
  </section>;
}

function Field({ label, value, onChange, placeholder = '', type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="text-sm font-semibold text-[#40564b]">{label}<input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={fieldClass}/></label>;
}

function StatusBadge({ entry }: { entry?: HospitalDirectoryEntry }) {
  if (!entry) return <span className="rounded-full bg-[#f0f2f1] px-3 py-1.5 text-xs font-semibold text-[#697970]">未提交</span>;
  if (entry.sourceStatus === 'verified') return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800"><BadgeCheck size={14}/>公开资料已审核</span>;
  if (entry.sourceStatus === 'rejected') return <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800">未通过：{entry.rejectionReason || '请修改后再提交'}</span>;
  return <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">待平台审核</span>;
}

function AdStatus({ entry }: { entry?: HospitalDirectoryEntry }) {
  const status = entry?.promotion?.reviewStatus;
  const label = status === 'approved' ? '已审核投放' : status === 'pending' ? '待审核' : status === 'rejected' ? '未通过' : status === 'paused' ? '已暂停' : '未申请';
  return <span className="shrink-0 rounded-full border border-[#e3c98f] bg-white px-3 py-1.5 text-xs font-semibold text-[#7d5d20]">{label}</span>;
}

function liveStatusText(state: HospitalEmergencyLiveState) {
  return state === 'accepting' ? '当前可接急诊' : state === 'limited' ? '接诊紧张' : '暂时无法接诊';
}
