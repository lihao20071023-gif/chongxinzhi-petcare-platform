export type ReportType = 'auto' | 'physical' | 'cbc' | 'biochemistry' | 'blood-gas' | 'immunology' | 'microscopy' | 'urinalysis';

export const REPORT_TYPES: { id: ReportType; label: string }[] = [
  { id: 'auto', label: '自动识别' }, { id: 'physical', label: '体格检查' },
  { id: 'cbc', label: '血常规' }, { id: 'biochemistry', label: '生化' },
  { id: 'blood-gas', label: '血气/电解质' }, { id: 'immunology', label: '免疫检测' },
  { id: 'microscopy', label: '镜检/粪检' }, { id: 'urinalysis', label: '尿检' },
];

export const COZE_REPORT_SYSTEM_PROMPT = `你是宠物健康报告解析助手。先按报告原文提取宠物基本信息、检测类型、项目名、数值、单位、参考范围和定性结果。异常项必须使用报告自身参考范围判断，保留原单位，不得编造缺失数值。输出风险等级、事实摘要、需要兽医排查的问题和居家观察清单。单张报告不能确诊慢性病；区分脱水、急性肾损伤、梗阻和慢性肾病需要病史、复测、尿检及影像学。药物和剂量只能提示与兽医讨论，不得自行推荐处方。`;

export type RiskPattern = { id: string; title: string; terms: string[]; level: 'warning' | 'urgent'; note: string };

export const REPORT_RISK_PATTERNS: RiskPattern[] = [
  { id:'renal', title:'肾功能异常组合', terms:['CREA','BUN','PHOS'], level:'urgent', note:'肌酐、尿素氮和血磷同时升高提示肾功能异常风险；仍需结合水合状态、尿检、尿量、超声和复测，鉴别脱水、AKI、梗阻与CKD。' },
  { id:'diabetes', title:'高血糖与代谢风险', terms:['GLU','FRU'], level:'urgent', note:'持续高血糖并伴果糖胺升高支持糖代谢异常风险；若同时呕吐、脱水或酮体阳性，应立即排查糖尿病酮症酸中毒。' },
  { id:'pancreas', title:'胰腺炎风险', terms:['cPL'], level:'warning', note:'cPL升高需结合腹痛、呕吐、食欲和影像学评估胰腺炎，不能仅凭单项确诊。' },
  { id:'liver', title:'肝胆异常组合', terms:['ALT','AST','GGT','TBA'], level:'warning', note:'多项肝胆指标升高提示肝细胞损伤或胆汁淤积风险，建议结合腹部超声、用药史和复测进一步定位。' },
];

export const REPORT_DEMO_TEXT = `宠物：布丁\n种类：犬 年龄：10岁 性别：母\n检测类型：生化\nGLU 35 mmol/L 参考范围 3.9-8.3\nCHOL 9.67 mmol/L 参考范围 2.84-8.27\nTRIG 3.94 mmol/L 参考范围 0.23-1.29\nFRU 635 umol/L 参考范围 191-349\nCREA 243 umol/L 参考范围 44-159\nBUN 27.8 mmol/L 参考范围 2.5-9.6\nPHOS 2.94 mmol/L 参考范围 0.81-2.20`;

export const REPORT_TEMPLATE_LIBRARY = [
  { type:'血常规', fields:'WBC、Neu、Lym、Mon、RBC、HGB、HCT、PLT', caution:'按物种、年龄及报告自带范围判断；浓缩、贫血和炎症需结合临床。' },
  { type:'生化', fields:'GLU、CREA、BUN、PHOS、ALT、AST、GGT、TBA、CHOL、TRIG', caution:'异常组合只生成鉴别方向，不直接确诊。' },
  { type:'血气/电解质', fields:'pH、pCO2、pO2、Na、K、Cl、Lac、AG、GLU', caution:'采样方式会显著影响血气结果，必须核对静脉/动脉样本。' },
  { type:'免疫/镜检', fields:'检测物、定性结果、阈值、镜下所见', caution:'阴性不能排除所有感染；镜检需结合样本质量、数量级与症状。' },
];

export type ReportCaseTemplate = {
  id: string; title: string; species: '猫'|'犬'; type: Exclude<ReportType,'auto'>;
  sourceCount: number; summary: string; text: string;
};

