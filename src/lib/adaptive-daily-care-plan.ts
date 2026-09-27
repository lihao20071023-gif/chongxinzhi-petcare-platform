import type { PetCareContext } from './care-workflow';

export function buildAdaptiveDailyCarePlan(question:string,context:PetCareContext){
 if(!context.today)return '当前没有已保存的今日打卡，暂不生成个体化今日方案。';
 const totalWater=(context.today.waterMl||0)+(context.today.extraHydrationMl||0);
 const hasWaterRecord=context.today.waterMl!==null||context.today.extraHydrationMl!==null;
 const waterLow=Boolean(context.today.weightKg)&&hasWaterRecord&&totalWater<(context.today.weightKg||0)*50;
 const weights=context.last7Days.filter(x=>x.weightKg!==null).slice().reverse();
 const falling=weights.length>=3&&weights.slice(-3).every((x,i,a)=>i===0||(x.weightKg||0)<(a[i-1].weightKg||0));
 const vomiting=/呕吐|吐了|吐黄水/.test(question);
 const appetiteLow=/食欲下降|食欲差|不太吃|吃得少|拒食/.test(question)||context.today.appetite!=='正常';
 const urineConcern=/尿少|无尿|尿不出|尿团变小/.test(question);
 const tired=/精神差|精神萎靡|躲着不动|没精神/.test(question);
 const concernCount=[waterLow,falling,vomiting,appetiteLow,urineConcern,tired].filter(Boolean).length;
 const level=concernCount>=3?'重点观察':concernCount?'加强监测':'常规维护';
 const food=appetiteLow||vomiting?'改为少量多餐，先记录每餐实际摄入；不要强灌或为了处方粮让宠物挨饿':'维持熟悉的肾脏饮食与固定餐次，记录实际吃完的份量';
 const hydration=!hasWaterRecord?'今天尚未填写饮水或额外补水量，请先补充真实记录；在数据缺失时不判断饮水是否充足':waterLow?`目前记录总水分约${totalWater}ml，低于按体重计算的观察起点约${Math.round((context.today.weightKg||0)*50)}ml；优先用湿粮、多水碗温和补充，不自行增加皮下补液`:`目前记录总水分约${totalWater}ml，继续分散提供新鲜水并观察尿量变化，不需要机械追求统一数值`;
 const weight=falling?'近3次体重呈下降趋势，今天固定时间复称一次，并联系主治兽医确认是否提前复查':'按同一时间、同一台秤继续记录体重趋势';
 const reassess=vomiting||appetiteLow||urineConcern||tired?'2-4小时后重新评估食欲、精神、饮水、呕吐和排尿；任何一项恶化立即联系医院':'今晚完成一次复盘，明早根据新打卡数据重新生成计划';
 return `🗓️ 今日个性护理计划 · ${level}\n\n上午\n- ${food}。\n- 按主治兽医已经确认的处方完成用药并打卡；吐药、漏服或状态变化时不要自行补服或加量。\n\n白天\n- ${hydration}。\n- 每次进食、饮水、排尿和呕吐都记录时间与数量；${urineConcern?'排尿异常属于优先观察项。':'同时观察尿团大小和排尿姿势。'}\n\n晚间\n- ${weight}。\n- 汇总今天的食欲、精神、总水分、尿团、症状与用药记录，作为明日计划的输入。\n\n🔄 动态调整节点\n${reassess}。系统下一次回答会读取最新打卡，重新调整饮食、饮水、监测和复查优先级。\n\n说明：这是基于当前记录生成的家庭护理安排，不改变兽医处方，也不能替代检查。`;
}
