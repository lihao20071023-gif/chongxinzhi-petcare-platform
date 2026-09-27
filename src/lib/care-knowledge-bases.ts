export type KnowledgeBaseId = 'core-ckd' | 'daily-management' | 'emergency-care';
export type KnowledgeEntry = { id: string; title: string; keywords: string[]; guidance: string };

export const coreCkdKnowledge: KnowledgeEntry[] = [
  { id: 'iris-stages', title: 'IRIS 分期与护理等级', keywords: ['IRIS', '分期', '肌酐', 'SDMA', '指标', '2.5'], guidance: 'IRIS 分期需要结合肌酐、SDMA、尿比重、血压和蛋白尿综合判断，不能只凭单个数值下结论。CKD 2期通常以规律复查、处方饮食、饮水管理和记录趋势为重点。' },
  { id: 'hydration', title: '每日补液与饮水管理', keywords: ['喝水', '饮水', '补液', '皮下补液', '水少'], guidance: '日常饮水目标需要结合体重、食物含水量、尿量和兽医方案计算。不要自行增加皮下补液剂量；记录主动饮水、湿粮水分、针管补水和尿团变化，比单次数字更有参考价值。' },
  { id: 'phosphorus', title: '高血磷危害', keywords: ['血磷', '磷', '高磷'], guidance: '持续高血磷会增加 CKD 管理难度，需要由兽医结合复查结果评估处方粮和磷结合剂。不要自行加大药物剂量。' },
  { id: 'lab-reading', title: '生化单阅读', keywords: ['生化', '化验', '肌酐', 'CREA', 'SDMA', '尿比重'], guidance: 'CREA 受肌肉量和脱水影响，SDMA 可辅助观察肾小球滤过趋势，尿比重反映浓缩能力；应结合同一宠物的历史趋势和临床状态阅读。' },
];

export const dailyManagementKnowledge: KnowledgeEntry[] = [
  { id: 'food', title: '处方粮喂养方法', keywords: ['处方粮', '吃多少', '喂多少', '饮食'], guidance: '处方粮应按兽医或产品能量密度计算的每日总量分餐喂食，保持固定配方并记录实际摄入。换粮建议循序渐进，拒食时优先联系医生，不要强行断食等待。' },
  { id: 'medicine', title: '喂药器使用方法', keywords: ['喂药', '药喂不进去', '喂药器', '用药'], guidance: '用喂药器时让猫咪保持自然坐姿，药物放在舌根侧后方，缓慢闭合嘴巴并观察吞咽；给少量水或湿粮作为后续。不要仰头灌药或把药片硬塞进气管方向。' },
  { id: 'vomit', title: '吐药后的处理', keywords: ['吐药', '呕吐', '补服'], guidance: '先记录给药时间、吐药时间和吐出的药物是否完整。不要因为不确定吸收量而立即补服或加倍；联系主治兽医确认是否补服，期间观察精神、饮水和是否继续呕吐。' },
  { id: 'daily-assessment', title: '排便排尿与精神评估', keywords: ['排便', '排尿', '尿团', '精神', '疼痛', '萎靡'], guidance: '每天记录食欲、精神、饮水、尿团数量和大小、排便形态。持续躲藏、弓背、触碰回避、明显不愿移动可能提示疼痛或不适，需要联系兽医评估。' },
];

export const emergencyKnowledge: KnowledgeEntry[] = [
  { id: 'red-flags', title: '必须立即就医的迹象', keywords: ['无法站立', '抽搐', '呼吸困难', '重度呕吐', '重度腹泻', '绝食', '无法排尿', '急性肾衰'], guidance: '出现无法站立、呼吸困难、抽搐、持续重度呕吐或腹泻、绝食超过24小时、反复干呕却无法排尿、明显意识异常时，不等待线上回复，立即前往宠物医院。' },
  { id: 'visit-prep', title: '就医前资料准备', keywords: ['去医院', '带什么', '检查报告', '就医'], guidance: '带好近期所有化验单和影像、用药名称及最后一次给药时间、饮水和排尿记录、呕吐物照片或视频、过敏史和既往病历。途中注意保暖、减少应激，不要强行喂食喂水。' },
  { id: 'vet-communication', title: '与兽医沟通清单', keywords: ['怎么说', '沟通', '医生'], guidance: '向兽医说明症状开始时间、频率、最近一次进食饮水、排尿排便、用药剂量和变化趋势，并直接询问是否需要急诊、补液、复查和住院观察。' },
];

export const knowledgeBases = { 'core-ckd': coreCkdKnowledge, 'daily-management': dailyManagementKnowledge, 'emergency-care': emergencyKnowledge } as const;

export function retrieveFromKnowledgeBase(baseId: KnowledgeBaseId, question: string) {
  const entries = knowledgeBases[baseId];
  const normalized = question.toLowerCase();
  return entries.find(entry => entry.keywords.some(keyword => normalized.includes(keyword.toLowerCase()))) || entries[0];
}

export function routeKnowledgeBase(question: string): KnowledgeBaseId {
  if (/无法站立|抽搐|呼吸困难|重度呕吐|重度腹泻|绝食.{0,5}24小时|无法排尿|急性肾衰/.test(question)) return 'emergency-care';
  if (/吐药|喂药|喂不进去|处方粮|吃多少|排便|排尿|尿团|精神|疼痛|萎靡/.test(question)) return 'daily-management';
  return 'core-ckd';
}
