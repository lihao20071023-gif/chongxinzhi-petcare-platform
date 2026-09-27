'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  Clock3,
  MapPin,
  Megaphone,
  Phone,
  Search,
  ShieldCheck,
  Siren,
  Stethoscope,
} from 'lucide-react';
import {
  HOSPITAL_DIRECTORY_STORAGE_KEY,
  HOSPITAL_DIRECTORY_UPDATED_EVENT,
  getActivePromotedHospitals,
  getEffectiveEmergencyAvailability,
  getVerifiedHospitals,
  loadHospitalDirectory,
  matchVerifiedHospitals,
  type HospitalDirectoryEntry,
  type HospitalDistancePreference,
} from '@/lib/hospital-directory';
import { usePetProfile } from './pet-profile-context';
import { Card, PageTitle, Pill, SectionTitle } from './ui';

const COMMON_NEEDS = ['慢性肾病（CKD）', '糖尿病', '心脏病', '肿瘤', '皮肤病', '骨科/外科', '神经科', '口腔', '眼科', '消化系统疾病'];
const selectClass = 'mt-2 w-full rounded-xl border border-[#dce5df] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-[#5a9276]';

export function HospitalMatchWorkspace({ back, initialEmergency = false }: { back: () => void; initialEmergency?: boolean }) {
  const { profile } = usePetProfile();
  const [entries, setEntries] = useState<HospitalDirectoryEntry[]>([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [careNeed, setCareNeed] = useState('');
  const [emergencyRequired, setEmergencyRequired] = useState(initialEmergency);
  const [acuteSituation, setAcuteSituation] = useState('');
  const [distancePreference, setDistancePreference] = useState<HospitalDistancePreference>('same_district_first');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const seededPetId = useRef<string | null>(null);

  useEffect(() => {
    const reload = () => setEntries(loadHospitalDirectory());
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === HOSPITAL_DIRECTORY_STORAGE_KEY) reload();
    };
    reload();
    window.addEventListener('storage', onStorage);
    window.addEventListener(HOSPITAL_DIRECTORY_UPDATED_EVENT, reload);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(HOSPITAL_DIRECTORY_UPDATED_EVENT, reload);
    };
  }, []);

  useEffect(() => {
    if (seededPetId.current === profile.id) return;
    seededPetId.current = profile.id;
    const disease = (profile.disease || '').trim();
    setCareNeed(disease && disease !== '未填写' ? disease : '');
  }, [profile.id, profile.disease]);

  const verified = useMemo(() => getVerifiedHospitals(entries), [entries]);
  const cities = useMemo(() => unique(verified.map(item => item.city)), [verified]);
  const districts = useMemo(
    () => unique(verified.filter(item => !city || item.city === city).map(item => item.district)),
    [verified, city],
  );
  const needs = useMemo(
    () => unique([...COMMON_NEEDS, ...verified.flatMap(item => [...item.diseaseCapabilities, ...item.specialties])]),
    [verified],
  );
  const matches = useMemo(() => matchVerifiedHospitals({
    city,
    district,
    careNeed,
    species: profile.species,
    emergencyRequired,
    distancePreference,
  }, entries), [city, district, careNeed, profile.species, emergencyRequired, distancePreference, entries]);
  // Emergency mode deliberately has no paid exposure.
  const ads = useMemo(
    () => emergencyRequired ? [] : getActivePromotedHospitals(city, district, entries),
    [city, district, entries, emergencyRequired],
  );

  const copyContact = async (hospital: HospitalDirectoryEntry) => {
    const content = [hospital.name, hospital.address, hospital.contactPhone, hospital.businessHours].filter(Boolean).join('\n');
    if (!content || !navigator.clipboard) {
      setNotice('当前浏览器不能复制，请手动记录医院联系资料。');
      return;
    }
    await navigator.clipboard.writeText(content);
    setNotice('已复制“' + hospital.name + '”由医院提交并经平台审核的联系资料。');
  };

  const copyEmergencyCard = async (hospital: HospitalDirectoryEntry) => {
    const live = getEffectiveEmergencyAvailability(hospital);
    const phone = live.state !== 'unknown' ? live.status.onDutyPhone || hospital.contactPhone : hospital.contactPhone;
    const content = [
      '宠馨智 · 急诊沟通卡（由宠物主人主动提供）',
      '生成时间：' + new Date().toLocaleString('zh-CN', { hour12: false }),
      '目标医院：' + hospital.name,
      '联系电话：' + (phone || '医院未提供'),
      '',
      '宠物：' + profile.name + '；' + (profile.species === 'cat' ? '猫' : '犬') + '；' + profile.breed,
      '体重：' + (profile.weight || '未填') + 'kg；已记录疾病：' + (profile.disease || '未填') + '；阶段：' + (profile.stage || '未填'),
      '当前突发情况：' + (acuteSituation.trim() || '宠物主人尚未填写'),
      '',
      '请医院电话确认：当前是否能接诊、是否具备所需人员/设备、预计等待情况。',
      '说明：这不是诊断书，平台不能保证床位、接诊或治疗结果。',
    ].join('\n');
    if (!navigator.clipboard) {
      setNotice('当前浏览器不能复制，请直接电话说明宠物情况。');
      return;
    }
    await navigator.clipboard.writeText(content);
    setNotice('急诊沟通卡已复制。请先电话确认医院此刻能够接诊，再出发。');
  };

  return <div className="space-y-5">
    <PageTitle
      title={emergencyRequired ? '24小时急诊匹配' : '就医匹配'}
      subtitle={emergencyRequired ? '优先查找此刻更新接诊状态、具备相应能力的已核验医院' : '从已入驻并完成审核的医院中，按病种能力和你的就医条件查找'}
      action={<button onClick={back} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm"><ArrowLeft size={16}/>返回</button>}
    />

    <Card className="border-[#cfe2d7] bg-[#f4faf6] p-4 text-sm leading-6 text-[#52675b]">
      <ShieldCheck className="mr-2 inline text-[#287656]" size={18}/>
      <b>真实信息规则：</b>宠主端只显示状态为“已审核”的医院。医院自助提交、待审核或未通过的资料不会出现；系统不会从网络抓取医院，也不会生成评分、评价或虚构距离。
    </Card>

    <Card className="p-5 sm:p-6">
      <SectionTitle>告诉我们这次要解决什么</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold text-[#354d41]">
          城市 <span className="text-[#b14d46]">*</span>
          <input list="hospital-city-options" value={city} onChange={event => { setCity(event.target.value); setDistrict(''); setExpanded(null); }} placeholder="手动输入或选择城市" className={selectClass}/>
          <datalist id="hospital-city-options">{cities.map(item => <option key={item} value={item}/>)}</datalist>
        </label>
        <label className="text-sm font-semibold text-[#354d41]">
          区域（选填）
          <input list="hospital-district-options" value={district} onChange={event => { setDistrict(event.target.value); setExpanded(null); }} placeholder="例如：朝阳区" className={selectClass}/>
          <datalist id="hospital-district-options">{districts.map(item => <option key={item} value={item}/>)}</datalist>
        </label>
        <label className="text-sm font-semibold text-[#354d41]">
          就医需求 / 病种（选填）
          <input list="hospital-need-options" value={careNeed} onChange={event => { setCareNeed(event.target.value); setExpanded(null); }} placeholder="例如：慢性肾病 CKD" className={selectClass}/>
          <datalist id="hospital-need-options">{needs.map(item => <option key={item} value={item}/>)}</datalist>
        </label>
        <label className="text-sm font-semibold text-[#354d41]">
          距离偏好
          <span className="relative block">
            <select value={distancePreference} onChange={event => setDistancePreference(event.target.value as HospitalDistancePreference)} className={selectClass + ' appearance-none pr-9'}>
              <option value="same_district_first">同区优先（不计算公里数）</option>
              <option value="citywide">全市均可</option>
            </select>
            <ChevronDown className="pointer-events-none absolute bottom-3.5 right-3 text-[#6f8077]" size={16}/>
          </span>
        </label>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#f1f6f3] p-3 text-xs leading-5 text-[#64766c]"><MapPin className="mt-0.5 shrink-0 text-[#3d795d]" size={15}/><span>现在可直接手动选地区。正式地图接入后，只在你主动点击“查找附近医院”时单独申请定位；拒绝定位仍可手动搜索。</span></p>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#e0e8e3] bg-[#f8faf9] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Siren className={emergencyRequired ? 'mt-0.5 shrink-0 text-[#b4463f]' : 'mt-0.5 shrink-0 text-[#698078]'} size={20}/>
          <div>
            <b className="text-sm">这次是否需要急诊能力？</b>
            <p className="mt-1 text-xs leading-5 text-[#708078]">开启后只保留登记有急诊能力的医院，并完全隐藏所有广告。</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setEmergencyRequired(false)} className={'rounded-xl px-4 py-2 text-sm font-semibold ' + (!emergencyRequired ? 'bg-[#287656] text-white' : 'border bg-white text-[#61736a]')}>普通就医</button>
          <button onClick={() => setEmergencyRequired(true)} className={'rounded-xl px-4 py-2 text-sm font-semibold ' + (emergencyRequired ? 'bg-[#b4463f] text-white' : 'border bg-white text-[#61736a]')}>需要急诊</button>
        </div>
      </div>
    </Card>

    {emergencyRequired && <Card className="border-[#edb5af] bg-[#fff4f2] p-4 text-sm leading-6 text-[#8a4741]">
      <AlertTriangle className="mr-2 inline" size={18}/>
      <b>紧急情况不要等待平台结果：</b>呼吸困难、抽搐、无法站立、意识异常、无尿或排尿困难、持续大量出血时，请立即电话联系附近具备急诊能力的动物医院。登记信息不等于此刻一定有床位或医生，出发前务必确认。
    </Card>}

    {emergencyRequired && <Card className="border-[#edc9c4] p-5">
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fde8e5] text-[#a94740]"><ClipboardCopy size={19}/></span><div className="min-w-0 flex-1"><b>出发前急诊沟通卡</b><p className="mt-1 text-xs leading-5 text-[#718078]">写清楚当前表现和开始时间，复制后电话告知医院。不要在这里等待AI诊断。</p></div></div>
      <textarea value={acuteSituation} onChange={event => setAcuteSituation(event.target.value)} rows={3} placeholder="例如：今晚22:10开始反复呕吐，近2小时无尿，精神明显变差；是否接触毒物不确定。" className="mt-3 w-full rounded-xl border border-[#e2ceca] px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#b75b52]"/>
      <p className="mt-2 text-xs leading-5 text-[#8a5b55]">暂不要填写宠物主人身份证、家庭住址等无关个人信息。只有你主动复制并告知医院时，资料才会离开当前页面。</p>
    </Card>}

    {!emergencyRequired && ads.length > 0 && <section className="rounded-2xl border-2 border-[#e8c98e] bg-[#fffaf0] p-4 sm:p-5" aria-label="医院广告">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#ffedc8] text-[#8b5e19]"><Megaphone size={19}/></span>
          <div><div className="flex items-center gap-2"><h2 className="font-bold text-[#59451f]">医院曝光位</h2><span className="rounded border border-[#9b6b20] bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#754b0d]">广告</span></div><p className="mt-1 text-xs text-[#806d4d]">这是付费商业展示，不代表医疗优先级、口碑或匹配结论。</p></div>
        </div>
        <span className="text-xs text-[#917a53]">急诊模式下不展示广告</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{ads.map(hospital => <AdCard key={hospital.id} hospital={hospital}/>)}</div>
    </section>}

    <section>
      <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#254536]"><Stethoscope className="text-[#287656]" size={20}/>按能力适配排序</h2>
          <p className="mt-1 text-xs leading-5 text-[#718078]">这不是“全城医院排行榜”。顺序只根据本次条件和已审核的能力资料计算，广告状态不参与。</p>
        </div>
        {city && <Pill>{matches.length} 家符合当前条件</Pill>}
      </div>

      {verified.length === 0
        ? <EmptyState title="暂无已核验合作医院" detail="医院提交资料并通过开发者后台审核后才会出现在这里。当前不会用网络信息或演示医院填充空白。"/>
        : !city.trim()
          ? <EmptyState title="请先输入城市" detail="你可以手动输入城市，也可以从已审核医院所在城市中选择。系统不会在未选择地区时猜测你的位置。"/>
          : matches.length === 0
            ? <EmptyState
                title={emergencyRequired ? '当前没有符合条件的已核验急诊医院' : '当前没有同时满足这些条件的已核验医院'}
                detail={emergencyRequired ? '请直接联系本地急救渠道或扩大地区范围，不要等待平台新增医院。' : '可尝试改为全市范围或减少筛选条件；系统不会为了显示结果而编造能力。'}
              />
            : <div className="space-y-3">{matches.map(({ hospital, reasons, limitations }, index) =>
                <Card key={hospital.id} className="overflow-hidden">
                  <button onClick={() => setExpanded(expanded === hospital.id ? null : hospital.id)} className="w-full p-5 text-left sm:p-6">
                    <div className="flex items-start gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e5f2ea] text-[#287052]"><Building2 size={23}/></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <b className="text-base text-[#29483a]">{hospital.name}</b>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f4ec] px-2 py-1 text-[11px] font-semibold text-[#286c50]"><BadgeCheck size={13}/>资料已审核</span>
                          {emergencyLabel(hospital) && <span className="rounded-full bg-[#fff0ed] px-2 py-1 text-[11px] font-semibold text-[#a54b44]">{emergencyLabel(hospital)}</span>}
                          {emergencyRequired && <EmergencyLiveBadge hospital={hospital}/>}
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-[#65766d]"><MapPin size={15}/>{hospital.city} · {hospital.district}{hospital.address ? ' · ' + hospital.address : ''}</p>
                        <div className="mt-3 flex flex-wrap gap-2">{[...hospital.specialties, ...hospital.diseaseCapabilities].slice(0, 5).map(item => <span key={item} className="rounded-lg bg-[#f1f5f3] px-2.5 py-1 text-xs text-[#53685c]">{item}</span>)}</div>
                        <div className="mt-4 rounded-xl bg-[#f5f9f7] p-3">
                          <b className="text-xs text-[#315f4a]">为什么出现在这里</b>
                          <ul className="mt-1 space-y-1 text-xs leading-5 text-[#62746a]">{reasons.map(reason => <li key={reason} className="flex gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-[#3b8061]" size={14}/><span>{reason}</span></li>)}</ul>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-[#60756a]">{index + 1}</span>
                    </div>
                  </button>
                  {expanded === hospital.id && <div className="border-t border-[#e3eae6] bg-[#fbfcfb] p-5 sm:px-6">
                    {hospital.introduction && <p className="mb-4 text-sm leading-6 text-[#5f7067]">{hospital.introduction}</p>}
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <Info icon={Clock3} label="营业时间（医院登记）" value={hospital.businessHours || '未提供'}/>
                      <Info icon={Phone} label={emergencyRequired ? '当班/医院联系电话' : '联系电话（医院登记）'} value={emergencyPhone(hospital) || '未提供'}/>
                    </div>
                    {hospital.serviceCapabilities.length > 0 && <div className="mt-4"><b className="text-xs text-[#52675b]">已审核服务能力</b><div className="mt-2 flex flex-wrap gap-2">{hospital.serviceCapabilities.map(item => <span key={item} className="rounded-lg border bg-white px-2.5 py-1 text-xs">{item}</span>)}</div></div>}
                    {limitations.length > 0 && <div className="mt-4 rounded-xl bg-[#fff8ea] p-3 text-xs leading-5 text-[#806a46]">{limitations.join('；')}。</div>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {emergencyPhone(hospital) && <a href={'tel:' + emergencyPhone(hospital)} className={'rounded-xl px-4 py-2.5 text-sm font-semibold text-white ' + (emergencyRequired ? 'bg-[#ad4b44]' : 'bg-[#287656]')}><Phone className="mr-2 inline" size={15}/>{emergencyRequired ? '立即电话确认' : '电话确认'}</a>}
                      {emergencyRequired && <button onClick={() => copyEmergencyCard(hospital)} className="rounded-xl border border-[#e0b6b1] bg-white px-4 py-2.5 text-sm font-semibold text-[#984941]"><ClipboardCopy className="mr-2 inline" size={15}/>复制急诊沟通卡</button>}
                      <button onClick={() => copyContact(hospital)} className="rounded-xl border border-[#bfd1c7] bg-white px-4 py-2.5 text-sm font-semibold text-[#286d51]">复制联系资料</button>
                    </div>
                  </div>}
                </Card>,
              )}</div>}
    </section>

    {notice && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#264b3a] px-4 py-3 text-sm text-white shadow-xl">{notice}</div>}
  </div>;
}

function AdCard({ hospital }: { hospital: HospitalDirectoryEntry }) {
  return <Card className="border-[#ead6ad] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><b className="text-sm">{hospital.name}</b><span className="rounded border border-[#9b6b20] px-1.5 py-0.5 text-[10px] font-bold text-[#754b0d]">广告</span></div>
        <p className="mt-1 text-xs text-[#74664c]">{hospital.city} · {hospital.district}</p>
      </div>
      <BadgeCheck className="shrink-0 text-[#397858]" size={17}/>
    </div>
    <p className="mt-3 text-xs leading-5 text-[#6e634e]">{hospital.promotion?.disclosure || hospital.promotion?.label || '该医院购买了本区域曝光服务。'}</p>
    <p className="mt-2 text-[11px] leading-5 text-[#8d7853]">仅展示已审核医院；广告不代表疗效、口碑或更适合你的宠物。</p>
    {hospital.contactPhone && <a href={'tel:' + hospital.contactPhone} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#d6bd8d] bg-white px-3 py-2 text-xs font-semibold text-[#765017]"><Phone size={14}/>联系医院</a>}
  </Card>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <Card className="grid min-h-56 place-items-center border-dashed p-8 text-center">
    <div><Search className="mx-auto text-[#83a492]" size={30}/><b className="mt-4 block text-[#395548]">{title}</b><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#718078]">{detail}</p></div>
  </Card>;
}

function Info({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return <div className="flex gap-3 rounded-xl border bg-white p-3"><Icon className="mt-0.5 shrink-0 text-[#3c795d]" size={17}/><div><p className="text-xs text-[#7a8880]">{label}</p><p className="mt-1 font-medium text-[#40564b]">{value}</p></div></div>;
}

function emergencyLabel(hospital: HospitalDirectoryEntry) {
  if (hospital.emergencyCapability === '24_hours') return '登记 24 小时急诊';
  if (hospital.emergencyCapability === 'business_hours') return '登记营业时段急诊';
  return '';
}

function emergencyPhone(hospital: HospitalDirectoryEntry) {
  const live = getEffectiveEmergencyAvailability(hospital);
  return live.state !== 'unknown' ? live.status.onDutyPhone || hospital.contactPhone : hospital.contactPhone;
}

function EmergencyLiveBadge({ hospital }: { hospital: HospitalDirectoryEntry }) {
  const live = getEffectiveEmergencyAvailability(hospital);
  if (live.state === 'accepting') return <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-800">医院刚更新：可接急诊</span>;
  if (live.state === 'limited') return <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">医院刚更新：接诊能力有限</span>;
  return <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">实时状态未确认</span>;
}

function unique(values: string[]) {
  return [...new Set(values.map(item => item.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}
