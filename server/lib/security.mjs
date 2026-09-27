import { createHmac, createHash, randomUUID, timingSafeEqual } from 'node:crypto';

const base64url = (value) => Buffer.from(value).toString('base64url');
const decode = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

export function sha256(value) {
  return createHash('sha256').update(value).digest('base64url');
}

export function randomSecret() {
  return `${randomUUID()}${randomUUID()}`;
}

export function secretsEqual(actual, expected) {
  const actualDigest = createHash('sha256').update(String(actual || '')).digest();
  const expectedDigest = createHash('sha256').update(String(expected || '')).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

export function signAccessToken(userId, secret, expiresInSeconds = 60 * 60 * 24 * 7) {
  if (!secret) throw new Error('SUPABASE_JWT_SECRET未配置');
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'chongxinzhi-node-api',
    iat: now,
    exp: now + expiresInSeconds
  }));
  const data = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return { token: `${data}.${signature}`, expiresAt: (now + expiresInSeconds) * 1000 };
}

export function verifyAccessToken(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
  const actual = Buffer.from(parts[2], 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  const payload = decode(parts[1]);
  if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function bearerToken(request) {
  const value = request.headers.authorization || '';
  return value.replace(/^Bearer\s+/i, '').trim();
}
