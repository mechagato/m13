// eslint.config.js — flat config compartida del monorepo m13 (T-071)
//
// Alcance: solo el código fuente TS de los packages (packages/*/src/**/*.ts).
// El editor Next.js (app/, components/, lib/) queda fuera por ahora — se integra
// cuando se decida su tooling propio (eslint-config-next vs esta config).
//
// Nota de versiones: el root tiene eslint 8.57.1 instalado pero @eslint/js 10.x.
// El recommended de @eslint/js v10 trae 3 reglas que NO existen en eslint 8.57
// (no-unassigned-vars, no-useless-assignment, preserve-caught-error) — se apagan
// abajo para que el linter no truene con "Definition for rule not found".

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Ignores globales — nada de esto se lintea nunca
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.next/**',
      'packages/editor/next-env.d.ts',
      'packages/examples/public/**',
      '**/*.mjs',
      '**/*.js', // configs JS (next.config.mjs, postcss, este mismo archivo) — no se lintean
    ],
  },

  // Código fuente de los packages
  {
    files: ['packages/*/src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: {
        // El runtime corre en browser (WebGPU) y mcp/generator en Node
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // -- Reglas de @eslint/js v10 inexistentes en eslint 8.57.1 (ver nota arriba) --
      'no-unassigned-vars': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',

      // -- Ajustes sobre código existente legítimo (NO tocar el fuente para callar al linter) --
      // El repo usa `!` (non-null assertion) a propósito tras checks previos.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // generator y parser tests usan regexes con dobles espacios INTENCIONALES:
      // matchean indentación YAML ("floor:\n  concept:") y el formato "  · path"
      // del agregador de errores. Reescribir a {2} sería cambiar código fuente.
      'no-regex-spaces': 'warn',
      // examples/main.ts escapa `\[` dentro de una char class del highlighter YAML.
      // Es inocuo y más legible; se deja como warn para no tocar el fuente.
      'no-useless-escape': 'warn',
    },
  },
);
