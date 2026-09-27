import { admin } from './database.mjs';

const URGENT_TERMS = ['呼吸困难', '喘不上气', '抽搐', '昏迷', '无法站立', '大量出血', '无尿', '尿不出来', '持续干呕', '误食毒物'];
const MEDICATION_CHANGE_TERMS = ['停药', '加药', '减药', '换药', '改剂量', '多少毫克', '吃几片'];
const SEVERITY_ORDER = { none: 0, info: 1, warning: 2, urgent: 3 };

function aiConfiguration() {
  return {
    mode: process.env.AI_PROVIDER_MODE === 'local' ? 'local' : 'cloud',
    url: process.env.AI_API_URL || '',
    key: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || ''
  };
}

export function aiConfigured() {
  const config = aiConfiguration();
  return Boolean(config.url && config.model && (config.mode === 'local' || config.key));
}

function requireAi() {
  const config = aiConfiguration();
  if (!config.url || !config.model || (config.mode !== 'local' && !config.key)) {
    throw Object.assign(new Error('AI模型尚未配置，不能伪造AI结果'), { status: 503, code: 'AI_NOT_CONFIGURED' });
  }
  return config;
}

function modelHeaders(config) {
  return {
    ...(config.key ? { authorization: `Bearer ${config.key}` } : {}),
    'content-type': 'application/json'
  };
}

async function callModel(messages, { temperature = 0.2, responseFormat = null } = {}) {
  const config = requireAi();
  const payload = { model: config.model, temperature, messages };
  if (responseFormat) payload.response_format = responseFormat;
  const timeoutMs = Math.min(120000, Math.max(5000, Number(process.env.AI_TIMEOUT_MS || 45000)));
  const signal = AbortSignal.timeout(timeoutMs);
  let response = await fetch(config.url, {
    method: 'POST',
    headers: modelHeaders(config),
    body: JSON.stringify(payload),
    signal
  });
  if (!response.ok && responseFormat && response.status === 400) {
    delete payload.response_format;
    response = await fetch(config.url, {
      method: 'POST',
      headers: modelHeaders(config),
      body: JSON.stringify(payload),
      signal
    });
  }
  if (!response.ok) throw Object.assign(new Error('AI服务暂时不可用'), { status: 502, code: 'AI_PROVIDER_FAILED' });
  const body = await response.json();
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw Object.assign(new Error('AI没有返回有效内容'), { status: 502, code: 'AI_EMPTY_RESPONSE' });
  return content;
}

function tokens(value) {
  return [...new Set(String(value || '').toLowerCase().split(/\s+|[，。？！、；：,.!?;:()（）/]/).filter((item) => item.length > 1))];
}

function parseJsonContent(content, errorMessage = 'AI返回格式无效') {
  const normalized = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(normalized); }
  catch { throw Object.assign(new Error(errorMessage), { status: 502, code: 'AI_INVALID_JSON' }); }
}

async function loadSetting(key, fallback) {
  const result = await admin().from('system_settings').select('value').eq('key', key).maybeSingle();
  if (result.error && result.error.code !== '42P01') throw result.error;
  return result.data?.value && typeof result.data.value === 'object' ? result.data.value : fallback;
}

function scoreKnowledge(item, words, petContext) {
  const triggerTerms = (item.trigger_terms || []).map((term) => String(term).toLowerCase());
  const searchable = JSON.stringify(item).toLowerCase();
  let score = words.reduce((sum, word) => sum + (triggerTerms.some((term) => term.includes(word) || word.includes(term)) ? 4 : searchable.includes(word) ? 1 : 0), 0);
  if (petContext?.species && [petContext.species, 'both'].includes(item.species)) score += 3;
  if (petContext?.disease && item.disease && String(petContext.disease).toLowerCase().includes(String(item.disease).toLowerCase())) score += 3;
  if (petContext?.stage && item.stage && String(petContext.stage).includes(String(item.stage))) score += 2;
  return score;
}

function sourceLabel(item) {
  return [item.source_organization, item.source_title, item.source_year ? `${item.source_year}年` : null].filter(Boolean).join('，');
}

function safetyFooter(answer) {
  const footer = '宠馨智只提供院后护理信息支持，不替代兽医诊断；用药、停药、换药和剂量调整必须由兽医确认。';
  return answer.includes('不替代兽医') ? answer : `${answer.trim()}\n\n${footer}`;
}

