'use client';
import { useState } from 'react';
import { ArrowRight,Compass,HeartPulse,MessageCircle,PawPrint,Send,ShieldAlert,Sparkles } from 'lucide-react';
import { generateCareReply,type ReplyKind } from '@/lib/ai-care-assistant';
import { runCareWorkflow } from '@/lib/care-workflow';
import { Card,PageTitle } from './ui';
import { usePetProfile } from './pet-profile-context';
import { buildAdaptiveDailyCarePlan } from '@/lib/adaptive-daily-care-plan';
import { navigateToFeature,resolveFeatureNavigation,type FeatureNavigation } from '@/lib/app-navigation';

type ChatMessage={role:'ai'|'user';text:string;kind:ReplyKind;action?:FeatureNavigation};
const suggestions=[
 '我的猫确诊 CKD，肌酐 2.3 mg/dL，SDMA 22，UP/C 0.35，这代表什么分期？',
 '我的狗 UP/C 0.7 是什么水平？',
 '猫 CKD 贫血 HCT 24% 该怎么看？',
 '猫 CKD 血压 170 mmHg 需要担心吗？',
];
const featureSuggestions=['我要上传检查报告','打开胰岛素记录','识别这款宠物粮','切换或新增宠物','联系人工客服','设置用药提醒'];

