import type { DailyCheckIn } from './daily-checkins';

export type CareTaskCategory='用药'|'饮食'|'补液'|'监测'|'复查'|'活动'|'其他';
export type RiskLevel='red'|'orange'|'yellow'|'green';

export type CareTask={
 id:string;category:CareTaskCategory;title:string;time:string;frequency:string;instructions:string;required:boolean;
};

export type SignedCarePlan={
 id:string;petId:string;petName:string;disease:string;stage:string;doctorName:string;hospitalName:string;
 startDate:string;reviewDate:string;effectiveFrom:string;signedAt:string;version:number;changeReason:string;
 sourceOrder:string;aiScope:string;contactRules:string;status:'signed'|'superseded';tasks:CareTask[];
 thresholds:{weightLossPct7d:number;waterChangePct7d:number};
};

export type TaskCompletion={
 id:string;petId:string;planId:string;planVersion:number;taskId:string;taskTitle:string;date:string;
 status:'completed'|'skipped';completedAt:string;caregiver:string;note:string;
};

export type CareAlert={
 id:string;petId:string;petName:string;level:RiskLevel;reason:string[];source:'health_checkin'|'task_adherence'|'manual';
 triggeredAt:string;status:'pending'|'reviewed';responsibleDoctor:string;responseDeadline:string;response?:string;reviewedAt?:string;
};

export type FollowupOutcome={
 id:string;petId:string;planId:string;recordedAt:string;doctorName:string;reviewDate:string;
 conclusion:'改善'|'稳定'|'需要调整';metrics:string;summary:string;
};

export type AuditEvent={id:string;petId:string;at:string;actor:string;action:string;detail:string};

const PLAN_KEY='petcare-signed-care-plans-v1';
const COMPLETION_KEY='petcare-care-task-completions-v1';
const ALERT_KEY='petcare-care-alerts-v1';
const OUTCOME_KEY='petcare-followup-outcomes-v1';
const AUDIT_KEY='petcare-care-audit-v1';
const CAREGIVER_PREFIX='petcare-caregivers:';

function readList<T>(key:string):T[]{
 if(typeof window==='undefined')return[];
 try{return JSON.parse(localStorage.getItem(key)||'[]') as T[]}catch{return[]}
}
function writeList<T>(key:string,value:T[]){if(typeof window!=='undefined')localStorage.setItem(key,JSON.stringify(value))}
const todayKey=()=>new Date().toISOString().slice(0,10);

export function loadCarePlans(petId?:string){const list=readList<SignedCarePlan>(PLAN_KEY);return (petId?list.filter(x=>x.petId===petId):list).sort((a,b)=>b.version-a.version)}
export function getActiveCarePlan(petId:string,date=todayKey()){
 return loadCarePlans(petId).filter(x=>x.status==='signed'&&x.effectiveFrom<=date).sort((a,b)=>b.version-a.version)[0]||null;
}
export function getPendingCarePlan(petId:string,date=todayKey()){
 return loadCarePlans(petId).filter(x=>x.status==='signed'&&x.effectiveFrom>date).sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom))[0]||null;
}
export function saveSignedCarePlan(input:Omit<SignedCarePlan,'id'|'signedAt'|'version'|'status'>){
 const all=readList<SignedCarePlan>(PLAN_KEY);const previous=all.filter(x=>x.petId===input.petId);const version=Math.max(0,...previous.map(x=>x.version))+1;
 const plan:SignedCarePlan={...input,id:`plan-${Date.now()}`,signedAt:new Date().toISOString(),version,status:'signed'};
 writeList(PLAN_KEY,[plan,...all]);appendAudit(plan.petId,input.doctorName,'签署护理方案',`方案v${version}，${plan.tasks.length}项任务，${plan.effectiveFrom}生效`);return plan;
}

export function parseDoctorOrderToTasks(text:string):CareTask[]{
 const lines=text.split(/\n|；|;/).map(x=>x.trim()).filter(Boolean);
 return lines.map((line,index)=>{
  const category:CareTaskCategory=/药|片|胶囊|滴/.test(line)?'用药':/记录|观察|监测|体重|称重|尿量|尿团|血糖|血压/.test(line)?'监测':/粮|餐|喂食|饮食方案/.test(line)?'饮食':/补液|补水|饮水/.test(line)?'补液':/复查|返院|化验/.test(line)?'复查':/活动|散步|运动/.test(line)?'活动':'其他';
  const time=line.match(/(?:早上|上午|中午|下午|晚上|睡前|\d{1,2}[:：]\d{2})/)?.[0]||'按医嘱时段';
  const frequency=line.match(/(?:每日\d次|每天\d次|每\d+小时|每周\d次|每日|每天|按需)/)?.[0]||'按本条说明';
  return{id:`task-${Date.now()}-${index}`,category,title:`${category}任务`,time,frequency,instructions:line,required:true};
 });
}

