/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ============================================
        // BASE COLOR PALETTE
        // ============================================
        
        // Primary: Sunset Orange (5 colors from palette)
        coral: {
          50: '#fff5f5',
          100: '#ffe5e5',
          200: '#ffcccc',
          300: '#EF7F80',  // Light Coral
          400: '#F37271',  // Begonia
          500: '#F75F5E',  // Sunset Orange (MAIN)
          600: '#FB4D4C',  // Tart Orange
          700: '#FF4040',  // Coral Red
          800: '#e53535',
          900: '#cc2d2d',
          950: '#491211',
        },
        
        // Secondary: Vista Blue
        teal: {
          50: '#f0f4fe',
          100: '#dde6fc',
          200: '#c3d4fa',
          300: '#9ab8f6',
          400: '#7B9FF2',  // Vista Blue (MAIN)
          500: '#5a7ee8',
          600: '#4562dc',
          700: '#3a50ca',
          800: '#3442a4',
          900: '#2e3b82',
          950: '#1f254f',
        },
        
        // Neutral: Warm Gray with cream tones
        neutral: {
          50: '#fdfcfa',   // Subtle cream white
          100: '#f9f8f6',  // Off-white
          200: '#f3f2ef',  // Light cream
          300: '#e8e6e1',
          400: '#d4d1cb',
          500: '#a8a29e',
          600: '#78716c',
          700: '#57534e',
          800: '#3d3a36',
          900: '#282624',
          950: '#1a1816',
        },

        // ============================================
        // SEMANTIC DESIGN TOKENS
        // These change based on light/dark mode
        // ============================================
        
        // Background colors
        background: {
          DEFAULT: 'var(--bg-default)',
          subtle: 'var(--bg-subtle)',
          muted: 'var(--bg-muted)',
          emphasis: 'var(--bg-emphasis)',
          inverse: 'var(--bg-inverse)',
        },
        
        // Surface colors (cards, modals, etc)
        surface: {
          DEFAULT: 'var(--surface-default)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
        },
        
        // Text colors
        content: {
          DEFAULT: 'var(--content-default)',
          subtle: 'var(--content-subtle)',
          muted: 'var(--content-muted)',
          inverse: 'var(--content-inverse)',
          primary: 'var(--content-primary)',
          secondary: 'var(--content-secondary)',
          success: 'var(--content-success)',
          warning: 'var(--content-warning)',
          error: 'var(--content-error)',
        },
        
        // Border colors
        border: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          emphasis: 'var(--border-emphasis)',
          primary: 'var(--border-primary)',
        },
        
        // Interactive colors
        interactive: {
          primary: 'var(--interactive-primary)',
          'primary-hover': 'var(--interactive-primary-hover)',
          'primary-active': 'var(--interactive-primary-active)',
          secondary: 'var(--interactive-secondary)',
          'secondary-hover': 'var(--interactive-secondary-hover)',
          'secondary-active': 'var(--interactive-secondary-active)',
          disabled: 'var(--interactive-disabled)',
        },
        
        // Status colors
        status: {
          success: 'var(--status-success)',
          'success-subtle': 'var(--status-success-subtle)',
          warning: 'var(--status-warning)',
          'warning-subtle': 'var(--status-warning-subtle)',
          error: 'var(--status-error)',
          'error-subtle': 'var(--status-error-subtle)',
          info: 'var(--status-info)',
          'info-subtle': 'var(--status-info-subtle)',
        },
      },
      
      // ============================================
      // BOX SHADOWS
      // ============================================
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'primary': 'var(--shadow-primary)',
        'secondary': 'var(--shadow-secondary)',
        'inner': 'var(--shadow-inner)',
      },
      
      // ============================================
      // TYPOGRAPHY
      // ============================================
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        display: ['Baloo 2', 'Nunito', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      
      fontSize: {
        // Display sizes
        'display-2xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'display-sm': ['1.875rem', { lineHeight: '1.3', fontWeight: '700' }],
        'display-xs': ['1.5rem', { lineHeight: '1.3', fontWeight: '700' }],
        
        // Heading sizes
        'heading-xl': ['1.5rem', { lineHeight: '1.4', fontWeight: '700' }],
        'heading-lg': ['1.25rem', { lineHeight: '1.4', fontWeight: '700' }],
        'heading-md': ['1.125rem', { lineHeight: '1.5', fontWeight: '600' }],
        'heading-sm': ['1rem', { lineHeight: '1.5', fontWeight: '600' }],
        'heading-xs': ['0.875rem', { lineHeight: '1.5', fontWeight: '600' }],
        
        // Body sizes
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body-md': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'body-xs': ['0.75rem', { lineHeight: '1.5' }],
        
        // Label sizes
        'label-lg': ['1rem', { lineHeight: '1.5', fontWeight: '600' }],
        'label-md': ['0.875rem', { lineHeight: '1.5', fontWeight: '600' }],
        'label-sm': ['0.75rem', { lineHeight: '1.4', fontWeight: '600' }],
        'label-xs': ['0.625rem', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '0.05em' }],
      },
      
      // ============================================
      // ANIMATIONS
      // ============================================
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-in',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'slide-left': 'slide-left 0.3s ease-out',
        'slide-right': 'slide-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'scale-out': 'scale-out 0.2s ease-in',
        'spin-slow': 'spin 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
      },
      
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-left': {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-right': {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      
      // ============================================
      // TRANSITIONS
      // ============================================
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      
      // ============================================
      // BORDER RADIUS
      // ============================================
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      
      // ============================================
      // SPACING - Safe Areas
      // ============================================
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
};
