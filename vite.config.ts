import vinext from 'vinext';
import { defineConfig } from 'vite';
import project from './config/project.json';

export default defineConfig(async () => {
  const target = process.env.MOOD_RATER_TARGET || 'node';
  if (!['node', 'cloudflare'].includes(target)) throw new Error('Unknown MOOD_RATER_TARGET. Use node or cloudflare.');
  if (project.researchEnabled && target !== 'cloudflare') {
    throw new Error('The optional research backend requires the Cloudflare target. Keep researchEnabled false for Node.js hosting.');
  }

  if (target === 'cloudflare') {
    const { cloudflareConfig } = await import('./deploy/cloudflare/vite');
    const optional = cloudflareConfig();
    return { ...optional, plugins: [vinext(), ...optional.plugins] };
  }
  return { plugins: [vinext()] };
});
