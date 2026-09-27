export const pet = {
  id: 'pet-tuanzai', name: '团仔', breed: '英国短毛猫', age: '5岁2个月', gender: '公', weight: 5.2,
  disease: '猫慢性肾病（CKD）', stage: 'IRIS 2期', diagnosedAt: '2025年3月12日', hospital: '安心动物医院', doctor: '周宁 主治医师',
  avatar: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=500&q=90',
};

export const medications = [
  { id: 'm1', name: '碳酸镧咀嚼片', dose: '1/4片', frequency: '随餐，每日2次', time: '08:00', note: '与食物充分混合' },
  { id: 'm2', name: '替米沙坦口服液', dose: '0.5 ml', frequency: '每日1次', time: '20:00', note: '给药后观察精神状态' },
  { id: 'm3', name: '肾脏营养补充剂', dose: '1粒', frequency: '每日1次', time: '20:30', note: '可拌入湿粮' },
];

export const weightData = [
  { date: '7/14', weight: 5.35, creatinine: 178 }, { date: '7/15', weight: 5.32, creatinine: 176 },
  { date: '7/16', weight: 5.28, creatinine: 179 }, { date: '7/17', weight: 5.25, creatinine: 181 },
  { date: '7/18', weight: 5.24, creatinine: 180 }, { date: '7/19', weight: 5.22, creatinine: 177 },
  { date: '今天', weight: 5.2, creatinine: 175 },
];

export const homeCareData = {
  todayWeight: 4.8,
  waterMl: 250,
  extraHydrationMl: 35,
  urineClumpSize: '中等（约 4.5cm）',
  appetite: '正常',
  lastUpdated: '今天 08:40',
};

export const symptomLogs = [
  { date: '7/6', title: '多饮多尿', detail: '饮水约 320ml，尿团明显增大', severity: '需关注' },
  { date: '6/29', title: '呕吐', detail: '早餐后呕吐 1 次，下午恢复进食', severity: '已缓解' },
];

export const inventory = [
  { id: 'inv1', name: '碳酸镧咀嚼片', remaining: 10, daily: 2, unit: '片', days: 5, low: true },
  { id: 'inv2', name: '肾脏处方湿粮', remaining: 18, daily: 3, unit: '罐', days: 6, low: true },
  { id: 'inv3', name: '替米沙坦口服液', remaining: 22, daily: 1, unit: '次', days: 22, low: false },
];

export const labReports = [
  { date: '6/24', creatinine: 175, phosphorus: 1.55, sdma: 16 },
  { date: '3/12', creatinine: 178, phosphorus: 1.62, sdma: 17 },
];

export const articles = [
  { id: 'ckd-water', category: '肾病', title: 'CKD 猫咪如何科学补水？', summary: '从饮水器、湿粮到皮下补液，了解不同阶段的补水策略。', image: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=700&q=85', content: '充足饮水是慢性肾病居家护理的重要部分。可以通过增加湿粮比例、在家中布置多个水碗和使用流动饮水器来鼓励饮水。\n\n记录每天的饮水量与排尿变化。如果饮水量突然显著增加或减少，或出现精神沉郁、频繁呕吐，应及时联系兽医。\n\n皮下补液必须由兽医根据分期、脱水程度和心脏状况决定，不建议主人自行增加频率或剂量。' },
  { id: 'diabetes-food', category: '糖尿病', title: '犬猫糖尿病的定时定量喂养', summary: '饮食和胰岛素时间如何配合，减少血糖波动。', image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=700&q=85', content: '规律的进食时间能帮助血糖管理。每天使用相同配方、相近份量，并按照兽医制定的时间给予胰岛素。\n\n如果宠物拒绝进食，不应机械照常注射，需联系主治医生确认当次剂量。出现颤抖、虚弱、步态不稳可能提示低血糖，应按急救方案处理并立即就医。' },
  { id: 'arthritis-home', category: '关节炎', title: '让关节炎宠物在家更舒适', summary: '防滑、保暖、体重管理和低强度活动的实用方法。', image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=700&q=85', content: '在常活动区域铺设防滑垫，降低猫砂盆和睡床入口高度。控制体重可以显著减轻关节负担。\n\n短时间、低强度、规律的活动通常比偶尔剧烈运动更合适。不要自行使用人用止痛药，部分药物对犬猫具有严重毒性。' },
  { id: 'heart-breath', category: '心脏病', title: '在家监测静息呼吸频率', summary: '每天一分钟，帮助及早发现心肺状态变化。', image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=700&q=85', content: '宠物熟睡时观察胸廓起伏，一次起伏计为一次呼吸。计数 30 秒后乘以 2，连续记录趋势。\n\n如果静息呼吸频率持续高于主治医生设定的阈值，或出现张口呼吸、腹式用力呼吸，应立即就医。' },
];
