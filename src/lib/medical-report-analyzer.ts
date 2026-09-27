import { REPORT_RISK_PATTERNS, type ReportType } from './medical-report-knowledge';

export type AbnormalItem = { name:string; value:number; unit:string; reference:string; direction:'偏高'|'偏低' };
export type NormalItem = { name:string; value:number; unit:string; reference:string };
export type RiskInference = { title:string; confidence:'高'|'中'|'低'; evidence:string; missingEvidence:string };
export type MedicalReportAnalysis = {
  id:string; createdAt:string; sourceFile:string; pet:{ name:string; species:string; age:string; sex:string };
  reportType:Exclude<ReportType,'auto'>; reportTypeLabel:string; abnormalItems:AbnormalItem[];
  normalItems:NormalItem[];
  riskInferences:RiskInference[];
  qualitativeResults:{ name:string; result:string }[]; riskLevel:'urgent'|'warning'|'attention';
  summary:string; possibleConcerns:string[]; veterinarianDiscussion:string[];
  dailyCarePlan:{ period:string; actions:string[] }[]; confidence:number; needsOcr:boolean;
};

const typeTerms: { type: Exclude<ReportType,'auto'>; label:string; terms:string[] }[] = [
  {type:'cbc',label:'血常规',terms:['血常规','WBC','HGB','HCT','PLT']},
  {type:'biochemistry',label:'生化',terms:['生化','CREA','BUN','ALT','CHOL','FRU']},
  {type:'blood-gas',label:'血气/电解质',terms:['血气','pCO2','pO2','Lac','AG']},
  {type:'immunology',label:'免疫检测',terms:['免疫','FPV','RFU','阴性','阳性']},
  {type:'microscopy',label:'镜检/粪检',terms:['镜检','酵母菌','上皮细胞','虫卵']},
  {type:'urinalysis',label:'尿检',terms:['尿检','尿比重','UPC','尿蛋白']},
  {type:'physical',label:'体格检查',terms:['体格检查','体温','心率','呼吸']},
];

function detectType(text:string, selected:ReportType) {
  if(selected!=='auto') return typeTerms.find(x=>x.type===selected)!;
  return typeTerms.map(x=>({...x,score:x.terms.filter(t=>text.toLowerCase().includes(t.toLowerCase())).length})).sort((a,b)=>b.score-a.score)[0] || typeTerms[1];
}

function field(text:string, label:string) { return text.match(new RegExp(`${label}[：:\\s]+([^\\n\\s]+)`,'i'))?.[1] || '未识别'; }

