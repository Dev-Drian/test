/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sistema Slate - más claro y profesional
        surface: {
          0: '#0f172a',      /* Slate 900 - Fondo principal */
          50: '#1e293b',     /* Slate 800 - Fondo elevado */
          100: '#334155',    /* Slate 700 - Cards */
          200: '#475569',    /* Slate 600 - Bordes */
          300: '#64748b',    /* Slate 500 - Texto terciario */
          400: '#94a3b8',    /* Slate 400 - Texto secundario */
        },
        content: {
          primary: '#f8fafc',   /* Slate 50 - Texto principal */
          secondary: '#e2e8f0', /* Slate 200 - Texto secundario */
          tertiary: '#94a3b8',  /* Slate 400 - Texto muted */
          muted: '#64748b',     /* Slate 500 - Muy muted */
        },
        // Accent principal - Indigo profesional
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          DEFAULT: '#6366f1',
        },
        // Accent secundario - Sky brillante
        accent: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          DEFAULT: '#0ea5e9',
        },
        // Estados más visibles
        success: { DEFAULT: '#22c55e', light: 'rgba(34, 197, 94, 0.15)' },
        warning: { DEFAULT: '#f59e0b', light: 'rgba(245, 158, 11, 0.15)' },
        error: { DEFAULT: '#ef4444', light: 'rgba(239, 68, 68, 0.15)' },
        info: { DEFAULT: '#3b82f6', light: 'rgba(59, 130, 246, 0.15)' },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'sm': '0 2px 4px rgba(0, 0, 0, 0.25)',
        'DEFAULT': '0 4px 12px rgba(0, 0, 0, 0.3)',
        'md': '0 8px 24px rgba(0, 0, 0, 0.35)',
        'lg': '0 16px 40px rgba(0, 0, 0, 0.4)',
        'glow-sm': '0 0 20px rgba(99, 102, 241, 0.2)',
        'glow': '0 0 30px rgba(99, 102, 241, 0.25)',
        'glow-lg': '0 0 50px rgba(99, 102, 241, 0.3)',
        'glow-accent': '0 0 30px rgba(6, 182, 212, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-up': 'fadeUp 0.3s ease-out',
        'fade-down': 'fadeDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
      },
    },
  },
  plugins: [],
}
