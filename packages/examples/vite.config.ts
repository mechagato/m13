import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));

// Hash del commit para versionar el service worker (T-202).
// Fallback a timestamp del build si git no está disponible (CI shallow, etc.).
function buildHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return Date.now().toString(36);
  }
}

/**
 * @m13/examples — Vite config para dev + producción.
 *
 * Dev: arranca en localhost:5173 con HMR.
 * Producción: build optimizado para deploy estático en Cloudflare Pages
 * (target T-058: `dist/` < 500 KB). Las escenas .m13 son tratadas como
 * assets estáticos servidos desde public/ — no se procesan ni bundlean.
 */
// B12 (auditoría 06-12): el SW precachea TODAS las escenas .m13 para que el
// demo viva sin red (WiFi de venue). La lista se inyecta al build — sw.js es
// estático en public/ y no puede conocerla solo.
function injectScenePrecache(): Plugin {
  return {
    name: 'm13-sw-scene-precache',
    apply: 'build',
    closeBundle() {
      const scenesDir = resolve(configDir, 'public/scenes');
      const scenes = readdirSync(scenesDir)
        .filter((f) => f.endsWith('.m13'))
        .map((f) => '/scenes/' + f);
      const swPath = resolve(configDir, 'dist/sw.js');
      const src = readFileSync(swPath, 'utf8');
      if (!src.includes('__PRECACHE_SCENES__')) {
        throw new Error('[sw-precache] placeholder __PRECACHE_SCENES__ no encontrado en sw.js');
      }
      writeFileSync(swPath, src.replace('__PRECACHE_SCENES__', JSON.stringify(scenes)));
      console.log(`[sw-precache] ${scenes.length} escenas inyectadas al precache del SW`);
    },
  };
}

export default defineConfig({
  plugins: [injectScenePrecache()],
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash()),
  },
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
