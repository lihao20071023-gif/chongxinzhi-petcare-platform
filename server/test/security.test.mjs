import assert from 'node:assert/strict';
import test from 'node:test';
import { routeMatch } from '../lib/http.mjs';
import { enforceRateLimit } from '../lib/rate-limit.mjs';
import { secretsEqual, signAccessToken, verifyAccessToken } from '../lib/security.mjs';

test('access token can be signed and verified', () => {
  const secret = 'test-secret-that-is-not-used-in-production';
  const signed = signAccessToken('user-123', secret, 60);
  const payload = verifyAccessToken(signed.token, secret);
  assert.equal(payload.sub, 'user-123');
  assert.equal(payload.role, 'authenticated');
  assert.equal(verifyAccessToken(signed.token, 'wrong-secret'), null);
});

test('route parameters are decoded safely', () => {
  assert.deepEqual(routeMatch('/pets/%E8%B1%86%E8%B1%86', '/pets/:petId'), { petId: '豆豆' });
  assert.equal(routeMatch('/pets/one/reports', '/pets/:petId'), null);
});

test('one-time setup secrets are compared safely', () => {
  assert.equal(secretsEqual('same-long-secret', 'same-long-secret'), true);
  assert.equal(secretsEqual('same-long-secret', 'different-secret'), false);
  assert.equal(secretsEqual('', 'different-secret'), false);
});

test('sensitive public endpoints are rate limited', () => {
  const request = {
    method: 'POST',
    headers: { 'x-forwarded-for': '192.0.2.55' },
    socket: { remoteAddress: '192.0.2.55' }
  };
  for (let index = 0; index < 10; index += 1) {
    assert.doesNotThrow(() => enforceRateLimit(request, '/auth/admin-password'));
  }
  assert.throws(
    () => enforceRateLimit(request, '/auth/admin-password'),
    (error) => error.code === 'RATE_LIMITED' && error.status === 429
  );
});

test('first administrator setup is strictly rate limited', () => {
  const request = {
    method: 'POST',
    headers: { 'x-forwarded-for': '192.0.2.88' },
    socket: { remoteAddress: '192.0.2.88' }
  };
  for (let index = 0; index < 5; index += 1) {
    assert.doesNotThrow(() => enforceRateLimit(request, '/auth/admin-setup'));
  }
  assert.throws(
    () => enforceRateLimit(request, '/auth/admin-setup'),
    (error) => error.code === 'RATE_LIMITED' && error.status === 429
  );
});
