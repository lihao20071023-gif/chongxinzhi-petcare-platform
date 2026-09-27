'use client';
import { useEffect,useState } from 'react';
import { Activity, AlarmClock, AlertTriangle, Archive, ArrowLeft, Bell, Bluetooth, CalendarDays, Camera, ChartNoAxesCombined, Check, CheckCircle2, ChevronRight, CircleGauge, ClipboardCheck, Clock3, Droplets, FileText, Headphones, HeartPulse, History, Hospital, MessageCircle, PawPrint, Pill as PillIcon, Plus, RefreshCw, Send, Settings2, ShieldAlert, ShieldCheck, ShoppingBag, Sparkles, Stethoscope, Syringe, Target, UserRound, Utensils, Weight } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { articles, homeCareData, inventory, labReports, medications, symptomLogs, weightData } from '@/lib/mock-data';
import type { PersistedState } from '@/lib/local-store';
import { Card, IconBox, PageTitle, Pill, SectionTitle } from './ui';
import type { Tab } from './app-shell';
import { buildCareContext, careAssistantSystemPrompt, generateCareReply, type ReplyKind } from '@/lib/ai-care-assistant';
import { runClinicalCarePipeline, type CarePipelineResult } from '@/lib/clinical-care-pipeline';
import { runCareWorkflow } from '@/lib/care-workflow';
import { professionalCareKnowledge, type KnowledgeModule } from '@/lib/knowledge-base';
import { usePetProfile } from './pet-profile-context';
import { MedicalReportWorkspace } from './medical-report-workspace';
import { FoodPhotoWorkspace, InsulinWorkspace } from './advanced-care-tools';
import { SupportWorkspace } from './support-workspace';
import { royalCaninProducts } from '@/lib/royal-canin-prescription-knowledge';
import { analyzeMonitoringCycle,loadDailyCheckins,saveDailyCheckin,type DailyCheckIn,type MonitoringCycle } from '@/lib/daily-checkins';
import { ProfileServiceSettings } from './profile-service-settings';
import { CarePlanWorkspace } from './care-plan-workspace';
import { DeviceWorkspace } from './device-workspace';
import { navigateToFeature } from '@/lib/app-navigation';
import { HealthMonitorWorkspace } from './health-monitor-workspace';
import { AccountRoleCenter } from './account-role-center';
import { CareNetworkWorkspace } from './care-network-workspace';
import { DiseasePilotWorkspace } from './disease-pilot-workspace';
import { HospitalMatchWorkspace } from './hospital-match-workspace';
import { getActiveCarePlan,loadTaskCompletions,type SignedCarePlan,type TaskCompletion } from '@/lib/care-coordination';
import { CareLoopOverview } from './care-loop-overview';

type StateProps = { state: PersistedState; update: (next: PersistedState) => void; setTab: (tab: Tab) => void; openReminders: () => void };

function DashboardDense({setTab}:StateProps){
 const {profile:pet}=usePetProfile();const [checkins,setCheckins]=useState<DailyCheckIn[]>([]);const [checkinsReady,setCheckinsReady]=useState(false);const [signedPlan,setSignedPlan]=useState<SignedCarePlan|null>(null);const [reportCount,setReportCount]=useState(0);const [moreOpen,setMoreOpen]=useState(false);const [moduleConfig,setModuleConfig]=useState<Record<string,{enabled:boolean;label:string}>>({});
 useEffect(()=>{setCheckinsReady(false);setCheckins(loadDailyCheckins(pet.id));setCheckinsReady(true);setSignedPlan(getActiveCarePlan(pet.id));try{setReportCount(JSON.parse(localStorage.getItem(`petcare-medical-reports:${pet.id}`)||'[]').length);setModuleConfig(JSON.parse(localStorage.getItem('petcare-developer-module-config-v1')||'{}'))}catch{setReportCount(0);setModuleConfig({})}},[pet.id]);
 const today=checkins.find(x=>x.recordedAt.slice(0,10)===new Date().toISOString().slice(0,10));const trend=checkins.slice(0,7).reverse().filter(x=>x.weightKg!==null).map(x=>({date:new Date(x.recordedAt).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}),weight:x.weightKg}));
 const hospitalStatus=pet.careAuthorization==='verified'?'医院已验证连接':pet.hospital?`${pet.hospital} · 用户记录（未连接）`:'尚未填写医院';
 const diseaseText=(pet.disease||'').toLowerCase();const focus=diseaseText.includes('肾')||diseaseText.includes('ckd')?'CKD肾病':diseaseText.includes('糖尿')?'糖尿病':'慢病护理';
 const visible=(id:string)=>moduleConfig[id]?.enabled!==false;const label=(id:string,fallback:string)=>moduleConfig[id]?.label||fallback;
 const more=[
  ['knowledge','护理知识','查证慢病护理依据',Sparkles],['marketplace','护理用品','查看真实上架商品',ShoppingBag],['food','粮食标签核对','核对营养标签',Camera],['hardware','智能设备','连接真实监测设备',Bluetooth],['disease-pilot','专病试点','病例入组与复查闭环',Target],['profile','服务设置','医院、医生和账号设置',Settings2]
 ].filter(x=>visible(String(x[0])));
 return <div className="space-y-5"><section className="soft-grid relative overflow-hidden rounded-3xl border border-[#cfe7dc] bg-[#dff4ea] p-5 sm:p-7"><div className="relative z-10 flex items-center gap-4 sm:gap-6"><button onClick={()=>setTab('profile')} title="打开档案并更换宠物或头像" className="group relative size-24 shrink-0 overflow-hidden rounded-[28px] border-4 border-white bg-white shadow-lg sm:size-32">{pet.avatar?<img src={pet.avatar} alt={pet.name} className="size-full object-cover"/>:<span className="grid size-full place-items-center text-sm text-[#4c7160]">添加照片</span>}<span className="absolute inset-x-0 bottom-0 bg-[#245f48]/85 py-1.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">点击更换</span></button><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#3b775d]">{new Date().toLocaleDateString('zh-CN')} · 今天也一起照顾好它</p><h1 className="mt-2 truncate text-2xl font-bold text-[#193f30] sm:text-3xl">嗨，{pet.name}的家长</h1><p className="mt-2 text-sm leading-6 text-[#557366]">{pet.species==='cat'?'猫咪':'狗狗'} · {pet.breed} · {pet.weight||'未填写'}kg · BCS {pet.bcs||'未填写'}/9</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>setTab('monitor')} className="rounded-xl bg-[#287657] px-4 py-2.5 text-sm font-semibold text-white shadow-sm">记录今天</button><button onClick={()=>setTab('profile')} className="rounded-xl border border-white bg-white/80 px-4 py-2.5 text-sm font-semibold text-[#296a50]">切换宠物</button></div></div></div><div className="absolute -bottom-5 -right-2 select-none text-7xl opacity-10" aria-hidden>🐾</div></section>
 <CareLoopOverview pet={pet} checkins={checkins} recordsReady={checkinsReady} setTab={setTab} onPlanChange={setSignedPlan}/>
 <Card className="border-[#dce8e1] bg-white/85 p-4 text-sm leading-6 text-[#53675b]"><span className="mr-2 inline-block rounded-full bg-[#e5f3eb] px-2 py-0.5 text-xs font-semibold text-[#287052]">{focus}</span>{signedPlan?`${signedPlan.hospitalName} · ${signedPlan.doctorName}医生已签署护理方案 v${signedPlan.version}，当前有${signedPlan.tasks.length}项任务。`:'没有医生签署的方案也可以先记录基础状态；AI不会用通用模板冒充医嘱。'}</Card>
 <button onClick={()=>navigateToFeature('emergency-hospital')} className="flex w-full items-center gap-3 rounded-2xl border border-[#edb9b3] bg-[#fff5f3] p-4 text-left text-[#8f433d]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fbded9]"><AlertTriangle size={20}/></span><span className="min-w-0 flex-1"><b className="block">半夜突发危险情况？</b><small className="mt-1 block leading-5 text-[#875b56]">立即查找已核验的24小时急诊能力和医院最新接诊状态</small></span><ChevronRight className="shrink-0" size={19}/></button>
 <section><SectionTitle>今天只做这三件事</SectionTitle><div className="grid gap-3 md:grid-cols-3">
 {visible('care-plan')&&<button onClick={()=>setTab('care')} className="pet-action rounded-2xl border border-[#c9e2d5] bg-[#edf8f2] p-5 text-left"><div className="flex items-center justify-between"><IconBox icon={ClipboardCheck}/><Pill tone={signedPlan?'green':'amber'}>{signedPlan?`医生已签署 v${signedPlan.version}`:'等待医生方案'}</Pill></div><b className="mt-4 block text-lg">{label('care-plan','今日护理方案')}</b><p className="mt-2 text-sm leading-6 text-[#65776e]">{signedPlan?`${signedPlan.tasks.length}项经过医生确认的饮食、用药、监测和复查任务。`:'可以先记录健康状态；未签署前不会生成通用医嘱。'}</p><span className="mt-4 block text-sm font-semibold text-[#287052]">打开方案 →</span></button>}
 {visible('monitor')&&<button onClick={()=>setTab('monitor')} className="pet-action rounded-2xl border border-[#d5e4ef] bg-[#f1f7fb] p-5 text-left"><div className="flex items-center justify-between"><IconBox icon={HeartPulse} tone="blue"/><Pill tone={today?'green':'amber'}>{today?'已记录':'待完成'}</Pill></div><b className="mt-4 block text-lg">{label('monitor','记录今天状态')}</b><p className="mt-2 text-sm leading-6 text-[#65776e]">精神、食欲、饮水、排尿和症状，没设备也能记录。</p><span className="mt-4 block text-sm font-semibold text-[#3f718e]">{today?'查看存档':'开始记录'} →</span></button>}
 {visible('report')&&<button onClick={()=>navigateToFeature('report')} className="pet-action rounded-2xl border border-[#edddbd] bg-[#fff8ec] p-5 text-left"><div className="flex items-center justify-between"><IconBox icon={FileText} tone="amber"/><Pill tone="amber">{reportCount}份</Pill></div><b className="mt-4 block text-lg">{label('report','检查与出院资料')}</b><p className="mt-2 text-sm leading-6 text-[#65776e]">保存报告、出院单和复查结果，供本人及授权医生查看。</p><span className="mt-4 block text-sm font-semibold text-[#94631b]">上传或查看 →</span></button>}
 </div></section>
 {visible('care-network')&&<Card className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><IconBox icon={Stethoscope}/><div className="min-w-0 flex-1"><b>{label('care-network','找医院与医疗协同')}</b><p className="mt-1 text-sm leading-6 text-[#687970]">{hospitalStatus}。没有熟悉医院时可按地区和病种匹配；就诊后由 AI 整理家庭记录供医生复核。</p></div><button onClick={()=>navigateToFeature('care-network')} className="rounded-xl bg-[#287656] px-4 py-2.5 text-sm font-semibold text-white">找医院 / 协同</button></div></Card>}
 <Card className="overflow-hidden"><button onClick={()=>setMoreOpen(!moreOpen)} className="flex w-full items-center justify-between p-5 text-left"><div><b>更多服务</b><p className="mt-1 text-sm text-[#718078]">低频功能统一收在这里，不打扰每天护理</p></div><ChevronRight className={`transition ${moreOpen?'rotate-90':''}`}/></button>{moreOpen&&<div className="grid gap-2 border-t border-[#e4ebe7] p-4 sm:grid-cols-2 lg:grid-cols-3">{more.map(([target,title,desc,Icon],i)=><button key={String(target)} onClick={()=>navigateToFeature(target as Parameters<typeof navigateToFeature>[0])} className="pet-action flex min-h-20 items-center gap-3 rounded-xl border border-[#e0e8e3] bg-[#fafcfb] p-3 text-left"><IconBox icon={Icon as typeof FileText} tone={i%3===1?'blue':i%3===2?'amber':'green'}/><span><b className="block text-sm">{label(String(target),String(title))}</b><small className="mt-1 block text-[#75837b]">{String(desc)}</small></span></button>)}</div>}</Card>
 {trend.length>0&&<Card className="p-5"><SectionTitle>最近体重趋势</SectionTitle><div className="h-44"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid stroke="#edf2ef" vertical={false}/><XAxis dataKey="date" axisLine={false}/><YAxis domain={['auto','auto']} axisLine={false}/><Tooltip/><Line dataKey="weight" stroke="#287656" strokeWidth={2.5}/></LineChart></ResponsiveContainer></div></Card>}
 <button onClick={()=>setTab('ai')} className="fixed bottom-24 right-5 z-30 grid size-14 place-items-center rounded-full bg-[#226e50] text-white shadow-lg md:bottom-8 md:right-8" aria-label="打开AI管家"><MessageCircle size={25}/></button></div>;
}

