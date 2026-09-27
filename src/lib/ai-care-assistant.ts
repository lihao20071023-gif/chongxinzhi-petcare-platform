import { retrieveFromKnowledgeBase, routeKnowledgeBase, type KnowledgeBaseId } from './care-knowledge-bases';
import { careAssistantSystemPrompt } from './care-assistant-prompt';
import { retrieveProfessionalKnowledge } from './professional-ckd-knowledge';
import { screenAcuteEvent } from './acute-event-workflow';
import { retrieveOwnerEducation } from './owner-education-knowledge';
import { detectKnowledgeAudience } from './knowledge-audience-router';
import { searchProfessionalCareKnowledge } from './knowledge-search';
import { interpretIrisIndicators } from './iris-indicator-interpreter';
import { answerRoyalCaninQuestion } from './royal-canin-prescription-knowledge';
import { answerHillsQuestion } from './hills-prescription-knowledge';
export { careAssistantSystemPrompt } from './care-assistant-prompt';

export type ReplyKind = 'normal' | 'urgent' | 'out-of-scope' | 'insufficient-data';
export type CareReply = { kind: ReplyKind; text: string; knowledgeBase: KnowledgeBaseId; sourceTitle: string };
const formatCareReference=(match:ReturnType<typeof searchProfessionalCareKnowledge>[number])=>{
  const {entry}=match;
  return `【来源：${entry.source||entry.title}${entry.sourceYear?`，${entry.sourceYear}`:''}；适用：${entry.applicableTo||'见条目正文'}】`;
};

// Compatibility for legacy, currently unmounted views. It intentionally exposes no sample data.
export function buildCareContext(){return '未指定当前宠物，未读取任何个人打卡或报告数据。'}

const urgent = /无法站立|站不起来|重度呕吐|持续呕吐|严重腹泻|抽搐|呼吸困难|喘不过气|绝食|不吃.{0,4}24小时|24小时.{0,4}不吃/;
const outside = /骨科|骨折|关节脱位|心脏病|心衰|传染病|猫瘟|犬瘟|皮肤病|皮炎|真菌|耳螨/;
const diagnosis = /是不是得了|是否患有|能不能确诊|可以诊断|是不是.{0,8}(肾病|CKD)|得了.{0,8}病吗/;

