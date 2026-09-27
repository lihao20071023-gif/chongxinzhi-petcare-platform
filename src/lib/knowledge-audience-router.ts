export type KnowledgeAudience='owner'|'professional';
export function detectKnowledgeAudience(question:string):KnowledgeAudience {
  return /生成报告|专业建议|IRIS标准|结构化报告|兽医参考|GFR|UP\/C|临床解读|专业用户/.test(question)?'professional':'owner';
}
