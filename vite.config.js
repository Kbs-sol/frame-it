import build from '@hono/vite-cloudflare-pages';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [build({ entry: 'workers/index.js' })],
});