// De-identified templates distilled from the supplied hospital reports.
export const REPORT_CASE_LIBRARY: ReportCaseTemplate[] = [
  { id:'case-cat-physical',title:'猫 · 综合体格检查',species:'猫',type:'physical',sourceCount:1,summary:'体温、心率、呼吸、黏膜、口腔、体况与触诊项目的结构化录入模板。',text:`宠物：病例猫A\n种类：猫 年龄：未识别 性别：未识别\n检测类型：体格检查\n体温、心率、呼吸、体重、BCS、黏膜、口腔、淋巴结、腹部触诊：请按原报告逐项录入` },
  { id:'case-cat-cbc',title:'猫 · 血常规与血液浓缩评估',species:'猫',type:'cbc',sourceCount:1,summary:'用于核对WBC分类、RBC、HGB、HCT和血小板，并区分脱水性浓缩与真实红细胞异常。',text:`宠物：病例猫B\n种类：猫 年龄：未识别 性别：未识别\n检测类型：血常规\nWBC、Neu#、Lym#、Mon#、RBC、HGB、HCT、PLT：请按报告数值和参考范围录入` },
  { id:'case-cat-bloodgas',title:'猫 · 高血糖、乳酸升高血气',species:'猫',type:'blood-gas',sourceCount:1,summary:'GLU 20.19与乳酸5.17升高；pO2受采样方式和吸氧影响，不能作为酮症酸中毒依据。',text:`宠物：病例猫C\n种类：猫 年龄：未识别 性别：未识别\n检测类型：血气/电解质\nGLU 20.19 mmol/L 参考范围 3.90-8.30\nLac 5.17 mmol/L 参考范围 0.50-2.50\npO2 182 mmHg 参考范围 80-110` },
  { id:'case-cat-fpv',title:'猫 · FPV免疫荧光阴性',species:'猫',type:'immunology',sourceCount:2,summary:'两份猫瘟病毒抗原荧光结果均在报告阴性阈值内；需结合病程、采样时间与临床症状。',text:`宠物：病例猫D\n种类：猫 年龄：未识别 性别：未识别\n检测类型：免疫检测\nFPV：阴性\nRFU 354.57\n另一份RFU 690.04，报告判定：阴性` },
  { id:'case-dog-diabetes',title:'犬 · 糖代谢与高脂血症组合',species:'犬',type:'biochemistry',sourceCount:1,summary:'GLU、果糖胺、胆固醇和甘油三酯升高，提示需排查持续性糖尿病及并发代谢风险。',text:REPORT_DEMO_TEXT },
  { id:'case-dog-inflammatory-cbc',title:'犬 · 炎症型血常规组合',species:'犬',type:'cbc',sourceCount:1,summary:'白细胞、中性粒细胞与单核细胞升高，淋巴细胞及HCT降低，需结合感染、炎症和贫血评估。',text:`宠物：病例犬F\n种类：犬 年龄：未识别 性别：未识别\n检测类型：血常规\nWBC 20.22 10^9/L 参考范围 6.00-17.00\nNeu# 17.80 10^9/L 参考范围 3.62-12.30\nLym# 0.28 10^9/L 参考范围 0.83-4.91\nMon# 2.02 10^9/L 参考范围 0.14-1.97\nHCT 34.9 % 参考范围 37.3-61.7` },
  { id:'case-dog-bloodgas',title:'犬 · 高血糖与电解质异常',species:'犬',type:'blood-gas',sourceCount:1,summary:'钠降低、葡萄糖升高、阴离子间隙降低；需结合水合状态、蛋白、酮体和采样质量复核。',text:`宠物：病例犬G\n种类：犬 年龄：未识别 性别：未识别\n检测类型：血气/电解质\nNa 135.5 mmol/L 参考范围 140-153\nGLU 14.74 mmol/L 参考范围 3.90-8.30\nAG 4 mmol/L 参考范围 8-16` },
  { id:'case-dog-cpl',title:'犬 · cPL阳性胰腺风险',species:'犬',type:'immunology',sourceCount:1,summary:'cPL 899.7 μg/L，高于报告阳性阈值；需要结合腹痛、呕吐、食欲与超声确认。',text:`宠物：病例犬H\n种类：犬 年龄：未识别 性别：未识别\n检测类型：免疫检测\ncPL 899.7 ug/L 参考范围 0-400\ncPL：阳性` },
  { id:'case-dog-multisystem',title:'犬 · 肝肾糖脂多系统异常',species:'犬',type:'biochemistry',sourceCount:1,summary:'肝胆、肾脏、血糖及血脂多组指标同时异常，应优先由医院完成综合评估与急慢性鉴别。',text:`宠物：病例犬I\n种类：犬 年龄：老年 性别：未识别\n检测类型：生化\nGGT 26 U/L 参考范围 0-11\nAST 128 U/L 参考范围 0-50\nALT 392 U/L 参考范围 10-125\nTBA 38 umol/L 参考范围 0-25\nCREA 243 umol/L 参考范围 44-159\nBUN 27.8 mmol/L 参考范围 2.5-9.6\nGLU 35 mmol/L 参考范围 3.9-8.3\nCHOL 9.67 mmol/L 参考范围 2.84-8.27\nTRIG 3.94 mmol/L 参考范围 0.23-1.29\nPHOS 2.94 mmol/L 参考范围 0.81-2.20` },
  { id:'case-dog-rbc',title:'犬 · 红细胞与单核细胞异常',species:'犬',type:'cbc',sourceCount:1,summary:'RBC/HGB升高可能与脱水或慢性缺氧有关，不能仅凭血常规认定真性红细胞增多症。',text:`宠物：病例犬J\n种类：犬 年龄：老年 性别：未识别\n检测类型：血常规\nRBC 9.30 10^12/L 参考范围 5.65-8.87\nHGB 210 g/L 参考范围 131-205\nMon# 2.20 10^9/L 参考范围 0.14-1.97` },
  { id:'case-cat-microscopy',title:'猫 · 粪便/分泌物镜检',species:'猫',type:'microscopy',sourceCount:1,summary:'镜下见酵母菌、红细胞和上皮细胞，并记录疑似原虫；需复核样本类型、数量级与复检结果。',text:`宠物：病例猫K\n种类：猫 年龄：未识别 性别：未识别\n检测类型：镜检/粪检\n酵母菌：检出\n红细胞：检出\n上皮细胞：检出\n疑似原虫：检出` },
];