export function analyzeReportText(text:string, sourceFile:string, selected:ReportType='auto'):MedicalReportAnalysis {
  const detected=detectType(text,selected);
  const abnormalItems:AbnormalItem[]=[];
  const normalItems:NormalItem[]=[];
  const linePattern=/^\s*([A-Za-z][A-Za-z0-9/#%+-]*|[\u4e00-\u9fa5]{2,12})\s*[:：]?\s*([<>≥≤]?\s*\d+(?:\.\d+)?)\s*([^\s\d]+(?:\/[A-Za-z]+)?)?\s*(?:参考范围|参考|范围|ref(?:erence)?\.?)[：:\s]*([<>≥≤]?\s*\d+(?:\.\d+)?)\s*[-~至]\s*([<>≥≤]?\s*\d+(?:\.\d+)?)/gim;
  let match:RegExpExecArray|null;
  while((match=linePattern.exec(text))){
    const value=Number(match[2].replace(/[^\d.]/g,'')); const low=Number(match[4].replace(/[^\d.]/g,'')); const high=Number(match[5].replace(/[^\d.]/g,''));
    if(value<low||value>high) abnormalItems.push({name:match[1],value,unit:match[3]||'',reference:`${low}-${high}`,direction:value>high?'偏高':'偏低'});
    else normalItems.push({name:match[1],value,unit:match[3]||'',reference:`${low}-${high}`});
  }
  const qualitativeResults=[...text.matchAll(/([A-Za-z\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 /-]{1,20})[：:\s]+(阴性|阳性|未检出|检出)/g)].map(x=>({name:x[1].trim(),result:x[2]})).slice(0,6);
  const abnormalNames=abnormalItems.map(x=>x.name.toUpperCase());
  const matched=REPORT_RISK_PATTERNS.filter(p=>p.terms.every(t=>abnormalNames.some(n=>n.includes(t.toUpperCase()))));
  const riskInferences:RiskInference[]=matched.map(pattern=>({
    title:pattern.title,
    confidence:pattern.id==='diabetes'?'高':'中',
    evidence:`本报告同时出现：${pattern.terms.join('、')}异常`,
    missingEvidence:pattern.id==='renal'?'需补充水合状态、尿检、尿量趋势、超声和复测，以区分脱水、AKI、梗阻与CKD':pattern.id==='diabetes'?'需结合临床症状、复测血糖、尿糖和酮体，由兽医确认糖尿病及是否存在酮症酸中毒':pattern.id==='pancreas'?'需结合腹痛、呕吐、食欲、连续cPL及腹部超声':pattern.id==='liver'?'需结合胆红素、超声、药物史、感染筛查和复测':'需结合病史和补充检查',
  }));
  if(/酵母菌[：:\s]+检出/.test(text))riskInferences.push({title:'肠道菌群失衡或肠道炎症待排查',confidence:'低',evidence:'镜检记录酵母菌检出',missingEvidence:'需核对样本类型、酵母数量、粪便症状、寄生虫检查和复检结果'});
  const symptomEmergency=/无尿|尿不出|呼吸困难|张口呼吸|抽搐|意识模糊|昏迷|持续呕吐|拒食超过24小时/.test(text);
  const criticalLab=abnormalItems.some(x=>(x.name.toUpperCase()==='GLU'&&x.value>20)||(x.name.toUpperCase()==='CREA'&&x.value>300));
  const urgent=symptomEmergency||criticalLab||matched.some(x=>x.level==='urgent')||abnormalItems.length>=5;
  const riskLevel=urgent?'urgent':abnormalItems.length||matched.length?'warning':'attention';
  const summary=abnormalItems.length ? `识别到 ${abnormalItems.length} 项超出报告参考范围，当前最需要关注${matched.length?`“${matched[0].title}”`:'异常指标的原因与变化趋势'}。` : '暂未从可解析文字中识别到超出参考范围的数值，请人工核对原报告。';
  return {
    id:`report-${Date.now()}`,createdAt:new Date().toISOString(),sourceFile,pet:{name:field(text,'宠物'),species:field(text,'种类'),age:field(text,'年龄'),sex:field(text,'性别')},
    reportType:detected.type,reportTypeLabel:detected.label,abnormalItems,normalItems,riskInferences,qualitativeResults,riskLevel,summary,
    possibleConcerns:(symptomEmergency?['描述中包含紧急症状，即使报告数值尚未完整，也应优先联系宠物医院或急诊。']:[]).concat(matched.map(x=>x.note)).concat(!matched.length&&abnormalItems.length?['单项或零散异常需要结合症状、采样状态及既往趋势，由兽医判断临床意义。']:[]),
    veterinarianDiscussion:['核对采样时间、空腹状态、物种专用参考范围及异常值','结合症状、既往报告和用药史判断变化趋势','根据异常类型讨论是否需要尿检、影像学、复测或专科检查'],
    dailyCarePlan:[
      {period:'今天',actions:riskLevel==='urgent'?['尽快联系宠物医院，告知异常值和当前症状','保持安静，记录饮水、排尿、呕吐与精神状态','不要自行加药、停药或强行喂食']:['按原医嘱饮食和用药，不自行调整剂量','记录食欲、饮水、排尿、精神和呕吐情况','保存原报告并预约兽医解读']},
      {period:'接下来 7 天',actions:['每天同一时间记录体重和进食量','对比本次与既往异常指标趋势','按兽医安排完成复查或补充检查']},
      {period:'立即就医红线',actions:['呼吸困难、抽搐或意识异常','持续呕吐、完全拒食超过24小时','少尿、无尿或明显虚弱']},
    ],confidence:text.length>60?.9:.62,needsOcr:false,
  };
}

export function createPendingOcrResult(file:File, selected:ReportType='auto'):MedicalReportAnalysis {
  const result=analyzeReportText(`检测类型：${selected==='auto'?'待识别':selected}`,file.name,selected);
  return {...result,summary:'图片已载入，但静态演示版尚未连接云端OCR。请粘贴OCR文字后解析，或使用示例报告体验完整流程。',confidence:0,needsOcr:true};
}
