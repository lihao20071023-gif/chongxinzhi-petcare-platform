import { professionalCareKnowledge, type KnowledgeBaseEntry, type KnowledgeModule } from './knowledge-base';

export type KnowledgeMatch={entry:KnowledgeBaseEntry;score:number;matchedKeywords:string[]};
const normalize=(text:string)=>text.toLowerCase().replace(/[\s，。？！、：；（）()]/g,'');
export function detectKnowledgeModule(question:string):KnowledgeModule|undefined {
  if(/急症|紧急|拒食|持续呕吐|反复呕吐|抽搐|呼吸困难|无尿|少尿|尿不出来|无法站立|意识异常|突然失明|急性恶化/.test(question))return'emergency';
  if(/诊断|确诊|分期|亚分期|鉴别|AKI|急性肾损伤|慢性证据|持续异常|一次.*肌酐|肌酐.*一次|肌酐|SDMA|UPCR|UPC|UP\/C|尿比重|肾脏结构|肾脏缩小|急慢性|复查|监测|血压|口腔|生活质量|体况|BCS|健康档案|偏瘦|超重|肥胖|肋骨|混种|串串|血统|体型差异|骨架/i.test(question))return'monitoring';
  if(/药|磷结合剂|贝那普利|营养品|剂量|喂药/.test(question))return'medication';
  if(/吃|粮|饮食|零食|蛋白|食欲|罐头|热量|kcal|多少克|喂食量|进食量/.test(question))return'diet';
  if(/水|脱水|饮水|补液|尿量|水碗|饮水器|猫砂盆|称重设备|硬件数据/.test(question))return'hydration';
}
export function searchProfessionalCareKnowledge(question:string,options?:{module?:KnowledgeModule;limit?:number}):KnowledgeMatch[]{
  const q=normalize(question);const module=options?.module||detectKnowledgeModule(question);const pool=module?professionalCareKnowledge.filter(x=>x.module===module):professionalCareKnowledge;
  const asksDog=/犬|狗/.test(question);const asksCat=/猫/.test(question);
  return pool.map(entry=>{const matched=entry.keywords.filter(k=>!['犬','狗','猫'].includes(k)&&q.includes(normalize(k)));const titleHit=q.includes(normalize(entry.title))||normalize(entry.title).includes(q);const hasSemanticHit=matched.length>0||titleHit;if(!hasSemanticHit)return{entry,score:0,matchedKeywords:matched};const emergencyBoost=entry.module==='emergency'&&matched.length?.2:0;const speciesBoost=(asksDog&&/犬|狗/.test(entry.title)||asksCat&&/猫/.test(entry.title))?.16:0;const irisBoost=entry.id.startsWith('IRIS-2026')&&matched.length?.08:0;const specificMatchBoost=matched.some(k=>normalize(k).length>=6)?.25:0;const score=Math.min(1,matched.length*.22+(titleHit?.28:0)+(entry.module===module?.08:0)+emergencyBoost+speciesBoost+irisBoost+specificMatchBoost);return{entry,score,matchedKeywords:matched};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,options?.limit||3);
}