export function Dashboard({setTab}:StateProps){
 const {profile:pet}=usePetProfile();
 const [plan,setPlan]=useState<SignedCarePlan|null>(null);
 const [completions,setCompletions]=useState<TaskCompletion[]>([]);
 useEffect(()=>{setPlan(getActiveCarePlan(pet.id));setCompletions(loadTaskCompletions(pet.id))},[pet.id]);
 const todayKey=new Date().toISOString().slice(0,10);
 const todayDone=completions.filter(x=>x.date===todayKey&&x.planId===plan?.id&&x.status==='completed');
 const doneIds=new Set(todayDone.map(x=>x.taskId));
 const tasks=plan?.tasks||[];
 const progress=tasks.length?Math.round(doneIds.size/tasks.length*100):0;
 const categoryStats=[
  {label:'用药',key:'用药',Icon:PillIcon,tone:'bg-[#dff4ec] text-[#13936f]'},
  {label:'饮食',key:'饮食',Icon:Utensils,tone:'bg-[#fff0d9] text-[#d48530]'},
  {label:'补液',key:'补液',Icon:Droplets,tone:'bg-[#e4f2fb] text-[#4183ad]'},
  {label:'症状记录',key:'监测',Icon:HeartPulse,tone:'bg-[#fff0ee] text-[#e36d63]'},
 ].map(item=>{const scoped=tasks.filter(x=>x.category===item.key);return{...item,total:scoped.length,done:scoped.filter(x=>doneIds.has(x.id)).length}});
 const openGroup=(group:'daily'|'medical'|'hospital'|'services')=>{window.localStorage.setItem('petcare-feature-group',group);setTab('features')};
 return <div className="owner-home space-y-3">
  <section className="owner-pet-hero">
   <button onClick={()=>setTab('profile')} className="owner-avatar" aria-label="打开宠物档案">{pet.avatar?<img src={pet.avatar} alt={pet.name}/>:<PawPrint size={34}/>}</button>
   <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h1>{pet.name||'我的宠物'}</h1><button onClick={()=>setTab('profile')} className="text-xs font-bold text-[#2e785b]">切换⌄</button></div><p>{pet.species==='cat'?'猫':'犬'} · {pet.disease||'待完善疾病'} {pet.stage||''}</p><p>{pet.weight?`${pet.weight}kg · `:''}{plan?`出院护理方案 v${plan.version}`:'等待医生签署护理方案'}</p>{plan?<span>护理方案来自主治医生</span>:null}</div>
   <div className="owner-hero-note">一起<br/>走更长的路</div>
  </section>

  <section className="owner-progress-card">
   <div className="flex items-start justify-between"><div><h2>今日护理进度</h2><p>{new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'})}</p></div><div className="progress-ring" style={{background:`conic-gradient(#24b592 ${progress}%,#e7efeb 0)`}}><span>{doneIds.size}/{tasks.length||0}</span></div></div>
   <div className="mt-4 grid grid-cols-4 gap-2">{categoryStats.map(({label,Icon,tone,done,total})=><button key={label} onClick={()=>setTab(label==='症状记录'?'monitor':'care')} className="owner-stat"><span className={tone}><Icon size={18}/></span><b>{done}/{total}</b><small>{label}</small></button>)}</div>
   <button onClick={()=>setTab('monitor')} className="owner-primary"><Plus size={20}/>记录今日状态<ChevronRight size={18}/></button>
   <p className="mt-2 text-center text-[11px] text-[#72827a]">记录让改变被看见，也让医生支持更及时</p>
  </section>

  <section className="owner-directory"><div className="owner-section-title"><div><b>选择要做的事</b><span>所有功能都在分类里，首页不再连续堆放</span></div><button onClick={()=>setTab('features')}>全部功能 ›</button></div><div className="owner-directory-grid">
   <button onClick={()=>openGroup('daily')} className="green"><span><ClipboardCheck size={20}/></span><b>每日护理</b><small>方案·打卡·提醒·AI管家</small></button>
   <button onClick={()=>openGroup('medical')} className="blue"><span><FileText size={20}/></span><b>检查与专病</b><small>报告·饮食·血糖·知识</small></button>
   <button onClick={()=>openGroup('hospital')} className="red"><span><Hospital size={20}/></span><b>医院与就医</b><small>协同·匹配·24小时急诊</small></button>
   <button onClick={()=>openGroup('services')} className="amber"><span><Settings2 size={20}/></span><b>档案与服务</b><small>宠物档案·设备·商城</small></button>
  </div></section>
 </div>;
}

function DashboardLegacy({ state, update, setTab, openReminders }: StateProps) {
  const { profile: pet } = usePetProfile();
  const toggleMed = (id: string) => update({ ...state, completedMeds: state.completedMeds.includes(id) ? state.completedMeds.filter(x => x !== id) : [...state.completedMeds, id] });
  const fallingWeight = weightData.slice(-3).every((x, i, a) => i === 0 || x.weight < a[i - 1].weight);
  const lowInventory = inventory.filter(x => x.low);
  return <div className="space-y-6">
    {fallingWeight && <Card className="flex items-start gap-3 border-[#efc6bf] bg-[#fff7f5] p-4">
<IconBox icon={ShieldAlert} tone="red"/>
<div>
<p className="font-bold text-[#a54d45]">风险就医预警</p>
<p className="mt-1 text-sm leading-6 text-[#7d5a55]">体重已连续 3 天下降，请联系李明华医生确认是否需要提前复查。</p>
</div>
</Card>}
    {lowInventory.length > 0 && <Card className="flex items-start gap-3 border-[#efd4a5] bg-[#fffaf1] p-4">
<IconBox icon={AlarmClock} tone="amber"/>
<div>
<p className="font-bold text-[#8f601f]">补货提醒</p>
<p className="mt-1 text-sm text-[#806b4b]">{lowInventory.map(x => `${x.name}还剩${x.days}天`).join('、')}，建议现在补货。</p>
</div>
<button onClick={() => setTab('profile')} className="ml-auto shrink-0 rounded-lg bg-[#d59a3f] px-3 py-2 text-xs font-semibold text-white">去补货</button>
</Card>}
    <section className="relative overflow-hidden rounded-3xl bg-[#2f7b5d] px-5 py-6 text-white sm:px-8 sm:py-8">
      <div className="relative z-10 max-w-[68%]">
<p className="text-sm text-white/75">7月21日 · 今日护理</p>
<div className="mt-3 flex items-center gap-3">
<img src={pet.avatar} alt={pet.name} className="size-14 rounded-2xl border-2 border-white/30 object-cover"/>
<div>
<h1 className="text-2xl font-bold">早上好，{pet.name}</h1>
<p className="mt-1 text-sm text-white/75">{pet.breed} · {pet.age}</p>
</div>
</div>
<div className="mt-6 flex items-end gap-3">
<strong className="text-4xl">82</strong>
<span className="pb-1 text-sm text-white/75">今日健康指数 · 状态稳定</span>
</div>
</div>
      <img src={pet.avatar} alt="" className="absolute -bottom-12 -right-8 size-52 rounded-full object-cover opacity-35 sm:right-8 sm:size-64"/>
    </section>
    <div>
<SectionTitle action={<button onClick={openReminders} className="text-sm font-medium text-[#247052]">用药与复查 <ChevronRight className="inline" size={16}/>
</button>}>今日健康摘要</SectionTitle>
<div className="grid gap-3 sm:grid-cols-3">
      <MedicationSummary state={state} update={update} toggleMed={toggleMed}/>
      <Card className="p-4">
<div className="flex items-center gap-3">
<IconBox icon={Utensils} tone="amber"/>
<div>
<p className="text-sm text-[#6f7f76]">今日饮食</p>
<strong className="text-lg">已记录 2 餐</strong>
</div>
</div>
<div className="mt-4 rounded-xl bg-[#fff9ef] p-3 text-sm">
<div className="flex justify-between">
<span>肾脏处方湿粮</span>
<b>62 / 90g</b>
</div>
<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f0dfc1]">
<div className="h-full w-[69%] bg-[#d59a3f]"/>
</div>
</div>
</Card>
      <Card className="p-4">
<div className="flex items-center gap-3">
<IconBox icon={ClipboardCheck} tone={state.checkInDone ? 'green' : 'blue'}/>
<div>
<p className="text-sm text-[#6f7f76]">症状打卡</p>
<strong className="text-lg">{state.checkInDone ? '今日已完成' : '等待记录'}</strong>
</div>
</div>
<button onClick={() => setTab('monitor')} className="mt-4 w-full rounded-xl border border-[#cfe0d6] py-2.5 text-sm font-semibold text-[#267253]">{state.checkInDone ? '查看今日记录' : '开始健康打卡'}</button>
</Card>
    </div>
</div>
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
<Card className="p-4 sm:p-5">
<SectionTitle action={<span className="text-xs text-[#76857d]">近7天</span>}>体重变化</SectionTitle>
<div className="h-52">
<ResponsiveContainer width="100%" height="100%">
<AreaChart data={weightData}>
<defs>
<linearGradient id="weight" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stopColor="#338466" stopOpacity=".28"/>
<stop offset="1" stopColor="#338466" stopOpacity="0"/>
</linearGradient>
</defs>
<CartesianGrid stroke="#edf2ef" vertical={false}/>
<XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11}/>
<YAxis domain={[5,5.5]} tickLine={false} axisLine={false} fontSize={11}/>
<Tooltip/>
<Area dataKey="weight" type="monotone" stroke="#2d7a5c" strokeWidth={2.5} fill="url(#weight)"/>
</AreaChart>
</ResponsiveContainer>
</div>
</Card>
      <div className="space-y-3">
