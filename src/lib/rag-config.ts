export const ragConfig = {
  mode: 'retrieval-augmented-generation',
  enabled: true,
  chunkSize: { min: 150, target: 220, max: 300 },
  minimumSimilarity: 0.6,
  refuseBelowThreshold: true,
  refusal: '根据当前专业知识库，我没有检索到匹配度足够高的内容，因此不能可靠回答这个问题。建议补充更具体的症状、检查指标，或咨询主治兽医。',
} as const;

export const cozeRagSetup = [
  '知识库模式选择：检索增强生成（RAG）',
  '文档分段：每段 150-300 字，建议目标 220 字',
  '最低匹配度：60%',
  '低于阈值：拒绝回答，不允许模型凭常识续写',
  '回答必须返回命中文档标题、模块和来源依据',
];
