/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: 'var(--color-forest)',
        accent: 'var(--color-brick)',
        sand: 'var(--color-sand)',
        info: '#AFC2D7',
        ink: 'var(--color-ink)',
      },
    },
  },
  plugins: [],
};