<SectionTitle>近期提醒</SectionTitle>
<Card className="flex items-start gap-3 p-4">
<IconBox icon={CalendarDays} tone="amber"/>
<div>
<p className="font-semibold">肾功能复查</p>
<p className="mt-1 text-sm text-[#728078]">7月28日 · 距今7天</p>
<p className="mt-2 text-xs text-[#9c6b25]">需空腹 8 小时</p>
</div>
</Card>
<Card className="flex items-start gap-3 p-4">
<IconBox icon={Droplets} tone="blue"/>
<div>
<p className="font-semibold">饮水/排尿平衡</p>
<p className="mt-1 text-sm text-[#728078]">饮水 {homeCareData.waterMl}ml + 额外补水 {homeCareData.extraHydrationMl}ml</p>
<p className="mt-1 text-xs text-[#6b8190]">尿团：{homeCareData.urineClumpSize}</p>
</div>
</Card>
</div>
    </div>
    <button onClick={() => setTab('ai')} aria-label="打开AI管家" className="fixed bottom-24 right-5 z-30 grid size-14 place-items-center rounded-full bg-[#226e50] text-white shadow-lg shadow-[#174a36]/25 md:bottom-8 md:right-8">
<MessageCircle size={25}/>
</button>
  </div>;
}

function MedicationSummary({ state, update, toggleMed }: { state: PersistedState; update:(s:PersistedState)=>void; toggleMed:(id:string)=>void }) {
  const vomit = (id:string) => update({...state, vomitedMeds: state.vomitedMeds.includes(id) ? state.vomitedMeds.filter(x=>x!==id) : [...state.vomitedMeds,id]});
  return <Card className="p-4">
<div className="flex items-center gap-3">
<IconBox icon={PillIcon}/>
<div>
<p className="text-sm text-[#6f7f76]">今日用药</p>
<strong className="text-lg">{state.completedMeds.length}/{medications.length} 已完成</strong>
</div>
</div>
<div className="mt-4 space-y-2">{medications.slice(0,2).map(m => <div key={m.id} className="flex gap-2">
<button onClick={() => toggleMed(m.id)} className="flex min-w-0 flex-1 items-center justify-between rounded-xl bg-[#f5f8f6] px-3 py-2 text-left text-sm">
<span className="truncate">
<b>{m.time}</b> {m.name}</span>
<span className={`grid size-5 shrink-0 place-items-center rounded-full border ${state.completedMeds.includes(m.id) ? 'border-[#2b7b5c] bg-[#2b7b5c] text-white' : 'border-[#becbc4]'}`}>{state.completedMeds.includes(m.id) && <Check size={13}/>}</span>
</button>
<button onClick={() => vomit(m.id)} className={`shrink-0 rounded-lg px-2 text-[10px] ${state.vomitedMeds.includes(m.id)?'bg-[#fde5e2] text-[#a44942]':'bg-[#fff3eb] text-[#9e5d45]'}`}>吐药</button>
</div>)}</div>{state.vomitedMeds.length>0 && <div className="mt-3 rounded-xl bg-[#fff4ef] p-3 text-xs leading-5 text-[#805247]">
<b>是否需要补服？</b> 请勿立即自行加倍。记录吐出时间及药物完整程度，并联系李明华医生确认补服剂量。下次可少量湿粮包裹给药，给药后观察 15 分钟。</div>}</Card>;
}

