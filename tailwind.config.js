/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        app: '#f8fafc',
        panel: '#ffffff',
        subtle: '#f8fafc',
        soft: '#f1f5f9',
        'border-soft': '#eef2f7',
        'primary-soft': '#eef2ff',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(15, 23, 42, 0.08)',
        '2xs': '0 1px 1px rgba(15, 23, 42, 0.06)',
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px -18px rgba(15, 23, 42, 0.18)',
        panel: '0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 24px -18px rgba(15, 23, 42, 0.22)',
        floating: '0 18px 36px -20px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
};
