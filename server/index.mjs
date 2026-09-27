import { createServer } from 'node:http';
import { authenticate, recordDailyActivity } from './lib/database.mjs';
import { corsHeaders, send, sendError } from './lib/http.mjs';
import { enforceRateLimit } from './lib/rate-limit.mjs';
import { handleRoute } from './lib/routes.mjs';

const port = Number(process.env.API_PORT || 8787);
const host = process.env.API_HOST || '127.0.0.1';

const server = createServer(async (request, response) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  response.setHeader('x-request-id', requestId);
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders(request));
    response.end();
    return;
  }

  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const path = url.pathname.replace(/^\/api\/v1/, '') || '/';
    enforceRateLimit(request, path);
    const isPublic = path === '/health'
      || path === '/ready'
      || path === '/auth/wechat'
      || path === '/auth/admin-password'
      || path === '/auth/admin-setup-status'
      || path === '/auth/admin-setup';
    const identity = isPublic ? null : await authenticate(request);
    if (identity) await recordDailyActivity(identity);
    const result = await handleRoute({ request, response, url, path, identity });
    send(response, result.status, result.body, request);
    console.info(JSON.stringify({ requestId, method: request.method, path, status: result.status, durationMs: Date.now() - startedAt, userId: identity?.userId || null }));
  } catch (error) {
    console.error(JSON.stringify({ requestId, method: request.method, url: request.url, durationMs: Date.now() - startedAt, error: error.message, code: error.code || null }));
    sendError(response, error, request);
  }
});

server.listen(port, host, () => {
  console.info(`宠馨智API运行中：http://${host}:${port}/api/v1/health`);
});

function shutdown(signal) {
  console.info(`${signal} received, closing API server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
