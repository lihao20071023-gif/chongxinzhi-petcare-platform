export type OcrLabValues = {
  creatinine: number;
  sdma: number;
  phosphorus: number;
  sourceFile: string;
  confidence: number;
};

export type RealtimePetData = {
  weightKg: number;
  waterMl: number;
  stage: 'IRIS 1期' | 'IRIS 2期' | 'IRIS 3期' | 'IRIS 4期';
  currentMedication: string;
};

export type CarePipelineResult = {
  ocr: OcrLabValues;
  context: Record<string, unknown>;
  knowledgeHits: string[];
  calculation: { foodGrams: number; minimumWaterMl: number; foodFormula:string; waterFormula:string };
  output: string;
};

// OCR adapter placeholder: replace this function with Coze OCR/API response mapping.
export async function recognizeLabReport(file?: File): Promise<OcrLabValues> {
  return {
    creatinine: 175,
    sdma: 16,
    phosphorus: 1.55,
    sourceFile: file?.name || '体检报告示例.jpg',
    confidence: 0.96,
  };
}

export function buildModelContext(labs: OcrLabValues, realtime: RealtimePetData) {
  return {
    pet: { species: 'cat', disease: 'CKD', stage: realtime.stage },
    labs: { CREA_umol_L: labs.creatinine, SDMA_ug_dL: labs.sdma, phosphorus_mmol_L: labs.phosphorus },
    realtime: { weightKg: realtime.weightKg, waterMl: realtime.waterMl },
    prescription: { medication: realtime.currentMedication },
    safety: { noDiagnosis: true, medicationChangeRequiresVet: true },
  };
}

function searchKnowledge(context: ReturnType<typeof buildModelContext>) {
  const stage = context.pet.stage;
  return [
    `肾病库：${stage}居家护理与复查指引`,
    `IRIS 指标库：CREA ${context.labs.CREA_umol_L}、SDMA ${context.labs.SDMA_ug_dL}、血磷 ${context.labs.phosphorus_mmol_L}`,
    `处方粮白皮书：CKD 猫按体重 ${context.realtime.weightKg}kg 的每日喂食建议`,
  ];
}

function calculateCareTargets(weightKg: number) {
  // Demonstration rules. Production must use the selected product's kcal/kg and a vet-approved energy factor.
  const foodGrams = Math.round((weightKg * 12.5) / 5) * 5;
  const minimumWaterMl = Math.round((weightKg * 54) / 10) * 10;
  return { foodGrams, minimumWaterMl, foodFormula:`${weightKg}kg × 12.5g/kg ≈ ${foodGrams}g`, waterFormula:`${weightKg}kg × 54ml/kg ≈ ${minimumWaterMl}ml` };
}

export async function runClinicalCarePipeline(file: File | undefined, realtime: RealtimePetData): Promise<CarePipelineResult> {
  const ocr = await recognizeLabReport(file);
  const context = buildModelContext(ocr, realtime);
  const knowledgeHits = searchKnowledge(context);
  const calculation = calculateCareTargets(realtime.weightKg);
  const output = `目前的化验单结合体重显示：肌酐 ${ocr.creatinine} μmol/L、SDMA ${ocr.sdma} μg/dL、血磷 ${ocr.phosphorus} mmol/L，当前档案为 ${realtime.stage}。根据处方粮白皮书的示例计算，建议每日摄入约 ${calculation.foodGrams}g 肾脏处方粮，饮水量仍需维持 ${calculation.minimumWaterMl}ml 以上。当前${realtime.currentMedication}请按主治兽医处方执行，不可自行停药或调整剂量。具体剂量请咨询主治兽医。`;
  return { ocr, context, knowledgeHits, calculation, output };
}