function MonitorLegacy({ state, update }: StateProps) {
  const {profile}=usePetProfile();
  const [form, setForm] = useState({ spirit: '正常', appetite: '正常', water: '正常', urine: '正常', stool: '正常',weightKg:'',waterMl:'',extraHydrationMl:'',urineClumpCm:'' });
  const [history,setHistory]=useState<DailyCheckIn[]>([]);const [saved,setSaved]=useState(false);
  const [tab, setSubTab] = useState<'checkin'|'trend'|'symptoms'>('checkin');
  const options: [keyof typeof form,string,string[]][] = [['spirit','精神状态',['活跃','正常','没精神']],['appetite','食欲',['很好','正常','较差']],['water','饮水量',['减少','正常','增加']],['urine','排尿',['减少','正常','增多']],['stool','排便',['正常','偏干','软便']]];
  useEffect(()=>{const list=loadDailyCheckins(profile.id);setHistory(list);const today=list.find(x=>x.recordedAt.slice(0,10)===new Date().toISOString().slice(0,10));if(today)setForm({spirit:today.spirit,appetite:today.appetite,water:today.water,urine:today.urine,stool:today.stool,weightKg:today.weightKg?.toString()||'',waterMl:today.waterMl?.toString()||'',extraHydrationMl:today.extraHydrationMl?.toString()||'',urineClumpCm:today.urineClumpCm?.toString()||''});setSaved(Boolean(today))},[profile.id]);
  const save=()=>{const recordedAt=new Date().toISOString();const numberOrNull=(x:string)=>x.trim()===''?null:Number(x);const entry:DailyCheckIn={id:`checkin-${Date.now()}`,petId:profile.id,recordedAt,weightKg:numberOrNull(form.weightKg),waterMl:numberOrNull(form.waterMl),extraHydrationMl:numberOrNull(form.extraHydrationMl),urineClumpCm:numberOrNull(form.urineClumpCm),spirit:form.spirit,appetite:form.appetite,water:form.water,urine:form.urine,stool:form.stool,provenance:{source:'user_input',verified:true,verifiedBy:'宠物主人',recordedAt}};setHistory(saveDailyCheckin(entry));setSaved(true);update({...state,checkInDone:true})};
  const trend=history.slice().reverse().map(x=>({date:new Date(x.recordedAt).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}),weight:x.weightKg})).filter(x=>x.weight!==null);
  return <>
<PageTitle title="健康监测" subtitle="每天一点记录，让变化有迹可循"/>
<div className="mb-5 flex gap-1 rounded-xl bg-[#e8eeea] p-1">{[['checkin','每日打卡'],['trend','趋势图表'],['symptoms','症状日志']].map(x => <button key={x[0]} onClick={() => setSubTab(x[0] as typeof tab)} className={`flex-1 rounded-lg px-2 py-2.5 text-sm ${tab === x[0] ? 'bg-white font-semibold text-[#246b4f] shadow-sm' : 'text-[#687a70]'}`}>{x[1]}</button>)}</div>
    {tab === 'checkin' && <Card className="mx-auto max-w-3xl p-5 sm:p-7">
<div className="mb-6 flex items-center justify-between">
<div>
<h2 className="text-lg font-bold">{profile.name}今天怎么样？</h2>
<p className="mt-1 text-sm text-[#77847d]">{new Date().toLocaleDateString('zh-CN')}</p>
</div>
<Pill>{saved?'用户录入 · 已保存':'尚未保存'}</Pill>
</div>
<div className="space-y-6">{options.map(([key,label,values]) => <div key={key}>
<p className="mb-2 text-sm font-semibold">{label}</p>
<div className="grid grid-cols-3 gap-2">{values.map(v => <button key={v} onClick={() => setForm({ ...form, [key]: v })} className={`rounded-xl border py-2.5 text-sm ${form[key] === v ? 'border-[#3a8064] bg-[#e6f2eb] font-semibold text-[#226849]' : 'border-[#dfe6e2] bg-white text-[#66756d]'}`}>{v}</button>)}</div>
</div>)}</div>
<div className="mt-6 grid gap-3 sm:grid-cols-2">{([['当前实测体重','weightKg','kg'],['主动饮水','waterMl','ml'],['额外补水','extraHydrationMl','ml'],['尿团直径','urineClumpCm','cm']] as const).map(([label,key,unit])=>
<label key={key} className="rounded-xl bg-[#f5f8f6] p-3 text-xs text-[#66776e]">{label}<span className="mt-2 flex items-center gap-2">
<input value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} inputMode="decimal" placeholder="未填写" className="min-w-0 w-full rounded-lg border border-[#d7e2dc] bg-white px-3 py-2 text-base font-semibold text-[#2c493b]"/>{unit}</span>
</label>)}</div>
<p className="mt-4 text-xs leading-5 text-[#718078]">保存后标记为“用户录入”，仅归入{profile.name}档案；空白项保持缺失，AI不会用模板或互联网数据补齐。</p>
<button onClick={save} className="mt-5 w-full rounded-xl bg-[#287656] py-3 font-semibold text-white">{saved?'更新今日记录':'保存并完成今日打卡'}</button>
</Card>}
    {tab === 'trend' && (trend.length?<Card className="p-5">
<SectionTitle>真实体重记录（kg） <Pill>用户录入</Pill>
</SectionTitle>
<div className="h-64">
<ResponsiveContainer width="100%" height="100%">
<LineChart data={trend}>
<CartesianGrid stroke="#edf2ef" vertical={false}/>
<XAxis dataKey="date" axisLine={false}/>
<YAxis domain={['auto','auto']} axisLine={false}/>
<Tooltip/>
<Line type="monotone" dataKey="weight" stroke="#277657" strokeWidth={2.5}/>
</LineChart>
</ResponsiveContainer>
</div>
</Card>:<Card className="p-10 text-center text-sm text-[#718078]">暂无用户保存的体重记录。完成每日打卡后，这里才会生成真实趋势。</Card>)}
    {tab === 'symptoms' && <>
<Card className="mb-4 flex items-center justify-between p-5">
<div className="flex items-center gap-3">
<IconBox icon={Camera} tone="blue"/>
<div>
<h2 className="font-bold">记录新症状</h2>
<p className="text-sm text-[#718078]">支持添加照片和详细描述</p>
</div>
</div>
<button className="grid size-10 place-items-center rounded-xl bg-[#287656] text-white">
<Plus size={20}/>
</button>
</Card>{symptomLogs.map((x,i) => <Card key={x.date} className="mb-3 p-5">
<div className="flex items-start gap-3">
<IconBox icon={Stethoscope} tone={i ? 'amber':'blue'}/>
<div>
<p className="font-semibold">{x.title}</p>
<p className="mt-1 text-xs text-[#849088]">{x.date} · {x.severity}</p>
<p className="mt-3 text-sm leading-6 text-[#5f6f66]">{x.detail}</p>
</div>
</div>
</Card>)}</>}
  </>;
}
export function Monitor({state,update}:StateProps){return <HealthMonitorWorkspace state={state} update={update}/>}
function Chart({ title, dataKey, color }: { title: string; dataKey: string; color: string }) { const isWeight=dataKey==='weight'; return <Card className="p-5">
<SectionTitle>{title}</SectionTitle>
<div className="h-64">
<ResponsiveContainer width="100%" height="100%">
<LineChart data={weightData}>
<CartesianGrid stroke="#edf2ef" vertical={false}/>
<XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={11}/>
<YAxis domain={isWeight ? [5,5.5] : [160,190]} ticks={isWeight ? [5,5.1,5.2,5.3,5.4,5.5] : [160,170,180,190]} allowDataOverflow axisLine={false} tickLine={false} fontSize={11}/>
<Tooltip/>
<Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{r:3}}/>
</LineChart>
</ResponsiveContainer>
</div>
</Card> }

