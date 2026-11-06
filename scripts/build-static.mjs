import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, writeFileSync, readFileSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
if (basePath && !/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/.test(basePath)) {
  throw new Error('NEXT_PUBLIC_BASE_PATH must be empty or a path such as /mood-rater-demo.');
}
const project = JSON.parse(readFileSync(path.join(root, 'config/project.json'), 'utf8'));
if (project.researchEnabled) throw new Error('Static hosting requires researchEnabled: false. Research collection needs a server.');
const output = path.join(root, 'dist/static');
const staging = mkdtempSync(path.join(tmpdir(), 'mood-rater-static-build-'));
try {
  // Next's static exporter handles repository subpaths without a runtime server.
  // Build in isolation so the Node/Cloudflare targets and source routes stay intact.
  for (const name of ['app', 'lib', 'config', 'public', 'next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'package.json', 'package-lock.json']) {
    cpSync(path.join(root, name), path.join(staging, name), { recursive: true });
  }
  for (const route of ['api', 'study', 'legacy', 'mood-rater-final.html']) rmSync(path.join(staging, 'app', route), { recursive: true, force: true });
  const config = JSON.parse(readFileSync(path.join(staging, 'tsconfig.json'), 'utf8'));
  config.exclude.push('lib/server', 'lib/connectors.ts', 'lib/connector-context.ts');
  writeFileSync(path.join(staging, 'tsconfig.json'), JSON.stringify(config, null, 2));
  symlinkSync(path.join(root, 'node_modules'), path.join(staging, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack'], {
    cwd: staging,
    stdio: 'inherit',
    env: { ...process.env, MOOD_RATER_TARGET: 'static', NEXT_PUBLIC_BASE_PATH: basePath, NEXT_TELEMETRY_DISABLED: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Static build failed (${result.status ?? result.signal}).`);
  const client = path.join(staging, 'out');
  for (const page of ['index.html', 'annotate/index.html', 'about/index.html', 'customize/index.html', '404.html']) {
    if (!existsSync(path.join(client, page))) throw new Error(`Static export is missing ${page}.`);
  }
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  cpSync(client, output, { recursive: true });
} finally { rmSync(staging, { recursive: true, force: true }); }
writeFileSync(path.join(output, '.nojekyll'), '');
writeFileSync(path.join(root, 'dist/static-base-path.txt'), basePath);
// Route handlers require a server, so preserve the historical redirect as a static page.
const destination = basePath + '/annotate/';
writeFileSync(path.join(output, 'mood-rater-final.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${destination}"><title>Mood Rater</title></head><body><a href="${destination}">Open Mood Rater</a><script>location.replace(${JSON.stringify(destination)} + location.search + location.hash);</script></body></html>`);
console.log(`Static site ready: dist/static (base path: ${basePath || '/'})`);
