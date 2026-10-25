/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1020',
        panel: '#11182A',
        card: '#151D31',
        violet: '#8B5CF6',
        indigo: '#6366F1',
        line: '#263149',
        muted: '#9AA7BD',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 18px 50px rgba(99, 102, 241, 0.16)',
      },
    },
  },
  plugins: [],
}
