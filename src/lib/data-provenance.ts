export type DataSource='user_input'|'uploaded_report'|'hospital_his'|'ocr'|'ai_generated'|'knowledge_base'|'template'|'demo';

export type DataProvenance={
 source:DataSource;
 verified:boolean;
 recordedAt:string;
 verifiedBy?:string;
};

export const provenanceLabels:Record<DataSource,string>={
 user_input:'用户录入',uploaded_report:'用户上传',hospital_his:'医院授权同步',ocr:'OCR待核对',
 ai_generated:'AI生成建议',knowledge_base:'知识库规则',template:'参考模板',demo:'演示数据',
};

export function provenanceLabel(value:DataProvenance){
 return `${provenanceLabels[value.source]}${value.verified?' · 已核对':' · 未核对'}`;
}
