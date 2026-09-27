export type SymptomLogType='general'|'water_urine'|'vomiting';
export type SymptomLog={
 id:string;petId:string;type:SymptomLogType;occurredAt:string;recordedAt:string;title:string;description:string;
 waterMl:number|null;waterCompared:string;urineClumpCount:number|null;urineClumpCm:number|null;urineCompared:string;
 vomitCount:number|null;vomitAppearance:string;mealRelation:string;photoDataUrls:string[];photoNames:string[];
};
const key=(petId:string)=>`petcare-symptom-logs:${petId}`;
export function loadSymptomLogs(petId:string):SymptomLog[]{if(typeof window==='undefined')return[];try{return(JSON.parse(localStorage.getItem(key(petId))||'[]') as SymptomLog[]).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt))}catch{return[]}}
export function saveSymptomLog(log:SymptomLog){const next=[log,...loadSymptomLogs(log.petId).filter(x=>x.id!==log.id)].sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)).slice(0,500);localStorage.setItem(key(log.petId),JSON.stringify(next));return next}
