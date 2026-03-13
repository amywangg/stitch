import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        coral: {
          50: '#fff1f1',
          100: '#ffe4e4',
          200: '#ffcccc',
          300: '#ffa5a5',
          400: '#ff7070',
          500: '#ff6b6b',
          600: '#ed3333',
          700: '#c81f1f',
          800: '#a51e1e',
          900: '#891f1f',
        },
        teal: {
          50: '#f0fdfc',
          100: '#ccfbf7',
          200: '#99f6ef',
          300: '#5eebe2',
          400: '#2dd4cc',
          500: '#4ecdc4',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Semantic surface tokens
        background: 'hsl(var(--background))',
        surface: 'hsl(var(--surface))',
        'background-muted': 'hsl(var(--background-muted))',
        'content-default': 'hsl(var(--content-default))',
        'content-secondary': 'hsl(var(--content-secondary))',
        'content-tertiary': 'hsl(var(--content-tertiary))',
        'border-default': 'hsl(var(--border-default))',
        'border-emphasis': 'hsl(var(--border-emphasis))',
      },
    },
  },
  plugins: [],
}

export default config
