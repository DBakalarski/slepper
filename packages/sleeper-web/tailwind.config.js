/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Tri-state theme (System/Light/Dark) zarzadzany przez ThemeProvider — manual override
  // przez `className="dark"` na root View. Wszystkie `dark:*` warianty driven by className.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta z mockupow MVP sleep-tracker (mirror sleeper-app)
        cream: '#F5F0E8',
        navy: '#1E1B4B',
        orange: '#E08B6F',
        purple: '#7C6BAD',
        'purple-light': '#B8A8D9',
        'purple-soft': '#E8DEF7',
        success: '#5A8B6F',
        'success-soft': '#D7E5DC',
        'orange-soft': '#FBE8DD',
        'text-muted': '#6B6580',
        // Dark variants
        'dark-bg': '#0F0D26',
        'dark-card': '#1E1B4B',
        'dark-surface': '#2A2660',
      },
      borderRadius: {
        card: '20px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 4px 12px rgba(30, 27, 75, 0.04)',
      },
      fontFamily: {
        display: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
