/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { primary: '#0B6FF4', canvas: '#F8FAFC' },
      boxShadow: { subtle: '0 4px 16px rgba(15, 23, 42, 0.06)' },
    },
  },
  plugins: [],
}
