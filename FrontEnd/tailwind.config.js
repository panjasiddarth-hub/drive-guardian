/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
theme: {
    extend: {
      animation: {
        'gradient-x': 'gradient-x 8s ease infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite alternate',
        'letter-pop': 'letter-pop 0.8s ease-out forwards',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%':   { 'background-position': '100% 50%' },
        },
        'glow-pulse': {
          '0%':   { textShadow: '0 0 10px rgba(99, 102, 241, 0.5)' },
          '100%': { textShadow: '0 0 30px rgba(99, 102, 241, 0.9), 0 0 60px rgba(99, 102, 241, 0.4)' },
        },
        'letter-pop': {
          '0%':   { opacity: '0', transform: 'translateY(40px) scale(0.8)' },
          '60%':  { opacity: '1', transform: 'translateY(-10px) scale(1.05)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
