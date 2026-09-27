const url = String(process.env.AI_API_URL || '').trim();
const key = String(process.env.AI_API_KEY || '').trim();
const model = String(process.env.AI_MODEL || '').trim();
if (!url || !model) {
  console.error('缺少 AI_API_URL 或 AI_MODEL。');
  process.exit(1);
}

const response = await fetch(url, {
  method: 'POST',
  headers: {
    ...(key ? { authorization: `Bearer ${key}` } : {}),
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: '你是连接测试程序。不要给出医疗建议。' },
      { role: 'user', content: '只回复：宠馨智AI连接成功' }
    ]
  }),
  signal: AbortSignal.timeout(Math.min(120000, Math.max(5000, Number(process.env.AI_TIMEOUT_MS || 45000))))
});

if (!response.ok) {
  console.error(`AI连接失败：HTTP ${response.status}`);
  console.error((await response.text()).slice(0, 500));
  process.exit(1);
}
const body = await response.json();
const content = body.choices?.[0]?.message?.content;
if (!content) {
  console.error('AI接口返回成功，但没有兼容的 choices[0].message.content。');
  process.exit(1);
}
console.log(content);
