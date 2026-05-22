import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/**
 * @m13/runtime — Library build config.
 *
 * Produce un bundle ESM único en `dist/m13-runtime.js` listo para
 * embebido directo en cualquier app/sitio web (sin necesidad de bundler externo).
 *
 * Decisión D-1101: bundle TODO — incluye `@m13/synth`, `yaml`, `zod`. Razón:
 * el runtime se distribuye como "drop-in" para WebXR/web apps. Externalizar
 * estos deps obligaría al consumidor a instalarlos manualmente, lo cual
 * rompe el principio "asset-light" del Constitution §3.3. Tree-shaking
 * elimina lo que no se usa de cada dep.
 *
 * El budget de tamaño (NFR-3: <100KB gzipped) se valida en T-016 con size-limit.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Vite no resuelve workspace packages automáticamente fuera de raíz; ayudamos.
      '@m13/synth': fileURLToPath(new URL('../synth/src/index.ts', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2022',
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'M13Runtime',
      formats: ['es'],
      fileName: () => 'm13-runtime.js',
    },
    rollupOptions: {
      // bundle todo — sin externals
      external: [],
    },
    reportCompressedSize: true,
  },
});
