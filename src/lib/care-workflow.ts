import { careAssistantSystemPrompt } from './care-assistant-prompt';
import { detectKnowledgeAudience } from './knowledge-audience-router';
import { analyzeMonitoringCycle,loadDailyCheckins,type DailyCheckIn,type MonitoringAnalysis } from './daily-checkins';
import type { MedicalReportAnalysis } from './medical-report-analyzer';
import { loadSymptomLogs,type SymptomLog } from './symptom-logs';

export type PetCareContext={
 petId:string;collectedAt:string;today:DailyCheckIn|null;last7Days:DailyCheckIn[];
 latestReport:MedicalReportAnalysis|null;
 monitoringCycles:MonitoringAnalysis[];
 recentSymptomLogs:SymptomLog[];
 dataNotice:string;
};

export function collectPetCareContext(petId:string):PetCareContext{
 const checkins=loadDailyCheckins(petId);
 let reports:MedicalReportAnalysis[]=[];
 if(typeof window!=='undefined'){try{reports=JSON.parse(localStorage.getItem(`petcare-medical-reports:${petId}`)||'[]')}catch{reports=[]}}
 const todayKey=new Date().toISOString().slice(0,10);
 const cutoff=Date.now()-7*86400000;
 const today=checkins.find(x=>x.recordedAt.slice(0,10)===todayKey)||null;
 const monitoringCycles=([7,30,90] as const).map(days=>analyzeMonitoringCycle(checkins,days));
 const recentSymptomLogs=loadSymptomLogs(petId).slice(0,20);
 return {petId,collectedAt:new Date().toISOString(),today,last7Days:checkins.filter(x=>new Date(x.recordedAt).getTime()>=cutoff),latestReport:reports[0]||null,monitoringCycles,recentSymptomLogs,dataNotice:today?`已读取当前宠物由用户保存的今日打卡；7天周期：${monitoringCycles[0].summary}；症状日志${recentSymptomLogs.length}条。`:`当前只读取到宠物基础档案；症状日志${recentSymptomLogs.length}条，尚无今日打卡数据。`};
}

export function buildCareWorkflowPrompt(question:string,context:PetCareContext){
 return {system:careAssistantSystemPrompt,user:question,audience:detectKnowledgeAudience(question),petContext:context,instruction:'仅使用当前宠物已保存且标明来源的数据。知识库只用于解释规则，不属于个人病历。不得用模板、演示或互联网内容补全缺失字段；缺失时必须明确说明。OCR未核对内容不得称为医院确诊数据。'};
}

export async function runCareWorkflow(question:string,petId=''){const context=collectPetCareContext(petId);return{context,prompt:buildCareWorkflowPrompt(question,context)}}
