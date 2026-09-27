export type AcuteEventResult = {
  intercepted: boolean;
  level: 'critical'|'urgent'|'home-observation'|'none';
  response?: string;
  matched?: string[];
};

const severeToxins = ['人用感冒药','布洛芬','对乙酰氨基酚','葡萄','葡萄干','百合花','百合','清洁剂','消毒液','农药','杀虫剂','化学物品','防冻液'];

export function screenAcuteEvent(question:string): AcuteEventResult {
  const matched=severeToxins.filter(item=>question.includes(item));
  const ingestion=/不小心.{0,6}(喂|吃)|误食|误服|舔了/.test(question);
  if (ingestion && matched.length) return {
    intercepted:true, level:'critical', matched,
    response:`请立刻停止喂食，并立刻带上宠物和误食物品前往最近的24小时急诊宠物医院！\n\n途中安全步骤：\n1. 立即移走剩余物品，避免继续舔食。\n2. 保留原包装、成分表、剩余物和误食时间，拍照记录。\n3. 不要自行催吐，不要灌水、牛奶、油或其他“解毒”食物，也不要做腹部按压。\n4. 在出发途中电话联系急诊医院，说明宠物体重、误食物、估计数量和发生时间。`,
  };
  const clusteredSigns=[
    /食欲.{0,6}(下降|变差|不好)|吃得少/.test(question)&&'食欲下降',
    /呕吐|吐了/.test(question)&&'呕吐',
    /精神.{0,6}(萎靡|差)|躲着不动|躲起来/.test(question)&&'精神萎靡/躲藏',
    /体重.{0,10}(下降|减轻)|瘦了/.test(question)&&'近期体重下降',
    /尿色.{0,5}(加深|变深)|深黄色尿/.test(question)&&'尿色加深',
  ].filter(Boolean) as string[];
  if(clusteredSigns.length>=3){
    const baseline=question.match(/平时\s*(\d+(?:\.\d+)?)\s*kg/i);
    const loss=question.match(/下降(?:约)?\s*(\d+)\s*g/i);
    const baselineKg=baseline?Number(baseline[1]):undefined;
    const lossKg=loss?Number(loss[1])/1000:undefined;
    const lossPercent=baselineKg&&lossKg?(lossKg/baselineKg*100).toFixed(1):undefined;
    const trend=lossPercent?`主人报告体重约从 ${baselineKg}kg 降低 ${lossKg}kg，一周下降约 ${lossPercent}%，已经具有临床意义。`: '近期体重下降提示摄入不足、脱水或病情变化，需要与历史体重曲线核对。';
    const dataBoundary=baselineKg?`主人本次报告的平时体重为 ${baselineKg}kg；需要与带日期的真实称重记录核对。`:'当前描述没有提供可核对的体重基线，App也不会用演示数据补全。';
    return {intercepted:true,level:'urgent',matched:clusteredSigns,response:`⚠️ 这是紧急情况，请立即带宠物去动物医院，不要继续在家观察。

为什么紧急：目前同时出现${clusteredSigns.join('、')}。这种组合可能代表明显脱水、电解质紊乱、尿毒症相关胃肠反应、感染、胰腺或胃肠疾病，或AKI叠加CKD。${trend} 精神萎靡并躲着不动说明整体状态已经受到影响；尿色加深也需要结合尿量和脱水检查。${dataBoundary}

去医院前：
1. 先电话告知医院宠物种类、已确诊疾病、当前症状和开始时间，确认此刻可接诊后立即出发。
2. 带上全部化验报告、当前药物和最后给药时间、近7天体重/饮水/尿团记录，以及呕吐物照片。
3. 记录最后一次正常进食、饮水、排尿和排便时间。途中使用铺有吸水垫的航空箱，注意保暖、减少应激。
4. 不要强灌食物或大量水，不要自行使用人用止吐药，也不要因为呕吐而重复补服药物。

建议医院评估项目及目的：
• 体格检查与水合评估：判断脱水、循环状态、体温、口腔疼痛和腹部不适。
• 血常规：查看贫血、感染或炎症线索。
• 血液生化：复查肌酐、BUN、SDMA、血磷、血糖和肝胰相关指标，判断肾功能变化及其他原因。
• 电解质与酸碱：重点检查血钾、钠、钙及酸中毒，解释虚弱、呕吐和心律风险。
• 尿检：尿比重、沉渣、UP/C，必要时尿培养，用于评估浓缩能力、蛋白尿和感染。
• 血压与眼底：排查CKD相关高血压和靶器官损伤。
• 腹部超声：观察肾脏、尿路是否梗阻，并按医生判断评估胰腺和胃肠道。

后续护理：先按医院处理恶心、脱水和潜在诱因。恢复进食后通常采用少量多餐、适口的肾脏处方湿粮，记录实际摄入；所有药物继续、暂停或补服均由接诊兽医决定。回家后短期内每日记录食量、饮水、尿团、呕吐、精神，每天或按医生要求复测体重，并按复查计划复验肾指标、电解质和血压。

以上是风险分层和就医准备建议，不能替代兽医诊断。`};
  }
  if (/吐了.{0,3}[3三]次|连续呕吐|反复呕吐|呕吐物带血|咖啡渣|无法站立|抽搐|呼吸困难|张口呼吸|无尿|尿不出来|拒食.{0,5}24小时|严重精神萎靡|躲藏不动|体重.{0,6}(骤降|下降.{0,3}5%)|口腔.{0,4}(氨味|异味突然加重)/.test(question)) return {
    intercepted:true, level:'urgent',
    response:'⚠️ 请立即就医。连续呕吐或其他急症表现可能快速导致脱水、电解质紊乱或肾功能恶化。请带好检查报告、用药记录，记录最后一次进食、饮水、排尿和呕吐时间；途中保暖并减少应激，不要强行喂食喂水。',
  };
  if (/漏服|忘了喂/.test(question) && /降磷药|磷结合剂/.test(question)) return {
    intercepted:true, level:'home-observation',
    response:'如果只是漏服一顿磷结合剂，且猫咪精神、食欲和饮水正常，可以先观察，下一餐按原医嘱随餐服用。不要把漏掉的剂量叠加到下一次，也不要自行加倍。具体剂量请咨询主治兽医。',
  };
  return {intercepted:false,level:'none'};
}
