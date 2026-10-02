import { defineConfig, Plugin } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { resolve } from 'path';

import fs from 'fs';

function crxDynamicUrlPlugin(): Plugin {
  return {
    name: 'crx-dynamic-url',
    enforce: 'post',
    writeBundle(options) {
      const outDir = options.dir || resolve(__dirname, 'dist');
      const manifestPath = resolve(outDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          if (Array.isArray(manifestData.web_accessible_resources)) {
            for (const entry of manifestData.web_accessible_resources) {
              entry.use_dynamic_url = true;
            }
            fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf-8');
          }
        } catch (e) {
          console.error('Failed to update use_dynamic_url in dist/manifest.json:', e);
        }
      }
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '127.0.0.1',
  },
  plugins: [crx({ manifest }), crxDynamicUrlPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'chrome120',
  },
});
