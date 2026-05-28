import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
        display: ['"Instrument Serif"', '"Times New Roman"', 'serif'],
      },
      colors: {
        accent: 'var(--accent)',
      },
      borderRadius: {
        widget: '18px',
      },
    },
  },
} satisfies Config