export function loadTaskCompletions(petId?:string){const list=readList<TaskCompletion>(COMPLETION_KEY);return (petId?list.filter(x=>x.petId===petId):list).sort((a,b)=>b.completedAt.localeCompare(a.completedAt))}
export function saveTaskCompletion(entry:Omit<TaskCompletion,'id'|'completedAt'>){
 const list=readList<TaskCompletion>(COMPLETION_KEY);const same=list.find(x=>x.petId===entry.petId&&x.date===entry.date&&x.taskId===entry.taskId);
 const value:TaskCompletion={...entry,id:same?.id||`done-${Date.now()}`,completedAt:new Date().toISOString()};
 const next=[value,...list.filter(x=>x.id!==same?.id)];writeList(COMPLETION_KEY,next);appendAudit(entry.petId,entry.caregiver,entry.status==='completed'?'完成护理任务':'标记未执行',entry.taskTitle);return value;
}

export function loadCareAlerts(petId?:string){const list=readList<CareAlert>(ALERT_KEY);return (petId?list.filter(x=>x.petId===petId):list).sort((a,b)=>b.triggeredAt.localeCompare(a.triggeredAt))}
export function createCareAlert(input:Omit<CareAlert,'id'|'triggeredAt'|'status'>){
 if(input.level==='green')return null;
 const list=readList<CareAlert>(ALERT_KEY);const dedupe=list.find(x=>x.petId===input.petId&&x.status==='pending'&&x.reason.join('|')===input.reason.join('|'));
 if(dedupe)return dedupe;
 const alert:CareAlert={...input,id:`alert-${Date.now()}`,triggeredAt:new Date().toISOString(),status:'pending'};writeList(ALERT_KEY,[alert,...list]);appendAudit(input.petId,'宠馨智风险分流','生成待处理提醒',`${input.level}：${input.reason.join('；')}`);return alert;
}
export function reviewCareAlert(id:string,response:string,doctor:string){
 const list=readList<CareAlert>(ALERT_KEY);const next=list.map(x=>x.id===id?{...x,status:'reviewed' as const,response,reviewedAt:new Date().toISOString(),responsibleDoctor:doctor||x.responsibleDoctor}:x);writeList(ALERT_KEY,next);
 const item=next.find(x=>x.id===id);if(item)appendAudit(item.petId,doctor||'医生','处理风险提醒',response);return item||null;
}

export function loadFollowupOutcomes(petId?:string){const list=readList<FollowupOutcome>(OUTCOME_KEY);return (petId?list.filter(x=>x.petId===petId):list).sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt))}
export function saveFollowupOutcome(input:Omit<FollowupOutcome,'id'|'recordedAt'>){const item:FollowupOutcome={...input,id:`outcome-${Date.now()}`,recordedAt:new Date().toISOString()};writeList(OUTCOME_KEY,[item,...readList<FollowupOutcome>(OUTCOME_KEY)]);appendAudit(input.petId,input.doctorName,'记录复诊结果',`${input.conclusion}：${input.summary}`);return item}

