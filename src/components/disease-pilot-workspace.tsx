'use client';
import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,ArrowLeft,CheckCircle2,ClipboardCheck,Database,FileCheck2,Save,ShieldCheck,Stethoscope,Target} from 'lucide-react';
import {loadDailyCheckins} from '@/lib/daily-checkins';
import {usePetProfile} from './pet-profile-context';
import {Card,PageTitle,Pill,SectionTitle} from './ui';

type PilotRecord={goal:string;startDate:string;reviewDate:string;doctorReview:'未提交'|'待医生审核'|'医生已确认';notes:string;updatedAt:string};
const key=(petId:string)=>`petcare-disease-pilot:${petId}`;

export function DiseasePilotWorkspace({back}:{back:()=>void}){
 const {profile}=usePetProfile();
 const [record,setRecord]=useState<PilotRecord>({goal:'',startDate:new Date().toISOString().slice(0,10),reviewDate:'',doctorReview:'未提交',notes:'',updatedAt:''});
 const [saved,setSaved]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem(key(profile.id));if(raw)setRecord(JSON.parse(raw))}catch{}},[profile.id]);
 const data=useMemo(()=>{const checkins=loadDailyCheckins(profile.id);let reports=0;let outcomes=0;try{reports=JSON.parse(localStorage.getItem(`petcare-medical-reports:${profile.id}`)||'[]').length}catch{}try{outcomes=JSON.parse(localStorage.getItem(`petcare-outcome-loop:${profile.id}`)||'[]').length}catch{}return{checkins,reports,outcomes}},[profile.id,saved]);
 const disease=/糖尿病/.test(profile.disease)?'糖尿病':/肾|CKD/i.test(profile.disease)?'CKD':'其他疾病';
 const checks=[
  {label:'确诊病种与分期',done:Boolean(profile.disease&&profile.stage),detail:profile.disease?`${profile.disease} · ${profile.stage||'分期未填'}`:'尚未填写'},
  {label:'可比较的家庭基线',done:data.checkins.length>=3,detail:`${data.checkins.length} 条真实打卡，建议至少3条`},
  {label:'检查报告归档',done:data.reports>0,detail:`${data.reports} 份真实上传报告`},
  {label:'医生连接与审核',done:profile.careAuthorization==='verified'&&record.doctorReview==='医生已确认',detail:profile.careAuthorization==='verified'?record.doctorReview:'医院尚未核验连接'},
  {label:'复查结果回流',done:data.outcomes>0,detail:`${data.outcomes} 条护理效果记录`},
 ];
 const completed=checks.filter(x=>x.done).length;const readiness=Math.round(completed/checks.length*100);
 const save=()=>{const next={...record,updatedAt:new Date().toISOString()};localStorage.setItem(key(profile.id),JSON.stringify(next));setRecord(next);setSaved(true)};
 return <div className="space-y-5"><PageTitle title="专病试点中心" subtitle="先用真实CKD或糖尿病病例验证院外管理闭环" action={<button onClick={back} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm"><ArrowLeft size={16}/>返回</button>}/>
 <Card className="border-[#d4e4da] bg-[#f4faf6] p-4 text-sm leading-6 text-[#52675b]"><ShieldCheck className="mr-2 inline text-[#287656]" size={18}/><b>产品边界：</b>这里是重症慢病院外管理，不是“院外ICU”。AI负责整理、提醒和风险分流；诊断、处方、补液和治疗调整由执业兽医决定。</Card>
 <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-[#287656]">当前试点对象</p><h2 className="mt-1 text-xl font-bold">{profile.name} · {disease}</h2></div><Pill tone={disease==='其他疾病'?'amber':'green'}>{disease==='其他疾病'?'暂不入组':'专病路径'}</Pill></div><div className="mt-6 flex items-end gap-3"><strong className="text-4xl text-[#226e50]">{readiness}%</strong><span className="pb-1 text-sm text-[#718078]">闭环准备度 · {completed}/{checks.length}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5ebe7]"><div className="h-full bg-[#2d7a5b]" style={{width:`${readiness}%`}}/></div><p className="mt-4 text-xs leading-5 text-[#718078]">该比例只表示资料完整度，不代表病情好转、治疗成功率或临床风险。</p></Card>
 <Card className="p-5"><SectionTitle>病例闭环核对</SectionTitle><div className="grid gap-2 sm:grid-cols-2">{checks.map((x,i)=><div key={x.label} className={`rounded-xl border p-3 ${x.done?'border-[#b8d6c5] bg-[#f0f8f3]':'border-[#e2e5e3] bg-[#f7f8f7]'}`}><div className="flex items-center gap-2">{x.done?<CheckCircle2 size={17} className="text-[#287656]"/>:<span className="grid size-[17px] place-items-center rounded-full border text-[9px] text-[#8a958f]">{i+1}</span>}<b className="text-sm">{x.label}</b></div><p className="mt-2 text-xs leading-5 text-[#718078]">{x.detail}</p></div>)}</div></Card></div>
 <div className="grid gap-4 lg:grid-cols-[1fr_360px]"><Card className="p-5 sm:p-6"><SectionTitle>设置首个验证病例</SectionTitle><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">开始日期<input type="date" value={record.startDate} onChange={e=>setRecord({...record,startDate:e.target.value})} className="input"/></label><label className="text-sm font-semibold">计划复查日期<input type="date" value={record.reviewDate} onChange={e=>setRecord({...record,reviewDate:e.target.value})} className="input"/></label></div><label className="mt-4 block text-sm font-semibold">本周期验证目标<textarea value={record.goal} onChange={e=>setRecord({...record,goal:e.target.value})} rows={3} placeholder="例如：验证30天打卡完成率、异常转诊速度和复查资料完整度；不要填写降低死亡率等未经验证承诺" className="input resize-y leading-6"/></label><label className="mt-4 block text-sm font-semibold">病例备注<textarea value={record.notes} onChange={e=>setRecord({...record,notes:e.target.value})} rows={3} placeholder="记录医院方案、需要观察的指标和缺失资料" className="input resize-y leading-6"/></label><label className="mt-4 block text-sm font-semibold">医生审核状态<select value={record.doctorReview} onChange={e=>setRecord({...record,doctorReview:e.target.value as PilotRecord['doctorReview']})} className="input bg-white"><option>未提交</option><option disabled={profile.careAuthorization!=='verified'}>待医生审核</option><option disabled={profile.careAuthorization!=='verified'}>医生已确认</option></select></label><button onClick={save} disabled={!record.goal.trim()||!record.reviewDate} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#287656] py-3 font-semibold text-white disabled:bg-gray-300"><Save size={18}/>保存试点病例</button>{saved&&<p className="mt-3 rounded-lg bg-[#edf8f1] p-3 text-sm text-[#286d51]">已存档，可返回继续补充真实数据。</p>}</Card>
 <Card className="h-fit p-5"><SectionTitle>标准运行单元</SectionTitle><div className="space-y-3">{[[Database,'家庭记录','体重、饮水、尿团、进食和症状'],[ClipboardCheck,'AI整理','形成趋势摘要与红旗分流'],[Stethoscope,'医生审核','只审核需要临床判断的节点'],[FileCheck2,'复查回流','同单位比较，不自动宣称改善'],[Target,'结果验证','看完成率、复诊率和医生节省时间']].map(([Icon,title,text])=><div key={String(title)} className="flex gap-3 rounded-xl bg-[#f5f8f6] p-3"><Icon className="mt-0.5 shrink-0 text-[#287656]" size={18}/><div><b className="text-sm">{String(title)}</b><p className="mt-1 text-xs leading-5 text-[#718078]">{String(text)}</p></div></div>)}</div></Card></div>
 <Card className="border-[#ecd1cb] bg-[#fff7f5] p-4 text-sm leading-6 text-[#88514a]"><AlertTriangle className="mr-2 inline" size={18}/><b>试点成功不是“讲出一个感人故事”：</b>至少需要真实授权、明确基线、连续记录、医生确认和复查结果。没有这些资料时，系统只显示缺失项，不生成成功案例。</Card></div>;
}
