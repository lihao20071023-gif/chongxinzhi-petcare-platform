import { ragConfig } from './rag-config';
import { ckdQaKnowledge } from './ckd-qa-knowledge';
import { numberedProfessionalKnowledge } from './professional-ckd-numbered';
import { specialistCkdKnowledge } from './ckd-specialist-knowledge';
import { ckdKnowledgePoints15 } from './ckd-knowledge-points-15';

export type CkdModule = '用药'|'饮食'|'饮水'|'急症'|'风险因素'|'监测复查';
export type CkdKnowledgeChunk = { id:string; module:CkdModule; title:string; keywords:string[]; source:string; content:string };

export const professionalCkdKnowledge: CkdKnowledgeChunk[] = [
  { id:'medication-ckd', module:'用药', title:'CKD 用药与禁忌原则', keywords:['用药','磷结合剂','血压','蛋白尿','NSAIDs','疫苗','药量','剂量'], source:'IRIS治疗建议2023', content:'CKD 猫的用药管理应围绕血磷、血压、蛋白尿和并发症，由主治兽医根据分期与复查结果制定。磷结合剂通常需要随餐使用，是否启用及剂量取决于血磷与饮食控制效果。血压或蛋白尿异常可能需要针对性药物，但不能凭居家症状自行加减。NSAIDs 等可能影响肾脏灌注的药物需谨慎，疫苗也应结合年龄、病情稳定性和暴露风险评估。任何停药、补服或剂量改变都应先询问主治兽医。' },
  { id:'diet-ckd', module:'饮食', title:'CKD 处方饮食与食欲管理', keywords:['处方粮','饮食','吃多少','限磷','蛋白','湿粮','Omega-3','食欲','不吃'], source:'IRIS饮食建议 / Alexander等研究', content:'CKD 饮食管理通常优先限制磷摄入，同时提供适量、易消化的优质蛋白与足够能量，避免因过度限制导致消瘦。湿粮有助于增加总水分摄入，Omega-3 可作为营养方案的一部分，但应核对产品成分和兽医建议。处方粮每日克数不能只按体重固定套用，还需结合产品能量密度、体况和实际摄入。换粮宜循序渐进；出现持续拒食时，应优先保证能量摄入并尽快联系医院。' },
  { id:'hydration-ckd', module:'饮水', title:'饮水目标、补水技巧与脱水观察', keywords:['饮水','喝水','水少','补水','补液','皮下补液','脱水','尿团'], source:'IRIS尿液采集指南', content:'CKD 猫可把每日总水分约 50-60ml/kg 作为观察参考，但总量应包含主动饮水、湿粮水分和额外补水，并结合尿量、心脏情况和兽医方案调整。可通过多水碗、流动饮水器、温水湿粮等方式鼓励饮水。牙龈黏腻、皮肤回弹变慢、精神差或尿量明显改变可能提示脱水或病情变化。皮下补液存在容量与速度风险，只能依据兽医给定的剂量和频率执行。' },
  { id:'emergency-ckd', module:'急症', title:'CKD 急症红线与就医处理', keywords:['拒食24小时','无尿','尿少','抽搐','呼吸困难','呕吐','腹泻','无法站立','昏迷','急症','急性肾损伤'], source:'IRIS急性肾损伤 / 治疗建议', content:'CKD 猫出现拒食超过24小时、无尿或尿量骤减、抽搐、呼吸困难、无法站立、意识异常、持续严重呕吐腹泻、明显脱水、体温异常或快速恶化时，应立即就医。不要等待线上建议，也不要强行灌食灌水。途中保暖并减少应激，携带近期检查报告、用药清单、最后一次进食饮水和排尿时间，以及呕吐物照片或视频。向兽医说明症状开始时间、频率和近期趋势。' },
  { id:'risk-ckd', module:'风险因素', title:'CKD 风险因素与高风险宠物', keywords:['风险','年龄','老年','波斯','布偶','品种','合并症','药物风险'], source:'IRIS风险因素表2/表3', content:'CKD 风险会随年龄增长而增加，部分品种及存在遗传倾向的猫需要更早开始筛查。既往急性肾损伤、泌尿系统疾病、高血压、甲状腺问题、糖尿病、反复脱水和长期接触潜在肾毒性药物，也可能提高风险。风险因素不能用于确诊，但可以帮助决定筛查频率。老年猫或高风险品种若出现体重下降、多饮多尿、食欲变化，应结合血液、尿液和血压检查评估。' },
  { id:'monitoring-ckd', module:'监测复查', title:'CKD 复查指标与居家记录', keywords:['复查','监测','SDMA','UPC','肌酐','尿比重','体重趋势','记录','生化'], source:'IRIS分期与监测指南', content:'病情稳定的 CKD 猫通常需要按兽医安排每 3-6 个月复查，病情变化或调整方案后可能更频繁。复查可包含肌酐、SDMA、血磷、电解质、尿比重、尿蛋白肌酐比 UPC、血压与体重体况。单次指标不能替代趋势判断，SDMA 也需结合肌酐和尿检解读。主人可每日记录食欲、精神、饮水、尿团、排便、用药和呕吐，并在复查时提供连续数据。' },
];

function scoreChunk(question:string, chunk:CkdKnowledgeChunk) {
  const q=question.toLowerCase().replace(/\s+/g,'');
  const hits=chunk.keywords.filter(k=>q.includes(k.toLowerCase())).length;
  if (!hits) return 0;
  const exactTitle=q.includes(chunk.title.toLowerCase()) ? 0.15 : 0;
  return Math.min(1, 0.55 + hits*0.12 + exactTitle);
}

export function retrieveProfessionalKnowledge(question:string) {
  const allKnowledge:CkdKnowledgeChunk[]=[...ckdKnowledgePoints15,...professionalCkdKnowledge,...numberedProfessionalKnowledge,...specialistCkdKnowledge,...ckdQaKnowledge];
  const ranked=allKnowledge.map(chunk=>({chunk,score:scoreChunk(question,chunk)})).sort((a,b)=>b.score-a.score);
  const best=ranked[0];
  return { ...best, accepted: best.score >= ragConfig.minimumSimilarity };
}
