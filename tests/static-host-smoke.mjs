import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'dist/static');
const basePath = readFileSync(path.join(root, 'dist/static-base-path.txt'), 'utf8');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

// Deliberately serves files only: no framework, API or SPA fallback can mask a missing export.
export function staticServer() {
  return createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (basePath && !pathname.startsWith(basePath + '/')) { response.writeHead(404).end(); return; }
    const relative = decodeURIComponent(pathname.slice(basePath.length));
    let file = path.resolve(directory, '.' + relative);
    if (!file.startsWith(directory + path.sep) && file !== directory) { response.writeHead(404).end(); return; }
    try {
      if (statSync(file).isDirectory()) {
        if (!pathname.endsWith('/')) { response.writeHead(301, { Location: pathname + '/' }).end(); return; }
        file = path.join(file, 'index.html');
      }
      const bytes = readFileSync(file);
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': bytes.length });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(404, { 'Content-Type': 'text/html' }).end(readFileSync(path.join(directory, '404.html'))); }
  });
}

if (process.env.MOOD_STATIC_PREVIEW === '1') {
  staticServer().listen(Number(process.env.PORT || 4175), '127.0.0.1', () => console.log(`http://127.0.0.1:${process.env.PORT || 4175}${basePath}/`));
} else {
  const server = staticServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/', '/annotate/', '/about/', '/customize/', '/research/', '/admin/', '/legacy/']) {
      const response = await fetch(origin + basePath + route);
      assert.equal(response.status, 200, route);
      const html = await response.text();
      assert.ok(html.length > 1000, route);
      if (route !== '/legacy/') {
        for (const match of html.matchAll(/(?:src|href)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
          if (match[1].startsWith('//')) continue;
          assert.ok(!basePath || match[1].startsWith(basePath + '/'), `Unprefixed asset/link: ${match[1]}`);
          assert.equal((await fetch(origin + match[1])).status, 200, match[1]);
        }
      }
    }
    const clips = JSON.parse(readFileSync(path.join(root, 'config/audio-library.json'))).clips;
    for (const clip of clips) {
      const response = await fetch(origin + basePath + clip.url);
      assert.equal(response.status, 200, clip.url);
      assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), createHash('sha256').update(readFileSync(path.join(root, 'public', clip.url))).digest('hex'), clip.url);
    }
    assert.equal((await fetch(origin + basePath + '/api/identity')).status, 404);
    assert.equal((await fetch(origin + basePath + '/api/submissions/init', { method: 'POST' })).status, 405);
    assert.equal((await fetch(origin + basePath + '/does-not-exist/')).status, 404);
    assert.equal(existsSync(path.join(directory, 'server.js')), false);
    assert.ok(readFileSync(path.join(directory, 'mood-rater-final.html'), 'utf8').includes(basePath + '/annotate/'));
    console.log(`Static smoke passed (${basePath || '/'}): navigation, client assets, audio bytes, redirects and no collection API.`);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
