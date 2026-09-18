/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#e6fcf6',
          100: '#ccf8ec',
          200: '#99f1da',
          300: '#66eac8',
          400: '#33e3b6',
          500: '#00c795', // Primary Emerald/Teal from image
          600: '#00a37b',
          700: '#008060',
          800: '#005c45',
          900: '#00382a',
        },
        sidebar: '#1d2235', // Dark navy sidebar background
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-in':   'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:   { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
