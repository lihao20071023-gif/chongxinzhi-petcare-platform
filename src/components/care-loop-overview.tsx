'use client';

import { useEffect,useMemo,useState } from 'react';
import { AlertTriangle,ArrowRight,CalendarCheck2,CheckCircle2,ClipboardCheck,FileSignature,HeartPulse,Stethoscope } from 'lucide-react';
import type { Tab } from './app-shell';
import type { PetProfile } from './pet-profile-context';
import type { DailyCheckIn } from '@/lib/daily-checkins';
import {
 getActiveCarePlan,getPendingCarePlan,loadCareAlerts,loadFollowupOutcomes,loadTaskCompletions,
 syncCareAdherenceAlerts,type CareAlert,type FollowupOutcome,type SignedCarePlan,type TaskCompletion,
} from '@/lib/care-coordination';

const localDateKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

type Props={pet:PetProfile;checkins:DailyCheckIn[];recordsReady:boolean;setTab:(tab:Tab)=>void;onPlanChange?:(plan:SignedCarePlan|null)=>void};

export function CareLoopOverview({pet,checkins,recordsReady,setTab,onPlanChange}:Props){
 const [plan,setPlan]=useState<SignedCarePlan|null>(null);const [pending,setPending]=useState<SignedCarePlan|null>(null);const [completions,setCompletions]=useState<TaskCompletion[]>([]);const [alerts,setAlerts]=useState<CareAlert[]>([]);const [outcomes,setOutcomes]=useState<FollowupOutcome[]>([]);
 useEffect(()=>{
  const active=getActiveCarePlan(pet.id);setPlan(active);setPending(getPendingCarePlan(pet.id));onPlanChange?.(active);
  if(active&&recordsReady)syncCareAdherenceAlerts({petId:pet.id,petName:pet.name,doctorName:active.doctorName,plan:active,checkins});
  setCompletions(loadTaskCompletions(pet.id));setAlerts(loadCareAlerts(pet.id));setOutcomes(loadFollowupOutcomes(pet.id));
 },[pet.id,pet.name,checkins,recordsReady,onPlanChange]);
 const today=localDateKey();
 const done=useMemo(()=>plan?completions.filter(x=>x.planId===plan.id&&x.date===today&&x.status==='completed'):[],[completions,plan,today]);
 const todayCheckin=checkins.find(x=>localDateKey(new Date(x.recordedAt))===today);
 const pendingAlerts=alerts.filter(x=>x.status==='pending');const latestAlert=pendingAlerts[0]||alerts[0];
 const outcome=plan?outcomes.find(x=>x.planId===plan.id):null;
 const alertTone=latestAlert?.level==='red'?'border-[#efb7b1] bg-[#fff4f2] text-[#9a4039]':latestAlert?.level==='orange'?'border-[#efcc9b] bg-[#fff8e9] text-[#91601d]':latestAlert?.level==='yellow'?'border-[#e7d8a8] bg-[#fffbed] text-[#80641f]':'border-[#cfe4d8] bg-[#f1f9f5] text-[#286e52]';
 const steps=[
  {title:'医生签署方案',detail:plan?`${plan.hospitalName} · ${plan.doctorName}医生 · v${plan.version}`:'等待已授权主治医生签署',state:plan?'完成':'待完成',Icon:FileSignature,action:()=>window.location.assign('hospital.html?view=orders')},
  {title:'执行今日护理',detail:plan?`${done.length}/${plan.tasks.length} 项完成${pending?` · v${pending.version}将于${pending.effectiveFrom}生效`:''}`:'签署后自动出现用药、饮食、补液与监测任务',state:plan&&done.length===plan.tasks.length?'完成':plan?'进行中':'未开始',Icon:ClipboardCheck,action:()=>setTab('care')},
  {title:'进入长期档案',detail:todayCheckin?`今天 ${new Date(todayCheckin.recordedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 已存档`:'30秒基础观察，无设备也能记录',state:todayCheckin?'完成':'待记录',Icon:HeartPulse,action:()=>setTab('monitor')},
  {title:'AI找变化并回传',detail:latestAlert?(latestAlert.status==='pending'?`${latestAlert.reason[0]} · 已进入医生队列`:`${latestAlert.reason[0]} · 医生已处理`):'只比较趋势、漏执行和风险，不修改医嘱',state:latestAlert?(latestAlert.status==='pending'?'待医生处理':'已处理'):'观察中',Icon:AlertTriangle,action:()=>window.location.assign('hospital.html?view=alerts')},
  {title:'复诊验证效果',detail:outcome?`${outcome.reviewDate} · ${outcome.conclusion} · ${outcome.doctorName}医生`:(plan?`计划复查：${plan.reviewDate}`:'由复查指标验证护理效果'),state:outcome?'已验证':plan?'待复查':'未开始',Icon:CalendarCheck2,action:()=>window.location.assign('hospital.html?view=followups')},
 ];
 return <section className="overflow-hidden rounded-[28px] border border-[#cfe2d8] bg-white shadow-[0_18px_50px_rgba(36,87,62,.08)]">
  <div className="flex flex-col gap-4 bg-[linear-gradient(135deg,#e6f5ed,#f8fcfa)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
   <div><div className="flex items-center gap-2 text-sm font-bold text-[#226e50]"><Stethoscope size={18}/>主治医生院后护理闭环</div><h2 className="mt-2 text-xl font-bold text-[#183c2e]">方案不是通用模板，而是为{pet.name}签署</h2><p className="mt-2 text-sm leading-6 text-[#60766b]">医生负责诊疗决策；AI只拆解、提醒、记录变化，并把需要处理的问题交回医生。</p></div>
   <a href="hospital.html?view=orders" className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#216e50] px-4 py-3 text-sm font-semibold text-white">进入医生签署端<ArrowRight size={16}/></a>
  </div>
  <div className="grid gap-0 divide-y divide-[#e5ece8] lg:grid-cols-5 lg:divide-x lg:divide-y-0">
   {steps.map(({title,detail,state,Icon,action},index)=><button key={title} onClick={action} className="group relative min-h-40 p-4 text-left transition hover:bg-[#f7fbf9] sm:p-5">
    <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-2xl bg-[#e8f3ed] text-[#277255]"><Icon size={19}/></span><span className="text-[11px] font-bold text-[#8a9891]">0{index+1}</span></div>
    <b className="mt-4 block text-sm text-[#274437]">{title}</b><p className="mt-2 min-h-10 text-xs leading-5 text-[#6d7e75]">{detail}</p>
    <span className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${state==='完成'||state==='已验证'||state==='已处理'?'bg-[#dff1e7] text-[#246d50]':state==='待医生处理'?'bg-[#ffe2de] text-[#9b4039]':'bg-[#fff2d9] text-[#8a5d1d]'}`}>{state==='完成'||state==='已验证'||state==='已处理'?<CheckCircle2 size={12}/>:null}{state}</span>
   </button>)}
  </div>
  {latestAlert&&<div className={`mx-5 mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${alertTone}`}><AlertTriangle className="mt-0.5 shrink-0" size={18}/><div><b>{latestAlert.status==='pending'?'医生待处理':'医生已处理'}：{latestAlert.reason[0]}</b><p className="mt-1 leading-5">接收人：{latestAlert.responsibleDoctor} · {latestAlert.level==='red'?'请立即线下就医，不等待线上回复':`处理目标：${new Date(latestAlert.responseDeadline).toLocaleString('zh-CN',{hour12:false})}`}</p></div></div>}
  <div className="border-t border-[#e5ece8] px-5 py-3 text-[11px] leading-5 text-[#78877f]">当前预览会把记录保存在本机浏览器；正式上线后由统一后端加密存储、医院权限隔离并推送提醒。</div>
 </section>;
}
