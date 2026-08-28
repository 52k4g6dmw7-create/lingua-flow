/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        ink: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        lang: {
          en: '#4f46e5',
          ja: '#e11d48',
          ko: '#9333ea',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 16px -2px rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(79 70 229 / 0.12), 0 8px 28px -4px rgb(15 23 42 / 0.10)',
        pop: '0 10px 40px -10px rgb(15 23 42 / 0.18)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '60%': { transform: 'scale(1.03)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-x': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
