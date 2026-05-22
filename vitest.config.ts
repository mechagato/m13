import { defineConfig } from 'vitest/config';

/**
 * Configuración Vitest raíz para el monorepo m13.
 *
 * Cubre tests de todos los packages (parser, compiler, synth en próximas fases,
 * editor en D-4). El root tsconfig se reutiliza vía esbuild de Vitest.
 */
export default defineConfig({
  test: {
    include: ['packages/**/src/**/*.test.ts', 'packages/**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    passWithNoTests: true,
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'packages/runtime/src/**/*.ts',
        'packages/synth/src/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/__tests__/**',
        'packages/runtime/src/index.ts',
        'packages/synth/src/index.ts',
        '**/types.ts',
        'packages/**/dist/**',
      ],
      thresholds: {
        // Empieza permisivo; D-2 (T-008..T-012) sube parser y compiler >70%.
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
});
