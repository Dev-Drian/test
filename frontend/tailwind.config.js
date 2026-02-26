/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sistema de grises con tinte azulado
        surface: {
          0: '#09090f',      // Fondo principal (más profundo)
          50: '#0f0f17',     // Fondo elevado
          100: '#15151f',    // Cards
          200: '#1c1c28',    // Cards hover
          300: '#2a2a3a',    // Bordes suaves
          400: '#3d3d52',    // Bordes fuertes
        },
        content: {
          primary: '#ffffff',
          secondary: '#c4c4d4', // Más brillante
          tertiary: '#8888a0',
          muted: '#5a5a70',
        },
        // Accent principal - Azul vibrante con violeta
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // Indigo vibrante
          600: '#4f46e5',
          700: '#4338ca',
          DEFAULT: '#6366f1',
        },
        // Accent secundario - Cyan vibrante
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4', // Cyan brillante
          600: '#0891b2',
          DEFAULT: '#06b6d4',
        },
        // Estados
        success: { DEFAULT: '#22c55e', light: '#22c55e20' },
        warning: { DEFAULT: '#f59e0b', light: '#f59e0b20' },
        error: { DEFAULT: '#ef4444', light: '#ef444420' },
        info: { DEFAULT: '#3b82f6', light: '#3b82f620' },
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
