import type { Config } from 'tailwindcss';

/**
 * Tailwind config — usa la paleta del HUD m13 (dark + accent dorado).
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0e1014',
        'bg-soft': '#1a1d24',
        'bg-panel': 'rgba(10, 9, 8, 0.85)',
        text: '#e8e4d8',
        'text-dim': '#7c7a73',
        accent: '#c9a227',
        signal: '#5da662',
        critical: '#d04545',
        border: '#2a2c33',
        cream: '#f5f1e8',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
