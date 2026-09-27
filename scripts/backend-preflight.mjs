const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'WECHAT_APP_ID',
  'WECHAT_APP_SECRET',
  'WECHAT_OPENID_PEPPER',
  'AI_API_URL',
  'AI_MODEL',
  'REPORTS_BUCKET'
];

const PLACEHOLDER = /YOUR_|CHANGE_ME|REPLACE_ME|example\.com|your-domain/i;
const errors = [];
for (const name of REQUIRED) {
  const value = String(process.env[name] || '').trim();
  if (!value) errors.push(`${name} 未配置`);
  else if (PLACEHOLDER.test(value)) errors.push(`${name} 仍是占位值`);
}

const aiMode = process.env.AI_PROVIDER_MODE === 'local' ? 'local' : 'cloud';
if (aiMode === 'cloud') {
  const aiKey = String(process.env.AI_API_KEY || '').trim();
  if (!aiKey) errors.push('AI_API_KEY 未配置');
  else if (PLACEHOLDER.test(aiKey)) errors.push('AI_API_KEY 仍是占位值');
}

const apiHost = String(process.env.API_HOST || '127.0.0.1');
if (process.env.NODE_ENV === 'production' && ['127.0.0.1', 'localhost'].includes(apiHost)) {
  errors.push('生产环境 API_HOST 应设为 0.0.0.0');
}
if (process.env.NODE_ENV === 'production' && !String(process.env.CORS_ALLOWED_ORIGINS || '').trim()) {
  errors.push('生产环境必须配置 CORS_ALLOWED_ORIGINS');
}
if (String(process.env.WECHAT_OPENID_PEPPER || '').length > 0 && String(process.env.WECHAT_OPENID_PEPPER).length < 32) {
  errors.push('WECHAT_OPENID_PEPPER 至少应为32个字符');
}

if (errors.length) {
  console.error('宠馨智后端部署预检未通过：');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('宠馨智后端环境变量预检通过。');
console.log('下一步仍需运行数据库迁移、创建私有病历Bucket，并执行端到端权限测试。');
