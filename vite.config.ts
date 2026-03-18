import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve('src/index.ts'),
      name: 'feng-cocos',
      fileName: 'feng-cocos',
      formats: ['umd']
    },
    outDir: 'dist_html',
    emptyOutDir: false,
    sourcemap: true
  },
});