// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://faycall1l.github.io',
  integrations: [sitemap()],
  redirects: {
    '/blog/gmem-layered-agent-memory-evidence-links':
      '/blog/groundmem-layered-agent-memory-evidence-links',
  },
});
