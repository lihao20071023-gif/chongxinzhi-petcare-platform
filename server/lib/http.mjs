function configuredOrigins() {
  const configured = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.length) return configured;
  return process.env.NODE_ENV === 'production'
    ? []
    : ['http://127.0.0.1:3300', 'http://localhost:3300', 'http://127.0.0.1:3000', 'http://localhost:3000'];
}

export function corsHeaders(request) {
  const origin = String(request?.headers?.origin || '');
  const allowed = configuredOrigins();
  const headers = {
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store'
  };
  if (origin && allowed.includes(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers.vary = 'Origin';
  }
  return headers;
}

export function send(response, status, body, request) {
  response.writeHead(status, { ...corsHeaders(request), 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

export function sendError(response, error, request) {
  const status = error.status || 400;
  send(response, status, { error: { code: error.code || 'REQUEST_FAILED', message: error.message || '请求处理失败', details: error.details } }, request);
}

export async function readJson(request, limitBytes = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limitBytes) throw Object.assign(new Error('请求内容过大'), { status: 413, code: 'PAYLOAD_TOO_LARGE' });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('JSON格式错误'), { status: 400, code: 'INVALID_JSON' }); }
}

export function required(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw Object.assign(new Error(`${label}不能为空`), { status: 422, code: 'VALIDATION_ERROR' });
  return value.trim();
}

export function optionalNumber(value, label) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw Object.assign(new Error(`${label}必须是数字`), { status: 422, code: 'VALIDATION_ERROR' });
  return parsed;
}

export function isoDate(value, label) {
  const parsed = new Date(required(value, label));
  if (Number.isNaN(parsed.getTime())) throw Object.assign(new Error(`${label}格式无效`), { status: 422, code: 'VALIDATION_ERROR' });
  return parsed.toISOString();
}

export function routeMatch(path, pattern) {
  const names = [];
  const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, (token) => { names.push(token.slice(1)); return '([^/]+)'; })}$`);
  const match = path.match(regex);
  if (!match) return null;
  return Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
}

export function labelDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(value));
}
