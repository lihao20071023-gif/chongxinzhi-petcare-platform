import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const host = process.env.STATIC_HOST || '127.0.0.1';
const port = Number(process.env.STATIC_PORT || 3300);
const root = resolve(process.env.STATIC_DIR || 'outputs/petcare-ai-butler-static');

const types = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

async function fileFor(pathname) {
  const decoded = decodeURIComponent(pathname).replace(/\\/g, '/');
  const relative = decoded.replace(/^\/+/, '') || 'index.html';
  const candidate = resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  try {
    const info = await stat(candidate);
    if (info.isDirectory()) return resolve(candidate, 'index.html');
    return candidate;
  } catch {
    if (!extname(candidate)) {
      const htmlCandidate = `${candidate}.html`;
      try {
        if ((await stat(htmlCandidate)).isFile()) return htmlCandidate;
      } catch {}
    }
    return null;
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
    const file = await fileFor(url.pathname);
    if (!file) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' });
      response.end('404 Not Found');
      return;
    }
    const info = await stat(file);
    const extension = extname(file).toLowerCase();
    response.writeHead(200, {
      'content-type': types[extension] || 'application/octet-stream',
      'content-length': info.size,
      'cache-control': extension === '.html' ? 'no-store' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff'
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('500 Internal Server Error');
    console.error(error);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${port} 已被占用。请设置 STATIC_PORT 为其他空闲端口。`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`宠馨智本地预览已启动：http://${host}:${port}/`);
  console.log(`设计页：http://${host}:${port}/design.html`);
  console.log(`静态目录：${root}`);
});

function shutdown(signal) {
  console.log(`${signal} received, closing static preview server`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
