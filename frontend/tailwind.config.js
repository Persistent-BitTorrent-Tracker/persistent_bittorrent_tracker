/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'pbts-bg': '#0f1117',
        'pbts-card': '#1a1d2e',
        'pbts-border': '#2d3148',
      }
    }
  },
  plugins: [],
}