export async function answerWithKnowledge(question, petContext = null) {
  const urgentTerms = URGENT_TERMS.filter((term) => question.includes(term));
  if (urgentTerms.length) {
    return {
      answer: `你描述的“${urgentTerms.join('、')}”可能涉及紧急风险。请不要等待AI继续判断，立即联系可接诊的宠物医院或前往急诊；途中保持宠物安全、避免自行喂药，并携带既往病例与当前用药记录。\n\n宠馨智只提供风险分流，不作诊断。`,
      sources: [], urgency: 'urgent', safetyTriggered: true
    };
  }

  const { data: entries, error } = await admin().from('knowledge_entries')
    .select('id,title,species,disease,stage,scenario,trigger_terms,core_conclusion,applicability,owner_explanation,next_action,forbidden_inference,source_title,source_organization,source_year,source_url,version')
    .eq('review_status', 'approved').limit(500);
  if (error) throw error;
  const words = tokens(question);
  const ranked = (entries || []).map((item) => ({ item, score: scoreKnowledge(item, words, petContext) }))
    .sort((a, b) => b.score - a.score).slice(0, 6).filter((entry) => entry.score > 0);
  if (!ranked.length) {
    return {
      answer: '当前已审核知识库没有找到足够依据，不能据此给出确定建议。请补充宠物种类、年龄、实际体重、已确诊疾病与分期、最近检验日期和当前兽医医嘱；若症状正在加重，请直接联系兽医。',
      sources: [], urgency: 'unknown', safetyTriggered: false
    };
  }
  const safetyRules = await loadSetting('ai_safety_rules', {});
  const context = ranked.map(({ item }, index) => [
    `资料${index + 1}（知识编号 ${item.id}，版本 ${item.version}）`,
    `标题：${item.title}`,
    `适用对象：${item.species}；疾病：${item.disease}；阶段：${item.stage || '未限定'}`,
    `结论：${item.core_conclusion}`,
    `适用条件：${item.applicability}`,
    `宠主解释：${item.owner_explanation}`,
    `下一步：${item.next_action}`,
    `禁止推断：${item.forbidden_inference}`,
    `来源：${sourceLabel(item)}`
  ].join('\n')).join('\n\n');
  const medicationBoundary = MEDICATION_CHANGE_TERMS.some((term) => question.includes(term))
    ? '用户问题涉及改变用药。明确拒绝给出具体停药、加药、换药或剂量决定，并引导联系开方兽医。'
    : '';
  const answer = await callModel([
    { role: 'system', content: `你是宠馨智院后护理AI。只依据提供的已审核知识回答。先简短说明使用了哪些宠物数据，再解释建议。不得独立诊断、改变疾病分期、开药、停药、换药或调剂量；不得把相关性说成因果；危急症状优先建议立即就医；找不到依据必须说明依据不足；回答末尾用【来源：机构，资料名，年份】逐条标注。${medicationBoundary}\n平台安全配置：${JSON.stringify(safetyRules)}` },
    { role: 'user', content: `宠物资料：${JSON.stringify(petContext || {})}\n问题：${question}\n\n已审核知识：\n${context}` }
  ]);
  return {
    answer: safetyFooter(answer),
    sources: ranked.map(({ item }) => ({ id: item.id, label: sourceLabel(item), url: item.source_url || null, version: item.version })),
    urgency: 'routine', safetyTriggered: Boolean(medicationBoundary)
  };
}

export async function generateCareTasks({ pet, medicalOrder, startDate }) {
  const safetyRules = await loadSetting('ai_safety_rules', {});
  const content = await callModel([
    { role: 'system', content: `你是执业兽医的文书助手。只能拆解医生输入的医嘱，不得增加新的药物、剂量、诊断、疾病分期或治疗决定。不得把模糊医嘱补全成确定医嘱。只输出JSON：{"summary":"","tasks":[{"title":"","instruction":"","taskType":"medication|feeding|hydration|monitoring|activity|other","schedule":{}}],"missingConfirmations":[]}。如医嘱缺关键信息，写入missingConfirmations，不要猜。平台安全配置：${JSON.stringify(safetyRules)}` },
    { role: 'user', content: `宠物资料：${JSON.stringify(pet)}\n医生医嘱：${medicalOrder}\n开始日期：${startDate}` }
  ], { temperature: 0.1, responseFormat: { type: 'json_object' } });
  const parsed = parseJsonContent(content, 'AI任务清单格式无效，请医生手工填写');
  const allowedTypes = new Set(['medication','feeding','hydration','monitoring','activity','other']);
  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, 30).map((task) => ({
    title: String(task.title || '').trim().slice(0, 100),
    instruction: String(task.instruction || '').trim().slice(0, 2000),
    taskType: allowedTypes.has(task.taskType) ? task.taskType : 'other',
    schedule: task.schedule && typeof task.schedule === 'object' ? task.schedule : {}
  })).filter((task) => task.title && task.instruction) : [];
  if (!tasks.length) throw Object.assign(new Error('AI没有生成可用任务，请医生手工填写'), { status: 422, code: 'AI_NO_VALID_TASKS' });
  return { summary: String(parsed.summary || ''), tasks, missingConfirmations: Array.isArray(parsed.missingConfirmations) ? parsed.missingConfirmations.map(String) : [] };
}