export function AiButlerPage(){
 const {profile}=usePetProfile();
 const welcome='你好！我是你的宠物CKD知识助手，基于IRIS国际标准帮你解读肾病指标。你可以把宝贝的检验报告数据告诉我（肌酐、SDMA、UP/C、血压等），我来帮你梳理目前处于哪个阶段、意味着什么。注意：我提供的是知识解读，不是诊断哦。😊';
 const serviceFacts=`医院：${profile.hospital||'未填写'}${profile.hospital&&profile.careAuthorization!=='verified'?'（用户记录，未连接）':''}；医生：${profile.doctor||'未填写'}；保障：${profile.insuranceProvider||'未填写'}`;
 const profileFacts=`当前真实档案：${profile.name} · ${profile.species==='cat'?'猫':'犬'} · ${profile.weight}kg · ${profile.disease||'未填写病种'} · ${profile.stage||'未填写分期'}\n${serviceFacts}`;
 const [messages,setMessages]=useState<ChatMessage[]>([{role:'ai',text:`${welcome}\n\n${profileFacts}\n当前尚未读取今日打卡；保存打卡后我才会用于个体分析。`,kind:'normal'}]);
 const [draft,setDraft]=useState('');
 const send=async(question?:string)=>{
  const text=question||draft.trim();if(!text)return;setDraft('');
  const feature=resolveFeatureNavigation(text);
  if(feature){setMessages(x=>[...x,{role:'user',text,kind:'normal'},{role:'ai',text:`已找到“${feature.label}”。点击下面的功能按钮即可直接进入，不需要自己在菜单里查找。\n\n${feature.description}`,kind:'normal',action:feature}]);return}
  const workflow=await runCareWorkflow(text,profile.id);
  const reply=generateCareReply(text);
  const labels={'core-ckd':'核心知识库','daily-management':'日常管理库','emergency-care':'紧急处理库'};
  const today=workflow.context.today;const cycle=workflow.context.monitoringCycles[0];
  const context=today?`真实数据 · 用户录入：最新体重 ${today.weightKg??'未填'}kg、主动饮水 ${today.waterMl??'未填'}ml、食欲${today.appetite}\n7天真实记录分析：${cycle.summary}\n护理风险区间：${cycle.riskLevel}`:workflow.context.dataNotice;
  const plan=reply.kind==='normal'&&today?`\n\n${buildAdaptiveDailyCarePlan(text,workflow.context)}`:'';
  const urgentAction:FeatureNavigation|undefined=reply.kind==='urgent'?{destination:'emergency-hospital',label:'立即查找24小时急诊医院',description:'只展示已核验急诊医院；优先显示未过期的实时接诊状态，且不展示广告'}:undefined;
  setMessages(x=>[...x,{role:'user',text,kind:'normal'},{role:'ai',text:`${reply.text}${plan}\n\n${context}\n分期边界：日常记录不能单独改变IRIS分期，需由稳定状态下的化验和兽医确认。\n当前服务资料：${serviceFacts}\n知识依据：${labels[reply.knowledgeBase]} · ${reply.sourceTitle}\n数据边界：系统未调用互联网补全${profile.name}的个人信息；未验证机构不会被称为合作方。`,kind:reply.kind,action:urgentAction}]);
 };
 return <>
  <section className="soft-grid mb-5 overflow-hidden rounded-3xl border border-[#cfe7dc] bg-[#e4f5ed] p-5 sm:p-6"><div className="flex items-center gap-4"><span className="relative grid size-16 shrink-0 place-items-center rounded-[22px] bg-white text-[#287657] shadow-sm"><PawPrint size={30}/><HeartPulse className="absolute -bottom-1 -right-1 rounded-full bg-[#efb45d] p-1 text-white" size={22}/></span><div><p className="text-xs font-semibold text-[#36765a]">{profile.name}的专属护理搭档</p><h1 className="mt-1 text-2xl font-bold text-[#193c2d]">宠馨智 AI 管家</h1><p className="mt-1 text-sm leading-6 text-[#587469]">读懂医生方案，整理每天记录，发现变化及时提醒</p></div></div></section>
  <Card className="mb-4 border-[#d9e8de] bg-[#f7fbf9] p-4"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 shrink-0 text-[#2b7958]" size={19}/><div className="text-sm leading-6 text-[#4c6256]"><b>我能帮你做什么</b><p className="mt-1">解释指标、整理真实记录、生成护理摘要；知识库不会冒充宠物病历。</p><p>诊疗决定和处方调整由兽医确认，我负责让回家后的照护更容易执行。</p></div></div></Card>
  <Card className="mb-4 p-4"><div className="flex items-center gap-2"><MessageCircle size={18} className="text-[#287656]"/><h2 className="font-bold">你可以这样问我</h2></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{suggestions.map(q=><button key={q} onClick={()=>send(q)} className="rounded-xl border border-[#d9e5de] bg-[#f8fbf9] p-3 text-left text-sm leading-6 text-[#40564a] transition hover:border-[#87b49d] hover:bg-[#eff7f2]">“{q}”</button>)}</div></Card>
  <Card className="mb-4 p-4"><div className="flex items-center gap-2"><Compass size={18} className="text-[#3f718e]"/><h2 className="font-bold">找不到功能？直接告诉我</h2></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{featureSuggestions.map(q=><button key={q} onClick={()=>send(q)} className="shrink-0 rounded-full border border-[#cddce5] bg-[#f3f8fb] px-3 py-2 text-xs font-semibold text-[#3e6c87]">{q}</button>)}</div></Card>
  <div className="mb-4 flex gap-3 rounded-2xl border border-[#efd3a5] bg-[#fff8ea] p-4 text-[#76501e]"><ShieldAlert className="mt-0.5 shrink-0" size={20}/><p className="text-sm"><b>AI管家专业边界：</b>不诊断、不改药；只解释指标、整理趋势并执行医生已确认的护理方案。危险症状会优先提示立即就医。</p></div>
  <Card className="flex h-[640px] flex-col overflow-hidden"><div className="flex items-center gap-3 border-b border-[#e4ebe6] bg-[#f5fbf8] p-4"><span className="grid size-11 place-items-center rounded-2xl bg-[#287656] text-white"><PawPrint size={21}/></span><div><h2 className="font-bold">宠馨智正在陪护</h2><p className="text-xs text-[#6f7e76]"><span className="mr-1 inline-block size-2 rounded-full bg-[#55a477]"/>已载入{profile.name}的真实档案</p></div></div><div className="flex-1 overflow-y-auto bg-[#fafcfb] p-4 sm:p-6">{messages.map((m,i)=><div key={i} className={`mb-4 max-w-[92%] ${m.role==='user'?'ml-auto':''}`}><div className={`whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${m.role==='user'?'rounded-tr-sm bg-[#2d795a] text-white':m.kind==='urgent'?'border-2 border-[#e26c5f] bg-[#fff0ed] font-semibold text-[#a23f36]':m.kind==='out-of-scope'||m.kind==='insufficient-data'?'border border-[#d8dfdc] bg-[#f0f3f1] text-[#5d6b64]':'rounded-tl-sm border border-[#e1e9e4] bg-white text-[#405248]'}`}>{m.text}</div>{m.action&&<button onClick={()=>navigateToFeature(m.action!.destination)} className="mt-2 flex w-full items-center justify-between rounded-xl border border-[#a9cdbc] bg-[#eaf6ef] px-4 py-3 text-left text-sm font-semibold text-[#24694d]"><span>{m.action.label}</span><ArrowRight size={18}/></button>}</div>)}</div><div className="border-t border-[#e3eae5] bg-white p-3"><p className="mb-2 text-center text-[11px] text-[#829087]">可以问健康问题，也可以直接说“打开报告识别”</p><div className="flex gap-2"><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={`说说${profile.name}今天怎么样…`} className="min-w-0 flex-1 rounded-2xl border border-[#d8e2dc] bg-[#f8faf9] px-4 outline-none focus:border-[#3b8063]"/><button onClick={()=>send()} aria-label="发送" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#287656] text-white shadow-sm"><Send size={19}/></button></div></div></Card>
 </>;
}