export function appendAudit(petId:string,actor:string,action:string,detail:string){const event:AuditEvent={id:`audit-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,petId,at:new Date().toISOString(),actor,action,detail};writeList(AUDIT_KEY,[event,...readList<AuditEvent>(AUDIT_KEY)].slice(0,3000));return event}
export function loadAuditEvents(petId?:string){const list=readList<AuditEvent>(AUDIT_KEY);return petId?list.filter(x=>x.petId===petId):list}

export function loadCaregivers(petId:string){const list=readList<string>(`${CAREGIVER_PREFIX}${petId}`);return list.length?list:['我']}
export function saveCaregivers(petId:string,names:string[]){const cleaned=[...new Set(names.map(x=>x.trim()).filter(Boolean))];writeList(`${CAREGIVER_PREFIX}${petId}`,cleaned.length?cleaned:['我']);return cleaned}

const localDateKey=(date=new Date())=>{
 const year=date.getFullYear();const month=String(date.getMonth()+1).padStart(2,'0');const day=String(date.getDate()).padStart(2,'0');
 return `${year}-${month}-${day}`;
};

const taskDueMinutes=(time:string)=>{
 const exact=time.match(/(\d{1,2})[:：](\d{2})/);if(exact)return Number(exact[1])*60+Number(exact[2]);
 if(/早上|上午/.test(time))return 10*60;if(/中午/.test(time))return 13*60;if(/下午/.test(time))return 18*60;if(/晚上|睡前/.test(time))return 21*60;
 return null;
};

/**
 * Creates idempotent, low-priority adherence reminders for the doctor queue.
 * In production this should run in a scheduled backend job; the static prototype
 * runs it when the owner opens the app so the complete workflow can be verified.
 */
export function syncCareAdherenceAlerts(input:{petId:string;petName:string;doctorName:string;plan:SignedCarePlan;checkins:DailyCheckIn[]}){
 const now=new Date();const today=localDateKey(now);const minute=now.getHours()*60+now.getMinutes();const reasons:string[]=[];
 if(input.plan.startDate>today)return [];
 const todayCheckin=input.checkins.some(x=>localDateKey(new Date(x.recordedAt))===today);
 if(!todayCheckin&&minute>=18*60)reasons.push('今日健康状态尚未记录');
 const completions=loadTaskCompletions(input.petId).filter(x=>x.planId===input.plan.id&&x.date===today&&x.status==='completed');
 const completedIds=new Set(completions.map(x=>x.taskId));
 input.plan.tasks.forEach(task=>{const due=taskDueMinutes(task.time);if(task.required&&due!==null&&minute>due+30&&!completedIds.has(task.id))reasons.push(`${task.time} · ${task.title}尚未完成`)});
 const hasOutcome=loadFollowupOutcomes(input.petId).some(x=>x.planId===input.plan.id&&x.reviewDate>=input.plan.reviewDate);
 if(input.plan.reviewDate<=today&&!hasOutcome)reasons.push(`计划复诊日 ${input.plan.reviewDate} 已到，尚未录入复诊结果`);
 return reasons.map(reason=>createCareAlert({petId:input.petId,petName:input.petName,level:'yellow',reason:[reason],source:'task_adherence',responsibleDoctor:input.doctorName||'待医院分配',responseDeadline:new Date(Date.now()+24*3600000).toISOString()})).filter(Boolean);
}

export type RiskAssessment={level:RiskLevel;label:string;reasons:string[];action:string;responseHours:number;comparisons:{days:7|14|30;records:number;weightChangePct:number|null;waterChangePct:number|null}[]};
export function assessCheckinRisk(current:DailyCheckIn,history:DailyCheckIn[],plan:SignedCarePlan|null):RiskAssessment{
 const prior=history.filter(x=>x.id!==current.id&&x.recordedAt<current.recordedAt);
 const comparisons=([7,14,30] as const).map(days=>{
  const cutoff=new Date(current.recordedAt).getTime()-days*86400000;const scoped=prior.filter(x=>new Date(x.recordedAt).getTime()>=cutoff);
  const weights=scoped.map(x=>x.weightKg).filter((x):x is number=>x!==null);const waters=scoped.map(x=>x.waterMl).filter((x):x is number=>x!==null);
  const baselineWeight=weights.length?weights.reduce((a,b)=>a+b,0)/weights.length:null;const baselineWater=waters.length?waters.reduce((a,b)=>a+b,0)/waters.length:null;
  return{days,records:scoped.length,weightChangePct:baselineWeight&&current.weightKg!==null?Number(((current.weightKg-baselineWeight)/baselineWeight*100).toFixed(1)):null,waterChangePct:baselineWater&&current.waterMl!==null?Number(((current.waterMl-baselineWater)/baselineWater*100).toFixed(1)):null};
 });
 const reasons:string[]=[];let level:RiskLevel='green';
 const emergency=(current.emergencySigns||[]).filter(Boolean);
 if(emergency.length||/无尿|尿不出/.test(current.urine)||current.vomiting==='频繁呕吐'){level='red';reasons.push(...emergency, ...( /无尿|尿不出/.test(current.urine)?['排尿出现紧急变化']:[]),...(current.vomiting==='频繁呕吐'?['频繁呕吐']:[]));}
 const seven=comparisons[0];const weightLimit=plan?.thresholds.weightLossPct7d||5;const waterLimit=plan?.thresholds.waterChangePct7d||30;
 if(level!=='red'&&((seven.weightChangePct!==null&&seven.weightChangePct<=-weightLimit)||(seven.waterChangePct!==null&&Math.abs(seven.waterChangePct)>=waterLimit))){level='orange';reasons.push('7天趋势超过医生设定的个体变化范围')}
 const latestAbnormal=current.spirit==='没精神'||current.appetite==='较差'||current.vomiting==='有呕吐';
 const priorAbnormal=prior.slice(0,2).some(x=>x.spirit==='没精神'||x.appetite==='较差'||x.vomiting==='有呕吐'||x.vomiting==='频繁呕吐');
 if(level==='green'&&latestAbnormal&&priorAbnormal){level='orange';reasons.push('相似异常连续出现，需要医生复核')}
 if(level==='green'&&latestAbnormal){level='yellow';reasons.push('本次出现需要关注的状态变化')}
 if(!reasons.length)reasons.push('本次未发现超过个体趋势范围的明显变化');
 const config={red:{label:'红色 · 疑似紧急',action:'不要等待线上回复，请立即联系急诊医院。',responseHours:0},orange:{label:'橙色 · 医生复核',action:'已进入医生待处理队列，建议今天联系主治医院。',responseHours:4},yellow:{label:'黄色 · 继续观察',action:'继续按方案记录；若持续或加重，联系主治医生。',responseHours:24},green:{label:'绿色 · 当前稳定',action:'继续执行医生签署的护理方案。',responseHours:48}}[level];
 return{level,reasons,comparisons,...config};
}
