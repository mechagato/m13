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
        lines: 70,
        functions: 65,
        branches: 65,
        statements: 70,
        'packages/runtime/src/engine.ts': {
          lines: 70,
          functions: 65,
          branches: 60,
          statements: 70,
        },
        'packages/runtime/src/renderer/index.ts': {
          lines: 80,
          functions: 85,
          branches: 50,
          statements: 80,
        },
      },
    },
  },
});