export function generateCareReply(question: string): CareReply {
  const acute=screenAcuteEvent(question);
  if (acute.intercepted) return { kind: acute.level==='home-observation'?'normal':'urgent', knowledgeBase: acute.level==='home-observation'?'daily-management':'emergency-care', sourceTitle: acute.level==='home-observation'?'漏服磷结合剂居家处理':'急性事件安全拦截', text:acute.response! };
  const careMatches=searchProfessionalCareKnowledge(question,{limit:3});
  const irisAccepted=(careMatches[0]?.score||0)>=0.6;
  const careContext=careMatches.map(x=>x.entry.content).join('\n');
  const careReferences=careMatches.map(x=>x.entry.title).join('、');
  const careSourceLabels=careMatches.map(formatCareReference).join('\n');
  const professional = retrieveProfessionalKnowledge(question);
  const ownerAnswer = retrieveOwnerEducation(question);
  const audience = detectKnowledgeAudience(question);
  const ownerUrgent = /拒食24小时|无尿|尿不出来|抽搐|呼吸困难|频繁呕吐|立即去医院/.test(question);
  const dosageReminder = /剂量|多少片|多少毫升|补服|药量/.test(question) ? '具体剂量请咨询主治兽医。' : '';
  const baseId = routeKnowledgeBase(question);
  const source = retrieveFromKnowledgeBase(baseId, question);
  if (urgent.test(question)) return { kind: 'urgent', knowledgeBase: 'emergency-care', sourceTitle: source.title, text: `⚠️ 紧急情况！请立即带宝贝前往宠物医院！📋 提醒：请带好过往所有检查报告和用药记录。📍 途中注意保暖，减少应激。\n\n${source.guidance}` };
  if (outside.test(question)) return { kind: 'out-of-scope', knowledgeBase: baseId, sourceTitle: source.title, text: '这部分不属于我的慢病护理专长，建议咨询专业兽医。我更擅长的是猫咪慢性肾病（CKD）和老年病的日常护理。' };
  const hillsAnswer=answerHillsQuestion(question);
  if(hillsAnswer)return{kind:'normal',knowledgeBase:'daily-management',sourceTitle:'希尔斯兽医处方粮知识库（用户粘贴整理稿，重复已去除）',text:`${hillsAnswer}\n\n资料完整性说明：当前正文只覆盖6款完整犬用产品，并在l/d条目中途截断。具体可售型号、最新配方和使用期限以当地官方包装及主治兽医确认为准。`};
  const royalAnswer=answerRoyalCaninQuestion(question);
  if(royalAnswer)return{kind:'normal',knowledgeBase:'daily-management',sourceTitle:'皇家兽医处方粮知识库（用户上传整理稿，完整性已核验）',text:`${royalAnswer}\n\n资料优先级说明：以上内容优先检索您上传的皇家手册整理稿，并结合慢病营养安全规则解释。具体产品可售型号、最新配方、每日克数和使用期限应以当地官方包装及主治兽医确认为准。`};
  if (diagnosis.test(question)) return { kind: 'normal', knowledgeBase: 'core-ckd', sourceTitle: careMatches.length?careMatches.map(x=>`【${x.entry.id}】${x.entry.title}`).join(' · '):source.title, text: careMatches.length?`当前可做的是知识解读，不能仅凭这段描述确认患病。\n\n${careContext}\n\n${careSourceLabels}\n\n请补充猫或犬、症状起始时间、当前水合状态、带日期的肌酐/SDMA、尿比重、尿沉渣、UP/C、血压、影像和既往基线，由兽医排除AKI、脱水及尿路梗阻后确认。`:'当前知识库没有足够资料支持判断。请补充猫或犬、症状时间线、带日期的检查结果和既往基线，并由兽医完成诊断。' };
  const indicatorInterpretation=interpretIrisIndicators(question);
  if(indicatorInterpretation)return{kind:'normal',knowledgeBase:'core-ckd',sourceTitle:indicatorInterpretation.sourceTitle,text:indicatorInterpretation.text};
  if (!professional.accepted&&!irisAccepted) return { kind: 'insufficient-data', knowledgeBase: 'core-ckd', sourceTitle: 'RAG 匹配度低于 60%，已拒绝生成', text: '根据当前专业知识库，我没有检索到匹配度足够高的内容，因此不能可靠回答这个问题。建议补充是猫还是犬，以及更具体的症状、检查指标，或咨询主治兽医。' };
  if (audience==='professional') return { kind:'normal', knowledgeBase: professional.chunk.module==='急症'?'emergency-care':'core-ckd', sourceTitle:`【${professional.chunk.id}】${professional.chunk.title}${careReferences?` · ${careReferences}`:''}`, text:`专业知识库依据：${careContext||professional.chunk.content}\n\n知识库内容仅用于解释规则，不代表当前宠物的真实病历；个人数据以用户录入、上传并核对或医院授权同步为准。\n\n此内容不能替代临床检查与诊断。` };
  if (irisAccepted) return { kind:'normal', knowledgeBase: careMatches[0].entry.module==='emergency'?'emergency-care':'core-ckd', sourceTitle:careMatches.map(x=>`【${x.entry.id}】${x.entry.title}`).join(' · '), text:`知识库解读：${careContext}\n\n${careSourceLabels}\n\n适用前提和禁止推断以条目为准；我会结合宠物的物种、当前体重、体况和连续检查趋势解释，不能只看单次指标。涉及诊断、处方、药物剂量或补液方案，必须由主治兽医确认。` };
  if (ownerAnswer.accepted) return { kind: ownerUrgent?'urgent':'normal', knowledgeBase: ownerUrgent?'emergency-care':ownerAnswer.entry.module==='用药'||ownerAnswer.entry.module==='饮食'?'daily-management':'core-ckd', sourceTitle: `${ownerAnswer.entry.module}科普 · 内部依据【${professional.chunk.id}】${careReferences?` · 参考：${careReferences}`:''}`, text: ownerAnswer.entry.answer };
  if (!/饮水|喝水|尿|尿团|食欲|吃饭|进食|体重|呕吐|用药|喂药|打卡|精神|状态|CKD|肾|医院|处方粮|补液/.test(question)) return { kind: 'insufficient-data', knowledgeBase: baseId, sourceTitle: source.title, text: '根据你目前的打卡记录，我还没有看到相关数据。你能详细说说宝贝今天的情况吗？比如食欲、精神、饮水量？' };
  if (/饮水|喝水|尿|尿团/.test(question)) return { kind: 'normal', knowledgeBase: 'core-ckd', sourceTitle: `${professional.chunk.title} · ${professional.chunk.source}`, text: `${professional.chunk.content} ${dosageReminder}` };
  if (/吐药|喂药|喂不进去/.test(question)) return { kind: 'normal', knowledgeBase: 'daily-management', sourceTitle: `${professional.chunk.title} · ${professional.chunk.source}`, text: `${professional.chunk.content} ${dosageReminder}` };
  if (/呕吐/.test(question)) return { kind: 'normal', knowledgeBase: 'daily-management', sourceTitle: `${professional.chunk.title} · ${professional.chunk.source}`, text: `${professional.chunk.content} ${dosageReminder}` };
  return { kind: 'normal', knowledgeBase: baseId, sourceTitle: `${professional.chunk.title} · ${professional.chunk.source}`, text: `${professional.chunk.content} ${dosageReminder}` };
}
