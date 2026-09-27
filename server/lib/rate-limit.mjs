const buckets = new Map();

const RULES = [
  { path: '/auth/admin-password', methods: ['POST'], limit: 10, windowMs: 15 * 60 * 1000 },
  { path: '/auth/admin-setup', methods: ['POST'], limit: 5, windowMs: 30 * 60 * 1000 },
  { path: '/auth/wechat', methods: ['POST'], limit: 30, windowMs: 5 * 60 * 1000 },
  { path: '/ai/chat', methods: ['POST'], limit: 30, windowMs: 60 * 1000 },
  { path: '/cases/', methods: ['POST'], limit: 60, windowMs: 60 * 1000, prefix: true },
];

function clientAddress(request) {
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || request.socket?.remoteAddress || 'unknown';
}

function cleanup(now) {
  if (buckets.size < 2000) return;
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) buckets.delete(key);
  }
}

export function enforceRateLimit(request, path) {
  const rule = RULES.find((candidate) =>
    candidate.methods.includes(request.method || 'GET')
    && (candidate.prefix ? path.startsWith(candidate.path) : path === candidate.path)
  );
  if (!rule) return;
  const now = Date.now();
  cleanup(now);
  const key = `${clientAddress(request)}:${request.method}:${rule.path}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return;
  }
  current.count += 1;
  if (current.count > rule.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    throw Object.assign(new Error('请求过于频繁，请稍后重试'), {
      status: 429,
      code: 'RATE_LIMITED',
      details: { retryAfterSeconds }
    });
  }
}
