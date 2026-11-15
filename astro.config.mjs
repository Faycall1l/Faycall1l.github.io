// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://faycall1l.github.io',
  redirects: {
    '/blog/gmem-layered-agent-memory-evidence-links':
      '/blog/groundmem-layered-agent-memory-evidence-links',
  },
});
