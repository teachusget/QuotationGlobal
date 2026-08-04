/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: { primary: '#0B6FF4', canvas: '#F6F8FC', surface: '#FFFFFF', ink: '#0F172A' },
      borderRadius: { '2xl': '1rem' },
      boxShadow: {
        subtle: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04)',
        floating: '0 10px 30px rgba(15, 23, 42, 0.10)',
        overlay: '0 24px 64px rgba(15, 23, 42, 0.20)',
      },
      transitionDuration: { 180: '180ms' },
    },
  },
  plugins: [],
}
