import { defineConfig } from 'vite';

/**
 * @m13/examples — Vite config para dev + producción.
 *
 * Dev: arranca en localhost:5173 con HMR.
 * Producción: build optimizado para deploy estático en Cloudflare Pages
 * (target T-058: `dist/` < 500 KB). Las escenas .m13 son tratadas como
 * assets estáticos servidos desde public/ — no se procesan ni bundlean.
 */
export default defineConfig({
  server: {
    port: 5173,
    strictPort: false,
    open: false,
  },
  build: {
    target: 'esnext',
    // Source maps OFF en prod (los desarrolladores los tienen en dev).
    // Reducen el deploy ~40% y no se sirven al user final.
    sourcemap: false,
    minify: 'esbuild',
    cssCodeSplit: true,
    // Reportar tamaño comprimido en consola
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        // El runtime (m13 + synth) es un chunk separado para que el cache del
        // browser lo reuse entre versiones del HTML/CSS.
        manualChunks(id): string | undefined {
          if (id.includes('packages/runtime') || id.includes('packages/synth')) {
            return 'm13-runtime';
          }
          if (id.includes('node_modules')) {
            // yaml + zod + zod-to-json-schema + sus deps
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
  // Las .m13 son servidas como texto plano desde public/scenes/ — fetch en runtime
  assetsInclude: ['**/*.m13'],
});
