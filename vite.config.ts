import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { build as esbuild } from 'esbuild';
import fs from 'fs';
import manifest from './manifest.json';
import { resolve } from 'path';

/**
 * Content scripts as single self-contained files. crxjs ships each one as a tiny loader that
 * import()s the real module from chrome-extension://; Chrome blocks that import in pages it preloads
 * ("Unsafe attempt to load URL chrome-extension://… from frame with URL https://www.youtube.com/…"),
 * so SubShelf failed to start in those pages. A classic script needs no import at all.
 */
function bundledContentScripts(): Plugin {
  let config: ResolvedConfig;
  const scripts = [
    { entry: 'src/content/injectedMain.ts', file: 'assets/subshelf-page.js' },
    { entry: 'src/content/index.ts', file: 'assets/subshelf-content.js' },
  ];
  return {
    name: 'subshelf-bundled-content-scripts',
    apply: 'build',
    enforce: 'post',
    configResolved(c) {
      config = c;
    },
    async closeBundle() {
      const outDir = resolve(config.root, config.build.outDir);
      const manifestPath = resolve(outDir, 'manifest.json');
      const built = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      for (const { entry, file } of scripts) {
        await esbuild({
          entryPoints: [resolve(config.root, entry)],
          outfile: resolve(outDir, file),
          bundle: true,
          format: 'iife',
          target: 'chrome120',
          minify: config.isProduction,
          alias: { '@': resolve(config.root, 'src') },
          define: { 'import.meta.env.DEV': JSON.stringify(!config.isProduction) },
          logLevel: 'warning',
        });
      }

      // Point the manifest at them in place of the loaders, then drop the loaders and the modules
      // only they imported; those were web-accessible solely so the loaders could fetch them
      const replaced = new Set<string>();
      built.content_scripts.forEach((cs: { js: string[] }, i: number) => {
        cs.js.forEach(f => replaced.add(f));
        cs.js = [scripts[i].file];
      });
      const war: string[] = (built.web_accessible_resources ?? []).flatMap((w: { resources: string[] }) => w.resources);
      for (const f of [...replaced, ...war.filter(r => /\/(injectedMain|index)\.ts-[\w-]+\.js$/.test(r))]) {
        fs.rmSync(resolve(outDir, f), { force: true });
      }
      delete built.web_accessible_resources;
      fs.writeFileSync(manifestPath, JSON.stringify(built, null, 2));
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
  plugins: [crx({ manifest }), bundledContentScripts()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'chrome120',
    rollupOptions: {
      // Not referenced by the manifest, so it must be listed for the build to emit it
      input: {
        offscreen: resolve(__dirname, 'src/offscreen/offscreen.html'),
      },
    },
  },
});
