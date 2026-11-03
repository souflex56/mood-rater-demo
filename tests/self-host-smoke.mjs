import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';

const external = process.env.MOOD_SMOKE_BASE;
const base = external || 'http://127.0.0.1:4173';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Smoke checks require localhost');
let directory, child, logs = '';
try {
  if (!external) {
    directory = mkdtempSync(path.join(tmpdir(), 'mood-rater-self-host-'));
    const bundle = path.join(directory, 'app');
    cpSync(new URL('../dist/standalone/', import.meta.url), bundle, { recursive: true });
    assert.equal(existsSync(path.join(bundle, '.openai')), false);
    child = spawn(process.execPath, ['server.js'], { cwd: bundle, env: { ...process.env, HOST: '127.0.0.1', PORT: '4173' }, stdio: ['ignore', 'pipe', 'pipe'] });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { logs = (logs + chunk).slice(-4000); });
  }
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch(base + '/api/identity', { signal: AbortSignal.timeout(2000) })).ok; } catch { /* server is starting */ }
    if (ready) break;
    if (child && child.exitCode !== null) throw new Error(`Standalone process exited: ${logs}`);
    await setTimeout(100);
  }
  assert.ok(ready, `Server was not ready: ${logs}`);
  for (const route of ['/', '/annotate', '/customize', '/about', '/research', '/admin', '/legacy/']) {
    const response = await fetch(base + route, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type'), /text\/html/);
    const html = await response.text();
    assert.ok(html.length > 1000, route);
    if (route === '/annotate') {
      const script = html.match(/<script[^>]+src="([^"]+)"/);
      assert.ok(script, 'Client script missing');
      assert.equal((await fetch(new URL(script[1], base))).status, 200);
    }
  }
  const identity = await (await fetch(base + '/api/identity', { headers: { 'x-mood-rater-user-id': 'forged-owner' } })).json();
  assert.deepEqual(identity, { user: null, isAdmin: false, canBootstrap: false, researchEnabled: false });
  for (const route of ['/api/admin/studies', '/api/submissions/init']) {
    assert.equal((await fetch(base + route, { method: 'POST' })).status, 404);
  }
  const clips = JSON.parse(readFileSync(new URL('../config/audio-library.json', import.meta.url))).clips;
  for (const clip of clips) {
    const response = await fetch(base + clip.url);
    assert.equal(response.status, 200, clip.url);
    const data = Buffer.from(await response.arrayBuffer());
    const original = readFileSync(new URL('../public' + clip.url, import.meta.url));
    assert.equal(createHash('sha256').update(data).digest('hex'), createHash('sha256').update(original).digest('hex'), clip.url);
  }
  console.log('Self-host smoke passed: pages, client script, initial version, audio bytes and disabled collection.');
} finally {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  if (directory) rmSync(directory, { recursive: true, force: true });
}