function AiButlerLegacy() {
  const welcome = `你好！我是你的AI宠物健康管家。你家毛孩子今天状态怎么样？有什么我可以帮你的吗？\n\n我已读取团仔今日体重 ${homeCareData.todayWeight}kg、饮水 ${homeCareData.waterMl}ml（额外补水 ${homeCareData.extraHydrationMl}ml）和尿团${homeCareData.urineClumpSize}。历史上 7/6 有多饮多尿、6/29 有一次呕吐，我会结合这些记录回答。`;
  const [messages, setMessages] = useState([{ role: 'ai', text: welcome }]); const [draft, setDraft] = useState('');
  const send = (question?: string) => { const text = question || draft.trim(); if (!text) return; setDraft(''); const answer = text.includes('饮水') ? `团仔今天饮水 ${homeCareData.waterMl}ml，另有 ${homeCareData.extraHydrationMl}ml 额外补水，合计约 ${homeCareData.waterMl + homeCareData.extraHydrationMl}ml；尿团为${homeCareData.urineClumpSize}。相比 7/6 的多饮多尿，目前没有同样明显，但请继续记录 24 小时总量。` : text.includes('医院') ? '团仔最近 3 天体重从 5.28kg 降至 5.2kg，且碳酸镧库存仅够 5 天。我建议联系李明华医生，确认是否提前复查，不要等到断药。' : `结合团仔 CKD 2期、今天体重 ${homeCareData.todayWeight}kg 和既往 6/29 呕吐记录，建议继续少量多餐，完成三项用药，并记录服药后 15 分钟内是否吐药。若出现反复呕吐、完全拒食、明显虚弱或无法排尿，请立即联系李明华医生。`; setMessages(m => [...m, { role:'user', text }, { role:'ai', text:answer }]); };
  return <>
<PageTitle title="AI健康管家" subtitle="基于团仔的病历与日常记录，提供个性化护理参考"/>
<div className="mb-4 flex gap-3 rounded-2xl border border-[#efd3a5] bg-[#fff8ea] p-4 text-[#76501e]">
<ShieldAlert className="mt-0.5 shrink-0" size={20}/>
<p className="text-sm">
<b>重要声明：</b>本AI仅提供护理参考建议，不能替代专业兽医诊断。紧急情况请立即前往宠物医院。</p>
</div>
<Card className="flex h-[620px] flex-col overflow-hidden">
<div className="flex items-center gap-3 border-b border-[#e4ebe6] p-4">
<span className="grid size-10 place-items-center rounded-full bg-[#287656] text-white">
<Sparkles size={19}/>
</span>
<div>
<h2 className="font-bold">宠馨智 AI 管家</h2>
<p className="text-xs text-[#6f7e76]">
<span className="mr-1 inline-block size-2 rounded-full bg-[#55a477]"/>在线 · 已载入团仔档案</p>
</div>
</div>
<div className="flex-1 overflow-y-auto bg-[#fafcfb] p-4 sm:p-6">{messages.map((m,i) => <div key={i} className={`mb-4 max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${m.role === 'ai' ? 'rounded-tl-sm border border-[#e1e9e4] bg-white text-[#405248]' : 'ml-auto rounded-tr-sm bg-[#2d795a] text-white'}`}>{m.text}</div>)}</div>
<div className="border-t border-[#e3eae5] bg-white p-3">
<div className="mb-3 flex gap-2 overflow-x-auto pb-1">{['今天喂药了吗','食欲怎么样','需要去医院吗'].map(q => <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-[#cfe0d7] bg-[#f5faf7] px-3 py-1.5 text-xs text-[#286d51]">{q}</button>)}</div>
<div className="flex gap-2">
<input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="描述团仔今天的状态…" className="min-w-0 flex-1 rounded-xl border border-[#d8e2dc] px-4 outline-none focus:border-[#3b8063]"/>
<button onClick={() => send()} aria-label="发送" className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#287656] text-white">
<Send size={19}/>
</button>
</div>
</div>
</Card>
</>;
}

type ChatMessage = { role: 'ai'|'user'; text: string; kind: ReplyKind; source?: string };
export function AiButler() {
  const welcome = '你好！我是你的宠物CKD知识助手，基于IRIS国际标准帮你解读肾病指标。你可以把宝贝的检验报告数据告诉我（肌酐、SDMA、UP/C、血压等），我来帮你梳理目前处于哪个阶段、意味着什么。注意：我提供的是知识解读，不是诊断哦。😊';
  const [messages, setMessages] = useState<ChatMessage[]>([{ role:'ai', text:`${welcome}\n\n当前已读取：${buildCareContext()}`, kind:'normal' }]);
  const [draft, setDraft] = useState('');
  const send = async (question?: string) => { const text=question || draft.trim(); if(!text) return; setDraft(''); const workflow=await runCareWorkflow(text); const reply=generateCareReply(text); const labels={ 'core-ckd':'核心知识库', 'daily-management':'日常管理库', 'emergency-care':'紧急处理库' }; const contextNote=workflow.context.dataNotice; setMessages(m=>[...m,{role:'user',text,kind:'normal'},{role:'ai',text:`${reply.text}\n\n${contextNote}\n知识依据：${labels[reply.knowledgeBase]} · ${reply.sourceTitle}`,kind:reply.kind,source:reply.knowledgeBase}]); };
  const suggestedQuestions=['我的猫确诊 CKD，肌酐 2.3 mg/dL，SDMA 22，UP/C 0.35，这代表什么分期？','我的狗 UP/C 0.7 是什么水平？','猫 CKD 贫血 HCT 24% 该怎么看？','猫 CKD 血压 170 mmHg 需要担心吗？'];
  return <>
<PageTitle title="AI管家" subtitle="按医嘱拆任务、整理执行趋势、回答护理问题"/>
<Card className="mb-4 border-[#d9e8de] bg-[#f4faf6] p-4">
<div className="flex items-start gap-3">
<Sparkles className="mt-0.5 shrink-0 text-[#2b7958]" size={19}/>
<div className="text-sm leading-6 text-[#4c6256]">
<b>关于我</b>
<p className="mt-1">✅ 我能做：解读每日打卡数据、提供 CKD/老年病护理建议、饮食指导参考、用药提醒辅助、判断是否需要就医。</p>
<p>❌ 我不能做：疾病诊断、开处方、自行增减或调整药物、替代兽医检查。</p>
</div>
</div>
</Card>
<Card className="flex h-[640px] flex-col overflow-hidden">
<div className="flex items-center gap-3 border-b border-[#e4ebe6] p-4">
<span className="grid size-10 place-items-center rounded-full bg-[#287656] text-white">
<Sparkles size={19}/>
</span>
<div>
<h2 className="font-bold">宠馨智 AI 管家</h2>
<p className="text-xs text-[#6f7e76]">
<span className="mr-1 inline-block size-2 rounded-full bg-[#55a477]"/>在线 · 已载入团仔今日数据</p>
</div>
</div>
<div className="flex-1 overflow-y-auto bg-[#fafcfb] p-4 sm:p-6">{messages.map((m,i)=>
<div key={i} className={`mb-4 max-w-[90%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${m.role==='user'?'ml-auto rounded-tr-sm bg-[#2d795a] text-white':m.kind==='urgent'?'border-2 border-[#e26c5f] bg-[#fff0ed] font-semibold text-[#a23f36]':m.kind==='out-of-scope'||m.kind==='insufficient-data'?'border border-[#d8dfdc] bg-[#f0f3f1] text-[#5d6b64]':'rounded-tl-sm border border-[#e1e9e4] bg-white text-[#405248]'}`}>{m.text}</div>)}</div>
<div className="border-t border-[#e3eae5] bg-white p-3">
<p className="mb-2 text-center text-[11px] text-[#829087]">AI管家不诊断、不改药；异常请联系主治医生或及时就医</p>
<div className="mb-3 flex gap-2 overflow-x-auto pb-1">{['今天喂药了吗','食欲怎么样','需要去医院吗'].map(q=>
<button key={q} onClick={()=>send(q)} className="shrink-0 rounded-full border border-[#cfe0d7] bg-[#f5faf7] px-3 py-1.5 text-xs text-[#286d51]">{q}</button>)}</div>
<div className="flex gap-2">
<input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="描述团仔今天的状态…" className="min-w-0 flex-1 rounded-xl border border-[#d8e2dc] px-4 outline-none focus:border-[#3b8063]"/>
<button onClick={()=>send()} aria-label="发送" className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#287656] text-white">
<Send size={19}/>
</button>
</div>
</div>
</Card>
<span className="sr-only">{careAssistantSystemPrompt}</span>
</>;
}

function KnowledgeLegacy() {
  const [category,setCategory] = useState('全部'); const [selected,setSelected] = useState<(typeof articles)[number]|null>(null);
  if (selected) return <article className="mx-auto max-w-3xl">
<button onClick={() => setSelected(null)} className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#286f52]">
<ArrowLeft size={17}/>返回知识库</button>
<img src={selected.image} alt={selected.title} className="h-56 w-full rounded-2xl object-cover sm:h-80"/>
<Pill>{selected.category}</Pill>
<h1 className="mb-3 mt-4 text-2xl font-bold sm:text-3xl">{selected.title}</h1>
<p className="mb-7 text-[#6f7d75]">{selected.summary}</p>
<Card className="p-5 sm:p-8">
<div className="space-y-5 text-[15px] leading-8 text-[#405048]">{selected.content.split('\n\n').map(p => <p key={p}>{p}</p>)}</div>
</Card>
</article>;
  const shown = category === '全部' ? articles : articles.filter(a => a.category === category);
  return <>
<PageTitle title="慢病科普知识库" subtitle="可靠、易懂的居家护理知识"/>
<div className="mb-5 flex gap-2 overflow-x-auto pb-1">{['全部','肾病','糖尿病','关节炎','心脏病'].map(c => <button key={c} onClick={() => setCategory(c)} className={`shrink-0 rounded-full px-4 py-2 text-sm ${category === c ? 'bg-[#287656] font-semibold text-white' : 'border border-[#dae4de] bg-white text-[#607168]'}`}>{c}</button>)}</div>
<div className="grid gap-4 sm:grid-cols-2">{shown.map(a => <Card key={a.id} className="overflow-hidden">
<img src={a.image} alt={a.title} className="h-40 w-full object-cover"/>
<div className="p-5">
<Pill>{a.category}</Pill>
<h2 className="mt-3 text-lg font-bold">{a.title}</h2>
<p className="mt-2 text-sm leading-6 text-[#6c7b73]">{a.summary}</p>
<button onClick={() => setSelected(a)} className="mt-4 text-sm font-semibold text-[#277052]">阅读全文 <ChevronRight className="inline" size={16}/>
</button>
</div>
</Card>)}</div>
</>;
}

export function Knowledge() {
  const [view,setView]=useState<'professional'|'royal'|'articles'>('professional');
  const [module,setModule]=useState<'all'|KnowledgeModule>('all');
  const [query,setQuery]=useState('');
  const [openId,setOpenId]=useState<string|null>(null);
  const modules:[typeof module,string][]=[['all','全部'],['medication','用药'],['diet','饮食'],['hydration','饮水'],['emergency','急症'],['monitoring','检测与管理']];
  const labels:Record<KnowledgeModule,string>={medication:'用药',diet:'饮食',hydration:'饮水',emergency:'急症',monitoring:'检测与管理'};
  const tones:Record<KnowledgeModule,string>={medication:'bg-[#e7f2ec] text-[#266c50]',diet:'bg-[#fff0d8] text-[#98621d]',hydration:'bg-[#e6f1f8] text-[#3f718e]',emergency:'bg-[#fde8e5] text-[#a7433d]',monitoring:'bg-[#eee8f8] text-[#70549b]'};
  const shown=professionalCareKnowledge.filter(x=>(module==='all'||x.module===module)&&(!query.trim()||`${x.title}${x.keywords.join('')}${x.content}`.toLowerCase().includes(query.toLowerCase())));
  return <>
<PageTitle title="宠物慢病知识库" subtitle="专业护理、处方营养与宠主科普资料"/>
<div className="mb-5 flex rounded-xl bg-[#e7ede9] p-1">
<button onClick={()=>setView('professional')} className={`flex-1 rounded-lg py-2.5 text-sm ${view==='professional'?'bg-white font-semibold text-[#286f52] shadow-sm':'text-[#6b7b72]'}`}>专业护理</button>
<button onClick={()=>setView('royal')} className={`flex-1 rounded-lg py-2.5 text-sm ${view==='royal'?'bg-white font-semibold text-[#286f52] shadow-sm':'text-[#6b7b72]'}`}>皇家处方粮</button>
<button onClick={()=>setView('articles')} className={`flex-1 rounded-lg py-2.5 text-sm ${view==='articles'?'bg-white font-semibold text-[#286f52] shadow-sm':'text-[#6b7b72]'}`}>科普文章</button>
</div>{view==='professional'?<>
<div className="mb-4 flex flex-col gap-3 sm:flex-row">
<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索用药、处方粮、脱水…" className="min-w-0 flex-1 rounded-xl border border-[#d7e2dc] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#3b8063]"/>
<div className="flex gap-2 overflow-x-auto">{modules.map(([id,label])=>
<button key={id} onClick={()=>setModule(id)} className={`shrink-0 rounded-xl px-3 py-2 text-sm ${module===id?'bg-[#287656] font-semibold text-white':'border border-[#dce5df] bg-white text-[#617168]'}`}>{label}</button>)}</div>
</div>
<p className="mb-3 text-xs text-[#7a8880]">共 {shown.length} 条专业知识。AI 回答前会自动检索，普通宠主看到的是安全转译后的版本。</p>
<div className="grid gap-3 sm:grid-cols-2">{shown.map(item=>{const expanded=openId===item.id;return <Card key={item.id} className="p-5">
<div className="flex items-start justify-between gap-3">
<div>
<span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[item.module]}`}>{labels[item.module]}</span>
<h2 className="mt-3 font-bold leading-6">{item.title}</h2>
</div>
<span className="text-[10px] text-[#95a099]">{item.id}</span>
</div>
<p className={`mt-3 text-sm leading-6 text-[#65756c] ${expanded?'':'line-clamp-2'}`}>{expanded?item.content:item.summary}</p>
{expanded&&item.source&&<div className="mt-3 space-y-1 rounded-lg bg-[#f4f7f5] px-3 py-2 text-xs leading-5 text-[#68776f]">
<p><b>资料来源：</b>{item.source}{item.sourceYear&&` · ${item.sourceYear}`}</p>
{item.applicableTo&&<p><b>适用对象：</b>{item.applicableTo}</p>}
{item.disease&&<p><b>疾病：</b>{item.disease}</p>}
{item.scenario&&<p><b>使用场景：</b>{item.scenario}</p>}
{item.prerequisites&&<p><b>适用前提：</b>{item.prerequisites}</p>}
{item.ownerExplanation&&<p><b>宠主解释：</b>{item.ownerExplanation}</p>}
{item.nextActions&&<p><b>下一步行动：</b>{item.nextActions}</p>}
{item.prohibitedInferences&&<p><b>禁止推断：</b>{item.prohibitedInferences}</p>}
{item.reviewStatus&&<p><b>审核状态：</b>{item.reviewStatus}</p>}
{item.reviewer&&<p><b>审核人：</b>{item.reviewer}</p>}
{item.reviewDate&&<p><b>复核日期：</b>{item.reviewDate}</p>}
{item.sourceUrl&&<a href={item.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#287052]">查看原文</a>}
</div>}
<button onClick={()=>setOpenId(expanded?null:item.id)} className="mt-4 text-sm font-semibold text-[#287052]">{expanded?'收起内容':'展开查看'} <ChevronRight className={`inline transition-transform ${expanded?'rotate-90':''}`} size={15}/>
</button>
</Card>})}</div>{shown.length===0&&<Card className="p-12 text-center text-sm text-[#7b8981]">没有找到匹配知识，请尝试其他关键词。</Card>}</>:view==='royal'?<RoyalKnowledge/>:<LegacyArticles/>}</>;
}

function RoyalKnowledge(){return <>
<Card className="mb-4 border-[#ead5aa] bg-[#fff9ed] p-4 text-sm leading-6 text-[#735a2d]">
<b>资料完整性说明：</b>当前收录上传附件中9条完整犬用产品。附件在Skin Support条目处截断，且不含猫用全套条目和完整湿粮喂量表；缺失内容不会推测补齐。产品代码和配方需以当地最新官方包装复核。</Card>
<div className="grid gap-3 sm:grid-cols-2">{royalCaninProducts.map(x=>
<Card key={x.id} className="p-5">
<div className="flex items-start justify-between gap-3">
<div>
<Pill>{x.form==='both'?'干湿粮':'干粮'}</Pill>
<h2 className="mt-3 font-bold">{x.name}</h2>
</div>
<span className="text-xs text-[#78867e]">{x.productCode}</span>
</div>
<p className="mt-3 text-sm leading-6 text-[#607168]">适用方向：{x.indications.join('、')}</p>
<p className="mt-2 text-xs leading-5 text-[#7b6a58]">禁忌：{x.contraindications.length?x.contraindications.join('、'):'按包装及兽医要求'}</p>
<details className="mt-3 rounded-xl bg-[#f5f8f6] p-3">
<summary className="cursor-pointer text-sm font-semibold text-[#2b6d52]">查看喂养与搭配</summary>
<p className="mt-2 text-sm leading-6 text-[#64746b]">{x.feedingGuide}</p>{x.wetPairing&&<p className="mt-2 text-sm leading-6 text-[#64746b]">干湿搭配：{x.wetPairing}</p>}{x.transitionGuide&&<p className="mt-2 text-sm leading-6 text-[#64746b]">换粮：{x.transitionGuide}</p>}</details>
</Card>)}</div>
</>}

function LegacyArticles(){const [selected,setSelected]=useState<(typeof articles)[number]|null>(null);if(selected)return <article className="mx-auto max-w-3xl">
<button onClick={()=>setSelected(null)} className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#286f52]">
<ArrowLeft size={17}/>返回文章</button>
<img src={selected.image} alt={selected.title} className="h-56 w-full rounded-2xl object-cover sm:h-80"/>
<h1 className="mb-3 mt-4 text-2xl font-bold">{selected.title}</h1>
<Card className="p-5">
<div className="space-y-5 text-sm leading-7">{selected.content.split('\n\n').map(p=>
<p key={p}>{p}</p>)}</div>
</Card>
</article>;return <div className="grid gap-4 sm:grid-cols-2">{articles.map(a=>
<Card key={a.id} className="overflow-hidden">
<img src={a.image} alt={a.title} className="h-40 w-full object-cover"/>
<div className="p-5">
<Pill>{a.category}</Pill>
<h2 className="mt-3 font-bold">{a.title}</h2>
<p className="mt-2 text-sm leading-6 text-[#6c7b73]">{a.summary}</p>
<button onClick={()=>setSelected(a)} className="mt-4 text-sm font-semibold text-[#277052]">阅读全文</button>
</div>
</Card>)}</div>}

export function Profile({ openReminders, setTab }: StateProps) {
  const { profile: pet,profiles,selectProfile,requestAddProfile } = usePetProfile();
  const [view, setView] = useState<'profile'|'report'|'insulin'|'food'|'support'|'settings'|'care-plan'|'hardware'|'roles'|'care-network'|'hospital-match'|'emergency-hospital'|'disease-pilot'>(()=>{if(typeof window==='undefined')return'profile';const pending=window.localStorage.getItem('petcare-pending-destination');window.localStorage.removeItem('petcare-pending-destination');return pending==='report'||pending==='insulin'||pending==='food'||pending==='support'||pending==='settings'||pending==='roles'||pending==='care-plan'||pending==='hardware'||pending==='care-network'||pending==='hospital-match'||pending==='emergency-hospital'||pending==='disease-pilot'?pending:'profile'});
  const backToFeatures=()=>{setView('profile');setTab('features')};
  if (view === 'report') return <MedicalReportWorkspace back={backToFeatures} />;
  if (view === 'insulin') return <InsulinWorkspace back={backToFeatures} />;
  if (view === 'food') return <FoodPhotoWorkspace back={backToFeatures} />;
  if (view === 'support') return <SupportWorkspace back={backToFeatures} />;
  if (view === 'settings') return <ProfileServiceSettings back={backToFeatures} />;
  if (view === 'care-plan') return <CarePlanWorkspace back={backToFeatures} />;
  if (view === 'hardware') return <DeviceWorkspace back={backToFeatures} />;
  if (view === 'roles') return <AccountRoleCenter back={backToFeatures} />;
  if (view === 'care-network') return <CareNetworkWorkspace back={backToFeatures} />;
  if (view === 'hospital-match') return <HospitalMatchWorkspace back={backToFeatures} />;
  if (view === 'emergency-hospital') return <HospitalMatchWorkspace initialEmergency back={backToFeatures} />;
  if (view === 'disease-pilot') return <DiseasePilotWorkspace back={backToFeatures} />;
  return <>
<PageTitle title={`${pet.name}的健康档案`} subtitle="多宠独立建档，集中管理报告、用药和饮食" action={<button onClick={requestAddProfile} className="rounded-xl bg-[#287656] px-3 py-2 text-sm font-semibold text-white">
<Plus className="mr-1 inline" size={16}/>新增宠物</button>}/>
<Card className="mb-4 p-4">
<div className="flex gap-3 overflow-x-auto">{profiles.map(x=>
<button key={x.id} onClick={()=>selectProfile(x.id)} className={`flex min-w-44 items-center gap-3 rounded-xl border p-3 text-left ${x.id===pet.id?'border-[#2f795b] bg-[#eaf5ee]':'border-[#dfe6e1] bg-white'}`}>
<img src={x.avatar} alt={x.name} className="size-10 rounded-xl object-cover"/>
<span>
<b className="block text-sm">{x.name}</b>
<small className="text-[#718078]">{x.species==='cat'?'猫':'犬'} · {x.disease}</small>
</span>
</button>)}</div>
</Card>
<div className="mb-4 grid grid-cols-2 gap-3"><button onClick={()=>setView('settings')} className="rounded-xl border border-[#b9d4c5] bg-white px-4 py-3 text-sm font-semibold text-[#286d51]"><Settings2 className="mr-2 inline" size={17}/>编辑档案</button><button onClick={openReminders} className="rounded-xl border border-[#ead8b6] bg-[#fff9ed] px-4 py-3 text-sm font-semibold text-[#8d5d1e]"><Bell className="mr-2 inline" size={17}/>提醒设置</button></div>
<div className="grid gap-4 lg:grid-cols-[320px_1fr]">
<div className="space-y-4">
<Card className="p-6 text-center">
<img src={pet.avatar} alt={pet.name} className="mx-auto size-28 rounded-3xl object-cover"/>
<h2 className="mt-4 text-2xl font-bold">{pet.name}</h2>
<p className="mt-1 text-sm text-[#6e7d75]">{pet.breed} · {pet.age} · {pet.gender}</p>
<div className="mt-4 flex flex-wrap justify-center gap-2">
<Pill>{pet.disease}</Pill>
<Pill tone="amber">{pet.stage}</Pill>
<Pill>{pet.breedStatus}</Pill>
</div>{pet.suspectedAncestry&&<p className="mt-3 text-xs text-[#718078]">疑似血统：{pet.suspectedAncestry}</p>}</Card>
</div>
<div className="space-y-4">
<Card className="p-5">
<SectionTitle>综合身体档案</SectionTitle>
<div className="grid grid-cols-2 gap-x-5 gap-y-5 text-sm sm:grid-cols-3">{[['当前实测体重',`${pet.weight} kg`],['自动体型',pet.bodySize],['BCS体况',`${pet.bcs}/9`],['当前分期',pet.stage],['主治医院',pet.hospital],['主治医生',pet.doctor]].map(x => <div key={x[0]}>
<span className="text-xs text-[#7d8982]">{x[0]}</span>
<p className="mt-1 font-semibold">{x[1]}</p>
</div>)}</div>{pet.bodyTraits.length>0&&<div className="mt-5 border-t border-[#e5ebe7] pt-4">
<p className="text-xs text-[#7d8982]">身体结构标签</p>
<div className="mt-2 flex flex-wrap gap-2">{pet.bodyTraits.map(x=>
<Pill key={x} tone="amber">{x}</Pill>)}</div>
</div>}<p className="mt-5 rounded-xl bg-[#f7f9f8] p-3 text-xs leading-5 text-[#6d7c74]">护理风险将结合体重、BCS、身体结构、病种分期和化验数据综合判断，不以品种作为唯一依据。</p>
</Card>
<Card className="p-5"><SectionTitle>方案来源说明</SectionTitle><p className="text-sm leading-7 text-[#62736a]">用药、处方饮食和治疗方案只有在你录入或医院授权同步后才显示。宠馨智不会用演示药物填充当前宠物档案；AI只负责把医生确认的方案拆成每日任务并收集执行结果。</p></Card>
</div>
</div>
</>;
}

function ReportWorkspaceLegacy({ back }: { back: () => void }) {
  const [analyzed, setAnalyzed] = useState(false);
  return <>
<PageTitle title="报告智能解读" subtitle="上传诊断报告、化验单或病历照片，建立团仔的健康档案" action={<button onClick={back} className="rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm">返回档案</button>}/>
<div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
<Card className="p-5 sm:p-7">
<div className="rounded-2xl border-2 border-dashed border-[#bdd9c8] bg-[#f5fbf7] p-8 text-center">
<span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e0f1e7] text-[#287555]">
<FileText size={26}/>
</span>
<h2 className="mt-4 font-bold">上传检查资料</h2>
<p className="mt-2 text-sm text-[#74837b]">支持 JPG、PNG、PDF，单个文件不超过 20MB</p>
<label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#287656] px-4 py-2.5 text-sm font-semibold text-white">
<Camera size={17}/>选择文件<input type="file" accept="image/*,.pdf" className="hidden" onChange={() => setAnalyzed(true)}/>
</label>
<p className="mt-4 text-xs text-[#95a29b]">资料仅用于生成护理建议，请确认已获得宠物主人的授权</p>
</div>{analyzed && <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#e9f6ed] p-3 text-sm text-[#286b4d]">
<Check size={18}/>已识别：2026-06-24 生化检查单.pdf <span className="ml-auto">分析完成</span>
</div>}</Card>
<Card className="p-5 sm:p-7">
<SectionTitle>AI 分析结果 {analyzed && <Pill>已更新</Pill>}</SectionTitle>{analyzed ? <div className="space-y-5">
<div className="rounded-2xl bg-[#edf8f1] p-4">
<div className="flex items-center gap-3">
<IconBox icon={CircleGauge}/>
<div>
<p className="text-sm text-[#60766a]">初步判断</p>
<h2 className="text-xl font-bold text-[#226b4d]">猫慢性肾病 · IRIS 2期</h2>
</div>
</div>
<p className="mt-3 text-sm leading-6 text-[#53665b]">当前指标与既往记录相比基本稳定，建议继续处方饮食并按计划复查。此结果仅供护理参考。</p>
</div>
<div>
<p className="mb-3 text-sm font-semibold">关键指标</p>
<div className="grid grid-cols-3 gap-2">{[['肌酐','175','μmol/L','正常上限 180'],['SDMA','16','μg/dL','轻度偏高'],['磷','1.55','mmol/L','目标范围内']].map(x => <div key={x[0]} className="rounded-xl border border-[#e2e9e4] p-3">
<span className="text-xs text-[#75837b]">{x[0]}</span>
<b className="mt-1 block text-lg">{x[1]}<small className="ml-1 text-[10px] font-normal">{x[2]}</small>
</b>
<span className="text-[10px] text-[#6b8b78]">{x[3]}</span>
</div>)}</div>
</div>
<div className="rounded-xl border border-[#dce8df] p-4">
<p className="text-sm font-semibold">下一步护理计划已生成</p>
<p className="mt-2 text-sm leading-6 text-[#64756b]">维持每日 90g 肾脏处方湿粮；保证饮水；每 3 个月复查血生化与尿检；按时完成三项用药。</p>
</div>
</div> : <div className="grid min-h-64 place-items-center rounded-2xl bg-[#f7faf8] text-center text-sm text-[#8a9890]">
<div>
<Sparkles className="mx-auto mb-3 text-[#5d9a79]" size={25}/>
<p>上传资料后，AI 将提取病种、分期和关键指标</p>
</div>
</div>}</Card>
</div>
</>;
}

function ReportWorkspace({ back }: { back: () => void }) {
  const [result, setResult] = useState<CarePipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const analyze = async (file?: File) => {
    setLoading(true);
    const next = await runClinicalCarePipeline(file, { weightKg: homeCareData.todayWeight, waterMl: homeCareData.waterMl, stage: 'IRIS 2期', currentMedication: '贝那普利每日1次' });
    setResult(next);
    setLoading(false);
  };
  return <>
<PageTitle title="化验单 AI 工作流" subtitle="OCR识别 → 数据打包 → 知识检索与计算 → 个性护理方案" action={<button onClick={back} className="rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm">返回档案</button>}/>
<div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
<div className="space-y-4">
<Card className="p-5">
<div className="rounded-2xl border-2 border-dashed border-[#bdd9c8] bg-[#f5fbf7] p-6 text-center">
<IconBox icon={Camera} tone="green"/>
<h2 className="mt-4 font-bold">第一步：上传化验单</h2>
<p className="mt-2 text-sm leading-6 text-[#718078]">支持生化、血常规和体检报告图片。当前使用模拟 OCR 适配器，可替换为 Coze OCR 插件。</p>
<label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#287656] px-4 py-2.5 text-sm font-semibold text-white">
<FileText size={17}/>{loading?'识别中…':'选择图片并识别'}<input type="file" accept="image/*,.pdf" className="hidden" onChange={e=>analyze(e.target.files?.[0])}/>
</label>
</div>
</Card>
<Card className="p-5">
<SectionTitle>实时数据</SectionTitle>
<div className="grid grid-cols-2 gap-3">
<div className="rounded-xl bg-[#f3f7f5] p-3">
<span className="text-xs text-[#75837b]">今日体重</span>
<b className="mt-1 block text-xl">{homeCareData.todayWeight} kg</b>
</div>
<div className="rounded-xl bg-[#edf5fa] p-3">
<span className="text-xs text-[#75837b]">今日饮水</span>
<b className="mt-1 block text-xl">{homeCareData.waterMl} ml</b>
</div>
</div>
</Card>
</div>
<div className="space-y-4">{!result ? <Card className="grid min-h-[430px] place-items-center p-8 text-center text-[#7d8b83]">
<div>
<Sparkles className="mx-auto mb-3 text-[#4c8b6c]"/>
<p>上传化验单后，将依次展示每个处理节点</p>
</div>
</Card> : <>
<Card className="p-5">
<SectionTitle>第二步：OCR 与结构化输入 <Pill>置信度 {Math.round(result.ocr.confidence*100)}%</Pill>
</SectionTitle>
<div className="grid grid-cols-3 gap-2">{[['CREA',result.ocr.creatinine,'μmol/L'],['SDMA',result.ocr.sdma,'μg/dL'],['血磷',result.ocr.phosphorus,'mmol/L']].map(x=>
<div key={x[0]} className="rounded-xl bg-[#f4f8f5] p-3">
<span className="text-xs text-[#718078]">{x[0]}</span>
<b className="mt-1 block text-lg">{x[1]} <small className="text-[10px] font-normal">{x[2]}</small>
</b>
</div>)}</div>
<pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-[#26362f] p-4 text-[11px] leading-5 text-[#d9eee2]">{JSON.stringify(result.context,null,2)}</pre>
</Card>
<Card className="p-5">
<SectionTitle>第三步：知识库检索与计算</SectionTitle>
<div className="space-y-2">{result.knowledgeHits.map(x=>
<div key={x} className="flex gap-2 rounded-xl bg-[#f5f8f6] p-3 text-sm">
<Check size={17} className="shrink-0 text-[#2c7959]"/>{x}</div>)}</div>
<div className="mt-3 flex gap-3">
<Pill>处方粮 {result.calculation.foodGrams}g/日</Pill>
<Pill tone="amber">饮水目标 ≥{result.calculation.minimumWaterMl}ml</Pill>
</div>
</Card>
<Card className="border-[#cfe2d6] bg-[#f4faf6] p-5">
<SectionTitle>第四步：个性化护理输出</SectionTitle>
<p className="text-sm leading-7 text-[#42584c]">{result.output}</p>
<p className="mt-3 text-xs text-[#7e8c84]">本结果用于护理参考，药物与处方调整必须由主治兽医确认。</p>
</Card>
</>}</div>
</div>
</>;
}

export function Reminders({ state, update, close }: { state: PersistedState; update:(s:PersistedState)=>void; close:()=>void }) {
  const toggle = (id:string) => update({ ...state, completedMeds: state.completedMeds.includes(id) ? state.completedMeds.filter(x=>x!==id) : [...state.completedMeds,id] });
  return <>
<PageTitle title="用药与复查" subtitle="按时完成每日护理，不错过重要复查" action={<button onClick={close} className="rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm">返回</button>}/>
<div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
<div>
<SectionTitle>今日用药时间表</SectionTitle>
<Card className="divide-y divide-[#e5ebe7] px-5">{medications.map(m => {const done=state.completedMeds.includes(m.id); return <button key={m.id} onClick={()=>toggle(m.id)} className="flex w-full items-center gap-4 py-5 text-left">
<span className={`grid size-8 place-items-center rounded-full border-2 ${done?'border-[#2b7758] bg-[#2b7758] text-white':'border-[#c5d1ca] text-transparent'}`}>
<Check size={17}/>
</span>
<div className="flex-1">
<div className="flex items-center justify-between">
<b className={done?'text-[#85928b] line-through':''}>{m.name}</b>
<span className="font-semibold text-[#2c7054]">{m.time}</span>
</div>
<p className="mt-1 text-sm text-[#748178]">{m.dose} · {m.note}</p>
</div>
</button>})}</Card>
</div>
<div className="space-y-4">
<div>
<SectionTitle>7月复查日历</SectionTitle>
<Card className="p-4">
<div className="mb-3 grid grid-cols-7 text-center text-xs text-[#859088]">{['一','二','三','四','五','六','日'].map(x=>
<span key={x}>{x}</span>)}</div>
<div className="grid grid-cols-7 gap-1 text-center text-sm">{Array.from({length:35},(_,i)=>i-1).map((d,i)=>
<span key={i} className={`grid aspect-square place-items-center rounded-full ${d===28?'bg-[#d99b3c] font-bold text-white':d===21?'border border-[#2d7859] font-bold text-[#236b4d]':d<1||d>31?'text-transparent':'text-[#53635a]'}`}>{d}</span>)}</div>
<div className="mt-4 rounded-xl bg-[#fff6e7] p-3">
<b className="text-sm">7月28日 · 肾功能复查</b>
<p className="mt-1 text-xs text-[#7a6950]">血常规、生化、尿检 · 提前空腹8小时</p>
</div>
</Card>
</div>
<Card className="p-5">
<SectionTitle>提醒设置</SectionTitle>{([['medication','用药提醒',AlarmClock],['review','复查提醒',CalendarDays],['checkin','每日打卡提醒',ClipboardCheck]] as const).map(([key,label,Icon])=>
<div key={key} className="flex items-center justify-between py-3">
<span className="flex items-center gap-3">
<Icon size={18} className="text-[#37765c]"/>{label}</span>
<button onClick={()=>update({...state,reminders:{...state.reminders,[key]:!state.reminders[key]}})} className={`relative h-7 w-12 rounded-full ${state.reminders[key]?'bg-[#2c7859]':'bg-[#cbd4cf]'}`}>
<span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${state.reminders[key]?'left-6':'left-1'}`}/>
</button>
</div>)}</Card>
</div>
</div>
</>;
}