function median(numbers) {
  if (!numbers.length) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function deterministicSignals(current, previous, rules) {
  const signals = [];
  const symptomText = `${current.symptom_note || ''} ${current.urine_note || ''} ${current.stool_note || ''}`;
  const urgentTerms = URGENT_TERMS.filter((term) => symptomText.includes(term));
  if (urgentTerms.length) signals.push({ severity: 'urgent', code: 'urgent_symptom_text', detail: `记录包含需要立即就医评估的症状：${urgentTerms.join('、')}` });
  if (Number(current.vomiting_count || 0) >= Number(rules.vomitingUrgentCount || 3)) signals.push({ severity: 'urgent', code: 'repeated_vomiting', detail: `本次记录呕吐${current.vomiting_count}次` });
  else if (Number(current.vomiting_count || 0) > 0) signals.push({ severity: 'warning', code: 'vomiting', detail: `本次记录呕吐${current.vomiting_count}次` });
  if (['none', 'refused', '不吃', '拒食'].includes(String(current.appetite || '').toLowerCase())) signals.push({ severity: 'warning', code: 'poor_appetite', detail: '食欲记录为拒食或未进食' });
  if (['very_poor', 'collapsed', '极差', '无法站立'].includes(String(current.spirit || '').toLowerCase())) signals.push({ severity: 'urgent', code: 'poor_spirit', detail: '精神状态记录为极差' });
  const weights = previous.map((item) => Number(item.weight_kg)).filter((value) => Number.isFinite(value) && value > 0);
  const baselineWeight = median(weights);
  if (baselineWeight && Number(current.weight_kg) > 0) {
    const change = ((Number(current.weight_kg) - baselineWeight) / baselineWeight) * 100;
    if (Math.abs(change) >= Number(rules.weightChangePercent || 5)) signals.push({ severity: 'warning', code: 'weight_change', detail: `体重较近期中位值变化${change.toFixed(1)}%` });
  }
  const waters = previous.map((item) => Number(item.water_ml)).filter((value) => Number.isFinite(value) && value > 0);
  const baselineWater = median(waters);
  if (baselineWater && Number(current.water_ml) > 0) {
    const change = ((Number(current.water_ml) - baselineWater) / baselineWater) * 100;
    if (Math.abs(change) >= Number(rules.waterChangePercent || 50)) signals.push({ severity: 'warning', code: 'water_change', detail: `饮水量较近期中位值变化${change.toFixed(1)}%` });
  }
  return signals;
}

export async function analyzeHealthCheckin({ pet, current, previous = [] }) {
  const reminderRules = await loadSetting('reminder_rules', {});
  const signals = deterministicSignals(current, previous, reminderRules);
  let severity = signals.reduce((highest, signal) => SEVERITY_ORDER[signal.severity] > SEVERITY_ORDER[highest] ? signal.severity : highest, 'none');
  let aiSummary = null;
  let detectionSource = 'rule_engine';
  if (aiConfigured()) {
    try {
      const content = await callModel([
        { role: 'system', content: '你是院后护理记录分析助手，不是诊断医生。只总结数据变化和需要复核的风险，不得诊断疾病、改变分期、增减药物或给剂量。只输出JSON：{"severity":"none|info|warning|urgent","title":"","explanation":"","ownerMessage":"","recommendedAction":""}。urgent必须建议立即联系医院或急诊；warning建议联系主管兽医复核；数据不足时明确说明。' },
        { role: 'user', content: `宠物资料：${JSON.stringify(pet)}\n本次打卡：${JSON.stringify(current)}\n此前记录（最多14条）：${JSON.stringify(previous.slice(0, 14))}\n规则引擎信号：${JSON.stringify(signals)}` }
      ], { temperature: 0.1, responseFormat: { type: 'json_object' } });
      aiSummary = parseJsonContent(content, 'AI异常分析格式无效');
      if (SEVERITY_ORDER[aiSummary.severity] > SEVERITY_ORDER[severity]) severity = aiSummary.severity;
      detectionSource = 'ai_assisted';
    } catch (error) {
      console.warn(JSON.stringify({ event: 'checkin_ai_fallback', message: error.message, code: error.code || null }));
    }
  }
  if (severity === 'none') return { hasAlert: false, severity: 'none', signals, detectionSource };
  const urgent = severity === 'urgent';
  return {
    hasAlert: true,
    severity,
    title: String(aiSummary?.title || (urgent ? '需要立即就医评估的异常记录' : '健康记录出现需要复核的变化')).slice(0, 120),
    explanation: String(aiSummary?.explanation || signals.map((signal) => signal.detail).join('；') || '记录出现变化，需要结合宠物实际状态复核。').slice(0, 2000),
    ownerMessage: String(aiSummary?.ownerMessage || (urgent ? '请立即联系可接诊的宠物医院或前往急诊，不要等待AI继续判断。' : '请把本次记录发给主管兽医，并继续观察精神、食欲、饮水和排泄。')).slice(0, 1000),
    recommendedAction: String(aiSummary?.recommendedAction || (urgent ? '立即联系医院或急诊；不要自行调整药物。' : '联系主管兽医复核；不要自行增减药物。')).slice(0, 1000),
    signals, detectionSource
  };
}
