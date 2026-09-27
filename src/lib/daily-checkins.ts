import type { DataProvenance } from './data-provenance';

export type DailyCheckIn={
 id:string;petId:string;recordedAt:string;weightKg:number|null;waterMl:number|null;extraHydrationMl:number|null;
 urineClumpCm:number|null;spirit:string;appetite:string;water:string;urine:string;stool:string;
 monitoringMode?:'basic'|'standard'|'professional';vomiting?:string;emergencySigns?:string[];caregiver?:string;
 bloodGlucose?:number|null;systolicBp?:number|null;urineTest?:string;
 riskAssessment?:{level:'red'|'orange'|'yellow'|'green';label:string;reasons:string[];action:string;responseHours:number;comparisons:{days:7|14|30;records:number;weightChangePct:number|null;waterChangePct:number|null}[]};
 provenance:DataProvenance;
};

export const dailyCheckinKey=(petId:string)=>`petcare-daily-checkins:${petId}`;

export function loadDailyCheckins(petId:string):DailyCheckIn[]{
 if(typeof window==='undefined')return[];
 try{return (JSON.parse(localStorage.getItem(dailyCheckinKey(petId))||'[]') as DailyCheckIn[]).sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt))}catch{return[]}
}

export function saveDailyCheckin(entry:DailyCheckIn){
 // Every submission is an immutable snapshot. Multiple records on the same day are retained.
 const next=[entry,...loadDailyCheckins(entry.petId).filter(x=>x.id!==entry.id)].sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt)).slice(0,1000);
 localStorage.setItem(dailyCheckinKey(entry.petId),JSON.stringify(next));
 return next;
}

export type MonitoringCycle=7|30|90;
export type MonitoringAnalysis={
 cycle:MonitoringCycle;records:number;weightChangeKg:number|null;waterChangeMl:number|null;
 concerningRecords:number;riskLevel:'稳定观察'|'需要关注'|'尽快联系医院';nextFollowUpAt:string;
 stageAssessment:string;summary:string;
};

const concernScore=(x:DailyCheckIn)=>[
 x.spirit==='没精神',x.appetite==='较差',x.water==='减少',x.urine==='减少',x.stool!=='正常'
].filter(Boolean).length;

export function analyzeMonitoringCycle(records:DailyCheckIn[],cycle:MonitoringCycle,verifiedStage?:string):MonitoringAnalysis{
 const cutoff=Date.now()-cycle*86400000;
 const scoped=records.filter(x=>new Date(x.recordedAt).getTime()>=cutoff).sort((a,b)=>a.recordedAt.localeCompare(b.recordedAt));
 const firstWeight=scoped.find(x=>x.weightKg!==null)?.weightKg??null;
 const lastWeight=scoped.slice().reverse().find(x=>x.weightKg!==null)?.weightKg??null;
 const firstWater=scoped.find(x=>x.waterMl!==null)?.waterMl??null;
 const lastWater=scoped.slice().reverse().find(x=>x.waterMl!==null)?.waterMl??null;
 const weightChangeKg=firstWeight!==null&&lastWeight!==null?Number((lastWeight-firstWeight).toFixed(2)):null;
 const waterChangeMl=firstWater!==null&&lastWater!==null?lastWater-firstWater:null;
 const concerningRecords=scoped.filter(x=>concernScore(x)>=2).length;
 const latest=scoped.at(-1);
 const latestScore=latest?concernScore(latest):0;
 const rapidWeightLoss=firstWeight!==null&&lastWeight!==null&&firstWeight>0&&(firstWeight-lastWeight)/firstWeight>=0.05;
 const riskLevel=latestScore>=3||rapidWeightLoss?'尽快联系医院':latestScore>=1||concerningRecords>=2?'需要关注':'稳定观察';
 const followUpDays=riskLevel==='尽快联系医院'?0:riskLevel==='需要关注'?3:7;
 const followUpBase=latest?new Date(latest.recordedAt).getTime():Date.now();
 const nextFollowUpAt=new Date(followUpBase+followUpDays*86400000).toISOString();
 const stageAssessment=verifiedStage&&verifiedStage!=='未填写'
  ?`档案中的已记录分期为${verifiedStage}；日常打卡只能评估护理风险，不能据此重新判定IRIS分期。分期调整需要稳定水合状态下的肌酐、SDMA，并结合UP/C、血压、尿检和兽医诊断。`
  :'当前没有经过确认的CKD分期。日常打卡不能单独判定IRIS 1-4期，需要带日期的肾功能、尿检、血压和兽医诊断。';
 const summary=scoped.length
  ?`${cycle}天内共有${scoped.length}条真实存档，${concerningRecords}条出现两项及以上异常。${weightChangeKg===null?'体重数据不足。':`体重变化${weightChangeKg>0?'+':''}${weightChangeKg}kg。`}${waterChangeMl===null?'饮水数据不足。':`主动饮水变化${waterChangeMl>0?'+':''}${waterChangeMl}ml。`}`
  :`${cycle}天内没有真实存档，暂时不能生成趋势结论。`;
 return{cycle,records:scoped.length,weightChangeKg,waterChangeMl,concerningRecords,riskLevel,nextFollowUpAt,stageAssessment,summary};
}
