import { cloudflare } from '@cloudflare/vite-plugin';
import { fileURLToPath } from 'node:url';

export function cloudflareConfig() {
  return {
    resolve: {
      alias: [{ find: '../../../lib/server/research-adapter', replacement: fileURLToPath(new URL('./research-api.ts', import.meta.url)) }],
    },
    plugins: [cloudflare({
      configPath: './deploy/cloudflare/wrangler.jsonc',
      viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
      inspectorPort: false,
      persistState: { path: fileURLToPath(new URL('./.wrangler/state', import.meta.url)) },
    })],
  };
}
